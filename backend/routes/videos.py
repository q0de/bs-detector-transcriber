from flask import Blueprint, request, jsonify
from middleware.auth_middleware import verify_token
from services.supabase_client import get_supabase_client
from datetime import datetime
import math
import os

bp = Blueprint('videos', __name__)

def get_video_processor():
    """Lazy import VideoProcessor to avoid startup crashes"""
    from services.video_processor import VideoProcessor
    return VideoProcessor()

@bp.route('/process', methods=['POST'])
@verify_token
def process_video():
    """Process video from URL"""
    try:
        print("=== VIDEO PROCESS: Starting ===")
        data = request.get_json()
        video_url = data.get('url')
        analysis_type = data.get('analysis_type', 'summarize')
        
        print(f"Video URL: {video_url}")
        print(f"Analysis type: {analysis_type}")
        
        if not video_url:
            return jsonify({'success': False, 'error': 'Video URL is required'}), 400
        
        if analysis_type not in ['summarize', 'fact-check']:
            return jsonify({'success': False, 'error': 'Invalid analysis type'}), 400
        
        supabase = get_supabase_client()
        user_id = request.user_id
        
        print(f"User ID: {user_id}")
        
        # Get user to check limits
        user_response = supabase.table('users').select('*').eq('id', user_id).execute()
        if not user_response.data:
            print(f"❌ User not found: {user_id}")
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = user_response.data[0]
        print(f"✅ User found: {user.get('email')}")
        
        # Check if we already have a transcript for this video URL
        print(f"Checking for existing transcript for URL: {video_url}")
        existing_video = supabase.table('videos').select('transcription, title, platform, duration_minutes').eq('user_id', user_id).eq('video_url', video_url).order('created_at', desc=True).limit(1).execute()
        
        existing_transcript = None
        video_metadata = {}
        
        if existing_video.data and existing_video.data[0].get('transcription'):
            existing_transcript = existing_video.data[0]['transcription']
            video_metadata = {
                'title': existing_video.data[0].get('title', 'Untitled'),
                'platform': existing_video.data[0].get('platform', 'youtube'),
                'duration_minutes': float(existing_video.data[0].get('duration_minutes', 0))
            }
            print(f"✅ Found existing transcript ({len(existing_transcript)} chars) - will reuse!")
            print(f"   Title: {video_metadata['title']}")
            print(f"   Duration: {video_metadata['duration_minutes']} minutes")
        
        # Initialize processor (lazy import)
        print("Initializing VideoProcessor...")
        try:
            processor = get_video_processor()
            print("✅ VideoProcessor initialized")
        except Exception as proc_error:
            print(f"❌ VideoProcessor initialization failed: {proc_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Video processor initialization failed: {str(proc_error)}'}), 500
        
        # Try to get YouTube transcript first (works without proxy, fast!)
        estimated_minutes = 15  # Default estimate
        has_transcript = False
        
        if not existing_transcript and ('youtube.com' in video_url or 'youtu.be' in video_url):
            print("🎯 Checking for YouTube transcript (no proxy needed)...")
            test_transcript = processor.get_youtube_transcript(video_url)
            if test_transcript:
                print(f"✅ Found YouTube transcript! Estimating from transcript length...")
                # Estimate: ~150 words per minute speaking rate
                word_count = len(test_transcript.split())
                estimated_minutes = math.ceil(word_count / 150)
                has_transcript = True
                print(f"📊 Estimated {estimated_minutes} minutes based on transcript ({word_count} words)")
            else:
                print("⚠️ No YouTube transcript - will need to download video")
        
        # Only estimate duration with yt-dlp if we couldn't get transcript
        if not has_transcript and not existing_transcript:
            try:
                print("⏱️ Estimating video duration with yt-dlp...")
                estimated_duration = processor.estimate_duration(video_url)
                print(f"✅ Estimated duration: {estimated_duration}s ({estimated_duration/60:.1f} min)")
                estimated_minutes = math.ceil(estimated_duration / 60)
            except Exception as est_error:
                print(f"⚠️ Duration estimation failed (not critical): {str(est_error)}")
                print("   Will use default estimate of 15 minutes")
                estimated_minutes = 15
        elif existing_transcript:
            estimated_minutes = math.ceil(video_metadata['duration_minutes'])
            print(f"✅ Using cached duration: {estimated_minutes} minutes")
        
        print(f"📊 Will charge {estimated_minutes} minutes for this video")
        
        # Check limit
        used = float(user.get('minutes_used_this_month', 0))
        limit = user.get('monthly_minute_limit', 60)
        
        if used + estimated_minutes > limit:
            return jsonify({
                'success': False,
                'error': f'Monthly limit reached ({limit} minutes). Please upgrade your plan.',
                'upgrade_required': True,
                'current_tier': user.get('subscription_tier', 'free'),
                'used': used,
                'limit': limit
            }), 403
        
        # Process video (use cached transcript if available)
        if existing_transcript:
            print("🔄 Reusing cached transcript - only running new analysis!")
            # Only run Claude analysis with the existing transcript
            analysis = processor.analyze_with_claude(existing_transcript, analysis_type)
            result = {
                'title': video_metadata['title'],
                'platform': video_metadata['platform'],
                'duration_minutes': video_metadata['duration_minutes'],
                'transcription': existing_transcript,
                'analysis': analysis,
                'language': 'en'
            }
        else:
            print("📥 No cached transcript - fetching new transcript and analyzing...")
            result = processor.process(video_url, analysis_type)
        
        # Track creator (if metadata was successfully extracted)
        creator_id = None
        creator_data = None
        if result.get('creator_info') and result['creator_info'].get('name'):
            try:
                print("👤 Tracking creator...")
                creator_info = result['creator_info']
                
                # Upsert creator using database function
                creator_response = supabase.rpc('upsert_creator', {
                    'p_name': creator_info['name'],
                    'p_platform_id': creator_info['platform_id'] or 'unknown',
                    'p_platform': result.get('platform', 'youtube'),
                    'p_channel_url': creator_info.get('channel_url'),
                    'p_subscriber_count': creator_info.get('subscriber_count')
                }).execute()
                
                if creator_response.data:
                    creator_id = creator_response.data
                    print(f"✅ Creator tracked: {creator_info['name']} (ID: {creator_id})")
                    
                    # Track video upload globally
                    supabase.rpc('track_video_upload', {
                        'p_video_url': video_url,
                        'p_creator_id': creator_id
                    }).execute()
                    
                    # If this is a fact-check, update creator stats
                    if analysis_type == 'fact-check' and creator_id:
                        # Extract fact_score from analysis
                        fact_score = None
                        if isinstance(result['analysis'], dict):
                            fact_score = result['analysis'].get('fact_score')
                        elif isinstance(result['analysis'], str):
                            # Try to parse JSON from string
                            try:
                                import json
                                analysis_obj = json.loads(result['analysis'])
                                fact_score = analysis_obj.get('fact_score')
                            except:
                                pass
                        
                        if fact_score is not None:
                            print(f"📊 Updating creator stats with score: {fact_score}")
                            supabase.rpc('update_creator_stats', {
                                'p_creator_id': creator_id,
                                'p_new_fact_score': float(fact_score)
                            }).execute()
                            
                            # Fetch updated creator data for response
                            creator_query = supabase.table('creators').select('*').eq('id', creator_id).execute()
                            if creator_query.data:
                                creator_data = creator_query.data[0]
                                print(f"✅ Creator stats updated: {creator_data['total_videos_analyzed']} videos, avg score: {creator_data['avg_fact_score']}")
            except Exception as e:
                print(f"⚠️ Creator tracking failed (non-critical): {str(e)}")
                # Continue processing even if creator tracking fails
        
        # Calculate actual minutes charged (round up)
        actual_minutes = math.ceil(result['duration_minutes'])
        
        # Save to database
        video_data = {
            'user_id': user_id,
            'video_url': video_url,
            'title': result.get('title', 'Untitled'),
            'platform': result.get('platform', 'unknown'),
            'duration_minutes': result['duration_minutes'],
            'transcription': result['transcription'],
            'analysis': result['analysis'],
            'analysis_type': analysis_type,
            'processing_status': 'completed',
            'minutes_charged': actual_minutes,
            'completed_at': datetime.utcnow().isoformat(),
            'creator_id': creator_id,
            'creator_name': result.get('creator_info', {}).get('name') if result.get('creator_info') else None,
            'creator_platform_id': result.get('creator_info', {}).get('platform_id') if result.get('creator_info') else None
        }
        
        video_response = supabase.table('videos').insert(video_data).execute()
        video_id = video_response.data[0]['id'] if video_response.data else None
        
        # Update user minutes
        new_used = used + actual_minutes
        supabase.table('users').update({
            'minutes_used_this_month': new_used
        }).eq('id', user_id).execute()
        
        # Create transaction record
        supabase.table('minute_transactions').insert({
            'user_id': user_id,
            'video_id': video_id,
            'minutes_used': actual_minutes,
            'transaction_type': 'video_processing'
        }).execute()
        
        remaining = max(0, limit - new_used)
        
        response_data = {
            'success': True,
            'video_id': video_id,
            'video_url': video_url,
            'title': result.get('title', 'Untitled'),
            'platform': result.get('platform', 'unknown'),
            'duration_minutes': result['duration_minutes'],
            'minutes_charged': actual_minutes,
            'transcription': result['transcription'],
            'analysis': result['analysis'],
            'minutes_remaining': remaining
        }
        
        # Add creator data if available (only if 10+ videos analyzed)
        if creator_data and creator_data.get('total_videos_analyzed', 0) >= 10:
            response_data['creator'] = {
                'name': creator_data['name'],
                'total_videos': creator_data['total_videos_analyzed'],
                'avg_score': float(creator_data['avg_fact_score']) if creator_data.get('avg_fact_score') else None,
                'last_score': float(creator_data['last_fact_score']) if creator_data.get('last_fact_score') else None
            }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ VIDEO PROCESS ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Specific error messages for common issues
        if 'bot' in error_msg.lower() or 'sign in' in error_msg.lower():
            print("⚠️ Detected bot/sign-in error - likely YouTube blocking")
            return jsonify({
                'success': False,
                'error': 'This video doesn\'t have transcripts available and cannot be downloaded due to access restrictions. Please try a different video or one with captions enabled.',
                'suggestion': 'Most news videos, educational content, and popular channels have transcripts and will work.'
            }), 400
        elif 'download' in error_msg.lower() or 'couldn\'t' in error_msg.lower() or 'duration' in error_msg.lower():
            print("⚠️ Detected download/duration error")
            return jsonify({
                'success': False,
                'error': 'Couldn\'t access video. Make sure it\'s public, has captions/transcripts, and the URL is correct.',
                'suggestion': 'Check if the video has transcripts by clicking "..." under the video and looking for "Show transcript".',
                'debug_info': error_msg if os.getenv('FLASK_ENV') == 'development' else None
            }), 400
        
        print(f"⚠️ Unexpected error type - returning 500")
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/history', methods=['GET'])
@verify_token
def get_history():
    """Get user's video history"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        platform = request.args.get('platform')
        analysis_type = request.args.get('analysis_type')
        search = request.args.get('search')
        
        # Build query
        query = supabase.table('videos').select('*', count='exact').eq('user_id', user_id)
        
        if platform:
            query = query.eq('platform', platform)
        
        if analysis_type:
            query = query.eq('analysis_type', analysis_type)
        
        if search:
            query = query.or_(f'title.ilike.%{search}%,video_url.ilike.%{search}%')
        
        # Order by created_at desc
        query = query.order('created_at', desc=True)
        
        # Pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        
        response = query.execute()
        
        total = response.count if hasattr(response, 'count') else len(response.data)
        pages = math.ceil(total / limit) if total > 0 else 1
        
        # Format response
        videos = []
        for video in response.data:
            videos.append({
                'id': video['id'],
                'video_url': video['video_url'],
                'title': video.get('title', 'Untitled'),
                'platform': video.get('platform', 'unknown'),
                'duration_minutes': float(video.get('duration_minutes', 0)),
                'minutes_charged': int(video.get('minutes_charged', 0)),
                'analysis_type': video.get('analysis_type', 'summarize'),
                'created_at': video.get('created_at')
            })
        
        return jsonify({
            'videos': videos,
            'total': total,
            'page': page,
            'pages': pages,
            'limit': limit
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<video_id>', methods=['GET'])
@verify_token
def get_video(video_id):
    """Get single video details"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        response = supabase.table('videos').select('*').eq('id', video_id).eq('user_id', user_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Video not found'}), 404
        
        video = response.data[0]
        
        return jsonify({
            'id': video['id'],
            'video_url': video['video_url'],
            'title': video.get('title', 'Untitled'),
            'platform': video.get('platform', 'unknown'),
            'duration_minutes': float(video.get('duration_minutes', 0)),
            'minutes_charged': int(video.get('minutes_charged', 0)),
            'transcription': video.get('transcription', ''),
            'analysis': video.get('analysis', ''),
            'analysis_type': video.get('analysis_type', 'summarize'),
            'created_at': video.get('created_at'),
            'completed_at': video.get('completed_at')
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<video_id>', methods=['DELETE'])
@verify_token
def delete_video(video_id):
    """Delete video from history"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Verify ownership
        check = supabase.table('videos').select('id').eq('id', video_id).eq('user_id', user_id).execute()
        if not check.data:
            return jsonify({'success': False, 'error': 'Video not found'}), 404
        
        # Delete video
        supabase.table('videos').delete().eq('id', video_id).eq('user_id', user_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Video deleted'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<video_id>/export', methods=['GET'])
@verify_token
def export_video(video_id):
    """Export video results"""
    try:
        export_format = request.args.get('format')
        if export_format not in ['txt', 'pdf', 'docx']:
            return jsonify({'success': False, 'error': 'Invalid format'}), 400
        
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get video
        response = supabase.table('videos').select('*').eq('id', video_id).eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({'success': False, 'error': 'Video not found'}), 404
        
        video = response.data[0]
        
        # Check tier for DOCX
        user_response = supabase.table('users').select('subscription_tier').eq('id', user_id).execute()
        tier = user_response.data[0].get('subscription_tier', 'free') if user_response.data else 'free'
        
        if export_format == 'docx' and tier not in ['pro', 'business', 'enterprise']:
            return jsonify({
                'success': False,
                'error': 'Your plan doesn\'t support DOCX export. Upgrade to Pro.'
            }), 403
        
        # Generate export
        from services.export_service import ExportService
        exporter = ExportService()
        
        if export_format == 'txt':
            content = exporter.export_txt(video)
            from flask import Response
            return Response(
                content,
                mimetype='text/plain',
                headers={'Content-Disposition': f'attachment; filename=video-analysis-{video_id[:8]}.txt'}
            )
        elif export_format == 'pdf':
            content = exporter.export_pdf(video)
            from flask import Response
            return Response(
                content,
                mimetype='application/pdf',
                headers={'Content-Disposition': f'attachment; filename=video-analysis-{video_id[:8]}.pdf'}
            )
        elif export_format == 'docx':
            content = exporter.export_docx(video)
            from flask import Response
            return Response(
                content,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                headers={'Content-Disposition': f'attachment; filename=video-analysis-{video_id[:8]}.docx'}
            )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

