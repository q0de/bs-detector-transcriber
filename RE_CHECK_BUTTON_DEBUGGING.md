# Re-Check Button (🔄) - Debugging & Enhancement

## What It Does
The re-check button sends a specific claim back to Claude AI for deeper fact-checking and verification. It appears on each claim card in the claims list.

## Location
- **File**: `frontend/src/components/ClaimsList.js`
- **Lines**: 154-163 (button rendering)
- **Handler**: Lines 45-79 (`handleRecheck` function)

## Changes Made

### 1. Enhanced Styling (More Visible!)
**File**: `frontend/src/components/ClaimsList.css` (lines 372-413)

**New Appearance:**
- ✅ Purple gradient background (`#667eea` to `#764ba2`)
- ✅ White text/emoji
- ✅ Larger size (18px emoji, 44px min-width)
- ✅ Box shadow for depth
- ✅ **Hover animation**: Rotates 90° and scales up
- ✅ **Loading animation**: Spins when processing

**Before**: Gray button with gray border
**After**: Eye-catching purple gradient button

### 2. Debug Logging Added
**File**: `frontend/src/components/ClaimsList.js`

Added console logs to track:
- Line 294-296: ClaimsList component - logs videoId
- Line 14: ClaimItem component - logs videoId for each claim

**File**: `frontend/src/pages/DashboardPage.js`

Added console logs:
- Line 245-246: Logs videoResult.id before passing to ClaimsList

### 3. How to Test

1. **Make sure you're logged in** (not free trial - free trial doesn't get videoId)
2. **Process a fact-check video** (not just summarize)
3. **Open browser DevTools** (F12) → Console tab
4. **Look for these logs**:
   ```
   🔍 [DashboardPage] videoResult.id: <uuid>
   🔍 ClaimsList - videoId: <uuid>
   🔍 ClaimItem [verified] - videoId: <uuid>
   ```
5. **Find the purple gradient 🔄 button** in each claim header:
   - Order: `📋 Copy` | `🔄` | `▶`
   - Click it to re-analyze that specific claim
   - It will show ⏳ while loading
   - Results appear inline below the claim

## Button Behavior

### Normal State
- Shows: `🔄` emoji
- Background: Purple gradient
- Cursor: Pointer
- Effect: Rotates 90° on hover

### Loading State
- Shows: `⏳` emoji
- Animation: Continuous spin
- Button: Disabled

### After Re-check
- Auto-expands claim
- Shows comparison: Original vs Updated verdict
- Displays new analysis and sources
- Confidence level included

## API Endpoint
**Backend**: `backend/routes/videos.py` (lines 452-519)
```
POST /videos/<video_id>/recheck-claim
```

Sends to Claude:
- Original claim text
- Timestamp
- Original verdict
- Context/explanation

Returns:
- Updated verdict
- New explanation
- Correction notes (if changed)
- Additional sources
- Confidence level

## Visibility Conditions

The button ONLY shows if:
1. ✅ `videoId` prop is passed to ClaimsList
2. ✅ User is authenticated (has processed video, not free trial)
3. ✅ Claim is part of a saved video

The button WILL NOT show if:
- ❌ Free trial user (no videoId)
- ❌ videoId is undefined/null
- ❌ Anonymous user

## Next Steps

1. **Check browser console** for debug logs
2. If videoId is undefined, check:
   - Are you logged in?
   - Did the video process successfully?
   - Check network tab for `/videos/process` response
3. If button still not visible but videoId exists:
   - Inspect element
   - Check if CSS is hiding it
   - Look for `display: none` or `visibility: hidden`

## Files Modified
1. `frontend/src/components/ClaimsList.js` - Debug logs
2. `frontend/src/components/ClaimsList.css` - Enhanced styling
3. `frontend/src/pages/DashboardPage.js` - Debug logs
4. `backend/routes/videos.py` - Fixed JSON serialization bug

## Known Issues Fixed
- ✅ JSON serialization error ("cannot access local variable 'json'")
- ✅ Button visibility improved with gradient styling
- ✅ Debug logging added for troubleshooting

