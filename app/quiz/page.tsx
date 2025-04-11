"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  AlertCircle, BookOpen, Camera, CheckCircle, 
  ChevronRight, Fingerprint, Languages, ThumbsUp, X 
} from "lucide-react"
import { useUser } from '../context/UserContext'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import confetti from 'canvas-confetti'

// Define quiz modules 
const quizModules = [
  {
    id: 1,
    title: "Sign Recognition Challenge",
    description: "Test your signing ability by performing signs your webcam will detect",
    icon: <Camera className="w-6 h-6" />,
    color: "#4f46e5", // Indigo
    questions: [
      {
        id: 1,
        prompt: "Sign the letter 'A'",
        answer: "a",
        type: "camera"
      },
      {
        id: 2,
        prompt: "Sign the letter 'B'",
        answer: "b",
        type: "camera"
      },
      {
        id: 3,
        prompt: "Sign the letter 'C'",
        answer: "c",
        type: "camera"
      },
      {
        id: 4,
        prompt: "Sign the letter 'D'",
        answer: "d",
        type: "camera"
      },
      {
        id: 5,
        prompt: "Sign the letter 'E'",
        answer: "e",
        type: "camera"
      }
    ]
  },
  {
    id: 2,
    title: "Video Interpretation",
    description: "Watch sign language videos and type what's being signed",
    icon: <Languages className="w-6 h-6" />,
    color: "#ef4444", // Red
    questions: [
      {
        id: 1,
        prompt: "What is being signed in this video?",
        videoPath: "/signs/a.webm",
        answer: "a",
        type: "text"
      },
      {
        id: 2,
        prompt: "What is being signed in this video?",
        videoPath: "/signs/b.webm",
        answer: "b",
        type: "text"
      },
      {
        id: 3,
        prompt: "What is being signed in this video?",
        videoPath: "/signs/c.webm",
        answer: "c",
        type: "text"
      },
      {
        id: 4,
        prompt: "What does this sign mean?",
        videoPath: "/signs/hello.webm",
        answer: "hello",
        type: "text"
      },
      {
        id: 5,
        prompt: "What is being expressed in this video?",
        videoPath: "/signs/thank_you.webm",
        answer: "thank you",
        type: "text"
      }
    ]
  },
  {
    id: 3,
    title: "Sign Sequence Challenge",
    description: "Complete a sequence of signs in the correct order",
    icon: <Fingerprint className="w-6 h-6" />,
    color: "#10b981", // Emerald
    questions: [
      {
        id: 1,
        prompt: "Sign the sequence: A, B, C",
        answer: ["a", "b", "c"],
        type: "camera_sequence"
      },
      {
        id: 2,
        prompt: "Sign 'Hello'",
        answer: "hello",
        type: "camera"
      },
      {
        id: 3,
        prompt: "Sign 'Thank You'",
        answer: "thank you",
        type: "camera"
      },
      {
        id: 4,
        prompt: "Sign the letters that spell 'DAD'",
        answer: ["d", "a", "d"],
        type: "camera_sequence"
      },
      {
        id: 5,
        prompt: "Sign the letters in 'ME'",
        answer: ["m", "e"],
        type: "camera_sequence"
      }
    ]
  },
  {
    id: 4,
    title: "Speed Challenge",
    description: "Sign as many letters as you can within the time limit",
    icon: <BookOpen className="w-6 h-6" />,
    color: "#8b5cf6", // Violet
    questions: [
      {
        id: 1,
        prompt: "Sign as many letters as you can in 30 seconds",
        timeLimit: 30,
        type: "timed_camera"
      }
    ]
  }
];

export default function QuizPage() {
  const { user } = useUser();
  const router = useRouter();
  
  // States for quiz management
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Camera states
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [cameraDetection, setCameraDetection] = useState("");
  const [textInput, setTextInput] = useState("");
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Quiz progress
  const progressPercentage = selectedModule !== null 
    ? (currentQuestionIndex / quizModules[selectedModule].questions.length) * 100 
    : 0;
    
  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/sign-in');
      return;
    }
  }, [user, router]);

  // Toggle webcam for camera questions
  const toggleWebcam = async () => {
    if (isWebcamOn) {
      // Turn off webcam
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = (webcamRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        webcamRef.current.srcObject = null;
      }
      setIsWebcamOn(false);
      setCameraDetection("");
    } else {
      try {
        // Turn on webcam
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
        setIsWebcamOn(true);
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    }
  };

  // Process webcam frames and detect signs
  const processCameraInput = () => {
    setIsProcessing(true);
    
    // Simulate sign language detection with a timeout
    // In a real implementation, this would connect to your sign detection backend
    setTimeout(() => {
      if (selectedModule === null) return;
      
      const moduleQuestions = quizModules[selectedModule].questions;
      const currentQuestion = moduleQuestions[currentQuestionIndex];
      
      // Simulate random correct/incorrect detection
      // In a real app, this would be the result from your ML model
      const detectedSign = Math.random() > 0.3 
        ? currentQuestion.answer 
        : ["e", "f", "g", "h"][Math.floor(Math.random() * 4)];
      
      setCameraDetection(typeof detectedSign === 'string' ? detectedSign : detectedSign[0]);
      
      // Check if answer is correct
      const isAnswerCorrect = typeof currentQuestion.answer === 'string' 
        ? detectedSign === currentQuestion.answer
        : detectedSign === currentQuestion.answer[0];
      
      setIsCorrect(isAnswerCorrect);
      
      if (isAnswerCorrect) {
        setScore(prevScore => prevScore + 1);
        
        // Move to next question after delay
        setTimeout(() => {
          moveToNextQuestion();
        }, 1500);
      }
      
      setIsProcessing(false);
    }, 2000);
  };

  // Check text input answers
  const checkTextAnswer = () => {
    if (selectedModule === null) return;
    
    const moduleQuestions = quizModules[selectedModule].questions;
    const currentQuestion = moduleQuestions[currentQuestionIndex];
    
    const normalizedInput = textInput.trim().toLowerCase();
    const normalizedAnswer = (currentQuestion.answer as string).toLowerCase();
    
    const isAnswerCorrect = normalizedInput === normalizedAnswer;
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      setScore(prevScore => prevScore + 1);
      
      // Move to next question after delay
      setTimeout(() => {
        moveToNextQuestion();
      }, 1500);
    }
  };

  // Move to next question or complete quiz
  const moveToNextQuestion = () => {
    if (selectedModule === null) return;
    
    const moduleQuestions = quizModules[selectedModule].questions;
    
    if (currentQuestionIndex < moduleQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsCorrect(null);
      setTextInput("");
      setCameraDetection("");
    } else {
      // Quiz completed
      setQuizCompleted(true);
      
      // Trigger confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Start a quiz module
  const startQuiz = (moduleIndex: number) => {
    setSelectedModule(moduleIndex);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);
    setIsCorrect(null);
    setQuizCompleted(false);
    setTextInput("");
    setCameraDetection("");
    
    // Start webcam if needed
    const questionType = quizModules[moduleIndex].questions[0].type;
    if (questionType.includes('camera')) {
      toggleWebcam();
    }
  };

  // Return to module selection
  const returnToModules = () => {
    setSelectedModule(null);
    
    // Turn off webcam if it's on
    if (isWebcamOn) {
      toggleWebcam();
    }
  };

  // Render current question based on type
  const renderQuestion = () => {
    if (selectedModule === null) return null;
    
    const moduleQuestions = quizModules[selectedModule].questions;
    const currentQuestion = moduleQuestions[currentQuestionIndex];
    
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-center">{currentQuestion.prompt}</h3>
        
        {currentQuestion.type.includes('camera') && (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-primary">
              <video 
                ref={webcamRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {!isWebcamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Button 
                    variant="outline" 
                    onClick={toggleWebcam}
                    className="bg-primary text-white border-none"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Turn On Camera
                  </Button>
                </div>
              )}
              
              {/* Detected sign overlay */}
              {cameraDetection && (
                <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded">
                  Detected: <span className="font-bold">{cameraDetection.toUpperCase()}</span>
                </div>
              )}
              
              {/* Feedback overlay */}
              {isCorrect !== null && (
                <div className={`absolute inset-0 flex items-center justify-center bg-${isCorrect ? 'green' : 'red'}-500/50`}>
                  <div className={`bg-${isCorrect ? 'green' : 'red'}-500 text-white p-4 rounded-full`}>
                    {isCorrect ? (
                      <CheckCircle className="w-12 h-12" />
                    ) : (
                      <X className="w-12 h-12" />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {isWebcamOn && (
              <Button 
                onClick={processCameraInput} 
                disabled={isProcessing || isCorrect !== null}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Check My Sign"}
              </Button>
            )}
          </div>
        )}
        
        {currentQuestion.type === 'text' && currentQuestion.videoPath && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef}
                className="max-h-full max-w-full"
                controls
                autoPlay
                playsInline
                loop
                src={currentQuestion.videoPath}
              />
            </div>
            
            <div className="flex space-x-2">
              <Input 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-grow"
                disabled={isCorrect !== null}
              />
              <Button 
                onClick={checkTextAnswer}
                disabled={!textInput.trim() || isCorrect !== null}
              >
                Submit
              </Button>
            </div>
            
            {/* Feedback message */}
            {isCorrect !== null && (
              <div className={`p-3 rounded-md text-center ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isCorrect ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Correct! Nice job!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Try again!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render quiz completion screen
  const renderQuizCompletion = () => {
    if (selectedModule === null) return null;
    
    const moduleQuestions = quizModules[selectedModule].questions;
    const percentage = Math.round((score / moduleQuestions.length) * 100);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="inline-block p-6 bg-green-100 dark:bg-green-900/30 rounded-full">
          <ThumbsUp className="w-16 h-16 text-green-500" />
        </div>
        
        <h2 className="text-3xl font-bold">Quiz Completed!</h2>
        
        <div className="space-y-2">
          <p className="text-xl">Your score: {score}/{moduleQuestions.length}</p>
          <Progress value={percentage} className="h-4 w-full max-w-md mx-auto">
            <div 
              className="h-full rounded-full transition-all" 
              style={{ 
                width: `${percentage}%`,
                background: `linear-gradient(90deg, ${quizModules[selectedModule].color}, ${quizModules[selectedModule].color}AA)` 
              }}
            />
          </Progress>
        </div>
        
        <div className="flex justify-center gap-4">
          <Button onClick={returnToModules} variant="outline">
            Return to Modules
          </Button>
          <Button onClick={() => startQuiz(selectedModule)}>
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto pt-20 pb-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
          Sign Language Quiz
        </h1>
        <p className="text-muted-foreground">Test your sign language skills with interactive challenges</p>
      </div>
      
      {selectedModule === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quizModules.map((module, index) => (
            <Card 
              key={module.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
              onClick={() => startQuiz(index)}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div 
                  className="p-4 rounded-full" 
                  style={{ backgroundColor: `${module.color}20` }}
                >
                  <div 
                    className="p-3 rounded-full" 
                    style={{ backgroundColor: module.color }}
                  >
                    {module.icon}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{module.title}</h3>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  style={{ 
                    backgroundColor: module.color,
                    borderColor: module.color
                  }}
                >
                  Start Quiz
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: quizModules[selectedModule].color }}
              >
                {quizModules[selectedModule].icon}
              </div>
              <h2 className="text-2xl font-bold">{quizModules[selectedModule].title}</h2>
            </div>
            <Button variant="outline" onClick={returnToModules}>
              Exit Quiz
            </Button>
          </div>
          
          {/* Quiz progress bar */}
          {!quizCompleted && (
            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Question {currentQuestionIndex + 1} of {quizModules[selectedModule].questions.length}</span>
                <span>Score: {score}</span>
              </div>
              <Progress value={progressPercentage} className="h-2">
                <div 
                  className="h-full rounded-full transition-all" 
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: `linear-gradient(90deg, ${quizModules[selectedModule].color}, ${quizModules[selectedModule].color}AA)` 
                  }}
                />
              </Progress>
            </div>
          )}
          
          {/* Quiz content - questions or completion screen */}
          {quizCompleted ? renderQuizCompletion() : renderQuestion()}
        </Card>
      )}
    </div>
  );
} 