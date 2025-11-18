import os
import requests
import json
from datetime import datetime

def send_slack_notification(message, color="good"):
    """
    Send a notification to Slack via webhook
    
    Args:
        message: The message text to send
        color: Color for the message border (good=green, warning=yellow, danger=red)
    """
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    
    if not webhook_url:
        # Silently fail if webhook not configured (optional feature)
        return
    
    try:
        payload = {
            "attachments": [
                {
                    "color": color,
                    "text": message,
                    "footer": "BS Detector",
                    "ts": int(datetime.now().timestamp())
                }
            ]
        }
        
        response = requests.post(
            webhook_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            print("[OK] Slack notification sent")
        else:
            print(f"[WARNING] Slack notification failed: {response.status_code} - {response.text}")
    
    except Exception as e:
        # Don't fail the main operation if Slack fails
        print(f"[WARNING] Failed to send Slack notification: {str(e)}")

def notify_new_signup(email, user_id, signup_method="email"):
    """Notify Slack about a new user signup"""
    emoji = "🔐" if signup_method == "email" else "🔵"
    method_text = "Email/Password" if signup_method == "email" else "Google OAuth"
    
    message = f"{emoji} *New User Signup*\n\n" \
              f"• Email: `{email}`\n" \
              f"• Method: {method_text}\n" \
              f"• User ID: `{user_id[:8]}...`\n" \
              f"• Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"
    
    send_slack_notification(message, color="good")

def notify_video_upload(email, video_url, video_title, duration_minutes, analysis_type, user_id=None):
    """Notify Slack about a video upload/processing"""
    emoji = "🎬"
    user_info = f"• User: `{email}`\n" if email else ""
    user_id_info = f"• User ID: `{user_id[:8]}...`\n" if user_id else ""
    
    message = f"{emoji} *Video Processing Started*\n\n" \
              f"{user_info}" \
              f"{user_id_info}" \
              f"• Title: {video_title[:100]}{'...' if len(video_title) > 100 else ''}\n" \
              f"• Duration: {duration_minutes:.1f} minutes\n" \
              f"• Type: {analysis_type.replace('-', ' ').title()}\n" \
              f"• URL: {video_url}\n" \
              f"• Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"
    
    send_slack_notification(message, color="#667eea")  # Purple color

