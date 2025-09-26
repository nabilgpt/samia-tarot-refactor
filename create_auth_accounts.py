#!/usr/bin/env python3
"""
Create authentication accounts in Supabase for each role
Password: nabil123 for all accounts
"""

import os
import json
import requests
import hashlib
import bcrypt
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ciwddvprfhlqidfzklaq.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpd2RkdnByZmhscWlkZnprbGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI0ODgxMCwiZXhwIjoyMDcyODI0ODEwfQ.g6s6ximZccEgqgxN5nBoSMptkBgMS4zJIvuCGiXX5ew"

# Test accounts to create
accounts = [
    {
        "email": "sa@samiatarot.com",
        "password": "nabil123",
        "role": "superadmin",
        "first_name": "Super",
        "last_name": "Admin"
    },
    {
        "email": "admin@samiatarot.com",
        "password": "nabil123",
        "role": "admin",
        "first_name": "Platform",
        "last_name": "Admin"
    },
    {
        "email": "reader@samiatarot.com",
        "password": "nabil123",
        "role": "reader",
        "first_name": "Spiritual",
        "last_name": "Reader"
    },
    {
        "email": "monitor@samiatarot.com",
        "password": "nabil123",
        "role": "monitor",
        "first_name": "Content",
        "last_name": "Monitor"
    },
    {
        "email": "client@samiatarot.com",
        "password": "nabil123",
        "role": "client",
        "first_name": "Test",
        "last_name": "Client"
    }
]

def main():
    """Create authentication accounts via Supabase Admin API"""

    print("Creating SAMIA TAROT test accounts...")

    # Initialize Supabase client with service role key
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    for account in accounts:
        try:
            print(f"Creating account: {account['email']} ({account['role']})")

            # Create user in auth.users
            result = supabase.auth.admin.create_user({
                "email": account["email"],
                "password": account["password"],
                "email_confirm": True,
                "user_metadata": {
                    "first_name": account["first_name"],
                    "last_name": account["last_name"],
                    "role": account["role"]
                }
            })

            if result.user:
                print(f"  + Auth user created: {result.user.id}")

                # Update the profiles table with the actual auth user ID
                profile_update = supabase.table("profiles").upsert({
                    "id": result.user.id,
                    "email": account["email"],
                    "first_name": account["first_name"],
                    "last_name": account["last_name"],
                    "email_verified": True
                }).execute()

                print(f"  + Profile updated successfully")

            else:
                print(f"  - Failed to create user: {account['email']}")

        except Exception as e:
            print(f"  - Error creating {account['email']}: {str(e)}")
            # Try to continue with other accounts
            continue

    print("Account creation completed!")
    print("\nTest Account Credentials:")
    print("=" * 50)
    for account in accounts:
        print(f"{account['email']} - Password: {account['password']} ({account['role']})")

if __name__ == "__main__":
    main()