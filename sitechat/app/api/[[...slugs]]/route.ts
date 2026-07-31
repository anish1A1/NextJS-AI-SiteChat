import { Elysia, t } from 'elysia'

//This file intercepts all network requests sent to /api/* and hands them over to Elysia to process.


const room = new Elysia({prefix: '/room'})
    .post("/create", () => {
        // we we add url we also add that url + Http method when using it. ie. create.post()
        
        console.log("CREATE A NEW ROOM!")
        return {success : true}
    })


export const app = new Elysia({ prefix: '/api' }).use(room)

// now when using elysia we first write api. and then the eden.ts returned value constant. 
// i.e. api.client.  ....  


// 2. Export Next.js-compatible HTTP method handlers

export const GET = app.fetch 
export const POST = app.fetch 

export type App = typeof app;
//api.fetch:  Elysia natively adheres to the web standard fetch API. By exporting const GET = app.fetch, you tell nextJs: "Whenever a GET requests hits this folder, let elysia handle it"