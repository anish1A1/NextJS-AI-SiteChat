import { Elysia, t } from 'elysia'

//This file intercepts all network requests sent to /api/* and hands them over to Elysia to process.

export const app = new Elysia({ prefix: '/api' })
    .get('/', 'Hello Nextjs')
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String()
        })
    })

// 2. Export Next.js-compatible HTTP method handlers

export const GET = app.fetch 
export const POST = app.fetch 

//api.fetch:  Elysia natively adheres to the web standard fetch API. By exporting const GET = app.fetch, you tell nextJs: "Whenever a GET requests hits this folder, let elysia handle it"