from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import torch
import numpy as np
import cv2
import mediapipe as mp
from transformers import AutoImageProcessor, SiglipForImageClassification
import base64
import uvicorn

app = FastAPI()

# CORS setup for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify actual origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model from Hugging Face
print("Loading model...")
model_name = "prithivMLmods/Alphabet-Sign-Language-Detection"
processor = AutoImageProcessor.from_pretrained(model_name)
model = SiglipForImageClassification.from_pretrained(model_name)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")
model.to(device)
model.eval()

# Initialize MediaPipe Hand solution
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.2,
    min_tracking_confidence=0.2
)
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_utils.DrawingSpec(color=(0, 255, 0), thickness=2)

# Global variables for prediction smoothing
last_predictions = []
prediction_smoothing_window = 5
confidence_threshold = 0.4

# Language mappings - we can extend this for additional sign language support
language_models = {
    "ase": "prithivMLmods/Alphabet-Sign-Language-Detection",  # American Sign Language
    "bsl": "prithivMLmods/Alphabet-Sign-Language-Detection",  # British Sign Language (using same model as placeholder)
    "auslan": "prithivMLmods/Alphabet-Sign-Language-Detection",  # Australian Sign Language (using same model as placeholder)
    "isl": "prithivMLmods/Alphabet-Sign-Language-Detection",  # International Sign Language (using same model as placeholder)
}

@app.get("/")
async def root():
    return {"status": "ok", "message": "Sign Language Detection API is running"}

@app.get("/api/sign-to-text")
async def api_status():
    """API status endpoint - helps the frontend check if the backend is running"""
    return {"status": "ok", "message": "Sign Language Detection API is running"}

# Old API endpoint (for backward compatibility)
@app.post("/predict")
async def predict_legacy(file: UploadFile = File(...)):
    """Legacy endpoint for backward compatibility"""
    result = await process_image(file, "ase")
    return result

# New API endpoint
@app.post("/api/sign-to-text/predict")
async def predict(file: UploadFile = File(...), language: str = "ase"):
    """
    Process an image and detect sign language gestures
    
    Args:
        file: The image file to process
        language: The sign language to use (ase, bsl, auslan, isl)
    """
    result = await process_image(file, language)
    return result

async def process_image(file: UploadFile, language: str = "ase"):
    """Common image processing function used by both endpoints"""
    global last_predictions
    
    try:
        print(f"Processing image from {file.filename}, language: {language}")
        contents = await file.read()
        
        # Convert to cv2 image format
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None or img.size == 0:
            print("Invalid image data received")
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Process the entire frame first
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)
        
        # Create a debug image with the same dimensions as the input
        debug_img = img.copy()
        
        predicted_letter = "None"
        confidence = 0.0
        has_hand = False
        hand_roi_base64 = None
        
        # Process hand landmarks if detected
        if results.multi_hand_landmarks:
            has_hand = True
            hand_landmarks = results.multi_hand_landmarks[0]  # Use the first hand
            
            # Draw landmarks on debug image
            mp_drawing.draw_landmarks(
                debug_img,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles
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
                    inputs = processor(images=image, return_tensors="pt").to(device)
                    
                    with torch.no_grad():
                        outputs = model(**inputs)
                    
                    # Get confidence scores
                    logits = outputs.logits[0]
                    probabilities = torch.nn.functional.softmax(logits, dim=0)
                    predicted_idx = torch.argmax(probabilities).item()
                    confidence = probabilities[predicted_idx].item()
                    
                    # Get the predicted letter
                    raw_prediction = model.config.id2label[predicted_idx]
                    
                    # BSL-specific adjustments
                    if language.lower() == "bsl" and raw_prediction in ["J", "Z"]:
                        # BSL J and Z involve motion, not always distinguishable in static frames
                        raw_prediction = "I" if raw_prediction == "J" else "Y"
                    
                    # Add to smoothing window
                    last_predictions.append((raw_prediction, confidence))
                    if len(last_predictions) > prediction_smoothing_window:
                        last_predictions.pop(0)
                    
                    # Find most common prediction with confidence weighting
                    if len(last_predictions) > 0:
                        prediction_count = {}
                        for p, c in last_predictions:
                            if p not in prediction_count:
                                prediction_count[p] = 0
                            prediction_count[p] += c
                        
                        # Get the prediction with highest weighted count
                        predicted_letter = max(prediction_count, key=prediction_count.get)
                        confidence = prediction_count[predicted_letter] / len(last_predictions)
                        
                        if confidence < confidence_threshold:
                            predicted_letter = "Uncertain"
        
        # Encode debug image to base64 for frontend
        _, buffer = cv2.imencode('.jpg', debug_img)
        debug_image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        result = {
            "prediction": predicted_letter,
            "confidence": float(confidence),
            "has_hand": has_hand,
            "debug_image": debug_image_base64,
            "hand_roi": hand_roi_base64  # Adding the hand ROI image
        }
        
        print(f"Prediction: {predicted_letter}, confidence: {confidence:.2f}, has_hand: {has_hand}")
        return result
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)