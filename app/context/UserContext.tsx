"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import usersData from '../data/users.json'

interface User {
  id: number
  name: string
  email: string
  learningProgress: {
    currentLevel: number
    completedLessons: number
    totalLessons: number
    lastAccessed: string
    progress: {
      [key: string]: {
        completed: boolean
        score: number
        lessons: Array<{
          id: number
          completed: boolean
          score: number
        }>
      }
    }
  }
  dashboardStats: {
    totalTimeSpent: string
    averageScore: number
    streak: number
    achievements: string[]
  }
}

interface UserContextType {
  user: User | null
  login: (email: string, password: string) => boolean
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (email: string, password: string) => {
    const foundUser = usersData.users.find(
      (u) => u.email === email && u.password === password
    )
    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword as User)
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 