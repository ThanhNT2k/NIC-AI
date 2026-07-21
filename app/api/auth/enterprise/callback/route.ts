import { createSession, database, hashPassword, sessionHeaders, sha256 } from "@/lib/d1-auth";
import { hasMfaClaim, requiresEnterpriseMfa } from "@/lib/enterprise-policy";
import { oidcDiscovery, validateIdToken } from "@/lib/oidc";

type Attempt={id:string;nonceHash:string;codeVerifier:string;returnTo:string};
type User={id:string;email:string;role:string;accountStatus:string;mfaRequired:number};
const fail=(request:Request,code:string)=>Response.redirect(new URL(`/auth?enterpriseError=${encodeURIComponent(code)}`,request.url).toString(),302);

export async function GET(request:Request){
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state"),issuer=process.env.OIDC_ISSUER,clientId=process.env.OIDC_CLIENT_ID,clientSecret=process.env.OIDC_CLIENT_SECRET,redirectUri=process.env.OIDC_REDIRECT_URI;
  if(!code||!state||!issuer||!clientId||!clientSecret||!redirectUri)return fail(request,"OIDC_CALLBACK_INVALID");
  const db=await database(),now=Math.floor(Date.now()/1000),attempt=await db.prepare("SELECT id,nonce_hash AS nonceHash,code_verifier AS codeVerifier,return_to AS returnTo FROM oidc_login_attempts WHERE state_hash=? AND consumed_at IS NULL AND expires_at>?").bind(await sha256(state),now).first<Attempt>();
  if(!attempt)return fail(request,"OIDC_STATE_INVALID");
  const discovery=await oidcDiscovery(issuer),tokenResponse=await fetch(discovery.token_endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","accept":"application/json"},body:new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:redirectUri,client_id:clientId,client_secret:clientSecret,code_verifier:attempt.codeVerifier})});
  if(!tokenResponse.ok)return fail(request,"OIDC_TOKEN_EXCHANGE_FAILED");
  const tokens=await tokenResponse.json() as {id_token?:string};if(!tokens.id_token)return fail(request,"OIDC_ID_TOKEN_MISSING");
  let claims;try{claims=await validateIdToken(tokens.id_token,discovery,clientId);}catch{return fail(request,"OIDC_ID_TOKEN_REJECTED")}
  if(!claims.nonce||await sha256(claims.nonce)!==attempt.nonceHash||!claims.email||claims.email_verified!==true)return fail(request,"OIDC_CLAIMS_INVALID");
  const allowedDomain=process.env.OIDC_ALLOWED_DOMAIN?.toLowerCase();if(allowedDomain&&!claims.email.toLowerCase().endsWith(`@${allowedDomain}`))return fail(request,"OIDC_DOMAIN_FORBIDDEN");
  let user=await db.prepare("SELECT id,email,role,account_status AS accountStatus,mfa_required AS mfaRequired FROM users WHERE (identity_provider=? AND identity_subject=?) OR email=? ORDER BY CASE WHEN identity_subject=? THEN 0 ELSE 1 END LIMIT 1").bind(discovery.issuer,claims.sub,claims.email.toLowerCase(),claims.sub).first<User>();
  if(!user&&process.env.OIDC_AUTO_PROVISION==="1"){const id=crypto.randomUUID(),password=await hashPassword(crypto.randomUUID()+crypto.randomUUID()),organization=allowedDomain?"NIC":"Enterprise";await db.batch([db.prepare("INSERT INTO users (id,email,full_name,organization,role,password_hash,password_salt,password_iterations,failed_attempts,account_status,identity_provider,identity_subject,mfa_required,created_at) VALUES (?,?,?,?, 'customer_member',?,?,?,0,'active',?,?,0,?)").bind(id,claims.email.toLowerCase(),claims.name?.slice(0,160)||claims.email,organization,password.hash,password.salt,password.iterations,discovery.issuer,claims.sub,now),db.prepare("INSERT INTO organization_memberships (id,user_id,organization,role,status,created_at) VALUES (?,?,?,'customer_member','active',?)").bind(crypto.randomUUID(),id,organization,now)]);user={id,email:claims.email.toLowerCase(),role:"customer_member",accountStatus:"active",mfaRequired:0};}
  if(!user||user.accountStatus!=="active")return fail(request,"OIDC_ACCOUNT_NOT_PROVISIONED");
  const mfaVerified=hasMfaClaim(claims.amr);if(requiresEnterpriseMfa(user.role,user.mfaRequired===1)&&!mfaVerified)return fail(request,"MFA_REQUIRED");
  await db.batch([db.prepare("UPDATE oidc_login_attempts SET consumed_at=? WHERE id=? AND consumed_at IS NULL").bind(now,attempt.id),db.prepare("UPDATE users SET identity_provider=?,identity_subject=? WHERE id=? AND (identity_subject IS NULL OR identity_subject=?)").bind(discovery.issuer,claims.sub,user.id,claims.sub),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,source,created_at) VALUES (?,?,?,?,?,?,'identity_provider',?)").bind(crypto.randomUUID(),user.id,"auth.enterprise_login","user",user.id,JSON.stringify({issuer:discovery.issuer,mfaVerified}),now)]);
  const session=await createSession(user.id,{authMethod:"oidc",mfaVerified}),headers=sessionHeaders(session);headers.set("Location",new URL(attempt.returnTo,request.url).toString());headers.set("cache-control","no-store");return new Response(null,{status:302,headers});
}
