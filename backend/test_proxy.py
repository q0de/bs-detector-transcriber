#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to verify proxy configuration works with YouTube
"""
import os
import sys
from dotenv import load_dotenv
import yt_dlp

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()

def test_proxy(custom_video_url=None):
    """Test if proxy works with YouTube"""
    
    # Get proxy from environment
    proxy_url = os.environ.get('PROXY_URL')
    
    print("=" * 60)
    print("🧪 PROXY TEST FOR YOUTUBE")
    print("=" * 60)
    print()
    
    if not proxy_url:
        print("⚠️  No PROXY_URL environment variable found")
        print("   Set it in your .env file or environment:")
        print("   PROXY_URL=http://username:password@proxy.com:port")
        print()
        print("📊 Testing WITHOUT proxy (may fail on datacenter IPs)...")
        print()
    else:
        print(f"✅ PROXY_URL found: {proxy_url[:20]}... (hidden for security)")
        print()
    
    # Test video URL (use custom or default)
    test_video = custom_video_url or "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Astley - Never Gonna Give You Up
    print(f"🎯 Test video: {test_video}")
    print()
    
    # Configure yt-dlp options (same as your app)
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'extract_flat': False,
        # Anti-bot detection measures
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
                'player_skip': ['webpage', 'configs'],
            }
        },
        # Rotate user agents
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us,en;q=0.5',
            'Sec-Fetch-Mode': 'navigate',
        },
    }
    
    # Add proxy if configured
    if proxy_url:
        ydl_opts['proxy'] = proxy_url
    
    print("🔍 Testing video metadata extraction...")
    print("-" * 60)
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("⏳ Fetching video info (this may take a few seconds)...")
            info = ydl.extract_info(test_video, download=False)
            
            print()
            print("✅ SUCCESS! Proxy/configuration works!")
            print("=" * 60)
            print(f"📹 Video Title: {info.get('title', 'Unknown')}")
            print(f"👤 Channel: {info.get('uploader', 'Unknown')}")
            print(f"⏱️  Duration: {info.get('duration', 0)} seconds ({info.get('duration', 0)/60:.1f} minutes)")
            print(f"👁️  Views: {info.get('view_count', 'Unknown'):,}" if info.get('view_count') else "👁️  Views: Unknown")
            print(f"📅 Upload Date: {info.get('upload_date', 'Unknown')}")
            print()
            
            # Check if transcript is available
            print("📝 Checking for transcripts...")
            if info.get('subtitles') or info.get('automatic_captions'):
                print("   ✅ Transcripts available!")
                if info.get('subtitles'):
                    print(f"   Languages: {', '.join(info.get('subtitles', {}).keys())}")
            else:
                print("   ⚠️  No transcripts found (this is OK, Whisper can still transcribe)")
            
            print()
            print("=" * 60)
            print("🎉 TEST PASSED!")
            print("=" * 60)
            
            if proxy_url:
                print("✅ Your proxy is working correctly with YouTube!")
            else:
                print("✅ Direct connection works (no proxy needed)!")
            
            print()
            print("Your video transcription app should work fine.")
            return True
            
    except Exception as e:
        print()
        print("❌ TEST FAILED!")
        print("=" * 60)
        print(f"Error: {str(e)}")
        print()
        
        error_msg = str(e).lower()
        
        if 'bot' in error_msg or 'sign in' in error_msg:
            print("🔍 Diagnosis: YouTube is detecting bot/automated access")
            print()
            if proxy_url:
                print("Possible issues:")
                print("  1. Proxy credentials are incorrect")
                print("  2. Proxy is not a residential proxy (datacenter IPs are blocked)")
                print("  3. Proxy is overused/flagged by YouTube")
            else:
                print("Solution:")
                print("  ⚠️  You NEED a residential proxy!")
                print("  Your server's datacenter IP is blocked by YouTube.")
                print()
                print("  Recommended proxy services:")
                print("  - Webshare.io (~$3/month): https://webshare.io")
                print("  - Smartproxy (~$14/month): https://smartproxy.com")
                print("  - BrightData (~$50/month): https://brightdata.com")
                
        elif 'proxy' in error_msg or 'connection' in error_msg:
            print("🔍 Diagnosis: Proxy connection issue")
            print()
            print("Possible issues:")
            print("  1. PROXY_URL format is incorrect")
            print("     Should be: http://username:password@host:port")
            print("  2. Proxy server is down")
            print("  3. Firewall blocking proxy connection")
            print("  4. Proxy credentials expired")
            
        else:
            print("🔍 Diagnosis: Unknown error")
            print()
            print("Try running with more verbose output:")
            print("  python test_proxy.py --verbose")
        
        print()
        print("=" * 60)
        return False

def test_youtube_transcript_api():
    """Test if YouTube Transcript API works (doesn't need proxy)"""
    print()
    print("=" * 60)
    print("🧪 TESTING YOUTUBE TRANSCRIPT API (No proxy needed)")
    print("=" * 60)
    print()
    
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        test_video_id = "dQw4w9WgXcQ"
        print(f"🎯 Fetching transcript for video: {test_video_id}")
        print("⏳ This uses YouTube's official transcript API...")
        print()
        
        # Use the correct API method
        transcript = YouTubeTranscriptApi.get_transcript(test_video_id, languages=['en'])
        
        print("✅ SUCCESS! YouTube Transcript API works!")
        print("=" * 60)
        print(f"📝 Found {len(transcript)} transcript segments")
        print()
        print("First few segments:")
        for entry in transcript[:3]:
            print(f"  [{entry['start']:.1f}s] {entry['text']}")
        print("  ...")
        print()
        print("🎉 This method works WITHOUT a proxy!")
        print("   Most videos with captions will use this fast method.")
        print()
        return True
        
    except Exception as e:
        print(f"⚠️  Transcript API failed: {str(e)}")
        print("   (This is OK - fallback to Whisper will be used)")
        print()
        return False

if __name__ == '__main__':
    print()
    
    # Check if user provided a custom video URL
    custom_video = None
    if len(sys.argv) > 1:
        custom_video = sys.argv[1]
        print(f"📹 Testing custom video: {custom_video}")
        print()
    
    # Test YouTube Transcript API first (fastest, no proxy needed)
    transcript_works = test_youtube_transcript_api()
    
    print()
    
    # Test yt-dlp with proxy
    proxy_works = test_proxy(custom_video)
    
    print()
    print("=" * 60)
    print("📊 FINAL SUMMARY")
    print("=" * 60)
    print()
    
    if transcript_works:
        print("✅ YouTube Transcript API: WORKING")
        print("   Most videos will be processed quickly without needing proxy")
        print()
    else:
        print("⚠️  YouTube Transcript API: NOT WORKING")
        print("   Will fall back to downloading + Whisper (needs proxy)")
        print()
    
    if proxy_works:
        print("✅ yt-dlp with proxy: WORKING")
        print("   Videos without transcripts can be downloaded and transcribed")
        print()
    else:
        print("❌ yt-dlp: NOT WORKING")
        print("   Videos without transcripts will fail")
        print()
    
    if transcript_works or proxy_works:
        print("🎉 Overall: Your setup can process videos!")
    else:
        print("⚠️  Overall: You need to set up a proxy to process videos")
        print("   Add PROXY_URL to your .env file")
    
    print()
    sys.exit(0 if (transcript_works or proxy_works) else 1)

