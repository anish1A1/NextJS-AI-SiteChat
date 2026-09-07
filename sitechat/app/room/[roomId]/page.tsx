"use client";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

// from package date-funs
import {format} from "date-fns";
import { useRealtime } from "@/lib/realtime-client";


const formatTimeRemaing = (seconds: number) => {
        const min = Math.floor(seconds/60)
        const sec = seconds % 60
        return `${min}:${sec.toString().padStart(2, "0")}`
    }

const Page = () => {
    const params = useParams()
    const roomId = params.roomId as string

    const { username } = useUsername()
    const [inputVal, setInput] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const [copyStatus, setCopyStatus] = useState("Copy")
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

    // For Post: Sending Message
    const {mutate: sendMessage, isPending } = useMutation({
        mutationFn: async ({text}: {text: string}) => {
           await client.api.messages.post(
            {
                sender: username, 
                text
           }, {query: {roomId}}
        )
        }
    })

    // For Get: Fetching Message also looking stale data.
    const {data: messages, refetch} = useQuery({
        queryKey: ["messages", roomId],  //whenever there is change in roomId refetch data.
        queryFn: async () => {
            const res = await client.api.messages.get(
                {query :{ roomId}})
            return res.data
        }
    })


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
        events: ["chat.message", "chat.destroy"],
        onData: ({event}) => {
            if(event === "chat.message") {

                // refetch is from tanstack useQuery and got it from messages func.
                refetch()
            }
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

            <button className="text-sm bg-zinc-800 hover:bg-red-600 placeholder-zinc-300 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50">
                <span className="group-hover:animate-pulse ">
                ⚰️
                </span>
                DESTROY NOW
            </button>
        </header>
        
        {/* All the messages will be shown here. */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages?.messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-600 text-sm font-mono">No messages yet, start the Conversation.
                    </p>
                </div>
            )}

            {messages?.messages.map((msg) => (
                <div key={msg.id} className="flex flex-col items-start">
                    <div className="max-w-[80%] group">
                        <div className="flex items-baseline gap-3 mb-1">
                            
                            <span className={`text-sm font-bold ${msg.sender === username ? "text-green-500" : "text-blue-500"}`}>
                                {msg.sender === username ? 'YOU' : msg.sender}
                            </span>

                            <span className="text-[10px] text-zinc-600 ">{format(msg.timeStamp, "HH:mm")}
                            </span>
                        </div>

                        <p className="text-sm text-zinc-300 leading-relaxed break-all">
                            {msg.text}
                        </p>
                    </div>
                </div>
            ))}
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
                        if(e.key === "Enter" && 
                            inputVal.trim()) {
                                //  TODO: Send Message (backend)
                                sendMessage({text : inputVal})
                                inputRef.current?.focus()
                            }
                    }}
                    placeholder="Type Message..."
                    onChange={(e) => setInput(e.target.value)}
                    />
                </div>

                <button
                onClick={() => {
                        sendMessage({text: inputVal})
                        inputRef.current?.focus()
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