import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import VideoProcessor from '../components/VideoProcessor';
import UsageIndicator from '../components/UsageIndicator';
import ProcessingStatus from '../components/ProcessingStatus';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginMessage, setShowLoginMessage] = useState(location.state?.loginSuccess || false);
  const [showHistoryMessage, setShowHistoryMessage] = useState(location.state?.fromHistory || false);
  const loginMessage = location.state?.message;

  useEffect(() => {
    fetchRecentVideos();
    
    // Auto-dismiss login message after 5 seconds
    if (showLoginMessage) {
      const timer = setTimeout(() => {
        setShowLoginMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    // Auto-dismiss history message after 3 seconds
    if (showHistoryMessage) {
      const timer = setTimeout(() => {
        setShowHistoryMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLoginMessage, showHistoryMessage]);

  // Ensure analysis is parsed if it's a JSON string (backup parsing)
  useEffect(() => {
    if (videoResult?.analysis && typeof videoResult.analysis === 'string' && videoResult.analysis.trim().startsWith('{')) {
      try {
        console.log('🔧 [useEffect] Parsing analysis string...');
        const parsed = JSON.parse(videoResult.analysis);
        // Only update if parsing succeeded and it's actually different
        if (parsed && typeof parsed === 'object') {
          setVideoResult(prev => ({ ...prev, analysis: parsed }));
          console.log('✅ [useEffect] Analysis parsed successfully');
        }
      } catch (e) {
        console.error('❌ [useEffect] Failed to parse analysis:', e);
      }
    }
  }, [videoResult?.id]); // Only run when video changes, not on every analysis change

  const fetchRecentVideos = async () => {
    try {
      const response = await videoAPI.getHistory({ limit: 5 });
      setRecentVideos(response.data.videos || []);
    } catch (err) {
      console.error('Failed to fetch recent videos:', err);
    }
  };

  const handleVideoProcessed = (result) => {
    // Force parse analysis if it's a JSON string - try multiple times for safety
    if (result.analysis && typeof result.analysis === 'string') {
      try {
        console.log('🔧 [handleVideoProcessed] Parsing analysis string...');
        result.analysis = JSON.parse(result.analysis);
        console.log('✅ [handleVideoProcessed] Parsed analysis:', result.analysis);
        console.log('📊 Has fact_score?', result.analysis?.fact_score !== undefined);
      } catch (e) {
        console.error('❌ [handleVideoProcessed] Failed to parse analysis JSON:', e);
        console.log('📄 Raw analysis:', result.analysis);
      }
    } else {
      console.log('✓ [handleVideoProcessed] Analysis type:', typeof result.analysis);
      console.log('✓ Analysis has fact_score?', result.analysis?.fact_score !== undefined);
    }
    setVideoResult(result);
    fetchRecentVideos();
  };

  const handleProcessingStart = () => {
    console.log('🧹 Clearing old results - new video processing started');
    setVideoResult(null);
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <h1 className="page-title">Welcome back!</h1>
        
        {showLoginMessage && loginMessage && (
          <div className="message message-success" style={{ marginBottom: '24px' }}>
            ✅ {loginMessage}
          </div>
        )}
        
        {showHistoryMessage && videoResult && (
          <div className="message message-info" style={{ marginBottom: '24px', background: '#e3f2fd', border: '1px solid #2196f3', color: '#1565c0' }}>
            📚 Loaded from history: <strong>{videoResult.title || 'Video'}</strong>
          </div>
        )}

        <UsageIndicator />
        
        <ProcessingStatus 
          isProcessing={isProcessing} 
          onComplete={() => setIsProcessing(false)}
        />
        
        <div className="dashboard-section">
          <VideoProcessor 
            onProcessed={handleVideoProcessed} 
            onLoadingChange={setIsProcessing}
            onProcessingStart={handleProcessingStart}
          />
        </div>
        
        {videoResult && (
          <div className="dashboard-section video-results">
            <div className="message message-success">
              ✅ Video Processed Successfully!
            </div>
            <div className="results-info">
              {videoResult.minutes_charged} minutes used • {videoResult.minutes_remaining} minutes remaining
            </div>
            
            {/* Video Metadata Card */}
            <div className="video-metadata-card">
              {videoResult.metadata?.thumbnail && (
                <img 
                  src={videoResult.metadata.thumbnail} 
                  alt="Video thumbnail"
                  className="video-metadata-thumbnail"
                />
              )}
              <div className="video-metadata-info">
                <h2 className="video-metadata-title">
                  {videoResult.metadata?.title || videoResult.title || 'Video Analysis'}
                </h2>
                {videoResult.metadata?.author && (
                  <p className="video-metadata-author">
                    👤 {videoResult.metadata.author}
                  </p>
                )}
                <p className="video-metadata-details">
                  📹 {videoResult.platform || 'Unknown'} • 
                  ⏱️ {videoResult.duration_minutes?.toFixed(1)} min
                  {videoResult.created_at && ` • 📅 ${new Date(videoResult.created_at).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            
            {/* Helper: Get parsed analysis */}
            {(() => {
              let analysis = videoResult.analysis;
              
              console.log('🔍 [Render] Analysis type:', typeof analysis);
              console.log('🔍 [Render] Analysis type (videoResult):', videoResult.analysis_type);
              console.log('🔍 [Render] Analysis length:', typeof analysis === 'string' ? analysis.length : 'N/A');
              console.log('🔍 [Render] Analysis preview:', typeof analysis === 'string' ? analysis.substring(0, 200) : 'object');
              
              // Parse if it's a JSON string
              if (typeof analysis === 'string') {
                try {
                  // Try to repair common JSON issues
                  let jsonString = analysis.trim();
                  
                  // Check if it looks like JSON
                  if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
                    analysis = JSON.parse(jsonString);
                    console.log('✅ [Render] Parsed analysis successfully');
                  } else if (jsonString.startsWith('{')) {
                    // JSON might be truncated - try to close it
                    console.warn('⚠️ [Render] JSON appears truncated, attempting repair...');
                    // Try to find the last complete property and close the JSON
                    const lastCompleteBrace = jsonString.lastIndexOf('}');
                    if (lastCompleteBrace > 0) {
                      // Try parsing up to the last complete brace
                      try {
                        const partial = jsonString.substring(0, lastCompleteBrace + 1);
                        analysis = JSON.parse(partial);
                        console.log('✅ [Render] Repaired and parsed truncated JSON');
                      } catch (e2) {
                        console.error('❌ [Render] Could not repair JSON:', e2);
                        // Fall back to trying to extract just the fact_score if possible
                        const factScoreMatch = jsonString.match(/"fact_score"\s*:\s*(\d+)/);
                        const verdictMatch = jsonString.match(/"overall_verdict"\s*:\s*"([^"]+)"/);
                        if (factScoreMatch) {
                          console.log('🔧 [Render] Extracted fact_score from broken JSON:', factScoreMatch[1]);
                          // Create a minimal analysis object
                          analysis = {
                            fact_score: parseInt(factScoreMatch[1]),
                            overall_verdict: verdictMatch ? verdictMatch[1] : 'Unknown',
                            summary: 'Analysis data corrupted - please reprocess this video',
                            verified_claims: []
                          };
                        } else {
                          throw e2;
                        }
                      }
                    } else {
                      throw new Error('JSON string does not appear to be valid JSON');
                    }
                  } else {
                    // Not JSON, treat as plain text
                    console.log('📝 [Render] Analysis is plain text, not JSON');
                  }
                } catch (e) {
                  console.error('❌ [Render] Failed to parse analysis:', e);
                  console.error('❌ [Render] Error at position:', e.message.match(/position (\d+)/)?.[1]);
                  // Try to extract what we can
                  const factScoreMatch = analysis.match(/"fact_score"\s*:\s*(\d+)/);
                  const verifiedMatch = analysis.match(/"verified_claims"\s*:\s*\[/);
                  if (factScoreMatch || verifiedMatch) {
                    console.log('🔧 [Render] Detected fact-check indicators in broken JSON, attempting recovery...');
                    // This is definitely a fact-check, even if JSON is broken
                    // We'll render it as fact-check but show an error message
                    analysis = {
                      fact_score: factScoreMatch ? parseInt(factScoreMatch[1]) : 0,
                      overall_verdict: 'Analysis Error',
                      summary: '⚠️ Analysis data is corrupted. The video was fact-checked but the full analysis could not be loaded. Please reprocess this video.',
                      verified_claims: [],
                      _error: true,
                      _rawData: analysis.substring(0, 1000) // Keep first 1000 chars for debugging
                    };
                  }
                }
              }
              
              // Check if it's a fact-check (multiple indicators)
              const hasFactScore = typeof analysis === 'object' && analysis?.fact_score !== undefined;
              const hasVerifiedClaims = typeof analysis === 'object' && Array.isArray(analysis?.verified_claims);
              const isFactCheckType = videoResult.analysis_type === 'fact-check';
              // If it has fact_score OR verified_claims OR analysis_type is fact-check, it's a fact-check
              const isFactCheck = isFactCheckType || hasFactScore || hasVerifiedClaims;
              
              console.log('🔍 [Render] isFactCheckType:', isFactCheckType);
              console.log('🔍 [Render] hasFactScore:', hasFactScore);
              console.log('🔍 [Render] hasVerifiedClaims:', hasVerifiedClaims);
              console.log('🔍 [Render] isFactCheck:', isFactCheck);
              console.log('🔍 [Render] analysis is object?', typeof analysis === 'object');
              console.log('🔍 [Render] analysis keys:', typeof analysis === 'object' ? Object.keys(analysis || {}) : 'not object');
              
              if (isFactCheck && typeof analysis === 'object' && analysis !== null) {
                console.log('✅ [Render] Rendering fact-check UI components');
                console.log('🔍 [DashboardPage] videoResult.id:', videoResult.id);
                console.log('🔍 [DashboardPage] videoResult:', videoResult);
                // Render enhanced fact-check components
                return (
                  <>
                    {/* Show error message if JSON was corrupted */}
                    {analysis._error && (
                      <div className="message message-warning" style={{ marginBottom: '20px', padding: '16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
                        <strong>⚠️ Analysis Data Corrupted</strong>
                        <p>The fact-check analysis for this video appears to be corrupted. The score and basic info are shown, but some details may be missing. Please reprocess this video to get the full analysis.</p>
                      </div>
                    )}
                    
                    <FactCheckScore data={analysis} />
                    
                    {/* Share Button - positioned right after score */}
                    <ShareButton videoResult={videoResult} />
                    
                    {/* Show creator reputation if available */}
                    {videoResult.creator && <CreatorBadge creator={videoResult.creator} />}
                    
                    <ClaimsList data={analysis} videoId={videoResult.id} />
                    <BiasScale data={analysis} />
                    <InteractiveTranscript 
                      transcript={videoResult.transcription}
                      highlightedTranscript={analysis.full_transcript_with_highlights}
                      transcriptSegments={videoResult.transcript_segments}
                    />
                    
                    {/* Embeddable Badge Codes */}
                    <BadgeEmbed 
                      videoId={videoResult.id}
                      creatorId={videoResult.creator?.id}
                    />
                  </>
                );
              } else {
                // Double-check: if analysis has fact_score OR verified_claims, it MUST be fact-check
                if (typeof analysis === 'object' && analysis !== null && 
                    (analysis.fact_score !== undefined || Array.isArray(analysis.verified_claims))) {
                  console.warn('⚠️ [Render] Analysis has fact-check indicators but fell into else block - forcing fact-check render');
                  return (
                    <>
                      <FactCheckScore data={analysis} />
                      <ShareButton videoResult={videoResult} />
                      {videoResult.creator && <CreatorBadge creator={videoResult.creator} />}
                      <ClaimsList data={analysis} videoId={videoResult.id} />
                      <BiasScale data={analysis} />
                      <InteractiveTranscript 
                        transcript={videoResult.transcription}
                        highlightedTranscript={analysis.full_transcript_with_highlights}
                        transcriptSegments={videoResult.transcript_segments}
                      />
                      <BadgeEmbed 
                        videoId={videoResult.id}
                        creatorId={videoResult.creator?.id}
                      />
                    </>
                  );
                }
                
                console.log('📝 [Render] Rendering summarize format (plain text)');
                // Render plain text format (summarize)
                return (
                  <>
                    <div className="result-section">
                      <div className="result-header">
                        <h3>📝 AI ANALYSIS</h3>
                        <div className="result-actions">
                          <button onClick={() => navigator.clipboard.writeText(
                            typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)
                          )}>
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="result-content">
                        {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
                      </div>
                    </div>
                    
                    <InteractiveTranscript 
                      transcript={videoResult.transcription}
                      transcriptSegments={videoResult.transcript_segments}
                    />
                  </>
                );
              }
            })()}
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

