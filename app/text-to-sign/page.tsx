"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Play, RotateCcw } from "lucide-react"
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

export default function TextToSignPage() {
  // State for the converter
  const [inputText, setInputText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isSlowMode, setIsSlowMode] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [usingAssemblyAI, setUsingAssemblyAI] = useState(false)
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
  
  // Additional video controls
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const [videoProgress, setVideoProgress] = useState<number>(0)
  const [selectedLanguage, setSelectedLanguage] = useState("ase") // American Sign Language by default
  
  // Typing state
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [realtimeMode, setRealtimeMode] = useState(true);
  
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
  
  // Improved real-time text input handling
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newText = e.target.value;
    
    // Always update the text state
    setInputText(newText);
    
    // Only handle real-time playback if that mode is on
    if (!realtimeMode || isPlaying || isTranslating) return;
    
    // If the new text is longer than the old text, play just the new character
    if (newText.length === inputText.length + 1) {
      const lastChar = newText.charAt(newText.length - 1);
      
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Handle real-time playback for the new character
      playCharacter(lastChar);
      
      // Set a timeout to allow for continuous typing
      const timeout = setTimeout(() => {
        // After the timeout, if the text hasn't changed again, we're done typing
        setTypingTimeout(null);
      }, 1500);
      
      setTypingTimeout(timeout);
    } 
    // If multiple characters were added at once (paste, etc.), don't try to play them all
    else if (newText.length > inputText.length + 1) {
      setAlertMessage("Multiple characters detected. Click 'Play' to translate all.");
      setTimeout(() => setAlertMessage(""), 3000);
    }
  };
  
  // Play video for a single character in real-time
  const playCharacter = (char: string) => {
    // If it's a space, just add to history without pausing
    if (char === ' ') {
      console.log("Space character detected");
      
      // Add a visual indicator for space
      setCurrentVideo(null);
      setVideoHistory(prev => [...prev, 'space']);
      return;
    }
    
    // Check if there's a full phrase match for what was just typed
    const fullText = inputText + char; // Combine existing text with the new character
    const phraseVideo = getVideoForPhrase(fullText);
    
    if (phraseVideo) {
      console.log(`Found phrase video for "${fullText}": ${phraseVideo}`);
      setCurrentVideo(phraseVideo);
      setVideoHistory(prev => [...prev, phraseVideo]);
      return;
    }
    
    // Check if we have a video for this character
    const videoPath = getVideoForChar(char);
    console.log(`Playing video for character '${char}': ${videoPath}`);
    
    // Update the video source
    setCurrentVideo(videoPath);
    setVideoHistory(prev => [...prev, videoPath]);
  };
  
  // Get video path for character
  const getVideoForChar = (char: string): string => {
    // Convert to lowercase for video file names - our videos are lowercase
    const lowerChar = char.toLowerCase();
    
    // Handle spaces and special characters
    if (char === ' ') {
      console.log("Space character found, using delay instead of video");
      // Return a valid video that exists as a placeholder
      return '/signs/a.webm';
    }
    
    // Handle punctuation with an existing video
    if (char === '.' || char === '!' || char === '?') return '/signs/a.webm';
    if (char === ',') return '/signs/a.webm';
    
    // Fixed set of available letter videos based on the public directory
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
  
  // New function to check for full phrase videos
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
  
  // Play sign language video sequence
  const playNextVideo = () => {
    try {
      if (currentCharIndex >= processedText.length) {
        // End of sequence
        console.log("End of translation sequence reached");
        setIsPlaying(false);
        setCurrentCharIndex(0);
        return;
      }
      
      // Check if we should use a phrase video instead
      if (currentCharIndex === 0) {
        const phraseVideo = getVideoForPhrase(processedText);
        if (phraseVideo) {
          console.log(`Using phrase video for "${processedText}": ${phraseVideo}`);
          
          // Verify if file exists by creating a test image
          const testImg = new Image();
          testImg.onload = () => {
            // Image exists, which means video likely exists too
            setCurrentVideo(phraseVideo);
            setVideoHistory(prev => [...prev, phraseVideo]);
            setCurrentCharIndex(processedText.length); // Skip to the end
          };
          
          testImg.onerror = () => {
            // Image doesn't exist, fall back to letter-by-letter
            console.warn(`Phrase video file not found: ${phraseVideo}, using letter-by-letter instead`);
            // Continue with the first character
            const char = processedText[currentCharIndex];
            const videoPath = getVideoForChar(char);
            setCurrentVideo(videoPath);
            setVideoHistory(prev => [...prev, videoPath]);
            setCurrentCharIndex(prev => prev + 1);
          };
          
          // Try to load a thumbnail of the same name to verify it exists
          // This assumes you have a thumbnail directory with the same structure
          const thumbnailPath = phraseVideo.replace('.webm', '.jpg');
          testImg.src = thumbnailPath;
          
          // Set a timeout to move on in case the image test hangs
          setTimeout(() => {
            if (!currentVideo) {
              console.warn("Phrase video verification timed out, proceeding with letter-by-letter");
              const char = processedText[currentCharIndex];
              const videoPath = getVideoForChar(char);
              setCurrentVideo(videoPath);
              setVideoHistory(prev => [...prev, videoPath]);
              setCurrentCharIndex(prev => prev + 1);
            }
          }, 1000);
          
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
    
    const handleTimeUpdate = () => {
      if (videoElement) {
        const progress = (videoElement.currentTime / videoElement.duration) * 100
        setVideoProgress(progress)
      }
    }
    
    const handleDurationChange = () => {
      if (videoElement) {
        setVideoDuration(videoElement.duration)
      }
    }
    
    // Set playback rate to 4x
    videoElement.playbackRate = 4.0;
    
    videoElement.addEventListener('ended', handleVideoEnded)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)
    
    return () => {
      videoElement.removeEventListener('ended', handleVideoEnded)
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('durationchange', handleDurationChange)
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
    
    // Log all video events in development mode
    if (process.env.NODE_ENV === 'development') {
      const videoEvents = [
        'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'ended', 
        'error', 'loadeddata', 'loadedmetadata', 'loadstart', 'pause', 
        'play', 'playing', 'progress', 'ratechange', 'seeked', 'seeking', 
        'stalled', 'suspend', 'timeupdate', 'volumechange', 'waiting'
      ];
      
      videoEvents.forEach(event => {
        const handler = () => console.log(`Video event: ${event}`);
        videoElement.addEventListener(event, handler);
        return () => videoElement.removeEventListener(event, handler);
      });
    }
    
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
  
  // Auto-test in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Running video test in development mode')
      
      // Wait a bit for component to fully render
      const timer = setTimeout(() => {
        // Test a basic video file that should exist
        const testVideo = '/signs/a.webm';
        console.log(`Auto-testing video playback: ${testVideo}`);
        
        const videoEl = document.createElement('video');
        videoEl.src = testVideo;
        videoEl.muted = true;
        videoEl.playbackRate = 4.0; // Set test video to 2x speed as well
        
        videoEl.oncanplay = () => {
          console.log('✅ Video test: Video loaded successfully');
        };
        
        videoEl.onerror = (e) => {
          console.error('❌ Video test: Error loading video', e);
          setAlertMessage(`Auto-test: Error loading video ${testVideo}`);
        };
        
        videoEl.load();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Toggle microphone recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (useWebSpeechAPI) {
        // For Web Speech API
        speechRecognition.stopListening();
      } else if (mediaRecorderRef.current) {
        // For AssemblyAI
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        if (useWebSpeechAPI && speechRecognition.isAvailable) {
          // Use Web Speech API directly in the browser
          startWebSpeechRecognition();
        } else {
          // Use AssemblyAI (existing code)
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
            // Convert audio format for better compatibility
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
            startTranslation(inputText);
          }, 500);
        }
      }
    });
  };
  
  // Process the audio with AssemblyAI
  const processAudio = async (audioBlob: Blob) => {
    setIsTranslating(true)
    setUsingAssemblyAI(true)
    
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
      } else {
        setAlertMessage("Speech recognized successfully! Starting translation...")
      }
      
      console.log("Transcribed text:", text)
      setInputText(text)
      
      // Automatically start the translation
      startTranslation(text)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error processing audio:", errorMessage)
      
      setAlertMessage(`Processing error: ${errorMessage}`)
      setTimeout(() => setAlertMessage(""), 7000)
      
      setIsTranslating(false)
      setUsingAssemblyAI(false)
    }
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
    
    // Clear any existing alerts
    setAlertMessage("");
    
    // Small delay before starting to ensure UI updates first
    setTimeout(() => {
      // Start playing videos
      playNextVideo();
    }, 100);
  };
  
  // Update playTextSequence to not pause for spaces and speed up playback
  const playTextSequence = async (text: string) => {
    setIsPlaying(true);
    setProcessedText(text);
    setVideoHistory([]);
    
    // Reset video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
      // Set video speed to 4x
      videoRef.current.playbackRate = 4.0;
    }
    
    // Process the text character by character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      setCurrentCharIndex(i);
      
      // Check for phrase at current position
      let skipChars = 0;
      for (let j = 5; j > 0; j--) { // Check phrases up to 5 chars long
        if (i + j <= text.length) {
          const potentialPhrase = text.substring(i, i + j);
          const phraseVideo = getVideoForPhrase(potentialPhrase);
          
          if (phraseVideo) {
            console.log(`Found phrase video for "${potentialPhrase}": ${phraseVideo}`);
            setCurrentVideo(phraseVideo);
            setVideoHistory(prev => [...prev, phraseVideo]);
            
            // Wait for video to play
            await new Promise(resolve => {
              if (videoRef.current) {
                const handleEnded = () => {
                  videoRef.current?.removeEventListener('ended', handleEnded);
                  resolve(null);
                };
                videoRef.current.addEventListener('ended', handleEnded);
                
                // Failsafe timeout - reduced for faster playback
                setTimeout(() => {
                  videoRef.current?.removeEventListener('ended', handleEnded);
                  resolve(null);
                }, 2500); // Half of original timeout for 4x speed
              } else {
                // If no video element, just wait a moment
                setTimeout(resolve, 250); // Half the time for 4x speed
              }
            });
            
            skipChars = j - 1; // Skip the phrase characters (minus current one)
            break;
          }
        }
      }
      
      // If we found a phrase, skip ahead
      if (skipChars > 0) {
        i += skipChars;
        continue;
      }
      
      // Handle individual character
      if (char === ' ') {
        // Space - just add to history without pausing
        console.log("Space detected");
        setVideoHistory(prev => [...prev, 'space']);
      } else {
        // Regular character - play its video
        const videoPath = getVideoForChar(char);
        console.log(`Playing video for '${char}': ${videoPath}`);
        setCurrentVideo(videoPath);
        setVideoHistory(prev => [...prev, videoPath]);
        
        // Wait for the video to finish
        await new Promise(resolve => {
          if (videoRef.current) {
            const handleEnded = () => {
              videoRef.current?.removeEventListener('ended', handleEnded);
              resolve(null);
            };
            videoRef.current.addEventListener('ended', handleEnded);
            
            // Failsafe timeout - reduced for faster playback
            setTimeout(() => {
              videoRef.current?.removeEventListener('ended', handleEnded);
              resolve(null);
            }, 1500); // Half of original timeout for 4x speed
          } else {
            // If no video element, just wait a moment
            setTimeout(resolve, 250); // Half the time for 4x speed
          }
        });
      }
    }
    
    // Mark as complete
    setIsPlaying(false);
    setCurrentCharIndex(text.length);
  };
  
  // Update the translateText function to use the sequence player
  const translateText = async () => {
    if (!inputText.trim()) {
      setAlertMessage("Please enter some text to translate");
      setTimeout(() => setAlertMessage(""), 5000);
      return;
    }
    
    setIsTranslating(true);
    console.log("Starting text translation for:", inputText);
    
    try {
      // Play through the full text sequence with proper timing
      await playTextSequence(inputText);
      setIsTranslating(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in text sequence translation:", errorMessage);
      setAlertMessage(`Translation error: ${errorMessage}`);
      setTimeout(() => setAlertMessage(""), 5000);
      
      // Reset states
      setIsTranslating(false);
    }
  };
  
  // Reset all states
  const resetConverter = () => {
    setInputText("")
    setIsTranslating(false)
    setIsPlaying(false)
    setCurrentCharIndex(0)
    setCurrentVideo(null)
    setProcessedText("")
    setVideoHistory([])
    setUsingAssemblyAI(false)
    setAlertMessage("")
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
  
  // Preload common video files to ensure faster playback
  useEffect(() => {
    // Only preload in browser environment
    if (typeof window === 'undefined') return;
    
    console.log("Preloading common video files...");
    const preloadVideos = async () => {
      // List of videos to preload (most common ones)
      const videosToPreload = [
        '/signs/a.webm',
        '/signs/e.webm',
        '/signs/i.webm',
        '/signs/o.webm',
        '/signs/u.webm',
        '/signs/hi.webm',
        '/signs/bye.webm',
      ];
      
      // Create a hidden div to hold the preload video elements
      const preloadContainer = document.createElement('div');
      preloadContainer.style.display = 'none';
      preloadContainer.id = 'video-preload-container';
      document.body.appendChild(preloadContainer);
      
      // Create video elements for each file
      for (const videoPath of videosToPreload) {
        try {
          const videoEl = document.createElement('video');
          videoEl.preload = 'auto';
          videoEl.muted = true;
          videoEl.src = videoPath;
          videoEl.load();
          
          // Add to container
          preloadContainer.appendChild(videoEl);
          
          console.log(`Preloaded: ${videoPath}`);
        } catch (error) {
          console.warn(`Failed to preload video: ${videoPath}`, error);
        }
      }
      
      // Set a timeout to clean up preloaded videos after they've loaded
      setTimeout(() => {
        if (document.getElementById('video-preload-container')) {
          document.body.removeChild(preloadContainer);
          console.log("Preload container removed");
        }
      }, 10000);
    };
    
    preloadVideos();
    
    // Clean up on unmount
    return () => {
      const preloadContainer = document.getElementById('video-preload-container');
      if (preloadContainer) {
        document.body.removeChild(preloadContainer);
      }
    };
  }, []);
  
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
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Text to Sign Language</h1>
              
              {useWebSpeechAPI ? (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Browser Speech API
                </span>
              ) : (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  AssemblyAI API
                </span>
              )}
            </div>
            
            <p className="text-muted-foreground">
              Convert speech or text into sign language videos.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Button 
                  variant={isRecording ? "destructive" : "default"} 
                  className="w-full relative"
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
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={translateText}
                  disabled={isTranslating || isPlaying || !inputText.trim()}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play Sign Language
                </Button>
              </div>
              
              {isRecording && (
                <div className="text-xs text-center text-red-500 font-semibold animate-pulse mb-4">
                  Recording in progress... Speak clearly.
                </div>
              )}
              
              {isTranslating && (
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                  <span className="text-sm">Transcribing with AssemblyAI...</span>
                </div>
              )}

              <div className="relative">
                <textarea 
                  className="w-full h-32 p-4 rounded-lg border bg-background resize-none"
                  placeholder="Type your text here..."
                  value={inputText}
                  onChange={handleTextChange}
                  disabled={isTranslating || isPlaying}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="slow-mode"
                  checked={isSlowMode}
                  onCheckedChange={setIsSlowMode}
                />
                <Label htmlFor="slow-mode">Slow Mode</Label>
                
                <div className="ml-4 border-l pl-4">
                  <Switch
                    id="realtime-mode"
                    checked={realtimeMode}
                    onCheckedChange={setRealtimeMode}
                  />
                  <Label htmlFor="realtime-mode">Real-time Translation</Label>
                </div>
              </div>
            </div>
            
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
                    disabled={isTranslating || isPlaying}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
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
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{alertMessage}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Add tips section */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs mt-6">
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
                  Using AssemblyAI for accurate speech recognition. API key is configured in the code.
                </p>
              </div>
            </div>
          </Card>

          {/* Video Section */}
          <Card className="p-6 space-y-6 flex flex-col">
            <h2 className="text-2xl font-bold">Sign Language Video</h2>
            
            <div className="flex-grow flex flex-col justify-center items-center bg-black rounded-lg overflow-hidden relative" style={{ minHeight: "550px", aspectRatio: "1/1" }}>
              {!currentVideo && !isPlaying ? (
                <div className="text-white text-center p-4">
                  <p>Enter text and click play to see sign language translation</p>
                  
                  {/* Debug buttons - only show in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 flex gap-2 justify-center">
                      <button 
                        className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 text-xs rounded"
                        onClick={() => {
                          const testVideo = '/signs/a.webm';
                          console.log(`Testing video playback: ${testVideo}`);
                          setCurrentVideo(testVideo);
                          if (videoRef.current) {
                            videoRef.current.src = testVideo;
                            videoRef.current.load();
                            videoRef.current.playbackRate = 2.0; // Set test video to 2x
                            videoRef.current.play()
                              .then(() => console.log('Test video playing successfully'))
                              .catch(err => console.error('Test video playback failed:', err));
                          }
                        }}
                      >
                        Test 'A' Video
                      </button>
                      <button 
                        className="bg-green-500 hover:bg-green-700 text-white px-2 py-1 text-xs rounded"
                        onClick={() => {
                          const testVideo = '/signs/hi.webm';
                          console.log(`Testing video playback: ${testVideo}`);
                          setCurrentVideo(testVideo);
                          if (videoRef.current) {
                            videoRef.current.src = testVideo;
                            videoRef.current.load();
                            videoRef.current.playbackRate = 2.0; // Set test video to 2x
                            videoRef.current.play()
                              .then(() => console.log('Test video playing successfully'))
                              .catch(err => console.error('Test video playback failed:', err));
                          }
                        }}
                      >
                        Test 'Hi' Video
                      </button>
                    </div>
                  )}
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

              {/* Refresh button - always visible */}
              <button
                className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-700 text-white p-1 rounded-full shadow-md"
                onClick={() => {
                  // Reload current video if one is playing
                  if (currentVideo && videoRef.current) {
                    console.log(`Refreshing video: ${currentVideo}`);
                    
                    // Save the current playback position
                    const currentTime = videoRef.current.currentTime;
                    
                    // Reload the video element
                    videoRef.current.load();
                    
                    // Restore position and play
                    videoRef.current.currentTime = currentTime;
                    videoRef.current.play()
                      .then(() => console.log('Video refreshed successfully'))
                      .catch(err => {
                        console.error('Error refreshing video:', err);
                        setAlertMessage(`Error refreshing video: ${err.message}`);
                        setTimeout(() => setAlertMessage(""), 5000);
                      });
                  } else if (isPlaying) {
                    // If we're in the middle of playing a sequence, restart from current character
                    console.log('Refreshing current character in sequence');
                    playNextVideo();
                  } else {
                    // If nothing is playing, show a message
                    setAlertMessage('No video to refresh. Try playing a sign first.');
                    setTimeout(() => setAlertMessage(""), 3000);
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
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 p-2 border border-dashed border-gray-300 rounded text-xs">
                    <p className="font-mono overflow-x-auto whitespace-nowrap">
                      Current video: {currentVideo || 'None'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 