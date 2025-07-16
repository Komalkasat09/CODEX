"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Video, Upload, FileVideo, Send, Copy, HelpCircle } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useUser } from '../context/UserContext'
import axios from 'axios'

export default function TranscriptPage() {
  const { user } = useUser()
  const router = useRouter()
  
  // State for the transcript UI
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [alertMessage, setAlertMessage] = useState<string>("")
  const [transcript, setTranscript] = useState<string>("")
  const [rawTranscript, setRawTranscript] = useState<string>("")
  const [question, setQuestion] = useState<string>("")
  const [answer, setAnswer] = useState<string>("")
  const [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false)
  const [videoId, setVideoId] = useState<string>("")
  const [savedTranscripts, setSavedTranscripts] = useState<string[]>([])
  
  // Reference to file input
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check for user authentication
  useEffect(() => {
    if (!user) {
      router.push('/sign-in')
      return
    }
    
    // Fetch list of saved transcripts
    fetchTranscriptsList()
  }, [user, router])

  const fetchTranscriptsList = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/transcripts')
      if (response.ok) {
        const data = await response.json()
        setSavedTranscripts(data)
      }
    } catch (error) {
      console.error("Error fetching transcripts:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      
      // Check if file is a valid video type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
      if (!validTypes.includes(selectedFile.type)) {
        setAlertMessage("Please select a valid video file (MP4, MOV, AVI, MKV).")
        return
      }
      
      // Check file size (limit to 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB in bytes
      if (selectedFile.size > maxSize) {
        setAlertMessage(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of 100MB.`)
        return
      }
      
      setFile(selectedFile)
      setFileName(selectedFile.name)
      setAlertMessage(`Selected file: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setAlertMessage("Please select a video file to upload.")
      return
    }

    setIsProcessing(true)
    setUploadProgress(0)
    setAlertMessage("Starting upload...")
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chunk_size', '1000')
      formData.append('chunk_overlap', '200')
      formData.append('top_k', '3')
      
      console.log("File being uploaded:", file.name, file.type, file.size)
      
      // Use axios instead of XMLHttpRequest
      const response = await axios.post('http://localhost:8000/api/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Let the browser set the boundary automatically
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            setUploadProgress(progress)
            console.log(`Upload progress: ${progress}% (${progressEvent.loaded}/${progressEvent.total} bytes)`)
            setAlertMessage(`Uploading: ${progress}%`)
          } else {
            console.log("Progress event not computable", progressEvent)
          }
        },
        // Increase timeout to handle large files
        timeout: 300000, // 5 minutes
      })
      
      // Process successful response
      if (response.status === 200) {
        const data = response.data
        setTranscript(data.processed_transcript)
        setRawTranscript(data.raw_transcript)
        setVideoId(file.name)
        setAlertMessage("Transcription completed successfully!")
        
        // Refresh list of saved transcripts
        await fetchTranscriptsList()
      }
      
      setIsProcessing(false)
    } catch (error) {
      console.error("Error uploading video:", error)
      
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data
        const statusText = error.response?.statusText
        const status = error.response?.status
        
        setAlertMessage(`Error: ${status} ${statusText}. ${responseData?.detail || 'Unknown error'}`)
      } else {
        setAlertMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
      
      setIsProcessing(false)
    }
  }

  const handleTestUpload = async () => {
    if (!file) {
      setAlertMessage("Please select a video file to upload.")
      return
    }

    setIsProcessing(true)
    setUploadProgress(0)
    setAlertMessage("Starting test upload...")
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      
      console.log("Test upload - File being uploaded:", file.name, file.type, file.size)
      
      // Use axios for the test upload
      const response = await axios.post('http://localhost:8000/api/test-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            setUploadProgress(progress)
            console.log(`Test upload progress: ${progress}% (${progressEvent.loaded}/${progressEvent.total} bytes)`)
            setAlertMessage(`Test uploading: ${progress}%`)
          }
        },
      })
      
      // Process successful response
      console.log("Test upload response:", response.data)
      setAlertMessage(`Test upload complete: ${response.data.filename}, size: ${(response.data.size / (1024 * 1024)).toFixed(2)}MB`)
      
      setIsProcessing(false)
    } catch (error) {
      console.error("Error in test upload:", error)
      
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data
        const statusText = error.response?.statusText
        const status = error.response?.status
        
        setAlertMessage(`Test upload error: ${status} ${statusText}. ${responseData?.detail || 'Unknown error'}`)
      } else {
        setAlertMessage(`Test upload error: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
      
      setIsProcessing(false)
    }
  }

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setAlertMessage("Please enter a question.")
      return
    }
    
    if (!videoId) {
      setAlertMessage("Please transcribe a video first before asking questions.")
      return
    }
    
    setIsAskingQuestion(true)
    
    try {
      const response = await fetch(`http://localhost:8000/api/ask/${encodeURIComponent(videoId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnswer(data.answer)
      } else {
        console.error("Question failed with status:", response.status)
        setAlertMessage(`Failed to get answer: ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error asking question:", error)
      setAlertMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsAskingQuestion(false)
    }
  }

  const handleLoadTranscript = async (transcriptId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/transcript/${encodeURIComponent(transcriptId)}?type=processed`)
      
      if (response.ok) {
        const data = await response.json()
        setTranscript(data.transcript)
        setVideoId(transcriptId)
        
        // Also get raw transcript
        const rawResponse = await fetch(`http://localhost:8000/api/transcript/${encodeURIComponent(transcriptId)}?type=raw`)
        if (rawResponse.ok) {
          const rawData = await rawResponse.json()
          setRawTranscript(rawData.transcript)
        }
      } else {
        console.error("Failed to load transcript:", response.status)
        setAlertMessage(`Failed to load transcript: ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error loading transcript:", error)
      setAlertMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setAlertMessage("Copied to clipboard!")
        setTimeout(() => setAlertMessage(""), 2000)
      })
      .catch(err => {
        console.error("Failed to copy:", err)
        setAlertMessage("Failed to copy to clipboard")
      })
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Upload Section */}
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Video Transcription</h1>
              <FileVideo className="w-8 h-8 text-purple-500" />
            </div>
            
            <p className="text-muted-foreground">
              Upload a video file to generate a transcript. You can then ask questions about the content.
            </p>
            
            {alertMessage && (
              <Alert variant={alertMessage.includes("success") ? "default" : "destructive"} className="mb-4">
                <AlertDescription>{alertMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                />
                
                <Upload className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                
                {fileName ? (
                  <div>
                    <p className="text-lg font-medium">{fileName}</p>
                    <p className="text-sm text-gray-500">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium">Click to upload video</p>
                    <p className="text-sm text-gray-500">MP4, MOV, AVI, MKV up to 100MB</p>
                  </div>
                )}
              </div>
              
              {file && (
                <div className="space-y-4">
                  <Button 
                    className="w-full h-12 bg-purple-600 hover:bg-purple-700"
                    onClick={handleUpload}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Transcribing..." : "Generate Transcript"}
                  </Button>
                  
                  <Button 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                    onClick={handleTestUpload}
                    disabled={isProcessing}
                  >
                    Test Upload Only
                  </Button>
                  
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading and processing...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Saved Transcripts Section */}
            {savedTranscripts.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Saved Transcripts</h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {savedTranscripts.map((id, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleLoadTranscript(id)}
                    >
                      <p className="font-medium truncate">{id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Transcript & Question Section */}
          <Card className="p-6 space-y-6">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="mr-2">Transcript</span>
              {transcript && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => copyToClipboard(transcript)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              )}
            </h2>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-[300px] overflow-y-auto">
              {transcript ? (
                <div className="whitespace-pre-line">{transcript}</div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <FileVideo className="w-12 h-12 mb-4" />
                  <p>Upload a video to see the transcript here</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center">
                <span>Ask About the Content</span>
                <HelpCircle className="w-4 h-4 ml-2 text-gray-400" />
              </h3>
              
              <div className="flex space-x-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about the video content..."
                  className="min-h-[80px]"
                  disabled={!transcript}
                />
                <Button
                  className="h-auto bg-purple-600 hover:bg-purple-700"
                  onClick={handleAskQuestion}
                  disabled={!transcript || !question.trim() || isAskingQuestion}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {answer && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Answer:</h4>
                  <div className="whitespace-pre-line">{answer}</div>
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(answer)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
        
        {/* Raw Transcript Section (Collapsible) */}
        {rawTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Raw Transcript</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(rawTranscript)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Raw
                </Button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <div className="whitespace-pre-line font-mono text-sm">{rawTranscript}</div>
              </div>
            </Card>
          </motion.div>
        )}
        
        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">How to Use This Tool</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="rounded-full w-10 h-10 bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Upload a Video</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click on the upload area to select a video file. Supported formats include MP4, MOV, AVI, and MKV.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="rounded-full w-10 h-10 bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <FileVideo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Generate Transcript</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click "Generate Transcript" and wait for processing. The system will extract audio from your video and create a transcript.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="rounded-full w-10 h-10 bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Ask Questions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Once transcribed, you can ask questions about the video content. The AI will find relevant information from the transcript.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 