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
            
            # Get list of available transcripts
            api = YouTubeTranscriptApi()
            transcript_list = api.list(video_id)
            
            # Find and fetch English transcript (or first available)
            transcript = None
            for t in transcript_list:
                if t.language_code.startswith('en'):
                    transcript = t
                    break
            
            if not transcript and transcript_list:
                transcript = transcript_list[0]
            
            if not transcript:
                print("⚠️ No transcripts available")
                return None
            
            # Fetch the transcript data
            fetched_transcript = transcript.fetch()
            
            # Get snippets and combine text
            full_text = ' '.join([snippet.text for snippet in fetched_transcript.snippets])
            
            print(f"✅ Successfully retrieved YouTube transcript ({len(full_text)} characters)")
            return full_text
            
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
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                duration = info.get('duration', 0)
                return duration
        except Exception as e:
            raise Exception(f"Couldn't estimate duration: {str(e)}")
    
    def download_video(self, video_url, output_path):
        """Download video using yt-dlp"""
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_path,
                'quiet': True,
                'no_warnings': True,
            }
            
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
  "uncertain_claims": [
    {{
      "timestamp": "<MM:SS>",
      "claim": "<exact claim>",
      "verdict": "UNCERTAIN",
      "explanation": "<why uncertain>",
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
  "full_transcript_with_highlights": "<transcript with [VERIFIED], [UNCERTAIN], [FALSE] tags inline>"
}}

Analyze this transcription:
{transcription}

Remember: Return ONLY the JSON object, no other text."""
            else:
                prompt = f"Analyze the following transcription:\n\n{transcription}"
            
            print(f"Sending {len(prompt)} characters to Claude...")
            
            # Try different models in order of preference
            models_to_try = [
                "claude-3-5-sonnet-20241022",  # Latest
                "claude-3-opus-20240229",       # Claude 3 Opus
                "claude-3-haiku-20240307",      # Claude 3 Haiku (fastest)
                "claude-2.1",                    # Claude 2.1
                "claude-instant-1.2"             # Claude Instant (fastest/cheapest)
            ]
            
            message = None
            last_error = None
            
            for model in models_to_try:
                try:
                    print(f"Trying model: {model}")
                    message = self.anthropic_client.messages.create(
                        model=model,
                        max_tokens=4000,
                        messages=[{
                            "role": "user",
                            "content": prompt
                        }]
                    )
                    print(f"✅ Success with model: {model}")
                    break
                except Exception as e:
                    last_error = e
                    print(f"❌ Model {model} failed: {str(e)}")
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
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': True  # Faster, less intrusive
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=False)
                    title = info.get('title', 'Untitled')
                    duration = info.get('duration', 0)
                    if duration > 0:
                        duration_minutes = duration / 60
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
            'language': language
        }

