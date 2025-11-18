#!/usr/bin/env python3
"""
Test IPRoyal proxy connection
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Get proxy credentials
proxy_host = os.getenv('PROXY_HOST')
proxy_port = os.getenv('PROXY_PORT')
proxy_username = os.getenv('PROXY_USERNAME')
proxy_password = os.getenv('PROXY_PASSWORD')

print("=== IPRoyal Proxy Test ===\n")
print(f"Proxy Host: {proxy_host}")
print(f"Proxy Port: {proxy_port}")
print(f"Username: {proxy_username[:10]}..." if proxy_username else "None")
print(f"Password: {'*' * 10}" if proxy_password else "None")
print()

if not all([proxy_host, proxy_port, proxy_username, proxy_password]):
    print("[ERROR] Missing proxy credentials!")
    exit(1)

# Build proxy URL
proxy_url = f"http://{proxy_username}:{proxy_password}@{proxy_host}:{proxy_port}"
proxies = {
    'http': proxy_url,
    'https': proxy_url
}

print(f"Testing proxy: {proxy_username}@{proxy_host}:{proxy_port}\n")

# Test 1: Check IP
print("Test 1: Checking IP address...")
try:
    response = requests.get('https://api.ipify.org?format=json', proxies=proxies, timeout=10)
    if response.status_code == 200:
        print(f"[OK] IP: {response.json()['ip']}")
    else:
        print(f"[ERROR] Status: {response.status_code}")
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {str(e)}")

print()

# Test 2: YouTube connection
print("Test 2: Connecting to YouTube...")
try:
    response = requests.get('https://www.youtube.com', proxies=proxies, timeout=10)
    if response.status_code == 200:
        print(f"[OK] YouTube responded: {response.status_code}")
    else:
        print(f"[WARNING] YouTube status: {response.status_code}")
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {str(e)}")

print()

# Test 3: YouTube API
print("Test 3: Testing YouTube video metadata...")
try:
    test_video_url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    response = requests.get(test_video_url, proxies=proxies, timeout=10)
    if response.status_code == 200:
        print(f"[OK] Video page accessible")
    else:
        print(f"[WARNING] Status: {response.status_code}")
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {str(e)}")

print("\n=== Test Complete ===")

