// "use client"

// import { useState, useRef, useEffect, useCallback } from 'react'
// import { motion } from "framer-motion"
// import { Card } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Phone, Video, Mic, MessageSquare, Settings, Users, Camera, CameraOff, Send, VideoOff, Trash, AlertTriangle } from "lucide-react"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { toast } from "sonner"
// import { Progress } from "@/components/ui/progress"
// import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// import { Loader2 } from "lucide-react"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { API_CONFIG, getApiUrl, getWsUrl } from '@/app/config'

// // Get API URLs from config
// const API_BASE_URL = API_CONFIG.BASE_URL;

// // Use simulation for calls during development
// const SIMULATE_CALLS = API_CONFIG.FEATURES.SIMULATE_CALLS;

// // Default phone number for calls 
// const DEFAULT_PHONE_NUMBER = "+919920611134";

// // WebSocket URL based on the API URL (unused for Twilio call features)
// // const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

// // Add this component before the CallPage component
// const TranscriptionDisplay = ({ 
//   sentence, 
//   currentDetection, 
//   confidence,
//   onSendTranscription 
// }: { 
//   sentence: string; 
//   currentDetection: string; 
//   confidence: number;
//   onSendTranscription: () => void;
// }) => {
//   return (
//     <div className="bg-gray-800 rounded-lg p-4 w-full">
//       <div className="mb-4">
//         <div className="flex justify-between items-center mb-2">
//           <h3 className="text-white font-medium">Current Transcription</h3>
//           <Button
//             onClick={onSendTranscription}
//             disabled={!sentence || sentence.trim() === ""}
//             size="sm"
//             className="bg-blue-600 hover:bg-blue-700"
//           >
//             Send <Send className="ml-2 h-4 w-4" />
//           </Button>
//         </div>
//         <div className="bg-gray-900 rounded p-3 min-h-[100px] text-white">
//           {sentence || <span className="text-gray-500 italic">No transcription yet...</span>}
//           {currentDetection && currentDetection !== "None" && (
//             <span className="text-blue-400 animate-pulse ml-1">
//               {currentDetection.toLowerCase()} ({Math.round(confidence)}%)
//             </span>
//           )}
//         </div>
//       </div>
      
//       <div>
//         <h3 className="text-white font-medium mb-2">Detection Info</h3>
//         <div className="grid grid-cols-2 gap-2">
//           <div className="bg-gray-900 rounded p-2">
//             <span className="text-gray-400 text-xs">Current:</span>
//             <div className="text-white font-mono text-lg">
//               {currentDetection || "None"}
//             </div>
//           </div>
//           <div className="bg-gray-900 rounded p-2">
//             <span className="text-gray-400 text-xs">Confidence:</span>
//             <div className="flex items-center">
//               <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
//                 <div 
//                   className={`h-full ${confidence > 75 ? 'bg-green-500' : confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
//                   style={{ width: `${confidence}%` }}
//                 />
//               </div>
//               <span className="text-white ml-2">{Math.round(confidence)}%</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Emergency WhatsApp Component
// const EmergencyWhatsApp = () => {
//   const [toNumber, setToNumber] = useState('');
//   const [message, setMessage] = useState('');
//   const [isSending, setIsSending] = useState(false);
//   const [isDialogOpen, setIsDialogOpen] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!toNumber) {
//       toast.error("Please enter a phone number");
//       return;
//     }
    
//     if (!message) {
//       toast.error("Please enter an emergency message");
//       return;
//     }
    
//     // Validate phone number format
//     if (!toNumber.startsWith('+')) {
//       toast.error("Phone number must start with + and include country code (e.g., +1234567890)");
//       return;
//     }
    
//     setIsSending(true);
    
//     try {
//       const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SEND_WHATSAPP_EMERGENCY), {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           to_number: toNumber,
//           message: message
//         }),
//       });
      
//       const data = await response.json();
      
//       if (response.ok) {
//         toast.success("Emergency message sent successfully!");
//         setIsDialogOpen(false);
//       } else {
//         toast.error(`Failed to send message: ${data.message}`);
//       }
//     } catch (error) {
//       console.error("Error sending emergency message:", error);
//       toast.error("Failed to send emergency message. Please try again.");
//     } finally {
//       setIsSending(false);
//     }
//   };

//   return (
//     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//       <DialogTrigger asChild>
//         <Button 
//           variant="destructive" 
//           className="flex items-center gap-2" 
//           title="Send Emergency WhatsApp"
//         >
//           <AlertTriangle className="h-4 w-4" />
//           Emergency WhatsApp
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[425px]">
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2 text-red-500">
//             <AlertTriangle className="h-5 w-5" />
//             Send Emergency WhatsApp
//           </DialogTitle>
//           <DialogDescription>
//             Send an urgent WhatsApp message to emergency contacts.
//           </DialogDescription>
//         </DialogHeader>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="space-y-2">
//             <label htmlFor="phone" className="text-sm font-medium">
//               Phone Number (with country code)
//             </label>
//             <Input
//               id="phone"
//               placeholder="+1234567890"
//               value={toNumber}
//               onChange={(e) => setToNumber(e.target.value)}
//               required
//             />
//             <p className="text-xs text-muted-foreground">
//               Must include country code (e.g., +1 for US)
//             </p>
//           </div>
          
//           <div className="space-y-2">
//             <label htmlFor="message" className="text-sm font-medium">
//               Emergency Message
//             </label>
//             <Textarea
//               id="message"
//               placeholder="I need help immediately at [location]"
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               required
//               className="min-h-[100px]"
//             />
//           </div>
          
//           <DialogFooter>
//             <Button 
//               type="submit" 
//               variant="destructive"
//               disabled={isSending}
//               className="w-full"
//             >
//               {isSending ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Sending...
//                 </>
//               ) : (
//                 <>
//                   <AlertTriangle className="mr-2 h-4 w-4" />
//                   Send Emergency Message
//                 </>
//               )}
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default function CallPage() {
//   // Call state
//   const [phoneNumber, setPhoneNumber] = useState('')
//   const [message, setMessage] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
//   const [activeCallSid, setActiveCallSid] = useState<string | null>(null)
//   const [callStatus, setCallStatus] = useState<string | null>(null)

//   // WebSocket connection
//   const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
//   const [wsConnected, setWsConnected] = useState(false)
//   const [modelLoaded, setModelLoaded] = useState(false)
//   const [modelLoading, setModelLoading] = useState(false)
//   const [modelDevice, setModelDevice] = useState<string>("none")

//   // Sign language detection state
//   const [isWebcamOn, setIsWebcamOn] = useState(false)
//   const [currentDetection, setCurrentDetection] = useState<string>("?")
//   const [confidencePercent, setConfidencePercent] = useState(0)
//   const [isProcessing, setIsProcessing] = useState(false)
//   const [sentence, setSentence] = useState("")
//   const [transcript, setTranscript] = useState<string[]>([])
//   const [isTranscribing, setIsTranscribing] = useState(false)
//   const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
//   // Webcam references
//   const videoRef = useRef<HTMLVideoElement | null>(null)
//   const frameIntervalRef = useRef<number | null>(null)
  
//   // Constants for sign language detection
//   const FRAME_INTERVAL = 200 // 5 fps
//   const LETTER_STABILITY_THRESHOLD = 3
  
//   // Sign language detection state
//   const [letterStableCount, setLetterStableCount] = useState(0)
//   const [lastLetter, setLastLetter] = useState("None")
  
//   // Add direct text input functionality
//   const [isEditingText, setIsEditingText] = useState(false);
//   const sentenceInputRef = useRef<HTMLTextAreaElement>(null);
  
//   // Add a new state variable for quick messages
//   const [quickMessage, setQuickMessage] = useState('');
//   const [messageHistory, setMessageHistory] = useState<{text: string, timestamp: string}[]>([]);
  
//   // Poll for call status
//   const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
//   const [isSimulatedCall, setIsSimulatedCall] = useState(false);
  
//   // Initialize WebSocket connection when call is active
//   useEffect(() => {
//     // Skip WebSocket connection when using phone calls via Twilio
//     if (activeCallSid && !wsConnection && !SIMULATE_CALLS) {
//       // Construct WebSocket URL directly
//       const wsUrl = (API_BASE_URL.startsWith('https') ? 'wss://' : 'ws://') + 
//                      API_BASE_URL.replace('https://', '').replace('http://', '') + 
//                      `/ws/call/${activeCallSid}`;
//       console.log(`Connecting to WebSocket at ${wsUrl}`);
      
//       let reconnectAttempts = 0;
//       const MAX_RECONNECT_ATTEMPTS = 5;
//       const RECONNECT_DELAY = 3000; // 3 seconds
      
//       const connectWebSocket = () => {
//         try {
//           const ws = new WebSocket(wsUrl);
          
//           ws.onopen = () => {
//             console.log("WebSocket connection established");
//             setWsConnected(true);
//             setErrorMessage(null);
//             reconnectAttempts = 0; // Reset reconnect attempts on successful connection
//             toast.success("Connected to call service");
//           };
          
//           ws.onmessage = (event) => {
//             try {
//               const data = JSON.parse(event.data);
//               console.log("WebSocket message received:", data);
              
//               if (data.type === "sign_detection_result") {
//                 handleDetectionResult(data.letter, data.confidence);
//               } else if (data.type === "transcription_status") {
//                 if (data.status === "success") {
//                   toast.success("Message sent to call");
//                 } else {
//                   toast.error(data.message || "Failed to send message");
//                 }
//               } else if (data.type === "error") {
//                 console.error("WebSocket error:", data.message);
//                 setErrorMessage(data.message || "An error occurred");
//                 toast.error(data.message || "WebSocket error");
                
//                 // If the error provides a letter, use it
//                 if (data.letter) {
//                   handleDetectionResult(data.letter, data.confidence || 0);
//                 }
//               } else if (data.type === "model_status") {
//                 setModelLoaded(data.loaded);
//                 setModelDevice(data.device);
//                 console.log(`Model loaded: ${data.loaded}, Device: ${data.device}`);
                
//                 if (!data.loaded) {
//                   setErrorMessage("Sign language model failed to load on server");
//                   toast.error("Sign language model not available");
//                 } else {
//                   toast.success(`Model loaded on ${data.device}`);
//                 }
//               } else if (data.type === "connection_status") {
//                 console.log("Connection status:", data.status);
//                 if (data.status === "connected") {
//                   setErrorMessage(null);
//                 }
//               }
//             } catch (error) {
//               console.error("Error parsing WebSocket message:", error);
//             }
//           };
          
//           ws.onclose = (event) => {
//             console.log("WebSocket connection closed:", event.code, event.reason);
//             setWsConnected(false);
//             setWsConnection(null);
            
//             if (event.code !== 1000 && activeCallSid) {
//               setErrorMessage(`Connection closed: ${event.reason || "Unknown reason"}`);
              
//               // Only attempt to reconnect if we haven't exceeded max attempts
//               if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
//                 reconnectAttempts++;
//                 console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                
//                 toast.info(`Reconnecting to sign language service (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                
//                 // Try to reconnect after a delay
//                 setTimeout(connectWebSocket, RECONNECT_DELAY);
//               } else {
//                 toast.error("Could not reconnect to sign language service");
//                 setErrorMessage("Connection lost: Maximum reconnection attempts reached");
//               }
//             }
//           };
          
//           ws.onerror = (error) => {
//             console.error("WebSocket error:", error);
//             // Only show errors for non-Twilio calls
//             setErrorMessage("Connection error: Unable to connect to sign language service");
//             toast.error("Connection error");
//             setWsConnected(false);
//           };
          
//           setWsConnection(ws);
          
//           return ws;
//         } catch (error) {
//           console.error("Error creating WebSocket:", error);
//           return null;
//         }
//       };
      
//       // Initial connection
//       const ws = connectWebSocket();
      
//       // Cleanup function
//       return () => {
//         console.log("Cleaning up WebSocket connection");
//         if (ws) {
//           ws.close();
//         }
//       };
//     }
//   }, [activeCallSid]);
  
//   // Handle sign language detection results
//   const handleDetectionResult = useCallback((letter: string, confidence: number) => {
//     setCurrentDetection(letter);
//     setConfidencePercent(confidence * 100);
    
//     // Ignore low confidence detections to reduce noise
//     if (confidence < 0.65) {
//       console.log(`Ignoring low confidence detection: ${letter} (${confidence.toFixed(2)})`);
//       return;
//     }
    
//     // Convert detection to lowercase for consistent handling
//     const normalizedLetter = letter.toLowerCase();
    
//     // Update the transcription history with timestamp
//     setTranscript(prev => [
//       ...prev,
//       normalizedLetter,
//     ]);
    
//     // Special handling for space and delete
//     if (normalizedLetter === "space") {
//       // Add space if the current transcription doesn't already end with one
//       if (!sentence.endsWith(" ")) {
//         setSentence(prev => prev + " ");
//       }
//       return;
//     } 
    
//     if (normalizedLetter === "del") {
//       // Remove the last character from transcription
//       setSentence(prev => prev.slice(0, -1));
//       return;
//     }
    
//     // For consecutive duplicate detections, only add if they are 
//     // separated by more than 3 other detections to avoid stuttering
//     const recentTranscriptions = transcript.slice(-5);
//     const recentLetterCounts = recentTranscriptions
//       .filter(t => t === normalizedLetter)
//       .length;
      
//     if (recentLetterCounts > 2 && sentence.endsWith(normalizedLetter)) {
//       console.log(`Ignoring repeated detection: ${normalizedLetter}`);
//       return;
//     }
    
//     // Add letter to the transcription
//     setSentence(prev => prev + normalizedLetter);
    
//     // Update letter stability for sentence building
//     if (normalizedLetter !== "?" && normalizedLetter !== "None" && normalizedLetter !== "Uncertain" && normalizedLetter !== "Error") {
//       if (normalizedLetter === lastLetter) {
//         setLetterStableCount(prev => prev + 1);
        
//         // Add letter to sentence when stability threshold is reached
//         if (letterStableCount + 1 >= LETTER_STABILITY_THRESHOLD) {
//           // Only add lowercase letter to make text more readable
//           setSentence(prev => prev + normalizedLetter.toLowerCase());
//           setLetterStableCount(0);
          
//           // Add haptic feedback via vibration if supported
//           if (navigator.vibrate) {
//             navigator.vibrate(100);
//           }
          
//           toast.info(`Added letter: ${normalizedLetter.toLowerCase()}`);
//         }
//       } else {
//         setLetterStableCount(0);
//       }
//       setLastLetter(normalizedLetter);
//     }
//   }, [sentence, transcript, lastLetter, letterStableCount]);
  
//   // Toggle webcam
//   const toggleWebcam = async () => {
//     if (isWebcamOn) {
//       // Turn off webcam
//       if (videoRef.current && videoRef.current.srcObject) {
//         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
//         tracks.forEach(track => track.stop());
//         videoRef.current.srcObject = null;
//       }
      
//       // Clear frame processing interval
//       if (frameIntervalRef.current) {
//         clearInterval(frameIntervalRef.current);
//         frameIntervalRef.current = null;
//       }
      
//       setIsWebcamOn(false);
//       setCurrentDetection("?");
//       setConfidencePercent(0);
//       setLetterStableCount(0);
//       setLastLetter("None");
//     } else {
//       try {
//         // Turn on webcam
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             width: { ideal: 640 },
//             height: { ideal: 480 },
//             facingMode: 'user'
//           }
//         });
        
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
          
//           // Wait for video to be ready
//           videoRef.current.onloadedmetadata = () => {
//             console.log("Webcam video loaded and ready");
//             videoRef.current?.play().catch(err => {
//               console.error("Error playing video:", err);
//             });
//           };
//         }
        
//         setIsWebcamOn(true);
        
//         // Start frame processing interval with a slight delay to ensure webcam is ready
//         setTimeout(() => {
//           frameIntervalRef.current = window.setInterval(() => {
//             processFrame();
//           }, FRAME_INTERVAL);
//         }, 1000);
//       } catch (error) {
//         console.error("Error accessing webcam:", error);
//         toast.error("Could not access webcam. Please check permissions.");
//       }
//     }
//   };
  
//   // Process webcam frame for sign language detection
//   const processFrame = useCallback(() => {
//     if (isProcessing || !isWebcamOn || !videoRef.current) {
//       return;
//     }
    
//     // Check if video is actually playing and ready
//     if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
//       console.log("Video not ready yet, skipping frame");
//       return;
//     }
    
//     if (!wsConnected || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
//       console.log("WebSocket not connected, skipping frame");
//       // When using phone calls, provide feedback to user about sign language detection
//       if (SIMULATE_CALLS && activeCallSid) {
//         setCurrentDetection("Not available");
//         setConfidencePercent(0);
//       }
//       return;
//     }
    
//     setIsProcessing(true);
    
//     try {
//       const canvas = document.createElement('canvas');
//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;
//       const ctx = canvas.getContext('2d');
      
//       if (ctx) {
//         // Flip the image horizontally for more intuitive interaction
//         ctx.translate(canvas.width, 0);
//         ctx.scale(-1, 1);
//         ctx.drawImage(videoRef.current, 0, 0);
        
//         // Convert canvas to base64 data URL
//         const dataURL = canvas.toDataURL('image/jpeg', 0.7);
        
//         // Send frame to the server via WebSocket
//         wsConnection.send(JSON.stringify({
//           type: "sign_detection",
//           frame: dataURL
//         }));
//       }
//     } catch (error) {
//       console.error("Error processing frame:", error);
//     } finally {
//       setIsProcessing(false);
//     }
//   }, [isProcessing, isWebcamOn, wsConnected, wsConnection]);
  
//   // Clean up on component unmount
//   useEffect(() => {
//     return () => {
//       // Clean up webcam
//       if (videoRef.current && videoRef.current.srcObject) {
//         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
//         tracks.forEach(track => track.stop());
//       }
      
//       // Clear frame processing interval
//       if (frameIntervalRef.current) {
//         clearInterval(frameIntervalRef.current);
//       }
      
//       // Close WebSocket connection
//       if (wsConnection) {
//         wsConnection.close();
//       }
//     };
//   }, [wsConnection]);
  
//   // Send the current sentence to the call
//   const sendSentence = () => {
//     if (!sentence.trim() || !activeCallSid) {
//       return;
//     }
    
//     sendMessageToCall(sentence.trim());
//     setSentence("");
//   };

//   // Send the quick message to the call
//   const sendQuickMessage = () => {
//     if (!quickMessage.trim() || !activeCallSid) {
//       return;
//     }
    
//     sendMessageToCall(quickMessage.trim());
//     setQuickMessage("");
//   };
  
//   // Handle call initiation
//   const handleCall = async () => {
//     console.log("Make Call button clicked");
    
//     // Check if phoneNumber is provided, otherwise use a default
//     const numberToCall = phoneNumber || '+919920611134';
    
//     if (!message) {
//       toast.error("Please enter a message");
//       return;
//     }

//     try {
//       setIsLoading(true);
      
//       const payload = {
//         phone_number: numberToCall,
//         message: message,
//         simulate: false, // Force real calls
//       };
      
//       console.log("Making call with payload:", payload);
//       console.log("API URL:", `${API_BASE_URL}/api/make-call`);
      
//       toast.info("Note: In Twilio trial mode, you can only call verified numbers", {
//         duration: 5000
//       });
      
//       const response = await fetch(`${API_BASE_URL}/api/make-call`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });
      
//       // Log the raw response
//       console.log("Response status:", response.status);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("Error response:", errorText);
//         throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
//       }

//       const data = await response.json();
//       console.log('Call response:', data);

//       // Handle success or warning status
//       if (data.status === 'call_initiated' || data.status === 'warning') {
//         // If warning, show a toast
//         if (data.status === 'warning') {
//           toast.warning(data.message || "Call initiated with warnings");
//         } else {
//           toast.success("Call initiated successfully!");
//         }
        
//         // Set the call ID from the response if available
//         const callId = data.call_sid || Math.random().toString(36).substring(2, 15);
//         console.log("Setting active call SID:", callId);
        
//         setActiveCallSid(callId);
//         setCallStatus("active");
        
//         // Add initial message to transcript
//         setTranscript([message]);
        
//         // Start polling for call status
//         startCallStatusPolling();
//       } else {
//         throw new Error(data.message || 'Failed to make call');
//       }
//     } catch (error) {
//       console.error('Call error:', error);
      
//       // Check for common Twilio errors in the error message
//       const errorMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
      
//       if (errorMsg.includes("not verified")) {
//         toast.error("Number not verified. In trial mode, you can only call verified numbers.");
//       } else if (errorMsg.includes("invalid phone number")) {
//         toast.error("Invalid phone number format. Must be in E.164 format (+1234567890)");
//       } else if (errorMsg.includes("authentication")) {
//         toast.error("Authentication failed. Check Twilio credentials.");
//       } else {
//         toast.error(error instanceof Error ? error.message : "Failed to make call");
//       }
      
//       setActiveCallSid(null);
//       setCallStatus(null);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Poll for call status
//   const startCallStatusPolling = useCallback(() => {
//     // Clear existing interval if any
//     if (intervalIdRef.current) {
//       clearInterval(intervalIdRef.current);
//       intervalIdRef.current = null;
//     }
    
//     console.log("Starting call status polling");
    
//     // Add the initial message to the message history
//     if (message) {
//       const now = new Date();
//       const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//       setMessageHistory(prev => [...prev, {
//         text: message,
//         timestamp: timestamp
//       }]);
//       console.log("Added initial message to history:", message);
//     }
    
//     // Start polling every 5 seconds
//     intervalIdRef.current = setInterval(async () => {
//       try {
//         console.log("Polling call status...");
//         const response = await fetch(`${API_BASE_URL}/api/call-status`);
//         const data = await response.json();
        
//         console.log('Call status response:', data);
        
//         // For simulation mode, always mark the call as simulated
//         setIsSimulatedCall(true);
        
//         if (data.status === 'active') {
//           // Update call SID if we have it now
//           if (data.call_sid && (!activeCallSid || activeCallSid.length < 20)) {
//             console.log("Updating call SID:", data.call_sid);
//             setActiveCallSid(data.call_sid);
//           }
//           setCallStatus(data.call_status || 'active');
//         } else {
//           // Call is no longer active
//           console.log("Call is no longer active");
//           setCallStatus('inactive');
          
//           // If this was a deliberate end (data.status === 'ended'), show success
//           if (data.status === 'ended') {
//             toast.success('Call ended successfully');
//           } else if (data.status === 'error') {
//             toast.error(data.message || 'Call ended with error');
//           }
          
//           // Stop polling if call is no longer active
//           if (intervalIdRef.current) {
//             clearInterval(intervalIdRef.current);
//             intervalIdRef.current = null;
//           }
//         }
//       } catch (error) {
//         console.error('Error polling call status:', error);
//       }
//     }, 5000);
    
//     // Clean up interval on component unmount
//     return () => {
//       if (intervalIdRef.current) {
//         clearInterval(intervalIdRef.current);
//         intervalIdRef.current = null;
//       }
//     };
//   }, [activeCallSid, message]);
  
//   // Clean up intervals on unmount
//   useEffect(() => {
//     return () => {
//       if (intervalIdRef.current) {
//         clearInterval(intervalIdRef.current);
//         intervalIdRef.current = null;
//       }
//     };
//   }, []);

//   // Send message to the call
//   const sendMessageToCall = (message: string) => {
//     if (!message.trim()) {
//       toast.error("Please enter a message to send");
//       return;
//     }

//     console.log("Sending message to call:", message);
//     setIsTranscribing(true);
    
//     fetch(`${API_BASE_URL}/api/send-message`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ text: message }),
//     })
//       .then(response => {
//         console.log("Send message response status:", response.status);
//         if (!response.ok) {
//           throw new Error(`Error sending message: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => {
//         console.log('Message response:', data);
        
//         if (data.status === 'queued') {
//           // Add to transcript history with timestamp
//           const now = new Date();
//           const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
//           setTranscript(prev => [...prev, message]);
//           setMessageHistory(prev => [...prev, {
//             text: message,
//             timestamp: timestamp
//           }]);
          
//           // Add success feedback
//           toast.success("Message sent to call");
          
//           // Add haptic feedback if supported
//           if (navigator.vibrate) {
//             navigator.vibrate([100, 50, 100]);
//           }
//         } else {
//           throw new Error(data.message || 'Failed to send message');
//         }
//       })
//       .catch(error => {
//         console.error("Error sending message:", error);
//         toast.error(error instanceof Error ? error.message : "Failed to send message");
//       })
//       .finally(() => {
//         setIsTranscribing(false);
//       });
//   };

//   // Add function to end call
//   const endCall = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/end-call`, {
//         method: 'POST',
//       });
      
//       const data = await response.json();
//       console.log('End call response:', data);
      
//       if (data.status === 'ended') {
//         toast.success("Call ended successfully");
        
//         // Reset UI
//         setActiveCallSid(null);
//         setCallStatus(null);
//         setTranscript([]);
//         setMessageHistory([]);
//         setSentence("");
//         setQuickMessage("");
        
//         // Stop status polling
//         if (intervalIdRef.current) {
//           clearInterval(intervalIdRef.current);
//           intervalIdRef.current = null;
//         }
        
//         // Clean up webcam if it's on
//         if (isWebcamOn) {
//           toggleWebcam();
//         }
//       } else {
//         throw new Error(data.message || 'Failed to end call');
//       }
//     } catch (error) {
//       console.error('Error ending call:', error);
//       toast.error(error instanceof Error ? error.message : "Failed to end call");
//     }
//   };

//   // Add a button for adding space to the sentence
//   const addSpace = () => {
//     setSentence(prev => prev + " ");
//     toast.info("Added space");
//   };

//   // Add a button for adding period to the sentence
//   const addPeriod = () => {
//     setSentence(prev => prev + ".");
//     toast.info("Added period");
//   };

//   // Add keyboard key handling
//   const handleKeyboardInput = useCallback((event: KeyboardEvent) => {
//     if (isEditingText || !activeCallSid) return;
    
//     if (event.key === 'Backspace') {
//       // Delete last character
//       setSentence(prev => prev.slice(0, -1));
//     } else if (event.key === ' ') {
//       // Add space
//       addSpace();
//       event.preventDefault();
//     } else if (event.key === '.') {
//       // Add period
//       addPeriod();
//     } else if (event.key === 'Enter') {
//       // Send message
//       if (sentence.trim()) {
//         sendSentence();
//       }
//       event.preventDefault();
//     }
//   }, [sentence, isEditingText, activeCallSid]);
  
//   // Add keyboard event listeners
//   useEffect(() => {
//     window.addEventListener('keydown', handleKeyboardInput);
//     return () => {
//       window.removeEventListener('keydown', handleKeyboardInput);
//     };
//   }, [handleKeyboardInput]);
  
//   // Focus text input when editing mode is enabled
//   useEffect(() => {
//     if (isEditingText && sentenceInputRef.current) {
//       sentenceInputRef.current.focus();
//     }
//   }, [isEditingText]);
  
//   // Add a button for manually editing the text
//   const toggleEditMode = () => {
//     setIsEditingText(!isEditingText);
//   };
  
//   // Add a button for deleting last character
//   const deleteLastChar = () => {
//     setSentence(prev => prev.slice(0, -1));
//   };
  
//   // Handle direct text input change
//   const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     setSentence(e.target.value);
//   };

//   // Function to validate phone number in E.164 format
//   const isValidPhoneNumber = (phone: string): boolean => {
//     // Basic E.164 validation - starts with + followed by digits (min 7, max 15 digits)
//     return /^\+\d{7,15}$/.test(phone);
//   };

//   // Initialize GestureRecognizer
//   useEffect(() => {
//     if (typeof window !== 'undefined' && !modelLoaded) {
//       setModelLoading(true);
//       const initModel = async () => {
//         try {
//           // Model initialization would go here
//           // This could include loading MediaPipe or other gesture recognition libraries
//           // You would typically fetch or load the model from a CDN or local file
          
//           console.log("Sign language model initialized successfully");
//           setModelLoaded(true);
//         } catch (error) {
//           console.error('Error initializing model:', error);
//           setErrorMessage("Failed to initialize sign language model");
//           toast.error("Could not initialize sign language model");
//         } finally {
//           setModelLoading(false);
//         }
//       };
      
//       initModel();
//     }
//   }, [modelLoaded]);

//   // Initialize the component - check API status on mount
//   useEffect(() => {
//     console.log("Call page initialized");
//     console.log("API_BASE_URL:", API_BASE_URL);
//     console.log("SIMULATE_CALLS:", SIMULATE_CALLS);
    
//     // Check API connection
//     fetch(`${API_BASE_URL}/api/sign-to-text`)
//       .then(response => response.json())
//       .then(data => {
//         console.log("API status check:", data);
//         if (data.status === "ok") {
//           console.log("API connection successful");
//         }
//       })
//       .catch(error => {
//         console.error("API connection error:", error);
//         toast.error("Could not connect to API server");
//       });
      
//     return () => {
//       // Clean up all intervals and active calls on unmount
//       if (intervalIdRef.current) {
//         clearInterval(intervalIdRef.current);
//       }
      
//       // Explicitly end any active calls when navigating away
//       if (activeCallSid) {
//         fetch(`${API_BASE_URL}/api/end-call`, { method: 'POST' })
//           .catch(e => console.error("Error ending call on unmount:", e));
//       }
//     };
//   }, []);

//   return (
//     <div className="min-h-screen p-8 pt-24">
//       <div className="max-w-7xl mx-auto">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//           className="space-y-8"
//         >
//           {/* Main Call Interface */}
//           <Card className="p-6">
//             <div className="flex justify-between items-center mb-6">
//               <div>
//                 <h1 className="text-3xl font-bold">Video Call Translation</h1>
//                 <p className="text-muted-foreground">Connect and communicate with real-time sign language translation</p>
//               </div>
//               <div className="flex gap-2">
//                 {callStatus === "active" && (
//                   <Badge variant="outline" className="bg-green-100 text-green-800 px-3 py-1">
//                     Call Active
//                   </Badge>
//                 )}
//                 {isSimulatedCall && (
//                   <Badge variant="outline" className="bg-yellow-100 text-yellow-800 px-3 py-1 ml-2">
//                     Phone Call
//                   </Badge>
//                 )}
//                 {wsConnected && !isSimulatedCall && (
//                   <Badge variant="outline" className="bg-blue-100 text-blue-800 px-3 py-1 ml-2">
//                     Sign Detection Active
//                   </Badge>
//                 )}
//                 <Button variant="outline" className="gap-2">
//                   <Users className="w-4 h-4" />
//                   Join Meeting
//                 </Button>
//               </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//               {/* Call Form */}
//               {!activeCallSid ? (
//                 <Card className="p-4 col-span-1">
//                   <h2 className="text-lg font-semibold mb-4">Make a Call</h2>
//                   <div className="space-y-4">
//                     <div>
//                       <label className="text-sm font-medium">Phone Number</label>
//                       <Input
//                         type="tel"
//                         placeholder="+1234567890"
//                         value={phoneNumber}
//                         onChange={(e) => {
//                           // Only allow digits, plus sign at the beginning, and limit length
//                           const value = e.target.value.replace(/[^\d+]/g, '');
//                           if (value === '' || value === '+' || /^\+?\d{0,15}$/.test(value)) {
//                             setPhoneNumber(value);
//                           }
//                         }}
//                         className={`mt-1 ${!isValidPhoneNumber(phoneNumber) && phoneNumber.length > 0 ? 'border-red-500' : ''}`}
//                       />
//                       <p className="text-xs text-muted-foreground mt-1">
//                         Enter phone number in E.164 format (e.g., +1234567890)
//                         {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
//                           <span className="text-red-500 block mt-1">
//                             Please enter a valid phone number in E.164 format (starts with + followed by country code)
//                           </span>
//                         )}
//                       </p>
//                     </div>
//                     <div>
//                       <label className="text-sm font-medium">Message</label>
//                       <Textarea
//                         placeholder="Enter your message..."
//                         value={message}
//                         onChange={(e) => {
//                           console.log("Message input changed:", e.target.value);
//                           setMessage(e.target.value);
//                         }}
//                         onKeyDown={(e) => {
//                           if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
//                             e.preventDefault();
//                             handleCall();
//                           }
//                         }}
//                         rows={3}
//                         className="mt-1"
//                       />
//                       <p className="text-xs text-muted-foreground mt-1">
//                         {message ? `${message.length} characters` : "Enter a message to start the call"}
//                       </p>
//                     </div>
//                     <Button 
//                       onClick={handleCall} 
//                       disabled={isLoading || !message}
//                       className="w-full"
//                     >
//                       {isLoading ? (
//                         <span className="flex items-center justify-center">
//                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                           Initiating Call...
//                         </span>
//                       ) : (
//                         "Make Call"
//                       )}
//                     </Button>
//                   </div>
//                 </Card>
//               ) : (
//                 <Card className="p-4 col-span-1">
//                   <h2 className="text-lg font-semibold mb-4">Call Management</h2>
//                   <div className="space-y-4">
//                     <div className="flex items-center gap-2">
//                       <Badge variant="outline" className="bg-green-100 text-green-800 px-3 py-1">
//                         Active Call
//                       </Badge>
//                       <span className="text-xs text-muted-foreground">Connected to +{activeCallSid.slice(-10)}</span>
//                     </div>
                    
//                     {/* Replace the existing transcription section with this */}
//                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
//                       <div className="flex flex-col">
//                         <h2 className="text-2xl font-bold mb-4">Sign Language Detection</h2>
//                         {isWebcamOn ? (
//                           <div className="relative">
//                             <video
//                               ref={videoRef}
//                               className="w-full rounded-lg"
//                               autoPlay
//                               playsInline
//                               muted
//                             />
//                             {modelLoaded && (
//                               <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-lg">
//                                 <div className="text-center">
//                                   <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
//                                   <p className="text-white mt-2">Loading model...</p>
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           <div className="bg-gray-800 rounded-lg flex items-center justify-center h-[300px]">
//                             <Button onClick={toggleWebcam}>
//                               <Video className="mr-2 h-4 w-4" /> Enable Webcam
//                             </Button>
//                           </div>
//                         )}
                        
//                         <div className="flex mt-4 space-x-2">
//                           <Button onClick={toggleWebcam} variant="outline" className="flex-1">
//                             {isWebcamOn ? (
//                               <>
//                                 <VideoOff className="mr-2 h-4 w-4" /> Disable
//                               </>
//                             ) : (
//                               <>
//                                 <Video className="mr-2 h-4 w-4" /> Enable
//                               </>
//                             )}
//                           </Button>
                          
//                           <Button 
//                             onClick={() => setSentence("")} 
//                             variant="destructive" 
//                             className="flex-1"
//                           >
//                             <Trash className="mr-2 h-4 w-4" /> Clear Text
//                           </Button>
//                         </div>
//                       </div>
                      
//                       <TranscriptionDisplay 
//                         sentence={sentence}
//                         currentDetection={currentDetection}
//                         confidence={confidencePercent}
//                         onSendTranscription={() => {
//                           if (sentence.trim() !== "") {
//                             sendMessageToCall(sentence);
//                             toast.success("Transcription sent to call");
//                             setSentence("");
//                           }
//                         }}
//                       />
//                     </div>
                    
//                     {/* Quick message input section */}
//                     <div className="space-y-3 border-t pt-3">
//                       <h3 className="text-sm font-medium">Quick Message</h3>
//                       <div className="flex gap-2">
//                         <Input
//                           value={quickMessage}
//                           onChange={(e) => setQuickMessage(e.target.value)}
//                           placeholder="Type a message to say on the call..."
//                           onKeyDown={(e) => {
//                             if (e.key === 'Enter' && quickMessage.trim()) {
//                               e.preventDefault();
//                               sendQuickMessage();
//                             }
//                           }}
//                         />
//                         <Button 
//                           onClick={sendQuickMessage}
//                           disabled={!quickMessage.trim() || isTranscribing}
//                         >
//                           Send
//                         </Button>
//                       </div>
//                     </div>
                    
//                     {/* Message history section */}
//                     <div className="space-y-2 border-t pt-3">
//                       <h3 className="text-sm font-medium">Message History</h3>
//                       <div className="bg-muted rounded-md p-1 max-h-[200px] overflow-y-auto">
//                         {messageHistory.length > 0 ? (
//                           <div className="space-y-1">
//                             {messageHistory.map((msg, index) => (
//                               <div key={index} className="text-sm p-2 bg-background rounded flex items-start justify-between">
//                                 <span className="break-words max-w-[80%]">{msg.text}</span>
//                                 <span className="text-xs text-muted-foreground shrink-0 ml-1">{msg.timestamp}</span>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <p className="text-sm text-muted-foreground p-2">No messages sent yet</p>
//                         )}
//                       </div>
//                     </div>
                    
//                     {/* Call controls */}
//                     <div className="space-y-2 border-t pt-3">
//                       <h3 className="text-sm font-medium">Call Controls</h3>
//                       <div className="space-y-2">
//                         <Button 
//                           variant="destructive" 
//                           onClick={endCall}
//                           className="w-full"
//                         >
//                           End Call
//                         </Button>
                        
//                         {/* Emergency WhatsApp button */}
//                         <EmergencyWhatsApp />
//                       </div>
//                     </div>
//                   </div>
//                 </Card>
//               )}

//               {/* Video Preview */}
//               <Card className="col-span-2 aspect-video relative overflow-hidden bg-accent">
//                 {isWebcamOn ? (
//                   <>
//                     <video
//                       ref={videoRef}
//                       autoPlay
//                       playsInline
//                       muted
//                       className="absolute inset-0 w-full h-full object-cover mirror"
//                     />
//                     {/* Add detection overlay */}
//                     <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm p-3 rounded-lg text-white flex flex-col items-center">
//                       <div className="text-xl font-bold mb-1">
//                         {currentDetection !== "?" ? currentDetection : "Detecting..."}
//                       </div>
//                       <Progress value={confidencePercent} className="h-3 w-32 mb-1" />
//                       <span className="text-xs">{confidencePercent.toFixed(0)}% confidence</span>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
//                     {isSimulatedCall ? (
//                       <>
//                         <Phone className="w-16 h-16 text-primary" />
//                         <div className="text-center">
//                           <p className="font-medium">Phone Call Active</p>
//                           <p className="text-muted-foreground text-sm">Using Twilio for voice calls instead of sign language detection</p>
//                         </div>
//                         <div className="mt-2 flex gap-2">
//                           <Button 
//                             onClick={toggleWebcam}
//                             variant="outline"
//                             size="sm"
//                             className="mt-2"
//                           >
//                             <Camera className="w-4 h-4 mr-2" /> Enable Webcam (Optional)
//                           </Button>
//                         </div>
//                       </>
//                     ) : (
//                       <>
//                         <Video className="w-16 h-16 text-muted-foreground" />
//                         <p className="text-muted-foreground">Turn on webcam to enable sign language detection</p>
//                         <Button 
//                           onClick={toggleWebcam}
//                           variant="default"
//                           size="sm"
//                           className="mt-2"
//                         >
//                           <Camera className="w-4 h-4 mr-2" /> Start Webcam
//                         </Button>
//                       </>
//                     )}
//                   </div>
//                 )}
                
//                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
//                   <Button size="icon" variant="secondary">
//                     <Mic className="w-4 h-4" />
//                   </Button>
//                   <Button size="icon" className="bg-primary hover:bg-primary/90">
//                     <Phone className="w-4 h-4" />
//                   </Button>
//                   <Button size="icon" variant="secondary">
//                     <MessageSquare className="w-4 h-4" />
//                   </Button>
//                   <Button size="icon" variant="secondary">
//                     <Settings className="w-4 h-4" />
//                   </Button>
//                 </div>
//               </Card>
//             </div>
//           </Card>

//           {/* Add error message display above video preview or below call interface */}
//           {errorMessage && !isSimulatedCall && (
//             <div className="col-span-3 mt-2">
//               <Alert variant="destructive">
//                 <AlertTitle>Error</AlertTitle>
//                 <AlertDescription>{errorMessage}</AlertDescription>
//                 <Button 
//                   variant="outline" 
//                   size="sm" 
//                   className="mt-2" 
//                   onClick={() => setErrorMessage(null)}
//                 >
//                   Dismiss
//                 </Button>
//               </Alert>
//             </div>
//           )}
          
//           {modelLoaded && (
//             <div className="col-span-3 mt-2">
//               <div className="text-xs text-muted-foreground flex items-center justify-end">
//                 <span className="mr-2">
//                   {modelDevice.includes("simplified") 
//                     ? "Using simplified sign detection" 
//                     : `Sign Language Model: Active on ${modelDevice}`}
//                 </span>
//                 <div className="h-2 w-2 rounded-full bg-green-500"></div>
//               </div>
//             </div>
//           )}
//         </motion.div>
//       </div>
      
//       {/* Add CSS for mirroring the webcam */}
//       <style jsx global>{`
//         .mirror {
//           transform: scaleX(-1);
//         }
//       `}</style>
//     </div>
//   )
// }