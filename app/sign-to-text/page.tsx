"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, CameraOff, RotateCcw, Volume2, Globe, Sparkles } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SignToTextPage() {
  // State for the converter
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPrediction, setCurrentPrediction] = useState("?")
  const [confidencePercent, setConfidencePercent] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState("ase") // American Sign Language by default
  const [alertMessage, setAlertMessage] = useState("")
  const [backendConnected, setBackendConnected] = useState(false)
  const [debugImage, setDebugImage] = useState<string | null>(null)
  const [handRoiImage, setHandRoiImage] = useState<string | null>(null)
  const [noHandDetected, setNoHandDetected] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false) // State for speech status
  const [isTranslating, setIsTranslating] = useState(false) // State for translation status
  const [speechLanguage, setSpeechLanguage] = useState<"en" | "hi" | "both">("en") // Speech language selector
  const [isAutocorrecting, setIsAutocorrecting] = useState(false) // State for autocorrect status

  // For sentence building (matching index.html)
  const [sentence, setSentence] = useState("")
  const [savedSentences, setSavedSentences] = useState<string[]>([])
  const [letterStableCount, setLetterStableCount] = useState(0)
  const [letterCooldown, setLetterCooldown] = useState(0)
  const [lastLetter, setLastLetter] = useState("None")
  const [lastAddedLetter, setLastAddedLetter] = useState<string | null>(null)

  // Constants matching index.html
  const FRAME_INTERVAL = 100 // 10 fps
  const LETTER_STABILITY_THRESHOLD = 3
  const LETTER_COOLDOWN_THRESHOLD = 5

  // Reference to the webcam element
  const webcamRef = useRef<HTMLVideoElement | null>(null)
  
  // Check backend connection on mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        console.log("Checking backend connection to FastAPI server...")
        
        // Check if the API endpoint is available using a timeout to prevent long waits
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increase timeout to 5 seconds
        
        try {
          const response = await fetch('http://localhost:8000/api/sign-to-text', {
            signal: controller.signal,
            method: 'GET',
            cache: 'no-store', 
            headers: {
              'pragma': 'no-cache',
              'cache-control': 'no-cache'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Python server responded with status: ${response.status}`)
          }
          
          const data = await response.json()
          console.log("Backend connection response:", data)
          
          if (data.status === 'ok') {
            console.log("Successfully connected to backend server")
            setBackendConnected(true)
            setAlertMessage("")
          } else {
            throw new Error("Backend server not ready: " + (data.message || "Unknown error"))
          }
        } catch (error) {
          console.error("Error connecting to backend:", error)
          setBackendConnected(false)
          setAlertMessage("Backend server is not available. Please make sure the FastAPI server is running on port 8000. Check the browser console for more details.")
        }
      } catch (error) {
        console.error("Backend connection check failed completely:", error)
        setBackendConnected(false)
        setAlertMessage("Backend server is not available. Please make sure the FastAPI server is running on port 8000.")
      }
    }
    
    // Check immediately on mount
    checkBackendConnection()
    
    // And then check more frequently if not connected
    const intervalId = setInterval(() => {
      checkBackendConnection()
    }, backendConnected ? 10000 : 2000) // Check every 2 seconds if not connected, 10 seconds if connected
    
    return () => clearInterval(intervalId)
  }, [backendConnected])
  
  // Toggle webcam
  const toggleWebcam = async () => {
    if (isWebcamOn) {
      // Turn off webcam
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = (webcamRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
        webcamRef.current.srcObject = null
      }
      setIsWebcamOn(false)
      // Reset states when turning off
      setCurrentPrediction("?")
      setConfidencePercent(0)
      setDebugImage(null)
      setHandRoiImage(null)
      setNoHandDetected(true)
      setLetterStableCount(0)
      setLetterCooldown(0)
      setLastLetter("None")
    } else {
      try {
        // Turn on webcam
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        })
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

  // Update the stability indicator (matching index.html)
  const updateStabilityStatus = () => {
    let color = "#808080"; // Default gray
    let text = "No sign detected";
    
    if (letterCooldown > 0) {
      color = "#0080FF"; // Blue during cooldown
      text = `Cooldown: ${letterCooldown}`;
    } else if (currentPrediction !== "?" && currentPrediction !== "None" && currentPrediction !== "Uncertain") {
      if (currentPrediction === lastLetter) {
        // Green progress based on stability
        const progress = Math.min(1.0, letterStableCount / LETTER_STABILITY_THRESHOLD);
        const red = Math.floor(255 * (1 - progress));
        const green = Math.floor(255 * progress);
        color = `rgb(${red}, ${green}, 0)`;
        text = `Stable: ${letterStableCount}/${LETTER_STABILITY_THRESHOLD}`;
      } else {
        color = "#FF0000"; // Red when letter is changing
        text = "Detecting...";
      }
    }
    
    return { color, text };
  }
  
  // Create a memoized version of processFrame to avoid dependency issues
  const processFrameMemoized = useCallback(() => {
    if (isProcessing || !isWebcamOn || !webcamRef.current?.videoWidth) {
      return
    }
    
    setIsProcessing(true)
    
    const processFrameAsync = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = webcamRef.current!.videoWidth
        canvas.height = webcamRef.current!.videoHeight
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Flip the image horizontally for more intuitive interaction
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(webcamRef.current!, 0, 0)
          
          // Draw green box ROI
          const boxSize = Math.min(canvas.width, canvas.height) * 0.5
          const boxX = (canvas.width - boxSize) / 2
          const boxY = (canvas.height - boxSize) / 2
          
          ctx.strokeStyle = 'green'
          ctx.lineWidth = 3
          ctx.strokeRect(boxX, boxY, boxSize, boxSize)
        } else {
          throw new Error("Could not get canvas context")
        }
        
        // Convert canvas to blob/file
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob)
            else reject(new Error("Failed to convert canvas to blob"))
          }, 'image/jpeg', 0.85)
        })
        
        // Create form data
        const formData = new FormData()
        const fileName = `frame_${Date.now()}.jpg`;
        formData.append('file', new File([blob], fileName, { type: 'image/jpeg' }))
        formData.append('language', selectedLanguage)
        
        console.log(`Sending frame ${fileName} to backend...`);
        
        // Check backend status if we think it's not connected
        if (!backendConnected) {
          try {
            const statusResponse = await fetch('http://localhost:8000/api/sign-to-text', { 
              method: 'GET',
              cache: 'no-store',
              headers: {
                'pragma': 'no-cache',
                'cache-control': 'no-cache'
              }
            })
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              setBackendConnected(statusData.status === 'ok')
            }
          } catch (e) {
            console.error("Backend status check failed:", e)
            setBackendConnected(false)
          }
        }
        
        // If we still don't have a backend connection, stop processing
        if (!backendConnected) {
          throw new Error("Backend server not connected")
        }
        
        // Send to API with timeout - connect directly to Python server
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        try {
          const response = await fetch('http://localhost:8000/api/sign-to-text/predict', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            cache: 'no-store',
            headers: {
              'pragma': 'no-cache',
              'cache-control': 'no-cache'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            console.error(`API error: ${response.status}, ${errorText}`);
            setBackendConnected(false)
            throw new Error(`API error: ${response.status}`)
          }
          
          setBackendConnected(true)
          setAlertMessage("")
          
          const data = await response.json()
          console.log("Received data from backend:", data);
          
          // If we received invalid data, throw an error
          if (!data || typeof data.prediction === 'undefined') {
            throw new Error("Invalid response from API")
          }
          
          const prediction = data.prediction !== "None" && data.prediction !== "Uncertain" 
            ? data.prediction 
            : "?"
          
          // Update UI with prediction
          setCurrentPrediction(prediction)
          
          // Update confidence
          const confidence = Math.round((data.confidence || 0) * 100)
          setConfidencePercent(confidence)
          
          // Update hand detection state
          setNoHandDetected(!data.has_hand)
          
          // Update debug images (add data URL prefix if not present)
          if (data.has_hand) {
            if (data.debug_image) {
              setDebugImage(data.debug_image.startsWith('data:') 
                ? data.debug_image 
                : `data:image/jpeg;base64,${data.debug_image}`)
            }
            
            if (data.hand_roi) {
              setHandRoiImage(data.hand_roi.startsWith('data:') 
                ? data.hand_roi 
                : `data:image/jpeg;base64,${data.hand_roi}`)
            }
          } else {
            setDebugImage(null)
            setHandRoiImage(null)
          }
          
          // Handle letter stability for automatic sentence building
          if (letterCooldown > 0) {
            setLetterCooldown(prev => prev - 1)
          } 
          else if (prediction !== "?" && data.confidence > 0.7) {
            if (prediction === lastLetter) {
              const newStableCount = letterStableCount + 1
              setLetterStableCount(newStableCount)
              
              // Once stable enough, add the letter automatically
              if (newStableCount >= LETTER_STABILITY_THRESHOLD) {
                if (lastAddedLetter !== prediction) {  // Avoid duplicates
                  const newSentence = sentence + prediction;
                  setSentence(newSentence)
                  setLastAddedLetter(prediction)
                  console.log(`Added letter: ${prediction}, Current sentence: ${newSentence}`)
                }
                
                // Reset stability counter and set cooldown
                setLetterStableCount(0)
                setLetterCooldown(LETTER_COOLDOWN_THRESHOLD)
              }
            } else {
              setLastLetter(prediction)
              setLetterStableCount(0)
            }
          } else {
            setLastLetter("None")
            setLetterStableCount(0)
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.error("Request timed out");
            throw new Error("Request timed out after 5 seconds");
          }
          throw error; // Rethrow to be caught by outer try/catch
        }
      } catch (error) {
        console.error("Error processing frame:", error)
        
        // Only show error messages if they're unusual (not just backend disconnection)
        if (error instanceof Error && 
            !error.message.includes('Backend server not') && 
            !error.message.includes('Failed to fetch')) {
          setAlertMessage(error.message)
          setTimeout(() => setAlertMessage(""), 3000)
        }
      } finally {
        setIsProcessing(false)
      }
    }

    processFrameAsync()
  }, [
    isProcessing, 
    isWebcamOn, 
    backendConnected, 
    selectedLanguage,
    letterCooldown,
    letterStableCount,
    lastLetter,
    lastAddedLetter,
    sentence,
    LETTER_STABILITY_THRESHOLD,
    LETTER_COOLDOWN_THRESHOLD
  ]);

  // Start processing frames automatically when webcam is on
  useEffect(() => {
    if (!isWebcamOn) return;
    
    let animationFrameId: number | null = null;
    let lastFrameTime = 0;
    const targetFrameRate = 10; // 10 FPS (same as 100ms in the HTML version)
    const frameInterval = 1000 / targetFrameRate;
    
    const processNextFrame = (timestamp: number) => {
      if (!isWebcamOn) return;
      
      // Calculate time since last frame
      const elapsed = timestamp - lastFrameTime;
      
      // If enough time has passed, process a new frame
      if (elapsed > frameInterval) {
        lastFrameTime = timestamp;
        
        // Only process if not already processing and webcam is on
        if (!isProcessing && webcamRef.current?.readyState === 4) {
          processFrameMemoized();
        }
      }
      
      // Schedule next frame
      animationFrameId = requestAnimationFrame(processNextFrame);
    };
    
    console.log("Starting frame processing with requestAnimationFrame...");
    animationFrameId = requestAnimationFrame(processNextFrame);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isWebcamOn, isProcessing, processFrameMemoized]);
  
  // Add keyboard shortcuts for easy interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard shortcuts if user is typing in the input field or any other input/textarea
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.code === 'Space') {
        setSentence(prev => prev + " ");
        setLastAddedLetter(null);
        e.preventDefault();
      } else if (e.code === 'Backspace') {
        if (sentence.length > 0) {
          setSentence(prev => prev.slice(0, -1));
          setLastAddedLetter(null);
        }
        e.preventDefault();
      } else if (e.code === 'KeyC') {
        setSentence("");
        setLastAddedLetter(null);
      } else if (e.code === 'KeyV') {
        if (sentence.trim()) {
          setSavedSentences(prev => [...prev, sentence]);
          setSentence("");
          setLastAddedLetter(null);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sentence]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = (webcamRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [])

  // Get stability status
  const stabilityStatus = updateStabilityStatus()

  // Text translation function
  const translateText = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (!text.trim()) return "";
    
    setIsTranslating(true);
    try {
      // For demonstration, we'll use a mock translation for Hindi
      // In a real app, you would connect to a translation API like Google Translate
      if (targetLang === "hi") {
        // Wait a bit to simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // This is a very simple word mapping for demonstration purposes only
        // In a real application, you'd use a proper translation API
        const commonEnglishToHindi: Record<string, string> = {
          // Greetings
          "hello": "नमस्ते",
          "hi": "नमस्ते",
          "hey": "अरे",
          "good morning": "सुप्रभात",
          "good afternoon": "शुभ दोपहर",
          "good evening": "शुभ संध्या",
          "good night": "शुभ रात्रि",
          
          // Common phrases
          "thank you": "धन्यवाद",
          "thanks": "धन्यवाद",
          "welcome": "स्वागत है",
          "please": "कृपया",
          "sorry": "माफ़ करें",
          "excuse me": "क्षमा करें",
          
          // Questions
          "how are you": "आप कैसे हैं",
          "what": "क्या",
          "when": "कब",
          "where": "कहाँ",
          "who": "कौन",
          "why": "क्यों",
          "how": "कैसे",
          
          // Responses
          "yes": "हाँ",
          "no": "नहीं",
          "maybe": "शायद",
          "i am fine": "मैं ठीक हूँ",
          "good": "अच्छा",
          "bad": "बुरा",
          "ok": "ठीक है",
          "okay": "ठीक है",
          
          // Common expressions
          "i love you": "मैं तुमसे प्यार करता हूँ",
          "love you": "तुमसे प्यार करता हूँ",
          "miss you": "मैं तुम्हें याद करता हूँ",
          "congratulations": "बधाई हो",
          "happy birthday": "जन्मदिन मुबारक",
          "get well soon": "जल्दी ठीक हो जाओ",
          
          // Common words
          "love": "प्यार",
          "hate": "नफरत",
          "happy": "खुश",
          "sad": "दुखी",
          "angry": "नाराज़",
          "tired": "थका हुआ",
          "hungry": "भूखा",
          "thirsty": "प्यासा",
          "help": "मदद",
          "stop": "रुको",
          "go": "जाओ",
          "come": "आओ",
          "eat": "खाओ",
          "drink": "पियो",
          "sleep": "सोओ",
          "work": "काम",
          "play": "खेलो",
          "read": "पढ़ो",
          "write": "लिखो",
          
          // Family
          "mother": "माँ",
          "father": "पिता",
          "brother": "भाई",
          "sister": "बहन",
          "son": "बेटा",
          "daughter": "बेटी",
          "family": "परिवार",
          
          // Time
          "today": "आज",
          "tomorrow": "कल",
          "yesterday": "कल",
          "now": "अभी",
          "later": "बाद में",
          "time": "समय",
          "day": "दिन",
          "night": "रात",
          "morning": "सुबह",
          "evening": "शाम",
          
          // Numbers
          "one": "एक",
          "two": "दो",
          "three": "तीन",
          "four": "चार",
          "five": "पांच",
          "six": "छह",
          "seven": "सात",
          "eight": "आठ",
          "nine": "नौ",
          "ten": "दस",
          
          // Goodbye
          "goodbye": "अलविदा",
          "bye": "अलविदा",
          "see you": "फिर मिलेंगे",
          "see you later": "फिर मिलेंगे",
          "see you soon": "जल्द ही मिलेंगे",
        };
        
        // Convert input to lowercase for matching
        const lowerText = text.toLowerCase();

        // First try to match the complete phrase
        if (commonEnglishToHindi[lowerText]) {
          return commonEnglishToHindi[lowerText];
        }
        
        // If no exact match, try to find partial matches in phrases
        for (const [english, hindi] of Object.entries(commonEnglishToHindi)) {
          if (lowerText.includes(english)) {
            // Replace all occurrences of the English phrase with Hindi
            return lowerText.replace(new RegExp(english, 'gi'), hindi);
          }
        }
        
        // If no matches found, try to translate word by word
        const words = lowerText.split(/\s+/);
        let translated = false;
        const translatedWords = words.map(word => {
          if (commonEnglishToHindi[word]) {
            translated = true;
            return commonEnglishToHindi[word];
          }
          return word;
        });
        
        // If at least one word was translated, return the result
        if (translated) {
          return translatedWords.join(' ');
        }
        
        // If no translation found, return original with note
        return `${text}`;
      }
      
      // For English or other languages, return the original text
      return text;
    } catch (error) {
      console.error("Translation error:", error);
      setAlertMessage("Translation failed. Using original text.");
      setTimeout(() => setAlertMessage(""), 3000);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Text-to-speech function with translation support
  const speakText = useCallback(async (text: string, language: "en" | "hi" | "both" = speechLanguage) => {
    if (!text.trim()) return;
    
    try {
      // Check if the browser supports speech synthesis
      if ('speechSynthesis' in window) {
        // Set speaking status
        setIsSpeaking(true);
        
        // First speak in the original language (English)
        if (language === "en" || language === "both") {
          // Create a new speech synthesis utterance for English
          const utteranceEn = new SpeechSynthesisUtterance(text);
          
          // Set language to English
          utteranceEn.lang = navigator.language || "en-US";
          
          // Optional: Customize voice properties
          utteranceEn.rate = 1.0;
          utteranceEn.pitch = 1.0;
          utteranceEn.volume = 1.0;
          
          // Try to find appropriate English voice
          const voices = window.speechSynthesis.getVoices();
          const enVoice = voices.find(voice => 
            voice.lang.includes(navigator.language.split('-')[0]) || voice.lang.includes("en")
          );
          
          if (enVoice) {
            utteranceEn.voice = enVoice;
          }
          
          // Event handlers
          utteranceEn.onend = async () => {
            // If both languages requested, proceed with Hindi after English completes
            if (language === "both") {
              try {
                // Translate and speak in Hindi
                const textInHindi = await translateText(text, "hi");
                const utteranceHi = new SpeechSynthesisUtterance(textInHindi);
                utteranceHi.lang = "hi-IN";
                
                // Try to find Hindi voice
                const hiVoice = voices.find(voice => voice.lang.includes("hi"));
                if (hiVoice) {
                  utteranceHi.voice = hiVoice;
                }
                
                utteranceHi.onend = () => setIsSpeaking(false);
                utteranceHi.onerror = () => {
                  setIsSpeaking(false);
                  setAlertMessage("Hindi speech failed. Please try again.");
                  setTimeout(() => setAlertMessage(""), 3000);
                };
                
                window.speechSynthesis.speak(utteranceHi);
              } catch (error) {
                console.error("Hindi translation/speech error:", error);
                setIsSpeaking(false);
              }
            } else {
              setIsSpeaking(false);
            }
          };
          
          utteranceEn.onerror = () => {
            setIsSpeaking(false);
            setAlertMessage("English speech failed. Please try again.");
            setTimeout(() => setAlertMessage(""), 3000);
          };
          
          // Stop any current speech
          window.speechSynthesis.cancel();
          
          // Speak the English text
          window.speechSynthesis.speak(utteranceEn);
        } 
        // Only speak in Hindi
        else if (language === "hi") {
          // Translate text to Hindi
          const textInHindi = await translateText(text, "hi");
          
          // Create a new speech synthesis utterance for Hindi
          const utteranceHi = new SpeechSynthesisUtterance(textInHindi);
          
          // Set language to Hindi
          utteranceHi.lang = "hi-IN";
          
          // Optional: Customize voice properties
          utteranceHi.rate = 1.0;
          utteranceHi.pitch = 1.0;
          utteranceHi.volume = 1.0;
          
          // Try to find appropriate Hindi voice
          const voices = window.speechSynthesis.getVoices();
          const hiVoice = voices.find(voice => voice.lang.includes("hi"));
          
          if (hiVoice) {
            utteranceHi.voice = hiVoice;
          }
          
          // Event handlers
          utteranceHi.onend = () => setIsSpeaking(false);
          utteranceHi.onerror = () => {
            setIsSpeaking(false);
            setAlertMessage("Hindi speech failed. Please try again.");
            setTimeout(() => setAlertMessage(""), 3000);
          };
          
          // Stop any current speech
          window.speechSynthesis.cancel();
          
          // Speak the Hindi text
          window.speechSynthesis.speak(utteranceHi);
        }
      } else {
        setAlertMessage("Your browser does not support text-to-speech.");
        setTimeout(() => setAlertMessage(""), 3000);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Speech error:", error);
      setIsSpeaking(false);
      setAlertMessage("Text-to-speech failed. Please try again.");
      setTimeout(() => setAlertMessage(""), 3000);
    }
  }, [speechLanguage, translateText, navigator.language]);
  
  // Load voices when the component mounts
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    // Load voices right away and add an event listener for when voices change
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Add autocorrect function
  const autocorrectText = useCallback(async (text: string): Promise<string> => {
    if (!text.trim()) return "";
    
    setIsAutocorrecting(true);
    try {
      // Use a single endpoint with simple error handling for clarity
      console.log("Sending text to autocorrect API:", text);
      
      // Add a debug log before making the request
      console.log("Connecting to autocorrect API at http://localhost:8000/autocorrect");
      
      const response = await fetch('http://localhost:8000/autocorrect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ text }),
        // Add shorter timeout
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Autocorrect result:", data);
      
      if (!data || !data.corrected) {
        throw new Error("Invalid response format - missing corrected text");
      }
      
      // Alert the user that text was corrected
      if (data.corrected !== text) {
        setAlertMessage(`Text autocorrected: "${text}" → "${data.corrected}"`);
        setTimeout(() => setAlertMessage(""), 3000);
      } else {
        setAlertMessage("No corrections needed!");
        setTimeout(() => setAlertMessage(""), 2000);
      }
      
      return data.corrected;
    } catch (error: any) {
      console.error("Autocorrect error:", error);
      
      // Check if it's a network error
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setAlertMessage("Cannot connect to autocorrect server. Make sure it's running at http://localhost:8000");
      } else {
        setAlertMessage(`Autocorrection error: ${error.message}. Using original text.`);
      }
      
      setTimeout(() => setAlertMessage(""), 5000);
      return text;
    } finally {
      setIsAutocorrecting(false);
    }
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
          {/* Webcam Section */}
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Sign Language to Text</h1>
              <div className="flex items-center gap-2">
                {backendConnected ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Backend Connected
                  </span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    Backend Disconnected
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-muted-foreground">
              Convert sign language gestures captured via webcam to text. Position your hand in the green box.
            </p>
            
            {!backendConnected && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <p>The backend server is not connected. To use this feature:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Make sure Python is installed on your system</li>
                    <li>Open a terminal/command prompt and navigate to the project's "server" directory</li>
                    <li>Run: <code className="bg-red-100 px-1">pip install fastapi uvicorn opencv-python torch transformers mediapipe</code> (first time)</li>
                    <li>Run: <code className="bg-red-100 px-1">uvicorn main:app --reload --port 8000</code></li>
                    <li>Wait for the message "Application startup complete"</li>
                    <li>Refresh this page</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="relative border-3 border-primary rounded-lg overflow-hidden" style={{ height: '300px' }}>
                <video 
                  ref={webcamRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {!isWebcamOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">Webcam is turned off</p>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                    Processing...
                  </div>
                )}
                
                {/* Display connection status on webcam feed */}
                <div className={`absolute top-2 left-2 text-sm px-2 py-1 rounded 
                  ${backendConnected ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                  {backendConnected ? 'Backend Connected ✓' : 'Backend Disconnected ✗'}
                </div>
                
                {/* Draw green box overlay to indicate hand position area */}
                {isWebcamOn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-green-500 w-1/2 h-1/2 rounded-lg flex items-center justify-center">
                      <span className="text-xs bg-black/50 text-white px-1 py-0.5 rounded">
                        Position hand here
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant={isWebcamOn ? "destructive" : "default"} 
                  className="flex-1 h-12"
                  onClick={toggleWebcam}
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
                
                {isWebcamOn && (
                  <Button 
                    variant="outline"
                    className="h-12 px-4"
                    onClick={() => {
                      // Reset everything
                      setCurrentPrediction("?");
                      setConfidencePercent(0);
                      setLetterStableCount(0);
                      setLetterCooldown(0);
                      setLastLetter("None");
                      setLastAddedLetter(null);
                    }}
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  disabled={isProcessing || !backendConnected}
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
              </div>
              
              {/* Always show the alert message if present */}
              {alertMessage && (
                <Alert variant="default" className="mt-2">
                  <AlertDescription>{alertMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-6 space-y-6">
            <h2 className="text-2xl font-bold">Recognition Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Debug Images */}
              <div className="row-span-2 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg space-y-2">
                <h3 className="text-lg font-semibold mb-2">Vision Debug</h3>
                
                {noHandDetected || !debugImage ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="bg-slate-300 dark:bg-slate-800 rounded-lg p-4 text-center w-full">
                      <p className="text-slate-600 dark:text-slate-400">No hand detected</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Position your hand in the green box
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Main Debug Image */}
                    <div className="relative border-2 border-green-500 rounded-lg overflow-hidden bg-black">
                      <img 
                        src={debugImage} 
                        alt="Hand detection debug" 
                        className="w-full h-auto"
                      />
                    </div>
                    
                    {/* Hand ROI (Region of Interest) */}
                    {handRoiImage && (
                      <div className="relative border border-blue-400 rounded-lg overflow-hidden bg-black">
                        <img 
                          src={handRoiImage} 
                          alt="Hand ROI" 
                          className="w-full h-auto"
                        />
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1">
                          Hand ROI
                        </div>
                      </div>
                    )}
                    
                    {/* Stability Indicator */}
                    <div 
                      className="p-2 rounded-md text-sm font-semibold text-center mt-2" 
                      style={{ backgroundColor: stabilityStatus.color === "#808080" ? "#f0f0f0" : stabilityStatus.color, color: "#fff" }}
                    >
                      {stabilityStatus.text}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Current Letter Display */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Current Letter</h3>
                <div className="text-5xl font-bold text-center text-primary">
                  {currentPrediction}
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${confidencePercent}%` }}
                  ></div>
                </div>
                <div className="text-center text-sm mt-1">
                  Confidence: {confidencePercent}%
                </div>
              </div>
              
              {/* Sentence Builder */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-semibold">Current Sentence</h3>
                  <div className="flex space-x-2">
                    <Select
                      value={speechLanguage}
                      onValueChange={(value: "en" | "hi" | "both") => setSpeechLanguage(value)}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => speakText(sentence)}
                      disabled={!sentence.trim() || isSpeaking || isTranslating}
                      className={`${isSpeaking ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                    >
                      <Volume2 className={`w-4 h-4 mr-1 ${isSpeaking ? 'text-blue-500 animate-pulse' : ''}`} />
                      {speechLanguage === "hi" && <Globe className="w-3 h-3" />}
                      {speechLanguage === "both" && (
                        <div className="flex items-center">
                          <span className="text-xs mr-1">En+Hi</span>
                        </div>
                      )}
                    </Button>
                    {sentence.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => {
                        setSavedSentences(prev => [...prev, sentence]);
                        setSentence("");
                        setLastAddedLetter(null);
                      }}>
                        Save
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-3 rounded min-h-[50px] border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="w-full">
                    <input
                      type="text"
                      value={sentence}
                      onChange={(e) => {
                        setSentence(e.target.value);
                        setLastAddedLetter(null); // Reset last added letter when typing
                      }}
                      onKeyDown={(e) => {
                        // Allow keyboard shortcuts to be handled by the global handler
                        // except for Space and Backspace which are already handled by the input
                        if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) {
                          setSentence("");
                          setLastAddedLetter(null);
                          e.preventDefault();
                        } else if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
                          if (sentence.trim()) {
                            setSavedSentences(prev => [...prev, sentence]);
                            setSentence("");
                            setLastAddedLetter(null);
                          }
                          e.preventDefault();
                        }
                      }}
                      className="w-full bg-transparent focus:outline-none"
                      placeholder="Type or use sign language..."
                    />
                  </div>
                  {sentence.trim() && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 h-8 px-2 flex-shrink-0"
                      onClick={() => speakText(sentence)}
                      disabled={isSpeaking || isTranslating}
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-blue-500 animate-pulse' : ''}`} />
                      {speechLanguage === "hi" && <Globe className="w-3 h-3 ml-1" />}
                      {speechLanguage === "both" && (
                        <div className="flex items-center ml-1">
                          <span className="text-xs mr-1">En</span>
                          <Globe className="w-3 h-3" />
                          <span className="text-xs ml-1">Hi</span>
                        </div>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setSentence(prev => prev + " ");
                    setLastAddedLetter(null);
                  }} disabled={!isWebcamOn || !backendConnected}>
                    Add Space
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSentence(prev => prev + currentPrediction);
                    setLastAddedLetter(currentPrediction);
                  }} disabled={!isWebcamOn || !backendConnected || currentPrediction === "?" || currentPrediction === "None" || currentPrediction === "Uncertain"}>
                    Add Letter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSentence(prev => prev.slice(0, -1));
                    setLastAddedLetter(null);
                  }} disabled={sentence.length === 0}>
                    Backspace
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSentence("");
                    setLastAddedLetter(null);
                  }} disabled={sentence.length === 0}>
                    Clear
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default"
                    className={`bg-purple-600 hover:bg-purple-700 text-white ${isAutocorrecting ? 'animate-pulse' : ''}`}
                    onClick={async () => {
                      if (sentence.trim()) {
                        const corrected = await autocorrectText(sentence);
                        if (corrected && corrected !== sentence) {
                          setSentence(corrected);
                          setLastAddedLetter(null);
                        }
                      }
                    }}
                    disabled={!sentence.trim() || isAutocorrecting}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Autocorrect
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Saved Sentences */}
            {savedSentences.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Saved Sentences</h3>
                  <div className="w-24">
                    <Select
                      value={speechLanguage}
                      onValueChange={(value: "en" | "hi" | "both") => setSpeechLanguage(value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  {savedSentences.map((saved, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>{saved}</div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2 h-8 px-2"
                        onClick={() => speakText(saved)}
                        disabled={isSpeaking || isTranslating}
                      >
                        <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-blue-500 animate-pulse' : ''}`} />
                        {speechLanguage === "hi" && <Globe className="w-3 h-3 ml-1" />}
                        {speechLanguage === "both" && (
                          <div className="flex items-center ml-1">
                            <span className="text-xs mr-1">En</span>
                            <Globe className="w-3 h-3" />
                            <span className="text-xs ml-1">Hi</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Keyboard shortcuts */}
            <div className="bg-muted rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h3>
              <p className="text-sm text-muted-foreground mb-2">
                These shortcuts work when not typing directly in the sentence field:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <span className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">Space</span>
                  Add space
                </div>
                <div className="flex items-center">
                  <span className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">Backspace</span>
                  Delete last character
                </div>
                <div className="flex items-center">
                  <span className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">C</span>
                  Clear sentence
                </div>
                <div className="flex items-center">
                  <span className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">V</span>
                  Save sentence
                </div>
              </div>
            </div>
            
            {/* Tips for Better Results */}
            <div className="p-4 bg-muted rounded-lg mt-4">
              <h3 className="text-lg font-semibold mb-1">Tips for Better Results:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Ensure good lighting in your environment</li>
                <li>Keep your hands within the camera frame</li>
                <li>Sign clearly and at a moderate pace</li>
                <li>Maintain a consistent distance from the camera</li>
                <li>Use a plain background for better contrast</li>
              </ul>
            </div>

            {/* Updated debug section */}
            <div className="p-4 bg-muted rounded-lg mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Debug Information</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    // Test backend connection directly
                    try {
                      const response = await fetch('http://localhost:8000/api/sign-to-text', {
                        method: 'GET',
                        cache: 'no-store'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        console.log("Backend connection test:", data);
                        alert(`Backend connection test: ${JSON.stringify(data)}`);
                      } else {
                        alert(`Backend error: ${response.status} ${response.statusText}`);
                      }
                    } catch (err) {
                      alert(`Error connecting to backend: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }}
                >
                  Test Connection
                </Button>
              </div>
              <div className="mt-2 text-xs font-mono bg-slate-800 text-slate-200 p-2 rounded-lg overflow-auto max-h-32">
                <div>• Backend Connected: {backendConnected ? "✅" : "❌"}</div>
                <div>• Webcam Active: {isWebcamOn ? "✅" : "❌"}</div>
                <div>• Processing: {isProcessing ? "✅" : "❌"}</div>
                <div>• Hand Detected: {!noHandDetected ? "✅" : "❌"}</div>
                <div>• Current Prediction: {currentPrediction}</div>
                <div>• Confidence: {confidencePercent}%</div>
                <div>• Letter Stability: {letterStableCount}/{LETTER_STABILITY_THRESHOLD}</div>
                <div>• Cooldown: {letterCooldown}/{LETTER_COOLDOWN_THRESHOLD}</div>
                <div>• Last Letter: {lastLetter}</div>
                <div>• Last Added: {lastAddedLetter || "None"}</div>
                <div>• Debug Images: {debugImage ? "✅" : "❌"} / {handRoiImage ? "✅" : "❌"}</div>
              </div>
              
              {/* Add connection test buttons */}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Create a simple test canvas with a mock hand shape
                      const testCanvas = document.createElement('canvas');
                      testCanvas.width = 300;
                      testCanvas.height = 200;
                      const ctx = testCanvas.getContext('2d');
                      
                      if (ctx) {
                        // Draw a black background
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);
                        
                        // Draw text
                        ctx.fillStyle = 'white';
                        ctx.font = '20px Arial';
                        ctx.fillText('Test Hand Shape', 70, 30);
                        
                        // Draw a simple hand shape
                        ctx.fillStyle = '#ffdbac'; // Skin color
                        ctx.beginPath();
                        ctx.moveTo(150, 180);
                        ctx.lineTo(120, 100);
                        ctx.lineTo(150, 90);
                        ctx.lineTo(180, 100);
                        ctx.lineTo(210, 110);
                        ctx.lineTo(150, 180);
                        ctx.fill();
                        
                        // Draw fingers
                        ctx.beginPath();
                        ctx.moveTo(120, 100);
                        ctx.lineTo(100, 60);
                        ctx.lineTo(110, 55);
                        ctx.lineTo(130, 95);
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.moveTo(150, 90);
                        ctx.lineTo(145, 40);
                        ctx.lineTo(155, 35);
                        ctx.lineTo(160, 85);
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.moveTo(180, 100);
                        ctx.lineTo(190, 50);
                        ctx.lineTo(200, 45);
                        ctx.lineTo(190, 95);
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.moveTo(210, 110);
                        ctx.lineTo(230, 70);
                        ctx.lineTo(240, 65);
                        ctx.lineTo(220, 105);
                        ctx.fill();
                      }
                      
                      alert("Running client-side sign recognition test...");
                      
                      // Convert test canvas to blob
                      const blob = await new Promise<Blob>((resolve, reject) => {
                        testCanvas.toBlob(blob => {
                          if (blob) resolve(blob);
                          else reject(new Error("Failed to convert canvas to blob"));
                        }, 'image/jpeg', 0.85);
                      });
                      
                      // Create form data
                      const formData = new FormData();
                      formData.append('file', new File([blob], 'test.jpg', { type: 'image/jpeg' }));
                      formData.append('language', selectedLanguage);
                      
                      // Send to API
                      const response = await fetch('http://localhost:8000/api/sign-to-text/predict', {
                        method: 'POST',
                        body: formData
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`Test result: ${JSON.stringify(data)}`);
                      } else {
                        alert(`Test failed with status: ${response.status}`);
                      }
                    } catch (error) {
                      console.error("Test failed:", error);
                      alert(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
                    }
                  }}
                >
                  Test Recognition
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Setup Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6"
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Backend Setup Instructions</h2>
            <div className="space-y-4">
              <p>
                This feature requires a running Python backend server with ML models for sign language detection.
                Follow these steps to set up and run the server:
              </p>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                <h3 className="font-bold mb-2">Requirements:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Python 3.8+ installed</li>
                  <li>FastAPI (pip install fastapi)</li>
                  <li>Uvicorn (pip install uvicorn)</li>
                  <li>OpenCV (pip install opencv-python)</li>
                  <li>PyTorch (pip install torch)</li>
                  <li>Transformers (pip install transformers)</li>
                  <li>Mediapipe (pip install mediapipe)</li>
                </ul>
              </div>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                <h3 className="font-bold mb-2">Start the server:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open a terminal or command prompt</li>
                  <li>Navigate to the project's <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">server</code> directory</li>
                  <li>Run: <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">uvicorn main:app --reload --port 8000</code></li>
                  <li>The server will start and listen on port 8000</li>
                  <li>Leave this terminal window open while using the application</li>
                </ol>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-400 mb-2">Note:</h3>
                <p>
                  The first time you start the server, it will download the sign language detection model, 
                  which might take a few minutes depending on your internet connection.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}