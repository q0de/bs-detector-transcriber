import React from 'react';
import './PricingCard.css';

function PricingCard({ plan, billingPeriod, onSubscribe }) {
  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const costPerMinute = price > 0 ? (price / plan.minutes).toFixed(3) : 0;
  const effectiveMonthlyPrice = billingPeriod === 'yearly' && price > 0 ? (price / 12).toFixed(2) : null;

  return (
    <div className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
      {plan.popular && <div className="popular-badge">Most Popular</div>}
      
      <h3>{plan.name}</h3>
      
      <div className="price-section">
        <div className="price">
          ${price}
          <span className="period">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        {effectiveMonthlyPrice && (
          <div className="savings-badge">${effectiveMonthlyPrice}/mo</div>
        )}
      </div>
      
      <div className="minutes">{plan.minutes} minutes/month</div>
      {costPerMinute > 0 && (
        <div className="cost-per-minute">${costPerMinute}/min</div>
      )}
      
      <ul className="features-list">
        {plan.features.map((feature, index) => (
          <li key={index}>
            {feature.startsWith('All') ? '✓' : feature.includes('✗') ? '✗' : '✓'} {feature.replace(/^[✓✗]\s*/, '')}
          </li>
        ))}
      </ul>
      
      <button
        className={`btn ${plan.name === 'Free' ? 'btn-secondary' : 'btn-primary'}`}
        onClick={onSubscribe}
        style={{ width: '100%' }}
      >
        {plan.name === 'Free' ? 'Get Started Free' : `Start ${plan.name}`}
      </button>
    </div>
  );
}

export default PricingCard;

