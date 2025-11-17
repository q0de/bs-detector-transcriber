import yt_dlp
import os
from anthropic import Anthropic
from datetime import datetime
import tempfile
import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

class VideoProcessor:
    def __init__(self):
        self.whisper_model = None
        self.whisper_module = None
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
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
                api = YouTubeTranscriptApi()
                transcript_list = api.list(video_id)
                
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
            # Get proxy from environment (same as download_video)
            proxy_url = os.environ.get('PROXY_URL', None)
            
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
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Sec-Fetch-Mode': 'navigate',
                },
            }
            
            # Add proxy if configured
            if proxy_url:
                print(f"🌐 Using proxy for duration estimation...")
                ydl_opts['proxy'] = proxy_url
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                duration = info.get('duration', 0)
                print(f"✅ Duration estimated: {duration}s ({duration/60:.1f} min)")
                return duration
        except Exception as e:
            print(f"❌ Duration estimation failed: {str(e)}")
            raise Exception(f"Couldn't estimate duration: {str(e)}")
    
    def download_video(self, video_url, output_path):
        """Download video using yt-dlp with anti-bot measures and optional proxy"""
        try:
            # Get proxy from environment (optional, for videos without transcripts)
            proxy_url = os.environ.get('PROXY_URL', None)
            
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
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Sec-Fetch-Mode': 'navigate',
                },
            }
            
            # Add proxy if configured (helps bypass datacenter IP blocking)
            if proxy_url:
                print(f"🌐 Using residential proxy for download...")
                ydl_opts['proxy'] = proxy_url
            else:
                print(f"⚠️ No proxy configured - datacenter IPs may be blocked by YouTube")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)
                return info
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
            models_to_try = [
                "claude-3-opus-20240229",      # Claude 3 Opus (most capable)
                "claude-3-sonnet-20240229",    # Claude 3 Sonnet  
                "claude-3-haiku-20240307",     # Claude 3 Haiku (fastest)
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
  "full_transcript_with_highlights": "<transcript with [VERIFIED], [OPINION], [UNCERTAIN], [FALSE] tags inline>"
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

Remember: Return ONLY the JSON object, no other text."""
            else:
                prompt = f"Analyze the following transcription:\n\n{transcription}"
            
            print(f"Sending {len(prompt)} characters to Claude...")
            
            # Try different models in order of preference with their max_tokens limits
            models_to_try = [
                ("claude-3-5-sonnet-20240620", 8000),   # Claude 3.5 Sonnet (June 2024 - stable)
                ("claude-3-opus-20240229", 8000),       # Claude 3 Opus
                ("claude-3-sonnet-20240229", 8000),     # Claude 3 Sonnet
                ("claude-3-haiku-20240307", 4096),      # Claude 3 Haiku (4K limit)
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
                    return parsed  # Return as dict/object, not string
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse JSON (will return raw text): {str(e)}")
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
                
                # Get proxy from environment
                proxy_url = os.environ.get('PROXY_URL', None)
                
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
        
        return {
            'title': title,
            'platform': platform,
            'duration_minutes': duration_minutes,
            'transcription': transcription,
            'analysis': analysis,
            'creator_info': creator_info,
            'language': language
        }

