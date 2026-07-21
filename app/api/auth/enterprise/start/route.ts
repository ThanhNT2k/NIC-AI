import { database, sha256 } from "@/lib/d1-auth";
import { safeReturnTo } from "@/lib/enterprise-policy";
import { oidcDiscovery, pkceChallenge, randomUrlSafe } from "@/lib/oidc";

export async function GET(request: Request) {
  const issuer=process.env.OIDC_ISSUER,clientId=process.env.OIDC_CLIENT_ID,redirectUri=process.env.OIDC_REDIRECT_URI;
  if(!issuer||!clientId||!redirectUri)return Response.json({error:"ENTERPRISE_AUTH_NOT_CONFIGURED"},{status:503});
  const discovery=await oidcDiscovery(issuer),state=randomUrlSafe(),nonce=randomUrlSafe(),verifier=randomUrlSafe(48),now=Math.floor(Date.now()/1000),db=await database();
  await db.prepare("INSERT INTO oidc_login_attempts (id,state_hash,nonce_hash,code_verifier,return_to,expires_at,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),await sha256(state),await sha256(nonce),verifier,safeReturnTo(new URL(request.url).searchParams.get("returnTo")),now+600,now).run();
  const target=new URL(discovery.authorization_endpoint);target.searchParams.set("client_id",clientId);target.searchParams.set("response_type","code");target.searchParams.set("redirect_uri",redirectUri);target.searchParams.set("scope","openid profile email");target.searchParams.set("state",state);target.searchParams.set("nonce",nonce);target.searchParams.set("code_challenge",await pkceChallenge(verifier));target.searchParams.set("code_challenge_method","S256");target.searchParams.set("prompt","select_account");
  return Response.redirect(target.toString(),302);
}
