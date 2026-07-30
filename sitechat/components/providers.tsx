"use client"

import { QueryClient } from "@tanstack/react-query"
import { useState } from "react"

export const Providers = () => {
    const [queryClient] = useState(() => new QueryClient())

    
}