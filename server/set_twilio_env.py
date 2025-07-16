#!/usr/bin/env python3
"""
Twilio Configuration Helper

This script helps you set up your Twilio credentials and phone numbers
for use with the phone call functionality.
"""

import os
import sys
import subprocess
import platform

def main():
    print("=" * 50)
    print("Twilio Configuration Helper")
    print("=" * 50)
    print("\nThis script will help you set up your Twilio credentials.")
    print("You'll need your Twilio Account SID, Auth Token, and phone numbers.\n")
    
    # Get Twilio Account SID
    account_sid = input("Enter your Twilio Account SID (starts with 'AC'): ").strip()
    if not account_sid.startswith("AC"):
        print("Warning: Twilio Account SIDs typically start with 'AC'")
        proceed = input("Continue anyway? (y/n): ").lower()
        if proceed != 'y':
            print("Exiting...")
            return
    
    # Get Twilio Auth Token
    auth_token = input("Enter your Twilio Auth Token: ").strip()
    if len(auth_token) < 10:
        print("Warning: Twilio Auth Token seems too short")
        proceed = input("Continue anyway? (y/n): ").lower()
        if proceed != 'y':
            print("Exiting...")
            return
    
    # Get From Number (Twilio number)
    from_number = input("Enter your Twilio phone number (in E.164 format, e.g., +1234567890): ").strip()
    if not from_number.startswith("+"):
        print("Warning: Phone numbers should be in E.164 format and start with '+'")
        proceed = input("Continue anyway? (y/n): ").lower()
        if proceed != 'y':
            print("Exiting...")
            return
            
    # Get To Number (default recipient)
    to_number = input("Enter the default recipient phone number (in E.164 format, e.g., +1234567890): ").strip()
    if not to_number.startswith("+"):
        print("Warning: Phone numbers should be in E.164 format and start with '+'")
        proceed = input("Continue anyway? (y/n): ").lower()
        if proceed != 'y':
            print("Exiting...")
            return
    
    # Set environment variables
    os_type = platform.system()
    
    print("\nSetting environment variables...")
    
    if os_type == "Windows":
        # For Windows
        try:
            subprocess.run(f'setx TWILIO_ACCOUNT_SID "{account_sid}"', shell=True, check=True)
            subprocess.run(f'setx TWILIO_AUTH_TOKEN "{auth_token}"', shell=True, check=True)
            subprocess.run(f'setx TWILIO_FROM_NUMBER "{from_number}"', shell=True, check=True)
            subprocess.run(f'setx TWILIO_TO_NUMBER "{to_number}"', shell=True, check=True)
            print("\nEnvironment variables set successfully for Windows!")
            print("Please restart your command prompt or terminal for changes to take effect.")
        except subprocess.CalledProcessError as e:
            print(f"Error setting environment variables: {e}")
            print("You may need to run this script as an administrator.")
    else:
        # For macOS/Linux
        shell_type = os.environ.get("SHELL", "").split("/")[-1]
        shell_config = ""
        
        if shell_type == "bash":
            shell_config = "~/.bashrc"
        elif shell_type == "zsh":
            shell_config = "~/.zshrc"
        else:
            shell_config = "your shell configuration file"
        
        print(f"\nTo set environment variables permanently, add these lines to {shell_config}:")
        print(f'export TWILIO_ACCOUNT_SID="{account_sid}"')
        print(f'export TWILIO_AUTH_TOKEN="{auth_token}"')
        print(f'export TWILIO_FROM_NUMBER="{from_number}"')
        print(f'export TWILIO_TO_NUMBER="{to_number}"')
        
        # Set for current session
        os.environ["TWILIO_ACCOUNT_SID"] = account_sid
        os.environ["TWILIO_AUTH_TOKEN"] = auth_token
        os.environ["TWILIO_FROM_NUMBER"] = from_number
        os.environ["TWILIO_TO_NUMBER"] = to_number
        
        print("\nEnvironment variables set for the current terminal session only.")
        print("Add them to your shell config file for permanent effect.")
    
    # Create a .env file
    create_env = input("\nCreate a .env file with these settings? (y/n): ").lower()
    if create_env == 'y':
        with open(os.path.join(os.path.dirname(__file__), ".env"), "w") as f:
            f.write(f'TWILIO_ACCOUNT_SID="{account_sid}"\n')
            f.write(f'TWILIO_AUTH_TOKEN="{auth_token}"\n')
            f.write(f'TWILIO_FROM_NUMBER="{from_number}"\n')
            f.write(f'TWILIO_TO_NUMBER="{to_number}"\n')
        print(".env file created successfully!")
    
    print("\n" + "=" * 50)
    print("Setup Complete!")
    print("=" * 50)
    print("\nYou can now run the server with your Twilio credentials.")
    print("Or manually set the following environment variables:")
    print(f'TWILIO_ACCOUNT_SID="{account_sid}"')
    print(f'TWILIO_AUTH_TOKEN="{auth_token}"')
    print(f'TWILIO_FROM_NUMBER="{from_number}"')
    print(f'TWILIO_TO_NUMBER="{to_number}"')

if __name__ == "__main__":
    main() 