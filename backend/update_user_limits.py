#!/usr/bin/env python3
"""
Script to update user limits in Supabase
Usage: python backend/update_user_limits.py
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def update_user_to_unlimited(email: str):
    """Update a user to have unlimited access"""
    try:
        # First, find the user by email
        response = supabase.table('users').select('*').eq('email', email).execute()
        
        if not response.data or len(response.data) == 0:
            print(f"❌ User not found with email: {email}")
            return False
        
        user = response.data[0]
        user_id = user['id']
        print(f"✅ Found user: {email} (ID: {user_id})")
        
        # Update user_limits to unlimited
        update_response = supabase.table('user_limits').upsert({
            'user_id': user_id,
            'subscription_tier': 'enterprise',
            'subscription_status': 'active',
            'monthly_minute_limit': 999999,  # Effectively unlimited
            'minutes_used_this_month': 0
        }).execute()
        
        print(f"✅ Successfully updated {email} to unlimited access!")
        print(f"   Subscription Tier: enterprise")
        print(f"   Monthly Limit: 999,999 minutes")
        print(f"   Status: active")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating user: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Update michael.a.grandy@gmail.com (note: might be typo for grande)
    emails_to_update = [
        "michael.a.grandy@gmail.com",
        "michael.a.grande@gmail.com"  # Try both spellings
    ]
    
    for email in emails_to_update:
        print(f"\n🔄 Attempting to update: {email}")
        update_user_to_unlimited(email)




