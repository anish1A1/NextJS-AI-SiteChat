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

    const [copyStatus, setCopyStatus] = useState("Copy")
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    // This will help to get the current location of new message.
    const messageEndRef = useRef<HTMLDivElement>(null);

    // Typing indicator states
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [typingUser, setTypingUser] = useState("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


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

        if (!value.trim()) {
            sendTyping({typing: false})
            return;
        }

        // Tell the other user that we are typing
        sendTyping({ typing: true });


        // Reset the timer every time the user types
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

         // If no new character is typed for 1 second,
    // tell the other user that typing has stopped.
        typingTimeoutRef.current = setTimeout(() => {
            sendTyping({typing: false});
        }, 1000);
    }

    useEffect(() => {
    return () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };
}, []);


     useEffect(() => {
        if (ttlData?.ttl !== undefined) {
            setTimeRemaining(ttlData?.ttl);
        }
    }, [ttlData])

    useEffect(() => {
        if (timeRemaining === null || timeRemaining < 0) return;

        if (timeRemaining === 0) {
            router.push('/?destroyed=true')
            return
        }

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev == null || prev <= 1)  {
                    clearInterval(interval)
                    return 0
                }
                return prev -1
            })
        }, 1000)
        
        // The cleanup function so, there is no memory leak.
        return () => clearInterval(interval)
    }, [timeRemaining, router])

    const copyLink = () => {
        const url = window.location.href
        navigator.clipboard.writeText(url)
        setCopyStatus("Copied")

        setTimeout(()=> {
            setCopyStatus("Copy")
        }, 5000 )
    }

    // Now to get the realtime messages from message of redis we use useRealtime.

    useRealtime({
        channels:[roomId],
        events: ["chat.message", "chat.destroy", "chat.typing"],
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
                console.log("Realtime event:", event, data);

                if (data.sender === username) return;
                // we do not make typing for current user.

                setTypingUser(data.sender);
                setIsOtherUserTyping(data.typing);
            }
        }
    })

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

    return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
        <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30 ">

            <div className="flex items-center gap-4">

                <div className="flex flex-col">

                    <span className="text-sm text-zinc-500 uppercase">
                        Room ID
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-green-500">{roomId}</span>

                        <button onClick={copyLink} 
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-500 px-2 py-0.5 rounded text-zinc-200 transition-colors">  {copyStatus}
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
                <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-600 text-sm font-mono">No messages yet, start the Conversation.
                    </p>
                </div>
            )}

            {messages?.messages.map((msg) => {
                const isOwnMessage = msg.sender === username

                return (
                <div key={msg.id} className={`flex ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                }`}>
                    <div className={`max-w-[75%] flex flex-col 
                        ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            
                            {/* Sender */}
                        {!isOwnMessage && (
                            <span className="text-xs text-blue-400 mb-1 px-2">
                                {msg.sender}
                            </span>
                        )}

                            {/* Message bubble */}
                    <div
                        className={`px-4 py-2 rounded-2xl ${
                            isOwnMessage
                                ? "bg-green-600 text-white rounded-br-sm"
                                : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                        }`}
                    >
                        <p className="text-sm leading-relaxed wrap-break-word">
                            {msg.text}
                        </p>

                        <span
                        className={`block text-[8px] mt-1 text-right ${
                            isOwnMessage
                                ? "text-green-200"
                                : "text-zinc-500"
                        }`}
                    >
                        {format(msg.timeStamp, "HH:mm")}
                    </span>
                    </div>
            </div>

                        
        </div>
        )})}
        {isOtherUserTyping && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
            </div>

            <span>{typingUser} is typing...</span>
        </div>
    )}
                    <div ref={messageEndRef}/>

        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
            <div className="flex gap-4">
                <div className="flex-1 relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 animate-pulse">{">"}</span>

                    <input type="text"
                    autoFocus
                    className="w-full bg-black border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm" 
                    value={inputVal}
                    onKeyDown={(e) => {
                        if(e.key === "Enter") {
                                handleSendMessage()
                            }
                    }}
                    placeholder="Type Message..."
                    onChange={(e) => handleTyping(e.target.value)}
                    />
                </div>

                <button
                onClick={() => {
                        handleSendMessage()
                    }}
                disabled={!inputVal.trim() || isPending}
                className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:cursor-not-allowed cursor-pointer" 
                >
                    SEND
                </button>
            </div>
        </div>
    </main>
    )
}

export default Page;