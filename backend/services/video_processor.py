import yt_dlp
import os
import sys
import json
from anthropic import Anthropic
from openai import OpenAI
from datetime import datetime
import tempfile
import re
import requests
import difflib
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

# Add parent directory to path for imports (handles both direct and module imports)
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

try:
    from config import FeatureFlags
except ImportError:
    # Fallback: define FeatureFlags inline if config.py can't be found
    print(f"⚠️ Could not import config from {_parent_dir}, using default FeatureFlags")
    class FeatureFlags:
        USE_FASTER_AI_MODELS = os.getenv('USE_FASTER_AI_MODELS', 'false').lower() == 'true'
        USE_GLOBAL_CACHE = os.getenv('USE_GLOBAL_CACHE', 'false').lower() == 'true'
        USE_OPENAI_WHISPER = os.getenv('USE_OPENAI_WHISPER', 'false').lower() == 'true'
        USE_PARALLEL_PROCESSING = os.getenv('USE_PARALLEL_PROCESSING', 'false').lower() == 'true'
        USE_BACKGROUND_JOBS = os.getenv('USE_BACKGROUND_JOBS', 'false').lower() == 'true'
        
        @classmethod
        def get_status(cls):
            return {
                'faster_ai_models': cls.USE_FASTER_AI_MODELS,
                'global_cache': cls.USE_GLOBAL_CACHE,
                'openai_whisper': cls.USE_OPENAI_WHISPER,
                'parallel_processing': cls.USE_PARALLEL_PROCESSING,
                'background_jobs': cls.USE_BACKGROUND_JOBS,
            }

class VideoProcessor:
    def __init__(self):
        self.whisper_model = None
        self.whisper_module = None
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        try:
            self.proxy_url = self._get_proxy_url()
            if self.proxy_url:
                print(f"🌐 Proxy configured: {self.proxy_url.split('@')[1] if '@' in self.proxy_url else 'configured'}")
            else:
                print("⚠️ No proxy configured - using direct connection")
        except Exception as e:
            print(f"⚠️ Proxy configuration error (non-critical): {str(e)}")
            self.proxy_url = None
    
    def _get_proxy_url(self):
        """Build proxy URL from environment variables or use PROXY_URL if set"""
        try:
            from urllib.parse import quote
            
            # If PROXY_URL is directly set, use it
            proxy_url = os.environ.get('PROXY_URL', None)
            if proxy_url:
                print(f"🌐 Found PROXY_URL environment variable")
                return proxy_url
            
            # Otherwise, build from IPRoyal credentials
            proxy_host = os.environ.get('PROXY_HOST')
            proxy_port = os.environ.get('PROXY_PORT')
            proxy_username = os.environ.get('PROXY_USERNAME')
            proxy_password = os.environ.get('PROXY_PASSWORD')
            
            # Debug: Check what we found
            print(f"🔍 Proxy env check: HOST={bool(proxy_host)}, PORT={bool(proxy_port)}, USER={bool(proxy_username)}, PASS={bool(proxy_password)}")
            
            if proxy_host and proxy_port and proxy_username and proxy_password:
                # URL-encode username and password to handle special characters
                encoded_username = quote(proxy_username, safe='')
                encoded_password = quote(proxy_password, safe='')
                
                # Format: http://username:password@hostname:port
                proxy_url = f"http://{encoded_username}:{encoded_password}@{proxy_host}:{proxy_port}"
                print(f"✅ Built proxy URL from environment variables")
                
                # Test proxy connectivity
                self._test_proxy(proxy_url)
                
                return proxy_url
            else:
                print(f"⚠️ Missing proxy environment variables - need all 4: PROXY_HOST, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD")
            
            return None
        except Exception as e:
            print(f"⚠️ Error building proxy URL: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def _test_proxy(self, proxy_url):
        """Test if the proxy is working by making a simple request"""
        try:
            import requests
            proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            # Use a simple IP check service
            response = requests.get('https://api.ipify.org?format=json', proxies=proxies, timeout=10)
            if response.status_code == 200:
                ip = response.json().get('ip', 'unknown')
                print(f"✅ Proxy test successful - External IP: {ip}")
            else:
                print(f"⚠️ Proxy test returned status {response.status_code}")
        except Exception as e:
            print(f"⚠️ Proxy test failed (non-critical): {str(e)[:100]}")
    
    def _get_proxy_urls(self):
        """Get both HTTP and SOCKS5 proxy URLs (IPRoyal supports both)"""
        base_url = self.proxy_url
        if not base_url:
            return None, None
        
        # If it's already a full URL, extract components
        if base_url.startswith('http://'):
            # Extract: http://user:pass@host:port
            http_proxy = base_url
            # Try SOCKS5 format: socks5://user:pass@host:port
            socks5_proxy = base_url.replace('http://', 'socks5://')
            return http_proxy, socks5_proxy
        
        return base_url, None
    
    def auto_highlight_transcript(self, transcript, analysis):
        """Automatically add highlight tags to transcript based on claims.
        
        Uses multi-strategy matching:
        1. Exact match (case-insensitive)
        2. Fuzzy sentence matching (45% threshold)
        3. Sliding window matching
        4. Key phrase extraction
        5. Word overlap scoring
        """
        if not transcript or not isinstance(analysis, dict):
            return transcript
        
        print("🎨 Auto-highlighting transcript (Enhanced Multi-Strategy Matching)...")
        
        # Common words to ignore in word overlap scoring
        STOP_WORDS = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
            'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
            'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
            'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
            'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
            'because', 'until', 'while', 'although', 'though', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
            'which', 'who', 'whom', 'its', 'his', 'her', 'their', 'my', 'your',
            'our', 'me', 'him', 'them', 'us', 'also', 'like', 'really', 'actually',
            'basically', 'literally', 'think', 'know', 'say', 'said', 'says', 'going'
        }
        
        def get_content_words(text):
            """Extract meaningful content words from text"""
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            return [w for w in words if w not in STOP_WORDS]
        
        def word_overlap_score(text1, text2):
            """Calculate word overlap score between two texts"""
            words1 = set(get_content_words(text1))
            words2 = set(get_content_words(text2))
            if not words1 or not words2:
                return 0
            intersection = words1 & words2
            # Jaccard-like score weighted towards the claim (text1)
            return len(intersection) / len(words1) if words1 else 0
        
        def extract_key_phrases(text, min_words=3, max_words=5):
            """Extract distinctive phrases from text"""
            words = text.split()
            phrases = []
            # Get phrases of different lengths
            for length in range(min_words, min(max_words + 1, len(words) + 1)):
                for i in range(len(words) - length + 1):
                    phrase = ' '.join(words[i:i + length])
                    # Only include phrases with content words
                    content_words = get_content_words(phrase)
                    if len(content_words) >= 2:
                        phrases.append(phrase)
            return phrases
        
        def create_sliding_windows(text, window_words=75, overlap_words=25):
            """Create overlapping windows of text"""
            words = text.split()
            windows = []
            step = window_words - overlap_words
            for i in range(0, max(1, len(words) - window_words + 1), step):
                window_text = ' '.join(words[i:i + window_words])
                start_approx = text.find(words[i]) if i < len(words) else 0
                windows.append((window_text, start_approx))
            # Add remaining text as final window if needed
            if len(words) > window_words:
                remaining = ' '.join(words[-(window_words):])
                if remaining not in [w[0] for w in windows]:
                    windows.append((remaining, max(0, len(text) - len(remaining))))
            return windows
        
        def smart_split_transcript(text):
            """Split transcript into segments using multiple strategies"""
            segments = []
            
            # Strategy 1: Split by punctuation
            punct_segments = re.split(r'(?<=[.!?])\s+', text)
            segments.extend(punct_segments)
            
            # Strategy 2: Split by newlines
            newline_segments = text.split('\n')
            for seg in newline_segments:
                if seg.strip() and seg.strip() not in segments:
                    segments.append(seg.strip())
            
            # Strategy 3: Split by ellipsis (pauses)
            ellipsis_segments = re.split(r'\.{3,}|\s{3,}', text)
            for seg in ellipsis_segments:
                if seg.strip() and len(seg.strip()) > 20:
                    segments.append(seg.strip())
            
            # Strategy 4: Split by comma for long segments (creates sub-clauses)
            for seg in punct_segments:
                if len(seg) > 150:
                    comma_parts = seg.split(',')
                    for part in comma_parts:
                        if part.strip() and len(part.strip()) > 30:
                            segments.append(part.strip())
            
            # Remove duplicates while preserving order
            seen = set()
            unique_segments = []
            for seg in segments:
                normalized = ' '.join(seg.split())
                if normalized and normalized not in seen and len(normalized) > 15:
                    seen.add(normalized)
                    unique_segments.append(seg)
            
            return unique_segments
        
        # Collect all claims with their verdicts
        claims_with_tags = []
        
        for claim_type, tag in [
            ('verified_claims', '[VERIFIED]'),
            ('opinion_claims', '[OPINION]'),
            ('opinion_based_claims', '[OPINION]'),
            ('uncertain_claims', '[UNCERTAIN]'),
            ('false_claims', '[FALSE]')
        ]:
            claims_list = analysis.get(claim_type, [])
            if claims_list:
                for claim_obj in claims_list:
                    claim_text = claim_obj.get('claim', '').strip()
                    if claim_text and len(claim_text) > 10:
                        claims_with_tags.append((claim_text, tag))
        
        if not claims_with_tags:
            print("⚠️ No claims found to highlight")
            return transcript
        
        print(f"  📋 Found {len(claims_with_tags)} claims to highlight")
        
        # Sort claims by length (longest first) to avoid partial matches
        claims_with_tags.sort(key=lambda x: len(x[0]), reverse=True)
        
        highlighted = transcript
        highlights_added = 0
        
        # Pre-compute segments and windows for efficiency
        segments = smart_split_transcript(highlighted)
        clean_segments = [re.sub(r'\[/?(?:VERIFIED|OPINION|UNCERTAIN|FALSE)\]', '', s).strip() for s in segments]
        windows = create_sliding_windows(highlighted)
        
        for claim_text, tag in claims_with_tags:
            normalized_claim = ' '.join(claim_text.split())
            print(f"  🔍 {tag}: \"{normalized_claim[:60]}...\"")
            
            match_found = False
            match_text = None
            match_method = None
            
            # === Strategy 1: Exact match ===
            pattern = re.escape(normalized_claim)
            pattern = pattern.replace(r'\ ', r'\s+')
            exact_matches = list(re.finditer(pattern, highlighted, re.IGNORECASE))
            
            if exact_matches:
                match_found = True
                match_text = exact_matches[0].group()
                match_method = "exact"
            
            # === Strategy 2: Fuzzy sentence matching (lowered to 0.45) ===
            if not match_found:
                fuzzy_matches = difflib.get_close_matches(claim_text, clean_segments, n=1, cutoff=0.45)
                if fuzzy_matches:
                    best_match = fuzzy_matches[0]
                    ratio = difflib.SequenceMatcher(None, claim_text, best_match).ratio()
                    match_found = True
                    match_text = best_match
                    match_method = f"fuzzy-sentence({ratio:.2f})"
            
            # === Strategy 3: Sliding window matching ===
            if not match_found:
                best_window_match = None
                best_window_score = 0.45  # Minimum threshold
                
                for window_text, _ in windows:
                    clean_window = re.sub(r'\[/?(?:VERIFIED|OPINION|UNCERTAIN|FALSE)\]', '', window_text)
                    ratio = difflib.SequenceMatcher(None, claim_text.lower(), clean_window.lower()).ratio()
                    if ratio > best_window_score:
                        best_window_score = ratio
                        best_window_match = window_text
                
                if best_window_match:
                    match_found = True
                    match_text = best_window_match
                    match_method = f"sliding-window({best_window_score:.2f})"
            
            # === Strategy 4: Key phrase matching ===
            if not match_found:
                key_phrases = extract_key_phrases(claim_text)
                for phrase in key_phrases[:5]:  # Try top 5 phrases
                    phrase_pattern = re.escape(phrase)
                    phrase_pattern = phrase_pattern.replace(r'\ ', r'\s+')
                    phrase_matches = list(re.finditer(phrase_pattern, highlighted, re.IGNORECASE))
                    
                    if phrase_matches:
                        # Found a key phrase - expand to sentence boundary
                        match_pos = phrase_matches[0].start()
                        # Find sentence boundaries around this position
                        text_before = highlighted[:match_pos]
                        text_after = highlighted[match_pos:]
                        
                        # Find start of sentence
                        start_markers = [text_before.rfind('. '), text_before.rfind('! '), 
                                        text_before.rfind('? '), text_before.rfind('\n')]
                        sent_start = max(start_markers) + 2 if max(start_markers) >= 0 else 0
                        
                        # Find end of sentence
                        end_markers = []
                        for marker in ['. ', '! ', '? ', '\n']:
                            pos = text_after.find(marker)
                            if pos >= 0:
                                end_markers.append(pos)
                        sent_end = match_pos + (min(end_markers) + 1 if end_markers else len(text_after))
                        
                        match_text = highlighted[sent_start:sent_end].strip()
                        match_found = True
                        match_method = f"key-phrase('{phrase[:20]}...')"
                        break
            
            # === Strategy 5: Word overlap scoring ===
            if not match_found:
                best_overlap_segment = None
                best_overlap_score = 0.4  # Minimum 40% content word overlap
                
                for seg in clean_segments:
                    if len(seg) > 20:  # Skip very short segments
                        score = word_overlap_score(claim_text, seg)
                        if score > best_overlap_score:
                            best_overlap_score = score
                            best_overlap_segment = seg
                
                if best_overlap_segment:
                    match_found = True
                    match_text = best_overlap_segment
                    match_method = f"word-overlap({best_overlap_score:.2f})"
            
            # === Apply the highlight ===
            if match_found and match_text:
                # Clean the match text for searching
                clean_match = re.sub(r'\[/?(?:VERIFIED|OPINION|UNCERTAIN|FALSE)\]', '', match_text).strip()
                
                # Find this text in the transcript
                search_pattern = re.escape(clean_match)
                search_pattern = search_pattern.replace(r'\ ', r'\s+')
                text_matches = list(re.finditer(search_pattern, highlighted, re.IGNORECASE))
                
                if text_matches:
                    # Apply to first match only, from end to preserve positions
                    match = text_matches[0]
                    start = match.start()
                    end = match.end()
                    
                    # Check if already tagged
                    prefix = highlighted[max(0, start-20):start]
                    if tag not in prefix and f'[/{tag[1:]}' not in highlighted[start:end]:
                        closing_tag = tag.replace('[', '[/')
                        highlighted = (
                            highlighted[:start] + 
                            tag + ' ' + 
                            highlighted[start:end] + 
                            closing_tag + 
                            highlighted[end:]
                        )
                        highlights_added += 1
                        print(f"    ✅ {match_method}")
                    else:
                        print(f"    ⚠️ Already tagged, skipping")
                else:
                    print(f"    ❌ Match text not found in transcript")
            else:
                print(f"    ❌ No match found (tried all strategies)")
        
        print(f"🎨 Highlighting complete: {highlights_added}/{len(claims_with_tags)} claims highlighted")
        
        return highlighted
    
    def extract_video_id(self, url):
        """Extract YouTube video ID from URL"""
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:embed\/)([0-9A-Za-z_-]{11})',
            r'^([0-9A-Za-z_-]{11})$'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def get_youtube_transcript(self, video_url):
        """Try to get transcript directly from YouTube (with global caching option)"""
        try:
            video_id = self.extract_video_id(video_url)
            if not video_id:
                return None
            
            # Check global cache if enabled
            if FeatureFlags.USE_GLOBAL_CACHE:
                try:
                    from services.supabase_client import get_supabase_client
                    supabase = get_supabase_client()
                    cached = supabase.table('videos').select('transcription').eq('video_url', video_url).limit(1).execute()
                    
                    if cached.data and cached.data[0].get('transcription'):
                        transcript_text = cached.data[0]['transcription']
                        print(f"✅ Using cached transcript from global cache ({len(transcript_text)} chars)")
                        # Return in same format as YouTube API
                        return {'text': transcript_text, 'segments': []}
                except Exception as cache_error:
                    print(f"⚠️ Global cache check failed (non-critical): {cache_error}")
                    # Continue to fetch new transcript
            
            print(f"Attempting to fetch YouTube transcript for video ID: {video_id}")
            
            # Use the API - set proxy via environment variables (requests library respects these)
            try:
                transcript_list = None
                
                # Save original proxy env vars
                old_http_proxy = os.environ.get('HTTP_PROXY')
                old_https_proxy = os.environ.get('HTTPS_PROXY')
                
                try:
                    # Set proxy via environment variables (youtube-transcript-api uses requests internally)
                    if self.proxy_url:
                        print(f"🌐 Using proxy for YouTube transcript API (via env vars)...")
                        os.environ['HTTP_PROXY'] = self.proxy_url
                        os.environ['HTTPS_PROXY'] = self.proxy_url
                    
                    api = YouTubeTranscriptApi()
                    transcript_list = api.list(video_id)
                except TranscriptsDisabled as e:
                    # Video has transcripts disabled - return None to fall back to Whisper
                    print(f"⚠️ Transcripts are disabled for this video: {str(e)}")
                    print("   Will fall back to audio transcription with Whisper...")
                    transcript_list = None  # Signal that we should return None
                except NoTranscriptFound as e:
                    # No transcripts found for this video
                    print(f"⚠️ No transcripts found for this video: {str(e)}")
                    print("   Will fall back to audio transcription with Whisper...")
                    transcript_list = None  # Signal that we should return None
                except Exception as proxy_err:
                    print(f"⚠️ Error fetching transcripts: {str(proxy_err)}")
                    # If proxy request blocked, try without proxy as last resort
                    if 'RequestBlocked' in str(type(proxy_err).__name__) or 'RequestBlocked' in str(proxy_err):
                        print(f"⚠️ Proxy request blocked, trying without proxy...")
                        # Clear proxy env vars for retry
                        if 'HTTP_PROXY' in os.environ:
                            del os.environ['HTTP_PROXY']
                        if 'HTTPS_PROXY' in os.environ:
                            del os.environ['HTTPS_PROXY']
                        try:
                            api = YouTubeTranscriptApi()
                            transcript_list = api.list(video_id)
                        except Exception:
                            raise proxy_err  # Re-raise original error
                    else:
                        raise
                finally:
                    # Restore original proxy env vars
                    if old_http_proxy is not None:
                        os.environ['HTTP_PROXY'] = old_http_proxy
                    elif 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if old_https_proxy is not None:
                        os.environ['HTTPS_PROXY'] = old_https_proxy
                    elif 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
                # If transcript list is None, it means transcripts are disabled or not found
                if transcript_list is None:
                    return None
                
                # Try to find English transcript
                transcript = None
                for t in transcript_list:
                    if hasattr(t, 'language_code') and t.language_code.startswith('en'):
                        transcript = t
                        break
                
                # If no English found, use first available
                if not transcript and transcript_list:
                    transcript = transcript_list[0]
                
                if not transcript:
                    print("⚠️ No transcripts found")
                    return None
                
                # Fetch the actual transcript data
                fetched = transcript.fetch()
                
                # Extract segments with timestamps (start time in seconds, duration, text)
                segments = []
                for snippet in fetched.snippets:
                    segments.append({
                        'start': snippet.start,  # Start time in seconds
                        'duration': snippet.duration,  # Duration in seconds
                        'text': snippet.text
                    })
                
                # Combine all text segments for analysis
                full_text = ' '.join([snippet.text for snippet in fetched.snippets])
                
                print(f"✅ Successfully retrieved YouTube transcript ({len(full_text)} characters, {len(segments)} segments)")
                return {
                    'text': full_text,
                    'segments': segments
                }
                
            except Exception as e:
                print(f"⚠️ Error fetching transcripts: {str(e)}")
                import traceback
                traceback.print_exc()
                # Return None to fall back to Whisper transcription
                return None
            
        except Exception as e:
            print(f"⚠️ Transcript fetch failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def _get_whisper_module(self):
        """Lazy import whisper module"""
        if self.whisper_module is None:
            import whisper
            self.whisper_module = whisper
        return self.whisper_module
    
    def _get_whisper_model(self):
        """Lazy load Whisper model"""
        if self.whisper_model is None:
            whisper = self._get_whisper_module()
            self.whisper_model = whisper.load_model("base")
        return self.whisper_model
    
    def estimate_duration(self, video_url):
        """Estimate video duration without downloading"""
        try:
            # For Instagram, we can't easily estimate duration without downloading
            # Most Instagram reels are short (~30 seconds), so use a conservative estimate
            if 'instagram.com' in video_url:
                print("📱 Instagram URL detected - using default estimate (most reels are 30-90 seconds)")
                return 60  # 1 minute estimate for Instagram reels
            
            # Get both HTTP and SOCKS5 proxy URLs
            http_proxy, socks5_proxy = self._get_proxy_urls()
            proxy_url = http_proxy  # Default to HTTP
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                # Anti-bot detection measures
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web'],
                        'player_skip': ['webpage', 'configs'],
                    }
                },
                # Rotate user agents
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
            }
            
            # Add proxy if configured
            if proxy_url:
                print(f"🌐 Using proxy for duration estimation (HTTP)...")
                ydl_opts['proxy'] = proxy_url
            
            # Try HTTP proxy first
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=False)
                    duration = info.get('duration', 0)
                    print(f"✅ Duration estimated: {duration}s ({duration/60:.1f} min)")
                    return duration
            except Exception as http_error:
                # If HTTP proxy fails with 403, try SOCKS5
                if socks5_proxy and ('403' in str(http_error) or ('Forbidden' in str(http_error))):
                    print(f"🔄 HTTP proxy failed for duration, trying SOCKS5...")
                    ydl_opts['proxy'] = socks5_proxy
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(video_url, download=False)
                        duration = info.get('duration', 0)
                        print(f"✅ Duration estimated: {duration}s ({duration/60:.1f} min)")
                        return duration
                else:
                    raise http_error
        except Exception as e:
            print(f"❌ Duration estimation failed: {str(e)}")
            raise Exception(f"Couldn't estimate duration: {str(e)}")
    
    def try_instagram_embed(self, video_url, output_path):
        """Try to download Instagram video using embed endpoint (no auth required)"""
        import re
        import requests
        
        try:
            print("📱 Attempting Instagram embed scraping...")
            
            # Extract post ID from URL (works for /p/, /reel/, /tv/)
            post_id = None
            patterns = [
                r'instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)',
                r'instagram\.com/reels?/([A-Za-z0-9_-]+)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, video_url)
                if match:
                    post_id = match.group(1)
                    break
            
            if not post_id:
                raise Exception("Could not extract Instagram post ID from URL")
            
            print(f"📝 Extracted post ID: {post_id}")
            
            # Try multiple methods to get video URL
            video_direct_url = None
            
            # Method 1: Try Instagram's embed endpoint
            embed_url = f"https://www.instagram.com/p/{post_id}/embed/captioned/"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.instagram.com/'
            }
            
            # Build proxy dict if available
            proxies = None
            if self.proxy_url:
                proxies = {
                    'http': self.proxy_url,
                    'https': self.proxy_url
                }
                print(f"🌐 Using proxy for Instagram embed request...")
            
            response = requests.get(embed_url, headers=headers, proxies=proxies, timeout=15)
            
            if response.status_code == 200:
                html = response.text
                
                # Try multiple regex patterns to find video URL
                patterns = [
                    r'"video_url":"([^"]+)"',
                    r'videoUrl":"([^"]+)"',
                    r'"src":"(https://[^"]*cdninstagram[^"]*\.mp4[^"]*)"',
                    r'<video[^>]+src="([^"]+)"'
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, html)
                    if match:
                        video_direct_url = match.group(1)
                        # Unescape unicode characters
                        video_direct_url = video_direct_url.replace('\\u0026', '&')
                        print(f"✅ Found video URL using pattern: {pattern[:30]}...")
                        break
            
            # Method 2: Try the public API endpoint (fallback)
            if not video_direct_url:
                print("🔄 Embed method failed, trying public API endpoint...")
                api_url = f"https://www.instagram.com/p/{post_id}/?__a=1&__d=dis"
                
                response = requests.get(api_url, headers=headers, proxies=proxies, timeout=15)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Navigate the JSON structure (it varies)
                        if 'items' in data:
                            video_direct_url = data['items'][0].get('video_versions', [{}])[0].get('url')
                        elif 'graphql' in data:
                            video_direct_url = data['graphql']['shortcode_media'].get('video_url')
                    except Exception as json_error:
                        print(f"⚠️ Failed to parse API JSON: {str(json_error)}")
            
            if not video_direct_url:
                raise Exception("Could not extract video URL from Instagram page. The post may be private, deleted, or Instagram's format has changed.")
            
            # Download the video from the direct URL
            print(f"📥 Downloading video from direct URL...")
            video_response = requests.get(video_direct_url, headers=headers, proxies=proxies, stream=True, timeout=30)
            
            if video_response.status_code != 200:
                raise Exception(f"Failed to download video: HTTP {video_response.status_code}")
            
            # Save to output path
            with open(output_path, 'wb') as f:
                for chunk in video_response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            print(f"✅ Instagram video downloaded successfully via embed scraping")
            
            # Return basic info (duration will be extracted during transcription)
            return {
                'duration': 0,  # Unknown at this point
                'title': f'Instagram Post {post_id}',
                'uploader': 'Instagram User'
            }
            
        except Exception as e:
            print(f"❌ Instagram embed scraping failed: {str(e)}")
            raise Exception(f"Couldn't download Instagram video: {str(e)}")
    
    def try_cobalt_download(self, video_url, output_path):
        """Try downloading via Cobalt API (alternative to yt-dlp)"""
        try:
            import requests
            print("🌐 Trying Cobalt API for download...")
            
            # Cobalt API endpoint
            cobalt_url = "https://api.cobalt.tools/api/json"
            
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
            
            payload = {
                'url': video_url,
                'vCodec': 'h264',
                'vQuality': '360',  # Lower quality for faster download
                'aFormat': 'mp3',
                'isAudioOnly': True,  # We only need audio for transcription
            }
            
            response = requests.post(cobalt_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'stream' or data.get('status') == 'redirect':
                    download_url = data.get('url')
                    if download_url:
                        print(f"✅ Cobalt provided download URL")
                        # Download the audio file
                        audio_response = requests.get(download_url, timeout=120)
                        if audio_response.status_code == 200:
                            with open(output_path, 'wb') as f:
                                f.write(audio_response.content)
                            print(f"✅ Audio downloaded via Cobalt API")
                            return {'duration': 0, 'title': 'Cobalt Download', 'uploader': 'Unknown'}
            
            print(f"❌ Cobalt API response: {response.status_code}")
            return None
        except Exception as e:
            print(f"❌ Cobalt API failed: {str(e)[:100]}")
            return None
    
    def download_video(self, video_url, output_path):
        """Download video using yt-dlp with anti-bot measures and optional proxy"""
        try:
            # Check if this is Instagram - route to embed scraping
            if 'instagram.com' in video_url:
                print("📱 Instagram URL detected - using embed scraping method...")
                return self.try_instagram_embed(video_url, output_path)
            
            # YouTube and other platforms - use yt-dlp
            # Get both HTTP and SOCKS5 proxy URLs
            http_proxy, socks5_proxy = self._get_proxy_urls()
            proxy_url = http_proxy  # Default to HTTP
            
            # Random user agents to rotate
            import random
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            ]
            
            # Check for cookies file
            cookies_path = os.path.join(os.path.dirname(__file__), '..', 'cookies.txt')
            has_cookies = os.path.exists(cookies_path)
            if has_cookies:
                print(f"🍪 Found cookies file - will use for authentication")
            
            # Different player client strategies to try
            player_strategies = [
                {'player_client': ['ios', 'web'], 'player_skip': ['webpage']},
                {'player_client': ['android', 'web'], 'player_skip': ['webpage', 'configs']},
                {'player_client': ['tv_embedded'], 'player_skip': ['webpage']},
                {'player_client': ['web'], 'player_skip': []},
            ]
            
            base_ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_path,
                'quiet': True,
                'no_warnings': True,
                'http_headers': {
                    'User-Agent': random.choice(user_agents),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                },
                'socket_timeout': 30,
                'retries': 3,
            }
            
            # Add cookies if available
            if has_cookies:
                base_ydl_opts['cookiefile'] = cookies_path
            
            last_error = None
            
            # Strategy 1: Try with proxy and different player clients
            for i, strategy in enumerate(player_strategies):
                print(f"🔄 Trying strategy {i+1}/{len(player_strategies)}: {strategy['player_client']}")
                
                ydl_opts = base_ydl_opts.copy()
                ydl_opts['extractor_args'] = {'youtube': strategy}
                ydl_opts['http_headers'] = base_ydl_opts['http_headers'].copy()
                ydl_opts['http_headers']['User-Agent'] = random.choice(user_agents)
                
                if proxy_url:
                    masked_proxy = proxy_url.split('@')[1] if '@' in proxy_url else proxy_url
                    print(f"   🌐 Using proxy: {masked_proxy}")
                    ydl_opts['proxy'] = proxy_url
                
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(video_url, download=True)
                        print(f"✅ Download successful with strategy {i+1}")
                        return info
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    print(f"   ❌ Strategy {i+1} failed: {str(e)[:100]}")
                    
                    # If bot detection, try next strategy
                    if 'bot' in error_str or 'sign in' in error_str:
                        continue
                    # If 403, try without proxy on next iteration
                    if '403' in error_str:
                        proxy_url = None  # Disable proxy for remaining attempts
                        continue
            
            # Strategy 2: Try without proxy
            print(f"🔄 Trying without proxy...")
            for i, strategy in enumerate(player_strategies[:2]):  # Only try first 2 strategies
                ydl_opts = base_ydl_opts.copy()
                ydl_opts['extractor_args'] = {'youtube': strategy}
                ydl_opts['http_headers']['User-Agent'] = random.choice(user_agents)
                
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(video_url, download=True)
                        print(f"✅ Download successful without proxy")
                        return info
                except Exception as e:
                    last_error = e
                    print(f"   ❌ No-proxy attempt {i+1} failed: {str(e)[:100]}")
            
            # Strategy 3: Try Cobalt API as fallback
            cobalt_result = self.try_cobalt_download(video_url, output_path)
            if cobalt_result:
                return cobalt_result
            
            # All strategies failed
            raise Exception(f"All download strategies failed. Last error: {str(last_error)[:300]}")
                
        except Exception as e:
            raise Exception(f"Couldn't download video: {str(e)}")
    
    def transcribe_audio(self, audio_path):
        """Transcribe audio using Whisper (with OpenAI API option and automatic fallback)"""
        try:
            # Check if OpenAI Whisper API is enabled
            if FeatureFlags.USE_OPENAI_WHISPER and self.openai_client:
                try:
                    print("🎤 Using OpenAI Whisper API (faster, better quality)")
                    with open(audio_path, "rb") as audio_file:
                        transcript = self.openai_client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            language="en"
                        )
                    return transcript.text, "en"
                except Exception as api_error:
                    print(f"⚠️ OpenAI Whisper API failed: {api_error}")
                    print("   Falling back to local Whisper...")
                    # Fall through to local Whisper
            
            # Original: Local Whisper (always works as fallback)
            print("🎤 Using local Whisper model")
            model = self._get_whisper_model()
            result = model.transcribe(audio_path)
            return result['text'], result.get('language', 'en')
        except Exception as e:
            raise Exception(f"Couldn't transcribe audio: {str(e)}")
    
    def deep_recheck_claim(self, claim, timestamp, context, original_verdict):
        """Perform deep fact-check on a single claim flagged by user"""
        try:
            print(f"🔍 Deep re-checking claim: {claim[:100]}...")
            
            # Extract relevant context (roughly 500 characters around the claim)
            context_snippet = context[:3000] if len(context) > 3000 else context
            
            prompt = f"""You are a fact-checker. A user has flagged this claim as potentially incorrect.
Please perform a DEEP fact-check with extra scrutiny.

CLAIM TO VERIFY:
"{claim}"

ORIGINAL TIMESTAMP: {timestamp}
ORIGINAL VERDICT: {original_verdict}

RELEVANT CONTEXT FROM VIDEO:
{context_snippet}

Your task:
1. Verify if this claim is factually accurate
2. Check for ALL types of errors: names, numbers, dates, titles, context, qualifiers
3. Find at least 3 reliable sources
4. Determine if the original verdict was correct
5. Document ANY corrections or clarifications needed

Return ONLY valid JSON (no markdown, no code blocks):
{{
  "verdict": "VERIFIED | OPINION | UNCERTAIN | FALSE",
  "explanation": "Detailed explanation of why this verdict is correct",
  "sources": ["url1", "url2", "url3"],
  "confidence": "High | Medium | Low",
  "correction_notes": "List ALL corrections found. Be specific about WHAT was wrong and HOW it was corrected."
}}

IMPORTANT: In correction_notes, document specific corrections:
- Name spellings: "Boowbert → Boebert"  
- Numbers: "Video said 100K, actually 127K per source"
- Dates: "Stated 2020, actually 2021"
- Titles: "Called 'Senator', actually 'Representative'"
- Context: "Missing qualifier: only applies to federal workers"
- Clarifications: "Claim technically true but lacks important context about X"
- If NO corrections: "No corrections needed - claim is accurate as stated"

Be thorough and specific in your correction notes!"""

            # Try multiple models with fallback (same as analyze_with_claude)
            # Use Haiku - reliable and fast
            models_to_try = [
                "claude-3-5-haiku-20241022",   # Claude 3.5 Haiku (Oct 2024) - reliable
                "claude-3-haiku-20240307",     # Claude 3 Haiku (older fallback)
            ]
            
            message = None
            last_error = None
            
            for model_name in models_to_try:
                try:
                    print(f"🔍 Trying model for re-check: {model_name}")
                    message = self.anthropic_client.messages.create(
                        model=model_name,
                        max_tokens=2000,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    print(f"✅ Re-check succeeded with model: {model_name}")
                    break
                except Exception as e:
                    last_error = e
                    print(f"❌ Model {model_name} failed: {str(e)}")
                    continue
            
            if not message:
                raise Exception(f"All models failed for re-check. Last error: {str(last_error)}")
            
            response_text = message.content[0].text.strip()
            
            # Parse JSON response with robust error handling
            print(f"📝 Raw response length: {len(response_text)} characters")
            print(f"📝 First 200 chars: {response_text[:200]}")
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = re.sub(r'^```(?:json)?\s*\n', '', response_text)
                response_text = re.sub(r'\n```\s*$', '', response_text)
                print("✂️ Removed markdown code blocks")
            
            # Try to extract JSON if embedded in text
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                response_text = json_match.group(0)
                print("✂️ Extracted JSON from text")
            
            # Fix common JSON issues
            # Replace single quotes with double quotes (but not in content)
            # Replace smart quotes
            response_text = response_text.replace('"', '"').replace('"', '"')
            response_text = response_text.replace("'", "'").replace("'", "'")
            
            print(f"📝 Cleaned JSON (first 200 chars): {response_text[:200]}")
            
            try:
                result = json.loads(response_text)
                print("✅ JSON parsed successfully")
            except json.JSONDecodeError as e:
                print(f"❌ JSON parse error: {str(e)}")
                print(f"❌ Error at position {e.pos}: {response_text[max(0, e.pos-50):e.pos+50]}")
                # Try more aggressive cleaning
                # Remove trailing commas
                response_text = re.sub(r',\s*}', '}', response_text)
                response_text = re.sub(r',\s*]', ']', response_text)
                result = json.loads(response_text)
                print("✅ JSON parsed after aggressive cleaning")
            
            # Add metadata
            result['recheckTimestamp'] = datetime.utcnow().isoformat()
            result['changed'] = result['verdict'] != original_verdict
            
            print(f"✅ Re-check complete: {result['verdict']} (Changed: {result['changed']})")
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed completely: {str(e)}")
            print(f"❌ Problematic JSON: {response_text}")
            import traceback
            traceback.print_exc()
            raise Exception(f"AI returned invalid JSON. This might be a complex claim. Error: {str(e)}")
        except Exception as e:
            print(f"❌ Re-check failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Couldn't re-check claim: {str(e)}")
    
    def analyze_with_claude(self, transcription, analysis_type):
        """Analyze transcription with Claude"""
        try:
            # Truncate if too long (Claude has ~200k token limit, but let's be safe)
            # Roughly 4 chars = 1 token, so 50k chars = ~12.5k tokens
            max_chars = 50000
            if len(transcription) > max_chars:
                print(f"⚠️ Transcript too long ({len(transcription)} chars), truncating to {max_chars}")
                transcription = transcription[:max_chars] + "\n\n[Transcript truncated due to length...]"
            
            if analysis_type == 'summarize':
                prompt = f"""You are analyzing a video transcript. Create a compelling, well-structured summary that's genuinely useful.

## YOUR TASK

Write a summary in this EXACT format (use markdown):

### ⚡ TL;DR (1-2 sentences max)
[The single most important takeaway. Be specific, not generic. What would you tell a friend in 10 seconds?]

### 🎯 What This Video Covers
[2-3 sentences describing the content. Be specific about WHO is speaking, WHAT they're discussing, and WHY it matters.]

### 💡 Key Insights
- **[Insight 1 title]**: [Explanation in 1-2 sentences]
- **[Insight 2 title]**: [Explanation in 1-2 sentences]
- **[Insight 3 title]**: [Explanation in 1-2 sentences]
[Add more if genuinely valuable, max 6]

### 📊 Notable Claims & Data
[List any specific numbers, statistics, predictions, or factual claims made. If none, write "No specific data points mentioned."]

### 🤔 Things to Consider
[Any caveats, potential biases, missing context, or reasons to be skeptical. Be honest about limitations.]

### ✅ Bottom Line
[1-2 sentences: Is this video worth watching? Who would benefit most from it?]

---

## RULES
- Be SPECIFIC, not generic. "Discusses economic trends" is bad. "Claims the Fed will cut rates 3 more times in 2024" is good.
- Use the speaker's actual claims and terminology
- Don't pad with filler phrases like "The speaker goes on to explain..."
- If the content is low-quality or vague, say so honestly
- Keep the entire summary under 400 words

## TRANSCRIPT TO ANALYZE:
{transcription}"""
            elif analysis_type == 'fact-check':
                # Determine if transcript is short enough for Claude to add inline highlights
                # Claude max_tokens: 8000 ≈ 32,000 chars max output
                # Need space for: transcript + highlights (~+20%) + JSON structure (~2000 tokens)
                # Safe limit: ~15,000 chars = ~3,750 tokens transcript + ~4,500 tokens highlighted output + ~2,000 tokens JSON = ~6,500 tokens total
                transcript_length = len(transcription)
                include_highlights_instruction = transcript_length < 15000
                
                if include_highlights_instruction:
                    highlights_instruction = '"full_transcript_with_highlights": "<REQUIRED: Return the COMPLETE, WORD-FOR-WORD transcript (every single word from the original transcription above) with TEXT TAGS [VERIFIED], [OPINION], [UNCERTAIN], [FALSE] inserted BEFORE each corresponding claim. Do NOT summarize, do NOT truncate, do NOT skip any words. Include the ENTIRE transcript exactly as provided, just with tags added. Use ONLY the tag format [VERIFIED] NOT emojis. Do NOT omit this field.>"'
                    print(f"📝 Short transcript ({transcript_length} chars) - REQUIRING Claude to add highlights", flush=True)
                else:
                    highlights_instruction = '"full_transcript_with_highlights": "<OPTIONAL - omit this field for long transcripts>"'
                    print(f"📝 Long transcript ({transcript_length} chars) - will use auto-highlighting instead", flush=True)
                
                prompt = f"""Please fact-check the following video transcription and return your analysis as a JSON object.

IMPORTANT: Return ONLY valid JSON in this exact structure (no markdown, no code blocks):

{{
  "fact_score": <number 0-10>,
  "overall_verdict": "<string: 'Mostly Accurate' | 'Mixed Accuracy' | 'Mostly Inaccurate' | 'Unable to Verify'>",
  "summary": "<brief 2-3 sentence overview>",
  "verified_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim from video>",
      "verdict": "VERIFIED",
      "explanation": "<why this is verified>",
      "sources": ["<ACTUAL URL like https://example.com/article>", "<ACTUAL URL>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "opinion_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim>",
      "verdict": "OPINION",
      "explanation": "<why this is subjective/speculative>",
      "logical_fallacies": ["<fallacy name or 'None detected'>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "uncertain_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim>",
      "verdict": "UNCERTAIN",
      "explanation": "<why uncertain - lack of evidence but not disproven>",
      "sources": ["<ACTUAL URL if source exists>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "false_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim>",
      "verdict": "FALSE",
      "explanation": "<why this is false>",
      "sources": ["<ACTUAL URL like https://snopes.com/fact-check/...>", "<ACTUAL URL>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "bias_analysis": {{
    "political_lean": <number -10 to 10, where -10=far left, 0=neutral, 10=far right>,
    "political_lean_label": "<string>",
    "emotional_tone": <number 0-10, where 0=neutral/factual, 10=highly emotional/sensational>,
    "emotional_tone_label": "<string>",
    "source_quality": <number 0-10, where 0=no sources, 10=peer-reviewed/authoritative>,
    "source_quality_label": "<string>",
    "overall_bias": "<Low | Moderate | High>"
  }},
  "red_flags": ["<any concerning patterns, logical fallacies, or manipulation tactics>"],
  {highlights_instruction}
}}

WHAT COUNTS AS A CLAIM (BE SELECTIVE):
- ONLY fact-check SPECIFIC, VERIFIABLE FACTUAL ASSERTIONS
- Focus on claims with NUMBERS, NAMES, DATES, STATISTICS, or SPECIFIC FACTS
- DO NOT treat every sentence as a claim - most sentences are NOT claims
- IGNORE: greetings, transitions, questions, general descriptions, advice, instructions
- Example CLAIM: "73 million people are expected to travel" (specific number = verifiable)
- Example CLAIM: "Gas prices are around $3 a gallon" (specific price = verifiable)
- Example NOT A CLAIM: "It's going to be very busy" (vague = skip)
- Example NOT A CLAIM: "Leave early if you can" (advice = skip)
- Example NOT A CLAIM: "What about the roads?" (question = skip)
- Example NOT A CLAIM: "All right, thank you" (transition = skip)

CLAIM CATEGORIES:
- VERIFIED: Specific factual claims backed by reliable sources (statistics, data, named events)
- OPINION: Subjective judgments, predictions, speculations (e.g., "I think", "will be", "worst ever")
- UNCERTAIN: Specific factual claims that lack sufficient evidence but aren't disproven
- FALSE: Claims that are demonstrably incorrect or misleading

TIMESTAMP RULES:
- Use "Throughout" if the claim is repeated, general, or spans the entire video
- Use "Multiple times" if the claim appears 2-5 times at different points
- Use "MM:SS" format ONLY if you can identify the EXACT moment it was said once
- NEVER use "00:00" unless the claim literally happens in the first 10 seconds
- When in doubt, use "Throughout" or "Multiple times" rather than guessing a timestamp

SOURCES:
- ALWAYS provide ACTUAL URLs (e.g., https://www.reuters.com/article/..., https://www.ncbi.nlm.nih.gov/..., https://snopes.com/fact-check/...)
- DO NOT use descriptive names like "Reuters article" or "CDC website"
- Use full clickable links that users can verify
- If no URL is available, use an empty array []

LOGICAL FALLACIES (for opinion claims):
- CRITICALLY ANALYZE the reasoning for ANY logical fallacies or rhetoric techniques
- Common fallacies to look for: "Appeal to emotion", "Slippery slope", "False dichotomy", "Hasty generalization", "Ad hominem", "Strawman", "Appeal to authority", "Bandwagon", "Red herring", "Anecdotal evidence", "Cherry picking", "Confirmation bias", "False equivalence", "Circular reasoning", etc.
- Look for SUBTLE fallacies too - even if the argument sounds reasonable, check for weak logic or manipulative rhetoric
- Only use ["Sound reasoning"] if the opinion is backed by solid logical structure with no detectable flaws
- Be thorough - most opinions in videos contain at least one rhetorical technique or fallacy
- Example: Personal stories used to prove a general point = "Anecdotal evidence"
- Example: Emotional language to sway opinion = "Appeal to emotion"

FACT SCORE GUIDANCE:
- Base the fact_score (0-10) primarily on VERIFIED vs FALSE claims
- OPINION claims should NOT significantly lower the score (they're subjective, not false)
- UNCERTAIN claims should have minor impact (lack of evidence, not misinformation)
- A video with many opinions but accurate facts should still score 7-9
- Only penalize heavily for demonstrably FALSE claims

Analyze this transcription:
{transcription}

{"CRITICAL FOR HIGHLIGHTS: The 'full_transcript_with_highlights' field MUST contain the COMPLETE transcript with [VERIFIED], [OPINION], [UNCERTAIN], [FALSE] tags. BE VERY SELECTIVE - only highlight NOTABLE claims, not casual conversation. RULES: 1) [VERIFIED] = ONLY for objectively verifiable PUBLIC FACTS with external sources (statistics, historical events, court rulings, published data). NOT for personal statements, plans, or anecdotes. 2) [OPINION] = Subjective judgments, predictions, personal beliefs, value statements. 3) DO NOT HIGHLIGHT: casual conversation, greetings, questions, personal anecdotes, plans ('we're going to...'), compliments ('your kids are beautiful'), or filler speech. 4) MOST of a typical transcript should be UN-highlighted - only tag the notable factual claims or strong opinions. 5) Example of what TO tag: '[VERIFIED]The US has over 100,000 troops deployed overseas[/VERIFIED]'. Example of what NOT to tag: 'We're planning to have Thanksgiving dinner over Zoom' (personal plan, not a public fact)." if include_highlights_instruction else ""}

Remember: Return ONLY the JSON object, no other text."""
            else:
                prompt = f"Analyze the following transcription:\n\n{transcription}"
            
            print(f"Sending {len(prompt)} characters to Claude...")
            
            # Try different models in order of preference with their max_tokens limits
            # Use Haiku - reliable and fast
            models_to_try = [
                ("claude-3-5-haiku-20241022", 8000),    # Claude 3.5 Haiku (Oct 2024) - reliable
                ("claude-3-haiku-20240307", 4096),      # Claude 3 Haiku (older fallback)
            ]
            
            message = None
            last_error = None
            
            for model_name, model_max_tokens in models_to_try:
                try:
                    print(f"Trying model: {model_name}")
                    # Use model-specific max_tokens, but respect fact-check needs
                    if analysis_type == 'fact-check':
                        max_tokens = min(8000, model_max_tokens)
                    else:
                        max_tokens = min(4000, model_max_tokens)
                    
                    message = self.anthropic_client.messages.create(
                        model=model_name,
                        max_tokens=max_tokens,
                        messages=[{
                            "role": "user",
                            "content": prompt
                        }]
                    )
                    print(f"✅ Success with model: {model_name} (max_tokens: {max_tokens})")
                    break
                except Exception as e:
                    last_error = e
                    print(f"❌ Model {model_name} failed: {str(e)}")
                    continue
            
            if not message:
                raise Exception(f"All models failed. Last error: {str(last_error)}")
            
            analysis = message.content[0].text
            print(f"✅ Received {len(analysis)} characters from Claude")
            
            # For fact-check, try to parse as JSON
            if analysis_type == 'fact-check':
                try:
                    # Claude might wrap JSON in markdown code blocks, so remove them
                    cleaned = analysis.strip()
                    if cleaned.startswith('```'):
                        # Remove ```json or ``` at start and ``` at end
                        cleaned = re.sub(r'^```(?:json)?\s*\n', '', cleaned)
                        cleaned = re.sub(r'\n```\s*$', '', cleaned)
                    
                    parsed = json.loads(cleaned)
                    print(f"✅ Successfully parsed JSON fact-check response")
                    
                    # Normalize Claude's response: Sometimes it uses "opinion_based_claims" instead of "opinion_claims"
                    if 'opinion_based_claims' in parsed and 'opinion_claims' not in parsed:
                        print("🔧 Normalizing: Converting 'opinion_based_claims' to 'opinion_claims'")
                        parsed['opinion_claims'] = parsed.pop('opinion_based_claims')
                    
                    return parsed  # Return as dict/object, not string
                except json.JSONDecodeError as e:
                    print(f"⚠️ Initial JSON parse failed: {str(e)}")
                    print("🔧 Attempting to repair JSON...")
                    
                    # Try to repair common JSON issues
                    try:
                        # Remove markdown code blocks if still present
                        repaired = cleaned
                        if '```' in repaired:
                            repaired = re.sub(r'```[a-z]*\n?', '', repaired)
                            repaired = re.sub(r'\n?```', '', repaired)
                        
                        # Try to extract JSON object if embedded in text
                        json_match = re.search(r'\{[\s\S]*\}', repaired)
                        if json_match:
                            repaired = json_match.group(0)
                        
                        # Fix common issues: smart quotes, trailing commas
                        repaired = repaired.replace('"', '"').replace('"', '"')  # Smart quotes
                        repaired = repaired.replace(''', "'").replace(''', "'")  # Smart apostrophes
                        repaired = re.sub(r',(\s*[}\]])', r'\1', repaired)  # Trailing commas
                        
                        # Try to fix missing commas between properties
                        # Pattern: "key": "value" "nextKey" -> "key": "value", "nextKey"
                        repaired = re.sub(r'("\s*")(\s*")', r'\1,\2', repaired)
                        repaired = re.sub(r'("\s*")(\s*\{)', r'\1,\2', repaired)
                        repaired = re.sub(r'(\}\s*")(\s*")', r'\1,\2', repaired)
                        repaired = re.sub(r'(\]\s*")(\s*")', r'\1,\2', repaired)
                        
                        # Try to fix missing commas - more aggressive approach
                        # Look for patterns like: "key": value "nextKey" (missing comma)
                        repaired = re.sub(r'(")\s*("\s*:)', r'\1,\2', repaired)  # Missing comma before next key
                        repaired = re.sub(r'(\d+)\s*(")', r'\1,\2', repaired)  # Number followed by quote
                        repaired = re.sub(r'(true|false|null)\s*(")', r'\1,\2', repaired)  # Boolean/null followed by quote
                        
                        # Try parsing
                        parsed = json.loads(repaired)
                        print(f"✅ Successfully repaired and parsed JSON")
                        
                        # Normalize Claude's response
                        if 'opinion_based_claims' in parsed and 'opinion_claims' not in parsed:
                            print("🔧 Normalizing: Converting 'opinion_based_claims' to 'opinion_claims'")
                            parsed['opinion_claims'] = parsed.pop('opinion_based_claims')
                        
                        return parsed
                    except Exception as e2:
                        print(f"❌ JSON repair failed: {str(e2)}")
                        
                        # Try removing the problematic full_transcript_with_highlights field
                        # This field often contains unescaped characters
                        try:
                            print("🔧 Trying to remove full_transcript_with_highlights field...")
                            # Remove the field using regex
                            repaired_no_transcript = re.sub(
                                r',?\s*"full_transcript_with_highlights"\s*:\s*"[^"]*(?:\\"[^"]*)*"',
                                '',
                                repaired,
                                flags=re.DOTALL
                            )
                            # Also try a simpler pattern
                            if '"full_transcript_with_highlights"' in repaired_no_transcript:
                                repaired_no_transcript = re.sub(
                                    r'"full_transcript_with_highlights"\s*:\s*".*?"(?=\s*[,}])',
                                    '',
                                    repaired_no_transcript,
                                    flags=re.DOTALL
                                )
                            # Clean up any leftover commas
                            repaired_no_transcript = re.sub(r',\s*,', ',', repaired_no_transcript)
                            repaired_no_transcript = re.sub(r',\s*}', '}', repaired_no_transcript)
                            repaired_no_transcript = re.sub(r'{\s*,', '{', repaired_no_transcript)
                            
                            parsed = json.loads(repaired_no_transcript)
                            print(f"✅ Parsed JSON after removing full_transcript_with_highlights")
                            
                            # Normalize Claude's response
                            if 'opinion_based_claims' in parsed and 'opinion_claims' not in parsed:
                                parsed['opinion_claims'] = parsed.pop('opinion_based_claims')
                            
                            return parsed
                        except Exception as e3:
                            print(f"❌ Removing transcript field also failed: {str(e3)}")
                        
                        # Last resort: Try to extract error location and fix it
                        error_match = re.search(r'line (\d+) column (\d+)', str(e2))
                        if error_match:
                            line_num = int(error_match.group(1))
                            col_num = int(error_match.group(2))
                            print(f"🔧 Error at line {line_num}, column {col_num} - attempting targeted fix...")
                            
                            try:
                                lines = repaired.split('\n')
                                if line_num <= len(lines):
                                    error_line = lines[line_num - 1]
                                    # Try inserting comma before the problematic position
                                    if col_num < len(error_line):
                                        # Look for pattern: value "nextKey" and insert comma
                                        before_error = error_line[:col_num]
                                        after_error = error_line[col_num:]
                                        # Try to find where to insert comma
                                        if '"' in after_error and not before_error.rstrip().endswith(','):
                                            # Insert comma before the quote
                                            quote_pos = after_error.find('"')
                                            if quote_pos > 0:
                                                fixed_line = before_error + after_error[:quote_pos] + ',' + after_error[quote_pos:]
                                                lines[line_num - 1] = fixed_line
                                                repaired = '\n'.join(lines)
                                                parsed = json.loads(repaired)
                                                print(f"✅ Fixed JSON at error location")
                                                
                                                # Normalize
                                                if 'opinion_based_claims' in parsed and 'opinion_claims' not in parsed:
                                                    parsed['opinion_claims'] = parsed.pop('opinion_based_claims')
                                                return parsed
                            except Exception as e3:
                                print(f"❌ Targeted fix also failed: {str(e3)}")
                        
                        print("⚠️ Returning raw text - analysis may be incomplete")
                        # Fall back to returning raw text
                        return analysis
            
            return analysis
        except Exception as e:
            print(f"❌ Claude API error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Couldn't analyze with AI: {str(e)}")
    
    def analyze_with_openai(self, transcription, analysis_type):
        """Analyze transcription with OpenAI GPT-4o (for longer transcripts)"""
        try:
            # Verify OpenAI API key is configured
            if not os.getenv('OPENAI_API_KEY'):
                raise Exception("OPENAI_API_KEY environment variable not set")
            
            if not self.openai_client:
                raise Exception("OpenAI client not initialized")
            # Truncate if too long
            max_chars = 100000  # OpenAI has higher limits
            if len(transcription) > max_chars:
                print(f"⚠️ Transcript too long ({len(transcription)} chars), truncating to {max_chars}")
                transcription = transcription[:max_chars] + "\n\n[Transcript truncated due to length...]"
            
            if analysis_type == 'summarize':
                prompt = f"""You are analyzing a video transcript. Create a compelling, well-structured summary that's genuinely useful.

## YOUR TASK

Write a summary in this EXACT format (use markdown):

### ⚡ TL;DR (1-2 sentences max)
[The single most important takeaway. Be specific, not generic. What would you tell a friend in 10 seconds?]

### 🎯 What This Video Covers
[2-3 sentences describing the content. Be specific about WHO is speaking, WHAT they're discussing, and WHY it matters.]

### 💡 Key Insights
- **[Insight 1 title]**: [Explanation in 1-2 sentences]
- **[Insight 2 title]**: [Explanation in 1-2 sentences]
- **[Insight 3 title]**: [Explanation in 1-2 sentences]
[Add more if genuinely valuable, max 6]

### 📊 Notable Claims & Data
[List any specific numbers, statistics, predictions, or factual claims made. If none, write "No specific data points mentioned."]

### 🤔 Things to Consider
[Any caveats, potential biases, missing context, or reasons to be skeptical. Be honest about limitations.]

### ✅ Bottom Line
[1-2 sentences: Is this video worth watching? Who would benefit most from it?]

---

## RULES
- Be SPECIFIC, not generic. "Discusses economic trends" is bad. "Claims the Fed will cut rates 3 more times in 2024" is good.
- Use the speaker's actual claims and terminology
- Don't pad with filler phrases like "The speaker goes on to explain..."
- If the content is low-quality or vague, say so honestly
- Keep the entire summary under 400 words

## TRANSCRIPT TO ANALYZE:
{transcription}"""
                
                # Use faster model for summaries if feature flag enabled (keeps same prompts!)
                model = "gpt-3.5-turbo" if FeatureFlags.USE_FASTER_AI_MODELS else "gpt-4o-mini"
                if FeatureFlags.USE_FASTER_AI_MODELS:
                    print(f"⚡ Using GPT-3.5-turbo for faster summary (feature flag enabled)")
                
                response = self.openai_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                return response.choices[0].message.content
                
            elif analysis_type == 'fact-check':
                transcript_length = len(transcription)
                print(f"📝 Long transcript ({transcript_length} chars) - using OpenAI with JSON mode", flush=True)
                
                # For fact-check, use JSON mode for guaranteed valid JSON!
                system_prompt = """You are a fact-checking assistant that analyzes video transcripts. 
You return structured JSON data about claims, bias, and fact scores.

CLAIM CATEGORIES:
- VERIFIED: Factual claims backed by reliable sources
- OPINION: Subjective judgments, predictions, speculations, or interpretations  
- UNCERTAIN: Factual claims that lack sufficient evidence but aren't disproven
- FALSE: Claims that are demonstrably incorrect or misleading

TIMESTAMP RULES:
- Use "Throughout" if the claim is repeated, general, or spans the entire video
- Use "Multiple times" if the claim appears 2-5 times at different points
- Use "MM:SS" format ONLY if you can identify the EXACT moment it was said once
- NEVER use "00:00" unless the claim literally happens in the first 10 seconds
- When in doubt, use "Throughout" or "Multiple times" rather than guessing a timestamp

SOURCES:
- ALWAYS provide ACTUAL URLs (e.g., https://www.reuters.com/article/..., https://www.ncbi.nlm.nih.gov/..., https://snopes.com/fact-check/...)
- DO NOT use descriptive names like "Reuters article" or "CDC website"
- Use full clickable links that users can verify
- If no URL is available, use an empty array []

LOGICAL FALLACIES (for opinion claims):
- CRITICALLY ANALYZE the reasoning for ANY logical fallacies or rhetoric techniques
- Common fallacies to look for: "Appeal to emotion", "Slippery slope", "False dichotomy", "Hasty generalization", "Ad hominem", "Strawman", "Appeal to authority", "Bandwagon", "Red herring", "Anecdotal evidence", "Cherry picking", "Confirmation bias", "False equivalence", "Circular reasoning", etc.
- Look for SUBTLE fallacies too - even if the argument sounds reasonable, check for weak logic or manipulative rhetoric
- Only use ["Sound reasoning"] if the opinion is backed by solid logical structure with no detectable flaws
- Be thorough - most opinions in videos contain at least one rhetorical technique or fallacy
- Example: Personal stories used to prove a general point = "Anecdotal evidence"
- Example: Emotional language to sway opinion = "Appeal to emotion"

FACT SCORE GUIDANCE:
- Base the fact_score (0-10) primarily on VERIFIED vs FALSE claims
- OPINION claims should NOT significantly lower the score (they're subjective, not false)
- UNCERTAIN claims should have minor impact
- A video with many opinions but accurate facts should still score 7-9
- Only penalize heavily for demonstrably FALSE claims"""

                user_prompt = f"""Analyze this transcript and return a JSON object with this exact structure:

{{
  "fact_score": <number 0-10>,
  "overall_verdict": "<string: 'Mostly Accurate' | 'Mixed Accuracy' | 'Mostly Inaccurate' | 'Unable to Verify'>",
  "summary": "<brief 2-3 sentence overview>",
  "verified_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim from video>",
      "verdict": "VERIFIED",
      "explanation": "<why this is verified>",
      "sources": ["<ACTUAL URL like https://example.com/article>", "<ACTUAL URL>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "opinion_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim>",
      "verdict": "OPINION",
      "explanation": "<why this is subjective/speculative>",
      "logical_fallacies": ["<fallacy name or 'None detected'>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "uncertain_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim>",
      "verdict": "UNCERTAIN",
      "explanation": "<why uncertain>",
      "sources": ["<ACTUAL URL if source exists>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "false_claims": [
    {{
      "timestamp": "<'Throughout', 'Multiple times', or 'MM:SS'>",
      "claim": "<exact claim>",
      "verdict": "FALSE",
      "explanation": "<why this is false>",
      "sources": ["<ACTUAL URL like https://snopes.com/fact-check/...>", "<ACTUAL URL>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "bias_analysis": {{
    "political_lean": <number -10 to 10, where -10=far left, 0=neutral, 10=far right>,
    "political_lean_label": "<string>",
    "emotional_tone": <number 0-10, where 0=neutral/factual, 10=highly emotional/sensational>,
    "emotional_tone_label": "<string>",
    "source_quality": <number 0-10, where 0=no sources, 10=peer-reviewed/authoritative>,
    "source_quality_label": "<string>",
    "overall_bias": "<Low | Moderate | High>"
  }},
  "red_flags": ["<any concerning patterns, logical fallacies, or manipulation tactics>"]
}}

Transcription:
{transcription}"""

                print(f"🤖 Sending {len(user_prompt)} characters to OpenAI GPT-4o-mini with JSON mode...")

                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},  # Guaranteed valid JSON!
                    temperature=0.3
                )

                analysis_json = response.choices[0].message.content
                print(f"✅ Received {len(analysis_json) if analysis_json else 0} characters from OpenAI")
                
                # Check if response is empty
                if not analysis_json or analysis_json.strip() == '':
                    print(f"❌ OpenAI returned empty response!")
                    raise Exception("OpenAI returned an empty response. Please try again.")
                
                # Parse to verify it's valid JSON
                try:
                    parsed = json.loads(analysis_json)
                    print(f"✅ OpenAI returned valid JSON with {len(parsed.get('verified_claims', []))} verified claims")
                except json.JSONDecodeError as json_err:
                    print(f"❌ Failed to parse OpenAI response as JSON: {str(json_err)}")
                    print(f"📄 Raw response (first 500 chars): {analysis_json[:500]}")
                    raise Exception(f"OpenAI returned invalid JSON: {str(json_err)}")
                
                # Return the JSON string (will be parsed by caller)
                return analysis_json
            
            else:
                prompt = f"Analyze the following transcription:\n\n{transcription}"
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                return response.choices[0].message.content
                
        except Exception as e:
            print(f"❌ OpenAI API error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Couldn't analyze transcription with OpenAI: {str(e)}")
    
    def process(self, video_url, analysis_type='summarize'):
        """Process video: try YouTube transcript first, then download+transcribe, then analyze"""
        # Determine platform
        is_youtube = 'youtube.com' in video_url or 'youtu.be' in video_url
        platform = 'youtube' if is_youtube else 'instagram'
        
        # Initialize metadata with defaults (we'll try to get real metadata later)
        title = 'Untitled'
        duration_minutes = 0
        creator_info = None  # Will be populated from video metadata
        
        transcription = None
        transcript_segments = None  # Timestamped segments from YouTube
        language = 'en'
        
        # Try YouTube transcript first (fastest method, works even if yt-dlp is blocked)
        if is_youtube:
            print("🎯 Attempting to use YouTube transcript (faster)...")
            yt_transcript = self.get_youtube_transcript(video_url)
            
            if yt_transcript:
                # YouTube transcript returns dict with 'text' and 'segments'
                if isinstance(yt_transcript, dict):
                    transcription = yt_transcript.get('text')
                    transcript_segments = yt_transcript.get('segments')
                    print(f"✅ Using YouTube transcript with {len(transcript_segments)} timestamped segments")
                else:
                    # Fallback for old format (just text)
                    transcription = yt_transcript
                    print("✅ Using YouTube transcript (no download needed!)")
            else:
                print("⚠️ No YouTube transcript available, falling back to download+Whisper...")
        
        # If no transcript available, download and transcribe
        if not transcription:
            print("📥 Downloading and transcribing video with Whisper...")
            print("⚠️ Note: Some videos may be blocked due to bot detection on server IPs")
            temp_dir = tempfile.mkdtemp()
            audio_path = os.path.join(temp_dir, 'audio.%(ext)s')
            
            try:
                # Download video
                info = self.download_video(video_url, audio_path)
                
                # Get actual audio file path
                actual_audio_path = None
                for ext in ['m4a', 'webm', 'mp3', 'ogg']:
                    test_path = audio_path.replace('%(ext)s', ext)
                    if os.path.exists(test_path):
                        actual_audio_path = test_path
                        break
                
                if not actual_audio_path:
                    raise Exception("Couldn't find downloaded audio file")
                
                # Transcribe
                transcription, language = self.transcribe_audio(actual_audio_path)
                print(f"✅ Transcription complete ({len(transcription)} characters)")
                
            finally:
                # Cleanup
                import shutil
                try:
                    shutil.rmtree(temp_dir)
                except:
                    pass
        
        # Try to get video metadata (non-blocking, best effort)
        if title == 'Untitled':
            try:
                print("📊 Attempting to fetch video metadata...")
                
                # Use proxy from instance variable
                proxy_url = self.proxy_url
                
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': True,  # Faster, less intrusive
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
                    print(f"🌐 Using proxy for metadata fetch...")
                    ydl_opts['proxy'] = proxy_url
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=False)
                    title = info.get('title', 'Untitled')
                    duration = info.get('duration', 0)
                    if duration > 0:
                        duration_minutes = duration / 60
                    
                    # Extract creator information for tracking
                    # YouTube categories: News & Politics, Education, Entertainment, Science & Technology, etc.
                    categories = info.get('categories', [])
                    category = categories[0] if categories else info.get('category', 'Unknown')
                    
                    creator_info = {
                        'name': info.get('uploader') or info.get('channel'),
                        'platform_id': info.get('channel_id') or info.get('uploader_id'),
                        'channel_url': info.get('channel_url') or info.get('uploader_url'),
                        'subscriber_count': info.get('channel_follower_count'),
                        'category': category
                    }
                print(f"✅ Metadata fetched: {title} ({duration_minutes:.1f} min)")
            except Exception as e:
                print(f"⚠️ Couldn't get video metadata (not critical, continuing...): {str(e)}")
                # Use video ID as fallback title
                if is_youtube:
                    try:
                        video_id = video_url.split('v=')[-1].split('&')[0] if 'v=' in video_url else video_url.split('/')[-1].split('?')[0]
                        title = f"YouTube Video {video_id}"
                    except:
                        title = 'YouTube Video'
        
        # Choose AI model based on transcript length
        transcript_length = len(transcription)
        use_openai = transcript_length >= 12000  # Switch to OpenAI to avoid Claude truncation issues
        
        if use_openai:
            print(f"🤖 Analyzing with OpenAI GPT-4o-mini ({transcript_length} chars)...")
            analysis = self.analyze_with_openai(transcription, analysis_type)
            # OpenAI returns JSON string, parse it to dict for highlight processing
            if analysis_type == 'fact-check' and isinstance(analysis, str):
                analysis = json.loads(analysis)
        else:
            print(f"🤖 Analyzing with Claude AI ({transcript_length} chars)...")
            analysis = self.analyze_with_claude(transcription, analysis_type)
        
        print("✅ Analysis complete!")
        
        # For fact-checks, auto-generate highlighted transcript if OpenAI or Claude didn't
        highlighted_transcript = None
        if analysis_type == 'fact-check' and isinstance(analysis, dict):
            # Check if Claude already added highlights
            claude_highlights = analysis.get('full_transcript_with_highlights')
            has_claude_highlights = claude_highlights and (
                '[VERIFIED]' in str(claude_highlights) or 
                '[OPINION]' in str(claude_highlights) or
                '[UNCERTAIN]' in str(claude_highlights) or
                '[FALSE]' in str(claude_highlights)
            )
            
            if has_claude_highlights:
                # Validate that Claude didn't truncate the transcript
                original_length = len(transcription)
                highlighted_length = len(str(claude_highlights))
                # Remove tags to get approximate content length
                content_length = len(re.sub(r'\[(VERIFIED|OPINION|UNCERTAIN|FALSE)\]', '', str(claude_highlights)))
                
                # If highlighted transcript is less than 80% of original, Claude truncated it
                if content_length < original_length * 0.8:
                    print(f"⚠️ Claude's highlighted transcript is truncated ({content_length} vs {original_length} chars)")
                    print("🎨 Falling back to auto-highlighting for complete transcript")
                    has_claude_highlights = False  # Force fallback
                else:
                    print(f"✅ Using Claude's inline highlights (short transcript) - {highlighted_length} chars")
            
            if has_claude_highlights:
                # Already validated above, use Claude's highlights
                pass
            else:
                print("🎨 Generating highlights via auto-matching (long transcript or Claude didn't add them)")
                highlighted_transcript = self.auto_highlight_transcript(transcription, analysis)
                # Add to analysis dict
                if highlighted_transcript and highlighted_transcript != transcription:
                    analysis['full_transcript_with_highlights'] = highlighted_transcript
                    print("✅ Highlighted transcript added to analysis")
                else:
                    print("⚠️ No highlights added to transcript")
        
        return {
            'title': title,
            'platform': platform,
            'duration_minutes': duration_minutes,
            'transcription': transcription,
            'transcript_segments': transcript_segments,  # Timestamped segments (YouTube only)
            'analysis': analysis,
            'creator_info': creator_info,
            'language': language
        }

