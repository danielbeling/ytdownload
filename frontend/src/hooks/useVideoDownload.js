import { useState, useCallback } from 'react';

const API = 'http://localhost:3001';

export function useVideoDownload() {
  const [videoInfo, setVideoInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadFinished, setDownloadFinished] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // { percent, loaded, total }
  const [error, setError] = useState(null);

  const fetchInfo = useCallback(async (url) => {
    setLoadingInfo(true);
    setError(null);
    setVideoInfo(null);
    setDownloadFinished(false);
    setDownloadProgress(null);

    try {
      const res = await fetch(`${API}/api/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar informações.');
      setVideoInfo({ ...data, url });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  const downloadMp4 = useCallback(async (quality) => {
    if (!videoInfo) return;

    setDownloading(true);
    setError(null);
    setDownloadProgress({ percent: 0, loaded: 0, total: 0 });

    try {
      // Create a job via the unified API
      const res = await fetch(`${API}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [videoInfo.url],
          format: 'mp4',
          quality: quality || 'best',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar download.');

      const jobId = data.jobs[0]?.id;
      if (!jobId) throw new Error('Job não criado.');

      // Poll for completion
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 1500));
        const statusRes = await fetch(`${API}/api/status/${jobId}`);
        const statusData = await statusRes.json();

        if (statusData.status === 'done') {
          done = true;
          // Now download the file
          const dlRes = await fetch(`${API}/api/download/${jobId}`);
          if (!dlRes.ok) throw new Error('Erro ao baixar arquivo.');

          const contentLength = dlRes.headers.get('Content-Length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          let loaded = 0;
          const reader = dlRes.body.getReader();
          const chunks = [];

          while (true) {
            const { done: readDone, value } = await reader.read();
            if (readDone) break;
            chunks.push(value);
            loaded += value.length;
            if (total > 0) {
              setDownloadProgress({
                percent: Math.round((loaded / total) * 100),
                loaded,
                total,
              });
            }
          }

          if (window.electronAPI) {
            window.electronAPI.notify('Vídeo Baixado!', `O vídeo "${statusData.title || 'Vídeo'}" foi salvo com sucesso.`);
            // Não abre a pasta sozinho!
          } else {
            const blob = new Blob(chunks, { type: 'video/mp4' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${statusData.title || 'video'}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          }

          setDownloadFinished(true);
          setDownloadProgress({ percent: 100, loaded, total });
        } else if (statusData.status === 'error') {
          throw new Error(statusData.error || 'Falha ao processar vídeo.');
        }
        // else still processing, keep polling
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }, [videoInfo]);

  const reset = useCallback(() => {
    setVideoInfo(null);
    setError(null);
    setDownloadProgress(null);
    setDownloading(false);
  }, []);

  return {
    videoInfo,
    loadingInfo,
    downloading,
    downloadProgress,
    error,
    fetchInfo,
    downloadMp4,
    downloadFinished,
    openFolder: () => window.electronAPI?.openFolder(),
    reset,
  };
}
