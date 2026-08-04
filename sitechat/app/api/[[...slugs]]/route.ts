import { redis } from '@/lib/redis'
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { authMiddleware } from './auth'
import {z} from "zod"

//This file intercepts all network requests sent to /api/* and hands them over to Elysia to process.

const ROOM_TTL_SECONDS = 60 * 10
// Time To Live (TTL) and it is 60 * 10 = 600 seconds

const room = new Elysia({prefix: '/room'})
    .post("/create", async () => {
        // we we add url we also add that url + Http method when using it. ie. create.post()
        
        const roomId = nanoid()

        await redis.hset(`meta:${roomId}`, {
            connected: [],  
            //users who will be connected to chat room, two users.
            createdAt: Date.now(),

        })

        // auto delete after time expires of the room
        await redis.expire(`meta:${roomId}`,ROOM_TTL_SECONDS)

        console.log("CREATED A NEW ROOM!")
        return {
            roomId ,
            success : true}
    })

const message = new Elysia({prefix: '/messages'})
    .use(authMiddleware)   //ensures there is user and returns roomId, token and connected:lists

    .post("/", ({body, auth}) => {

        const {sender, text} = body
    }, {
        body: z.object({
            sender: z.string().max(100),
            text: z.string().max(1000),
        })
    })


export const app = new Elysia({ prefix: '/api' }).use(room)

// now when using elysia we first write api. and then the eden.ts returned value constant. 
// i.e. api.client.  ....  


// 2. Export Next.js-compatible HTTP method handlers

export const GET = app.fetch 
export const POST = app.fetch 

export type App = typeof app;
//api.fetch:  Elysia natively adheres to the web standard fetch API. By exporting const GET = app.fetch, you tell nextJs: "Whenever a GET requests hits this folder, let elysia handle it"