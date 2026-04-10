import { FaMusic, FaVideo } from 'react-icons/fa';

export default function FormatTabs({ activeTab, onTabChange }) {
  return (
    <div className="format-tabs">
      <button
        className={`format-tab ${activeTab === 'mp3' ? 'active' : ''}`}
        onClick={() => onTabChange('mp3')}
      >
        <FaMusic size={14} />
        <span>MP3</span>
        <span className="tab-desc">Áudio</span>
      </button>
      <button
        className={`format-tab ${activeTab === 'mp4' ? 'active' : ''}`}
        onClick={() => onTabChange('mp4')}
      >
        <FaVideo size={14} />
        <span>MP4</span>
        <span className="tab-desc">Vídeo</span>
      </button>
      <div
        className="tab-indicator"
        style={{ transform: `translateX(${activeTab === 'mp3' ? '0%' : '100%'})` }}
      />
    </div>
  );
}
