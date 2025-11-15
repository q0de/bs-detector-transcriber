from flask import Blueprint, request, jsonify
from middleware.auth_middleware import verify_token
from services.supabase_client import get_supabase_client
from services.video_processor import VideoProcessor
from datetime import datetime
import math

bp = Blueprint('videos', __name__)

@bp.route('/process', methods=['POST'])
@verify_token
def process_video():
    """Process video from URL"""
    try:
        data = request.get_json()
        video_url = data.get('url')
        analysis_type = data.get('analysis_type', 'summarize')
        
        if not video_url:
            return jsonify({'success': False, 'error': 'Video URL is required'}), 400
        
        if analysis_type not in ['summarize', 'fact-check']:
            return jsonify({'success': False, 'error': 'Invalid analysis type'}), 400
        
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get user to check limits
        user_response = supabase.table('users').select('*').eq('id', user_id).execute()
        if not user_response.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = user_response.data[0]
        
        # Initialize processor
        processor = VideoProcessor()
        
        # Estimate duration
        estimated_duration = processor.estimate_duration(video_url)
        estimated_minutes = math.ceil(estimated_duration / 60)
        
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
        
        # Process video
        result = processor.process(video_url, analysis_type)
        
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
            'completed_at': datetime.utcnow().isoformat()
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
        
        return jsonify({
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
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        if 'download' in error_msg.lower() or 'couldn\'t' in error_msg.lower():
            return jsonify({
                'success': False,
                'error': 'Couldn\'t download video. Make sure it\'s public and the URL is correct'
            }), 500
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

