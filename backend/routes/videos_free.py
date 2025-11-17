from flask import Blueprint, request, jsonify

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
        
        # Step 1: Get metadata
        print("📊 Step 1: Getting video metadata...")
        metadata = processor.get_video_metadata(video_url)
        print(f"✅ Metadata retrieved: {metadata.get('title', 'Unknown')}")
        
        # Step 2: Get transcript
        print("📝 Step 2: Getting transcript...")
        transcript_result = processor.get_transcript(video_url)
        transcription = transcript_result['transcript']
        print(f"✅ Transcript retrieved ({len(transcription)} chars)")
        
        # Step 3: Analyze (summarize only for free users)
        print("🤖 Step 3: Analyzing with AI (SUMMARIZE mode)...")
        analysis = processor.analyze_transcript(
            transcription=transcription,
            analysis_type='summarize'
        )
        print("✅ Analysis complete")
        
        # Return results without saving to database
        return jsonify({
            'success': True,
            'is_free_trial': True,
            'analysis_type': 'summarize',
            'analysis': analysis,
            'transcription': transcription,
            'metadata': metadata,
            'platform': metadata.get('platform', 'youtube'),
            'duration_minutes': metadata.get('duration', 0) / 60,
            'title': metadata.get('title', 'Unknown Video'),
            'message': 'Free analysis complete! Sign up to save results and unlock fact-checking.'
        }), 200
        
    except Exception as e:
        print(f"❌ Free video processing error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        error_message = str(e)
        if 'sign in to confirm' in error_message.lower() or 'bot' in error_message.lower():
            error_message = "This video is age-restricted or requires sign-in. Please try a different video."
        
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

