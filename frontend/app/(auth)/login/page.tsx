"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push("/dashboard")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await authService.login({ username, password })
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      })
      router.push("/dashboard")
    } catch (err: unknown) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Invalid username or password. Please try again."

      setError(errorMessage)
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#005a2f] p-6">
      <section className="w-full max-w-[620px] border-4 border-[#4bb978] bg-[#004a27] px-10 py-12 text-white shadow-2xl">
        <div className="mx-auto mb-8 flex w-full max-w-[320px] flex-col items-center">
          <p className="text-4xl font-bold tracking-wide">BONASO</p>
          <div
            className="mt-3 h-0 w-0 border-l-[68px] border-r-[68px] border-t-[120px] border-l-transparent border-r-transparent border-t-white/95"
            aria-hidden="true"
          />

          <h1 className="mt-8 text-5xl font-bold">Welcome!</h1>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[320px] space-y-5">
          {error ? (
            <div className="rounded bg-red-100/95 px-3 py-2 text-sm font-medium text-red-900">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="username" className="block text-center text-3xl font-semibold text-white">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="h-12 rounded-none border-0 bg-[#d7dde7] text-lg text-black placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="block text-center text-3xl font-semibold text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-none border-0 bg-[#d7dde7] text-lg text-black placeholder:text-slate-600"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-12 w-full rounded-none bg-white text-2xl font-semibold text-[#024025] hover:bg-white/90"
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Login
          </Button>
        </form>
      </section>
    </main>
  )
}
