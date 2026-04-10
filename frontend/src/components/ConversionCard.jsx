import { MdTimer, MdCheckCircle, MdError, MdDownload, MdHourglassEmpty } from 'react-icons/md';
import { FaSync, FaMusic, FaVideo } from 'react-icons/fa';

function getYtThumbnail(url) {
  try {
    const u = new URL(url);
    let videoId = u.searchParams.get('v');
    if (!videoId && u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    }
    if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  } catch {
    // Ignore parsing errors for invalid URLs
  }
  return null;
}

const STATUS_MAP = {
  queued: { label: 'Na fila', icon: <MdHourglassEmpty /> },
  pending: { label: 'Aguardando', icon: <MdTimer /> },
  processing: { label: 'Convertendo', icon: <FaSync className="spin" /> },
  done: { label: 'Concluído', icon: <MdCheckCircle style={{ color: 'var(--success)' }} /> },
  error: { label: 'Erro', icon: <MdError style={{ color: 'var(--error)' }} /> },
};

export default function ConversionCard({ job, onDownload }) {
  const thumb = getYtThumbnail(job.url);
  const st = STATUS_MAP[job.status] || STATUS_MAP.pending;
  const isMP3 = job.format === 'mp3';
  const formatLabel = isMP3 ? 'MP3' : 'MP4';

  return (
    <div className={`conv-card status-${job.status}`}>
      {/* Thumbnail */}
      {thumb ? (
        <img
          className="conv-thumb"
          src={thumb}
          alt="thumb"
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="conv-thumb-placeholder">
          {isMP3 ? <FaMusic /> : <FaVideo />}
        </div>
      )}

      {/* Info */}
      <div className="conv-info">
        <div className="conv-status-row">
          <div className="conv-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {st.icon} {st.label}
            {(job.status === 'processing' || job.status === 'queued') && <span className="spinner" />}
          </div>
          <span className={`conv-format-badge ${isMP3 ? 'badge-mp3' : 'badge-mp4'}`}>
            {isMP3 ? <FaMusic size={9} /> : <FaVideo size={9} />}
            {formatLabel}
          </span>
        </div>
        <div className="conv-title" title={job.title}>{job.title}</div>
        <div className="conv-url" title={job.url}>{job.url}</div>
        {(job.status === 'pending' || job.status === 'processing' || job.status === 'queued') && (
          <div className="progress-bar">
            <div className="progress-bar-fill" />
          </div>
        )}
        {job.status === 'error' && job.error && (
          <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 4 }}>
            {job.error.slice(0, 120)}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="conv-actions">
        {job.status === 'done' && (
          <button
            id={`download-${job.id}`}
            className="btn btn-success"
            onClick={() => onDownload(job)}
            title={`Baixar ${formatLabel}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <MdDownload size={18} /> Baixar {formatLabel}
          </button>
        )}
      </div>
    </div>
  );
}
