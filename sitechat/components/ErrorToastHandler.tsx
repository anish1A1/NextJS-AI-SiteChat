"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {toast} from "sonner";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  "room-full": {
    title: "Room is Full",
    description: "This chat room has reached its maximum 2-user capacity.",
  },
  "room-not-found": {
    title: "Room Expired or Missing",
    description: "The secure space you are trying to access does not exist.",
  },
};

export default function ErrorToastHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const errorKey = searchParams.get('error');
        const isDestroyed = searchParams.get('destroyed') === 'true';

        // We will store the data to display in toast here.
        let toastConfig = null;

        if (isDestroyed) {
            toastConfig = {
                title: "Room Destroyed",
                description: "The time limit of the chat hit. The space and all releated data were wiped."
            };
        
            // If error is same as ERROR_MESSAGE than set toastConfig to it or set it default as written below.
        } else if (errorKey) {
            const mappedError = ERROR_MESSAGES[errorKey] || {
                title: "Connection Error",
                description: decodeURIComponent(errorKey),
            };
            toastConfig = mappedError
        }

        // If an event matched, show the toast and clean the address bar
        if (toastConfig) {
            toast.error(toastConfig.title, {
                description: toastConfig.description,
            });

            // Instantly scrub '?error=' and '?destroyed=' variables from the browser URL bar

            const params = new URLSearchParams(searchParams.toString());
            params.delete("error");
            params.delete("destroyed");

            // Compute clean path string (e.g., just "/" instead of "/?error=room-full")

            const newUrl = pathname.toString() ? `${pathname}?${params.toString()}` : pathname

            // router.replace updates the URL silently without forcing page refreshes or adding history loops
            router.replace(newUrl, {scroll: false});
        }
    }, [searchParams, pathname, router])

    return null;
    // Logic-only component; renders no visible HTML elements
}