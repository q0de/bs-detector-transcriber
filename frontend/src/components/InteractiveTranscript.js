import React, { useState } from 'react';
import './InteractiveTranscript.css';

function InteractiveTranscript({ transcript, highlightedTranscript }) {
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  
  if (!transcript && !highlightedTranscript) return null;
  
  // Use highlighted transcript if available, otherwise use plain transcript
  const displayText = (showHighlights && highlightedTranscript) 
    ? highlightedTranscript 
    : transcript;
  
  // Process the text to add highlighting classes
  const renderHighlightedText = (text) => {
    if (!showHighlights || !text) return text;
    
    // Split by tags and add appropriate spans
    const parts = text.split(/(\[VERIFIED\]|\[OPINION\]|\[UNCERTAIN\]|\[FALSE\])/g);
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
  
  // Split transcript into paragraphs for better readability
  const paragraphs = displayText ? displayText.split(/\n\n+/) : [];
  
  return (
    <div className="interactive-transcript">
      <div className="transcript-header">
        <h2>Transcript</h2>
        
        <div className="transcript-controls">
          <button 
            className={`control-btn ${showHighlights ? 'active' : ''}`}
            onClick={() => setShowHighlights(!showHighlights)}
            disabled={!highlightedTranscript}
          >
            {showHighlights ? '🎨 Highlights: ON' : '🎨 Highlights: OFF'}
          </button>
          
          <button 
            className={`control-btn ${showTimestamps ? 'active' : ''}`}
            onClick={() => setShowTimestamps(!showTimestamps)}
          >
            {showTimestamps ? '⏱️ Timestamps: ON' : '⏱️ Timestamps: OFF'}
          </button>
        </div>
      </div>
      
      {showHighlights && highlightedTranscript && (
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
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <p key={index} className="transcript-paragraph">
              {showTimestamps && (
                <span className="timestamp">[{Math.floor(index * 30 / 60)}:{(index * 30 % 60).toString().padStart(2, '0')}]</span>
              )}
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

