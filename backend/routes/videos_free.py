from flask import Blueprint, request, jsonify
from services.slack_notifier import notify_video_upload

bp = Blueprint('videos_free', __name__)

def get_video_processor():
    """Lazy import VideoProcessor to avoid startup crashes"""
    from services.video_processor import VideoProcessor
    return VideoProcessor()


@bp.route('/process-free', methods=['POST'])
def process_video_free():
    """Process ONE free video for anonymous users - no signup required"""
    try:
        print("=== FREE VIDEO PROCESS: Starting (Anonymous) ===")
        data = request.get_json()
        video_url = data.get('url')
        
        print(f"Video URL: {video_url}")
        print(f"Analysis type: SUMMARIZE (free tier only)")
        
        if not video_url:
            return jsonify({'success': False, 'error': 'Video URL is required'}), 400
        
        # Initialize video processor
        processor = get_video_processor()
        
        # Process video (gets metadata, transcript, and analysis in one call)
        print("📊 Processing video (metadata + transcript + analysis)...")
        result = processor.process(video_url, analysis_type='summarize')
        
        # Extract data from result
        transcription = result.get('transcription', '')
        analysis = result.get('analysis', {})
        title = result.get('title', 'Unknown Video')
        duration_minutes = result.get('duration_minutes', 0)
        platform = result.get('platform', 'youtube')
        creator_info = result.get('creator_info', {})
        
        # Build metadata object
        metadata = {
            'title': title,
            'duration': duration_minutes * 60,  # Convert to seconds
            'platform': platform,
            'creator': creator_info.get('name') if creator_info else None,
            'channel_id': creator_info.get('platform_id') if creator_info else None,
            'channel_url': creator_info.get('channel_url') if creator_info else None,
        }
        
        print(f"✅ Processing complete: {title} ({duration_minutes:.1f} min)")
        
        # Send Slack notification for anonymous video upload
        try:
            notify_video_upload(
                email=None,  # Anonymous user
                video_url=video_url,
                video_title=title,
                duration_minutes=duration_minutes,
                analysis_type='summarize (free)',
                user_id=None
            )
        except Exception as slack_error:
            print(f"⚠️ Slack notification failed (non-critical): {str(slack_error)}")
        
        # Return results without saving to database
        return jsonify({
            'success': True,
            'is_free_trial': True,
            'analysis_type': 'summarize',
            'analysis': analysis,
            'transcription': transcription,
            'metadata': metadata,
            'platform': platform,
            'duration_minutes': duration_minutes,
            'title': title,
            'message': 'Free analysis complete! Sign up to save results and unlock fact-checking.'
        }), 200
        
    except Exception as e:
        print(f"❌ Free video processing error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        error_message = str(e)
        error_lower = error_message.lower()
        
        # Detect specific error types and provide helpful messages
        if any(keyword in error_lower for keyword in [
            'sign in to confirm', 'bot', 'ipblocked', 'ip blocked'
        ]):
            error_message = "YouTube is temporarily blocking access due to bot detection. Please try again in a few minutes or try a different video."
        elif any(keyword in error_lower for keyword in [
            'age-restricted', 'age restricted', 
            'private video', 'video unavailable', 'video is private',
            'this video is not available', 'unavailable in your country'
        ]):
            error_message = "This video is age-restricted, private, or unavailable. Please try a different video."
        elif any(keyword in error_lower for keyword in [
            'automated', 'blocked', 'forbidden', '403', '429'
        ]):
            error_message = "This video cannot be accessed right now. YouTube may be blocking automated access. Please try again later or use a different video."
        elif 'transcript' in error_lower and 'not available' in error_lower:
            error_message = "This video doesn't have captions/transcripts available. Please try a video with captions enabled."
        elif 'not found' in error_lower or 'invalid' in error_lower:
            error_message = "Video not found. Please check the URL and try again."
        else:
            # Keep original error for debugging, but make it user-friendly
            error_message = f"Unable to process this video: {error_message[:200]}"
        
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

