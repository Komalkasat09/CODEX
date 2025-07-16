// import { NextResponse } from 'next/server'

// // Force dynamic rendering for this API route
// export const dynamic = 'force-dynamic';

// // Health check endpoint
// export async function GET() {
//   try {
//     // Check if backend server is available
//     const response = await fetch('http://localhost:8000/api/text-to-sign')
//     if (!response.ok) {
//       throw new Error('Backend server not responding')
//     }
//     const data = await response.json()
//     return NextResponse.json(data)
//   } catch (error) {
//     console.error('Health check failed:', error)
//     // For now, return a successful response as we may not have a backend yet
//     return NextResponse.json(
//       { status: 'ok', message: 'Text to sign endpoint is active' },
//       { status: 200 }
//     )
//   }
// }

// // Main text-to-sign conversion endpoint
// export async function POST(request: Request) {
//   try {
//     console.log('Received text-to-sign request')
//     const body = await request.json()
//     const { text, language = 'ase', slowMode = false } = body

//     console.log('Request params:', { text, language, slowMode })

//     if (!text) {
//       console.error('No text provided in request')
//       return NextResponse.json(
//         { error: 'No text provided' },
//         { status: 400 }
//       )
//     }

//     let backendAvailable = false
//     let backendError = null

//     // Try to call the Python backend if available
//     try {
//       console.log('Attempting to connect to backend server')
//       const response = await fetch('http://localhost:8000/api/text-to-sign/translate', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ text, language, slowMode }),
//       })

//       console.log('Backend response status:', response.status)

//       if (response.ok) {
//         const data = await response.json()
//         console.log('Backend response data:', data)
//         backendAvailable = true
//         return NextResponse.json(data)
//       } else {
//         const errorText = await response.text()
//         backendError = `Backend returned ${response.status}: ${errorText}`
//         console.error(backendError)
//       }
//     } catch (error) {
//       backendError = error instanceof Error ? error.message : String(error)
//       console.error('Backend service unavailable:', backendError)
//       // Continue to fallback implementation
//     }

//     // Fallback: Create mock animation data if backend is not available
//     console.log('Using fallback for text:', text)
    
//     // Mock animation data - for now we're just returning the input text
//     // as our "animation data" since we don't have actual animation generation
//     const animationData = {
//       text: text,
//       signs: text.split('').map((char: string) => ({
//         character: char,
//         duration: slowMode ? 1000 : 500
//       }))
//     }

//     return NextResponse.json({
//       text: text,
//       animationData: animationData,
//       source: 'fallback',
//       backendAvailable: backendAvailable,
//       backendError: backendError
//     })
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error)
//     console.error('Text to sign translation failed:', errorMessage)
//     return NextResponse.json(
//       { 
//         error: 'Failed to translate text to sign language',
//         details: errorMessage 
//       },
//       { status: 500 }
//     )
//   }
// } 