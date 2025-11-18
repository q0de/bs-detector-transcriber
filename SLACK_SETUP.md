# Slack Integration Setup

This app can send notifications to Slack when users sign up or upload videos.

## Setup Instructions

1. **Create a Slack Incoming Webhook:**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it (e.g., "BS Detector Notifications") and select your workspace
   - Go to "Incoming Webhooks" in the left sidebar
   - Toggle "Activate Incoming Webhooks" to ON
   - Click "Add New Webhook to Workspace"
   - Select the channel where you want notifications (e.g., #notifications)
   - Copy the webhook URL (looks like: `https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ`)

2. **Add to Environment Variables:**
   - **Local Development:** Add to `backend/.env`:
     ```
     SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WEBHOOK_URL_HERE
     ```
   - **Production (Render):** Add the same variable in your Render project settings
   
   **Note:** For incoming webhooks, you only need the webhook URL. The other credentials (Client ID, Client Secret, Signing Secret, Verification Token) are for advanced Slack app features and are not needed for this integration.

3. **Test:**
   - Sign up a new account or process a video
   - You should see notifications appear in your Slack channel

## What Gets Tracked

- ✅ **New User Signups** (email/password)
  - Shows: Email, signup method, user ID, timestamp
  
- ✅ **Video Uploads** (authenticated users)
  - Shows: User email, video title, duration, analysis type, video URL, timestamp
  
- ✅ **Anonymous Video Processing** (free preview)
  - Shows: Video title, duration, analysis type, video URL, timestamp
  - Marked as "Anonymous user"

## Notes

- Notifications are **non-blocking** - if Slack is down or misconfigured, the app continues working normally
- The webhook URL is optional - if not set, notifications are silently skipped
- All notifications include timestamps and are formatted with emojis for easy scanning

