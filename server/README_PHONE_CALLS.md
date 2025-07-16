# Phone Call Functionality

This document provides information about setting up and troubleshooting the phone call functionality in the application.

## Setup Requirements

To use the phone call functionality, you need:

1. A Twilio account (free trial account is fine)
2. A Twilio phone number
3. Your Twilio Account SID and Auth Token
4. Your recipient's phone number verified in Twilio (for trial accounts)
5. Ngrok installed (for development)

## Setting Up Your Twilio Credentials

### Option 1: Using the Setup Script

Run the setup script to configure your Twilio credentials:

```bash
python set_twilio_env.py
```

Follow the prompts to enter your Twilio Account SID, Auth Token, and phone numbers.

### Option 2: Manual Setup

Set the following environment variables:

```bash
# Windows
set TWILIO_ACCOUNT_SID=your_account_sid
set TWILIO_AUTH_TOKEN=your_auth_token
set TWILIO_FROM_NUMBER=your_twilio_number
set TWILIO_TO_NUMBER=recipient_number

# Mac/Linux
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_FROM_NUMBER=your_twilio_number
export TWILIO_TO_NUMBER=recipient_number
```

Alternatively, create a `.env` file in the `server` directory with the following content:

```
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_FROM_NUMBER="your_twilio_number"
TWILIO_TO_NUMBER="recipient_number"
```

## Important Notes for Twilio Trial Accounts

If you're using a Twilio trial account:

1. You must verify recipient phone numbers before calling them.
2. Verify phone numbers in the Twilio console: https://www.twilio.com/console/phone-numbers/verified
3. All outgoing calls will have a Twilio trial message prefix.

## Troubleshooting

### No Call Received on Mobile

Check the following:

1. **Phone Number Format**: Ensure the phone number is in E.164 format (e.g., +1234567890).
2. **Phone Number Verification**: For trial accounts, verify that the recipient number is verified in your Twilio account.
3. **Twilio Credentials**: Check that your Account SID and Auth Token are correct.
4. **Twilio Balance**: Ensure your Twilio account has sufficient credits.
5. **Server Logs**: Check the server logs for error messages when making a call.

### Webhook URL Issues

For production deployment:

1. You need a public URL for Twilio webhooks. The application uses ngrok in development.
2. For production, set the `WEBHOOK_URL` environment variable to your public URL.

### Development Mode

To enable development mode with simulated calls (no actual Twilio interaction):

```bash
export SIMULATE_CALLS=true
```

This is useful for testing the UI without making actual phone calls.

## Twilio Resources

- [Twilio Console](https://www.twilio.com/console)
- [Verify Phone Numbers](https://www.twilio.com/console/phone-numbers/verified)
- [Twilio Documentation](https://www.twilio.com/docs) 