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
  const navigate = useNavigate();

  const handleEstimate = async () => {
    if (!url) return;
    
    try {
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

    try {
      // Trim whitespace from URL
      const cleanUrl = url.trim();
      const response = await videoAPI.process(cleanUrl, analysisType);
      
      // Call callback if provided
      if (onProcessed) {
        onProcessed(response.data);
      }
      
      // Redirect to dashboard with results
      navigate('/dashboard', { state: { videoResult: response.data } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process video. Please try again.');
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
        
        <div className="analysis-type">
          <label>
            <input
              type="radio"
              name="analysisType"
              value="summarize"
              checked={analysisType === 'summarize'}
              onChange={(e) => setAnalysisType(e.target.value)}
              disabled={loading}
            />
            Summarize
          </label>
          <label>
            <input
              type="radio"
              name="analysisType"
              value="fact-check"
              checked={analysisType === 'fact-check'}
              onChange={(e) => setAnalysisType(e.target.value)}
              disabled={loading}
            />
            Fact Check (BS Detector)
          </label>
        </div>
        
        {estimatedMinutes && (
          <div className="estimate-info">
            ℹ️ This will use approximately {estimatedMinutes} minutes
          </div>
        )}
        
        {error && (
          <div className="message message-error">{error}</div>
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

