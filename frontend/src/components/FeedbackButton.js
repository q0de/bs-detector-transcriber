import React, { useState } from 'react';
import './FeedbackButton.css';

function FeedbackButton() {
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // For now, just console log - you can add an API endpoint later
    console.log('Feedback submitted:', { feedback, email });
    
    // Could send to your backend or a service like Formspree, Google Forms, etc.
    // Example: await fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ feedback, email }) });
    
    setSubmitted(true);
    setTimeout(() => {
      setShowModal(false);
      setSubmitted(false);
      setFeedback('');
      setEmail('');
    }, 2000);
  };

  return (
    <>
      <button 
        className="feedback-floating-button" 
        onClick={() => setShowModal(true)}
        title="Send Feedback"
      >
        💬
      </button>

      {showModal && (
        <div className="feedback-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="feedback-modal-close" 
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
            
            <h2>Send Us Feedback</h2>
            <p>We'd love to hear your thoughts, suggestions, or issues!</p>
            
            {submitted ? (
              <div className="feedback-success">
                <div className="success-icon">✅</div>
                <p>Thank you for your feedback!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                <div className="form-group">
                  <label>Your Feedback *</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what you think..."
                    rows="6"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email (optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <small>We'll only use this to follow up on your feedback.</small>
                </div>
                
                <button type="submit" className="btn btn-primary">
                  Send Feedback
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackButton;

