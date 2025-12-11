---
name: Improve Transcript Highlighting Matching
overview: ""
todos:
  - id: 3ff66672-1c64-4dc2-ad34-d856aae24b03
    content: Update backend/services/video_processor.py with fuzzy matching logic
    status: pending
  - id: 8748f87d-3f33-4bf3-b917-0c6ef71c6733
    content: Verify the implementation respects the 'Selective' highlighting policy
    status: pending
  - id: 1d516b82-6df9-499a-8655-11efb6985f32
    content: Lower fuzzy match cutoff from 0.6 to 0.45
    status: pending
  - id: 47b5347f-ea14-4b83-9801-69a7223bdcda
    content: Add sliding window matching for partial claim matches
    status: pending
  - id: f65e2fdd-f2ef-478f-954e-f3fbcbb3a7eb
    content: Extract and search for distinctive key phrases from claims
    status: pending
  - id: ad3c9688-4dc1-4524-bb81-3c7e1d2db668
    content: Add word overlap scoring as final fallback strategy
    status: pending
  - id: 6c4e55b7-ddd5-41dc-a818-a79774fd092b
    content: Improve transcript splitting to handle missing punctuation
    status: pending
---

# Improve Transcript Highlighting Matching

The current `auto_highlight_transcript` function in [backend/services/video_processor.py](backend/services/video_processor.py) misses many claims because it relies on:

- 60% similarity threshold (too strict for paraphrased claims)
- Sentence boundary splitting (transcripts often lack punctuation)
- Full claim matching (long claims rarely match verbatim)

## Changes to `auto_highlight_transcript`

### 1. Lower fuzzy match threshold

Change cutoff from 0.6 to 0.45 for more lenient matching.

### 2. Add sliding window matching

Instead of only splitting by sentences, use overlapping windows of ~50-100 words to find partial matches.

### 3. Add key phrase extraction

Extract the most distinctive 3-5 word phrases from each claim and search for those if full match fails.

### 4. Add word overlap scoring

As a fallback, find transcript segments with highest word overlap with the claim (ignoring common words like "the", "is", "and").

### 5. Improve transcript splitting

Split by multiple patterns: punctuation, speaker changes, pauses (indicated by "..." or newlines), and time-based segments if available.

## Expected Result

More claims will be matched and highlighted, improving coverage from ~30-40% to ~70-80% of identified claims.