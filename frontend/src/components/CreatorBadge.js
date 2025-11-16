import React from 'react';
import './CreatorBadge.css';

function CreatorBadge({ creator }) {
  if (!creator || !creator.avg_score) return null;
  
  // Convert 0-10 score to 0-5 stars
  const stars = creator.avg_score / 2;
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  // Determine badge color based on score
  const getBadgeColor = (score) => {
    if (score >= 8) return 'excellent'; // Green
    if (score >= 6) return 'good';      // Blue
    if (score >= 4) return 'fair';      // Orange
    return 'poor';                       // Red
  };
  
  const badgeClass = getBadgeColor(creator.avg_score);
  
  return (
    <div className={`creator-badge ${badgeClass}`}>
      <div className="creator-badge-header">
        <span className="creator-icon">👤</span>
        <div className="creator-info">
          <h4 className="creator-name">{creator.name}</h4>
          <p className="creator-stats">
            {creator.total_videos} video{creator.total_videos !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      </div>
      
      <div className="creator-rating">
        <div className="stars">
          {[...Array(fullStars)].map((_, i) => (
            <span key={`full-${i}`} className="star full">⭐</span>
          ))}
          {hasHalfStar && <span className="star half">⭐</span>}
          {[...Array(emptyStars)].map((_, i) => (
            <span key={`empty-${i}`} className="star empty">☆</span>
          ))}
        </div>
        <div className="score-label">
          <strong>{creator.avg_score.toFixed(1)}/10</strong>
          <span className="badge-label">{badgeClass.toUpperCase()} ACCURACY</span>
        </div>
      </div>
      
      {creator.last_score && (
        <div className="creator-trend">
          <span className="trend-label">Latest score:</span>
          <span className={`trend-value ${creator.last_score > creator.avg_score ? 'up' : 'down'}`}>
            {creator.last_score.toFixed(1)}
            {creator.last_score > creator.avg_score ? ' ↑' : creator.last_score < creator.avg_score ? ' ↓' : ' →'}
          </span>
        </div>
      )}
      
      <p className="creator-note">
        ℹ️ Based on {creator.total_videos} fact-checked videos
      </p>
    </div>
  );
}

export default CreatorBadge;

