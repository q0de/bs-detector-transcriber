import React, { useState } from 'react';
import './ShareButton.css';

function ShareButton({ videoResult }) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  if (!videoResult) return null;
  
  // Generate shareable text summary
  const getShareText = () => {
    const isFactCheck = typeof videoResult.analysis === 'object' && videoResult.analysis.fact_score !== undefined;
    
    if (isFactCheck) {
      const score = videoResult.analysis.fact_score;
      const verdict = videoResult.analysis.overall_verdict;
      const emoji = score >= 7 ? '✅' : score >= 4 ? '⚠️' : '❌';
      
      return `${emoji} Fact-Check Analysis: "${videoResult.title}"

📊 Score: ${score}/10 - ${verdict}
${videoResult.analysis.summary || ''}

Analyzed with BS Detector 🔍
${window.location.origin}`;
    } else {
      return `📄 Video Summary: "${videoResult.title}"

${videoResult.analysis}

Analyzed with BS Detector 🔍
${window.location.origin}`;
    }
  };
  
  const shareText = getShareText();
  
  // Copy link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Share to Twitter
  const handleTwitterShare = () => {
    const tweetText = shareText.substring(0, 260) + '...'; // Twitter limit
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };
  
  // Share to Reddit
  const handleRedditShare = () => {
    const url = `https://reddit.com/submit?title=${encodeURIComponent(videoResult.title)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };
  
  // Share via Email
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Fact-Check: ${videoResult.title}`);
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };
  
  return (
    <div className="share-button-container">
      <button 
        className="share-toggle"
        onClick={() => setShowOptions(!showOptions)}
      >
        🔗 Share Analysis
      </button>
      
      {showOptions && (
        <div className="share-options">
          <button 
            className={`share-option ${copied ? 'copied' : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? '✓ Copied!' : '📋 Copy Text'}
          </button>
          
          <button 
            className="share-option twitter"
            onClick={handleTwitterShare}
          >
            🐦 Twitter
          </button>
          
          <button 
            className="share-option reddit"
            onClick={handleRedditShare}
          >
            🤖 Reddit
          </button>
          
          <button 
            className="share-option email"
            onClick={handleEmailShare}
          >
            ✉️ Email
          </button>
        </div>
      )}
    </div>
  );
}

export default ShareButton;

