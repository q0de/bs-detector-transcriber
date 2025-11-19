import React, { useState } from 'react';
import './InteractiveTranscript.css';

function InteractiveTranscript({ transcript, highlightedTranscript, transcriptSegments }) {
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  
  if (!transcript && !highlightedTranscript) return null;
  
  // Format seconds to MM:SS
  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Check if we have real timestamped segments
  const hasTimestamps = transcriptSegments && transcriptSegments.length > 0;
  
  // Group small segments into larger 30-60 second chunks for better readability
  const groupSegments = (segments, targetDuration = 45) => {
    if (!segments || segments.length === 0) return [];
    
    const grouped = [];
    let currentGroup = { 
      start: segments[0].start, 
      texts: [], 
      duration: 0 
    };
    
    segments.forEach((segment, idx) => {
      currentGroup.texts.push(segment.text);
      currentGroup.duration += segment.duration || 0;
      
      // Group until we hit target duration OR it's the last segment
      if (currentGroup.duration >= targetDuration || idx === segments.length - 1) {
        grouped.push({
          start: currentGroup.start,
          text: currentGroup.texts.join(' ').trim()
        });
        
        // Start new group with next segment's start time
        if (idx < segments.length - 1) {
          currentGroup = { 
            start: segments[idx + 1]?.start || currentGroup.start + currentGroup.duration, 
            texts: [], 
            duration: 0 
          };
        }
      }
    });
    
    return grouped;
  };
  
  const groupedSegments = hasTimestamps ? groupSegments(transcriptSegments) : [];
  
  // Check if highlighted transcript is just a placeholder message or doesn't have actual tags
  const hasRealHighlights = highlightedTranscript && (
    highlightedTranscript.includes('[VERIFIED]') ||
    highlightedTranscript.includes('[OPINION]') ||
    highlightedTranscript.includes('[UNCERTAIN]') ||
    highlightedTranscript.includes('[FALSE]')
  );
  
  const isPlaceholder = highlightedTranscript && !hasRealHighlights && (
    highlightedTranscript.includes('[Transcript with highlights not included') ||
    highlightedTranscript.includes('OPTIONAL:') ||
    highlightedTranscript.length < 50
  );
  
  // Use highlighted transcript if it has real highlight tags, otherwise use plain transcript
  const displayText = (showHighlights && hasRealHighlights) 
    ? highlightedTranscript 
    : transcript;
  
  // Process the text to add highlighting classes
  const renderHighlightedText = (text) => {
    if (!showHighlights || !text) return text;
    
    // First, convert emojis to tags if Claude used emojis instead of tags
    let normalizedText = text
      .replace(/✅/g, '[VERIFIED]')
      .replace(/🔮/g, '[OPINION]')
      .replace(/⚠️/g, '[UNCERTAIN]')
      .replace(/❌/g, '[FALSE]');
    
    // Remove closing tags (they're not needed, we just use opening tags)
    normalizedText = normalizedText
      .replace(/\[\/VERIFIED\]/gi, '')
      .replace(/\[\/OPINION\]/gi, '')
      .replace(/\[\/UNCERTAIN\]/gi, '')
      .replace(/\[\/FALSE\]/gi, '');
    
    // Split by tags and add appropriate spans
    const parts = normalizedText.split(/(\[VERIFIED\]|\[OPINION\]|\[UNCERTAIN\]|\[FALSE\])/g);
    let currentClass = '';
    
    return parts.map((part, index) => {
      if (part === '[VERIFIED]') {
        currentClass = 'highlight-verified';
        return <span key={index} className="tag tag-verified">✅</span>;
      } else if (part === '[OPINION]') {
        currentClass = 'highlight-opinion';
        return <span key={index} className="tag tag-opinion">🔮</span>;
      } else if (part === '[UNCERTAIN]') {
        currentClass = 'highlight-uncertain';
        return <span key={index} className="tag tag-uncertain">⚠️</span>;
      } else if (part === '[FALSE]') {
        currentClass = 'highlight-false';
        return <span key={index} className="tag tag-false">❌</span>;
      } else if (part && part.trim()) {
        const wrapped = <span key={index} className={currentClass}>{part}</span>;
        currentClass = ''; // Reset after wrapping
        return wrapped;
      }
      return null;
    });
  };
  
  // Split transcript into paragraphs for better readability (fallback when no segments)
  const paragraphs = displayText ? displayText.split(/\n\n+/) : [];
  
  return (
    <div className="interactive-transcript">
      <div className="transcript-header">
        <h2>Transcript</h2>
        
        <div className="transcript-controls">
          <button 
            className={`control-btn ${showHighlights ? 'active' : ''}`}
            onClick={() => setShowHighlights(!showHighlights)}
            disabled={!hasRealHighlights}
            title={!hasRealHighlights ? 'Highlights not available for this video' : 'Toggle claim highlights in transcript'}
          >
            {showHighlights ? '🎨 Highlights: ON' : '🎨 Highlights: OFF'}
          </button>
          
          <button 
            className={`control-btn ${showTimestamps ? 'active' : ''}`}
            onClick={() => setShowTimestamps(!showTimestamps)}
            disabled={!hasTimestamps}
            title={!hasTimestamps ? 'Timestamps not available for this video' : 'Toggle timestamps in transcript'}
          >
            {showTimestamps ? '⏱️ Timestamps: ON' : '⏱️ Timestamps: OFF'}
          </button>
        </div>
      </div>
      
      {showHighlights && hasRealHighlights && (
        <div className="transcript-legend">
          <span className="legend-item">
            <span className="legend-badge verified">✅</span> Verified
          </span>
          <span className="legend-item">
            <span className="legend-badge opinion">🔮</span> Opinion
          </span>
          <span className="legend-item">
            <span className="legend-badge uncertain">⚠️</span> Uncertain
          </span>
          <span className="legend-item">
            <span className="legend-badge false">❌</span> False
          </span>
        </div>
      )}
      
      <div className={`transcript-content ${showTimestamps ? 'with-timestamps' : ''}`}>
        {showHighlights && hasRealHighlights && showTimestamps && hasTimestamps ? (
          // BOTH highlights and timestamps ON: Show highlighted paragraphs with approximate timestamps
          // Use the highlighted transcript (which is paragraph-based) and add timestamps to each paragraph
          paragraphs.map((paragraph, index) => {
            // Estimate timestamp based on paragraph position
            // Assume roughly even distribution across the video
            const estimatedSeconds = groupedSegments[Math.min(index, groupedSegments.length - 1)]?.start || (index * 45);
            
            return (
              <p key={index} className="transcript-paragraph">
                <span className="timestamp">[{formatTimestamp(estimatedSeconds)}]</span>
                {' '}
                {renderHighlightedText(paragraph)}
              </p>
            );
          })
        ) : hasTimestamps && showTimestamps ? (
          // ONLY timestamps ON: Show grouped segments with precise timestamps
          groupedSegments.map((segment, index) => (
            <p key={index} className="transcript-paragraph">
              <span className="timestamp">[{formatTimestamp(segment.start)}]</span>
              {' '}
              {segment.text}
            </p>
          ))
        ) : paragraphs.length > 0 ? (
          // ONLY highlights ON or both OFF: Show paragraph-based rendering
          paragraphs.map((paragraph, index) => (
            <p key={index} className="transcript-paragraph">
              {renderHighlightedText(paragraph)}
            </p>
          ))
        ) : (
          <p className="no-transcript">No transcript available.</p>
        )}
      </div>
    </div>
  );
}

export default InteractiveTranscript;

