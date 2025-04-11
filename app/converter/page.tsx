"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Type, Play, Settings, Camera, CameraOff, RotateCcw } from "lucide-react"
import Spline from '@splinetool/react-spline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ConverterPage() {
  // State for the converter
  const [inputText, setInputText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [translationProgress, setTranslationProgress] = useState(0)
  const [translationResult, setTranslationResult] = useState("")
  const [activeTab, setActiveTab] = useState("text-to-sign")
  const [selectedLanguage, setSelectedLanguage] = useState("ase") // American Sign Language by default
  const [isSlowMode, setIsSlowMode] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const webcamRef = useRef<HTMLVideoElement | null>(null)
  
  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInputText(e.target.value)
  }
  
  // Toggle microphone recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
      }
    } else {
      try {
        // Start recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data)
          }
        }
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          await processAudio(audioBlob)
        }
        
        mediaRecorder.start()
        setIsRecording(true)
      } catch (error) {
        console.error("Error accessing microphone:", error)
        setAlertMessage("Could not access microphone. Please check permissions.")
        setTimeout(() => setAlertMessage(""), 5000)
      }
    }
  }
  
  // Process the audio for translation
  const processAudio = async (audioBlob: Blob) => {
    setIsTranslating(true)
    setTranslationProgress(10)
    
    try {
      // Create form data for the API request
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('language', selectedLanguage)
      
      // Send to backend API
      const response = await fetch('/api/speech-to-sign', {
        method: 'POST',
        body: formData
      })
      
      setTranslationProgress(50)
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      
      const data = await response.json()
      setInputText(data.text)
      setTranslationResult(data.animationData)
      setTranslationProgress(100)
      
      // Reset progress bar after animation completes
      setTimeout(() => {
        setTranslationProgress(0)
        setIsTranslating(false)
      }, 1000)
      
    } catch (error) {
      console.error("Error processing audio:", error)
      setAlertMessage("Error processing audio. Please try again.")
      setIsTranslating(false)
      setTranslationProgress(0)
      setTimeout(() => setAlertMessage(""), 5000)
    }
  }
  
  // Translate text to sign language
  const translateText = async () => {
    if (!inputText.trim()) {
      setAlertMessage("Please enter some text to translate")
      setTimeout(() => setAlertMessage(""), 5000)
      return
    }
    
    setIsTranslating(true)
    setTranslationProgress(10)
    
    try {
      const response = await fetch('/api/text-to-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: inputText,
          language: selectedLanguage,
          slowMode: isSlowMode
        })
      })
      
      setTranslationProgress(50)
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      
      const data = await response.json()
      setTranslationResult(data.animationData)
      setTranslationProgress(100)
      
      // Reset progress bar after animation completes
      setTimeout(() => {
        setTranslationProgress(0)
        setIsTranslating(false)
      }, 1000)
      
    } catch (error) {
      console.error("Error translating text:", error)
      setAlertMessage("Error translating text. Please try again.")
      setIsTranslating(false)
      setTranslationProgress(0)
      setTimeout(() => setAlertMessage(""), 5000)
    }
  }
  
  // Toggle webcam for sign language recognition
  const toggleWebcam = async () => {
    if (isWebcamOn) {
      // Turn off webcam
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = (webcamRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
        webcamRef.current.srcObject = null
      }
      setIsWebcamOn(false)
    } else {
      try {
        // Turn on webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream
        }
        setIsWebcamOn(true)
      } catch (error) {
        console.error("Error accessing webcam:", error)
        setAlertMessage("Could not access webcam. Please check permissions.")
        setTimeout(() => setAlertMessage(""), 5000)
      }
    }
  }
  
  // Process sign language from webcam
  const processSignLanguage = async () => {
    if (!isWebcamOn) {
      setAlertMessage("Please turn on the webcam first")
      setTimeout(() => setAlertMessage(""), 5000)
      return
    }
    
    setIsTranslating(true)
    setTranslationProgress(10)
    
    try {
      // Capture frame from webcam
      const canvas = document.createElement('canvas')
      if (webcamRef.current) {
        canvas.width = webcamRef.current.videoWidth
        canvas.height = webcamRef.current.videoHeight
      }
      const ctx = canvas.getContext('2d')
      if (ctx && webcamRef.current) {
        ctx.drawImage(webcamRef.current, 0, 0)
      } else {
        console.error("Failed to get canvas context or webcam reference.")
        setAlertMessage("Error capturing frame. Please try again.")
        setTimeout(() => setAlertMessage(""), 5000)
      }
      
      // Convert to blob
      const imageBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/jpeg')
      })
      
      if (!imageBlob) {
        throw new Error("Failed to create image blob")
      }
      
      // Create form data for API request
      const formData = new FormData()
      formData.append('image', imageBlob)
      formData.append('language', selectedLanguage)
      
      // Send to backend API
      const response = await fetch('/api/sign-to-text', {
        method: 'POST',
        body: formData
      })
      
      setTranslationProgress(50)
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      
      const data = await response.json()
      setTranslationResult(data.text)
      setTranslationProgress(100)
      
      // Reset progress bar after animation completes
      setTimeout(() => {
        setTranslationProgress(0)
        setIsTranslating(false)
      }, 1000)
      
    } catch (error) {
      console.error("Error processing sign language:", error)
      setAlertMessage("Error processing sign language. Please try again.")
      setIsTranslating(false)
      setTranslationProgress(0)
      setTimeout(() => setAlertMessage(""), 5000)
    }
  }
  
  // Reset all states
  const resetConverter = () => {
    setInputText("")
    setTranslationResult("")
    setTranslationProgress(0)
    setIsTranslating(false)
  }
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop any ongoing recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      
      // Stop webcam if active
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = (webcamRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [isRecording])
  
  return (
    <div className="min-h-screen p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Input Section */}
          <Card className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Sign Language Converter</h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="text-to-sign">Text to Sign</TabsTrigger>
                <TabsTrigger value="sign-to-text">Sign to Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text-to-sign" className="space-y-4 pt-4">
                <p className="text-muted-foreground">
                  Convert speech or text into animated sign language using our advanced 3D avatar.
                </p>
                
                <div className="space-y-4">
                  <Button 
                    variant={isRecording ? "destructive" : "outline"} 
                    className="w-full h-16 text-lg"
                    onClick={toggleRecording}
                    disabled={isTranslating}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-6 h-6 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6 mr-2" />
                        Start Speaking
                      </>
                    )}
                  </Button>
                  
                  <div className="relative">
                    <textarea 
                      className="w-full h-32 p-4 rounded-lg border bg-background resize-none"
                      placeholder="Type your text here..."
                      value={inputText}
                      onChange={handleTextChange}
                      disabled={isTranslating}
                    />
                    <Button 
                      size="icon" 
                      className="absolute bottom-4 right-4"
                      onClick={translateText}
                      disabled={isTranslating || !inputText.trim()}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="slow-mode"
                      checked={isSlowMode}
                      onCheckedChange={setIsSlowMode}
                    />
                    <Label htmlFor="slow-mode">Slow Mode</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sign-to-text" className="space-y-4 pt-4">
                <p className="text-muted-foreground">
                  Convert sign language into text using our AI-powered recognition system.
                </p>
                
                <div className="space-y-4">
                  <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                    <video 
                      ref={webcamRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      playsInline
                    />
                    
                    {!isWebcamOn && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-muted-foreground">Webcam is turned off</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant={isWebcamOn ? "destructive" : "outline"} 
                      className="flex-1 h-12"
                      onClick={toggleWebcam}
                      disabled={isTranslating}
                    >
                      {isWebcamOn ? (
                        <>
                          <CameraOff className="w-5 h-5 mr-2" />
                          Turn Off Camera
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Turn On Camera
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="default" 
                      className="flex-1 h-12"
                      onClick={processSignLanguage}
                      disabled={!isWebcamOn || isTranslating}
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Recognize Signs
                    </Button>
                  </div>
                  
                  {activeTab === "sign-to-text" && translationResult && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-2">Recognized Text:</h3>
                      <p>{translationResult}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ase">American Sign Language</SelectItem>
                      <SelectItem value="bsl">British Sign Language</SelectItem>
                      <SelectItem value="auslan">Australian Sign Language</SelectItem>
                      <SelectItem value="isl">International Sign Language</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={resetConverter}
                    disabled={isTranslating}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              {isTranslating && (
                <Progress value={translationProgress} className="h-2" />
              )}
              
              {alertMessage && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{alertMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Avatar Section */}
          <Card className="p-6 h-[600px] relative overflow-hidden">
            <div className="absolute inset-0">
              <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
            </div>
            
            {activeTab === "text-to-sign" && translationResult && (
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/50 backdrop-blur-sm rounded-lg text-white">
                <p className="text-sm">Currently showing: "{inputText}"</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}



