import React, { useState } from 'react';
import './ClaimsList.css';

function ClaimItem({ claim, index, type }) {
  const [expanded, setExpanded] = useState(false);
  
  const typeConfig = {
    verified: {
      icon: '✅',
      color: 'green',
      label: 'VERIFIED'
    },
    uncertain: {
      icon: '⚠️',
      color: 'orange',
      label: 'UNCERTAIN'
    },
    false: {
      icon: '❌',
      color: 'red',
      label: 'FALSE'
    }
  };
  
  const config = typeConfig[type] || typeConfig.uncertain;
  
  return (
    <div className={`claim-item ${config.color} ${expanded ? 'expanded' : ''}`}>
      <div className="claim-header" onClick={() => setExpanded(!expanded)}>
        <div className="claim-left">
          <span className="claim-icon">{config.icon}</span>
          <span className="claim-timestamp">{claim.timestamp}</span>
          <span className={`claim-verdict ${config.color}`}>{config.label}</span>
        </div>
        <button className="claim-expand">
          {expanded ? '▼' : '▶'}
        </button>
      </div>
      
      <div className="claim-text">
        "{claim.claim}"
      </div>
      
      {expanded && (
        <div className="claim-details">
          <div className="claim-explanation">
            <h4>Analysis:</h4>
            <p>{claim.explanation}</p>
          </div>
          
          {claim.confidence && (
            <div className="claim-confidence">
              <strong>Confidence:</strong> <span className={`confidence-badge ${claim.confidence.toLowerCase()}`}>{claim.confidence}</span>
            </div>
          )}
          
          {claim.sources && claim.sources.length > 0 && (
            <div className="claim-sources">
              <h4>Sources:</h4>
              <ul>
                {claim.sources.map((source, idx) => (
                  <li key={idx}>
                    {source.startsWith('http') ? (
                      <a href={source} target="_blank" rel="noopener noreferrer">
                        {source}
                      </a>
                    ) : (
                      source
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClaimsList({ data }) {
  const [filter, setFilter] = useState('all');
  
  if (!data) return null;
  
  const verifiedClaims = data.verified_claims || [];
  const uncertainClaims = data.uncertain_claims || [];
  const falseClaims = data.false_claims || [];
  
  const allClaims = [
    ...verifiedClaims.map(c => ({ ...c, type: 'verified' })),
    ...uncertainClaims.map(c => ({ ...c, type: 'uncertain' })),
    ...falseClaims.map(c => ({ ...c, type: 'false' }))
  ];
  
  const filteredClaims = filter === 'all' 
    ? allClaims 
    : allClaims.filter(c => c.type === filter);
  
  if (allClaims.length === 0) {
    return (
      <div className="claims-list">
        <h2>Claims Analysis</h2>
        <p className="no-claims">No specific claims detected in this video.</p>
      </div>
    );
  }
  
  return (
    <div className="claims-list">
      <div className="claims-header">
        <h2>Claims Detected ({allClaims.length})</h2>
        
        <div className="claims-filter">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All ({allClaims.length})
          </button>
          <button 
            className={filter === 'verified' ? 'active' : ''} 
            onClick={() => setFilter('verified')}
          >
            ✅ Verified ({verifiedClaims.length})
          </button>
          <button 
            className={filter === 'uncertain' ? 'active' : ''} 
            onClick={() => setFilter('uncertain')}
          >
            ⚠️ Uncertain ({uncertainClaims.length})
          </button>
          <button 
            className={filter === 'false' ? 'active' : ''} 
            onClick={() => setFilter('false')}
          >
            ❌ False ({falseClaims.length})
          </button>
        </div>
      </div>
      
      <div className="claims-container">
        {filteredClaims.length > 0 ? (
          filteredClaims.map((claim, index) => (
            <ClaimItem 
              key={index} 
              claim={claim} 
              index={index} 
              type={claim.type} 
            />
          ))
        ) : (
          <p className="no-claims">No claims match the selected filter.</p>
        )}
      </div>
    </div>
  );
}

export default ClaimsList;

