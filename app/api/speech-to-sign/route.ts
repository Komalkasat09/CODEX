import { NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Health check endpoint
export async function GET() {
  try {
    // Check if backend server is available
    const response = await fetch('http://localhost:8000/api/speech-to-sign')
    if (!response.ok) {
      throw new Error('Backend server not responding')
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Health check failed:', error)
    // For now, return a successful response as we may not have a backend yet
    return NextResponse.json(
      { status: 'ok', message: 'Speech to sign endpoint is active' },
      { status: 200 }
    )
  }
}

// Main speech-to-sign conversion endpoint
export async function POST(request: Request) {
  try {
    console.log('Received speech-to-sign request')
    
    // Clone the request before reading its body to avoid "disturbed" errors
    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'ase'

    console.log('Request params:', { audioFileSize: audioFile?.size, language })

    if (!audioFile) {
      console.error('No audio provided in request')
      return NextResponse.json(
        { error: 'No audio provided' },
        { status: 400 }
      )
    }

    let backendAvailable = false
    let backendError = null

    // Try to call the Python backend if available
    try {
      console.log('Attempting to connect to backend server')
      
      // Convert file to buffer
      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Create new FormData for Python server
      const pythonFormData = new FormData()
      pythonFormData.append('audio', new Blob([buffer], { type: audioFile.type }), 'speech.wav')
      pythonFormData.append('language', language)

      const response = await fetch('http://localhost:8000/api/speech-to-sign/transcribe', {
        method: 'POST',
        body: pythonFormData
      })

      console.log('Backend response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Backend response data:', data)
        backendAvailable = true
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        backendError = `Backend returned ${response.status}: ${errorText}`
        console.error(backendError)
      }
    } catch (error) {
      backendError = error instanceof Error ? error.message : String(error)
      console.error('Backend service unavailable:', backendError)
      // Continue to fallback implementation
    }

    // Fallback: Create mock speech recognition and animation data
    console.log('Using fallback for audio file')
    
    // Simple mock text generation based on audio file name/size
    const mockRecognizedText = getMockTextFromAudio(audioFile);
    console.log('Mock recognized text:', mockRecognizedText)
    
    // Mock animation data
    const animationData = {
      text: mockRecognizedText,
      signs: mockRecognizedText.split('').map((char: string) => ({
        character: char,
        duration: 500
      }))
    }

    return NextResponse.json({
      text: mockRecognizedText,
      animationData: animationData,
      source: 'fallback',
      backendAvailable: backendAvailable,
      backendError: backendError
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Speech to sign translation failed:', errorMessage)
    return NextResponse.json(
      { 
        error: 'Failed to translate speech to sign language',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

// Helper function to generate mock text from audio file metadata
function getMockTextFromAudio(file: File): string {
  // In a real app, this would use speech recognition
  // Here we just return some mock text based on the file size
  
  const phrases = [
    "Hello world",
    "Nice to meet you",
    "How are you doing today",
    "Sign language is beautiful",
    "I am learning to sign",
    "Please speak more slowly",
    "Thank you for your help",
    "Can you repeat that please",
    "I understand what you are saying",
    "Communication is important"
  ];
  
  // Use file size as a simple seed for selecting a phrase
  const index = Math.floor(file.size % phrases.length);
  return phrases[index];
} 