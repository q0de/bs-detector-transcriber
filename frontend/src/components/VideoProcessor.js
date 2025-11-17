import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import { supabase } from '../services/supabase';
import './VideoProcessor.css';

function VideoProcessor({ onProcessed }) {
  const [inputType, setInputType] = useState('url'); // 'url' or 'file'
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [analysisType, setAnalysisType] = useState('summarize');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insufficientCredits, setInsufficientCredits] = useState(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const navigate = useNavigate();

  const fetchVideoMetadata = async (videoUrl) => {
    try {
      // Extract video ID from URL
      const videoId = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
      if (!videoId) return null;

      // Use YouTube oEmbed API (no auth needed)
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title,
          author: data.author_name,
          thumbnail: data.thumbnail_url
        };
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
    return null;
  };

  const handleEstimate = async () => {
    if (!url) return;
    
    try {
      // Fetch video metadata for preview
      const metadata = await fetchVideoMetadata(url);
      if (metadata) {
        setVideoMetadata(metadata);
      }
      // TODO: Add estimate endpoint
      // For now, we'll estimate based on URL
      setEstimatedMinutes(15); // Placeholder
    } catch (err) {
      console.error('Estimate error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (inputType === 'url' && !url) {
      setError('Please enter a video URL');
      return;
    }
    
    if (inputType === 'file' && !file) {
      setError('Please select a video file');
      return;
    }
    
    // File upload is Phase 2 - show message for now
    if (inputType === 'file') {
      setError('File upload is coming soon! Please use URL for now.');
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    const isAnonymous = !token;
    
    if (isAnonymous) {
      console.log('🎁 Anonymous user - using FREE trial mode');
    } else {
      console.log('✅ User is authenticated, proceeding with normal processing');
    }

    setLoading(true);
    setError('');
    setInsufficientCredits(null);
    setProcessingStatus('Fetching video info...');

    try {
      // Trim whitespace from URL
      const cleanUrl = url.trim();
      
      // Fetch metadata if we don't have it yet
      if (!videoMetadata) {
        const metadata = await fetchVideoMetadata(cleanUrl);
        if (metadata) {
          setVideoMetadata(metadata);
        }
      }
      
      setProcessingStatus('Processing video...');
      
      // Use different endpoint based on auth status
      let response;
      if (isAnonymous) {
        // Anonymous free trial - only summarize
        response = await videoAPI.processFree(cleanUrl);
        console.log('🎉 Free trial analysis complete!');
      } else {
        // Authenticated user - full processing
        response = await videoAPI.process(cleanUrl, analysisType);
      }
      
      setProcessingStatus('Analysis complete!');
      
      // Call callback if provided
      if (onProcessed) {
        onProcessed(response.data);
      }
      
      // Trigger usage update for authenticated users
      if (!isAnonymous) {
        window.dispatchEvent(new Event('usageUpdated'));
      }
      
      // Redirect to results with signup prompt for anonymous users
      if (isAnonymous) {
        navigate('/free-trial-result', { state: { 
          videoResult: response.data,
          originalUrl: cleanUrl 
        } });
      } else {
        // Redirect to dashboard with results for authenticated users
        navigate('/dashboard', { state: { videoResult: response.data } });
      }
    } catch (err) {
      // Check if this is an insufficient credits error
      if (err.response?.status === 403 && err.response?.data?.upgrade_required) {
        setInsufficientCredits({
          used: err.response.data.used,
          limit: err.response.data.limit,
          currentTier: err.response.data.current_tier
        });
      } else {
        setError(err.response?.data?.error || 'Failed to process video. Please try again.');
      }
      setProcessingStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUrl(''); // Clear URL when file is selected
    }
  };

  return (
    <div className="video-processor">
      <form onSubmit={handleSubmit} className="processor-form">
        <div className="input-tabs">
          <button 
            type="button" 
            className={`tab ${inputType === 'url' ? 'active' : ''}`}
            onClick={() => {
              setInputType('url');
              setFile(null);
            }}
          >
            🔗 Paste link
          </button>
          <button 
            type="button" 
            className={`tab ${inputType === 'file' ? 'active' : ''}`}
            onClick={() => {
              setInputType('file');
              setUrl('');
            }}
          >
            📁 File upload
          </button>
        </div>
        
        <div className="input-group">
            {inputType === 'url' ? (
            <input
              type="text"
              placeholder="Paste your YouTube or Instagram URL..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                handleEstimate();
              }}
              className="video-input"
              disabled={loading}
            />
          ) : (
            <div className="file-upload-area">
              <input
                type="file"
                id="video-file"
                accept="video/*"
                onChange={handleFileChange}
                className="file-input"
                disabled={loading}
              />
              <label htmlFor="video-file" className="file-label">
                {file ? `📁 ${file.name}` : '📁 Choose video file or drag and drop'}
              </label>
            </div>
          )}
        </div>
        
        <div className="analysis-type-selector">
          <div className="selector-label">Analysis Type:</div>
          <div className="segmented-control">
            <button
              type="button"
              className={`segment ${analysisType === 'summarize' ? 'active' : ''}`}
              onClick={() => setAnalysisType('summarize')}
              disabled={loading}
            >
              <span className="segment-icon">📝</span>
              <span className="segment-text">
                <strong>Summarize</strong>
                <small>Quick overview • 1× minutes</small>
              </span>
            </button>
            <button
              type="button"
              className={`segment ${analysisType === 'fact-check' ? 'active' : ''}`}
              onClick={() => setAnalysisType('fact-check')}
              disabled={loading}
            >
              <span className="segment-icon">🔍</span>
              <span className="segment-text">
                <strong>Fact Check ⭐</strong>
                <small>Full BS detection • 2.5× minutes</small>
              </span>
            </button>
          </div>
        </div>
        
        {estimatedMinutes && (
          <div className="estimate-info">
            <div className="estimate-breakdown">
              <div className="estimate-row">
                <span>📹 Video length:</span>
                <strong>{estimatedMinutes} min</strong>
              </div>
              {analysisType === 'fact-check' && (
                <>
                  <div className="estimate-row">
                    <span>✖️ Multiplier:</span>
                    <strong>2.5×</strong>
                  </div>
                  <div className="estimate-row estimate-total">
                    <span>💳 Total cost:</span>
                    <strong>{Math.ceil(estimatedMinutes * 2.5)} minutes</strong>
                  </div>
                </>
              )}
              {analysisType === 'summarize' && (
                <div className="estimate-row estimate-total">
                  <span>💳 Total cost:</span>
                  <strong>{estimatedMinutes} minutes</strong>
                </div>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <div className="message message-error">{error}</div>
        )}
        
        {insufficientCredits && (
          <div className="insufficient-credits-notice">
            <div className="notice-header">
              <span className="notice-icon">⚠️</span>
              <h3>Insufficient Credits</h3>
            </div>
            <div className="notice-body">
              <p className="notice-message">
                You've used <strong>{Math.round(insufficientCredits.used)}</strong> out of <strong>{insufficientCredits.limit}</strong> minutes this month.
              </p>
              <p className="notice-submessage">
                Upgrade your plan to get more credits and continue analyzing videos.
              </p>
              <div className="notice-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/pricing')}
                >
                  View Plans & Upgrade
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setInsufficientCredits(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        
        {loading && videoMetadata && (
          <div className="video-preview">
            <div className="video-preview-content">
              {videoMetadata.thumbnail && (
                <img 
                  src={videoMetadata.thumbnail} 
                  alt="Video thumbnail" 
                  className="video-thumbnail"
                />
              )}
              <div className="video-info">
                <h3>{videoMetadata.title}</h3>
                <p className="video-author">👤 {videoMetadata.author}</p>
                <div className="processing-status">
                  <div className="spinner"></div>
                  <span>{processingStatus}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
          <button
            type="submit"
            className="btn btn-primary processor-submit"
            disabled={loading || (inputType === 'url' && !url) || (inputType === 'file' && !file)}
          >
            {loading ? 'Processing...' : 'Analyze Video - Free →'}
          </button>
      </form>
    </div>
  );
}

export default VideoProcessor;

