# Fact-Checking Feature Testing Guide

## 🎯 Overview
This guide will help you test the new fact-checking features that analyze videos for claims, bias, and credibility.

## ✅ Prerequisites
1. **Vercel Deployment**: Wait 2-3 minutes for Vercel to finish deploying (you just pushed a new commit)
2. **Test Credentials**: 
   - Email: `testuser@gmail.com`
   - Password: `testpass123`
3. **Test Video**: Use a video with political/factual claims (e.g., news commentary, political speech)

## 🚀 Testing Steps

### 1. Access the Application
1. Go to https://bs-detector-transcriber.vercel.app
2. You should see the homepage with "Video Transcriber" branding
3. The Navbar should show "Pricing", "Login", and "Get Started" buttons

### 2. Login
1. Click "Login" in the top right
2. The form should be pre-filled with test credentials
3. Click "Log In"
4. ✅ **Expected**: You should be redirected to the Dashboard
5. ✅ **Expected**: Navbar now shows "Dashboard", "History", "Pricing", and your email address

### 3. Process a Video with Fact-Checking

#### Option A: YouTube Video (Recommended)
1. Find a YouTube video with factual claims (news, politics, commentary)
   - Example: Search YouTube for "political speech" or "news analysis"
   - Copy the video URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)

2. On the Dashboard:
   - Select the **"URL"** tab (should be selected by default)
   - Paste the YouTube URL
   - Select **"Fact-Check"** from the dropdown (NOT "Summarize")
   - Click **"Process Video"**

3. ✅ **Expected**: 
   - A loading indicator appears
   - Processing time: 30-90 seconds depending on video length
   - Success message: "✅ Video Processed Successfully!"

### 4. Review Fact-Check Results

Once processing completes, you should see **4 new components**:

#### A. **Fact-Check Score Card** (Top)
- ✅ Overall score (0-10)
- ✅ Color-coded progress bar (Green = High, Orange = Medium, Red = Low)
- ✅ Verdict text (e.g., "MOSTLY RELIABLE", "MIXED CREDIBILITY")
- ✅ Claim counts:
  - Verified Claims (✅)
  - Uncertain Claims (⚠️)
  - False Claims (❌)
- ✅ Share button (placeholder for now)

#### B. **Claims List** (Below Score)
- ✅ Filter buttons: All, Verified, Uncertain, False
- ✅ Claims sorted by timestamp
- ✅ Each claim shows:
  - Timestamp (e.g., `[02:45]`)
  - Verdict icon (✅, ⚠️, or ❌)
  - Claim text
  - Expand/collapse arrow (▼/▲)
- ✅ Clicking a claim expands to show:
  - Verdict
  - Detailed explanation
  - Sources (clickable links if available)
  - Confidence level

**Test Actions**:
- Click each filter button (All, Verified, Uncertain, False)
- Expand and collapse multiple claims
- Click on source links (should open in new tab)

#### C. **Bias Analysis** (Below Claims)
- ✅ **Political Lean**: Visual slider showing position from Left to Right
  - Score: -10 (Far Left) to +10 (Far Right)
  - Label: e.g., "Center-Left", "Right-Leaning", "Neutral"
  
- ✅ **Emotional Tone**: Fill bar showing emotional level
  - Score: 0 (Neutral/Factual) to 10 (Highly Emotional/Sensational)
  - Color: Green = Neutral, Orange = Moderately Emotional, Red = Highly Emotional
  
- ✅ **Source Quality**: Fill bar showing source credibility
  - Score: 0 (No Sources/Poor Quality) to 10 (Peer-Reviewed/Authoritative)
  - Color: Green = High Quality, Orange = Mixed, Red = Low Quality
  
- ✅ **Overall Bias**: Text label (Low, Moderate, High)
- ✅ **Red Flags**: List of concerning patterns (if any)
  - Examples: "Heavy use of emotional language", "Cherry-picked statistics", "Logical fallacy: ad hominem"

#### D. **Interactive Transcript** (Bottom)
- ✅ Checkboxes:
  - "Show Timestamps (Approx.)" - Adds rough timestamps to each line
  - "Show Highlights" - Toggles claim highlighting on/off
- ✅ Transcript with inline highlights:
  - `[VERIFIED ✅]` in green
  - `[UNCERTAIN ⚠️]` in orange
  - `[FALSE ❌]` in red
- ✅ Scrollable content area

**Test Actions**:
- Toggle "Show Timestamps" on/off
- Toggle "Show Highlights" on/off
- Scroll through transcript to see all highlights

### 5. Compare with Summarize Mode (Optional)

To see the difference between fact-checking and summarizing:

1. Click "Process Video" again (or go to Dashboard)
2. Enter the **same YouTube URL**
3. Select **"Summarize"** from the dropdown
4. Click "Process Video"

✅ **Expected**: 
- Processing should be faster (transcript is cached!)
- Results show the **old format**: plain text transcription and analysis
- No fact-check components (score, claims, bias, etc.)

### 6. Check History

1. Click "History" in the Navbar
2. ✅ **Expected**: You should see both videos you processed:
   - One with "fact-check" analysis type
   - One with "summarize" analysis type
3. Click on a video to view its results again

### 7. Usage Tracking

1. Check the "Usage Indicator" at the top of Dashboard
2. ✅ **Expected**: 
   - Minutes used should have increased
   - Minutes remaining should have decreased
   - Reflects the total duration of videos processed

## 🎨 Visual Quality Checks

### Color Consistency
- ✅ Green = Positive/Verified
- ✅ Orange = Warning/Uncertain
- ✅ Red = Negative/False/High Bias

### Responsiveness (Optional)
- Resize browser window
- Check that components adapt to smaller screens
- Verify text remains readable

### Dark Mode (If Implemented)
- Check if dark mode styles apply correctly to all new components

## 🐛 Known Issues to Test For

1. **Empty Claims**: If a video has no claims, components should show "No claims found"
2. **Missing Transcript**: If YouTube transcript fails, system should fall back to Whisper
3. **Long Videos**: Videos over 10 minutes may take longer or hit token limits
4. **Invalid URLs**: Non-YouTube URLs or private videos should show an error

## 📝 What to Report

If you encounter any issues, please note:
1. **What you did**: Step-by-step actions
2. **What you expected**: What should have happened
3. **What actually happened**: The error or unexpected behavior
4. **Browser Console Errors**: Open DevTools (F12) > Console tab, copy any errors
5. **Render Logs**: Check https://dashboard.render.com for backend errors
6. **Screenshots**: Take screenshots of visual issues

## 🎉 Success Criteria

The fact-checking feature is working correctly if:
- ✅ Videos process without errors
- ✅ All 4 components render (Score, Claims, Bias, Transcript)
- ✅ Claims are categorized correctly (Verified, Uncertain, False)
- ✅ Bias scores display with visual indicators
- ✅ Transcript highlights match claim timestamps
- ✅ Filters and toggles work smoothly
- ✅ Data persists in History

---

## 🎬 Recommended Test Videos

Here are some YouTube video types that work well for fact-checking:

1. **Political Speeches**: State of the Union, campaign speeches
2. **News Analysis**: Cable news commentary, fact-check segments
3. **Debate Clips**: Presidential debates, panel discussions
4. **Documentary Excerpts**: Historical or scientific documentaries
5. **Product Reviews**: Tech reviews with specific claims

**Avoid**:
- Music videos (no factual claims)
- Private or age-restricted videos
- Videos without transcripts (will be slower to process)

---

## ⏱️ Expected Processing Times

| Video Length | YouTube Transcript | Whisper Fallback |
|--------------|-------------------|------------------|
| 0-5 minutes  | 10-30 seconds     | 1-3 minutes      |
| 5-10 minutes | 20-60 seconds     | 3-6 minutes      |
| 10-20 minutes| 30-90 seconds     | 6-12 minutes     |

Note: Subsequent analyses of the same video use cached transcripts and are faster!

---

**Ready to test? Go to https://bs-detector-transcriber.vercel.app and start with Step 1! 🚀**
