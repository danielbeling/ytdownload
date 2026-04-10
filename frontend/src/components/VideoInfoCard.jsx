import { useState } from 'react';
import { MdDownload, MdPlayArrow } from 'react-icons/md';
import { FaUser, FaEye } from 'react-icons/fa';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(count) {
  if (!count) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return `${count}`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export default function VideoInfoCard({ videoInfo, onDownload, downloading, downloadFinished, onOpenFolder }) {
  const [selectedQuality, setSelectedQuality] = useState(
    videoInfo?.formats?.[0]?.format_id || 'best'
  );

  if (!videoInfo) return null;

  return (
    <div className="video-info-card">
      <div className="video-info-inner">
        {/* Thumbnail */}
        <div className="video-thumb-wrapper">
          <img
            className="video-thumb"
            src={videoInfo.thumbnail}
            alt={videoInfo.title}
          />
          {videoInfo.duration && (
            <span className="video-duration-badge">
              <MdPlayArrow size={12} />
              {formatDuration(videoInfo.duration)}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="video-details">
          <h3 className="video-info-title">{videoInfo.title}</h3>
          <div className="video-meta-row">
            {videoInfo.channel && (
              <span className="video-meta-item">
                <FaUser size={11} />
                {videoInfo.channel}
              </span>
            )}
            {videoInfo.view_count > 0 && (
              <span className="video-meta-item">
                <FaEye size={11} />
                {formatViews(videoInfo.view_count)} views
              </span>
            )}
          </div>

          {/* Quality selection */}
          <div className="quality-section">
            <label className="quality-label">Qualidade:</label>
            <div className="quality-options">
              {(videoInfo.formats || []).map((f) => (
                <button
                  key={f.format_id}
                  className={`quality-btn ${selectedQuality === f.format_id ? 'active' : ''}`}
                  onClick={() => setSelectedQuality(f.format_id)}
                >
                  {f.format_id === 'best' ? 'Melhor' : f.quality}
                  {f.filesize > 0 && (
                    <span className="quality-size">~{formatBytes(f.filesize)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          {downloadFinished ? (
            <button
              className="btn btn-success"
              onClick={onOpenFolder}
              style={{ marginTop: '0.5rem', width: 'fit-content' }}
            >
              <MdDownload size={20} />
              Abrir Pasta
            </button>
          ) : (
            <button
              className="btn btn-download-mp4"
              onClick={() => onDownload(selectedQuality)}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <span className="spinner" />
                  Preparando...
                </>
              ) : (
                <>
                  <MdDownload size={20} />
                  Baixar MP4
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
