import React, { useState, useEffect } from 'react';
import './ProcessingStatus.css';

function ProcessingStatus({ isProcessing, onComplete, videoUrl }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  // Detect platform from URL
  const isYouTube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  const isInstagram = videoUrl && (videoUrl.includes('instagram.com') || videoUrl.includes('instagr.am'));
  const platform = isYouTube ? 'YouTube' : isInstagram ? 'Instagram' : 'Video';

  // Platform-specific steps
  const youtubeSteps = [
    { emoji: '🎬', text: 'Starting video processing...' },
    { emoji: '🎯', text: 'Fetching transcript from YouTube...' },
    { emoji: '✅', text: 'YouTube transcript retrieved' },
    { emoji: '🤖', text: 'Analyzing content with AI...' },
    { emoji: '🔍', text: 'Fact-checking claims...' },
    { emoji: '📝', text: 'Generating highlights...' },
    { emoji: '🎨', text: 'Adding claim tags...' },
    { emoji: '💾', text: 'Storing analysis results...' },
    { emoji: '✨', text: 'Finalizing...' },
  ];

  const instagramSteps = [
    { emoji: '🎬', text: 'Starting video processing...' },
    { emoji: '📥', text: 'Downloading Instagram video...' },
    { emoji: '🎤', text: 'Transcribing audio with Whisper AI...' },
    { emoji: '✅', text: 'Transcription complete' },
    { emoji: '🤖', text: 'Analyzing content with AI...' },
    { emoji: '🔍', text: 'Fact-checking claims...' },
    { emoji: '📝', text: 'Generating highlights...' },
    { emoji: '💾', text: 'Storing analysis results...' },
    { emoji: '✨', text: 'Finalizing...' },
  ];

  const genericSteps = [
    { emoji: '🎬', text: 'Starting video processing...' },
    { emoji: '📥', text: 'Downloading video...' },
    { emoji: '🎤', text: 'Transcribing audio...' },
    { emoji: '🤖', text: 'Analyzing content with AI...' },
    { emoji: '🔍', text: 'Processing claims...' },
    { emoji: '💾', text: 'Storing results...' },
    { emoji: '✨', text: 'Finalizing...' },
  ];

  // Choose steps based on platform
  const processingSteps = isYouTube ? youtubeSteps : isInstagram ? instagramSteps : genericSteps;
  
  const completionStep = { emoji: '✅', text: 'Analysis complete!' };

  useEffect(() => {
    if (!isProcessing) {
      // Backend finished! Show completion message briefly, then fade out
      setCurrentStep(-1); // Special index for completion step
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 800);
      }, 800); // Show "complete" for 800ms before fading
      return () => clearTimeout(fadeTimer);
    }

    // Reset when starting
    setCurrentStep(0);
    setFadeOut(false);
    console.log('🎬 ProcessingStatus: Starting - isProcessing:', isProcessing);

    // Loop through steps continuously while processing
    // ~3 seconds per step = ~27 seconds for full cycle
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % processingSteps.length;
      setCurrentStep(stepIndex);
      console.log(`📊 ProcessingStatus: Step ${stepIndex} - ${processingSteps[stepIndex].text}`);
    }, 3000); // Change step every 3 seconds

    return () => {
      clearInterval(stepInterval);
    };
  }, [isProcessing]);

  // Show when: processing OR showing completion OR fading out
  const isShowingCompletion = !isProcessing && currentStep === -1;
  if (!isProcessing && !isShowingCompletion && !fadeOut) return null;
  
  // Get current step data
  const currentStepData = currentStep === -1 ? completionStep : processingSteps[currentStep];
  
  // Debug log
  if (isProcessing || isShowingCompletion) {
    console.log('✅ ProcessingStatus: Rendering - currentStep:', currentStep, 'isProcessing:', isProcessing, 'text:', currentStepData?.text);
  }

  return (
    <div className={`processing-status ${fadeOut ? 'fade-out' : ''}`}>
      <div className="processing-status-content">
        <div className="processing-emoji">
          {currentStepData?.emoji || '⏳'}
        </div>
        <div className="processing-text">
          {currentStepData?.text || 'Processing...'}
        </div>
        {/* Only show loading dots while processing, not on completion */}
        {isProcessing && (
          <div className="processing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProcessingStatus;

