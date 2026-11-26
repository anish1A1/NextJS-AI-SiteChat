
# ⚡ SiteChat — Real-Time Chat with AI

**SiteChat** is a real-time, temporary chat application where two users can communicate in a private room without creating an account. Each conversation has a limited lifetime and is automatically destroyed when its timer expires. Users can also manually destroy a conversation at any time.

The application includes real-time messaging, typing indicators, read receipts, distributed rate limiting, and an integrated AI assistant powered by Google Gemini.

I built this project using **Next.js, ElysiaJS, Upstash Redis, and Upstash Realtime**, with a focus on type safety, efficient data handling, and a clean user experience.

---

## ✨ Features

- **💬 Real-Time Messaging:** Send and receive messages instantly using Upstash Realtime without manually refreshing the page.
- **⏳ Temporary Chat Rooms:** Conversations automatically expire after a fixed duration (10 minutes), with their associated chat data removed from Redis.
- **👥 Two-User Rooms:** Each room allows a maximum of two participants. Users can join through a room link or rejoin an existing session.
- **🔐 Room-Based Authentication:** Custom authentication using unique tokens and room-specific HTTP cookies to keep chat sessions independent.
- **⌨️ Typing Indicators:** See when the other participant is typing in real time.
- **✓✓ Read Receipts:** Real-time message read status using a read watermark (last-read timestamp) instead of updating individual messages.
- **🤖 AI Assistant:** Mention `@ai` in the chat to get AI-generated responses from Google Gemini, using the recent conversation history as context.
- **🛡️ Rate Limiting:** Protect messaging endpoints using Upstash Rate Limit, restricting users to 10 messages per minute.
- **🗑️ Destroy Chat:** Either participant can immediately destroy the conversation and its associated data.
- **🔗 Join Existing Rooms:** Users can join a conversation using a shared room URL.

---

## 🛠️ Tech Stack

| Technology         | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| Next.js            | Frontend framework and application routing             |
| React & TypeScript | UI development and type safety                         |
| ElysiaJS           | Backend API development                                |
| Eden Treaty        | End-to-end type-safe API communication                 |
| TanStack Query     | Data fetching, caching, and server-state management    |
| Upstash Redis      | Temporary storage of rooms, messages, and session data |
| Upstash Realtime   | Real-time messaging and event subscriptions            |
| Upstash Rate Limit | Distributed API rate limiting                          |
| Zod                | Runtime data validation and schema definition          |
| Google Gemini      | AI-powered chat responses                              |
| Nano ID / UUID     | Unique identifiers and session tokens                  |
| date-fns           | Date formatting                                        |
| Vercel             | Serverless of the application                          |

---

## 🏗️ Architecture

### 1. Room Creation & Authentication

The application follows a slightly different approach to room authentication:

**User → Proxy → Room**

When a user creates a chat, they are redirected to `/room/{roomId}`.

Before entering the room, `proxy.ts` checks the room and handles authorization.

The process works as follows:

1. Check whether the requested room exists in Redis.
2. Check whether the user already has a valid room-specific cookie.
3. If the user is already connected, allow them to rejoin.
4. If two users are already connected, redirect the new user to the home page.
5. Otherwise, generate a unique token, store it in Redis, and set a corresponding cookie.

Each room has its own cookie:

`x-auth-token-${roomId}`

This allows users to participate in multiple chat rooms simultaneously without overwriting their authentication tokens.

### 2. Backend Authentication

The backend is built using ElysiaJS and integrated into the Next.js application.

Before processing protected requests, the custom `authMiddleware` verifies:

- Whether the room ID is provided.
- Whether the authentication token exists.
- Whether the room exists in Redis.
- Whether the token belongs to a connected participant.

A reusable `AuthError` handles authentication failures and provides appropriate error responses.

Zod is also used to validate incoming request data before processing it.

### 3. Messaging Flow

Messages are sent through the ElysiaJS API.

The general flow looks like this:

```text
             POST /messages
                    |
                    v
             Auth Middleware
                    |
                    v
             Zod Validation
                    |
                    v
              Rate Limiter
                    |
             +------+------+
             |             |
          Allowed        Blocked
             |             |
             v             v
         Save Message    HTTP 429
             |
             v
         Upstash Redis
             |
             v
       Upstash Realtime
             |
             v
       Other Participant
```

Messages are stored in Redis as a list and broadcast through Upstash Realtime using the room ID as the channel identifier.

### 4. Real-Time Communication

Upstash Realtime handles the communication between participants.

The application uses different events for different chat activities:

- `chat.message` – New messages.
- `chat.typing` – Typing indicator updates.
- `chat.read` – Read receipt updates.
- `chat.destroy` – Room destruction events.

A typed client hook subscribes to these events and updates the frontend whenever something happens in the room.

### 5. AI Integration

SiteChat also includes an AI assistant powered by Google Gemini.

Users can invoke it by typing `@ai` in the message input.

The process works as follows:

1. Detect the `@ai` command in the message.
2. Display an AI typing indicator.
3. Retrieve the most recent 15 messages from Redis.
4. Initialize Gemini with the conversation context.
5. Generate an AI response.
6. Store the generated response in Redis.
7. Broadcast the response through Upstash Realtime.
8. Stop the AI typing indicator.

If the AI request fails, a fallback error message is stored and broadcast so the chat can continue functioning.

---

## 🧠 Engineering Challenges & Solutions

Some of the most interesting parts of this project were not just implementing features, but solving problems that appeared during development.

### 1. Multiple Chat Sessions in the Same Browser

**Problem:**

Initially, I used a single cookie named `x-auth-token` to store the authentication token.

However, when opening another chat room in a different browser tab, the newly generated token overwrote the previous cookie. This caused authentication failures in the first room.

**Solution:**

I implemented dynamic cookie naming using the room ID:

```ts
x-auth-token-${roomId}
```

Now every room has its own authentication cookie, allowing multiple independent chat sessions in the same browser.

### 2. Distributed Rate Limiting

**Problem:**

A production-ready rate limiter needs to handle concurrent requests, race conditions, expiration, and requests coming from multiple serverless instances.

Building all of this from scratch would add unnecessary complexity.

**Solution:**

I integrated Upstash Rate Limit to handle distributed rate limiting.

The messaging endpoint allows:

- 10 messages per minute per sender.
- HTTP `429` responses when the limit is exceeded.
- Consistent rate limiting across serverless instances.

### 3. Reducing Redis Operations for Read Receipts

**Problem:**

Updating every individual message whenever a user reads it would require additional Redis operations.

**Solution:**

Instead, I implemented the **Read Watermark pattern**.

Rather than updating individual messages, the application tracks the last-read timestamp of a participant.

This makes it possible to determine which messages have been read without modifying every message in Redis.

### 4. Temporary Data Management

**Problem:**

Since SiteChat is designed for temporary conversations, messages and room metadata should not remain in the database after a conversation expires.

**Solution:**

I used Redis TTL to manage room expiration and associated data.

The application also supports manual destruction through the Destroy Now button, which removes the room and its associated data and notifies connected participants through Realtime.

---

## 🚀 Getting Started

Follow these steps to run SiteChat locally.

### Prerequisites

- Node.js
- npm
- An Upstash account
- An Upstash Redis database
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/anish1A1/NextJS-AI-SiteChat

cd sitechat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
UPSTASH_REDIS_REST_URL="your_upstash_redis_rest_url"

UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_rest_token"

GEMINI_API_KEY="your_gemini_api_key"
```

Make sure to configure the corresponding Upstash Realtime credentials or environment variables required by your Realtime setup.

### 4. Start the Development Server

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

### 5. Test the Application

To test the real-time functionality:

1. Open the application in two different browser windows.
2. Create a chat room in one window.
3. Join the same room using its shared URL in the second window.
4. Send messages and test the typing indicators and read receipts.
5. Try the `@ai` command.
6. Test the Destroy Now button and automatic room expiration.

---

## 📁 Project Structure

```text
sitechat/
│
├── app/
│   ├── api/
│   │   ├── [[...slugs]]/
│   │   │   ├── route.js
│   │   │   └── auth.js
│   │   │
│   │   └── realtime/
│   │       └── route.js
│   │
│   ├── room/
│   │   └── [roomId]/
│   │       └── page.tsx
│   │
│   └── page.tsx
│
├── components/
│   ├── providers.tsx
│   └── ...
│
├── hooks/
│   ├── useUsername.ts
│   └── ...
│
├── lib/
│   ├── realtime.ts
│   ├── realtime-client.ts
│   ├── client.ts
│   └── ...
│
├── proxy.ts
│
├── package.json
└── README.md
```

---

## 🎯 What I Learned

Building SiteChat helped me understand several concepts beyond basic frontend and backend development:

- Building REST APIs using ElysiaJS.
- Implementing end-to-end type safety with Eden Treaty.
- Managing server state using TanStack Query.
- Working with Redis data structures and TTL.
- Implementing real-time communication using event-driven architecture.
- Building authentication and authorization for temporary sessions.
- Handling concurrent requests and distributed rate limiting.
- Designing efficient read receipt systems using timestamps.
- Integrating LLMs into an existing application using Gemini.
- Debugging issues involving cookies, multiple browser tabs, and serverless environments.

---

**Built with Next.js, ElysiaJS, Upstash, and Google Gemini.**

**If you have any query contact me *anishjaiswal587@gmail.com* **

**						Project is owned by Anish Jaiswal**
