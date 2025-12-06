<!-- 18be4b66-23ce-402f-a5d5-0191ebf1e961 e1e07895-248e-4dfb-8835-fee4028cc4c7 -->
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

### To-dos

- [ ] Update backend/services/video_processor.py with fuzzy matching logic
- [ ] Verify the implementation respects the 'Selective' highlighting policy
- [ ] Lower fuzzy match cutoff from 0.6 to 0.45
- [ ] Add sliding window matching for partial claim matches
- [ ] Extract and search for distinctive key phrases from claims
- [ ] Add word overlap scoring as final fallback strategy
- [ ] Improve transcript splitting to handle missing punctuation