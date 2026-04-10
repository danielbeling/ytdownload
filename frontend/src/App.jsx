import { useState, useEffect, useRef } from 'react';
import { useConversions } from './hooks/useConversions';
import { useVideoDownload } from './hooks/useVideoDownload';
import FormatTabs from './components/FormatTabs';
import UrlInput from './components/UrlInput';
import ConversionCard from './components/ConversionCard';
import DownloadAllBanner from './components/DownloadAllBanner';
import VideoInfoCard from './components/VideoInfoCard';
import SettingsModal from './components/SettingsModal';
import { FaTrash, FaMusic, FaVideo, FaSync } from 'react-icons/fa';
import { MdLibraryMusic, MdVideoLibrary, MdSearch, MdClose, MdSettings } from 'react-icons/md';

export default function App() {
  const [activeTab, setActiveTab] = useState('mp3');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ... rest of state stays the same ...

  // MP3 state
  const {
    jobs,
    loading,
    convert,
    downloadOne,
    downloadAll,
    clearAll,
    doneCount,
    activeCount,
    errorCount,
  } = useConversions();

  // MP4 state
  const {
    videoInfo,
    loadingInfo,
    downloading,
    downloadProgress,
    error: mp4Error,
    fetchInfo,
    downloadMp4,
    downloadFinished,
    openFolder: openMp4Folder,
    reset: resetMp4,
  } = useVideoDownload();

  const [mp4Url, setMp4Url] = useState('');
  const [appVersion, setAppVersion] = useState('...');
  const [updateMsg, setUpdateMsg] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(setAppVersion).catch(() => setAppVersion('v1.0.0'));

      // Listeners de atualização
      window.electronAPI.onUpdateMessage((msg) => setUpdateMsg(msg));
      window.electronAPI.onUpdateProgress((progress) => {
        setUpdateProgress(Math.round(progress.percent));
      });
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateMsg('Concluído! Reiniciando...');
        setTimeout(() => window.electronAPI.restartApp(), 2000);
      });
    }
  }, []);

  const handleMp4Search = () => {
    if (!mp4Url.trim()) return;
    fetchInfo(mp4Url.trim());
  };

  const handleMp4KeyDown = (e) => {
    if (e.key === 'Enter') handleMp4Search();
  };

  const handleConvert = (urlsText) => {
    convert(urlsText, 'mp3');
  };

  return (
    <div className="app">
      {/* Banner de Atualização */}
      {updateMsg && (
        <div className={`update-banner ${updateMsg.toLowerCase().includes('erro') ? 'error' : ''}`}>
          <div className="update-content">
            <FaSync className={updateMsg.toLowerCase().includes('erro') ? '' : 'spin'} />
            <span>{updateMsg}</span>
            {updateProgress > 0 && updateProgress < 100 && (
              <div className="update-mini-progress">
                <div className="update-mini-bar" style={{ width: `${updateProgress}%` }} />
              </div>
            )}
          </div>
          <button className="update-close" onClick={() => setUpdateMsg(null)}>×</button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="header" style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setIsSettingsOpen(true)}
          style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem' }}
          title="Configurações"
        >
          <MdSettings size={22} />
        </button>
        <div className="header-badge">
          {activeTab === 'mp3' ? (
            <><MdLibraryMusic style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} /> YouTube Converter Pro</>
          ) : (
            <><MdVideoLibrary style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} /> YouTube Converter Pro</>
          )}
        </div>
        <h1>
          {activeTab === 'mp3'
            ? <>Converta vídeos do<br />YouTube em MP3</>
            : <>Baixe vídeos do<br />YouTube em MP4</>
          }
        </h1>
        <p>
          {activeTab === 'mp3'
            ? 'Cole uma ou várias URLs, converta em segundos e baixe todas de uma vez.'
            : 'Cole o link, escolha a qualidade e baixe o vídeo em MP4.'
          }
        </p>
      </header>

      {/* ── Main Card ── */}
      <main className="main-card">
        {/* Format Tabs */}
        <FormatTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="divider" />

        {/* ─── MP3 Mode ─── */}
        {activeTab === 'mp3' && (
          <>
            <UrlInput onConvert={handleConvert} loading={loading} />

            {jobs.length > 0 && (
              <>
                <div className="divider" />

                {/* Stats Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="stats-row">
                    {doneCount > 0 && (
                      <span className="stat-chip">
                        <span className="dot" style={{ background: 'var(--success)' }} />
                        {doneCount} concluído{doneCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {activeCount > 0 && (
                      <span className="stat-chip">
                        <span className="dot" style={{ background: 'var(--accent2)' }} />
                        {activeCount} convertendo
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="stat-chip">
                        <span className="dot" style={{ background: 'var(--error)' }} />
                        {errorCount} com erro
                      </span>
                    )}
                  </div>
                  <button className="btn btn-ghost" onClick={clearAll} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaTrash size={12} /> Limpar lista
                  </button>
                </div>

                <DownloadAllBanner
                  doneCount={doneCount}
                  totalCount={jobs.length}
                  onDownloadAll={downloadAll}
                />

                {jobs.length > 0 && (
                  <div className="conversion-list">
                    {jobs.map(job => (
                      <ConversionCard
                        key={job.id}
                        job={job}
                        onDownload={downloadOne}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {jobs.length === 0 && !loading && (
              <>
                <div className="divider" />
                <div className="empty-state">
                  <div className="empty-icon">
                    <FaMusic />
                  </div>
                  <p>Cole as URLs acima e clique em <strong>Converter</strong><br />para começar.</p>
                </div>
              </>
            )}
          </>
        )}

        {/* ─── MP4 Mode ─── */}
        {activeTab === 'mp4' && (
          <>
            {/* Search Input */}
            <div className="mp4-search-section">
              <div className="url-input-label">
                <span className="dot" style={{ background: 'var(--mp4-accent)' }} />
                Link do vídeo
              </div>
              <div className="mp4-input-row">
                <input
                  type="url"
                  className="mp4-url-input"
                  placeholder="Cole o link do YouTube aqui..."
                  value={mp4Url}
                  onChange={e => setMp4Url(e.target.value)}
                  onKeyDown={handleMp4KeyDown}
                  disabled={loadingInfo}
                  autoFocus
                />
                <button
                  className="btn btn-mp4-search"
                  onClick={handleMp4Search}
                  disabled={loadingInfo || !mp4Url.trim()}
                >
                  {loadingInfo ? <span className="spinner" /> : <MdSearch size={20} />}
                </button>
                {(mp4Url || videoInfo) && (
                  <button
                    className="btn btn-ghost btn-mp4-clear"
                    onClick={() => { setMp4Url(''); resetMp4(); }}
                    disabled={loadingInfo}
                  >
                    <MdClose size={18} />
                  </button>
                )}
              </div>

              {/* Auto paste */}
              <div className="url-hint">
                Pressione Enter ou clique na lupa para buscar
              </div>
            </div>

            {/* Error */}
            {mp4Error && (
              <div className="mp4-error">
                ❌ {mp4Error}
              </div>
            )}

            {/* Video Info Card */}
            {videoInfo && (
              <>
                <div className="divider" />
                <VideoInfoCard
                  videoInfo={videoInfo}
                  onDownload={downloadMp4}
                  downloading={downloading}
                  downloadFinished={downloadFinished}
                  onOpenFolder={openMp4Folder}
                />

                {/* Download Progress */}
                {downloadProgress && downloading && (
                  <div className="mp4-progress-section">
                    <div className="progress-bar" style={{ height: '5px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${downloadProgress.percent}%`,
                          animation: downloadProgress.percent > 0 ? 'none' : undefined,
                        }}
                      />
                    </div>
                    <span className="mp4-progress-text">
                      {downloadProgress.percent > 0
                        ? `Baixando... ${downloadProgress.percent}%`
                        : 'Processando vídeo...'
                      }
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!videoInfo && !loadingInfo && !mp4Error && (
              <>
                <div className="divider" />
                <div className="empty-state">
                  <div className="empty-icon">
                    <FaVideo />
                  </div>
                  <p>Cole o link de um vídeo do YouTube<br />para buscar informações e baixar.</p>
                </div>
              </>
            )}

            {/* Loading state */}
            {loadingInfo && (
              <>
                <div className="divider" />
                <div className="empty-state">
                  <div className="empty-icon" style={{ animationName: 'spin', animationDuration: '1s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}>
                    <MdSearch />
                  </div>
                  <p>Buscando informações do vídeo...</p>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Feito com <span className="heart">♥</span> por <a href="https://danieldeveloper.vercel.app/" target="_blank" rel="noopener noreferrer">Daniel Beling</a></p>
        <p className="version-tag">Versão {appVersion}</p>
      </footer>
      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
