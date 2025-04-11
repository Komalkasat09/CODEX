"use client"

import React, { useState, useEffect } from 'react'
import { motion } from "framer-motion"
import Spline from '@splinetool/react-spline'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { useUser } from '../context/UserContext'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { user, login } = useUser()

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleMouseMove = (e: React.MouseEvent) => {
    // Calculate mouse position as percentage of screen width/height
    const x = e.clientX / window.innerWidth
    const y = e.clientY / window.innerHeight
    setMousePosition({ x, y })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    const success = login(email, password)
    if (success) {
      router.push('/dashboard')
    } else {
      setError("Invalid email or password")
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col md:flex-row"
      onMouseMove={handleMouseMove}
    >
      {/* 3D Character/Mascot Section */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/10"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            transform: `translate(${mousePosition.x * 20 - 10}px, ${mousePosition.y * 20 - 10}px)` 
          }}
        >
          <Spline scene="https://prod.spline.design/eW0vBMWO1wLa235G/scene.splinecode" />
        </div>
        
        <div className="absolute bottom-8 left-8 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Break Language Barriers
            </h2>
            <p className="text-muted-foreground">
              Join our community and experience the power of modern sign language learning technology.
            </p>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Sign In Form Section */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="hello@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-500">
                    {error}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </label>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => setError("Social login is not available yet")}>Google</Button>
                <Button variant="outline" onClick={() => setError("Social login is not available yet")}>Apple</Button>
              </div>
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Link href="/sign-up" className="text-primary font-medium hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

