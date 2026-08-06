
import { handle } from "@upstash/realtime";
import { realtime } from "@/lib/realtime";

export const GET = handle({ realtime });


// this automatically handles re-connection, message history just like real time chat application.