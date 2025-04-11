# from flask import Flask, request
# from twilio.rest import Client
# from twilio.twiml.voice_response import VoiceResponse
# import urllib.parse
# import time
# import threading
# import requests
# import json
# import os
# import subprocess
# import sys

# # Initialize Flask app
# app = Flask(__name__)

# # Your Twilio credentials
# TWILIO_ACCOUNT_SID = "AC65cf80f2e955b8cf8f3d64db79d1f6da"
# TWILIO_AUTH_TOKEN = "2207cfd10b107277e68ef44633bfa4ce"

# # Phone numbers in E.164 format
# FROM_VERIFIED_NUMBER = "+19379153955"
# TO_VERIFIED_NUMBER = "+919920611134"

# # Initialize Twilio client
# client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# # Global variables to track state
# call_active = False
# receiver_call_sid = None
# conference_name = None
# WEBHOOK_BASE_URL = None
# ngrok_process = None

# # Store messages queue
# message_queue = []

# def is_ngrok_running():
#     """Check if ngrok is already running by trying to connect to its API"""
#     try:
#         response = requests.get("http://localhost:4040/api/tunnels", timeout=2)
#         return response.status_code == 200
#     except:
#         return False

# def start_ngrok():
#     """Start ngrok if it's not already running"""
#     global ngrok_process
    
#     if is_ngrok_running():
#         print("Ngrok is already running")
#         return True
    
#     try:
#         # Check if ngrok.exe exists in the current directory
#         ngrok_path = os.path.join(os.getcwd(), "ngrok.exe")
#         if not os.path.exists(ngrok_path):
#             print(f"Error: ngrok.exe not found in {os.getcwd()}")
#             return False
        
#         # Start ngrok with HTTP protocol on port 5001 (where Flask will run)
#         cmd = [ngrok_path, "http", "5001"]
        
#         # Use subprocess.DEVNULL to hide console output from ngrok
#         ngrok_process = subprocess.Popen(
#             cmd, 
#             stdout=subprocess.DEVNULL, 
#             stderr=subprocess.DEVNULL,
#             creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
#         )
        
#         print("Started ngrok process")
        
#         # Wait for ngrok to start and create tunnels
#         max_attempts = 10
#         for i in range(max_attempts):
#             if is_ngrok_running():
#                 print("Ngrok is now running")
#                 return True
#             print(f"Waiting for ngrok to start (attempt {i+1}/{max_attempts})...")
#             time.sleep(2)
        
#         print("Failed to start ngrok within the expected time")
#         return False
#     except Exception as e:
#         print(f"Error starting ngrok: {str(e)}")
#         return False

# def get_ngrok_url():
#     """Get the ngrok URL from the ngrok API"""
#     try:
#         # Connect to the ngrok API
#         response = requests.get("http://localhost:4040/api/tunnels")
#         if response.status_code == 200:
#             tunnels = json.loads(response.text)['tunnels']
#             for tunnel in tunnels:
#                 if tunnel['proto'] == 'https':
#                     return tunnel['public_url']
            
#             # If no https tunnel found, use http
#             for tunnel in tunnels:
#                 if tunnel['proto'] == 'http':
#                     return tunnel['public_url']
                    
#         print("Error: Could not find any active ngrok tunnels.")
#         return None
#     except Exception as e:
#         print(f"Error getting ngrok URL: {str(e)}")
#         return None

# @app.route("/empty", methods=['GET', 'POST'])
# def empty():
#     """Empty TwiML response for silence"""
#     response = VoiceResponse()
#     return str(response)

# @app.route("/announce", methods=['GET', 'POST'])
# def announce():
#     """Endpoint for playing announcements"""
#     message = request.args.get('message', '')
#     conf_name = request.args.get('conference', '')
    
#     response = VoiceResponse()
#     response.say(message)
    
#     # Add a pause to keep the call connected
#     response.pause(length=1)
    
#     # Return to the conference
#     response.redirect(f"{WEBHOOK_BASE_URL}/rejoin?conference={conf_name}")
    
#     return str(response)

# @app.route("/rejoin", methods=['GET', 'POST'])
# def rejoin():
#     """Endpoint to rejoin the conference after an announcement"""
#     conf = request.args.get('conference')
#     response = VoiceResponse()
#     dial = response.dial()
#     dial.conference(
#         conf,
#         beep=False,
#         start_conference_on_enter=False,
#         end_conference_on_exit=False,
#         wait_url=f"{WEBHOOK_BASE_URL}/empty",  # Point to our empty endpoint for silence
#         wait_method='GET'
#     )
#     return str(response)

# @app.route("/voice", methods=['GET', 'POST'])
# def voice():
#     """Endpoint for incoming calls"""
#     message = request.args.get('message', '')  # Empty default message
#     conf_name = request.args.get('conference', 'default_conference')
    
#     response = VoiceResponse()
    
#     # Only say something if there's an actual message to say
#     if message:
#         response.say(message)
    
#     # Join the conference with no hold music
#     dial = response.dial()
#     dial.conference(
#         conf_name,
#         beep=False,
#         start_conference_on_enter=True,
#         end_conference_on_exit=True,
#         wait_url=f"{WEBHOOK_BASE_URL}/empty",  # Point to our empty endpoint for silence
#         wait_method='GET'
#     )
    
#     return str(response)

# @app.route("/sender", methods=['GET', 'POST'])
# def sender():
#     """Endpoint for the sender call"""
#     conf_name = request.args.get('conference', 'default_conference')
    
#     response = VoiceResponse()
#     dial = response.dial()
#     dial.conference(
#         conf_name,
#         beep=False,
#         start_conference_on_enter=False,
#         end_conference_on_exit=False,
#         wait_url=f"{WEBHOOK_BASE_URL}/empty",  # Point to our empty endpoint for silence
#         wait_method='GET'
#     )
    
#     return str(response)

# @app.route("/status_callback", methods=['GET', 'POST'])
# def status_callback():
#     """Status callback for tracking call state"""
#     global call_active
#     call_status = request.values.get('CallStatus', None)
    
#     if call_status in ['completed', 'busy', 'failed', 'no-answer']:
#         call_active = False
#         print(f"\nCall ended with status: {call_status}")
    
#     return '', 200

# def check_call_status():
#     """Check if the call is still active"""
#     global call_active
    
#     while call_active:
#         try:
#             # Check call status only
#             call = client.calls(receiver_call_sid).fetch()
#             if call.status in ['completed', 'busy', 'failed', 'no-answer']:
#                 call_active = False
#                 print("\nCall has ended (receiver disconnected).")
#                 break
#         except Exception as e:
#             print(f"Error checking call status: {str(e)}")
#             # If there's an error checking status, don't terminate the call
#             # Just wait and try again
        
#         time.sleep(3)  # Check every 3 seconds

# def send_message(message):
#     """Send a message to the ongoing call"""
#     global call_active
    
#     try:
#         # First try updating the call directly
#         client.calls(receiver_call_sid).update(
#             twiml=f'<Response><Say>{message}</Say><Pause length="1"/><Redirect>{WEBHOOK_BASE_URL}/voice?conference={conference_name}</Redirect></Response>'
#         )
#         print(f"Message sent: {message}")
#         return True
#     except Exception as e:
#         print(f"Error sending message: {str(e)}")
#         return False

# def message_sender_thread():
#     """Thread to process and send messages from the queue"""
#     global message_queue, call_active
    
#     while call_active:
#         # Check if there are messages to send
#         if message_queue:
#             try:
#                 message = message_queue.pop(0)
#                 print(f"Processing message: {message}")
                
#                 # Try to send the message
#                 success = send_message(message)
                
#                 # Wait a bit before processing next message
#                 time.sleep(3)
#             except Exception as e:
#                 print(f"Error in message sender: {str(e)}")
#                 time.sleep(1)
#         else:
#             # No messages to process, sleep briefly
#             time.sleep(0.5)

# def terminal_input_loop():
#     """Loop to get input from terminal during the call"""
#     global call_active, message_queue
    
#     print("\nCall is now active. You can type additional messages to say during the call.")
#     print("Type 'exit' to end the call manually.\n")
    
#     while call_active:
#         try:
#             user_input = input("Enter a message to say (or 'exit' to end call): ")
            
#             if user_input.lower() == 'exit':
#                 try:
#                     # End the call
#                     client.calls(receiver_call_sid).update(status='completed')
#                     call_active = False
#                     print("Call ended manually.")
#                     break
#                 except Exception as e:
#                     print(f"Error ending call: {e}")
#             elif user_input.strip():
#                 # Add message to queue
#                 message_queue.append(user_input)
#                 print(f"Message queued: {user_input}")
#         except Exception as e:
#             print(f"Error in terminal input: {str(e)}")
#             time.sleep(1)

# def make_interactive_call(to_number, initial_message):
#     global call_active, receiver_call_sid, conference_name
    
#     # URL encode the message parameter
#     encoded_message = urllib.parse.quote(initial_message)
    
#     # Generate a unique conference name
#     import uuid
#     conference_name = f"conf_{str(uuid.uuid4())[:8]}"
    
#     # First, make the call to the receiver
#     receiver_call = client.calls.create(
#         to=to_number,
#         from_=FROM_VERIFIED_NUMBER,
#         url=f"{WEBHOOK_BASE_URL}/voice?message={encoded_message}&conference={conference_name}",
#         status_callback=f"{WEBHOOK_BASE_URL}/status_callback",
#         status_callback_event=['completed', 'answered']
#     )
    
#     receiver_call_sid = receiver_call.sid
#     call_active = True
    
#     print(f"Call to receiver initiated with SID: {receiver_call_sid}")
#     print(f"Conference name: {conference_name}")
    
#     # Wait briefly to ensure the first call is processed
#     time.sleep(2)
    
#     # Now make a second call to the sender (you) to listen and respond
#     sender_call = client.calls.create(
#         to=FROM_VERIFIED_NUMBER,  # Calling back to the sender
#         from_=FROM_VERIFIED_NUMBER,
#         url=f"{WEBHOOK_BASE_URL}/sender?conference={conference_name}",
#     )
    
#     print(f"Call to sender initiated with SID: {sender_call.sid}")
    
#     # Start threads for monitoring and message sending
#     status_thread = threading.Thread(target=check_call_status)
#     status_thread.daemon = True
#     status_thread.start()
    
#     sender_thread = threading.Thread(target=message_sender_thread)
#     sender_thread.daemon = True
#     sender_thread.start()
    
#     # Start the terminal input loop (this will block until call ends)
#     terminal_input_loop()
    
#     return receiver_call_sid, sender_call.sid

# def cleanup():
#     """Clean up resources before exiting"""
#     global ngrok_process
    
#     # Terminate ngrok process if we started it
#     if ngrok_process:
#         try:
#             ngrok_process.terminate()
#             print("Ngrok process terminated")
#         except Exception as e:
#             print(f"Error terminating ngrok process: {str(e)}")

# if __name__ == "__main__":
#     print("NOTE: In trial mode, you can only call verified numbers.")
    
#     try:
#         # Start ngrok if it's not already running
#         if not start_ngrok():
#             print("Failed to start ngrok. Exiting.")
#             sys.exit(1)
        
#         # Wait a moment for ngrok to initialize fully
#         time.sleep(3)
        
#         # Get the ngrok URL
#         WEBHOOK_BASE_URL = get_ngrok_url()
#         if not WEBHOOK_BASE_URL:
#             print("Failed to get ngrok URL. Exiting.")
#             cleanup()
#             sys.exit(1)
        
#         print(f"Using ngrok URL: {WEBHOOK_BASE_URL}")
#         message_text = input("Enter the initial message to say on the call: ")
        
#         # Start the Flask app in a separate thread
#         def run_flask():
#             app.run(port=5001, debug=False)
        
#         flask_thread = threading.Thread(target=run_flask)
#         flask_thread.daemon = True
#         flask_thread.start()
        
#         # Wait for Flask to start
#         time.sleep(2)
        
#         # Make the call
#         receiver_sid, sender_sid = make_interactive_call(TO_VERIFIED_NUMBER, message_text)
        
#     except KeyboardInterrupt:
#         print("\nProgram interrupted by user")
#     except Exception as e:
#         print(f"An error occurred: {str(e)}")
#     finally:
#         # Clean up before exiting
#         cleanup()