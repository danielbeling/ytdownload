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

    </div>
  );
}
