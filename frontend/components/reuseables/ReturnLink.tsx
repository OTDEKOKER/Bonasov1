"use client"

import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export interface ReturnLinkProps {
  url: string
  label: string
  className?: string
}

export function ReturnLink({ url, label, className }: ReturnLinkProps) {
  return (
    <div className={cn("mb-4", className)}>
      <Link
        href={url}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </div>
  )
}

export default ReturnLink
