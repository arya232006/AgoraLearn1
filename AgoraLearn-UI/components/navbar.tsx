"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Sparkles } from "lucide-react"
import { useAuthState } from 'react-firebase-hooks/auth'
import { signOut } from 'firebase/auth'
import { auth } from '../app/firebase'

import { Button } from "@components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@components/ui/sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@components/ui/avatar"
import DarkVeil from '@components/ui/DarkVeil'

export default function Navbar() {
  const pathname = usePathname()
  const [user] = useAuthState(auth)
  const [isOpen, setIsOpen] = React.useState(false)

  const mockUser = {
    name: "Guest User",
    email: "guest@example.com",
    image: "",
  }

  const displayUser = user ? {
    name: user.displayName || user.email?.split('@')[0] || mockUser.name,
    email: user.email || mockUser.email,
    image: user.photoURL || mockUser.image
  } : mockUser

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Chat", href: "/chat" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
       {/* Subtle animated background behind navbar */}
       <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden opacity-50">
          <DarkVeil resolutionScale={0.5} />
       </div>

      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto">
        {/* Mobile Menu */}
        <div className="flex items-center md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-black/95 border-r-white/10 text-white">
              <div className="flex flex-col space-y-4 mt-8">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl" onClick={() => setIsOpen(false)}>
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  <span>AgoraLearn</span>
                </Link>
                <div className="flex flex-col space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                        ${pathname === item.href
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:text-white hover:bg-white/5"}
                      `}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Mobile Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
             <Sparkles className="h-5 w-5 text-purple-400" />
             <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">AgoraLearn</span>
          </Link>
        </div>

        {/* Desktop Logo */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-white mr-4">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20">
               <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white via-purple-100 to-white/70 bg-clip-text text-transparent">AgoraLearn</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${pathname === item.href
                    ? "text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"}
                `}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-white/10 hover:ring-white/30 transition-all">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={displayUser.image || "/placeholder.svg"} alt={displayUser.name} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                    {displayUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/90 border-white/10 text-white backdrop-blur-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayUser.name}</p>
                  <p className="text-xs leading-none text-white/50">{displayUser.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
