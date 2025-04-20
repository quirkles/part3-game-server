import {sign, verify} from 'jsonwebtoken';

import {getConfig} from "./getConfig";

export async function createToken(data: {
    id: string,
    codeVerifier: string
}): Promise<string> {
    const env = await getConfig()
    return sign(data, env.JWT_SECRET, {expiresIn: 15000});
}

export async function verifyToken(token: string): Promise<{
    id: string,
    codeVerifier: string
} | null> {
    const {JWT_SECRET} = await getConfig()
    const payload = verify(token, JWT_SECRET);
    if (
        typeof payload === "object" &&
        "id" in payload &&
        "codeVerifier" in payload
    ) {
        return {
            id: payload.id,
            codeVerifier: payload.codeVerifier
        };
    }

    return null;
}