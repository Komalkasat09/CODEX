"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Star, Lock, CheckCircle, Play, ArrowLeft } from "lucide-react"
import { useUser } from '../context/UserContext'
import { useRouter } from 'next/navigation'

// Type definitions
interface VideoQueueItem {
  text: string;
  path: string | null;
  instructions?: string;
}

interface Level {
  id: number;
  title: string;
  completed: boolean;
  stars: number;
  content: string;
  position: {
    x: string;
    y: string;
  };
  customVideos?: string[];
}

interface Category {
  id: string;
  title: string;
  description: string;
  color: string;
  levels: Level[];
}

export default function SignLanguageLearning(): JSX.Element {
  const { user } = useUser()
  const router = useRouter()
  
  // Add state for welcome intro
  const [showIntro, setShowIntro] = useState<boolean>(true)
  const introVideoRef = useRef<HTMLVideoElement | null>(null)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("")
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState<string>("alphabets")
  const [currentLesson, setCurrentLesson] = useState<Level | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0)
  const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([])
  const [currentLetter, setCurrentLetter] = useState<string>("")
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false)
  const [currentInstruction, setCurrentInstruction] = useState<string>("")
  const [showSuccess, setShowSuccess] = useState<boolean>(false)
  
  // Video reference
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playbackSpeed = 1.0
  
  // Handle welcome video initialization and ending
  useEffect(() => {
    if (showIntro && introVideoRef.current) {
      // Set volume to max (1.0)
      introVideoRef.current.volume = 1.0;
      
      // Function to speak the subtitles at specified times
      const speakSubtitles = () => {
        const videoElement = introVideoRef.current;
        if (!videoElement) return;
        
        // Speech synthesis setup
        const synth = window.speechSynthesis;
        
        // Define subtitle timings and text from the VTT file
        const subtitles = [
          { startTime: 1, endTime: 6, text: "Hi, my name is Mr. Sign" },
          { startTime: 7, endTime: 14, text: "I am your guide throughout this journey" },
          { startTime: 15, endTime: 19.5, text: "Let's learn sign language together" }
        ];
        
        // Set up timeupdate event to check when to speak each subtitle
        let spokenSubtitles = new Set();
        
        const onTimeUpdate = () => {
          const currentTime = videoElement.currentTime;
          
          // Update the visible subtitle text based on current time
          if (currentTime >= 1 && currentTime < 6) {
            setCurrentSubtitle("Hi, my name is Mr. Sign");
          } else if (currentTime >= 7 && currentTime < 14) {
            setCurrentSubtitle("I am your guide throughout this journey");
          } else if (currentTime >= 15 && currentTime < 19.5) {
            setCurrentSubtitle("Let's learn sign language together");
          } else {
            setCurrentSubtitle("");
          }
          
          subtitles.forEach((subtitle, index) => {
            // Speak each subtitle when its start time is reached (but only once)
            if (currentTime >= subtitle.startTime && currentTime < subtitle.startTime + 0.5 && !spokenSubtitles.has(index)) {
              // Mark this subtitle as spoken
              spokenSubtitles.add(index);
              
              // Create and configure utterance
              const utterance = new SpeechSynthesisUtterance(subtitle.text);
              utterance.rate = 0.5; // Slow down speech to 0.5x speed
              utterance.pitch = 1.0;
              utterance.volume = 1.0;
              
              // Calculate speech duration to match video segment
              const speechDuration = subtitle.endTime - subtitle.startTime;
              
              // Use a clear, natural voice if available
              const voices = synth.getVoices();
              const preferredVoice = voices.find(voice => 
                voice.lang.includes("en-US") && voice.name.includes("Google") || voice.name.includes("Samantha")
              ) || voices.find(voice => voice.lang.includes("en"));
              
              if (preferredVoice) {
                utterance.voice = preferredVoice;
              }
              
              // Ensure speech ends before the next subtitle begins
              utterance.onend = () => {
                console.log(`Finished speaking: "${subtitle.text}"`);
              };
              
              // Set a timeout to cancel this speech if it runs too long
              // This ensures speech finishes by the end of its time window
              const maxSpeechTime = (subtitle.endTime - subtitle.startTime) * 1000;
              setTimeout(() => {
                // Check if this specific utterance is still speaking
                if (spokenSubtitles.has(index) && synth.speaking) {
                  synth.cancel();
                  console.log(`Canceled speech for "${subtitle.text}" due to time limit`);
                }
              }, maxSpeechTime);
              
              // Cancel any ongoing speech before starting new one
              synth.cancel();
                
              // Speak the subtitle
              synth.speak(utterance);
            }
          });
        };
        
        // Add the event listener to sync speech with video
        videoElement.addEventListener('timeupdate', onTimeUpdate);
        
        // Load voices right away and add an event listener for when voices change
        synth.getVoices();
        
        // Clean up function to remove event listener and stop speaking
        return () => {
          videoElement.removeEventListener('timeupdate', onTimeUpdate);
          synth.cancel();
        };
      };
      
      // Start the video and speech synthesis
      const cleanupSpeech = speakSubtitles();
      introVideoRef.current.play().catch(err => {
        console.error("Error playing intro video:", err);
        // If video fails to play, skip intro
        setShowIntro(false);
      });
      
      // Return cleanup function
      return cleanupSpeech;
    }
  }, [showIntro]);

  useEffect(() => {
    // Check for user authentication
    if (!user) {
      router.push('/sign-in')
      return
    }
  }, [user, router])

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // Categories and levels data
  const categories: Category[] = [
    {
      id: "alphabets",
      title: "Alphabets",
      description: "Learn to sign the alphabet letters",
      color: "#4F46E5", // Indigo
      levels: [
        { 
          id: 1, 
          title: "A-E", 
          completed: user.learningProgress.progress.level1?.completed || false, 
          stars: user.learningProgress.progress.level1?.score || 0,
          content: "abcde",
          position: { x: "10%", y: "30%" }
        },
        { 
          id: 2, 
          title: "F-J", 
          completed: user.learningProgress.progress.level2?.completed || false, 
          stars: user.learningProgress.progress.level2?.score || 0,
          content: "fghij",
          position: { x: "30%", y: "20%" }
        },
        { 
          id: 3, 
          title: "K-O", 
          completed: user.learningProgress.progress.level3?.completed || false, 
          stars: user.learningProgress.progress.level3?.score || 0,
          content: "klmno",
          position: { x: "50%", y: "30%" }
        },
        { 
          id: 4, 
          title: "P-T", 
          completed: false, 
          stars: 0,
          content: "pqrst",
          position: { x: "70%", y: "20%" }
        },
        { 
          id: 5, 
          title: "U-Z", 
          completed: false, 
          stars: 0,
          content: "uvwxyz",
          position: { x: "85%", y: "35%" }
        },
      ]
    },
    {
      id: "greetings",
      title: "Greetings",
      description: "Learn everyday greeting expressions",
      color: "#EF4444", // Red
      levels: [
        { 
          id: 6, 
          title: "Hello & Goodbye", 
          completed: false, 
          stars: 0,
          content: "hello goodbye",
          position: { x: "15%", y: "30%" }
        },
        { 
          id: 7, 
          title: "Thank You", 
          completed: false, 
          stars: 0,
          content: "thank you",
          position: { x: "35%", y: "20%" }
        },
        { 
          id: 8, 
          title: "Please & Welcome", 
          completed: false, 
          stars: 0,
          content: "please welcome",
          position: { x: "55%", y: "30%" }
        },
        { 
          id: 9, 
          title: "How Are You?", 
          completed: false, 
          stars: 0,
          content: "how are you",
          position: { x: "75%", y: "20%" }
        },
      ]
    },
    {
      id: "sentences",
      title: "Sentences",
      description: "Learn to sign complete sentences",
      color: "#10B981", // Emerald
      levels: [
        { 
          id: 10, 
          title: "Basic Questions", 
          completed: false, 
          stars: 0,
          content: "what who when where why",
          position: { x: "10%", y: "30%" }
        },
        { 
          id: 11, 
          title: "Family Members", 
          completed: false, 
          stars: 0,
          content: "mother father sister brother",
          position: { x: "35%", y: "20%" }
        },
        { 
          id: 12, 
          title: "Common Phrases", 
          completed: false, 
          stars: 0,
          content: "my name is nice to meet you",
          position: { x: "60%", y: "30%" }
        },
        { 
          id: 13, 
          title: "Daily Activities", 
          completed: false, 
          stars: 0,
          content: "eat sleep work play",
          position: { x: "85%", y: "20%" }
        },
      ]
    }
  ]

  // Get progress statistics
  const getCurrentCategory = (): Category => {
    return categories.find(cat => cat.id === selectedCategory) || categories[0]
  }
  
  const categoryLevels: Level[] = getCurrentCategory()?.levels || []
  const completedLevels: number = categoryLevels.filter(level => level.completed).length
  const totalStars: number = categoryLevels.reduce((acc, level) => acc + level.stars, 0)
  const progressPercentage: number = Math.round((completedLevels / categoryLevels.length) * 100) || 0

  // Add instructions for each letter
  const getLetterInstructions = (letter: string): string => {
    const instructions: { [key: string]: string } = {
      a: "Make a fist with your right hand, with thumb on the side. Palm faces left.",
      b: "Hold your hand up with your palm facing forward, fingers pointing up. Keep all fingers straight and together, with thumb tucked against palm.",
      c: "Curve your fingers and thumb to form a 'C' shape. Palm faces right.",
      d: "Make 'C' hand shape, then extend index finger up. Other fingers stay curved.",
      e: "Curl all fingers in. Palm faces forward.",
      // Add instructions for other letters similarly
    }
    return instructions[letter.toLowerCase()] || "Watch the video and practice the sign."
  }

  // Start lesson and prepare video queue
  const startLesson = (level: Level): void => {
    setCurrentLesson(level)
    setIsPracticeMode(false)
    setShowSuccess(false)
    
    // Create video queue based on lesson content
    let queue: VideoQueueItem[] = []
    
    if (level.content.includes(" ")) {
      queue = level.content.split(" ").map((word: string) => ({
        text: word,
        path: word.toLowerCase().startsWith("thank") ? "/signs/thank_you.webm" : null,
        instructions: "Practice this word in sign language"
      }))
    } else {
      // For alphabets, only load the first letter initially
      const firstChar = level.content[0]
      queue = [{
        text: firstChar,
        path: `/signs/${firstChar.toLowerCase()}.webm`,
        instructions: getLetterInstructions(firstChar)
      }]
    }
    
    setVideoQueue(queue)
    setCurrentVideoIndex(0)
    setIsPlaying(true)
    playNextVideo(0)
  }

  // Add function to load next letter
  const loadNextLetter = () => {
    if (!currentLesson) return
    
    const currentContent = currentLesson.content
    const currentChar = videoQueue[0].text
    const currentIndex = currentContent.indexOf(currentChar)
    
    if (currentIndex < currentContent.length - 1) {
      // Load next letter
      const nextChar = currentContent[currentIndex + 1]
      const newQueue = [{
        text: nextChar,
        path: `/signs/${nextChar.toLowerCase()}.webm`,
        instructions: getLetterInstructions(nextChar)
      }]
      setVideoQueue(newQueue)
      setCurrentVideoIndex(0)
      setIsPracticeMode(false)
      setIsPlaying(true)
      playNextVideo(0)
    } else {
      // Complete the level when all letters are done
      completeLevel()
    }
  }

  // Play the next video in queue
  const playNextVideo = (index: number): void => {
    if (index >= videoQueue.length) {
      setCurrentLetter("")
      setIsPlaying(false)
      setIsPracticeMode(true)
      return
    }
    
    const currentItem = videoQueue[index]
    setCurrentLetter(`Signing: ${currentItem.text.toUpperCase()}`)
    setCurrentInstruction(currentItem.instructions || "")
    
    const video = videoRef.current
    if (video && currentItem.path) {
      video.src = currentItem.path
      video.load()
      video.play().catch(error => {
        console.error("Error playing video:", error)
      })
    }
  }

  // Handle end of video
  useEffect(() => {
    const video = videoRef.current
    
    if (!video) return
    
    const handleVideoEnd = () => {
      setCurrentVideoIndex(prevIndex => {
        const nextIndex = prevIndex + 1
        if (nextIndex < videoQueue.length) {
          playNextVideo(nextIndex)
          return nextIndex
        } else {
          // Finish lesson
          setIsPlaying(false)
          setCurrentLetter("")
          return 0
        }
      })
    }
    
    video.addEventListener('ended', handleVideoEnd)
    
    return () => {
      video.removeEventListener('ended', handleVideoEnd)
    }
  }, [videoQueue])

  // Close lesson modal
  const closeLesson = (): void => {
    setCurrentLesson(null)
    setIsPlaying(false)
    setVideoQueue([])
    setCurrentVideoIndex(0)
    setCurrentLetter("")
  }

  // Add completeLevel function
  const completeLevel = () => {
    if (currentLesson) {
      // Find and update the level in categories
      const updatedCategories = categories.map(category => ({
        ...category,
        levels: category.levels.map(level => {
          if (level.id === currentLesson.id) {
            return { ...level, completed: true, stars: 3 }
          }
          return level
        })
      }))
      
      // Update categories state (you'll need to lift this state up)
      // For now, we'll just show success message
      setShowSuccess(true)
      setTimeout(() => {
        closeLesson()
      }, 2000)
    }
  }

  // Add function to play specific letter video
  const playLetterVideo = (letter: string) => {
    if (!currentLesson) return
    
    const newQueue = [{
      text: letter,
      path: `/signs/${letter.toLowerCase()}.webm`,
      instructions: getLetterInstructions(letter)
    }]
    
    setVideoQueue(newQueue)
    setCurrentVideoIndex(0)
    setIsPracticeMode(false)
    setIsPlaying(true)
    
    const video = videoRef.current
    if (video) {
      video.src = `/signs/${letter.toLowerCase()}.webm`
      video.load()
      video.play().catch(error => {
        console.error("Error playing video:", error)
      })
    }
  }

  return (
    <div className="container mx-auto pt-20">
      {/* Welcome Intro Overlay */}
      {showIntro && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
        >
          <div className="max-w-3xl w-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
            <div className="relative">
              <video
                ref={introVideoRef}
                className="w-full"
                onEnded={() => setShowIntro(false)}
                autoPlay
                playsInline
                controls
                onClick={(e) => {
                  // Ensure video plays with audio when clicked
                  const video = e.currentTarget;
                  if (video.paused) {
                    video.play().catch(err => {
                      console.error("Error playing video on click:", err);
                    });
                  }
                }}
              >
                <source src="/signs/MrSign.webm" type="video/webm" />
                <track 
                  kind="subtitles" 
                  src="/signs/MrSign.vtt" 
                  srcLang="en" 
                  label="English" 
                  default 
                />
                Your browser does not support the video tag.
              </video>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none">
                <div className="text-center">
                  <div className="inline-block bg-black/70 px-4 py-2 rounded-lg">
                    <h2 className="text-white text-2xl font-bold">{currentSubtitle}</h2>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-gray-400 mb-2">Audio narration plays at 0.5x speed for better learning</p>
              <Button 
                variant="outline" 
                onClick={() => setShowIntro(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white border-none"
              >
                Skip Introduction
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main content - Only shown after intro video ends */}
      {!showIntro && (
        <div className="container mx-auto px-4 pt-8 pb-16">
          {/* App header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
              Sign Language Journey
            </h1>
            <p className="text-gray-400">Master sign language with interactive lessons</p>
          </div>

          {/* Category selection */}
          <div className="flex flex-wrap gap-4 mb-8">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className={`rounded-full px-6 ${selectedCategory === category.id ? `bg-${category.id}-600` : "bg-gray-900"}`}
                style={selectedCategory === category.id ? {backgroundColor: category.color} : {}}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.title}
              </Button>
            ))}
          </div>

          {/* Progress overview */}
          <Card className="p-6 bg-gray-900 border-gray-800 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{getCurrentCategory().title}</h2>
                <p className="text-gray-400">{getCurrentCategory().description}</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalStars}</div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm">Stars</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{completedLevels}/{categoryLevels.length}</div>
                  <div className="text-sm text-gray-400">Levels Complete</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-gray-800">
                <div 
                  className="h-full rounded-full transition-all" 
                  style={{
                    width: `${progressPercentage}%`,
                    background: `linear-gradient(90deg, ${getCurrentCategory().color}, ${getCurrentCategory().color}AA)`
                  }}
                />
              </Progress>
            </div>
          </Card>

          {/* Game-like level progression */}
          <div className="relative">
            {/* Cosmic background decoration */}
            <div className="absolute w-full h-full">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute rounded-full bg-white opacity-30"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 3}px`,
                    height: `${Math.random() * 3}px`,
                    animation: `twinkle ${Math.random() * 5 + 2}s infinite ease-in-out`
                  }}
                />
              ))}
            </div>

            {/* Path line */}
            <svg className="absolute top-0 left-0 w-full h-full" style={{zIndex: 1}}>
              <path 
                d="M 10 50 Q 30 20, 50 50 T 90 50" 
                stroke="rgba(138, 43, 226, 0.6)" 
                strokeWidth="6" 
                fill="none" 
                strokeLinecap="round"
                strokeDasharray="5,5"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(138, 43, 226, 0.8))"
                }}
              />
            </svg>

            {/* Level nodes */}
            <div className="relative min-h-[500px]">
              {categoryLevels.map((level, index) => {
                return (
                  <motion.div
                    key={level.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="absolute"
                    style={{
                      top: level.position.y,
                      left: level.position.x,
                      zIndex: 2,
                    }}
                  >
                    <div className="flex flex-col items-center">
                      {/* Level number with stars */}
                      <div className="mb-2">
                        <div className="relative">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full text-white font-bold"
                               style={{background: `linear-gradient(to bottom right, #FFA500, #FF4500)`}}>
                            {level.id}
                          </div>
                          {/* Stars display */}
                          {level.completed && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 flex">
                              {Array.from({ length: Math.min(level.stars, 3) }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ))}
                              {Array.from({ length: Math.max(0, 3 - level.stars) }).map((_, i) => (
                                <Star key={i + level.stars} className="w-4 h-4 text-gray-700" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Level platform */}
                      <div onClick={() => startLesson(level)}>
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 bg-gradient-to-b from-blue-600 to-purple-800"
                          style={{boxShadow: "0 0 15px rgba(138, 43, 226, 0.5)"}}
                        >
                          {level.completed ? (
                            <CheckCircle className="w-8 h-8 text-white" />
                          ) : (
                            <Play className="w-8 h-8 text-white" />
                          )}
                        </div>
                        
                        {/* Platform base */}
                        <div className="w-20 h-4 rounded-full bg-pink-500 -mt-2" style={{opacity: 0.8}}>
                          <div className="w-16 h-2 rounded-full bg-pink-300 mx-auto" style={{opacity: 0.6}}></div>
                        </div>
                      </div>
                      
                      {/* Level title */}
                      <div className="mt-3 text-center">
                        <span className="font-medium text-sm px-3 py-1 rounded-full bg-gray-800">{level.title}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              
              {/* Space decorations */}
              <motion.div 
                className="absolute left-[5%] top-[10%] w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 opacity-70"
                animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 6 }}
                style={{boxShadow: "0 0 20px rgba(59, 130, 246, 0.6)"}}
              />
              
              <motion.div 
                className="absolute right-[15%] bottom-[20%] w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-700 opacity-70"
                animate={{ y: [0, -15, 0], rotate: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 8 }}
                style={{boxShadow: "0 0 20px rgba(139, 92, 246, 0.6)"}}
              />
              
              {/* Astronaut decoration */}
              <motion.div 
                className="absolute right-[40%] top-[50%] w-12 h-16 z-10"
                animate={{ 
                  x: [0, 20, 40, 20, 0], 
                  y: [0, -10, 0, -10, 0],
                  rotate: [0, 5, 0, -5, 0]
                }}
                transition={{ duration: 8, repeat: Infinity }}
              >
                <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-300"></div>
                <div className="w-10 h-12 rounded-lg bg-gradient-to-b from-blue-300 to-purple-500 -mt-3 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-teal-400 border-2 border-white"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson modal */}
      {currentLesson && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg border border-gray-700 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold">
                    {currentLesson.id}
                  </div>
                  <h2 className="text-2xl font-bold">
                    {currentLesson.title}
                  </h2>
                </div>
                <Button variant="outline" size="icon" onClick={closeLesson}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Video player */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <video 
                    ref={videoRef}
                    className="max-h-full max-w-full"
                    controls
                    playsInline
                    muted
                    autoPlay
                    onEnded={() => {
                      setIsPracticeMode(true)
                    }}
                    onError={(e) => console.error("Video error:", e)}
                  >
                    {videoQueue[currentVideoIndex]?.path && videoQueue[currentVideoIndex].path !== null && (
                      <source src={videoQueue[currentVideoIndex].path as string} type="video/webm" />
                    )}
                    Your browser does not support video playback.
                  </video>
                </div>
                
                {/* Current letter/word display */}
                {isPlaying && (
                  <div className="text-center text-2xl font-bold p-4 bg-gray-800 rounded-lg border border-purple-800">
                    {currentLetter}
                  </div>
                )}
                
                {/* Lesson content preview */}
                <Card className="p-4 bg-gray-800 border-gray-700">
                  <h3 className="text-lg font-semibold mb-2">Lesson Content</h3>
                  
                  {currentLesson?.content.includes(" ") ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentLesson.content.split(" ").map((word, i) => (
                        <div 
                          key={i} 
                          className="px-3 py-2 rounded-md bg-gray-700 font-medium cursor-pointer hover:bg-gray-600 transition-colors"
                          onClick={() => {
                            const newQueue = [{
                              text: word,
                              path: word.toLowerCase().startsWith("thank") ? "/signs/thank_you.webm" : null,
                              instructions: "Practice this word in sign language"
                            }]
                            setVideoQueue(newQueue)
                            setCurrentVideoIndex(0)
                            setIsPracticeMode(false)
                            setIsPlaying(true)
                            playNextVideo(0)
                          }}
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentLesson?.content.split("").map((char, i) => (
                        <div 
                          key={i} 
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all hover:scale-110 ${
                            videoQueue[0]?.text === char ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-purple-600 to-blue-800'
                          }`}
                          onClick={() => playLetterVideo(char)}
                        >
                          {char.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Practice mode */}
                {isPracticeMode && (
                  <div className="space-y-6 mt-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-4">Practice Time!</h3>
                      <p className="text-lg text-gray-300">{currentInstruction}</p>
                      <div className="mt-4 text-3xl font-bold text-purple-400">
                        {videoQueue[0]?.text.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (currentLesson?.content.includes(" ")) {
                            // For words/sentences, use the original next behavior
                            const nextIndex = currentVideoIndex + 1
                            if (nextIndex < videoQueue.length) {
                              setCurrentVideoIndex(nextIndex)
                              setCurrentInstruction(videoQueue[nextIndex]?.instructions || "")
                            } else {
                              completeLevel()
                            }
                          } else {
                            // For alphabets, load the next letter
                            loadNextLetter()
                          }
                        }}
                      >
                        {currentLesson?.content.includes(" ") ? "Next Word" : "Next Letter"}
                      </Button>
                      
                      <Button
                        onClick={() => {
                          // Replay current video
                          setIsPracticeMode(false)
                          setIsPlaying(true)
                          playNextVideo(currentVideoIndex)
                        }}
                      >
                        Watch Again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Success message */}
                {showSuccess && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-green-500 text-white p-8 rounded-lg text-center"
                    >
                      <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold">Level Complete!</h2>
                      <p className="mt-2">You've earned 3 stars!</p>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Add global animation styles */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}