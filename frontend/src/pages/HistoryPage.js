import React, { useState, useEffect } from 'react';
import { videoAPI } from '../services/api';
import './HistoryPage.css';

function HistoryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchVideos();
  }, [page, search, platformFilter, typeFilter]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(search && { search }),
        ...(platformFilter && { platform: platformFilter }),
        ...(typeFilter && { analysis_type: typeFilter })
      };
      
      const response = await videoAPI.getHistory(params);
      setVideos(response.data.videos || []);
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await videoAPI.deleteVideo(videoId);
      fetchVideos();
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleExport = async (videoId, format) => {
    try {
      const response = await videoAPI.exportVideo(videoId, format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `video-analysis-${videoId}-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export video:', err);
    }
  };

  return (
    <div className="history-page">
      <div className="container">
        <h1 className="page-title">Your Video History</h1>
        
        <div className="filters">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
          
          <select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Platforms</option>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="summarize">Summarize</option>
            <option value="fact-check">Fact Check</option>
          </select>
        </div>
        
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <p>No videos found. Process your first video to get started!</p>
          </div>
        ) : (
          <>
            <div className="videos-list">
              {videos.map((video) => (
                <div key={video.id} className="video-item">
                  <div className="video-icon">
                    {video.platform === 'youtube' ? '🎬' : '📱'}
                  </div>
                  <div className="video-details">
                    <h3>{video.title || 'Untitled'}</h3>
                    <p>
                      {video.platform} • {video.duration_minutes.toFixed(1)} min • {video.analysis_type} • {new Date(video.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="video-actions">
                    <button onClick={() => window.location.href = `#${video.id}`}>
                      View Results
                    </button>
                    <div className="dropdown">
                      <button>Export ▼</button>
                      <div className="dropdown-menu">
                        <button onClick={() => handleExport(video.id, 'txt')}>TXT</button>
                        <button onClick={() => handleExport(video.id, 'pdf')}>PDF</button>
                        <button onClick={() => handleExport(video.id, 'docx')}>DOCX</button>
                      </div>
                    </div>
                    <button className="btn-danger" onClick={() => handleDelete(video.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;

