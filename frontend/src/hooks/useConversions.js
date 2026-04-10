import { useState, useRef, useCallback } from 'react';

const API = 'http://localhost:3001';
const POLL_INTERVAL = 2000;

export function useConversions() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollStatus = useCallback((jobIds) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const results = await Promise.all(
          jobIds.map(id =>
            fetch(`${API}/api/status/${id}`).then(r => r.json())
          )
        );
        setJobs(prev => {
          const updated = prev.map(j => {
            const fresh = results.find(r => r.id === j.id);
            if (fresh && fresh.status === 'done' && j.status !== 'done' && window.electronAPI) {
              window.electronAPI.notify('Conversão Concluída!', `O vídeo "${fresh.title || 'Música'}" já está pronto.`);
            }
            return fresh ? { ...j, ...fresh } : j;
          });
          const allSettled = updated
            .filter(j => jobIds.includes(j.id))
            .every(j => j.status === 'done' || j.status === 'error');
          if (allSettled) stopPolling();
          return updated;
        });
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, POLL_INTERVAL);
  }, []);

  const convert = useCallback(async (urlsText, format = 'mp3') => {
    const urls = urlsText
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar conversão.');

      const newJobs = data.jobs.map(j => ({
        id: j.id,
        url: j.url,
        format: j.format || format,
        status: 'queued',
        title: 'Carregando...',
        filename: null,
        error: null,
      }));

      setJobs(prev => [...newJobs, ...prev]);
      pollStatus(newJobs.map(j => j.id));
    } catch (err) {
      console.error('Convert error:', err);
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [pollStatus]);

  const downloadOne = (job) => {
    if (window.electronAPI) {
      window.electronAPI.openFolder();
    } else {
      window.open(`${API}/api/download/${job.id}`, '_blank');
    }
  };

  const downloadAll = async () => {
    const doneIds = jobs.filter(j => j.status === 'done').map(j => j.id);
    if (doneIds.length === 0) return;

    try {
      const res = await fetch(`${API}/api/download-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: doneIds }),
      });
      if (!res.ok) throw new Error('Falha ao criar ZIP.');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'downloads_convertidos.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Erro ao baixar ZIP: ${err.message}`);
    }
  };

  const clearAll = () => {
    stopPolling();
    setJobs([]);
  };

  const doneCount = jobs.filter(j => j.status === 'done').length;
  const activeCount = jobs.filter(j => ['processing', 'pending', 'queued'].includes(j.status)).length;
  const errorCount = jobs.filter(j => j.status === 'error').length;

  return {
    jobs,
    loading,
    convert,
    downloadOne,
    downloadAll,
    clearAll,
    doneCount,
    activeCount,
    errorCount,
  };
}
