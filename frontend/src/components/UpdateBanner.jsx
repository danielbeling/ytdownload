import React, { useState, useEffect } from 'react';
import { MdSystemUpdateAlt, MdRefresh } from 'react-icons/md';

export default function UpdateBanner() {
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateMessage((msg) => {
      setMessage(msg);
      setShow(true);
      // Esconde mensagens temporárias após 5s, a menos que seja algo crítico
      if (msg.includes('atualizado') || msg.includes('Erro')) {
        setTimeout(() => setShow(false), 5000);
      }
    });

    window.electronAPI.onUpdateProgress((p) => {
      setProgress(p);
      setShow(true);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setIsDownloaded(true);
      setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <div className={`update-banner ${isDownloaded ? 'ready' : ''}`}>
      <div className="update-content">
        <MdSystemUpdateAlt size={20} className="update-icon" />
        <div className="update-info">
          <span className="update-text">{message}</span>
          {progress && !isDownloaded && (
            <div className="update-progress-container">
              <div className="update-progress-bar" style={{ width: `${progress.percent}%` }} />
            </div>
          )}
        </div>
        {isDownloaded && (
          <button className="btn btn-update-restart" onClick={() => window.electronAPI.restartApp()}>
            <MdRefresh size={18} /> Reiniciar Agora
          </button>
        )}
      </div>

      <style jsx>{`
        .update-banner {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          padding: 0.75rem 1.25rem;
          border-radius: 1rem;
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          z-index: 10000;
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          min-width: 300px;
        }

        .update-banner.ready {
          border-color: var(--success);
          background: rgba(6, 78, 59, 0.95);
        }

        .update-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .update-icon {
          color: var(--accent1);
        }

        .ready .update-icon {
          color: var(--success);
        }

        .update-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .update-text {
          font-size: 0.85rem;
          font-weight: 500;
          color: white;
        }

        .update-progress-container {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .update-progress-bar {
          height: 100%;
          background: var(--accent1);
          transition: width 0.3s ease;
        }

        .btn-update-restart {
          background: var(--success);
          color: white;
          border: none;
          padding: 0.4rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: 0.2s;
        }

        .btn-update-restart:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
