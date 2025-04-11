import { NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Health check endpoint
export async function GET() {
  try {
    console.log('Checking backend connection')
    // Match the endpoint from the Python server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (increased from 2s)
    
    try {
      // Try both endpoints for health check - first the /api/sign-to-text path
      let response;
      try {
        response = await fetch('http://localhost:8000/api/sign-to-text', {
          signal: controller.signal,
          method: 'GET',
          cache: 'no-store',
          headers: {
            'pragma': 'no-cache',
            'cache-control': 'no-cache'
          }
        });
      } catch (e) {
        // If that fails, try the root path as fallback
        console.log('API endpoint not found, trying root endpoint');
        response = await fetch('http://localhost:8000/', {
          signal: controller.signal,
          method: 'GET',
          cache: 'no-store',
          headers: {
            'pragma': 'no-cache',
            'cache-control': 'no-cache'
          }
        });
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Backend server responded with status: ${response.status}`)
        throw new Error(`Backend server responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Backend server health check succeeded:', data)
      return NextResponse.json({ status: 'ok', backend: data })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Backend connection timed out')
        return NextResponse.json(
          { status: 'error', error: 'Backend server connection timed out' },
          { status: 503 }
        )
      }
      throw error;
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { status: 'error', error: 'Backend server not responding', details: String(error) },
      { status: 503 }
    )
  }
}

// Main prediction endpoint
export async function POST(request: Request) {
  try {
    console.log('Starting sign-to-text prediction request')
    // Clone the request before reading its body to avoid "disturbed" errors
    const clonedRequest = request.clone()
    let formData
    
    try {
      formData = await clonedRequest.formData()
      console.log('Form data received and parsed')
    } catch (formError) {
      console.error('Error parsing form data:', formError)
      return NextResponse.json(
        { error: 'Failed to parse form data', details: String(formError) },
        { status: 400 }
      )
    }
    
    const file = formData.get('file') as File
    const language = formData.get('language') as string || 'ase'

    if (!file) {
      console.error('No file found in form data, keys:', Array.from(formData.keys()))
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, language: ${language}`)

    // Convert file to buffer
    let arrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
      console.log('File converted to array buffer, size:', arrayBuffer.byteLength)
    } catch (bufferError) {
      console.error('Error reading file buffer:', bufferError)
      return NextResponse.json(
        { error: 'Failed to read file data', details: String(bufferError) },
        { status: 400 }
      )
    }
    
    const buffer = Buffer.from(arrayBuffer)

    // Create new FormData for Python server
    const pythonFormData = new FormData()
    const blob = new Blob([buffer], { type: file.type })
    pythonFormData.append('file', blob, file.name)
    pythonFormData.append('language', language)

    console.log('Sending request to Python server')
    
    // Forward request to Python server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      // Try the standard API endpoint first
      let response;
      try {
        console.log('Connecting to backend at http://localhost:8000/api/sign-to-text/predict')
        response = await fetch('http://localhost:8000/api/sign-to-text/predict', {
          method: 'POST',
          body: pythonFormData,
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'pragma': 'no-cache',
            'cache-control': 'no-cache'
          }
        });
      } catch (e) {
        // Try the legacy endpoint as fallback
        console.log('API endpoint not found, trying legacy endpoint at http://localhost:8000/predict');
        response = await fetch('http://localhost:8000/predict', {
          method: 'POST',
          body: pythonFormData,
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'pragma': 'no-cache',
            'cache-control': 'no-cache'
          }
        });
      }
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`Backend server error: ${response.status}, ${errorText}`)
        throw new Error(`Backend server error: ${response.status}`)
      }

      // Try to parse the JSON response, handle all possible errors
      let data
      try {
        const text = await response.text();
        console.log('Received response of length:', text.length)
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        return NextResponse.json(
          { error: 'Invalid response from backend server', details: 'Response was not valid JSON' },
          { status: 502 }
        )
      }
      
      console.log('Processed prediction successfully:', 
                 data.prediction, 
                 'confidence:', data.confidence, 
                 'has_hand:', data.has_hand)
      
      // Ensure data has the required fields
      if (typeof data.prediction === 'undefined') {
        console.error('Missing prediction in response:', data)
        return NextResponse.json(
          { error: 'Invalid response from backend: missing prediction' },
          { status: 502 }
        )
      }

      return NextResponse.json(data)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Backend request timed out')
        return NextResponse.json(
          { error: 'Backend server timeout - processing took too long' },
          { status: 504 }
        )
      }
      throw error; // rethrow for the outer catch
    }
  } catch (error) {
    console.error('Prediction failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process sign language' },
      { status: 500 }
    )
  }
} 