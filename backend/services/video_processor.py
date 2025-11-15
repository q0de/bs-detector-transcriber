import yt_dlp
import whisper
import os
from anthropic import Anthropic
from datetime import datetime
import tempfile

class VideoProcessor:
    def __init__(self):
        self.whisper_model = None
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    def _get_whisper_model(self):
        """Lazy load Whisper model"""
        if self.whisper_model is None:
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
            if analysis_type == 'summarize':
                prompt = f"""Please provide a comprehensive summary of the following video transcription. Include:
1. Main topics discussed
2. Key points and takeaways
3. Important details
4. Overall conclusion

Transcription:
{transcription}"""
            elif analysis_type == 'fact-check':
                prompt = f"""Please fact-check the following video transcription. For each claim or statement:
1. Identify factual claims
2. Assess their accuracy (if possible)
3. Note any unverifiable claims
4. Highlight potential misinformation or bias
5. Provide context where helpful

Transcription:
{transcription}"""
            else:
                prompt = f"Analyze the following transcription:\n\n{transcription}"
            
            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            analysis = message.content[0].text
            return analysis
        except Exception as e:
            raise Exception(f"Couldn't analyze with AI: {str(e)}")
    
    def process(self, video_url, analysis_type='summarize'):
        """Process video: download, transcribe, analyze"""
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
            
            # Get video metadata
            title = info.get('title', 'Untitled')
            duration = info.get('duration', 0)
            duration_minutes = duration / 60
            
            # Determine platform
            platform = 'youtube' if 'youtube.com' in video_url or 'youtu.be' in video_url else 'instagram'
            
            # Transcribe
            transcription, language = self.transcribe_audio(actual_audio_path)
            
            # Analyze
            analysis = self.analyze_with_claude(transcription, analysis_type)
            
            return {
                'title': title,
                'platform': platform,
                'duration_minutes': duration_minutes,
                'transcription': transcription,
                'analysis': analysis,
                'language': language
            }
            
        finally:
            # Cleanup
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass

