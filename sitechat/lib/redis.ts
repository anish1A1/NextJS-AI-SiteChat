import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv()
// easier and faster way to validate your credentials

