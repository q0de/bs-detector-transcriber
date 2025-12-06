<!-- 18be4b66-23ce-402f-a5d5-0191ebf1e961 79a66868-c306-4ed2-a84e-77ece8ab4b30 -->
# Fix Highlight Propagation Bug

The highlighting appears on nearly everything because of a bug in the frontend's paragraph-splitting logic. When a paragraph has an unclosed `[VERIFIED]` tag, the code adds a closing tag but ALSO incorrectly propagates the highlight to subsequent paragraphs.

## Root Cause

In [frontend/src/components/AnalysisResults.jsx](frontend/src/components/AnalysisResults.jsx) lines 1336-1354:

```javascript
if (newActiveHighlight) {
  fixedText = fixedText + `[/${newActiveHighlight}]`;
}
activeHighlight = newActiveHighlight;  // BUG: Should be null after closing!
```

When we add a closing tag, `activeHighlight` should be set to `null` (the highlight is now closed), but instead it's set to `newActiveHighlight` which causes the next paragraph to incorrectly receive an opening tag.

## Fix

Change the logic to NOT propagate highlights after we've auto-closed them:

```javascript
if (newActiveHighlight) {
  fixedText = fixedText + `[/${newActiveHighlight}]`;
  activeHighlight = null;  // Highlight is closed, don't propagate
} else {
  activeHighlight = null;  // No active highlight
}
```

This ensures:

1. If a paragraph has an unbalanced highlight, we close it at paragraph end
2. We do NOT propagate the highlight to the next paragraph
3. Each paragraph's highlights are self-contained

## Files to Modify

- [frontend/src/components/AnalysisResults.jsx](frontend/src/components/AnalysisResults.jsx): Fix the `splitIntoParagraphs` function (around line 1352)

### To-dos

- [ ] Update backend/services/video_processor.py with fuzzy matching logic