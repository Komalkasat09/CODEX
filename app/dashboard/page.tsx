"use client"

import React, { useEffect, useState } from 'react'
import { motion } from "framer-motion"
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Calendar, ChevronRight, Clock, Crown, HandMetal, LineChart, Phone, Trophy, Video, BarChart } from "lucide-react"
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { useUser } from '../context/UserContext'
import { useRouter } from 'next/navigation'
import  Spline  from '@splinetool/react-spline'
// Sample user stats data
const userStats = {
  completedLessons: 12,
  totalLessons: 30,
  streak: 7,
  points: 2450,
  rank: 'Intermediate',
  nextMilestone: 'Advanced',
  pointsToNextMilestone: 550,
  totalPointsForNextMilestone: 1000
}

// Sample recent activities
const recentActivities = [
  { id: 1, type: 'lesson', title: 'Conversational Signs', date: '2 hours ago', icon: <BookOpen className="w-4 h-4" /> },
  { id: 2, type: 'practice', title: 'Daily Practice', date: 'Yesterday', icon: <Clock className="w-4 h-4" /> },
  { id: 3, type: 'call', title: 'Video Call with Sarah', date: '2 days ago', icon: <Video className="w-4 h-4" /> },
  { id: 4, type: 'conversion', title: 'Text to Sign Translation', date: '3 days ago', icon: <HandMetal className="w-4 h-4" /> }
]

// Sample upcoming lessons
const upcomingLessons = [
  { id: 1, title: 'Advanced Greetings', date: 'Today, 2:00 PM', duration: '30 mins' },
  { id: 2, title: 'Restaurant Vocabulary', date: 'Tomorrow, 10:00 AM', duration: '45 mins' },
  { id: 3, title: 'Emergency Phrases', date: 'Wed, 3:00 PM', duration: '60 mins' }
]

// Sample data for charts
const weeklyProgressData = [
  { day: 'Mon', minutes: 25, signs: 15 },
  { day: 'Tue', minutes: 45, signs: 22 },
  { day: 'Wed', minutes: 30, signs: 18 },
  { day: 'Thu', minutes: 60, signs: 35 },
  { day: 'Fri', minutes: 20, signs: 12 },
  { day: 'Sat', minutes: 50, signs: 28 },
  { day: 'Sun', minutes: 40, signs: 20 }
]

const skillDistributionData = [
  { name: 'Alphabet', value: 90 },
  { name: 'Numbers', value: 85 },
  { name: 'Greetings', value: 75 },
  { name: 'Questions', value: 60 },
  { name: 'Emotions', value: 40 }
]

const monthlyPointsData = [
  { month: 'Jan', points: 350 },
  { month: 'Feb', points: 450 },
  { month: 'Mar', points: 320 },
  { month: 'Apr', points: 500 },
  { month: 'May', points: 600 },
  { month: 'Jun', points: 550 }
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Define the Dashboard component
const Dashboard = () => {
  const { user } = useUser()
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [activeChart, setActiveChart] = useState('weekly')
  
  useEffect(() => {
    if (!user) {
      router.push('/sign-in')
      return
    }
    
    const timer = setTimeout(() => {
      setProgress((user.learningProgress.completedLessons / user.learningProgress.totalLessons) * 100)
    }, 500)
    return () => clearTimeout(timer)
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto pt-20">
      <div className="flex flex-col gap-6">
        {/* Welcome Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-2xl">Welcome back, {user.name}!</CardTitle>
                <CardDescription>Continue your sign language journey</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Course Progress</h4>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{user.learningProgress.completedLessons} / {user.learningProgress.totalLessons} lessons completed</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Current Streak</h4>
                    <div className="flex items-center">
                      <div className="bg-primary/20 p-2 rounded-full mr-3">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-xl font-bold">{user.dashboardStats.streak} days</span>
                        <p className="text-sm text-muted-foreground">Keep it up!</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Average Score</h4>
                  <div className="flex items-center mb-2">
                    <Crown className="w-5 h-5 text-amber-500 mr-2" />
                    <span className="font-medium">{user.dashboardStats.averageScore}%</span>
                  </div>
                  <Progress value={user.dashboardStats.averageScore} className="h-2" />
                  <p className="text-sm mt-1 text-muted-foreground">Current level: {user.learningProgress.currentLevel}</p>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Total Time Spent</h4>
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-full mr-3">
                        <LineChart className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-xl font-bold">{user.dashboardStats.totalTimeSpent}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>
                  Continue Learning
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Practice Model</CardTitle>
                <CardDescription>Interactive 3D hand model</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center h-56">
                <div className="w-full h-full">
                  {/* Placeholder for 3D model */}
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex justify-center items-center">
                  <Spline scene="https://prod.spline.design/kCgc3rHsmAGC0CE0/scene.splinecode" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Practice Signs
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Data Visualization Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Learning Analytics</CardTitle>
              <CardDescription>Visualize your progress and performance</CardDescription>
              <div className="flex space-x-2 mt-2">
                <Button 
                  variant={activeChart === 'weekly' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveChart('weekly')}
                >
                  Weekly Progress
                </Button>
                <Button 
                  variant={activeChart === 'skills' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveChart('skills')}
                >
                  Skill Distribution
                </Button>
                <Button 
                  variant={activeChart === 'points' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveChart('points')}
                >
                  Points History
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {activeChart === 'weekly' && (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={weeklyProgressData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="minutes" name="Minutes Practiced" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="signs" name="Signs Learned" fill="#82ca9d" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
              
              {activeChart === 'skills' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={skillDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {skillDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Proficiency']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              
              {activeChart === 'points' && (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={monthlyPointsData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="points" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Activities and Schedule Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Activities & Schedule</CardTitle>
                <CardDescription>Track your learning journey</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="recent">
                  <TabsList className="mb-4">
                    <TabsTrigger value="recent">Recent Activities</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming Lessons</TabsTrigger>
                  </TabsList>
                  <TabsContent value="recent">
                    <div className="space-y-4">
                      {recentActivities.map(activity => (
                        <div key={activity.id} className="flex items-center p-3 bg-muted/50 rounded-lg">
                          <div className="bg-background p-2 rounded-full mr-3">
                            {activity.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.date}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="upcoming">
                    <div className="space-y-4">
                      {upcomingLessons.map(lesson => (
                        <div key={lesson.id} className="flex items-center p-3 bg-muted/50 rounded-lg">
                          <div className="bg-background p-2 rounded-full mr-3">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{lesson.title}</p>
                            <div className="flex text-sm text-muted-foreground">
                              <span>{lesson.date}</span>
                              <span className="mx-2">•</span>
                              <span>{lesson.duration}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Join
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
                <CardDescription>Frequently used tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/CSL">
                  <Button variant="outline" className="w-full justify-start">
                    <HandMetal className="mr-2 h-4 w-4" />
                    Text to Sign Converter
                  </Button>
                </Link>
                <Link href="/learn">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Learning Resources
                  </Button>
                </Link>
                <Link href="/call">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="mr-2 h-4 w-4" />
                    Practice Video Call
                  </Button>
                </Link>
                <Link href="/dashboard/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart className="mr-2 h-4 w-4" />
                    Detailed Analytics
                  </Button>
                </Link>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full">
                  View All Tools
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard