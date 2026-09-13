/* 
We will check here if the current user is allowed to sent message to this room or see message. 
*/

import { redis } from "@/lib/redis"
import Elysia from "elysia"

class AuthError extends Error{
    constructor(message: string){
        super(message)
        this.name = "AuthError"
    }
}

export const authMiddleware = new Elysia({name: "auth"})
    .error({AuthError})
    .onError(({code, set}) => {
        if (code === "AuthError") {
            set.status = 401
            return {error: "Unauthorized"}
        }
    })
    .derive({as: "scoped"}, async ({query, cookie}) => {
        const roomId = query.roomId
        if (!roomId) {
            throw new AuthError("Missing roomId or token.")
        }
        console.log(roomId)
        const roomCookieName = `x-auth-token-${roomId}`;
        console.log('cookie', roomCookieName);
        const token = cookie[roomCookieName]?.value as string | undefined

        if (!token) {
            throw new AuthError("Missing session authentication token.")
        }
        // Now we need to provide query whenever we use authMiddleware.
        // We do not need to provide cookie as it gets itself from session.

        const connected = await redis.hget<string[]>(`meta:${roomId}`, "connected")

        if (!connected || !connected.includes(token)) {
            throw new AuthError("Invalid Token")
        }

        return {auth: {roomId, token, connected}}
    })