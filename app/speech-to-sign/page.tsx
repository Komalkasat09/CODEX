"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, RotateCcw } from "lucide-react"
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

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

// Custom hook for using Web Speech API with TypeScript
function useClientSideSpeechRecognition() {
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Initialize on mount
  useEffect(() => {
    // Check if browser supports Web Speech API
    const checkAvailability = () => {
      const isBrowser = typeof window !== 'undefined';
      const hasSpeechRecognition = isBrowser && (
        'SpeechRecognition' in window || 
        'webkitSpeechRecognition' in window
      );
      
      setIsAvailable(hasSpeechRecognition);
      return hasSpeechRecognition;
    };
    
    checkAvailability();
  }, []);
  
  // Create recognition instance
  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Get the appropriate constructor
      const SpeechRecognitionConstructor = 
        window.SpeechRecognition || 
        window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionConstructor) {
        console.warn("Speech Recognition API not available in this browser");
        return null;
      }
      
      // Create and configure the recognition object
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      recognitionRef.current = recognition;
      return recognition;
    } catch (error) {
      console.error("Error creating Speech Recognition:", error);
      return null;
    }
  }, []);
  
  // Start recognition with callbacks
  const startListening = useCallback((callbacks: {
    onResult?: (text: string, confidence: number) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }) => {
    const recognition = recognitionRef.current || createRecognition();
    
    if (!recognition) {
      if (callbacks.onError) callbacks.onError("Speech recognition not available");
      return false;
    }
    
    // Set up event handlers
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      if (callbacks.onResult) callbacks.onResult(transcript, confidence);
    };
    
    recognition.onerror = (event: any) => {
      if (callbacks.onError) callbacks.onError(event.error);
    };
    
    recognition.onend = () => {
      if (callbacks.onEnd) callbacks.onEnd();
    };
    
    // Start the recognition
    try {
      recognition.start();
      return true;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      if (callbacks.onError) callbacks.onError("Failed to start recognition");
      return false;
    }
  }, [createRecognition]);
  
  // Stop recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        return true;
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
        return false;
      }
    }
    return false;
  }, []);
  
  return {
    isAvailable,
    startListening,
    stopListening
  };
}

export default function SpeechToSignPage() {
  // State for the converter
  const [isRecording, setIsRecording] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isSlowMode, setIsSlowMode] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [recognizedText, setRecognizedText] = useState("")
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [inputText, setInputText] = useState("")
  const [useWebSpeechAPI, setUseWebSpeechAPI] = useState(true)
  
  // Video player state
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [processedText, setProcessedText] = useState("")
  const [videoHistory, setVideoHistory] = useState<string[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  
  const [selectedLanguage, setSelectedLanguage] = useState("ase") // American Sign Language by default
  
  // Initialize Web Speech API
  const speechRecognition = useClientSideSpeechRecognition();
  
  // Update state based on availability
  useEffect(() => {
    setUseWebSpeechAPI(speechRecognition.isAvailable);
    
    if (!speechRecognition.isAvailable) {
      console.warn("This browser doesn't support Web Speech API. Will use AssemblyAI instead.");
    } else {
      console.log("Web Speech API is supported in this browser.");
    }
  }, [speechRecognition.isAvailable]);
  
  // Toggle microphone recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (useWebSpeechAPI) {
        // For Web Speech API
        speechRecognition.stopListening();
      } else if (mediaRecorderRef.current) {
        // For AssemblyAI
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      try {
        if (useWebSpeechAPI && speechRecognition.isAvailable) {
          // Use Web Speech API directly in the browser
          startWebSpeechRecognition();
        } else {
          // Request high-quality audio
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 44100
            }
          });
          
          // Use high-quality audio encoding options
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
          });
          
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data)
            }
          }
          
          mediaRecorder.onstop = async () => {
            // Convert to WAV format for better compatibility
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            await processAudio(audioBlob)
          }
          
          // Start recording with shorter timeslices for more data points
          mediaRecorder.start(100) // Capture in 100ms chunks
          setIsRecording(true)
          setAlertMessage("Recording... Speak clearly into your microphone")
        }
      } catch (error) {
        console.error("Error accessing microphone:", error)
        setAlertMessage("Could not access microphone. Please check permissions.")
        setTimeout(() => setAlertMessage(""), 5000)
      }
    }
  }
  
  // Web Speech API implementation
  const startWebSpeechRecognition = () => {
    setIsRecording(true);
    setAlertMessage("Listening... Speak clearly into your microphone");
    
    speechRecognition.startListening({
      onResult: (text, confidence) => {
        console.log(`Speech recognized: "${text}" (Confidence: ${confidence})`);
        
        // Update UI with recognized text
        setRecognizedText(text);
        setInputText(text);
        
        // Show confidence warning if low
        if (confidence < 0.7) {
          setAlertMessage("Speech recognized with low confidence. Results may not be accurate.");
        } else {
          setAlertMessage("Speech recognized successfully!");
        }
      },
      onError: (error) => {
        console.error("Speech recognition error", error);
        setAlertMessage(`Speech recognition error: ${error}`);
        setIsRecording(false);
        
        // If Web Speech API fails, fallback to AssemblyAI
        if (useWebSpeechAPI) {
          setUseWebSpeechAPI(false);
          setTimeout(() => {
            setAlertMessage("Falling back to AssemblyAI for speech recognition");
            toggleRecording();
          }, 1000);
        }
      },
      onEnd: () => {
        console.log("Speech recognition ended");
        setIsRecording(false);
        
        // If we have recognized text, auto-translate it
        if (inputText.trim()) {
          setTimeout(() => {
            // Automatically start translation
            startTranslationFromInput();
          }, 500);
        }
      }
    });
  };
  
  // Process the audio with AssemblyAI
  const processAudio = async (audioBlob: Blob) => {
    setIsTranslating(true)
    setIsDemoMode(false)
    
    try {
      console.log("Processing audio with AssemblyAI...", audioBlob.size, "bytes")
      setAlertMessage("Transcribing speech... (this may take up to 30 seconds)")

      // Create a FormData object to send the audio file
      const formData = new FormData()
      
      // Make sure we're using the correct MIME type and filename
      const audioFile = new File([audioBlob], "recording.webm", { 
        type: "audio/webm" 
      });
      formData.append('audio_file', audioFile);
      
      console.log("Audio file prepared:", audioFile.size, "bytes, type:", audioFile.type);
      
      // Send the audio to the AssemblyAI API endpoint
      let response
      try {
        // Set a timeout to avoid hanging requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
        
        response = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
      } catch (fetchError) {
        console.error("Network error during fetch:", fetchError)
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error("Request timed out. Please try again.")
        }
        
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }))
        console.error("Server error:", errorData)
        throw new Error(errorData.error || errorData.details || `Error transcribing speech: ${response.status}`)
      }
      
      // Parse the response JSON
      let data
      try {
        const responseText = await response.text()
        data = JSON.parse(responseText)
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError)
        throw new Error("Error parsing response from server")
      }
      
      // Handle empty response
      if (data.status === 'empty' || data.error) {
        throw new Error(data.error || "No speech detected. Please try again and speak more clearly.")
      }
      
      // Extract text from response
      const text = data.text
      
      if (!text || text.trim() === '') {
        throw new Error("No speech detected or transcription was empty. Please try again and speak clearly.")
      }
      
      // Show confidence warning if available and low
      if (data.confidence && data.confidence < 0.7) {
        console.warn("Low confidence in transcription:", data.confidence)
        setAlertMessage("Speech recognized with low confidence. Results may not be accurate.")
        setTimeout(() => {
          setAlertMessage("Ready to translate. Click 'Translate to Sign' when ready.")
        }, 3000)
      } else {
        setAlertMessage("Speech recognized successfully!")
        setTimeout(() => {
          setAlertMessage("Ready to translate. Click 'Translate to Sign' when ready.")
        }, 1500)
      }
      
      console.log("Transcribed text:", text)
      setRecognizedText(text)
      setInputText(text)
      setIsTranslating(false)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error processing audio:", errorMessage)
      
      setAlertMessage(`Processing error: ${errorMessage}. Falling back to demo mode.`)
      setTimeout(() => setAlertMessage("Demo mode activated due to API error."), 3000)
      
      // Fall back to mock data on error
      fallbackToMockData()
      setIsTranslating(false)
    }
  }
  
  // Final fallback to mock data when all else fails
  const fallbackToMockData = () => {
    // Generate random mock text
    const mockPhrases = [
      "Hello world",
      "Nice to meet you",
      "How are you doing today",
      "Sign language is beautiful",
      "I am learning to sign",
      "Thank you for your help"
    ]
    
    const mockText = mockPhrases[Math.floor(Math.random() * mockPhrases.length)]
    console.log("Using mock text:", mockText)
    
    // Set recognized text but don't automatically translate
    setRecognizedText(mockText)
    setInputText(mockText)
    setAlertMessage("Using demo text. Click 'Translate to Sign' to continue.")
    setIsDemoMode(true)
    setIsTranslating(false)
  }
  
  // Handle manual text input
  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
  }
  
  // Start translation from the input text
  const startTranslationFromInput = () => {
    if (!inputText.trim()) {
      setAlertMessage("Please enter or speak some text first")
      setTimeout(() => setAlertMessage(""), 3000)
      return
    }
    
    setIsTranslating(true)
    setAlertMessage("Converting to sign language...")
    startTranslation(inputText)
  }
  
  // Start translation and video playback
  const startTranslation = (text: string) => {
    console.log(`Starting translation for text: "${text}"`);
    
    // Reset state
    setIsPlaying(true);
    setCurrentCharIndex(0);
    setProcessedText(text);
    setVideoHistory([]);
    
    // Reset video element if it exists
    if (videoRef.current) {
      try {
        // Stop any currently playing video
        videoRef.current.pause();
        
        // Reset src temporarily 
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
        
        console.log("Video element reset");
      } catch (err) {
        console.error("Error resetting video element:", err);
      }
    }
    
    // Start playing videos
    setTimeout(() => {
      playNextVideo();
    }, 100);
  };
  
  // Play next video in sequence
  const playNextVideo = () => {
    try {
      if (currentCharIndex >= processedText.length) {
        // End of sequence
        console.log("End of translation sequence reached");
        setIsPlaying(false);
        setIsTranslating(false);
        setAlertMessage("");
        setCurrentCharIndex(0);
        return;
      }
      
      // Check if we should use a phrase video instead
      if (currentCharIndex === 0) {
        const phraseVideo = getVideoForPhrase(processedText);
        if (phraseVideo) {
          console.log(`Using phrase video for "${processedText}": ${phraseVideo}`);
          setCurrentVideo(phraseVideo);
          setVideoHistory(prev => [...prev, phraseVideo]);
          setCurrentCharIndex(processedText.length); // Skip to the end
          return;
        }
      }
      
      const char = processedText[currentCharIndex];
      const videoPath = getVideoForChar(char);
      
      console.log(`Playing video for character '${char}': ${videoPath}`);
      
      setCurrentVideo(videoPath);
      setVideoHistory(prev => [...prev, videoPath]);
      
      setCurrentCharIndex(prev => prev + 1);
    } catch (error) {
      console.error("Error in playNextVideo:", error);
      setAlertMessage(`Error playing video: ${error instanceof Error ? error.message : String(error)}`);
      
      // Try to recover by moving to the next character
      setCurrentCharIndex(prev => prev + 1);
      setTimeout(() => {
        if (isPlaying) {
          playNextVideo();
        }
      }, 500);
    }
  };
  
  // Handle video ended event
  useEffect(() => {
    const videoElement = videoRef.current
    
    if (!videoElement) return
    
    const handleVideoEnded = () => {
      if (isPlaying) {
        // Reduce delay between videos for faster playback
        const delay = isSlowMode ? 500 : 150
        setTimeout(playNextVideo, delay)
      }
    }
    
    // Set playback rate to 4x
    videoElement.playbackRate = 4.0;
    
    videoElement.addEventListener('ended', handleVideoEnded)
    
    return () => {
      videoElement.removeEventListener('ended', handleVideoEnded)
    }
  }, [isPlaying, isSlowMode])
  
  // Load and play video when currentVideo changes
  useEffect(() => {
    if (!currentVideo || !videoRef.current) return;
    
    console.log(`Loading video: ${currentVideo}`);
    
    // Create a clean video element to avoid any state issues
    const videoElement = videoRef.current;
    videoElement.src = currentVideo;
    
    // Force preload
    videoElement.preload = "auto";
    
    // Set playback rate to 4x
    videoElement.playbackRate = 4.0;
    
    // Add event listener for loading errors
    const handleError = (e: Event) => {
      console.error(`Error loading video: ${currentVideo}`, 
        videoElement.error ? `Code: ${videoElement.error.code}, Message: ${videoElement.error.message}` : e);
      
      setAlertMessage(`Error loading video: ${currentVideo}. File may be missing or format not supported.`);
      
      // Move to next video if we're still playing
      if (isPlaying) {
        setTimeout(() => {
          setCurrentCharIndex(prev => prev + 1);
          playNextVideo();
        }, 500);
      }
    };
    
    videoElement.addEventListener('error', handleError);
    
    // Handle successful loading
    const handleCanPlay = () => {
      console.log(`Video can play: ${currentVideo}`);
      videoElement.play()
        .then(() => {
          console.log(`Video playing: ${currentVideo}`);
        })
        .catch(err => {
          console.error("Error playing video:", err);
          setAlertMessage(`Error playing video: ${err.message}`);
          setTimeout(() => setAlertMessage(""), 5000);
          
          // Move to next video if we're still playing
          if (isPlaying) {
            setTimeout(() => {
              setCurrentCharIndex(prev => prev + 1);
              playNextVideo();
            }, 500);
          }
        });
    };
    
    videoElement.addEventListener('canplay', handleCanPlay);
    
    // Load the video manually
    console.log("Calling load() on video element");
    videoElement.load();
    
    // Safety timeout - if video doesn't load within 3 seconds (reduced from 5), move on
    const timeoutId = setTimeout(() => {
      if (isPlaying && videoElement.readyState < 3) { // HAVE_FUTURE_DATA = 3
        console.warn(`Video loading timeout for ${currentVideo}, moving to next`);
        setCurrentCharIndex(prev => prev + 1);
        playNextVideo();
      }
    }, 3000);
    
    // Cleanup function
    return () => {
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('canplay', handleCanPlay);
      clearTimeout(timeoutId);
    };
  }, [currentVideo, isPlaying]);
  
  // Get video path for character
  const getVideoForChar = (char: string): string => {
    // Convert to lowercase for video file names
    const lowerChar = char.toLowerCase();
    
    // Handle spaces and special characters
    if (char === ' ') {
      return '/signs/a.webm'; // Placeholder
    }
    
    // Handle punctuation
    if (char === '.' || char === '!' || char === '?') return '/signs/a.webm';
    if (char === ',') return '/signs/a.webm';
    
    // Fixed set of available letter videos
    const availableLetters = [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
    ];
    
    // Check if it's a letter with an available video file
    if (/^[A-Za-z]$/.test(char) && availableLetters.includes(lowerChar)) {
      return `/signs/${lowerChar}.webm`;
    }
    
    // Default for unsupported characters
    console.log(`No video available for '${char}', using fallback video`);
    return '/signs/a.webm';
  };
  
  // Check for phrase videos
  const getVideoForPhrase = (text: string): string | null => {
    // Check for common words/phrases (case insensitive)
    const lowerText = text.toLowerCase().trim()
    
    if (lowerText === 'hi' || lowerText === 'hello') return '/signs/hi.webm'
    if (lowerText === 'bye' || lowerText === 'goodbye') return '/signs/bye.webm'
    if (lowerText === 'thank you' || lowerText === 'thanks') return '/signs/thank-you.webm'
    if (lowerText === 'welcome') return '/signs/welcome.webm'
    if (lowerText === 'how are you') return '/signs/How-are-you.webm'
    
    // No match found
    return null;
  }
  
  // Reset all states
  const resetConverter = () => {
    setRecognizedText("")
    setIsTranslating(false)
    setIsPlaying(false)
    setCurrentCharIndex(0)
    setCurrentVideo(null)
    setProcessedText("")
    setVideoHistory([])
    setAlertMessage("")
    setIsDemoMode(false)
    setInputText("")
  }
  
  // Activate demo mode directly
  const activateDemoMode = () => {
    if (isTranslating || isPlaying) return
    
    setIsDemoMode(true)
    
    // Generate example text for demonstration
    const examplePhrases = [
      "Hello world",
      "Nice to meet you",
      "How are you doing today",
      "Sign language is beautiful",
      "I am learning to sign",
      "Thank you for your help"
    ]
    
    const exampleText = examplePhrases[Math.floor(Math.random() * examplePhrases.length)]
    console.log("Using example text:", exampleText)
    
    // Set recognized text and input text but don't start translation yet
    setRecognizedText(exampleText)
    setInputText(exampleText)
    setAlertMessage("Demo mode active with example text. Click 'Translate to Sign' to continue.")
  }
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop any ongoing recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
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
          {/* Control Section */}
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Speech to Sign Language</h1>
              {isDemoMode && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                  Demo Mode
                </span>
              )}
            </div>
            
            <p className="text-muted-foreground">
              Convert speech to text using AssemblyAI, then to sign language. Speak or type your message.
            </p>
            
            {/* STEP 1: Speech to Text */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="font-medium mb-3">Step 1: Speech to Text with AssemblyAI</h3>
              
              <Button 
                variant={isRecording ? "destructive" : "default"} 
                className="w-full h-12 relative mb-4"
                onClick={toggleRecording}
                disabled={isTranslating || isPlaying}
              >
                {isRecording ? (
                  <>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center">
                      <span className="mr-2 h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                    </div>
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Speaking (Using AssemblyAI)
                  </>
                )}
              </Button>
              
              {isRecording && (
                <div className="text-xs text-center text-red-500 font-semibold animate-pulse mb-4">
                  Recording in progress... Speak clearly.
                </div>
              )}
              
              {isTranslating && !isPlaying && (
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                  <span className="text-sm">Transcribing with AssemblyAI...</span>
                </div>
              )}
              
              <div className="mb-4">
                <Label htmlFor="text-input" className="mb-2 block">Or type your text:</Label>
                <textarea 
                  ref={textInputRef}
                  id="text-input"
                  value={inputText}
                  onChange={handleTextInputChange}
                  placeholder="Type what you want to translate to sign language..."
                  className="w-full h-24 p-2 border border-gray-300 dark:border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isTranslating || isPlaying}
                />
              </div>
              
              {/* Recognition results */}
              {recognizedText && (
                <div className="p-3 bg-muted rounded-lg mb-4">
                  <h3 className="text-sm font-medium mb-1">
                    Recognized Speech:
                    {!isDemoMode && <span className="text-xs text-blue-500 ml-2">via AssemblyAI</span>}
                  </h3>
                  <p className="font-mono text-sm break-words">{recognizedText}</p>
                </div>
              )}
              
              {/* Tips for better recognition */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs mt-2">
                <h3 className="font-semibold mb-1">Tips for better recognition:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Speak clearly and at a moderate pace</li>
                  <li>Reduce background noise when recording</li>
                  <li>Position your microphone close to your mouth</li>
                  <li>Try short, simple phrases if having trouble</li>
                </ul>
                
                <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900">
                  <p className="text-blue-700 dark:text-blue-400 font-medium">AssemblyAI Integration:</p>
                  <p className="text-muted-foreground">
                    Using AssemblyAI for speech recognition. An API key is configured directly in the code.
                  </p>
                </div>
              </div>
            </div>
            
            {/* STEP 2: Text to Sign */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="font-medium mb-3">Step 2: Text to Sign</h3>
              
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="slow-mode"
                  checked={isSlowMode}
                  onCheckedChange={setIsSlowMode}
                  disabled={isTranslating || isPlaying}
                />
                <Label htmlFor="slow-mode">Slow Mode</Label>
              </div>
              
              <Button 
                variant="default" 
                className="w-full h-12"
                onClick={startTranslationFromInput}
                disabled={isTranslating || isPlaying || !inputText.trim()}
              >
                Translate to Sign
              </Button>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                    disabled={isTranslating || isPlaying}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ase">American Sign Language</SelectItem>
                      <SelectItem value="bsl">British Sign Language</SelectItem>
                      <SelectItem value="auslan">Australian Sign Language</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={resetConverter}
                    disabled={isTranslating || isPlaying}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={activateDemoMode}
                  disabled={isTranslating || isPlaying}
                >
                  Try Demo
                </Button>
              </div>
              
              {(isTranslating || isPlaying) && (
                <div className="space-y-2">
                  <div className="text-xs text-center text-muted-foreground">
                    {currentCharIndex > 0 
                      ? `Translating: ${currentCharIndex} of ${processedText.length} characters`
                      : "Preparing translation..."
                    }
                  </div>
                </div>
              )}
              
              {alertMessage && (
                <Alert variant={alertMessage.includes('Error') ? "destructive" : "default"} className="py-2">
                  <AlertDescription>{alertMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Video Section */}
          <Card className="p-6 space-y-6 flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sign Language Video</h2>
              {isDemoMode && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                  Using sample videos
                </span>
              )}
            </div>
            
            <div className="flex-grow flex flex-col justify-center items-center bg-black rounded-lg overflow-hidden relative" style={{ minHeight: "550px", aspectRatio: "1/1" }}>
              {!currentVideo && !isPlaying ? (
                <div className="text-white text-center p-4">
                  <p>Click 'Start Speaking' and speak into your microphone</p>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef}
                    className="max-h-full max-w-full object-contain"
                    playsInline
                    autoPlay
                    muted
                    style={{ pointerEvents: 'none' }} /* Disable user interaction */
                  >
                    <source src={currentVideo || ''} type="video/webm" />
                    Your browser does not support the video tag.
                  </video>
                </>
              )}

              {/* Refresh button */}
              <button
                className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-700 text-white p-1 rounded-full shadow-md"
                onClick={() => {
                  if (currentVideo && videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play();
                  }
                }}
                title="Refresh video"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {processedText && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-md font-medium mb-2">Currently Translating:</h3>
                <p className="font-mono text-sm">
                  {processedText.split('').map((char, index) => (
                    <span 
                      key={index}
                      className={`${index < currentCharIndex ? 'text-green-600 font-bold' : ''} ${index === currentCharIndex - 1 ? 'bg-green-100 px-1 rounded' : ''}`}
                    >
                      {char}
                    </span>
                  ))}
                </p>
              </div>
            )}
            
            {videoHistory.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-md font-medium mb-2">Translation History:</h3>
                <div className="text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
                  {videoHistory.map((path, index) => (
                    <span key={index} className="mr-1">
                      {path === 'space' ? 
                        <span className="bg-gray-200 px-1 py-0.5 rounded">SPACE</span> : 
                        path.split('/').pop()?.replace('.webm', '')}
                      {index < videoHistory.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 