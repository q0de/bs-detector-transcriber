from flask import Blueprint, request, Response
from services.supabase_client import get_supabase_client

badges_bp = Blueprint('badges', __name__)
supabase = get_supabase_client()

def get_badge_color(score):
    """Get badge color based on score"""
    if score >= 8:
        return "#4CAF50"  # Green
    elif score >= 6:
        return "#2196F3"  # Blue
    elif score >= 4:
        return "#FF9800"  # Orange
    else:
        return "#F44336"  # Red

def generate_star_svg(score, max_stars=5):
    """Generate star rating SVG"""
    stars = ""
    for i in range(max_stars):
        if i < int(score / 2):
            # Full star
            stars += f'<path d="M{10 + i*12} 0 L{12 + i*12} 6 L{18 + i*12} 6 L{13 + i*12} 10 L{15 + i*12} 16 L{10 + i*12} 12 L{5 + i*12} 16 L{7 + i*12} 10 L{2 + i*12} 6 L{8 + i*12} 6 Z" fill="#FFD700"/>'
        else:
            # Empty star
            stars += f'<path d="M{10 + i*12} 0 L{12 + i*12} 6 L{18 + i*12} 6 L{13 + i*12} 10 L{15 + i*12} 16 L{10 + i*12} 12 L{5 + i*12} 16 L{7 + i*12} 10 L{2 + i*12} 6 L{8 + i*12} 6 Z" fill="none" stroke="#FFD700" stroke-width="1"/>'
    return stars

@badges_bp.route('/creator/<creator_id>', methods=['GET'])
def get_creator_badge(creator_id):
    """Generate SVG badge for a creator"""
    try:
        # Get creator data
        creator_response = supabase.table('creators').select('*').eq('id', creator_id).execute()
        
        if not creator_response.data:
            return Response('Creator not found', status=404)
        
        creator = creator_response.data[0]
        
        # Check if enough videos analyzed
        if creator['total_videos_analyzed'] < 10:
            return Response('Not enough data (minimum 10 videos required)', status=400)
        
        name = creator['name']
        score = float(creator['avg_fact_score'])
        total_videos = creator['total_videos_analyzed']
        color = get_badge_color(score)
        
        # Generate SVG
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{color};stop-opacity:0.8" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="200" height="80" rx="8" fill="url(#grad)"/>
  
  <!-- Content -->
  <text x="100" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">
    {name[:25]}
  </text>
  
  <!-- Score -->
  <text x="100" y="40" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">
    {score:.1f}/10
  </text>
  
  <!-- Videos count -->
  <text x="100" y="60" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle">
    {total_videos} videos analyzed
  </text>
  
  <!-- Verified badge -->
  <circle cx="180" cy="15" r="8" fill="white" opacity="0.9"/>
  <text x="180" y="19" font-family="Arial, sans-serif" font-size="12" fill="{color}" text-anchor="middle">✓</text>
</svg>'''
        
        return Response(svg, mimetype='image/svg+xml', headers={
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        })
        
    except Exception as e:
        print(f"Error generating creator badge: {str(e)}")
        return Response(f'Error: {str(e)}', status=500)


@badges_bp.route('/video/<video_id>', methods=['GET'])
def get_video_badge(video_id):
    """Generate SVG badge for a video"""
    try:
        # Validate video_id is not undefined or empty
        if not video_id or video_id == 'undefined' or video_id.strip() == '':
            return Response('Invalid video ID', status=400)
        
        # Validate UUID format (basic check)
        import re
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
        if not uuid_pattern.match(video_id):
            return Response('Invalid video ID format', status=400)
        
        # Get video data
        video_response = supabase.table('videos').select('title, analysis').eq('id', video_id).execute()
        
        if not video_response.data:
            return Response('Video not found', status=404)
        
        video = video_response.data[0]
        
        # Parse analysis to get fact score
        analysis = video.get('analysis')
        if not analysis:
            return Response('Video has not been analyzed', status=400)
        
        # Handle both string and dict analysis
        if isinstance(analysis, str):
            import json
            try:
                analysis = json.loads(analysis)
            except:
                return Response('Invalid analysis data', status=400)
        
        fact_score = analysis.get('fact_score', 0)
        color = get_badge_color(fact_score)
        
        # Get upload count
        video_url = video_response.data[0].get('url', '')
        upload_response = supabase.table('video_uploads').select('upload_count').eq('video_url', video_url).execute()
        upload_count = upload_response.data[0]['upload_count'] if upload_response.data else 1
        
        # Generate SVG
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{color};stop-opacity:0.8" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="180" height="60" rx="6" fill="url(#grad)"/>
  
  <!-- Label -->
  <text x="90" y="18" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">
    FACT-CHECK SCORE
  </text>
  
  <!-- Score -->
  <text x="90" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
    {fact_score:.1f}/10
  </text>
  
  <!-- Upload count -->
  <text x="90" y="54" font-family="Arial, sans-serif" font-size="8" fill="white" text-anchor="middle" opacity="0.8">
    Analyzed {upload_count} time{"s" if upload_count != 1 else ""}
  </text>
</svg>'''
        
        return Response(svg, mimetype='image/svg+xml', headers={
            'Cache-Control': 'public, max-age=1800',
            'Access-Control-Allow-Origin': '*'
        })
        
    except Exception as e:
        print(f"Error generating video badge: {str(e)}")
        return Response(f'Error: {str(e)}', status=500)


@badges_bp.route('/creator-by-platform/<platform>/<platform_id>', methods=['GET'])
def get_creator_badge_by_platform(platform, platform_id):
    """Generate SVG badge for a creator by platform ID"""
    try:
        # Get creator data by platform
        creator_response = supabase.table('creators').select('*').eq('platform', platform).eq('platform_id', platform_id).execute()
        
        if not creator_response.data:
            return Response('Creator not found', status=404)
        
        creator = creator_response.data[0]
        
        # Redirect to main badge endpoint
        return get_creator_badge(creator['id'])
        
    except Exception as e:
        print(f"Error generating creator badge by platform: {str(e)}")
        return Response(f'Error: {str(e)}', status=500)

