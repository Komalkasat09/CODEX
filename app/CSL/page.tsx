"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Define types
interface SavedSentence {
  text: string;
  id: number;
}

export default function SignLanguageDetection() {
  // State variables
  const [activeTab, setActiveTab] = useState<"detection" | "training">("detection");
  const [connectionStatus, setConnectionStatus] = useState<"pending" | "connected" | "error">("pending");
  const [statusMessage, setStatusMessage] = useState("Connecting to backend...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState("?");
  const [confidence, setConfidence] = useState(0);
  const [predictionType, setPredictionType] = useState("Letter");
  const [sentence, setSentence] = useState("");
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);
  const [handDetected, setHandDetected] = useState(false);
  const [stabilityState, setStabilityState] = useState<"none" | "stable" | "cooldown">("none");
  const [stabilityCount, setStabilityCount] = useState(0);
  const [wordName, setWordName] = useState("");
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [debugImageUrl, setDebugImageUrl] = useState("");
  const [handRoiImageUrl, setHandRoiImageUrl] = useState("");
  const [cameraStatus, setCameraStatus] = useState<"pending" | "granted" | "denied" | "error">("pending");
  const [cameraErrorMessage, setCameraErrorMessage] = useState("");
  const [wordsLoading, setWordsLoading] = useState(false);
  const [cameraPopup, setCameraPopup] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const trainingVideoRef = useRef<HTMLVideoElement>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constants
  const BACKEND_URL = 'http://localhost:8000';
  const FRAME_INTERVAL = 100; // 10 fps
  
  // Processing state
  const letterStabilityThreshold = 3;
  const letterCooldownThreshold = 5;
  const stabilityInfo = useRef({
    lastPrediction: "None",
    letterStableCount: 0,
    letterCooldown: 0
  });

  // Update button styling to ensure text visibility on white background
  const buttonClasses = "bg-orange-500 hover:bg-orange-600 text-black font-bold";
  const captureButtonClasses = "bg-orange-500 hover:bg-orange-600 text-black font-bold px-6 py-3 text-lg";

  // Update camera container styling for better visibility
  const cameraContainerClass = "relative mb-5 w-[400px] h-[300px] border-4 border-orange-500 rounded-lg overflow-hidden bg-white";

  // Adjust status message styling
  const getStatusClass = (status: "connected" | "error" | "pending") => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-800";
      case "error": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
    }
  };

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      setConnectionStatus("pending");
      setStatusMessage("Connecting to backend...");
      
      const response = await fetch(`${BACKEND_URL}/`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if CSL endpoints are available, focusing on csl-predict
        const cslEndpoints = data.endpoints?.csl || {};
        if (cslEndpoints.predict || '/csl-predict' in data.endpoints) {
          setConnectionStatus("connected");
          setStatusMessage("Connected to backend ✓");
          return true;
        } else {
          throw new Error("Backend is available but CSL endpoints are not configured");
        }
      } else {
        throw new Error(`Backend returned status: ${response.status}`);
      }
    } catch (error) {
      console.error("Backend connection error:", error);
      setConnectionStatus("error");
      setStatusMessage(`Backend connection error. Make sure the FastAPI server is running on ${BACKEND_URL}`);
      return false;
    }
  };

  // Initialize webcam
  const initCamera = async () => {
    try {
      setCameraStatus("pending");
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in your browser");
      }

      // Initialize based on active tab
      if (activeTab === "detection") {
        await initCameraForElement(videoRef);
      } else {
        await initCameraForElement(trainingVideoRef);
      }
      
      console.log("Camera initialized successfully");
      setCameraStatus("granted");
      return true;
    } catch (err) {
      console.error("Error accessing camera:", err);
      
      // Handle specific error types
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraStatus("denied");
          setCameraErrorMessage("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraStatus("error");
          setCameraErrorMessage("No camera detected on your device.");
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraStatus("error");
          setCameraErrorMessage("Camera is already in use by another application.");
        } else {
          setCameraStatus("error");
          setCameraErrorMessage(`Camera error: ${err.message}`);
        }
      } else {
        setCameraStatus("error");
        setCameraErrorMessage(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      return false;
    }
  };

  // Add helper function to initialize camera for a specific video element
  const initCameraForElement = async (videoElementRef: React.RefObject<HTMLVideoElement>) => {
    if (!videoElementRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      } 
    });
    
    videoElementRef.current.srcObject = stream;
  };

  // Function to request camera access again
  const requestCameraAccess = async () => {
    const success = await initCamera();
    if (success) {
      startProcessingFrames();
    }
  };

  // Process video frame
  const processFrame = async () => {
    if (!videoRef.current || isProcessing || connectionStatus !== "connected") return;
    
    try {
      setIsProcessing(true);
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      // Draw the current video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else throw new Error("Failed to create blob from canvas");
        }, 'image/jpeg');
      });
      
      // Create form data with the frame
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      
      // Send to backend - use the CSL-specific endpoint
      const response = await fetch(`${BACKEND_URL}/csl-predict`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.prediction) {
        setCurrentPrediction(result.prediction);
        setConfidence(result.confidence * 100);
        setPredictionType(result.prediction_type || "Letter");
        setHandDetected(result.has_hand || false);
        
        // Handle debug images if available
        if (result.debug_image) {
          setDebugImageUrl(`data:image/jpeg;base64,${result.debug_image}`);
        }
        
        if (result.hand_roi) {
          setHandRoiImageUrl(`data:image/jpeg;base64,${result.hand_roi}`);
        }
        
        // Handle prediction stability
        updateStability(result.prediction);
      }
    } catch (err) {
      console.error("Error processing frame:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update stability of predictions
  const updateStability = (prediction: string) => {
    // Skip if "None" or empty prediction
    if (prediction === "None" || !prediction) {
      setStabilityState("none");
      stabilityInfo.current.letterStableCount = 0;
      return;
    }
    
    // If in cooldown, decrement counter
    if (stabilityInfo.current.letterCooldown > 0) {
      stabilityInfo.current.letterCooldown--;
      setStabilityState("cooldown");
      return;
    }
    
    // Check if prediction is stable
    if (prediction === stabilityInfo.current.lastPrediction) {
      stabilityInfo.current.letterStableCount++;
      
      if (stabilityInfo.current.letterStableCount >= letterStabilityThreshold) {
        // Prediction is stable
        setStabilityState("stable");
        setStabilityCount(stabilityInfo.current.letterStableCount);
      }
    } else {
      // Reset stability counter for new prediction
      stabilityInfo.current.letterStableCount = 1;
      setStabilityState("none");
    }
    
    stabilityInfo.current.lastPrediction = prediction;
  };
  
  // Load available words
  const loadAvailableWords = async () => {
    try {
      setWordsLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/words`);
      if (response.ok) {
        const data = await response.json();
        
        // Ensure that the data is an array or extract the words array from the response
        if (Array.isArray(data)) {
          setAvailableWords(data);
        } else if (data && typeof data === 'object') {
          // Check if the response has a words property (matching the FastAPI endpoint)
          if (Array.isArray(data.words)) {
            setAvailableWords(data.words);
          } else {
            // If it's another object format, try to convert to array
            const wordsList = Object.values(data).filter(value => typeof value === 'string');
            setAvailableWords(wordsList as string[]);
          }
        } else {
          // Fallback to empty array if response is invalid
          console.error("Invalid words data format:", data);
          setAvailableWords([]);
        }
      }
    } catch (error) {
      console.error("Error loading words:", error);
      setAvailableWords([]);
    } finally {
      setWordsLoading(false);
    }
  };
  
  // Sentence manipulation functions
  const addCurrentPrediction = () => {
    if (currentPrediction && currentPrediction !== "None" && currentPrediction !== "?") {
      setSentence(prev => prev + currentPrediction);
      stabilityInfo.current.letterCooldown = letterCooldownThreshold;
    }
  };
  
  const addSpace = () => {
    setSentence(prev => prev + " ");
  };
  
  const backspace = () => {
    setSentence(prev => prev.slice(0, -1));
  };
  
  const clearSentence = () => {
    setSentence("");
  };
  
  const saveSentence = () => {
    if (sentence.trim()) {
      setSavedSentences(prev => [...prev, { text: sentence, id: Date.now() }]);
      clearSentence();
    }
  };
  
  // Training functions
  const captureWord = async () => {
    if (!wordName.trim() || !trainingVideoRef.current) {
      alert("Please enter a word name");
      return;
    }
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = trainingVideoRef.current.videoWidth;
      canvas.height = trainingVideoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      ctx.drawImage(trainingVideoRef.current, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else throw new Error("Failed to create blob from canvas");
        }, 'image/jpeg');
      });
      
      const formData = new FormData();
      formData.append('file', blob, 'word_frame.jpg');
      formData.append('word', wordName);
      
      // Use the /add_word endpoint for CSL
      const response = await fetch(`${BACKEND_URL}/add_word`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`Word "${wordName}" added successfully!`);
          setWordName("");
          loadAvailableWords();
        } else {
          throw new Error(result.message || "Failed to add word");
        }
      } else {
        const error = await response.text();
        throw new Error(error || "Failed to add word");
      }
    } catch (error) {
      console.error("Error capturing word:", error);
      alert(`Error capturing word: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyPress = (e: KeyboardEvent) => {
    // Only process if not in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    switch (e.key.toLowerCase()) {
      case 'a':
        addCurrentPrediction();
        break;
      case ' ':
        e.preventDefault(); // Prevent page scroll
        addSpace();
        break;
      case 'backspace':
        backspace();
        break;
      case 'c':
        clearSentence();
        break;
      case 's':
        saveSentence();
        break;
      case 't':
        setActiveTab(prev => prev === "detection" ? "training" : "detection");
        break;
    }
  };
  
  // Start processing frames
  const startProcessingFrames = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }
    
    processingIntervalRef.current = setInterval(processFrame, FRAME_INTERVAL);
  };
  
  // Stop processing frames
  const stopProcessingFrames = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  };
  
  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      const connected = await checkBackendConnection();
      if (connected) {
        const cameraInitialized = await initCamera();
        if (cameraInitialized) {
          startProcessingFrames();
        }
        loadAvailableWords();
      }
    };
    
    init();
    
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup on unmount
    return () => {
      stopProcessingFrames();
      window.removeEventListener('keydown', handleKeyPress);
      
      // Stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Add camera initialization for detection tab
  useEffect(() => {
    if (activeTab === "detection" && cameraStatus === "granted" && videoRef.current) {
      initCameraForElement(videoRef);
    }
  }, [activeTab, cameraStatus]);

  // Add camera initialization for training tab
  useEffect(() => {
    if (activeTab === "training" && cameraStatus === "granted" && trainingVideoRef.current) {
      initCameraForElement(trainingVideoRef);
    }
  }, [activeTab, cameraStatus]);
  
  return (
    <div className="max-w-[1000px] mx-auto p-5 text-center">
      <h1 className="text-3xl font-bold mb-5 text-black">Sign Language Detection with Word Recognition</h1>
      
      <div 
        className={`p-3 rounded-md mb-5 font-bold ${getStatusClass(connectionStatus)}`}
      >
        {statusMessage}
      </div>
      
      {cameraStatus === "denied" || cameraStatus === "error" ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-5">
          <h3 className="font-bold mb-2">Camera Access Issue</h3>
          <p className="mb-3">{cameraErrorMessage}</p>
          <Button 
            onClick={requestCameraAccess}
            variant="default"
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Try Again
          </Button>
        </div>
      ) : null}
      
      <div className="flex border-b border-gray-200 mb-5">
        <button 
          className={`py-2.5 px-5 cursor-pointer bg-gray-50 border border-gray-200 border-b-0 rounded-t-md mr-1 text-black ${
            activeTab === "detection" ? "bg-white border-b-white font-bold" : ""
          }`}
          onClick={() => setActiveTab("detection")}
        >
          Sign Detection
        </button>
        <button 
          className={`py-2.5 px-5 cursor-pointer bg-gray-50 border border-gray-200 border-b-0 rounded-t-md mr-1 text-black ${
            activeTab === "training" ? "bg-white border-b-white font-bold" : ""
          }`}
          onClick={() => setActiveTab("training")}
        >
          Word Training
        </button>
      </div>
      
      {activeTab === "detection" && (
        <div className="flex flex-col items-center">
          {/* Video Container */}
          <div className={cameraContainerClass} style={{ backgroundColor: 'black' }}>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className="absolute inset-0 w-full h-full object-cover z-10"
            ></video>
            {isProcessing && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/80 text-white p-1.5 rounded text-sm z-20">
                Processing...
              </div>
            )}
          </div>
          
          {/* Results Container */}
          <div className="flex justify-between w-full mb-5 gap-5">
            <Card className="w-[45%] p-4">
              <h3 className="text-lg font-semibold mb-2">Current Detection</h3>
              <div className="text-5xl font-bold text-green-500">{currentPrediction}</div>
              
              <div className="h-5 bg-gray-100 rounded mt-2.5 overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${confidence}%` }}
                ></div>
              </div>
              
              <p className="mt-1">Confidence: {Math.round(confidence)}%</p>
              <p>Type: {predictionType}</p>
              
              <div className="flex items-center mt-2.5 gap-2.5">
                <div 
                  className={`h-[30px] w-[30px] rounded-full ${
                    stabilityState === "stable" ? "bg-green-500" :
                    stabilityState === "cooldown" ? "bg-blue-500" :
                    "bg-gray-500"
                  }`}
                ></div>
                <span>
                  {stabilityState === "stable" ? "Sign stable" :
                   stabilityState === "cooldown" ? "Cooldown" :
                   "No sign detected"}
                </span>
              </div>
            </Card>
            
            <Card className="w-[45%] p-4">
              <h3 className="text-lg font-semibold mb-2">Hand Detection</h3>
              <div className="flex flex-col items-center">
                {!handDetected && <p>No hand detected</p>}
                
                {debugImageUrl && (
                  <img 
                    src={debugImageUrl} 
                    alt="Hand detection debug" 
                    className="max-w-full border border-gray-200 rounded-lg mt-2.5"
                  />
                )}
                
                {handRoiImageUrl && (
                  <img 
                    src={handRoiImageUrl} 
                    alt="Hand ROI" 
                    className="max-w-full border border-gray-200 rounded-lg mt-2.5"
                  />
                )}
              </div>
            </Card>
          </div>
          
          {/* Sentence Container */}
          <Card className="w-full p-4 mb-5">
            <h3 className="text-lg font-semibold mb-2">Current Sentence</h3>
            <p>{sentence || "[Empty]"}</p>
          </Card>
          
          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-5">
            <Button 
              onClick={addCurrentPrediction}
              variant="default"
              className={buttonClasses}
            >
              Add Current
            </Button>
            <Button 
              onClick={addSpace}
              variant="default"
              className={buttonClasses}
            >
              Add Space
            </Button>
            <Button 
              onClick={backspace}
              variant="default"
              className={buttonClasses}
            >
              Backspace
            </Button>
            <Button 
              onClick={clearSentence}
              variant="default"
              className={buttonClasses}
            >
              Clear
            </Button>
            <Button 
              onClick={saveSentence}
              variant="default"
              className={buttonClasses}
            >
              Save Sentence
            </Button>
          </div>
          
          {/* Saved Sentences */}
          <Card className="w-full p-4 mb-5">
            <h3 className="text-lg font-semibold mb-2">Saved Sentences</h3>
            <ul className="text-left list-disc pl-5">
              {savedSentences.length === 0 ? (
                <li>[No saved sentences]</li>
              ) : (
                savedSentences.map((s) => (
                  <li key={s.id}>{s.text}</li>
                ))
              )}
            </ul>
          </Card>
          
          {/* Keyboard Shortcuts */}
          <Card className="w-full p-4 mt-5 text-left">
            <h3 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center">
                <span className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono mr-2.5">A</span>
                Add current letter/word
              </div>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono mr-2.5">Space</span>
                Add space
              </div>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono mr-2.5">Backspace</span>
                Delete last character
              </div>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono mr-2.5">C</span>
                Clear sentence
              </div>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono mr-2.5">S</span>
                Save sentence
              </div>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono mr-2.5">T</span>
                Switch to training tab
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {activeTab === "training" && (
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2 text-black">Add New Words to Recognition Database</h2>
          <p className="mb-5 text-black">Capture hand signs for complete words to improve recognition.</p>
          
          {/* Camera container with popup toggle */}
          <div className={`${cameraContainerClass} ${cameraPopup ? "fixed inset-0 w-full h-full max-w-full max-h-full z-50 rounded-none" : ""}`} style={{ backgroundColor: 'black' }}>
            <video 
              ref={trainingVideoRef}
              autoPlay 
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover z-10 ${cameraPopup ? "object-contain bg-black" : ""}`}
            ></video>
            
            {cameraStatus !== "granted" && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-500 text-white z-10">
                <p>Camera not available</p>
              </div>
            )}
            
            {/* Camera popup/popdown button */}
            <button 
              onClick={() => setCameraPopup(prev => !prev)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full z-20"
              title={cameraPopup ? "Exit fullscreen" : "Fullscreen camera"}
            >
              {cameraPopup ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              )}
            </button>
          </div>
          
          {/* Controls - Only show when not in popup mode */}
          {!cameraPopup && (
            <>
              <div className="w-full max-w-[400px] mb-4 mt-4">
                <label className="block mb-1 text-left text-black">Word Name:</label>
                <input
                  type="text"
                  placeholder="Enter word name"
                  value={wordName}
                  onChange={(e) => setWordName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-400 rounded bg-white text-black text-lg"
                />
              </div>
              
              <Button 
                onClick={captureWord}
                variant="default"
                className={captureButtonClasses}
              >
                Capture Current Word
              </Button>
              
              <h3 className="text-lg font-semibold mb-2 mt-5 text-black">Available Words</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 w-full">
                {wordsLoading ? (
                  <div className="p-2.5 bg-gray-100 rounded text-center">Loading...</div>
                ) : !Array.isArray(availableWords) || availableWords.length === 0 ? (
                  <div className="p-2.5 bg-gray-100 rounded text-center">No words available</div>
                ) : (
                  availableWords.map((word) => (
                    <div key={word} className="p-2.5 bg-gray-100 rounded text-center hover:bg-gray-200 cursor-pointer">
                      {word}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          
          {/* Show capture controls even in popup mode but floating at the bottom */}
          {cameraPopup && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-4">
              <input
                type="text"
                placeholder="Enter word name"
                value={wordName}
                onChange={(e) => setWordName(e.target.value)}
                className="px-4 py-3 border-2 border-gray-400 rounded bg-white text-black text-lg"
              />
              <Button 
                onClick={() => {
                  captureWord();
                  setCameraPopup(false);
                }}
                variant="default"
                className={captureButtonClasses}
              >
                Capture Word
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
