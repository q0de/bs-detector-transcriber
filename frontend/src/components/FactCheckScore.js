import React, { useState } from 'react';
import './FactCheckScore.css';

function FactCheckScore({ data }) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  
  if (!data || !data.fact_score) return null;

  const score = data.fact_score;
  const verdict = data.overall_verdict || 'Unknown';
  const verified = data.verified_claims?.length || 0;
  const uncertain = data.uncertain_claims?.length || 0;
  const falseClaims = data.false_claims?.length || 0;
  
  // Calculate progress bar width (score out of 10)
  const progressWidth = (score / 10) * 100;
  
  // Determine color based on score
  let scoreColor = 'green';
  let scoreLabel = 'Accurate';
  if (score < 4) {
    scoreColor = 'red';
    scoreLabel = 'Inaccurate';
  } else if (score < 7) {
    scoreColor = 'orange';
    scoreLabel = 'Mixed';
  }

  return (
    <div className="fact-check-score-card">
      <div className="score-header">
        <h2>Fact-Check Score</h2>
        <div className={`score-badge ${scoreColor}`}>
          {score.toFixed(1)}/10
        </div>
      </div>
      
      <div className="score-progress">
        <div 
          className={`score-bar ${scoreColor}`} 
          style={{ width: `${progressWidth}%` }}
        ></div>
      </div>
      
      <div className="score-verdict">
        <span className={`verdict-label ${scoreColor}`}>{verdict}</span>
      </div>
      
      <div className="claims-summary">
        <div className="claim-stat verified">
          <span className="icon">✅</span>
          <span className="count">{verified}</span>
          <span className="label">Verified</span>
        </div>
        <div className="claim-stat uncertain">
          <span className="icon">⚠️</span>
          <span className="count">{uncertain}</span>
          <span className="label">Uncertain</span>
        </div>
        <div className="claim-stat false">
          <span className="icon">❌</span>
          <span className="count">{falseClaims}</span>
          <span className="label">False Claims</span>
        </div>
      </div>

      {data.summary && (
        <>
          <div className="score-summary">
            <p>{data.summary}</p>
          </div>
          
          <div className="ai-synopsis">
            <button 
              className={`synopsis-toggle ${synopsisExpanded ? 'expanded' : ''}`}
              onClick={() => setSynopsisExpanded(!synopsisExpanded)}
            >
              <span className="synopsis-icon">💭</span>
              <span className="synopsis-title">Our Take</span>
              <span className="synopsis-arrow">{synopsisExpanded ? '▼' : '▶'}</span>
            </button>
            
            {synopsisExpanded && (
              <div className="synopsis-content">
                <div className="synopsis-section opinion">
                  <p>
                    {score >= 7 ? (
                      `This content appears to be generally reliable. With ${verified} verified claims and a fact score of ${score}/10, the information presented is largely accurate and well-sourced. ${falseClaims > 0 ? `However, be aware of ${falseClaims} false claim${falseClaims > 1 ? 's' : ''} identified.` : ''}`
                    ) : score >= 4 ? (
                      `This content has mixed accuracy. While some claims are verified (${verified}), there are concerns with ${falseClaims} false claim${falseClaims > 1 ? 's' : ''} and ${uncertain} uncertain claim${uncertain > 1 ? 's' : ''}. Approach with healthy skepticism and verify important points independently.`
                    ) : (
                      `This content has significant accuracy issues. With a fact score of ${score}/10 and ${falseClaims} false claim${falseClaims > 1 ? 's' : ''} identified, much of the information is questionable. We recommend seeking alternative sources for factual information on this topic.`
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FactCheckScore;

