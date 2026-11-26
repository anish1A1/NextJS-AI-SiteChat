/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// from package date-funs
import {format} from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
import { toast } from "sonner";

const formatTimeRemaing = (seconds: number) => {
        const min = Math.floor(seconds/60)
        const sec = seconds % 60
        return `${min}:${sec.toString().padStart(2, "0")}`
    }

const Page = () => {
    const params = useParams()
    const roomId = params.roomId as string

    const router = useRouter()
    const { username } = useUsername()
    const [inputVal, setInput] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const [copyStatus, setCopyStatus] = useState("Share Link")
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    // This will help to get the current location of new message.
    const messageEndRef = useRef<HTMLDivElement>(null);

    // Typing indicator states
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [typingUser, setTypingUser] = useState("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCurrentlyTyping = useRef(false);

    // Read receipt states
    const [otherUserReadAt, setOtherUserReadAt] = useState<number>(0);


    // For Post: Sending Message
    const {mutate: sendMessage, isPending } = useMutation({
        mutationFn: async ({text}: {text: string}) => {
           const res = await client.api.messages.post(
            {
                sender: username, 
                text
           }, {
                query: {roomId}
            },
        );
         // 1. If an error exists, extract the text immediately or safely fallback
        if (res.error) {
            // Eden Treaty puts your custom returned dictionary inside res.error.value
            const backendErrorData = res.error?.value as any;
            
            // Extract your string: "Too many messages. Please wait before sending again."
            const errorMessageString = backendErrorData?.error || res.error || "Too many requests";
            
            // Throw a standard JavaScript Error instance wrapping that specific string!
            throw new Error(errorMessageString);
        }


        },

        onSuccess: (data) => {
            // Since we throw errors in mutationFn, onSuccess only handles clean 200 OK responses
            setInput("");
        },
        // 1. Check if the error returned from Elysia backend contains the rate limit string
        // (Elysia typically structures it under error.value or error.value.error)

        onError: (error : any) => {
            
            console.error("Failed to send message:", error);
            // Safety check in case something completely empty or null is caught
            if (!error) {
                toast.error("Something went wrong, but no server error data was received.");
                return;
            }
            
            toast.error(error?.message || "Something went wrong!")

        },
    });

    // This is the function that calls the above sendMessage function
    const handleSendMessage = () => {
        const text = inputVal.trim();

        // if the input is not a text and is in isPending state then it well not send post request.
        if (!text || isPending) return;

        sendMessage({text});
        inputRef.current?.focus();
    }


    // For Get: Fetching Message also looking stale data.
    const {data: messages, refetch} = useQuery({
        queryKey: ["messages", roomId],  //whenever there is change in roomId refetch data.
        queryFn: async () => {
            const res = await client.api.messages.get(
                {query :{ roomId}})
            return res.data
        }
    })

    // For Get: Fetching the TTL of the chat.
    const {data: ttlData} = useQuery({
        queryKey: ["ttl", roomId],
        queryFn: async () => {
            const res = await client.api.room.ttl.get({query: {roomId}})
            
            return res.data
        }
    })

    // For Post: Sending user is typing

    const { mutate: sendTyping } = useMutation({
    mutationFn: async ({ typing }: { typing: boolean }) => {
        const res = await client.api.messages.typing.post(
            { typing, sender: username },
            {
                query: { roomId },
            }
        );

        if (res.error) {
            throw new Error("Failed to update typing status");
        }

        return res.data;
    },
});

// For Typing indicator.
    const handleTyping = (value: string) => {
        setInput(value);

         // If the input becomes empty, tell the other user immediately and reset the flag
        if (!value.trim()) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            isCurrentlyTyping.current = false
            sendTyping({typing: false});
            return;
        }

        // Tell the other user that we are typing ONLY if we haven't already sent a "true" event
        if (!isCurrentlyTyping.current) {
            isCurrentlyTyping.current = true;
            sendTyping({ typing: true });
        }


        // Reset the timer every time the user types
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // If no new character is typed for 1.5 seconds,
    // tell the other user that typing has stopped.
        typingTimeoutRef.current = setTimeout(() => {
            isCurrentlyTyping.current = false;
            sendTyping({typing: false});
        }, 1500);
    }

    useEffect(() => {
    return () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };
}, []);


    useEffect(() => {
        if (ttlData?.ttl === undefined) return;

        if (ttlData.ttl <= 0) {
            setTimeRemaining(0);
            router.push('/?destroyed=true');
            return;
        }

        // Set the exact expiration time in milliseconds
        const expiresAt = Date.now() + ttlData.ttl * 1000;

        const updateRemaining = () => {
            const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            setTimeRemaining(remaining);
            if (remaining === 0) {
                router.push('/?destroyed=true');
            }
        }; 

        // Run immediately so there's no 1 second delay on mount/ refetch
        updateRemaining();

        const interval = setInterval(updateRemaining, 1000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateRemaining();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', updateRemaining);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', updateRemaining);
        }
    }, [ttlData, router]);

    const copyLink = () => {
        const url = window.location.href
        navigator.clipboard.writeText(url)
        setCopyStatus("Copied")

        setTimeout(()=> {
            setCopyStatus("Share Link")
        }, 5000 )
    }

    // Now to get the realtime messages from message of redis we use useRealtime.

    useRealtime({
        channels:[roomId],
        events: ["chat.message", "chat.destroy", "chat.typing", "chat.read"],
        onData: ({event, data}) => {
            if(event === "chat.message") {
                // refetch is from tanstack useQuery and got it from messages func.
                refetch()
            }

            if (event === "chat.destroy") {
                // If ttl is 0 then push them to home page.
                router.push('/?destroyed=true')
            }

            if (event === "chat.typing"){
                // console.log("Realtime event:", event, data);

                if (data.sender === username) return;
                // we do not make typing for current user.

                setTypingUser(data.sender);
                setIsOtherUserTyping(data.typing);
            }

            if (event === "chat.read" && data.reader !== username) {
                setOtherUserReadAt((prev) => Math.max(prev, data.readAt));
            }
        }
    })

    // Notify the other user when you view their new messages.

    useEffect(() => {
        const list = messages?.messages ?? [];
        if (list.length === 0 || !username) return;

        const lastMessage = list[list.length - 1];
        const isFromOtherUser = lastMessage.sender !== username;

        const markRead = () => {
            if (document.visibilityState === "visible" && isFromOtherUser) {
                client.api.messages.read.post(
                    { sender: username },
                    { query: { roomId } }
                );
            }
        };

        markRead();
        window.addEventListener("focus", markRead);
        document.addEventListener("visibilitychange", markRead);

        return () => {
            window.removeEventListener("focus", markRead);
            document.removeEventListener("visibilitychange", markRead);
        };
    }, [messages?.messages, username, roomId]); // <-- Changed from messages?.messages.length to messages?.messages


    useEffect(() => {
        messageEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages])

    // POST: For deleting the Chat.
    const {mutate: destroyRoom} = useMutation({
        mutationFn: async () => {
            await client.api.room.delete(null, {
                query: {roomId}
            })
        }
    })

    // Helper to toggle @ai prefix in your input
    const isAiPrompt = inputVal.trim().toLowerCase().startsWith("@ai");

    const toggleAiPrefix = () => {
        if (isAiPrompt) {
            setInput(inputVal.replace(/^@ai\s*/i, ""));
        } else {
            setInput(`@ai ${inputVal}`);
        }
        inputRef.current?.focus();
    };

    return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
        <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30 ">

            <div className="flex items-center gap-4">

                <div className="flex flex-col">

                    <span className="text-sm text-zinc-500 uppercase">
                        Room ID
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-green-500 max-w-27.5 sm:max-w-none truncate">{roomId}</span>

                        <button onClick={copyLink} 
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-200 transition-colors cursor-pointer shrink-0">  {copyStatus}
                        </button>
                    </div>

                </div>
                    <div className="h-8 w-px bg-zinc-800 "/>

                    <div className="flex flex-col">
                        <span className="text-sm text-zinc-500 uppercase">
                            Self-Destruct
                        </span>
                        <span className={`text-sm font-bold flex items-center gap-2 ${timeRemaining !== null && timeRemaining < 60 ?
                            "text-red-500"
                            :"text-amber-500"
                        }`}>
                            {typeof timeRemaining === 'number' ? formatTimeRemaing(timeRemaining) : "--:--"}
                        </span>
                    </div>
            </div>
            
            {/* bUTTON TO DESTROY the room */}
            <button
            onClick={() => destroyRoom()}
            className="text-sm bg-zinc-800 hover:bg-red-600 placeholder-zinc-300 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50">
                <span className="group-hover:animate-pulse ">
                ⚰️
                </span>
                DESTROY NOW
            </button>
        </header>
        

        {/* All the messages will be shown here. */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 sitechat-scrollbar">
            {messages?.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full px-4">
                    <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 p-5 rounded-lg text-center space-y-3">
                        <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                            Room Ready • Waiting for Peer
                        </p>
                        <p className="text-zinc-500 text-xs">
                            Share this private link to invite one person. All messages self-destruct when the timer hits zero.
                        </p>

                        {/* Invite Link Box */}
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded">
                            <span className="text-xs text-zinc-400 font-mono truncate flex-1 select-all">
                                {typeof window !== "undefined" ? window.location.href : `/room/${roomId}`}
                            </span>
                            <button
                                onClick={copyLink}
                                className="text-xs bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded transition-colors shrink-0 cursor-pointer"
                            >
                                {copyStatus === "Copied" ? "COPIED!" : "COPY LINK"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* Empty Room Hint Banner so users & recruiters immediately discover @ai */}
{messages?.messages.length === 0 && (
    <div className="my-auto mx-auto max-w-md border border-zinc-800 bg-zinc-900/40 p-5 text-center space-y-3">
        <p className="text-xs uppercase tracking-wider text-zinc-400">
            Ephemeral Room Active • Shared AI Enabled
        </p>
        <p className="text-xs text-zinc-500">
            Messages self-destruct when the timer ends. Start any message with{" "}
            <span className="text-purple-400 font-semibold">@ai</span> to ask Gemini together.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
            {[
                "@ai Give us an icebreaker question",
                "@ai Explain how this ephemeral chat works",
            ].map((sample) => (
                <button
                    key={sample}
                    type="button"
                    onClick={() => {
                        setInput(sample);
                        inputRef.current?.focus();
                    }}
                    className="text-[11px] border border-purple-500/30 bg-purple-950/20 text-purple-300 px-2.5 py-1 hover:bg-purple-900/30 transition cursor-pointer"
                >
                    ✨ {sample}
                </button>
            ))}
        </div>
    </div>
)}

{/* all the messages shown here */}
{messages?.messages.map((msg) => {
    const isOwnMessage = msg.sender === username;
    const isAiMessage = msg.sender === "AI Assistant";
    const isRead = isOwnMessage && otherUserReadAt > 0 && msg.timeStamp <= otherUserReadAt + 2000;

    return (
        <div
            key={msg.id}
            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
        >
            <div
                className={`max-w-[75%] flex flex-col ${
                    isOwnMessage ? "items-end" : "items-start"
                }`}
            >
                {/* Sender */}
                {!isOwnMessage && (
                    <span
                        className={`text-xs mb-1 px-2 flex items-center gap-1 ${
                            isAiMessage ? "text-purple-400 font-semibold" : "text-blue-400"
                        }`}
                    >
                        {isAiMessage ? "✨ AI Assistant" : msg.sender}
                    </span>
                )}

                {/* Message bubble */}
                <div
                    className={`px-4 py-2 rounded-2xl ${
                        isOwnMessage
                            ? "bg-green-600 text-white rounded-br-sm"
                            : isAiMessage
                            ? "bg-purple-950/30 border border-purple-500/40 text-zinc-100 rounded-bl-sm"
                            : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                    }`}
                >
                    <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
                        {msg.text}
                    </p>

                    <div className="flex items-center justify-end gap-1 mt-1">
                        <span
                            className={`block text-[8px] mt-1 text-right ${
                                isOwnMessage
                                    ? "text-green-200"
                                    : isAiMessage
                                    ? "text-purple-300/70"
                                    : "text-zinc-500"
                            }`}
                        >
                            {format(msg.timeStamp, "HH:mm")}
                        </span>

                        {isOwnMessage && (
                            <span
                                title={isRead ? "Read" : "Sent"}
                                className={`text-[10px] font-bold tracking-tighter ${
                                    isRead ? "text-sky-300" : "text-green-200/70"
                                }`}
                            >
                                {isRead ? "✓✓" : "✓"}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
})}

{isOtherUserTyping && (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
            <span
                className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${
                    typingUser === "AI Assistant" ? "bg-purple-400" : "bg-zinc-500"
                }`}
            />
            <span
                className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${
                    typingUser === "AI Assistant" ? "bg-purple-400" : "bg-zinc-500"
                }`}
            />
            <span
                className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                    typingUser === "AI Assistant" ? "bg-purple-400" : "bg-zinc-500"
                }`}
            />
        </div>

        <span className={typingUser === "AI Assistant" ? "text-purple-400" : ""}>
            {typingUser === "AI Assistant" ? "✨ AI Assistant is thinking..." : `${typingUser} is typing...`}
        </span>
    </div>
)}

<div ref={messageEndRef} />
</div>

<div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
    <div className="flex gap-3">
        <div className="flex-1 relative group flex items-center">
            <span
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 animate-pulse ${
                    isAiPrompt ? "text-purple-400" : "text-gray-500"
                }`}
            >
                {">"}
            </span>

            {/* Quick @ai toggle button inside the input */}
            <button
                type="button"
                onClick={toggleAiPrefix}
                title="Toggle @ai assistant prompt"
                className={`absolute left-7 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[11px] font-bold border transition cursor-pointer ${
                    isAiPrompt
                        ? "bg-purple-600/30 border-purple-500 text-purple-300"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-purple-400 hover:border-purple-500/50"
                }`}
            >
                @ai
            </button>

            <input
                ref={inputRef}
                type="text"
                autoFocus
                className={`w-full bg-black border focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-600 py-3 pl-18 pr-4 text-sm ${
                    isAiPrompt
                        ? "border-purple-500/60 focus:border-purple-400"
                        : "border-zinc-800 focus:border-zinc-700"
                }`}
                value={inputVal}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        handleSendMessage();
                    }
                }}
                placeholder="Type message or click @ai to ask Gemini..."
                onChange={(e) => handleTyping(e.target.value)}
            />
        </div>

        <button
            onClick={() => {
                handleSendMessage();
            }}
            disabled={!inputVal.trim() || isPending}
            className={`px-6 text-sm font-bold transition-all disabled:cursor-not-allowed cursor-pointer ${
                isAiPrompt
                    ? "bg-purple-600 text-white hover:bg-purple-500"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
        >
            {isAiPrompt ? "ASK AI" : "SEND"}
        </button>
    </div>
</div>

    </main>
    )
}

export default Page;