import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

const TEAM_DOMAIN = process.env.TEAM_DOMAIN!;
const POLICY_AUD = process.env.POLICY_AUD!;
if (!TEAM_DOMAIN || !POLICY_AUD) {
  throw new Error("TEAM_DOMAIN or POLICY_AUD missing");
}

const JWKS = createRemoteJWKSet(
  new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)
);

export async function verifyCfAccess(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: TEAM_DOMAIN,
    audience: POLICY_AUD,
  });
  return payload;
}