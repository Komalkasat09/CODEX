from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import uvicorn
import torch
import numpy as np
import cv2
import mediapipe as mp
from transformers import AutoImageProcessor, SiglipForImageClassification
from PIL import Image
import io
import base64
import os
import tempfile
import shutil
from typing import List, Optional, Dict, Any, Callable
from langchain.chains import LLMChain, RetrievalQA
from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.prompts import PromptTemplate
from moviepy.editor import VideoFileClip
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.datastructures import UploadFile as StarletteUploadFile
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
import inspect
import time
from fastapi.middleware.wsgi import WSGIMiddleware
import threading
import urllib.parse
import uuid
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from twilio.twiml.voice_response import VoiceResponse

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    print(f"Loading environment variables from {env_path}")
    load_dotenv(dotenv_path=env_path)
else:
    print("No .env file found. Using environment variables from system or defaults.")

# Set SIMULATE_CALLS in the environment
os.environ["SIMULATE_CALLS"] = os.environ.get("SIMULATE_CALLS", "true").lower()

# Import call-related modules after setting environment variables
from make_call import (
    app as flask_app,
    client,
    FROM_VERIFIED_NUMBER,
    TO_VERIFIED_NUMBER,
    make_interactive_call,
    cleanup as ngrok_cleanup,
    start_ngrok,
    get_ngrok_url
)
from twilio.twiml.voice_response import VoiceResponse

# Explicitly initialize call-related variables
import make_call

# Global variables for phone call
call_active = False
receiver_call_sid = None
conference_name = None
message_queue = []

# Also set these in make_call module to ensure consistency
make_call.call_active = False
make_call.receiver_call_sid = None 
make_call.conference_name = None
make_call.message_queue = []

# Get API key from environment or use default
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyBQBwgUJwNo32NOUIAF0MPvcsuXuADfQn4")

# Setup Google Generative AI with the API key
genai.configure(api_key=GOOGLE_API_KEY)

# Global model variable
gemini_model = None

# Initialize Gemini model
try:
    print(f"Initializing Gemini model...")
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")
    test_resp = gemini_model.generate_content("Hello, test.")
    print(f"✅ Gemini model initialized successfully.")
except Exception as e:
    print(f"❌ Error initializing Gemini model: {str(e)}")
    print(f"  Autocorrect functionality will not be available.")
    gemini_model = None

# Create FastAPI app
app = FastAPI(title="Combined API: Autocorrect, Sign Language Detection, and Video Transcription")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Increase the file size limit to 100MB
# Patch the UploadFile to handle larger files
async def _iterate_in_threadpool(self):
    # Override the default 1MB chunks to larger chunks
    chunk_size = 1024 * 1024 * 8  # 8MB chunks
    while True:
        chunk = await self.file.read(chunk_size)
        if not chunk:
            break
        yield chunk

# Apply our patched method
UploadFile._iterate_in_threadpool = _iterate_in_threadpool

# --- STORAGE FOR TRANSCRIPTS ---
# In-memory storage for transcripts and QA systems
# In production, you would use a database instead
storage = {
    "transcripts": {},
    "qa_systems": {}
}

# --- MODEL DEFINITIONS ---

class TextInput(BaseModel):
    text: str

class TranscriptResponse(BaseModel):
    raw_transcript: str
    processed_transcript: str
    
class QuestionRequest(BaseModel):
    question: str

class QuestionResponse(BaseModel):
    answer: str

class WhatsAppMessage(BaseModel):
    to_number: str
    message: str

# --- AUTOCORRECT FUNCTIONALITY ---

@app.post("/autocorrect")
async def autocorrect(input_data: TextInput):
    """
    Use Gemini AI to correct grammar and spelling in the provided text
    
    Args:
        input_data: TextInput object containing the text to autocorrect
    """
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="Please enter some text.")
    
    print(f"Received autocorrect request for text: {input_data.text[:50]}...")
    
    # Check if model is available
    if gemini_model is None:
        print("Autocorrect error: Gemini model not initialized")
        return {"original": input_data.text, "corrected": input_data.text}
    
    prompt = f"""Correct the grammar and spelling of the following text:

Original: {input_data.text}

Corrected:"""

    try:
        # Add safety settings to avoid content filtering issues
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        
        # Generate content with Gemini with safety settings
        response = gemini_model.generate_content(
            contents=prompt,
            safety_settings=safety_settings,
            generation_config={"temperature": 0}
        )
        
        if response and hasattr(response, 'text') and response.text:
            corrected = response.text.strip()
            print(f"Autocorrected: {input_data.text[:30]} -> {corrected[:30]}")
            return {"original": input_data.text, "corrected": corrected}
        else:
            # Handle empty response
            print("Autocorrect returned empty response")
            return {"original": input_data.text, "corrected": input_data.text}
    except Exception as e:
        print(f"Autocorrect error: {str(e)}")
        # Return the original text instead of raising an exception
        return {"original": input_data.text, "corrected": input_data.text}

@app.get("/api/test-autocorrect")
async def test_autocorrect():
    """
    Test endpoint to check if autocorrect is working properly
    Returns the status of the gemini_model and a test correction
    """
    try:
        print("\n==== TESTING AUTOCORRECT ====")
        
        # First check if the model is initialized
        if gemini_model is None:
            print("❌ Gemini model is not initialized")
            return {"status": "error", "message": "Gemini model is not initialized"}
        
        # Test the model with a simple correction
        test_text = "This sentense has speling errors."
        print(f"Testing autocorrect with: \"{test_text}\"")
        
        test_prompt = f"""Correct the grammar and spelling of the following text:

Original: {test_text}

Corrected:"""

        # Add safety settings to avoid content filtering issues
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        
        response = gemini_model.generate_content(
            contents=test_prompt,
            safety_settings=safety_settings,
            generation_config={"temperature": 0}
        )
        
        if response and hasattr(response, 'text') and response.text:
            corrected = response.text.strip()
            print(f"✅ Autocorrect test successful: \"{test_text}\" -> \"{corrected}\"")
            return {
                "status": "success", 
                "model_initialized": True,
                "test_text": test_text,
                "corrected_text": corrected
            }
        else:
            print("❌ Autocorrect test failed: Empty response from Gemini")
            return {
                "status": "error", 
                "model_initialized": True, 
                "message": "Empty response from Gemini API"
            }
    except Exception as e:
        print(f"❌ Autocorrect test error: {str(e)}")
        return {"status": "error", "message": f"Error: {str(e)}"}

# --- TRANSCRIPTION FUNCTIONALITY ---

# Function to extract audio from video
def extract_audio_from_video(video_path):
    """Extract audio from a video file and save it to a temporary file."""
    temp_dir = tempfile.gettempdir()
    output_audio_path = os.path.join(temp_dir, "extracted_audio.mp3")
    
    try:
        video = VideoFileClip(video_path)
        video.audio.write_audiofile(output_audio_path, codec='mp3', verbose=False, logger=None)
        video.close()
        return output_audio_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting audio: {str(e)}")

# Function to transcribe audio using Gemini
def transcribe_audio_with_gemini(audio_path):
    """Transcribe audio using Gemini model."""
    # Configure Gemini model
    generation_config = {
        "temperature": 0.2,
        "top_p": 0.95,
        "top_k": 64,
    }
    
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
    
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # Load audio file
        with open(audio_path, "rb") as f:
            audio_data = f.read()
        
        # Create a prompt for transcription
        prompt = "Please transcribe the following audio completely. Provide the full transcript with timestamps where possible."
        
        # Create the response parts
        response_parts = model.generate_content([prompt, {"mime_type": "audio/mp3", "data": audio_data}])
        transcript = response_parts.text
        
        return transcript
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

# Function to process transcript with LangChain
def process_transcript_with_langchain(transcript):
    """Use LangChain to process and enhance the transcript."""
    try:
        # Initialize the Gemini model for LangChain
        llm = GoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
        
        # Create a chain to process the transcript
        prompt_template = """
        The following is a raw transcript from a video:
        
        {transcript}
        
        Please format this transcript to make it more readable. 
        Identify different speakers if possible, correct any obvious errors, 
        and organize it into paragraphs where appropriate.
        Add timestamps where applicable.
        """
        
        chain = LLMChain.from_string(llm=llm, template=prompt_template)
        
        # Process the transcript
        result = chain.invoke({"transcript": transcript})
        return result["text"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing transcript: {str(e)}")

# Function to create vector embeddings from transcript
def create_vector_db_from_transcript(transcript, chunk_size=1000, chunk_overlap=200):
    """Create a vector database from the transcript for retrieval."""
    try:
        # Split the transcript into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
        )
        docs = text_splitter.create_documents([transcript])
        
        # Create embeddings using Gemini
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=GOOGLE_API_KEY
        )
        
        # Create vector store
        vector_store = FAISS.from_documents(docs, embeddings)
        
        return vector_store
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating vector database: {str(e)}")

# Function to set up RAG for Q&A
def setup_rag_for_qa(vector_store, top_k=3):
    """Set up a retrieval-augmented generation pipeline for Q&A."""
    try:
        # Initialize the Gemini model for LangChain
        llm = GoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
        
        # Create a prompt template for Q&A
        prompt_template = """
        You are an assistant that answers questions based on the transcript of a video.
        Use only the context provided to answer the question. If the answer cannot be found
        in the context, say "I don't have enough information from the transcript to answer that question."
        
        Context from transcript:
        {context}
        
        Question: {question}
        
        Answer:
        """
        
        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        # Create the retrieval chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": top_k}),
            chain_type_kwargs={"prompt": PROMPT}
        )
        
        return qa_chain
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting up Q&A system: {str(e)}")

# TRANSCRIPTION ENDPOINTS
@app.post("/api/transcribe", response_model=TranscriptResponse)
async def transcribe_video(
    file: UploadFile = File(...),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200),
    top_k: int = Form(3)
):
    """
    Upload a video file and get the transcript.
    Also creates vector embeddings for the transcript for later use.
    """
    # Log the file details
    print(f"Received upload request for file: {file.filename}, content_type: {file.content_type}")
    
    # Check if file is a video
    allowed_types = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"]
    if file.content_type not in allowed_types:
        error_msg = f"Invalid file type: {file.content_type}. Please upload a video file (MP4, MOV, AVI, MKV)."
        print(error_msg)
        raise HTTPException(
            status_code=400, 
            detail=error_msg
        )
    
    # Use a named temp file for the video
    temp_file_path = None
    audio_path = None
    
    try:
        # Create a temporary file with a .mp4 extension
        prefix = "uploaded_video_"
        suffix = ".mp4"
        fd, temp_file_path = tempfile.mkstemp(suffix=suffix, prefix=prefix)
        os.close(fd)  # Close the file descriptor
        
        print(f"Created temporary file: {temp_file_path}")
        
        # Write the uploaded file to the temporary file in chunks
        file_size = 0
        buffer_size = 1024 * 1024  # 1MB buffer
        
        # Reset file position to beginning
        await file.seek(0)
        
        with open(temp_file_path, "wb") as f:
            while chunk := await file.read(buffer_size):
                f.write(chunk)
                file_size += len(chunk)
                print(f"Wrote chunk of {len(chunk)} bytes, total: {file_size} bytes")
        
        print(f"File saved successfully. Total size: {file_size} bytes ({file_size/(1024*1024):.2f} MB)")
        
        # Extract audio from video
        print(f"Extracting audio from video: {temp_file_path}")
        audio_path = extract_audio_from_video(temp_file_path)
        print(f"Audio extracted to: {audio_path}")
        
        # Transcribe audio
        print(f"Transcribing audio: {audio_path}")
        raw_transcript = transcribe_audio_with_gemini(audio_path)
        print(f"Transcription completed, length: {len(raw_transcript)} characters")
        
        # Process transcript
        print("Processing transcript with LangChain")
        processed_transcript = process_transcript_with_langchain(raw_transcript)
        print(f"Processed transcript, length: {len(processed_transcript)} characters")
        
        # Create vector embeddings
        print(f"Creating vector embeddings with chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")
        vector_store = create_vector_db_from_transcript(
            processed_transcript,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        print("Vector embeddings created successfully")
        
        # Set up QA system
        print(f"Setting up QA system with top_k={top_k}")
        qa_system = setup_rag_for_qa(vector_store, top_k=top_k)
        print("QA system set up successfully")
        
        # Store the QA system in memory (using file name as identifier)
        video_id = file.filename
        storage["transcripts"][video_id] = {
            "raw_transcript": raw_transcript,
            "processed_transcript": processed_transcript
        }
        storage["qa_systems"][video_id] = qa_system
        print(f"Stored transcript and QA system with ID: {video_id}")
        
        return TranscriptResponse(
            raw_transcript=raw_transcript,
            processed_transcript=processed_transcript
        )
        
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary files
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            print(f"Deleted temporary file: {temp_file_path}")
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)
            print(f"Deleted temporary audio file: {audio_path}")

@app.post("/api/ask/{video_id}", response_model=QuestionResponse)
async def ask_question(
    video_id: str,
    question_request: QuestionRequest
):
    """
    Ask a question about a transcribed video.
    Uses the previously created vector embeddings to find relevant information.
    """
    if video_id not in storage["qa_systems"]:
        raise HTTPException(
            status_code=404, 
            detail="Video not found. Please transcribe the video first."
        )
    
    try:
        # Get the QA system
        qa_system = storage["qa_systems"][video_id]
        
        # Ask the question
        response = qa_system.invoke({"query": question_request.question})
        answer = response.get("result", "I couldn't find an answer to that question in the transcript.")
        
        return QuestionResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/api/transcripts", response_model=List[str])
async def list_transcripts():
    """Get a list of all transcribed videos"""
    return list(storage["transcripts"].keys())

@app.get("/api/transcript/{video_id}")
async def get_transcript(video_id: str, type: str = Query("processed", regex="^(raw|processed)$")):
    """Get a specific transcript by video ID"""
    if video_id not in storage["transcripts"]:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    transcript_type = f"{type}_transcript"
    transcript = storage["transcripts"][video_id].get(transcript_type)
    
    if not transcript:
        raise HTTPException(status_code=404, detail=f"{type.capitalize()} transcript not found")
    
    return {"transcript": transcript}

# --- SIGN LANGUAGE DETECTION FUNCTIONALITY ---

# Global variables for prediction smoothing
last_sign_predictions = []
prediction_smoothing_window = 5
sign_confidence_threshold = 0.7

# Word similarity search parameters
word_similarity_threshold = 0.85
words_database = {}

# Initialize MediaPipe Hands for sign detection if not already initialized
if 'mp_hands_sign' not in globals():
    mp_hands_sign = mp.solutions.hands
    hands_sign = mp_hands_sign.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.2,
        min_tracking_confidence=0.2
    )
    mp_drawing_sign = mp.solutions.drawing_utils
    mp_drawing_styles_sign = mp.solutions.drawing_utils.DrawingSpec(color=(0, 255, 0), thickness=2)

# Load Sign Language Detection Model if not already loaded
if 'model_sign_detection' not in globals():
    print("Loading Sign Language Detection model...")
    try:
        model_name_sign = "prithivMLmods/Alphabet-Sign-Language-Detection"
        processor_sign = AutoImageProcessor.from_pretrained(model_name_sign)
        model_sign_detection = SiglipForImageClassification.from_pretrained(model_name_sign)
        sign_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device for sign language detection: {sign_device}")
        model_sign_detection.to(sign_device)
        model_sign_detection.eval()
        print("Sign Language Detection model loaded successfully")
    except Exception as e:
        print(f"Error loading Sign Language Detection model: {str(e)}")
        model_sign_detection = None
        processor_sign = None

# Load word images for similarity comparison
def load_word_images():
    global words_database
    words_dir = Path("words")
    
    if not words_dir.exists():
        print("Words directory not found, creating it.")
        words_dir.mkdir(exist_ok=True)
        return
    
    word_images = list(words_dir.glob("*.jpg")) + list(words_dir.glob("*.png"))
    
    print(f"Loading {len(word_images)} word images for similarity search...")
    for img_path in word_images:
        word_name = img_path.stem  # Get filename without extension
        img = cv2.imread(str(img_path))
        if img is not None:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            # Extract hand features
            results = hands_sign.process(img_rgb)
            if results.multi_hand_landmarks:
                # Store processed image for comparison
                words_database[word_name] = {
                    "image": img_rgb,
                    "landmarks": results.multi_hand_landmarks[0],
                }
                print(f"Loaded word image: {word_name}")
            else:
                print(f"Warning: No hand detected in word image {img_path}")
        else:
            print(f"Warning: Failed to load word image {img_path}")
    
    print(f"Successfully loaded {len(words_database)} word images with detected hands")

# Load word images on startup
try:
    load_word_images()
except Exception as e:
    print(f"Error loading word images: {str(e)}")

def calculate_similarity(landmarks1, landmarks2) -> float:
    """Calculate similarity between two hand landmark sets"""
    
    # If either set of landmarks is None, return zero similarity
    if not landmarks1 or not landmarks2:
        return 0.0
    
    # Extract landmark coordinates from both sets
    points1 = [(landmark.x, landmark.y, landmark.z) for landmark in landmarks1.landmark]
    points2 = [(landmark.x, landmark.y, landmark.z) for landmark in landmarks2.landmark]
    
    # Calculate Euclidean distance between corresponding landmarks
    total_distance = 0.0
    for p1, p2 in zip(points1, points2):
        dist = np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2 + (p1[2] - p2[2])**2)
        total_distance += dist
    
    # Convert distance to similarity score (inversely related)
    # Lower distance means higher similarity
    avg_distance = total_distance / len(points1)
    similarity = 1.0 - min(avg_distance, 1.0)  # Clamp to [0,1]
    
    return similarity

def find_matching_word(hand_landmarks) -> Dict:
    """Find the closest matching word based on hand landmarks similarity"""
    best_match = None
    best_similarity = 0.0
    
    for word, data in words_database.items():
        similarity = calculate_similarity(hand_landmarks, data["landmarks"])
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = word
    
    if best_match and best_similarity >= word_similarity_threshold:
        return {
            "word": best_match,
            "similarity": best_similarity
        }
    else:
        return None

@app.get("/api/sign-to-text")
async def sign_to_text_info():
    """Information endpoint for sign language detection API"""
    return {
        "status": "ok",
        "message": "Sign Language Detection API is operational (letters only)",
        "model": "prithivMLmods/Alphabet-Sign-Language-Detection" if model_sign_detection else "Not loaded",
        "device": str(sign_device) if 'sign_device' in globals() else "unknown",
        "endpoints": [
            {"path": "/api/sign-to-text", "method": "GET", "description": "API information"},
            {"path": "/api/sign-to-text/predict", "method": "POST", "description": "Predict letter sign from image"}
        ]
    }

@app.post("/upload-word")
async def upload_word(word_name: str, file: UploadFile = File(...)):
    """Save a new word image to the database"""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"success": False, "message": "Failed to decode image"}
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = hands_sign.process(img_rgb)
    
    if not results.multi_hand_landmarks:
        return {"success": False, "message": "No hand detected in the image"}
    
    # Save the word image to disk
    words_dir = Path("words")
    words_dir.mkdir(exist_ok=True)
    img_path = words_dir / f"{word_name}.jpg"
    cv2.imwrite(str(img_path), img)
    
    # Add to in-memory database
    words_database[word_name] = {
        "image": img_rgb,
        "landmarks": results.multi_hand_landmarks[0],
    }
    
    return {
        "success": True, 
        "message": f"Word '{word_name}' saved successfully",
        "total_words": len(words_database)
    }

@app.get("/words")
async def list_words():
    """List all available word images"""
    return {
        "words": list(words_database.keys()),
        "count": len(words_database)
    }

@app.post("/api/sign-to-text/predict")
async def predict_sign(file: UploadFile = File(...)):
    """Predict sign from image"""
    global last_sign_predictions
    
    # Check if model is loaded
    if model_sign_detection is None or processor_sign is None:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Sign language detection model not loaded",
                "message": "The detection model failed to initialize"
            }
        )
        
    contents = await file.read()
    
    # Convert to cv2 image format
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid image data"}
        )
    
    # Process the entire frame first
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = hands_sign.process(img_rgb)
    
    # Create a debug image with the same dimensions as the input
    debug_img = img.copy()
    
    predicted_text = "None"
    prediction_type = "letter"  # Only letter for sign-to-text
    confidence = 0.0
    has_hand = False
    hand_roi_base64 = None
    
    # Process hand landmarks if detected
    if results.multi_hand_landmarks:
        has_hand = True
        hand_landmarks = results.multi_hand_landmarks[0]  # Use the first hand
        
        # Draw landmarks on debug image
        mp_drawing_sign.draw_landmarks(
            debug_img,
            hand_landmarks,
            mp_hands_sign.HAND_CONNECTIONS,
            mp_drawing_styles_sign
        )
        
        # Calculate hand bounding box
        h, w, c = img.shape
        x_min, y_min = w, h
        x_max, y_max = 0, 0
        
        for landmark in hand_landmarks.landmark:
            x, y = int(landmark.x * w), int(landmark.y * h)
            x_min = min(x_min, x)
            y_min = min(y_min, y)
            x_max = max(x_max, x)
            y_max = max(y_max, y)
        
        # Expand the box with padding
        padding = 20
        x_min = max(0, x_min - padding)
        y_min = max(0, y_min - padding)
        x_max = min(w, x_max + padding)
        y_max = min(h, y_max + padding)
        
        # Draw hand bounding box
        cv2.rectangle(debug_img, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
        
        # Extract hand region if valid
        if x_max > x_min and y_max > y_min:
            hand_roi = img_rgb[y_min:y_max, x_min:x_max].copy()
            
            # Create a separate base64 image of just the hand ROI
            if hand_roi.shape[0] > 10 and hand_roi.shape[1] > 10:
                hand_roi_cv = cv2.cvtColor(hand_roi, cv2.COLOR_RGB2BGR)
                _, hand_roi_buffer = cv2.imencode('.jpg', hand_roi_cv)
                hand_roi_base64 = base64.b64encode(hand_roi_buffer).decode('utf-8')
            
            # Skip processing if hand_roi is too small
            if hand_roi.shape[0] > 10 and hand_roi.shape[1] > 10:
                # Convert to PIL Image for model
                image = Image.fromarray(hand_roi)
                
                # Process for model
                inputs = processor_sign(images=image, return_tensors="pt").to(sign_device)
                
                with torch.no_grad():
                    outputs = model_sign_detection(**inputs)
                
                # Get confidence scores
                logits = outputs.logits[0]
                probabilities = torch.nn.functional.softmax(logits, dim=0)
                predicted_idx = torch.argmax(probabilities).item()
                confidence = probabilities[predicted_idx].item()
                
                # Get the predicted letter
                raw_prediction = model_sign_detection.config.id2label[predicted_idx]
                
                # Replace 'J' with 'I' as in the original code
                if raw_prediction == 'J':
                    raw_prediction = 'I'
                
                # Add to smoothing window
                last_sign_predictions.append((raw_prediction, confidence))
                if len(last_sign_predictions) > prediction_smoothing_window:
                    last_sign_predictions.pop(0)
                
                # Find most common prediction with confidence weighting
                if len(last_sign_predictions) > 0:
                    prediction_count = {}
                    for p, c in last_sign_predictions:
                        if p not in prediction_count:
                            prediction_count[p] = 0
                        prediction_count[p] += c
                    
                    # Get the prediction with highest weighted count
                    predicted_text = max(prediction_count, key=prediction_count.get)
                    confidence = prediction_count[predicted_text] / len(last_sign_predictions)
                    
                    if confidence < sign_confidence_threshold:
                        predicted_text = "Uncertain"

    # Encode debug image to base64 for frontend
    _, buffer = cv2.imencode('.jpg', debug_img)
    debug_image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "prediction": predicted_text,
        "prediction_type": prediction_type, 
        "confidence": float(confidence),
        "has_hand": has_hand,
        "debug_image": debug_image_base64,
        "hand_roi": hand_roi_base64
    }

@app.post("/csl-predict")
async def csl_predict(file: UploadFile = File(...)):
    """
    Predict sign from image specifically for CSL component
    This endpoint prioritizes word similarity search over letter detection
    """
    # Check if model is loaded
    if model_sign_detection is None or processor_sign is None:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Sign language detection model not loaded",
                "message": "The detection model failed to initialize"
            }
        )
        
    contents = await file.read()
    
    # Convert to cv2 image format
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid image data"}
        )
    
    # Process the entire frame first
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = hands_sign.process(img_rgb)
    
    # Create a debug image with the same dimensions as the input
    debug_img = img.copy()
    
    predicted_text = "None"
    prediction_type = "letter"  # Can be "letter" or "word"
    confidence = 0.0
    has_hand = False
    hand_roi_base64 = None
    word_matches = []
    
    # Process hand landmarks if detected
    if results.multi_hand_landmarks:
        has_hand = True
        hand_landmarks = results.multi_hand_landmarks[0]  # Use the first hand
        
        # Draw landmarks on debug image
        mp_drawing_sign.draw_landmarks(
            debug_img,
            hand_landmarks,
            mp_hands_sign.HAND_CONNECTIONS,
            mp_drawing_styles_sign
        )
        
        # ENHANCED WORD SIMILARITY SEARCH
        # Find all potential matches with similarity scores
        for word, data in words_database.items():
            similarity = calculate_similarity(hand_landmarks, data["landmarks"])
            if similarity > 0.5:  # Include all reasonable matches
                word_matches.append({
                    "word": word,
                    "similarity": similarity
                })
        
        # Sort matches by similarity score (highest first)
        word_matches.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Take the best match if it's above threshold
        if word_matches and word_matches[0]["similarity"] >= word_similarity_threshold:
            best_match = word_matches[0]
            predicted_text = best_match["word"]
            confidence = best_match["similarity"]
            prediction_type = "word"
            
            # Draw word label on debug image with confidence score
            cv2.putText(
                debug_img,
                f"WORD: {predicted_text} ({confidence:.2f})",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2
            )
            
            # Also draw other potential matches (if any)
            for i, match in enumerate(word_matches[1:3]):  # Show up to 2 more matches
                cv2.putText(
                    debug_img,
                    f"Alt {i+1}: {match['word']} ({match['similarity']:.2f})",
                    (10, 60 + i * 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 155, 255),
                    2
                )
        else:
            # If no word match, proceed with letter detection
            # Calculate hand bounding box
            h, w, c = img.shape
            x_min, y_min = w, h
            x_max, y_max = 0, 0
            
            for landmark in hand_landmarks.landmark:
                x, y = int(landmark.x * w), int(landmark.y * h)
                x_min = min(x_min, x)
                y_min = min(y_min, y)
                x_max = max(x_max, x)
                y_max = max(y_max, y)
            
            # Expand the box with padding
            padding = 20
            x_min = max(0, x_min - padding)
            y_min = max(0, y_min - padding)
            x_max = min(w, x_max + padding)
            y_max = min(h, y_max + padding)
            
            # Draw hand bounding box
            cv2.rectangle(debug_img, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
            
            # Extract hand region if valid
            if x_max > x_min and y_max > y_min:
                hand_roi = img_rgb[y_min:y_max, x_min:x_max].copy()
                
                # Create a separate base64 image of just the hand ROI
                if hand_roi.shape[0] > 10 and hand_roi.shape[1] > 10:
                    hand_roi_cv = cv2.cvtColor(hand_roi, cv2.COLOR_RGB2BGR)
                    _, hand_roi_buffer = cv2.imencode('.jpg', hand_roi_cv)
                    hand_roi_base64 = base64.b64encode(hand_roi_buffer).decode('utf-8')
                
                # Skip processing if hand_roi is too small
                if hand_roi.shape[0] > 10 and hand_roi.shape[1] > 10:
                    # Convert to PIL Image for model
                    image = Image.fromarray(hand_roi)
                    
                    # Process for model
                    inputs = processor_sign(images=image, return_tensors="pt").to(sign_device)
                    
                    with torch.no_grad():
                        outputs = model_sign_detection(**inputs)
                    
                    # Get confidence scores
                    logits = outputs.logits[0]
                    probabilities = torch.nn.functional.softmax(logits, dim=0)
                    predicted_idx = torch.argmax(probabilities).item()
                    confidence = probabilities[predicted_idx].item()
                    
                    # Get the predicted letter
                    predicted_text = model_sign_detection.config.id2label[predicted_idx]
                    
                    # Replace 'J' with 'I' as in the original code
                    if predicted_text == 'J':
                        predicted_text = 'I'
    
    # Encode debug image to base64 for frontend
    _, buffer = cv2.imencode('.jpg', debug_img)
    debug_image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "prediction": predicted_text,
        "prediction_type": prediction_type,
        "confidence": float(confidence),
        "has_hand": has_hand,
        "debug_image": debug_image_base64,
        "hand_roi": hand_roi_base64,
        "alternatives": word_matches[1:4] if len(word_matches) > 1 else []  # Include up to 3 alternative matches
    }

# --- ROOT ENDPOINT ---

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Combined API", 
        "endpoints": {
            "autocorrect": "POST /autocorrect",
            "sign_language": {
                "status": "GET /api/sign-to-text",
                "predict": "POST /api/sign-to-text/predict",
                "legacy": "POST /predict"
            },
            "csl": {
                "predict": "POST /csl-predict"
            },
            "transcription": {
                "transcribe": "POST /api/transcribe",
                "list": "GET /api/transcripts",
                "get": "GET /api/transcript/{video_id}",
                "ask": "POST /api/ask/{video_id}"
            },
            "phone_call": {
                "make_call": "POST /api/make-call",
                "send_message": "POST /api/send-message",
                "end_call": "POST /api/end-call",
                "status": "GET /api/call-status",
                "websocket": "WebSocket /ws/call/{call_sid}"
            },
            "emergency": {
                "whatsapp": "POST /api/send-whatsapp-emergency"
            }
        }
    }

# --- WEBSOCKET CALL TRANSCRIPTION ---
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set

# Keep track of active websocket connections by call SID
active_connections: Dict[str, WebSocket] = {}

@app.websocket("/ws/call/{call_sid}")
async def websocket_call_transcription(websocket: WebSocket, call_sid: str):
    """
    WebSocket endpoint for real-time sign language detection during calls
    
    Args:
        websocket: The WebSocket connection
        call_sid: The Twilio call SID to associate this connection with
    """
    print(f"WebSocket connection request for call: {call_sid}")
    
    # Check if this is a valid call
    if not call_sid:
        await websocket.close(code=1008, reason="Invalid call SID")
        return
        
    # Accept the connection
    await websocket.accept()
    print(f"WebSocket connection accepted for call: {call_sid}")
    
    # Store the connection
    active_connections[call_sid] = websocket
    
    # Send initial connection status
    await websocket.send_json({
        "type": "connection_status",
        "status": "connected",
        "call_sid": call_sid
    })
    
    # Send model status
    await websocket.send_json({
        "type": "model_status",
        "loaded": True,
        "device": str(sign_device)
    })
    
    try:
        while True:
            # Receive frames and process them
            data = await websocket.receive_bytes()
            
            try:
                # Convert bytes to numpy array
                nparr = np.frombuffer(data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is None or img.size == 0:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid image data"
                    })
                    continue
                
                # Process the image for sign language detection
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                results = hands_sign.process(img_rgb)
                
                # No hand detected
                if not results.multi_hand_landmarks:
                    await websocket.send_json({
                        "type": "sign_detection_result",
                        "letter": "None",
                        "confidence": 0.0
                    })
                    continue
                
                # Process hand landmarks
                hand_landmarks = results.multi_hand_landmarks[0]
                
                # Calculate hand bounding box
                h, w, c = img.shape
                x_min, y_min = w, h
                x_max, y_max = 0, 0
                
                for landmark in hand_landmarks.landmark:
                    x, y = int(landmark.x * w), int(landmark.y * h)
                    x_min = min(x_min, x)
                    y_min = min(y_min, y)
                    x_max = max(x_max, x)
                    y_max = max(y_max, y)
                
                # Expand the box with padding
                padding = 20
                x_min = max(0, x_min - padding)
                y_min = max(0, y_min - padding)
                x_max = min(w, x_max + padding)
                y_max = min(h, y_max + padding)
                
                # Extract hand region
                if x_max > x_min and y_max > y_min and (x_max - x_min) > 10 and (y_max - y_min) > 10:
                    hand_roi = img_rgb[y_min:y_max, x_min:x_max].copy()
                    
                    # Convert to PIL Image for model
                    image = Image.fromarray(hand_roi)
                    
                    # Process for model
                    inputs = processor_sign(images=image, return_tensors="pt").to(sign_device)
                    
                    with torch.no_grad():
                        outputs = model_sign_detection(**inputs)
                    
                    # Get confidence scores
                    logits = outputs.logits[0]
                    probabilities = torch.nn.functional.softmax(logits, dim=0)
                    predicted_idx = torch.argmax(probabilities).item()
                    confidence = probabilities[predicted_idx].item()
                    
                    # Get the predicted letter
                    predicted_letter = model_sign_detection.config.id2label[predicted_idx]
                    
                    # Send the result back to the client
                    await websocket.send_json({
                        "type": "sign_detection_result",
                        "letter": predicted_letter,
                        "confidence": float(confidence)
                    })
                else:
                    # Hand too small or invalid
                    await websocket.send_json({
                        "type": "sign_detection_result",
                        "letter": "Uncertain",
                        "confidence": 0.0
                    })
                    
            except Exception as e:
                print(f"Error processing frame: {str(e)}")
                # Send error message to client
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error processing frame: {str(e)}"
                })
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for call: {call_sid}")
    except Exception as e:
        print(f"WebSocket error for call {call_sid}: {str(e)}")
    finally:
        # Remove the connection from active connections
        if call_sid in active_connections:
            del active_connections[call_sid]
        print(f"WebSocket connection closed for call: {call_sid}")

# Add a simple test endpoint for file uploads
@app.post("/api/test-upload")
async def test_upload(file: UploadFile = File(...)):
    """
    Simple test endpoint to verify file uploads
    """
    print(f"Test upload received: {file.filename}, {file.content_type}")
    
    # Save the uploaded file to a temporary file
    temp_file = tempfile.SpooledTemporaryFile(max_size=10 * 1024 * 1024)  # 10MB before spooling to disk
    
    try:
        # Read the file content in chunks
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks
        
        # Set file position to beginning
        await file.seek(0)
        
        # Read and count in chunks
        while chunk := await file.read(chunk_size):
            temp_file.write(chunk)
            file_size += len(chunk)
            print(f"Test upload: Read chunk of {len(chunk)} bytes, total so far: {file_size} bytes")
        
        print(f"Test upload complete. Total size: {file_size} bytes")
        
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file_size,
            "message": "File upload test successful",
            "size_mb": round(file_size / (1024 * 1024), 2)
        }
    except Exception as e:
        print(f"Error in test upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")
    finally:
        temp_file.close()

# Add debug middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        print(f"Start processing request: {request.method} {request.url.path}")
        
        if request.method == "POST" and ("/api/transcribe" in request.url.path or "/api/test-upload" in request.url.path):
            content_length = request.headers.get("content-length")
            content_type = request.headers.get("content-type")
            print(f"Upload request - Content-Length: {content_length}, Content-Type: {content_type}")
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        print(f"Request completed: {request.method} {request.url.path} - took {process_time:.2f} seconds")
        
        return response

# Add the middleware to the app
app.add_middleware(RequestLoggingMiddleware)

# --- PHONE CALL INTEGRATION ---

# Global variables for phone call
WEBHOOK_BASE_URL = None

def initialize_ngrok_if_needed():
    """Initialize ngrok for Twilio webhooks if needed"""
    
    # Check if we should simulate calls
    simulate_calls = os.environ.get("SIMULATE_CALLS", "false").lower() == "true"
    
    if simulate_calls:
        print("\n==== SIMULATION MODE ENABLED ====")
        print("Using localhost for simulation")
        # For simulation, we can use localhost
        return "http://localhost:8081"
    
    # For real calls, we need to use ngrok or a public URL
    webhook_url = os.environ.get("WEBHOOK_URL")
    
    if webhook_url and webhook_url != "http://localhost:8081":
        print(f"Using configured webhook URL: {webhook_url}")
        return webhook_url
        
    # Try to start ngrok for a public URL
    try:
        url = start_ngrok()
        if url:
            print(f"Using ngrok URL: {url}")
            return url
    except Exception as e:
        print(f"Error starting ngrok: {str(e)}")
    
    # If we get here, we need to force simulation mode
    print("\n⚠️ WARNING: Could not establish a public URL for Twilio webhooks")
    print("Forcing simulation mode to avoid errors")
    os.environ["SIMULATE_CALLS"] = "true"
    return "http://localhost:8081"

@app.post("/api/make-call")
async def make_call(call_data: dict):
    """
    Make a call to the specified phone number with the given message
    """
    global call_active, receiver_call_sid
    
    try:
        # Debug statement to print received data
        print("\n==== CALL DATA RECEIVED ====")
        print(f"Call data: {call_data}")
        
        # Validate required fields
        if "phone_number" not in call_data or "message" not in call_data:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Missing required fields: phone_number, message"}
            )
            
        phone_number = call_data["phone_number"]
        message = call_data["message"]
        
        # Check if simulation is requested
        simulate = call_data.get("simulate", False)
        # Also check environment variable
        simulate_calls = os.environ.get("SIMULATE_CALLS", "false").lower() == "true"
        
        if simulate or simulate_calls:
            # Generate a simulated call SID
            simulated_sid = f"sim_{str(uuid.uuid4())[:8]}"
            receiver_call_sid = simulated_sid
            call_active = True
            
            print(f"\nSimulating call to {phone_number} with message: {message}")
            print(f"Generated simulated call SID: {simulated_sid}")
            
            return {
                "status": "call_initiated", 
                "call_sid": simulated_sid, 
                "message": "Simulated phone call initiated", 
                "simulated": True
            }
        
        # For real calls
        print(f"\nMaking real call to {phone_number} with message: {message}")
        
        # Initialize ngrok and get webhook URL
        webhook_url = initialize_ngrok_if_needed()
        print(f"Using webhook URL: {webhook_url}")
        
        # Ensure webhook URL has /twilio path prefix for voice webhook
        voice_webhook_url = webhook_url
        if not voice_webhook_url.endswith('/twilio'):
            voice_webhook_url = f"{webhook_url}/twilio"
            
        # Encode message for URL
        encoded_message = urllib.parse.quote(message)
        
        # Call the imported make_interactive_call function
        try:
            print("Calling make_interactive_call with Twilio...")
            print(f"Voice webhook URL: {voice_webhook_url}/voice?message={encoded_message}")
            
            receiver_sid, sender_sid = make_interactive_call(phone_number, message, webhook_base_url=voice_webhook_url)
            
            if receiver_sid:
                # Set global variables
                receiver_call_sid = receiver_sid
                call_active = True
                
                print(f"Call initiated with receiver SID: {receiver_sid}")
                return {"status": "call_initiated", "call_sid": receiver_sid, "message": "Phone call is being initiated"}
            else:
                print(f"⚠️ Warning: Call may not have been initiated properly")
                return {"status": "warning", "message": "Call may not have been initiated properly. Check server logs."}
        except Exception as call_err:
            print(f"❌ Error making call: {str(call_err)}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": f"Error making call: {str(call_err)}"}
            )
    except Exception as e:
        print(f"❌ Error in make_call API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error making call: {str(e)}"}
        )

@app.post("/api/send-message")
async def send_message(message: TextInput):
    """
    Send a message to an ongoing call
    """
    global call_active, message_queue
    
    # For development, allow sending messages even if call_active is false when simulating
    simulate_calls = os.environ.get("SIMULATE_CALLS", "false").lower() == "true"
    is_simulated = receiver_call_sid and receiver_call_sid.startswith('sim_')
    
    if not call_active and not simulate_calls and not is_simulated:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "No active call to send message to"}
        )
    
    try:
        # Print debug info
        print(f"\n==== SENDING MESSAGE ====")
        print(f"Message: {message.text}")
        print(f"Call active: {call_active}")
        print(f"Simulation mode: {simulate_calls}")
        print(f"Is simulated call: {is_simulated}")
        
        # Add to message queue 
        message_queue.append(message.text)
        
        # For simulated calls, immediately output the message
        if simulate_calls or is_simulated:
            # Immediately speak the message (simulation)
            print(f"\n📱 [SIMULATED CALL] Speaking: \"{message.text}\"")
            print(f"✅ Message successfully sent to call")
            return {"status": "success", "message": "Message sent to call"}
        
        # For real calls
        try:
            if call_active and receiver_call_sid:
                # Try to use the make_call module's send_message function
                try:
                    from make_call import send_message as make_call_send_message
                    success = make_call_send_message(message.text)
                    if success:
                        return {"status": "success", "message": "Message sent to call"}
                except Exception as e:
                    print(f"Error sending via make_call module: {str(e)}")
        except Exception as e:
            print(f"Error in direct message send: {str(e)}")
        
        return {"status": "queued", "message": "Message queued for delivery"}
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error sending message: {str(e)}"}
        )

@app.post("/api/end-call")
async def end_call():
    """
    End an ongoing call
    """
    global call_active, receiver_call_sid, conference_name, message_queue
    
    # Check if the call is simulated
    simulate_calls = os.environ.get("SIMULATE_CALLS", "false").lower() == "true"
    is_simulated = receiver_call_sid and receiver_call_sid.startswith('sim_')
    
    print(f"\n==== ENDING CALL ====")
    print(f"Call active: {call_active}")
    print(f"Receiver SID: {receiver_call_sid}")
    print(f"Simulation mode: {simulate_calls}")
    print(f"Is simulated call: {is_simulated}")
    
    if not call_active and not simulate_calls and not is_simulated:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "No active call to end"}
        )
    
    try:
        # End the call if it's a real one and we have a SID
        if receiver_call_sid and not is_simulated and not simulate_calls:
            try:
                client.calls(receiver_call_sid).update(status='completed')
                print(f"Successfully ended Twilio call with SID: {receiver_call_sid}")
            except Exception as e:
                print(f"Error ending Twilio call: {str(e)}")
        
        # Clear all call-related variables
        call_active = False
        print(f"Call ended (SID: {receiver_call_sid})")
        
        # Also update the variables in the make_call module
        try:
            import make_call
            make_call.call_active = False
            make_call.receiver_call_sid = None
            make_call.conference_name = None
            make_call.message_queue = []
        except Exception as e:
            print(f"Error updating make_call variables: {str(e)}")
        
        # Clear variables for both real and simulated calls
        receiver_call_sid = None
        conference_name = None
        message_queue = []
        
        return {"status": "ended", "message": "Call ended successfully"}
    except Exception as e:
        print(f"Error ending call: {str(e)}")
        # Still mark the call as inactive even if Twilio has an error
        call_active = False
        receiver_call_sid = None  # Reset SID
        conference_name = None
        message_queue = []
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error ending call: {str(e)}"}
        )

@app.get("/api/call-status")
async def get_call_status():
    """
    Get the status of the current call
    """
    global call_active, receiver_call_sid
    
    # Check for simulation mode and simulated calls
    simulate_calls = os.environ.get("SIMULATE_CALLS", "false").lower() == "true"
    is_simulated = receiver_call_sid and receiver_call_sid.startswith('sim_')
    
    # Detailed debug information
    print(f"\n==== CALL STATUS REQUEST ====")
    print(f"call_active: {call_active}")
    print(f"receiver_call_sid: {receiver_call_sid}")
    print(f"Simulation mode: {simulate_calls}")
    print(f"Is simulated call: {is_simulated}")
    
    # For both real and simulated calls, if global variables show no active call
    if not call_active and receiver_call_sid is None:
        print("No active call - returning inactive status")
        return {
            "status": "inactive", 
            "message": "No active call"
        }
    
    # For simulated calls, return status based on global variables
    if is_simulated:
        if call_active:
            print(f"Returning active status for simulated call: {receiver_call_sid}")
            return {
                "status": "active",
                "call_status": "active",
                "call_sid": receiver_call_sid,
                "simulated": True
            }
        else:
            print(f"Returning inactive status for simulated call: {receiver_call_sid}")
            return {
                "status": "inactive",
                "call_status": "completed",
                "call_sid": receiver_call_sid,
                "simulated": True
            }
    
    # For real calls, check with Twilio if we have a SID, otherwise just use globals
    if receiver_call_sid:
        try:
            # Check call status with Twilio API
            call = client.calls(receiver_call_sid).fetch()
            status = "active" if call.status in ['queued', 'ringing', 'in-progress'] else "inactive"
            print(f"Twilio call status: {call.status}, returning as: {status}")
            
            # If call is not active anymore according to Twilio, update our global
            if status == "inactive" and call_active:
                call_active = False
                print("Call no longer active according to Twilio - updating global state")
            
            return {
                "status": status,
                "call_status": call.status,
                "call_sid": receiver_call_sid
            }
        except Exception as e:
            print(f"Error checking Twilio call status: {str(e)}")
            # If error checking Twilio, fall back to our global state
            status = "active" if call_active else "inactive"
            print(f"Using fallback status from global state: {status}")
            return {
                "status": status,
                "call_status": "unknown",
                "call_sid": receiver_call_sid,
                "error": str(e)
            }
    else:
        status = "active" if call_active else "inactive"
        print(f"No call SID available, returning status based on globals: {status}")
        return {
            "status": status,
            "message": "Call status determined by application state"
        }

@app.get("/api/test-call")
async def test_call(to_number: str, message: str = "This is a test call from your application"):
    """
    Make a test call to verify Twilio is working properly
    """
    try:
        print("\n==== TEST CALL INITIATED ====")
        print(f"To number: {to_number}")
        print(f"Message: {message}")
        
        # Initialize ngrok and get webhook URL
        webhook_url = initialize_ngrok_if_needed()
        print(f"Using webhook URL: {webhook_url}")
        
        # Validate phone number format
        if not to_number.startswith('+'):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Phone number must start with + and be in E.164 format"}
            )
        
        # Verify Twilio credentials
        try:
            account = client.api.accounts(client.account_sid).fetch()
            print(f"✓ Twilio account verified. Status: {account.status}")
        except Exception as auth_err:
            print(f"❌ Twilio authentication failed: {str(auth_err)}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": f"Twilio authentication failed: {str(auth_err)}"}
            )
        
        # Encode message for URL
        encoded_message = urllib.parse.quote(message)
        
        # Fix for /twilio path prefix
        if webhook_url.endswith('/twilio'):
            # Remove '/twilio' since app is already mounted at this path
            twilio_webhook_url = webhook_url[:-7]  
        else:
            twilio_webhook_url = webhook_url
        
        print(f"Making test call using URL: {twilio_webhook_url}/test-voice?message={encoded_message}")
        
        # Make the call
        call = client.calls.create(
            to=to_number,
            from_=FROM_VERIFIED_NUMBER,
            url=f"{twilio_webhook_url}/test-voice?message={encoded_message}",
            status_callback=f"{twilio_webhook_url}/test-status",
            status_callback_event=['completed', 'answered']
        )
        
        print(f"✓ Test call initiated with SID: {call.sid}")
        
        # Return success
        return {
            "status": "success",
            "message": "Test call initiated successfully",
            "call_sid": call.sid,
            "to_number": to_number,
            "from_number": FROM_VERIFIED_NUMBER
        }
    except Exception as e:
        print(f"❌ Error making test call: {str(e)}")
        
        # Check for common Twilio errors
        error_msg = str(e).lower()
        error_details = ""
        
        if "not a valid phone number" in error_msg:
            error_details = "Phone number format is invalid. Must be in E.164 format (e.g., +1234567890)."
        elif "authenticate" in error_msg:
            error_details = "Twilio credentials are invalid. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
        elif "not verified" in error_msg:
            error_details = "The destination phone number is not verified. In trial mode, you can only call verified numbers."
        elif "invalid from phone number" in error_msg:
            error_details = f"The 'from' number ({FROM_VERIFIED_NUMBER}) is invalid. It must be a Twilio number that you own."
        
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"Error making test call: {str(e)}",
                "details": error_details
            }
        )

# Add test voice endpoint to handle test calls
@app.route("/twilio/test-voice", methods=['GET', 'POST'])
async def test_voice(request: Request):
    """Handle test voice calls"""
    print(f"Received test voice request")
    
    # Get query parameters
    query_params = dict(request.query_params)
    message = query_params.get('message', 'This is a test call from your application')
    
    # Create TwiML response
    response = VoiceResponse()
    response.say(message)
    response.pause(length=1)
    response.say("This confirms that your Twilio integration is working correctly. Goodbye!")
    response.hangup()
    
    return Response(content=str(response), media_type="application/xml")

@app.route("/twilio/test-status", methods=['GET', 'POST'])
async def test_status(request: Request):
    """Handle test call status callbacks"""
    print(f"Received test status callback")
    form_data = await request.form()
    call_status = form_data.get('CallStatus')
    call_sid = form_data.get('CallSid')
    
    print(f"Test call {call_sid} status: {call_status}")
    
    return Response(status_code=204)

# Mount Flask app for Twilio webhooks
app.mount("/twilio", WSGIMiddleware(flask_app))

@app.post("/api/send-whatsapp-emergency")
async def send_whatsapp_emergency_api(message_data: WhatsAppMessage):
    """
    Send an emergency WhatsApp message using Twilio
    
    Args:
        message_data: WhatsAppMessage with to_number and message fields
    """
    try:
        # Debug statement to print received data
        print("\n==== WHATSAPP EMERGENCY DATA RECEIVED ====")
        print(f"To: {message_data.to_number}")
        print(f"Message: {message_data.message}")
        
        to_number = message_data.to_number
        message = message_data.message
        
        # Your Twilio credentials - using the same ones as for calls
        account_sid = client.account_sid  # Reuse the existing Twilio client
        auth_token = client.http_client.auth[1]  # Get the auth token from the client
        
        # Your Twilio WhatsApp number
        from_number = 'whatsapp:+14155238886'  # Twilio's sandbox number
        
        # Format the recipient's number for WhatsApp
        if not to_number.startswith('+'):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Phone number must start with + and be in E.164 format"}
            )
            
        to_whatsapp = f'whatsapp:{to_number}'
        
        # Add emergency prefix to message
        emergency_message = f"🚨 EMERGENCY: {message}"
        
        print(f"\nSending WhatsApp emergency to {to_whatsapp}: {emergency_message}")
        
        # In simulation mode, just print the message
        if os.environ.get("SIMULATE_CALLS", "false").lower() == "true":
            print(f"\n📱 [SIMULATED WHATSAPP] Emergency message to {to_number}: \"{emergency_message}\"")
            
            return {
                "status": "success", 
                "message_sid": "SM" + str(uuid.uuid4())[:16], 
                "message": "Emergency WhatsApp message sent successfully (SIMULATED)",
                "simulated": True
            }
        
        # Send the message
        message = client.messages.create(
            from_=from_number,
            body=emergency_message,
            to=to_whatsapp
        )
        
        print(f"Emergency message sent! SID: {message.sid}")
        
        return {
            "status": "success", 
            "message_sid": message.sid, 
            "message": "Emergency WhatsApp message sent successfully"
        }
    except Exception as e:
        print(f"❌ Error sending WhatsApp emergency: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error sending WhatsApp message: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    
    try:
        # Set SIMULATE_CALLS to false by default to enable real calls
        if "SIMULATE_CALLS" not in os.environ:
            os.environ["SIMULATE_CALLS"] = "false"
            print("SIMULATE_CALLS not set, defaulting to false for real calls")
            print("Set SIMULATE_CALLS=true explicitly if you want to simulate calls")
            
        print("\n============================================")
        print("IMPORTANT TWILIO CALL INFORMATION")
        print("============================================")
        try:
            twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID", "NOT_CONFIGURED")
            print(f"Using Twilio account: {twilio_sid[:7] if len(twilio_sid) > 7 else 'NOT_CONFIGURED'}...")
            print(f"From number: {FROM_VERIFIED_NUMBER}")
            print(f"Default to number: {TO_VERIFIED_NUMBER}")
        except Exception as e:
            print(f"Twilio info error: {str(e)}")
            print("Forcing simulation mode")
            os.environ["SIMULATE_CALLS"] = "true"
        
        print(f"Simulating calls: {os.environ.get('SIMULATE_CALLS', 'false')}")
        
        # Initialize ngrok to make sure we have a public URL
        webhook_url = initialize_ngrok_if_needed()
        print(f"Webhook URL: {webhook_url}")
        print("============================================")
            
        # Set higher limits for file uploads
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=8081,  # Change port to 8081
            reload=False,  # Disable reload to avoid issues with WebSockets
            limit_concurrency=100,  # Significantly increase concurrency limit
            limit_max_requests=10000,  # Increase max requests
            timeout_keep_alive=120,  # Keep connections alive for 2 minutes
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server error: {str(e)}")
    finally:
        # Clean up ngrok and other resources
        try:
            ngrok_cleanup()
            print("Cleaned up ngrok resources")
        except Exception as e:
            print(f"Error cleaning up: {str(e)}")