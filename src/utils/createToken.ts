import { sign, verify } from "jsonwebtoken";

import { getConfig } from "./getConfig";

export async function createToken(data: {
  id: string;
  codeVerifier: string;
  isDevToken?: boolean;
}): Promise<string> {
  const env = await getConfig();
  const { id, codeVerifier, isDevToken = false } = data;
  return sign(
    {
      id,
      codeVerifier,
      isDevToken,
    },
    env.JWT_SECRET,
    { expiresIn: 15000 },
  );
}

export async function verifyToken(token: string): Promise<{
  id: string;
  codeVerifier: string;
  isDevToken: boolean;
} | null> {
  const { JWT_SECRET } = await getConfig();
  const payload = verify(token, JWT_SECRET);
  if (
    typeof payload === "object" &&
    "codeVerifier" in payload &&
    "id" in payload &&
    "isDevToken" in payload
  ) {
    return {
      id: payload.id,
      codeVerifier: payload.codeVerifier,
      isDevToken: payload.isDevToken,
    };
  }

  return null;
}
