import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import VideoProcessor from '../components/VideoProcessor';
import UsageIndicator from '../components/UsageIndicator';
import FactCheckScore from '../components/FactCheckScore';
import ClaimsList from '../components/ClaimsList';
import BiasScale from '../components/BiasScale';
import InteractiveTranscript from '../components/InteractiveTranscript';
import CreatorBadge from '../components/CreatorBadge';
import ShareButton from '../components/ShareButton';
import BadgeEmbed from '../components/BadgeEmbed';
import { videoAPI } from '../services/api';
import './DashboardPage.css';

function DashboardPage() {
  const location = useLocation();
  const [videoResult, setVideoResult] = useState(() => {
    const result = location.state?.videoResult;
    if (result?.analysis && typeof result.analysis === 'string') {
      try {
        console.log('[Initial State] Parsing analysis string...');
        result.analysis = JSON.parse(result.analysis);
        console.log('[Initial State] Parsed analysis:', result.analysis);
      } catch (e) {
        console.error('[Initial State] Failed to parse analysis JSON:', e);
        console.log('[Initial State] Raw analysis:', result.analysis);
      }
    } else if (result) {
      console.log('[Initial State] Analysis type:', typeof result.analysis);
      console.log('[Initial State] Analysis has fact_score?', result.analysis?.fact_score !== undefined);
    }
    return result || null;
  });
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecentVideos();
  }, []);

  const fetchRecentVideos = async () => {
    try {
      const response = await videoAPI.getHistory({ limit: 5 });
      setRecentVideos(response.data.videos || []);
    } catch (err) {
      console.error('Failed to fetch recent videos:', err);
    }
  };

  const handleVideoProcessed = (result) => {
    // Parse analysis if it's a JSON string
    if (result.analysis && typeof result.analysis === 'string') {
      try {
        console.log('Parsing analysis string...');
        result.analysis = JSON.parse(result.analysis);
        console.log('Parsed analysis:', result.analysis);
      } catch (e) {
        console.error('Failed to parse analysis JSON:', e);
        console.log('Raw analysis:', result.analysis);
      }
    } else {
      console.log('Analysis type:', typeof result.analysis);
      console.log('Analysis has fact_score?', result.analysis?.fact_score !== undefined);
    }
    setVideoResult(result);
    fetchRecentVideos();
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <h1 className="page-title">Welcome back!</h1>
        
        <UsageIndicator />
        
        <div className="dashboard-section">
          <h2>Process a Video</h2>
          <VideoProcessor onProcessed={handleVideoProcessed} />
        </div>
        
        {videoResult && (
          <div className="dashboard-section video-results">
            <div className="message message-success">
              ✅ Video Processed Successfully!
            </div>
            <div className="results-info">
              {videoResult.minutes_charged} minutes used • {videoResult.minutes_remaining} minutes remaining
            </div>
            
            {/* Check if analysis is structured JSON (fact-check) */}
            {typeof videoResult.analysis === 'object' && videoResult.analysis.fact_score !== undefined ? (
              // Render enhanced fact-check components
              <>
                <FactCheckScore data={videoResult.analysis} />
                
                {/* Share Button - positioned right after score */}
                <ShareButton videoResult={videoResult} />
                
                {/* Show creator reputation if available */}
                {videoResult.creator && <CreatorBadge creator={videoResult.creator} />}
                
                <ClaimsList data={videoResult.analysis} />
                <BiasScale data={videoResult.analysis} />
                <InteractiveTranscript 
                  transcript={videoResult.transcription}
                  highlightedTranscript={videoResult.analysis.full_transcript_with_highlights}
                />
                
                {/* Embeddable Badge Codes */}
                <BadgeEmbed 
                  videoId={videoResult.id}
                  creatorId={videoResult.creator?.id}
                />
              </>
            ) : (
              // Render plain text format (summarize)
              <>
                <div className="result-section">
                  <div className="result-header">
                    <h3>📄 TRANSCRIPTION</h3>
                    <div className="result-actions">
                      <button onClick={() => navigator.clipboard.writeText(videoResult.transcription)}>
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="result-content">
                    {videoResult.transcription}
                  </div>
                </div>
                
                <div className="result-section">
                  <div className="result-header">
                    <h3>📝 AI ANALYSIS</h3>
                    <div className="result-actions">
                      <button onClick={() => navigator.clipboard.writeText(
                        typeof videoResult.analysis === 'string' 
                          ? videoResult.analysis 
                          : JSON.stringify(videoResult.analysis, null, 2)
                      )}>
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="result-content">
                    {typeof videoResult.analysis === 'string' 
                      ? videoResult.analysis 
                      : JSON.stringify(videoResult.analysis, null, 2)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {recentVideos.length > 0 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Videos</h2>
              <button onClick={() => window.location.href = '/history'}>
                View All →
              </button>
            </div>
            <div className="recent-videos">
              {recentVideos.map((video) => (
                <div key={video.id} className="video-card">
                  <div className="video-icon">
                    {video.platform === 'youtube' ? '🎬' : '📱'}
                  </div>
                  <div className="video-info">
                    <h3>{video.title || 'Untitled'}</h3>
                    <p>
                      {video.platform} • {video.duration_minutes.toFixed(1)} min • {video.analysis_type} • {new Date(video.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="video-actions">
                    <button onClick={() => window.location.href = `/history#${video.id}`}>
                      View
                    </button>
                    <button className="btn-danger" onClick={async () => {
                      if (window.confirm('Delete this video?')) {
                        await videoAPI.deleteVideo(video.id);
                        fetchRecentVideos();
                      }
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;

