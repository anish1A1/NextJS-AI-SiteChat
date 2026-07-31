import { treaty } from "@elysiajs/eden";
import {app, App} from '@/app/api/[[...slugs]]/route'

export const client = 
    typeof process !== 'undefined'
    ? treaty(app)  // server-side uses the actual compiled 'app' code because typescript 'types' used for 'App' vanish at runtime
    
    : treaty<App>('localhost:3000') //Client-side uses the 'App' type for autocomplete 


// This file sets up Eden, which gives your frontend components type-safe autocomplete when communicating with your backend routes. 


// Server-Side Render Environment (typeof process !== 'undefined'):
// If this code executes on the Next.js server (e.g., inside a Server Component or getServerSideProps), it runs treaty(app).api.
// Why? It bypasses the network completely! It calls your Elysia code directly in-memory, eliminating network overhead, reducing latency, and making server-side data fetching incredibly fast.

// Client-Side Browser Environment (The else block):

// If this code executes in the user's browser, it triggers treaty<typeof app>('localhost:3000').api.

// Why? The browser doesn't have the backend code. Instead, it only borrows the TypeScript types (typeof app) to give you autocomplete, while sending normal fetch HTTP requests over the network to localhost:3000/api.