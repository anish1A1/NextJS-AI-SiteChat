import {Ratelimit} from "@upstash/ratelimit";
import { redis } from "./redis";

export const senderRateLimit = new Ratelimit({
    redis,

    limiter: Ratelimit.slidingWindow(10, "1 m"),

    prefix: "sitechat:ratelimit:sender",

    analytics: true

});

// Here we used sliding Window in limiter, where one sender can send a maximum of 10 message in 1 minute.

// Prefix helps to keep rate-limit data seperate from our existing meta:room and messages:roomId

// Redis will internally maintain rate-limit information under its own namespace.