import React, { useState, useEffect } from 'react';
import { MdClose, MdFolderOpen, MdSettings } from 'react-icons/md';

export default function SettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({ downloadFolder: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getSettings().then(setSettings);
    }
  }, [isOpen]);

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    const newPath = await window.electronAPI.selectFolder();
    if (newPath) {
      setSettings(prev => ({ ...prev, downloadFolder: newPath }));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MdSettings size={24} color="var(--accent1)" />
            <h2>Configurações</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        <div className="divider" />

        <div className="settings-body">
          <div className="setting-group">
            <label>Pasta de Downloads</label>
            <p className="setting-desc">Os vídeos convertidos serão salvos dentro de uma pasta "YTDownload" no local escolhido.</p>
            <div className="folder-selection-row">
              <div className="folder-path-display" title={settings.downloadFolder}>
                {settings.downloadFolder || 'Não configurado'}
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={handleSelectFolder}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                {loading ? <span className="spinner" /> : <><MdFolderOpen size={18} /> Alterar</>}
              </button>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Fechar e Salvar
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          background: var(--bg-card);
          width: 90%;
          max-width: 500px;
          border-radius: 1.5rem;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-close:hover {
          color: white;
          transform: rotate(90deg);
        }

        .settings-body {
          padding: 1.5rem 0;
        }

        .setting-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: white;
        }

        .setting-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .folder-selection-row {
          display: flex;
          gap: 0.75rem;
          align-items: stretch;
        }

        .folder-path-display {
          flex: 1;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          color: var(--accent1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: monospace;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
