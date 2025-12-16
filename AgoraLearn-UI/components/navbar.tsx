"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@components/ui/avatar"
import DarkVeil from '@components/ui/DarkVeil';
import { useEffect, useState } from 'react'
import { supabase } from '../app/supabaseClient'

export default function Navbar() {
  const pathname = usePathname()

  // Mock user data (fallback)
  const mockUser = {
    name: "John Doe",
    email: "john@example.com",
    image: "/placeholder-user.jpg",
  }

  // Try to load a real user from localStorage (client-side only).
  const [user, setUser] = useState<typeof mockUser | null>(null)

  useEffect(() => {
    try {
      // Try Supabase first
      ;(async () => {
        try {
          const { data, error } = await supabase.auth.getUser()
          if (!error && data?.user) {
            setUser({
              name: data.user.user_metadata?.full_name || data.user.email || mockUser.name,
              email: data.user.email || mockUser.email,
              image: (data.user.user_metadata as any)?.avatar_url || mockUser.image,
            })
            return
          }
        } catch (e) {
          // ignore and fall back to localStorage
        }
      })()

      const candidates = [
        localStorage.getItem('agoralearn:user'),
        localStorage.getItem('user'),
        localStorage.getItem('profile'),
      ]
      for (const c of candidates) {
        if (!c) continue
        try {
          const parsed = JSON.parse(c)
          if (parsed && (parsed.name || parsed.email)) {
            setUser({
              name: parsed.name || parsed.user?.name || mockUser.name,
              email: parsed.email || parsed.user?.email || mockUser.email,
              image: parsed.image || parsed.user?.image || mockUser.image,
            })
            return
          }
        } catch {
          // Not JSON, maybe a raw name string
          if (c && typeof c === 'string') {
            setUser({ name: c, email: '', image: mockUser.image })
            return
          }
        }
      }
    } catch (err) {
      // ignore
    }
    // fallback to null so UI uses mockUser
    setUser(null)
  }, [])

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Chat", href: "/chat" },
  ]

  return (
    <nav className="border-b border-border sticky top-0 z-50 relative min-h-[64px]">
      {/* DarkVeil animated background for navbar */}
      <div className="absolute inset-0 -z-10 h-full w-full">
        <DarkVeil resolutionScale={1} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="font-bold text-xl text-white">
            AgoraLearn
          </Link>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border border-black glare-hover
                  ${pathname === item.href
                    ? "bg-white text-black shadow"
                    : "bg-black text-white hover:bg-white hover:text-black"}
                `}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={(user || mockUser).image || "/placeholder.svg"} alt={(user || mockUser).name} />
                  <AvatarFallback>{((user || mockUser).name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center space-x-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{(user || mockUser).name}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{(user || mockUser).email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Sign out clicked")}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
