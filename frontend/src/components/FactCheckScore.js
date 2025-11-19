import React from 'react';
import './FactCheckScore.css';

function FactCheckScore({ data }) {
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
        <div className="score-summary">
          <p>{data.summary}</p>
        </div>
      )}
    </div>
  );
}

export default FactCheckScore;

