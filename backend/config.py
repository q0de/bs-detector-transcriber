"""
Feature flags for gradual rollout and easy rollback.
Set environment variables to enable/disable optimizations.
"""
import os

class FeatureFlags:
    """Feature flags for optimizations - can be disabled instantly via env vars"""
    
    # Low-risk optimizations
    USE_FASTER_AI_MODELS = os.getenv('USE_FASTER_AI_MODELS', 'false').lower() == 'true'
    USE_GLOBAL_CACHE = os.getenv('USE_GLOBAL_CACHE', 'false').lower() == 'true'
    
    # Medium-risk optimizations
    USE_OPENAI_WHISPER = os.getenv('USE_OPENAI_WHISPER', 'false').lower() == 'true'
    USE_PARALLEL_PROCESSING = os.getenv('USE_PARALLEL_PROCESSING', 'false').lower() == 'true'
    
    # High-risk optimizations
    USE_BACKGROUND_JOBS = os.getenv('USE_BACKGROUND_JOBS', 'false').lower() == 'true'
    
    @classmethod
    def get_status(cls):
        """Get all feature flags status for monitoring"""
        return {
            'faster_ai_models': cls.USE_FASTER_AI_MODELS,
            'global_cache': cls.USE_GLOBAL_CACHE,
            'openai_whisper': cls.USE_OPENAI_WHISPER,
            'parallel_processing': cls.USE_PARALLEL_PROCESSING,
            'background_jobs': cls.USE_BACKGROUND_JOBS,
        }
    
    @classmethod
    def print_status(cls):
        """Print feature flag status for debugging"""
        print("\n" + "="*60)
        print("🔧 FEATURE FLAGS STATUS")
        print("="*60)
        for key, value in cls.get_status().items():
            status = "✅ ENABLED" if value else "❌ DISABLED"
            print(f"  {key}: {status}")
        print("="*60 + "\n")

