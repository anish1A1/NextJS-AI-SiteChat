// this is the middleware file

import { NextRequest, NextResponse } from "next/server"
import { redis } from "./lib/redis"
import { nanoid } from "nanoid"

// OverView check if the user is allowed to join room
// If they are: Let them pass
// If they are not: Send them back to Lobby/home


export const proxy = async (req: NextRequest) => {

    
    // This will give us the pathname of the current url.  
    const pathname = req.nextUrl.pathname
    // this will check the rooms if  eg. localhost/room/joshroom
    
    const roomMatch = pathname.match(/^\/room\/([^/]+)$/)

    if (!roomMatch) { 
        return NextResponse.redirect(new URL("/", req.url))
    } 
    // -> if there has no room id user will be sent to home page

    // extracting the uri after room/{id} 
    const roomId = roomMatch[1]

    // getting data from db.
    const meta = await redis.hgetall<{connected: string[]; createdAt:number}>(`meta:${roomId}`)

    // we added <> in hgetall to let typescript know the data and its type when receiving from redis db.

    if (!meta) {
        return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
    }


    /* 
    We also need to check if the current user with token is already in the db. 
    1. If YES, then :
        do not readd him in the db.

    2. If Room is full then:
        Do not let him get on the chat page.

    3. If Not then :
        create a new token, set cookie and add the roomId with the new token for that user, and add all that in redis db.
        Update the db connected list.
    */
   const existingToken = req.cookies.get("x-auth-token")?.value

    // 1.    
    if(existingToken && meta.connected.includes(existingToken)){
        return NextResponse.next()
    }

    //2.
    if (meta.connected.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }


    //3.
    const response = NextResponse.next()
    /* 
    The NextResponse.next() is used in middleware only. It allows the incoming requests to countinue routing normally to its intended destination. 
    Its used when we want to set cookies or modify response header.
    */

    // generating token
    const token = nanoid()

    // caching the rooms of that roomId.
    response.cookies.set("x-auth-token", token, {
        path: '/',    //this cookie can be used in whole website.
        httpOnly: true,    //for security
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
    })


    // then we add the current roomId token of the connected user and set inside the connected list of redis db.

    // if another user comes in this url roomId then he will also be added in the room, ...meta.connceted keeps the current data (prev user roomId with token data) and also adds the current one users id in the list of redis db.


    await redis.hset(`meta:${roomId}`, {
        connected: [...meta.connected, token]
    })
    return response

}



// This routes will only be used by this proxy file.
export const config ={
    matcher: "/room/:path*"
}