// 4. Create a Typed Client Hook

"use client"

import { createRealtime } from "@upstash/realtime/client"
import type { RealtimeEvents } from "./realtime"

export const {useRealtime} = createRealtime<RealtimeEvents>()

// This useRealtime() Hook will be used for fetching data in realtime