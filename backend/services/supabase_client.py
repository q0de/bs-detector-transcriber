from supabase import create_client, Client
import os

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
    
    return create_client(url, key)

