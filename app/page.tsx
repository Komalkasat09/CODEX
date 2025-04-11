// "use client"

// import React from 'react'
// import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion"
// import { useRef, useState } from "react"
// import Spline from '@splinetool/react-spline'
// import { Button } from "@/components/ui/button"
// import { HandMetal, BookOpen, Phone, Users, Globe, Brain, ChevronRight, Sparkles, Trophy, MessageSquare, Gauge, ArrowRight } from "lucide-react"
// import Link from "next/link"
// import { Card } from "@/components/ui/card"
// import { Progress } from "@/components/ui/progress"

// const AnimatedCounter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
//   const [count, setCount] = useState(0)
//   const ref = useRef(null)
//   const isInView = useInView(ref, { once: true })

//   if (isInView && count !== value) {
//     setTimeout(() => {
//       setCount(prev => Math.min(prev + Math.ceil(value / (duration * 20)), value))
//     }, 50)
//   }

//   return <span ref={ref}>{count.toLocaleString()}+</span>
// }

// const AnimatedGradientText = ({ children }: { children: React.ReactNode }) => {
//   return (
//     <span className="animate-gradient bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent bg-300% font-bold">
//       {children}
//     </span>
//   )
// }

// const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
//   const [isHovered, setIsHovered] = useState(false)
//   const progressRef = useRef(null)
//   const isInView = useInView(progressRef, { once: true })
//   const [progress, setProgress] = useState(0)

//   React.useEffect(() => {
//     if (isInView) {
//       setProgress(feature.progress)
//     }
//   }, [isInView, feature.progress])

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       whileInView={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5, delay: index * 0.2 }}
//       viewport={{ once: true }}
//       onHoverStart={() => setIsHovered(true)}
//       onHoverEnd={() => setIsHovered(false)}
//       className="relative group"
//     >
//       <Link href={feature.href}>
//         <Card className="relative overflow-hidden p-8 h-full transition-all duration-500 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br from-background to-accent/20">
//           <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
//           <motion.div
//             animate={{ 
//               scale: isHovered ? 1.1 : 1,
//               rotate: isHovered ? 5 : 0
//             }}
//             transition={{ type: "spring", stiffness: 400, damping: 10 }}
//             className="relative z-10 text-primary mb-6 bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center"
//           >
//             {feature.icon}
//           </motion.div>

//           <motion.div
//             animate={{ y: isHovered ? -5 : 0 }}
//             transition={{ duration: 0.2 }}
//             className="relative z-10"
//           >
//             <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
//               {feature.title}
//               <motion.span
//                 animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
//                 transition={{ duration: 0.2 }}
//               >
//                 <Sparkles className="w-5 h-5 text-yellow-500" />
//               </motion.span>
//             </h3>
//             <p className="text-muted-foreground mb-6">{feature.description}</p>
//           </motion.div>

//           <div className="relative z-10 space-y-4">
//             <div className="flex items-center justify-between text-sm">
//               <div className="flex items-center gap-2">
//                 {feature.achievements.map((achievement: string, i: number) => (
//                   <div key={i} className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
//                     <Trophy className="w-4 h-4 text-primary" />
//                     <span>{achievement}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div ref={progressRef} className="space-y-2">
//               <div className="flex justify-between text-sm">
//                 <span>{feature.progressLabel}</span>
//                 <span className="text-primary">{progress}%</span>
//               </div>
//               <Progress value={progress} className="h-2" />
//             </div>

//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-2 text-sm text-primary">
//                 <Gauge className="w-4 h-4" />
//                 <div className="font-bold">
//                   <AnimatedCounter value={feature.stats.value} />
//                 </div>
//                 <div className="text-muted-foreground">{feature.stats.label}</div>
//               </div>
//               <motion.div
//                 animate={{ 
//                   x: isHovered ? 0 : -10,
//                   opacity: isHovered ? 1 : 0
//                 }}
//                 className="flex items-center gap-1 text-primary"
//               >
//                 <span className="text-sm">Explore</span>
//                 <ArrowRight className="w-4 h-4" />
//               </motion.div>
//             </div>
//           </div>
//         </Card>
//       </Link>
//     </motion.div>
//   )
// }

// export default function Home() {
//   const ref = useRef(null)
//   const { scrollYProgress } = useScroll({
//     target: ref,
//     offset: ["start start", "end start"]
//   })

//   const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
//   const y = useSpring(useTransform(scrollYProgress, [0, 1], [0, -50]), springConfig)

//   const features = [
//     {
//       icon: <HandMetal className="w-8 h-8" />,
//       title: "Audio/Text to Sign",
//       description: "Convert speech and text into animated sign language using our advanced 3D avatar technology. Real-time translation with natural movements.",
//       href: "/dashboard/converter",
//       stats: { value: 50000, label: "Daily Translations" },
//       achievements: ["98% Accuracy", "Real-time"],
//       progress: 85,
//       progressLabel: "Translation Accuracy"
//     },
//     {
//       icon: <BookOpen className="w-8 h-8" />,
//       title: "Interactive Learning",
//       description: "Master sign language through our gamified curriculum. Earn badges, compete with friends, and track your progress in real-time.",
//       href: "/dashboard/learn",
//       stats: { value: 25000, label: "Active Learners" },
//       achievements: ["Top Rated", "Certified"],
//       progress: 92,
//       progressLabel: "Student Success Rate"
//     },
//     {
//       icon: <Phone className="w-8 h-8" />,
//       title: "Video Calls",
//       description: "Break communication barriers with our AI-powered video calls. Real-time sign language translation for seamless conversations.",
//       href: "/dashboard/call",
//       stats: { value: 10000, label: "Daily Calls" },
//       achievements: ["HD Quality", "Low Latency"],
//       progress: 95,
//       progressLabel: "Call Quality"
//     }
//   ]

//   const stats = [
//     { icon: <Users className="w-6 h-6" />, value: 100000, label: "Global Users" },
//     { icon: <Globe className="w-6 h-6" />, value: 50, label: "Countries" },
//     { icon: <Brain className="w-6 h-6" />, value: 95, label: "Success Rate" }
//   ]

//   return (
//     <main className="min-h-screen" ref={ref}>
//       {/* Hero Section */}
//       <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
//         <motion.div 
//           className="absolute inset-0 z-0"
//           style={{ y }}
//         >
//           <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
//         </motion.div>
        
//         <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 mt-16">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.8 }}
//             className="space-y-8"
//           >
//             <h1 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight">
//               Learn Sign Language<br />
//               <AnimatedGradientText>Interactively</AnimatedGradientText>
//             </h1>
//             <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
//               Master sign language through AI-powered 3D animations, interactive lessons,
//               and real-time video communication.
//             </p>
//             <div className="flex items-center justify-center gap-4">
//               <Button asChild size="lg" className="group">
//                 <Link href="/learn" className="flex items-center gap-2">
//                   Start Learning
//                   <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                 </Link>
//               </Button>
//               <Button variant="outline" size="lg" className="group">
//                 <Link href="/sign-in" className="flex items-center gap-2">
//                   Get Started
//                 </Link>
//               </Button>
//             </div>
//           </motion.div>
//         </div>

//         {/* Stats Banner */}
//         <motion.div
//           initial={{ opacity: 0, y: 50 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.8, delay: 0.5 }}
//           className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t"
//         >
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//             <div className="grid grid-cols-3 gap-8">
//               {stats.map((stat, index) => (
//                 <div key={index} className="flex items-center justify-center gap-3">
//                   <div className="p-2 rounded-full bg-primary/10">{stat.icon}</div>
//                   <div>
//                     <div className="text-2xl font-bold">
//                       <AnimatedCounter value={stat.value} />
//                     </div>
//                     <div className="text-sm text-muted-foreground">{stat.label}</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </motion.div>
//       </section>

//       {/* Features Section */}
//       <section className="py-32 bg-muted/50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.8 }}
//             viewport={{ once: true }}
//             className="text-center mb-20"
//           >
//             <h2 className="text-4xl font-bold mb-6">Platform Features</h2>
//             <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
//               Explore our comprehensive tools designed to make learning sign language
//               accessible, interactive, and engaging for everyone.
//             </p>
//           </motion.div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//             {features.map((feature, index) => (
//               <FeatureCard key={index} feature={feature} index={index} />
//             ))}
//           </div>
//         </div>
//       </section>
//     </main>
//   )
// }


"use client"

import React from 'react'
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import Spline from '@splinetool/react-spline'
import { Button } from "@/components/ui/button"
import { HandMetal, BookOpen, Phone, Users, Globe, Brain, ChevronRight, Sparkles, Trophy, MessageSquare, Gauge, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import * as THREE from 'three'
import SplashCursor from '@/ReactBits/SplashCursor/SplashCursor'
import { ThemeProvider } from '@/components/theme-provider'

// 3D Particle Background Component
const ParticleBackground = () => {
  const particleRef = useRef<HTMLDivElement>(null)
  const mousePosition = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    if (!particleRef.current) return
    
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    particleRef.current.appendChild(renderer.domElement)
    
    // Create particles
    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 200
    const posArray = new Float32Array(particleCount * 3)
    const colorArray = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      // Position
      posArray[i] = (Math.random() - 0.5) * 10
      posArray[i + 1] = (Math.random() - 0.5) * 10
      posArray[i + 2] = (Math.random() - 0.5) * 10
      
      // Color - gradients between primary, accent and secondary colors
      colorArray[i] = 0.5 + Math.random() * 0.5 // R: purplish
      colorArray[i + 1] = 0.2 + Math.random() * 0.4 // G: low-mid
      colorArray[i + 2] = 0.8 + Math.random() * 0.2 // B: high
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    })
    
    const particleMesh = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleMesh)
    
    camera.position.z = 5
    
    // Handle mouse movement
    const onMouseMove = (event: MouseEvent) => {
      mousePosition.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
      }
    }
    
    window.addEventListener('mousemove', onMouseMove)
    
    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', onWindowResize)
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      particleMesh.rotation.x += 0.001
      particleMesh.rotation.y += 0.001
      
      // Respond to mouse movement
      particleMesh.rotation.x += mousePosition.current.y * 0.001
      particleMesh.rotation.y += mousePosition.current.x * 0.001
      
      renderer.render(scene, camera)
    }
    
    animate()
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onWindowResize)
      if (particleRef.current) {
        particleRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])
  
  return <div ref={particleRef} className="absolute inset-0 z-0 opacity-40" />
}

// Floating 3D Objects Component
const FloatingObjects = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${50 + Math.random() * 100}px`,
            height: `${50 + Math.random() * 100}px`,
            background: `radial-gradient(circle, rgba(125,39,255,0.1) 0%, rgba(203,123,255,0.05) 100%)`,
            borderRadius: '50%',
          }}
          animate={{
            x: [0, Math.random() * 50 - 25],
            y: [0, Math.random() * 50 - 25],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8 + Math.random() * 7,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      ))}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={`shape-${i}`}
          className="absolute opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${20 + Math.random() * 30}px`,
            height: `${20 + Math.random() * 30}px`,
            background: i % 2 === 0 ? 'rgba(166, 85, 255, 0.2)' : 'rgba(251, 113, 133, 0.2)',
            clipPath: i % 3 === 0 
              ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' // diamond
              : i % 3 === 1
                ? 'polygon(50% 0%, 100% 100%, 0% 100%)' // triangle
                : 'circle(50% at 50% 50%)' // circle
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            rotate: [0, Math.random() * 360],
            scale: [1, Math.random() * 0.5 + 0.8],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      ))}
    </div>
  )
}

// // Hand Sign Animation Component
// const HandSignAnimation = () => {
//   const signRef = useRef<HTMLDivElement>(null)
//   const [rotation, setRotation] = useState({ x: 0, y: 0 })
  
//   useEffect(() => {
//     const handleMouseMove = (e: MouseEvent) => {
//       if (!signRef.current) return
      
//       const rect = signRef.current.getBoundingClientRect()
//       const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
//       const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
      
//       setRotation({
//         x: y * 10, // Invert for natural feel
//         y: x * 10
//       })
//     }
    
//     window.addEventListener('mousemove', handleMouseMove)
    
//     return () => {
//       window.removeEventListener('mousemove', handleMouseMove)
//     }
//   }, [])
  
//   return (
//     <motion.div
//       ref={signRef}
//       className="absolute bottom-24 right-24 w-40 h-40 md:w-64 md:h-64 z-10 hidden md:block"
//       style={{
//         perspective: 1000,
//       }}
//       animate={{
//         rotateX: rotation.x,
//         rotateY: rotation.y,
//       }}
//       transition={{
//         type: "spring",
//         stiffness: 75,
//         damping: 15
//       }}
//     >
//       <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
//         <motion.div
//           initial={{ scale: 0.8, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           transition={{ delay: 1, duration: 0.8 }}
//           className="relative"
//         >
//           <span className="text-6xl">👋</span>
//           <motion.div
//             className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full"
//             animate={{
//               scale: [1, 1.5, 1],
//               opacity: [0.7, 1, 0.7],
//             }}
//             transition={{
//               duration: 2,
//               repeat: Infinity,
//             }}
//           />
//         </motion.div>
//       </div>
//     </motion.div>
//   )
// }

const AnimatedCounter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  if (isInView && count !== value) {
    setTimeout(() => {
      setCount(prev => Math.min(prev + Math.ceil(value / (duration * 20)), value))
    }, 50)
  }

  return <span ref={ref}>{count.toLocaleString()}+</span>
}

const AnimatedGradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="animate-gradient bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent bg-300% font-bold">
      {children}
    </span>
  )
}

const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
  const [isHovered, setIsHovered] = useState(false)
  const progressRef = useRef(null)
  const isInView = useInView(progressRef, { once: true })
  const [progress, setProgress] = useState(0)

  React.useEffect(() => {
    if (isInView) {
      setProgress(feature.progress)
    }
  }, [isInView, feature.progress])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      viewport={{ once: true }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
    >
      <Link href={feature.href}>
        <Card className="relative overflow-hidden p-8 h-full transition-all duration-500 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br from-background to-accent/20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <motion.div
            animate={{ 
              scale: isHovered ? 1.1 : 1,
              rotate: isHovered ? 5 : 0
            }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="relative z-10 text-primary mb-6 bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center"
          >
            {feature.icon}
          </motion.div>

          <motion.div
            animate={{ y: isHovered ? -5 : 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              {feature.title}
              <motion.span
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </motion.span>
            </h3>
            <p className="text-muted-foreground mb-6">{feature.description}</p>
          </motion.div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {feature.achievements.map((achievement: string, i: number) => (
                  <div key={i} className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span>{achievement}</span>
                  </div>
                ))}
              </div>
            </div>

            <div ref={progressRef} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{feature.progressLabel}</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Gauge className="w-4 h-4" />
                <div className="font-bold">
                  <AnimatedCounter value={feature.stats.value} />
                </div>
                <div className="text-muted-foreground">{feature.stats.label}</div>
              </div>
              <motion.div
                animate={{ 
                  x: isHovered ? 0 : -10,
                  opacity: isHovered ? 1 : 0
                }}
                className="flex items-center gap-1 text-primary"
              >
                <span className="text-sm">Explore</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}

// Animated background wave
const BackgroundWave = () => {
  return (
    <div className="absolute inset-x-0 bottom-0 z-0 h-64 overflow-hidden opacity-30">
      <svg viewBox="0 0 1440 320" className="absolute bottom-0 w-full">
        <motion.path
          fill="url(#gradient)"
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,208C672,213,768,203,864,170.7C960,139,1056,85,1152,74.7C1248,64,1344,96,1392,112L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          animate={{
            d: [
              "M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,208C672,213,768,203,864,170.7C960,139,1056,85,1152,74.7C1248,64,1344,96,1392,112L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,256L48,240C96,224,192,192,288,186.7C384,181,480,203,576,224C672,245,768,267,864,245.3C960,224,1056,160,1152,138.7C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,160L48,170.7C96,181,192,203,288,218.7C384,235,480,245,576,218.7C672,192,768,128,864,117.3C960,107,1056,149,1152,165.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
        <defs>
          <linearGradient id="gradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// // Interactive Cursor Component
// const InteractiveCursor = () => {
//   const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
//   const [isVisible, setIsVisible] = useState(false)
  
//   useEffect(() => {
//     const mouseMove = (e: MouseEvent) => {
//       setMousePosition({
//         x: e.clientX,
//         y: e.clientY
//       })
//     }
    
//     const mouseEnter = () => setIsVisible(true)
//     const mouseLeave = () => setIsVisible(false)
    
//     window.addEventListener('mousemove', mouseMove)
//     document.addEventListener('mouseenter', mouseEnter)
//     document.addEventListener('mouseleave', mouseLeave)
    
//     return () => {
//       window.removeEventListener('mousemove', mouseMove)
//       document.removeEventListener('mouseenter', mouseEnter)
//       document.removeEventListener('mouseleave', mouseLeave)
//     }
//   }, [])
  
//   return (
//     <motion.div
//       className="fixed w-8 h-8 rounded-full border-2 border-primary pointer-events-none z-50 mix-blend-difference hidden md:block"
//       animate={{
//         x: mousePosition.x - 16,
//         y: mousePosition.y - 16,
//         opacity: isVisible ? 1 : 0,
//         scale: isVisible ? 1 : 0
//       }}
//       transition={{
//         type: "spring",
//         damping: 12,
//         stiffness: 150,
//         opacity: { duration: 0.2 }
//       }}
//     />
//   )
// }

export default function Home() {
  const ref = useRef(null)
  const [cursorPoint, setCursorPoint] = useState({ x: 0.5, y: 0.5 })
  const [splineObject, setSplineObject] = useState<any>(null)
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  })

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [0, -50]), springConfig)
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPoint({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  function onSplineLoad(spline: any) {
    setSplineObject(spline)
  }
  
  useEffect(() => {
    if (!splineObject) return
    
    // Manipulate the Spline object if needed
    // For example, rotating it based on cursor position
    const timer = setInterval(() => {
      try {
        const obj = splineObject.findObjectByName('Main')
        if (obj) {
          // Apply subtle rotation based on cursor position
          obj.rotation.x = (cursorPoint.y - 0.5) * 0.2
          obj.rotation.y = (cursorPoint.x - 0.5) * 0.2
        }
      } catch (e) {
        // Spline object might not be ready
      }
    }, 100)
    
    return () => clearInterval(timer)
  }, [splineObject, cursorPoint])

  const features = [
    {
      icon: <HandMetal className="w-8 h-8" />,
      title: "Audio/Text to Sign",
      description: "Convert speech and text into animated sign language using our advanced 3D avatar technology. Real-time translation with natural movements.",
      href: "/dashboard/converter",
      stats: { value: 50000, label: "Daily Translations" },
      achievements: ["98% Accuracy", "Real-time"],
      progress: 85,
      progressLabel: "Translation Accuracy"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Interactive Learning",
      description: "Master sign language through our gamified curriculum. Earn badges, compete with friends, and track your progress in real-time.",
      href: "/dashboard/learn",
      stats: { value: 25000, label: "Active Learners" },
      achievements: ["Top Rated", "Certified"],
      progress: 92,
      progressLabel: "Student Success Rate"
    },
    {
      icon: <Phone className="w-8 h-8" />,
      title: "Video Calls",
      description: "Break communication barriers with our AI-powered video calls. Real-time sign language translation for seamless conversations.",
      href: "/dashboard/call",
      stats: { value: 10000, label: "Daily Calls" },
      achievements: ["HD Quality", "Low Latency"],
      progress: 95,
      progressLabel: "Call Quality"
    }
  ]

  const stats = [
    { icon: <Users className="w-6 h-6" />, value: 100000, label: "Global Users" },
    { icon: <Globe className="w-6 h-6" />, value: 50, label: "Countries" },
    { icon: <Brain className="w-6 h-6" />, value: 95, label: "Success Rate" }
  ]

  return (
    <main className="min-h-screen" ref={ref}>
      {/* < SplashCursor />
      {/* Interactive cursor */}
      {/* <InteractiveCursor /> */} 
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 3D Particle Background */}
        <ParticleBackground />
        
        {/* Floating objects */}
        <FloatingObjects />
        
        {/* Animated wave background */}
        <BackgroundWave />
        
        {/* Spline 3D Model */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y }}
        >
          {/* <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" onLoad={onSplineLoad} /> */}
        </motion.div>
        
        {/* Interactive hand sign */}
        {/* <HandSignAnimation /> */}
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.h1 
              className="text-5xl sm:text-7xl font-bold mb-6 leading-tight"
              whileInView={{
                textShadow: [
                  "0 0 8px rgba(124, 58, 237, 0)",
                  "0 0 8px rgba(124, 58, 237, 0.5)",
                  "0 0 8px rgba(124, 58, 237, 0)"
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              Learn Sign Language<br />
              <AnimatedGradientText>Interactively</AnimatedGradientText>
            </motion.h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Master sign language through AI-powered 3D animations, interactive lessons,
              and real-time video communication.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button asChild size="lg" className="group relative">
                <Link href="/learn" className="flex items-center gap-2 overflow-hidden">
                  <motion.span
                    className="absolute inset-0 bg-primary/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative z-10">Start Learning</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="group relative">
                <Link href="/sign-in" className="flex items-center gap-2 overflow-hidden">
                  <motion.span
                    className="absolute inset-0 bg-primary/10"
                    initial={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <span className="relative z-10">Get Started</span>
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center justify-center gap-3"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <motion.div 
                    className="p-2 rounded-full bg-primary/10"
                    animate={{
                      boxShadow: [
                        "0 0 0 rgba(124, 58, 237, 0)",
                        "0 0 8px rgba(124, 58, 237, 0.5)",
                        "0 0 0 rgba(124, 58, 237, 0)"
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                  >
                    {stat.icon}
                  </motion.div>
                  <div>
                    <div className="text-2xl font-bold">
                      <AnimatedCounter value={stat.value} />
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-muted/50 relative overflow-hidden">
        {/* Background elements for features section */}
        <div className="absolute inset-0 z-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 rounded-full bg-primary/50"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, Math.random() * 100 - 50],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 5 + Math.random() * 10,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>
        
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-4xl font-bold mb-4"
            >
              Break Communication <AnimatedGradientText>Barriers</AnimatedGradientText>
            </motion.h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform offers comprehensive tools to learn, practice, and communicate in sign language with unmatched accuracy and ease.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <Button asChild size="lg" variant="outline" className="group">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span>View All Features</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-32 relative">
        <ParticleBackground />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-bold mb-4">
              What Our <AnimatedGradientText>Users Say</AnimatedGradientText>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Thousands of users trust our platform to learn sign language and communicate effectively.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                content: "This platform has completely transformed how I communicate with my deaf cousin. The real-time translation is incredibly accurate!",
                author: "Samantha K.",
                role: "Teacher",
                avatar: "👩‍🏫"
              },
              {
                content: "I've tried many sign language apps, but none compare to the interactive learning experience here. The 3D animations make it so intuitive.",
                author: "Michael T.",
                role: "Student",
                avatar: "👨‍🎓"
              },
              {
                content: "As someone who works with the deaf community daily, this tool has become indispensable. The video call feature with built-in translation is revolutionary.",
                author: "Dr. Lisa Wong",
                role: "Audiologist",
                avatar: "👩‍⚕️"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
                className="bg-card p-8 rounded-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <motion.svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-yellow-500"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 + index * 0.2 }}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
                      </motion.svg>
                    ))}
                  </div>
                  <p className="text-lg mb-6 flex-grow">{testimonial.content}</p>
                  <div className="flex items-center mt-4">
                    <div className="text-3xl mr-4">{testimonial.avatar}</div>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-32 bg-muted/50 relative overflow-hidden">
        <FloatingObjects />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-background to-card p-12 rounded-3xl relative overflow-hidden border"
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="md:max-w-xl">
                <h2 className="text-4xl font-bold mb-4">
                  Start Your Sign Language
                  <br />
                  <AnimatedGradientText>Journey Today</AnimatedGradientText>
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Join thousands of people learning to communicate through sign language with our AI-powered platform.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="group">
                    <Link href="/sign-up" className="flex items-center gap-2">
                      <span>Create Free Account</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="group">
                    <Link href="/demo" className="flex items-center gap-2">
                      <span>Try Demo</span>
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="md:w-80 h-80 relative">
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.3) 0%, rgba(124, 58, 237, 0) 70%)",
                      "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.5) 0%, rgba(124, 58, 237, 0) 70%)",
                      "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.3) 0%, rgba(124, 58, 237, 0) 70%)"
                    ]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 360 }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <span className="text-9xl">👋</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-16 bg-background border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SignMaster</h3>
              <p className="text-muted-foreground mb-6">Breaking communication barriers through AI-powered sign language solutions.</p>
              <div className="flex items-center gap-4">
                {[
                  { icon: "twitter", href: "#" },
                  { icon: "facebook", href: "#" },
                  { icon: "instagram", href: "#" },
                  { icon: "youtube", href: "#" }
                ].map((social, index) => (
                  <Link 
                    key={index} 
                    href={social.href} 
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <span className="sr-only">{social.icon}</span>
                    <div className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            </div>
            
            {[
              {
                title: "Product",
                links: [
                  { name: "Features", href: "#" },
                  { name: "Pricing", href: "#" },
                  { name: "Tutorial", href: "#" },
                  { name: "Resources", href: "#" }
                ]
              },
              {
                title: "Company",
                links: [
                  { name: "About Us", href: "#" },
                  { name: "Careers", href: "#" },
                  { name: "Blog", href: "#" },
                  { name: "Contact", href: "#" }
                ]
              },
              {
                title: "Legal",
                links: [
                  { name: "Terms of Service", href: "#" },
                  { name: "Privacy Policy", href: "#" },
                  { name: "Cookies", href: "#" },
                  { name: "Accessibility", href: "#" }
                ]
              }
            ].map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="font-semibold mb-6">{category.title}</h3>
                <ul className="space-y-4">
                  {category.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SignMaster. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}