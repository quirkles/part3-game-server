import { Logger } from "winston";

import { verifyToken } from "./createToken";

export class ConnectionTokenManager {
  private readonly tokens: Map<string, string> = new Map();
  private readonly tokenExpirationTime: number = 15000; // 15 seconds

  constructor(private logger: Logger) {}
  addToken(token: string, codeVerifier: string) {
    this.tokens.set(token, codeVerifier);
    setTimeout(() => {
      this.tokens.delete(token);
    }, this.tokenExpirationTime);
  }

  async verify(
    token: string,
  ): Promise<{ userId: string; isDevToken: boolean } | null> {
    if (this.tokens.has(token)) {
      const payload = await verifyToken(token).catch((e) => {
        this.logger.error("Error verifying token", e);
        return null;
      });
      if (payload === null) {
        this.tokens.delete(token);
        return null;
      }
      if (payload.codeVerifier !== this.tokens.get(token)) {
        this.tokens.delete(token);
        return null;
      }
      this.tokens.delete(token);
      return { userId: payload.id, isDevToken: payload.isDevToken };
    }
    return null;
  }
}
