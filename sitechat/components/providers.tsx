"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RealtimeProvider } from "@upstash/realtime/client"
import { useState } from "react"

export const Providers = ({children}: {children: React.ReactNode}) => {

    // creating the client inside useState prevents data sharing across different user request
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions:{
            queries: {
                staleTime: 1000 * 60 * 5, //Date stays fresh for 5 minutes before background refetching
                refetchOnWindowFocus: true, //refetch data when user returns to the tab
            },
        },
    }))

    return <RealtimeProvider> <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> </RealtimeProvider>
        
        

    
}