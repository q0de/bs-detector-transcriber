import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import { supabase } from '../services/supabase';
import './VideoProcessor.css';

function VideoProcessor({ onProcessed }) {
  const [url, setUrl] = useState('');
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
    
    if (!url) {
      setError('Please enter a video URL');
      return;
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/signup');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await videoAPI.process(url, analysisType);
      
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

  return (
    <div className="video-processor">
      <form onSubmit={handleSubmit} className="processor-form">
        <div className="input-tabs">
          <button type="button" className="tab active">🔗 Paste link</button>
          <button type="button" className="tab">📁 File upload</button>
        </div>
        
        <div className="input-group">
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
          disabled={loading || !url}
        >
          {loading ? 'Processing...' : 'Analyze Video - Free →'}
        </button>
      </form>
    </div>
  );
}

export default VideoProcessor;

