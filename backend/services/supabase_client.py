from supabase import create_client, Client
import os

def get_supabase_client() -> Client:
    """Get Supabase client instance - uses service role key for backend operations"""
    url = os.getenv('SUPABASE_URL')
    # Try SUPABASE_SERVICE_ROLE_KEY first (Railway), then SUPABASE_KEY (local dev)
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set")
    
    return create_client(url, key)

