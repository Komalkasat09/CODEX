import { NextResponse } from 'next/server'

// AssemblyAI API base URL
const ASSEMBLY_AI_API_URL = 'https://api.assemblyai.com/v2'

// Insert your AssemblyAI API key directly here
// You can get your API key from: https://www.assemblyai.com/dashboard/account
// IMPORTANT: Replace this with your actual API key from your AssemblyAI account
const ASSEMBLY_AI_API_KEY = '6fc5a3a8f17e4548b3fbc21b42eadb8d'  // Updated key

// Health check endpoint
export async function GET() {
  // Check if the API key is valid
  const apiKey = ASSEMBLY_AI_API_KEY
  const isKeyValid = apiKey && apiKey.length > 20 // AssemblyAI keys are typically long strings
  
  return NextResponse.json(
    { 
      status: isKeyValid ? 'ok' : 'error', 
      message: isKeyValid 
        ? 'Speech-to-text endpoint is active with a valid API key' 
        : 'Speech-to-text endpoint is active but the API key appears to be invalid',
      apiKeyConfigured: isKeyValid
    },
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

// Main speech-to-text endpoint using AssemblyAI
export async function POST(request: Request) {
  try {
    console.log('Received speech-to-text request')
    
    // Get AssemblyAI API key from hardcoded value
    const apiKey = ASSEMBLY_AI_API_KEY
    
    // Check if API key appears to be invalid
    if (!apiKey || apiKey.length < 10) {
      console.error('AssemblyAI API key is missing or appears to be invalid')
      return NextResponse.json(
        { 
          error: 'Server configuration error: Missing or invalid API key',
          details: 'Please set your actual AssemblyAI API key in the code' 
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
    
    // Parse form data
    let formData
    try {
      formData = await request.formData()
      console.log('Form data parsed successfully')
    } catch (formError) {
      console.error('Error parsing form data:', formError)
      return NextResponse.json(
        { error: 'Error parsing form data', details: String(formError) },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
    
    // Get audio file from form data
    const audioFile = formData.get('audio_file') as File
    
    if (!audioFile) {
      console.error('No audio file found in form data')
      console.log('Available form data keys:', Array.from(formData.keys()))
      return NextResponse.json(
        { error: 'No audio file provided', details: 'The audio_file field is missing from the form data' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
    
    console.log('Processing audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    })
    
    // Convert file to buffer
    let arrayBuffer
    try {
      arrayBuffer = await audioFile.arrayBuffer()
      console.log('Audio file converted to buffer successfully, size:', arrayBuffer.byteLength)
    } catch (bufferError) {
      console.error('Error reading audio file buffer:', bufferError)
      return NextResponse.json(
        { error: 'Error reading audio data', details: String(bufferError) },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
    
    const buffer = Buffer.from(arrayBuffer)
    
    // STEP 1: Upload the audio file to AssemblyAI
    console.log('Uploading audio to AssemblyAI...', buffer.length, 'bytes')
    let uploadResponse
    
    try {
      // Set timeout for upload request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      uploadResponse = await fetch(`${ASSEMBLY_AI_API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Upload request timed out after 30 seconds')
      }
      throw new Error(`Failed to connect to AssemblyAI: ${fetchError}`)
    }
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Upload failed:', uploadResponse.status, errorText)
      throw new Error(`Failed to upload audio: ${uploadResponse.status} - ${errorText}`)
    }
    
    // Parse upload response
    let uploadData
    try {
      uploadData = await uploadResponse.json()
    } catch (jsonError) {
      throw new Error('Invalid JSON response from AssemblyAI upload endpoint')
    }
    
    console.log('Upload successful, got URL:', uploadData.upload_url)
    
    if (!uploadData.upload_url) {
      throw new Error('No upload URL returned from AssemblyAI')
    }
    
    // STEP 2: Submit the transcription request
    console.log('Submitting transcription request...')
    let transcriptResponse
    
    try {
      // Set timeout for transcription request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      transcriptResponse = await fetch(`${ASSEMBLY_AI_API_URL}/transcript`, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: uploadData.upload_url,
          language_code: 'en', // Default to English
          punctuate: true,
          format_text: true
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Transcription request timed out after 30 seconds')
      }
      throw new Error(`Failed to connect to AssemblyAI transcript endpoint: ${fetchError}`)
    }
    
    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text()
      console.error('Transcript request failed:', transcriptResponse.status, errorText)
      throw new Error(`Failed to submit transcript: ${transcriptResponse.status} - ${errorText}`)
    }
    
    // Parse transcription response
    let transcriptData
    try {
      transcriptData = await transcriptResponse.json()
    } catch (jsonError) {
      throw new Error('Invalid JSON response from AssemblyAI transcript endpoint')
    }
    
    console.log('Transcript job created:', transcriptData.id)
    
    if (!transcriptData.id) {
      throw new Error('No transcript ID returned from AssemblyAI')
    }
    
    // STEP 3: Poll for transcription completion
    console.log('Polling for transcription result...')
    let transcript = null
    let isCompleted = false
    let attempts = 0
    const maxAttempts = 120 // 2 minutes max
    
    while (!isCompleted && attempts < maxAttempts) {
      attempts++
      
      // Poll the AssemblyAI API for the transcription result
      let pollingResponse
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for polling
        
        pollingResponse = await fetch(`${ASSEMBLY_AI_API_URL}/transcript/${transcriptData.id}`, {
          method: 'GET',
          headers: {
            'Authorization': apiKey,
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn(`Polling attempt ${attempts} timed out, retrying...`)
          if (attempts >= maxAttempts) {
            throw new Error('Polling timed out repeatedly')
          }
          continue
        }
        throw new Error(`Failed to connect to AssemblyAI polling endpoint: ${fetchError}`)
      }
      
      if (!pollingResponse.ok) {
        const errorText = await pollingResponse.text()
        console.error('Polling failed:', pollingResponse.status, errorText)
        throw new Error(`Polling failed: ${pollingResponse.status} - ${errorText}`)
      }
      
      // Parse polling response
      try {
        transcript = await pollingResponse.json()
      } catch (jsonError) {
        console.error('Error parsing polling response:', jsonError)
        if (attempts >= maxAttempts) {
          throw new Error('Invalid JSON in polling response')
        }
        continue
      }
      
      console.log('Poll attempt', attempts, '- Status:', transcript.status, 
                transcript.text ? `Text length: ${transcript.text.length}` : '(no text yet)')
      
      if (['completed', 'error'].includes(transcript.status)) {
        isCompleted = true
        break
      }
      
      // Wait 1 second before polling again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Check for completion or errors
    if (!transcript) {
      throw new Error('Failed to retrieve transcript')
    }
    
    if (transcript.status === 'error') {
      console.error('Transcription error from AssemblyAI:', transcript.error)
      throw new Error(`Transcription error: ${transcript.error || 'Unknown error'}`)
    }
    
    if (!isCompleted) {
      throw new Error(`Transcription timed out after ${maxAttempts} seconds`)
    }
    
    // Check for empty result
    if (!transcript.text || transcript.text.trim() === '') {
      console.warn('AssemblyAI returned empty text despite successful transcription')
      return NextResponse.json({
        text: '',
        status: 'empty',
        error: 'No speech detected in audio',
        source: 'assemblyai'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    
    // Return successful transcription
    console.log('Transcription successful:', transcript.text)
    return NextResponse.json({
      text: transcript.text,
      status: transcript.status,
      confidence: transcript.confidence,
      words: transcript.words,
      source: 'assemblyai'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    // Handle any errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Speech to text transcription failed:', errorMessage)
    return NextResponse.json(
      { 
        error: 'Failed to transcribe speech to text',
        details: errorMessage 
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 