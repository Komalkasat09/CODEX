"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HandMetal, BookOpen, Phone, LayoutDashboard, LogOut, Languages, Video, Mic, Fingerprint, Brain } from "lucide-react"
import { useUser } from "@/app/context/UserContext"
import { ThemeToggle } from "@/components/theme-toggle"

const Navigation = () => {
  const pathname = usePathname()
  const { user, logout } = useUser()

  const publicNavItems = [
    {
      path: "/text-to-sign",
      name: "Text to Sign",
      icon: <Languages className="w-5 h-5" />,
    },
    {
      path: "/sign-to-text",
      name: "Sign to Text",
      icon: <Fingerprint className="w-5 h-5" />,
    },
    {
      path: "/speech-to-sign",
      name: "Transcript",
      icon: <Video className="w-5 h-5" />,
    },
  ]

  const authenticatedNavItems = [
    {
      path: "/dashboard",
      name: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      path: "/learn",
      name: "Learn",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      path: "/quiz",
      name: "Quiz",
      icon: <Brain className="w-5 h-5" />,
    },
    {
      path: "/call",
      name: "Call",
      icon: <Phone className="w-5 h-5" />,
    },
  ]

  const navItems = user ? [...publicNavItems, ...authenticatedNavItems] : publicNavItems

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <HandMetal className="w-8 h-8" />
            <span className="font-bold text-xl">SignSync</span>
          </Link>
          
          <div className="flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`relative flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary
                  ${pathname === item.path ? "text-primary" : "text-muted-foreground"}`}
              >
                {item.icon}
                <span>{item.name}</span>
                {pathname === item.path && (
                  <motion.div
                    className="absolute -bottom-[1.5px] left-0 right-0 h-0.5 bg-primary"
                    layoutId="navbar-indicator"
                  />
                )}
              </Link>
            ))}
            <ThemeToggle />
            {user && (
              <button
                onClick={() => {
                  logout()
                  window.location.href = "/sign-in"
                }}
                className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation