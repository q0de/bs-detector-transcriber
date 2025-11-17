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
    if (!token) {
      console.log('No token found, redirecting to signup');
      navigate('/signup');
      return;
    }
    console.log('User is authenticated, proceeding with video processing');

    setLoading(true);
    setError('');
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
      const response = await videoAPI.process(cleanUrl, analysisType);
      
      setProcessingStatus('Analysis complete!');
      
      // Call callback if provided
      if (onProcessed) {
        onProcessed(response.data);
      }
      
      // Redirect to dashboard with results
      navigate('/dashboard', { state: { videoResult: response.data } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process video. Please try again.');
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

