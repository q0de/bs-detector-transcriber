import yt_dlp
import os
from anthropic import Anthropic
from datetime import datetime
import tempfile
import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

class VideoProcessor:
    def __init__(self):
        self.whisper_model = None
        self.whisper_module = None
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
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
                # Format: http://username:password@hostname:port
                proxy_url = f"http://{proxy_username}:{proxy_password}@{proxy_host}:{proxy_port}"
                print(f"✅ Built proxy URL from environment variables")
                return proxy_url
            else:
                print(f"⚠️ Missing proxy environment variables - need all 4: PROXY_HOST, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD")
            
            return None
        except Exception as e:
            print(f"⚠️ Error building proxy URL: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
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
        """Automatically add highlight tags to transcript based on claims"""
        if not transcript or not isinstance(analysis, dict):
            return transcript
        
        print("🎨 Auto-highlighting transcript based on claims...")
        
        # Collect all claims with their verdicts
        claims_with_tags = []
        
        for claim_type, tag in [
            ('verified_claims', '[VERIFIED]'),
            ('opinion_claims', '[OPINION]'),
            ('opinion_based_claims', '[OPINION]'),  # Handle both variations
            ('uncertain_claims', '[UNCERTAIN]'),
            ('false_claims', '[FALSE]')
        ]:
            claims_list = analysis.get(claim_type, [])
            if claims_list:
                for claim_obj in claims_list:
                    claim_text = claim_obj.get('claim', '').strip()
                    if claim_text and len(claim_text) > 10:  # Only process meaningful claims
                        claims_with_tags.append((claim_text, tag))
        
        if not claims_with_tags:
            print("⚠️ No claims found to highlight")
            return transcript
        
        # Sort claims by length (longest first) to avoid partial matches
        claims_with_tags.sort(key=lambda x: len(x[0]), reverse=True)
        
        highlighted = transcript
        highlights_added = 0
        
        # Add tags before each claim in the transcript
        for claim_text, tag in claims_with_tags:
            # Normalize whitespace
            normalized_claim = ' '.join(claim_text.split())
            
            print(f"  🔍 Searching for {tag}: \"{normalized_claim[:80]}...\"")
            
            import re
            
            # Strategy 1: Try exact match (case-insensitive, flexible whitespace)
            pattern = re.escape(normalized_claim)
            pattern = pattern.replace(r'\ ', r'\s+')
            matches = list(re.finditer(pattern, highlighted, re.IGNORECASE))
            
            # Strategy 2: If no exact match, try partial match with key words (5+ words minimum)
            if not matches and len(normalized_claim.split()) >= 5:
                # Extract key words (5-7 consecutive words from middle of claim)
                words = normalized_claim.split()
                # Try 7-word phrase first, then 5-word
                for window_size in [7, 5]:
                    if len(words) >= window_size and not matches:
                        start_idx = len(words) // 2 - window_size // 2
                        key_phrase = ' '.join(words[start_idx:start_idx + window_size])
                        pattern = re.escape(key_phrase)
                        pattern = pattern.replace(r'\ ', r'\s+')
                        matches = list(re.finditer(pattern, highlighted, re.IGNORECASE))
                        if matches:
                            print(f"  💡 Found via partial match: \"{key_phrase}\"")
                            break
            
            if matches:
                # Replace from end to start to preserve positions
                for match in reversed(matches):
                    # Insert tag before the match
                    start = match.start()
                    highlighted = highlighted[:start] + tag + ' ' + highlighted[start:]
                    highlights_added += 1
                    print(f"  ✅ Added {tag} at position {start}")
            else:
                print(f"  ❌ NOT FOUND (tried exact + partial)")
        
        if highlights_added > 0:
            print(f"✅ Added {highlights_added} highlights to transcript")
        else:
            print("⚠️ Could not find any claims in transcript to highlight")
        
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
        """Try to get transcript directly from YouTube"""
        try:
            video_id = self.extract_video_id(video_url)
            if not video_id:
                return None
            
            print(f"Attempting to fetch YouTube transcript for video ID: {video_id}")
            
            # Use the API for version 1.2.3 - create instance and use list() method
            try:
                # Set proxy environment variables temporarily for youtube-transcript-api
                # The library uses requests internally, which respects HTTP_PROXY/HTTPS_PROXY
                old_http_proxy = os.environ.get('HTTP_PROXY')
                old_https_proxy = os.environ.get('HTTPS_PROXY')
                
                if self.proxy_url:
                    print(f"🌐 Using proxy for YouTube transcript API...")
                    os.environ['HTTP_PROXY'] = self.proxy_url
                    os.environ['HTTPS_PROXY'] = self.proxy_url
                
                try:
                    api = YouTubeTranscriptApi()
                    transcript_list = api.list(video_id)
                finally:
                    # Restore original proxy settings
                    if old_http_proxy is not None:
                        os.environ['HTTP_PROXY'] = old_http_proxy
                    elif 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    
                    if old_https_proxy is not None:
                        os.environ['HTTPS_PROXY'] = old_https_proxy
                    elif 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
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
                
                # Combine all text segments
                full_text = ' '.join([snippet.text for snippet in fetched.snippets])
                
                print(f"✅ Successfully retrieved YouTube transcript ({len(full_text)} characters)")
                return full_text
                
            except Exception as e:
                print(f"⚠️ No transcripts available: {str(e)}")
                import traceback
                traceback.print_exc()
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
    
    def download_video(self, video_url, output_path):
        """Download video using yt-dlp with anti-bot measures and optional proxy"""
        try:
            # Get both HTTP and SOCKS5 proxy URLs
            http_proxy, socks5_proxy = self._get_proxy_urls()
            proxy_url = http_proxy  # Default to HTTP
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_path,
                'quiet': True,
                'no_warnings': True,
                # Anti-bot detection measures
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web'],  # Use mobile client
                        'player_skip': ['webpage', 'configs'],  # Skip some checks
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
            
            # Add proxy if configured (helps bypass datacenter IP blocking)
            if proxy_url:
                print(f"🌐 Using residential proxy for download (HTTP)...")
                ydl_opts['proxy'] = proxy_url
            else:
                print(f"⚠️ No proxy configured - datacenter IPs may be blocked by YouTube")
            
            # Try HTTP proxy first
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=True)
                    return info
            except Exception as http_error:
                # If HTTP proxy fails with 403, try SOCKS5
                if socks5_proxy and ('403' in str(http_error) or ('Forbidden' in str(http_error))):
                    print(f"🔄 HTTP proxy failed, trying SOCKS5 proxy...")
                    ydl_opts['proxy'] = socks5_proxy
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(video_url, download=True)
                        return info
                else:
                    raise http_error
        except Exception as e:
            raise Exception(f"Couldn't download video: {str(e)}")
    
    def transcribe_audio(self, audio_path):
        """Transcribe audio using Whisper"""
        try:
            model = self._get_whisper_model()
            result = model.transcribe(audio_path)
            return result['text'], result.get('language', 'en')
        except Exception as e:
            raise Exception(f"Couldn't transcribe audio: {str(e)}")
    
    def deep_recheck_claim(self, claim, timestamp, context, original_verdict):
        """Perform deep fact-check on a single claim flagged by user"""
        import json
        import re
        
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
            # Prioritize Sonnet models for better re-check quality
            models_to_try = [
                "claude-3-5-sonnet-20241022",  # Claude 3.5 Sonnet v2 (Oct 2024) - BEST
                "claude-3-5-sonnet-20240620",  # Claude 3.5 Sonnet (June 2024) - fallback
                "claude-3-sonnet-20240229",    # Claude 3 Sonnet (Feb 2024) - older but reliable
                "claude-3-5-haiku-20241022",   # Claude 3.5 Haiku (Oct 2024) - fast
                "claude-3-haiku-20240307",     # Claude 3 Haiku (fallback)
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
                prompt = f"""Please provide a comprehensive summary of the following video transcription. Include:
1. Main topics discussed
2. Key points and takeaways
3. Important details
4. Overall conclusion

Transcription:
{transcription}"""
            elif analysis_type == 'fact-check':
                # Determine if transcript is short enough for Claude to add inline highlights
                # Claude max_tokens: 8000 ≈ 32,000 chars max output
                # Need space for: transcript + highlights (~+20%) + JSON structure (~2000 tokens)
                # Increased limit: ~20,000 chars = ~5,000 tokens transcript + ~2,000 tokens JSON = ~7,000 tokens total
                transcript_length = len(transcription)
                include_highlights_instruction = transcript_length < 20000
                
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
      "timestamp": "<MM:SS or 'Throughout'>",
      "claim": "<exact claim from video>",
      "verdict": "VERIFIED",
      "explanation": "<why this is verified>",
      "sources": ["<source 1>", "<source 2>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "opinion_claims": [
    {{
      "timestamp": "<MM:SS>",
      "claim": "<exact claim>",
      "verdict": "OPINION",
      "explanation": "<why this is subjective/speculative>",
      "sources": ["<relevant context if any>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "uncertain_claims": [
    {{
      "timestamp": "<MM:SS>",
      "claim": "<exact claim>",
      "verdict": "UNCERTAIN",
      "explanation": "<why uncertain - lack of evidence but not disproven>",
      "sources": ["<source if any>"],
      "confidence": "<High | Medium | Low>"
    }}
  ],
  "false_claims": [
    {{
      "timestamp": "<MM:SS>",
      "claim": "<exact claim>",
      "verdict": "FALSE",
      "explanation": "<why this is false>",
      "sources": ["<debunking source 1>", "<debunking source 2>"],
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

CLAIM CATEGORIES:
- VERIFIED: Factual claims backed by reliable sources
- OPINION: Subjective judgments, predictions, speculations, or interpretations (e.g., "I think", "will be", "worst ever", personal beliefs)
- UNCERTAIN: Factual claims that lack sufficient evidence but aren't disproven
- FALSE: Claims that are demonstrably incorrect or misleading

FACT SCORE GUIDANCE:
- Base the fact_score (0-10) primarily on VERIFIED vs FALSE claims
- OPINION claims should NOT significantly lower the score (they're subjective, not false)
- UNCERTAIN claims should have minor impact (lack of evidence, not misinformation)
- A video with many opinions but accurate facts should still score 7-9
- Only penalize heavily for demonstrably FALSE claims

Analyze this transcription:
{transcription}

{"CRITICAL: For short transcripts, the 'full_transcript_with_highlights' field MUST contain the COMPLETE, WORD-FOR-WORD transcript (every single word from the transcription above) with [VERIFIED], [OPINION], [UNCERTAIN], [FALSE] tags inserted. Do NOT summarize, do NOT truncate, do NOT skip words. Include the ENTIRE transcript exactly as provided, just with tags added." if include_highlights_instruction else ""}

Remember: Return ONLY the JSON object, no other text."""
            else:
                prompt = f"Analyze the following transcription:\n\n{transcription}"
            
            print(f"Sending {len(prompt)} characters to Claude...")
            
            # Try different models in order of preference with their max_tokens limits
            # Prioritize Sonnet models for better quality, especially for highlights
            models_to_try = [
                ("claude-3-5-sonnet-20241022", 8000),   # Claude 3.5 Sonnet v2 (Oct 2024) - BEST
                ("claude-3-5-sonnet-20240620", 8000),   # Claude 3.5 Sonnet (June 2024) - fallback
                ("claude-3-sonnet-20240229", 8000),     # Claude 3 Sonnet (Feb 2024) - older but reliable
                ("claude-3-5-haiku-20241022", 8000),    # Claude 3.5 Haiku (Oct 2024) - fast
                ("claude-3-haiku-20240307", 4096),      # Claude 3 Haiku (fallback)
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
                    import json
                    import re
                    
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
        language = 'en'
        
        # Try YouTube transcript first (fastest method, works even if yt-dlp is blocked)
        if is_youtube:
            print("🎯 Attempting to use YouTube transcript (faster)...")
            transcription = self.get_youtube_transcript(video_url)
            
            if transcription:
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
        
        # Analyze with Claude
        print("🤖 Analyzing with Claude AI...")
        analysis = self.analyze_with_claude(transcription, analysis_type)
        print("✅ Analysis complete!")
        
        # For fact-checks, auto-generate highlighted transcript if Claude didn't
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
            'analysis': analysis,
            'creator_info': creator_info,
            'language': language
        }

