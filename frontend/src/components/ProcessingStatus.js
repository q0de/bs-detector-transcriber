import React, { useState, useEffect } from 'react';
import './ProcessingStatus.css';

function ProcessingStatus({ isProcessing, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const processingSteps = [
    { emoji: '🎬', text: 'Starting video processing...', delay: 0 },
    { emoji: '🎯', text: 'Fetching transcript...', delay: 1000 },
    { emoji: '✅', text: 'Transcript retrieved', delay: 2000 },
    { emoji: '🤖', text: 'Analyzing with Claude AI...', delay: 3000 },
    { emoji: '📝', text: 'Generating highlights...', delay: 4000 },
    { emoji: '🎨', text: 'Adding claim tags...', delay: 5000 },
    { emoji: '✨', text: 'Wrapping up...', delay: 5500 },
    { emoji: '✅', text: 'Analysis complete!', delay: 6000 },
  ];

  useEffect(() => {
    if (!isProcessing) {
      // Show final step briefly, then fade out
      setCurrentStep(processingSteps.length - 1);
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 800);
      }, 500);
      return () => clearTimeout(fadeTimer);
    }

    // Reset when starting
    setCurrentStep(0);
    setFadeOut(false);
    console.log('🎬 ProcessingStatus: Starting - isProcessing:', isProcessing);

    // Animate through steps
    const timers = [];
    processingSteps.forEach((step, index) => {
      const timer = setTimeout(() => {
        if (isProcessing) {
          setCurrentStep(index);
          console.log(`📊 ProcessingStatus: Step ${index} - ${step.text}`);
        }
      }, step.delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isProcessing]);

  // Show when: processing OR showing completion (last step) OR fading out
  // Only hide when completely done (not processing, not on last step, not fading)
  const isShowingCompletion = !isProcessing && currentStep === processingSteps.length - 1;
  if (!isProcessing && !isShowingCompletion && !fadeOut) return null;
  
  // Debug log
  if (isProcessing) {
    console.log('✅ ProcessingStatus: Rendering - currentStep:', currentStep, 'isProcessing:', isProcessing);
  }

  return (
    <div className={`processing-status ${fadeOut ? 'fade-out' : ''}`}>
      <div className="processing-status-content">
        <div className="processing-emoji">
          {processingSteps[currentStep]?.emoji || '⏳'}
        </div>
        <div className="processing-text">
          {processingSteps[currentStep]?.text || 'Processing...'}
        </div>
        <div className="processing-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
}

export default ProcessingStatus;

