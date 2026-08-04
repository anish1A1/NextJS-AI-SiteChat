// this is the middleware file

import { NextRequest, NextResponse } from "next/server"
import { redis } from "./lib/redis"

export const proxy = async (req: NextRequest) => {

    // OverView check if the user is allowed to join room
    // If they are: Let them pass
    // If they are not: Send them back to Lobby/home
    
    // This will give us the pathname of the current url.  
    const pathname = req.nextUrl.pathname
    // this will check the rooms if 
    // eg. localhost/room/joshroom
    const roomMatch = pathname.match(/^\/room\/([^/]+)$/)

    if (!roomMatch) { 
        return NextResponse.redirect(new URL("/", req.url))
    } 
    // -> if there has no room id user will be sent to home page

    // extracting the uri after room/{id} 
    const roomId = roomMatch[1]

    const meta = await redis.hgetall<{connected: string[]; createdAt:number}>(`meta:${roomId}`)

    // we added <> in hgetall to let typescript know the data and its type when receiving from redis db.

    if (!meta) {
        return NextResponse.redirect(new URL("/?error=roam-not-found", req.url))
    }

    const response = NextResponse.next()
    /* 
    The NextResponse.next() is used in middleware only. It allows the incoming requests to countinue routing normally to its intended destination. 
    Its used when we want to set cookies or modify response header.
    */



}



// This routes will only be used by this proxy file.
export const config ={
    matcher: "/room/:path*"
}