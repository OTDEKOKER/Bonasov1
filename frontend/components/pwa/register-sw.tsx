"use client"

import { useEffect } from "react"
import { scheduleMutationSync } from "@/lib/offline/mutation-queue"

const enableInDev = process.env.NEXT_PUBLIC_ENABLE_SW === "true"

type SyncUpdatePayload = {
  type?: string
  pending?: number
  processed?: number
  historyUpdated?: boolean
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production" && !enableInDev) return

    const triggerSync = () => {
      void scheduleMutationSync()
    }

    const handleMessage = (event: MessageEvent<SyncUpdatePayload>) => {
      if (event.data?.type !== "OFFLINE_SYNC_UPDATE") return
      window.dispatchEvent(
        new CustomEvent("bonaso:sync-state", {
          detail: {
            pending: event.data.pending ?? 0,
            processed: event.data.processed ?? 0,
            historyUpdated: !!event.data.historyUpdated,
          },
        }),
      )
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        triggerSync()
      })
      .catch((error) => {
        console.error("Service worker registration failed", error)
      })

    window.addEventListener("online", triggerSync)
    navigator.serviceWorker.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("online", triggerSync)
      navigator.serviceWorker.removeEventListener("message", handleMessage)
    }
  }, [])

  return null
}
