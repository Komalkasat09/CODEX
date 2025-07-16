from flask import Flask, request
from twilio.twiml.voice_response import VoiceResponse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/test-voice', methods=['GET', 'POST'])
def test_voice():
    """Respond to incoming voice calls with a simple message"""
    logger.info("Received voice webhook request")
    logger.info(f"Request data: {request.values}")
    logger.info(f"Request headers: {request.headers}")
    
    response = VoiceResponse()
    response.say('This is a test call from your app. If you hear this message, your call is working.')
    response.pause(length=1)
    response.say('Goodbye!')
    response.hangup()
    
    logger.info(f"Sending response: {str(response)}")
    return str(response)

@app.route('/test-status', methods=['GET', 'POST'])
def test_status():
    """Handle call status callbacks"""
    logger.info("Received status callback")
    logger.info(f"Call status: {request.values.get('CallStatus')}")
    logger.info(f"Call duration: {request.values.get('CallDuration')}")
    logger.info(f"All data: {request.values}")
    
    return '', 204

if __name__ == '__main__':
    logger.info("Starting test server on port 5001")
    app.run(host='0.0.0.0', port=5001, debug=True) 