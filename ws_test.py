import asyncio
import websockets
import json
import os
import cv2
import numpy as np

async def test_websocket():
    url = 'ws://localhost:8000/ws/call/test_sid'
    print(f'Connecting to {url}...')
    
    try:
        async with websockets.connect(url) as ws:
            print('Connected!')
            
            # Receive the initial connection status message
            msg = await ws.recv()
            print(f'Received: {msg}')
            data = json.loads(msg)
            print(f'Message type: {data.get("type")}')
            
            # Receive the model status message
            msg = await ws.recv()
            print(f'Received: {msg}')
            data = json.loads(msg)
            print(f'Message type: {data.get("type")}')
            
            # Create a test image (black square)
            print("Creating test image...")
            test_img = np.zeros((300, 300, 3), dtype=np.uint8)
            # Draw a simple hand-like shape
            cv2.rectangle(test_img, (100, 100), (200, 200), (255, 255, 255), -1)
            
            # Encode image to JPEG
            _, img_encoded = cv2.imencode('.jpg', test_img)
            
            # Send the image
            print("Sending test image...")
            await ws.send(img_encoded.tobytes())
            
            # Receive the sign detection response
            msg = await ws.recv()
            print(f'Received detection: {msg}')
            data = json.loads(msg)
            print(f'Detection type: {data.get("type")}')
            print(f'Detected letter: {data.get("letter")}')
            print(f'Confidence: {data.get("confidence")}')
            
            # Close the connection
            await ws.close()
            print('Connection closed.')
    except Exception as e:
        print(f'Error: {str(e)}')

if __name__ == "__main__":
    asyncio.run(test_websocket()) 