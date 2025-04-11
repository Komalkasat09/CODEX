// components/SignLanguageAvatar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Mock gesture database - in a real app, this would be much more comprehensive
const gestureDatabase = {
  "hello": {
    rightHand: { x: 0.5, y: 0.2, z: 0.3 },
    leftHand: { x: -0.5, y: 0.2, z: 0.3 },
    headPosition: { y: 0.1 },
  },
  "thank": {
    rightHand: { x: 0.3, y: 0.4, z: 0.1 },
    leftHand: { x: -0.3, y: 0.4, z: 0.1 },
    headPosition: { y: -0.1 },
  },
  "you": {
    rightHand: { x: 0.2, y: 0.3, z: 0.4 },
    leftHand: { x: -0.2, y: 0.3, z: 0.4 },
    headPosition: { y: 0 },
  },
  // Default pose
  "default": {
    rightHand: { x: 0.4, y: -0.2, z: 0 },
    leftHand: { x: -0.4, y: -0.2, z: 0 },
    headPosition: { y: 0 },
  },
};

// Avatar component that displays the 3D character
const Avatar = ({ currentGesture }: { currentGesture: keyof typeof gestureDatabase }) => {
  const headRef = useRef<THREE.Mesh>(null);
  const rightHandRef = useRef<THREE.Mesh>(null);
  const leftHandRef = useRef<THREE.Mesh>(null);
  
  // Apply the current gesture to the avatar parts
  useEffect(() => {
    if (!currentGesture) return;
    
    // Apply positions to avatar parts
    const gesture = gestureDatabase[currentGesture];
    
    if (headRef.current) {
      headRef.current.position.y = gesture.headPosition.y;
    }
    
    if (rightHandRef.current) {
      rightHandRef.current.position.x = gesture.rightHand.x;
      rightHandRef.current.position.y = gesture.rightHand.y;
      rightHandRef.current.position.z = gesture.rightHand.z;
    }
    
    if (leftHandRef.current) {
      leftHandRef.current.position.x = gesture.leftHand.x;
      leftHandRef.current.position.y = gesture.leftHand.y;
      leftHandRef.current.position.z = gesture.leftHand.z;
    }
  }, [currentGesture]);
  
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.8, 32]} />
        <meshStandardMaterial color="#4285F4" />
      </mesh>
      
      {/* Head */}
      <mesh ref={headRef} position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#FBBC05" />
      </mesh>
      
      {/* Right Hand */}
      <mesh ref={rightHandRef} position={[0.4, -0.2, 0]}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial color="#34A853" />
      </mesh>
      
      {/* Left Hand */}
      <mesh ref={leftHandRef} position={[-0.4, -0.2, 0]}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial color="#34A853" />
      </mesh>
    </group>
  );
};

// Main component
interface SignLanguageAvatarProps {
  currentWord: string;
  isProcessing: boolean;
}

export default function SignLanguageAvatar({ currentWord, isProcessing }: SignLanguageAvatarProps) {
  const [currentGesture, setCurrentGesture] = useState<"default" | "hello" | "thank" | "you">("default");
  
  // Determine the appropriate gesture for the current word
  useEffect(() => {
    if (!currentWord || !isProcessing) {
      setCurrentGesture("default");
      return;
    }
    
    // Look up the word in our gesture database
    const lowerWord = currentWord.toLowerCase();
    
    // Check if we have a specific gesture for this word
    if (lowerWord in gestureDatabase) {
      setCurrentGesture(lowerWord as "default" | "hello" | "thank" | "you");
    } else {
      // If no specific gesture, use letters or a generic gesture
      // In a real app, this would be much more sophisticated
      setCurrentGesture("default");
    }
  }, [currentWord, isProcessing]);
  
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Avatar currentGesture={currentGesture} />
        <OrbitControls enableZoom={false} />
      </Canvas>
      {!isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Ready for animation</p>
        </div>
      )}
    </div>
  );
}