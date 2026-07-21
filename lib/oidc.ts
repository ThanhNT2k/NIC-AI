type Discovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };
type TokenClaims = { iss?: string; sub?: string; aud?: string | string[]; exp?: number; iat?: number; nonce?: string; email?: string; email_verified?: boolean; name?: string; amr?: string[] };

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function base64Url(bytes: Uint8Array) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function randomUrlSafe(bytes = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export async function oidcDiscovery(issuer: string): Promise<Discovery> {
  const normalized = issuer.replace(/\/$/, "");
  if (!normalized.startsWith("https://")) throw new Error("OIDC_ISSUER_HTTPS_REQUIRED");
  const response = await fetch(`${normalized}/.well-known/openid-configuration`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("OIDC_DISCOVERY_FAILED");
  const discovery = await response.json() as Discovery;
  if (discovery.issuer !== normalized || ![discovery.authorization_endpoint, discovery.token_endpoint, discovery.jwks_uri].every((value) => value?.startsWith("https://"))) throw new Error("OIDC_DISCOVERY_INVALID");
  return discovery;
}

export async function validateIdToken(idToken: string, discovery: Discovery, clientId: string): Promise<TokenClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("OIDC_ID_TOKEN_INVALID");
  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as { alg?: string; kid?: string };
  const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as TokenClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("OIDC_SIGNING_ALGORITHM_INVALID");
  const jwksResponse = await fetch(discovery.jwks_uri, { headers: { accept: "application/json" } });
  if (!jwksResponse.ok) throw new Error("OIDC_JWKS_FAILED");
  const jwks = await jwksResponse.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }> };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
  if (!jwk) throw new Error("OIDC_SIGNING_KEY_NOT_FOUND");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!valid || claims.iss !== discovery.issuer || !audience.includes(clientId) || !claims.exp || claims.exp <= now || claims.iat && claims.iat > now + 60 || !claims.sub) throw new Error("OIDC_ID_TOKEN_REJECTED");
  return claims;
}
