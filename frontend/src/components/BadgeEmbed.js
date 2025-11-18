import React, { useState } from 'react';
import './BadgeEmbed.css';

function BadgeEmbed({ videoId, creatorId }) {
  const [copied, setCopied] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Don't render if videoId is missing or undefined
  if (!videoId || videoId === 'undefined') {
    return null;
  }
  
  const videoBadgeUrl = `${API_URL}/badges/video/${videoId}`;
  const creatorBadgeUrl = creatorId ? `${API_URL}/badges/creator/${creatorId}` : null;

  const generateEmbedCode = (badgeUrl, type) => {
    return `<!-- ${type} Fact-Check Badge -->
<a href="${window.location.origin}/video/${videoId}" target="_blank">
  <img src="${badgeUrl}" alt="${type} Fact-Check Badge" />
</a>`;
  };

  const generateMarkdown = (badgeUrl, type) => {
    return `[![${type} Fact-Check Badge](${badgeUrl})](${window.location.origin}/video/${videoId})`;
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="badge-embed">
      <div className="badge-embed-header">
        <h3>📌 Embeddable Badges</h3>
        <p>Show your fact-check results anywhere with these embeddable badges</p>
      </div>

      {/* Video Badge */}
      <div className="badge-section">
        <div className="badge-preview">
          <h4>Video Badge</h4>
          <img src={videoBadgeUrl} alt="Video Fact-Check Badge" />
        </div>

        <div className="embed-codes">
          <div className="embed-code-block">
            <div className="code-header">
              <span>HTML</span>
              <button 
                className={`copy-code-btn ${copied === 'video-html' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(generateEmbedCode(videoBadgeUrl, 'Video'), 'video-html')}
              >
                {copied === 'video-html' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre className="code-content">{generateEmbedCode(videoBadgeUrl, 'Video')}</pre>
          </div>

          <div className="embed-code-block">
            <div className="code-header">
              <span>Markdown</span>
              <button 
                className={`copy-code-btn ${copied === 'video-md' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(generateMarkdown(videoBadgeUrl, 'Video'), 'video-md')}
              >
                {copied === 'video-md' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre className="code-content">{generateMarkdown(videoBadgeUrl, 'Video')}</pre>
          </div>
        </div>
      </div>

      {/* Creator Badge */}
      {creatorBadgeUrl && (
        <div className="badge-section">
          <div className="badge-preview">
            <h4>Creator Badge</h4>
            <img src={creatorBadgeUrl} alt="Creator Fact-Check Badge" />
          </div>

          <div className="embed-codes">
            <div className="embed-code-block">
              <div className="code-header">
                <span>HTML</span>
                <button 
                  className={`copy-code-btn ${copied === 'creator-html' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(generateEmbedCode(creatorBadgeUrl, 'Creator'), 'creator-html')}
                >
                  {copied === 'creator-html' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <pre className="code-content">{generateEmbedCode(creatorBadgeUrl, 'Creator')}</pre>
            </div>

            <div className="embed-code-block">
              <div className="code-header">
                <span>Markdown</span>
                <button 
                  className={`copy-code-btn ${copied === 'creator-md' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(generateMarkdown(creatorBadgeUrl, 'Creator'), 'creator-md')}
                >
                  {copied === 'creator-md' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <pre className="code-content">{generateMarkdown(creatorBadgeUrl, 'Creator')}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="badge-info">
        <p>💡 <strong>Tip:</strong> These badges update automatically as your content is analyzed by more users!</p>
      </div>
    </div>
  );
}

export default BadgeEmbed;

