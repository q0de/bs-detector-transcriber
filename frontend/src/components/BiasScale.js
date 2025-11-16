import React from 'react';
import './BiasScale.css';

function BiasScale({ data }) {
  if (!data || !data.bias_analysis) return null;
  
  const bias = data.bias_analysis;
  
  // Normalize political_lean from -10...10 to 0...100 for display
  const politicalPosition = ((bias.political_lean + 10) / 20) * 100;
  
  // emotional_tone and source_quality are already 0-10, convert to 0-100
  const emotionalPosition = (bias.emotional_tone / 10) * 100;
  const sourcePosition = (bias.source_quality / 10) * 100;
  
  return (
    <div className="bias-scale-card">
      <h2>Bias Analysis</h2>
      
      <div className="bias-overall">
        <span className="bias-label">Overall Bias:</span>
        <span className={`bias-badge ${bias.overall_bias.toLowerCase()}`}>
          {bias.overall_bias}
        </span>
      </div>
      
      <div className="bias-scales">
        {/* Political Lean */}
        <div className="bias-scale-item">
          <div className="scale-header">
            <span className="scale-title">Political Lean</span>
            <span className="scale-value">{bias.political_lean_label || 'Neutral'}</span>
          </div>
          <div className="scale-track political">
            <div className="scale-labels">
              <span>Left</span>
              <span>Neutral</span>
              <span>Right</span>
            </div>
            <div className="scale-bar">
              <div 
                className="scale-marker" 
                style={{ left: `${politicalPosition}%` }}
              >
                <div className="marker-dot"></div>
              </div>
            </div>
          </div>
          <div className="scale-description">
            Score: {bias.political_lean.toFixed(1)} (-10 to +10)
          </div>
        </div>
        
        {/* Emotional Tone */}
        <div className="bias-scale-item">
          <div className="scale-header">
            <span className="scale-title">Emotional Tone</span>
            <span className="scale-value">{bias.emotional_tone_label || 'Neutral'}</span>
          </div>
          <div className="scale-track emotional">
            <div className="scale-labels">
              <span>Factual</span>
              <span>Moderate</span>
              <span>Emotional</span>
            </div>
            <div className="scale-bar">
              <div 
                className="scale-marker" 
                style={{ left: `${emotionalPosition}%` }}
              >
                <div className="marker-dot"></div>
              </div>
            </div>
          </div>
          <div className="scale-description">
            Score: {bias.emotional_tone.toFixed(1)} / 10
          </div>
        </div>
        
        {/* Source Quality */}
        <div className="bias-scale-item">
          <div className="scale-header">
            <span className="scale-title">Source Quality</span>
            <span className="scale-value">{bias.source_quality_label || 'Unknown'}</span>
          </div>
          <div className="scale-track source">
            <div className="scale-labels">
              <span>No Sources</span>
              <span>Mixed</span>
              <span>Authoritative</span>
            </div>
            <div className="scale-bar">
              <div 
                className="scale-marker" 
                style={{ left: `${sourcePosition}%` }}
              >
                <div className="marker-dot"></div>
              </div>
            </div>
          </div>
          <div className="scale-description">
            Score: {bias.source_quality.toFixed(1)} / 10
          </div>
        </div>
      </div>
      
      {data.red_flags && data.red_flags.length > 0 && (
        <div className="red-flags-section">
          <h3>🚩 Red Flags Detected</h3>
          <ul className="red-flags-list">
            {data.red_flags.map((flag, index) => (
              <li key={index}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BiasScale;

