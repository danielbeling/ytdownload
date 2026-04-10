import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
// Removido import de electron (não disponível em processo forked do Node)

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// ─── Config ──────────────────────────────────────────────────────────────────
const MAX_CONCURRENT = 5;
const MAX_URLS = 20;
const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const EXEC_TIMEOUT = 300000; // 5 min

app.use(cors());
app.use(express.json());

const baseDownloadsPath = process.env.USER_DOWNLOADS_DIR || __dirname;
const DOWNLOADS_DIR = path.join(baseDownloadsPath, 'YTDownload');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// ─── State ───────────────────────────────────────────────────────────────────
// { [jobId]: { id, url, format, quality, status, title, filename, error, createdAt } }
const jobs = {};
let activeJobs = 0;
const pendingQueue = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(level, msg, meta = {}) {
  const ts = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  console.log(`[${ts}] [${level.toUpperCase()}] ${msg}${metaStr}`);
}

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9\s\-_()àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ]/g, '').trim().slice(0, 100) || 'download';
}

function getCommonFlags() {
  const ffmpegLoc = ffmpegPath.replace(/\\/g, '/');
  const nodeExec = process.execPath.replace(/\\/g, '/');
  return `--ffmpeg-location "${ffmpegLoc}" --js-runtimes "node:${nodeExec}" --no-playlist --no-check-certificate`;
}

function isValidYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/).+/;
  return pattern.test(url);
}

// ─── Job Processing ──────────────────────────────────────────────────────────

function processNextInQueue() {
  while (activeJobs < MAX_CONCURRENT && pendingQueue.length > 0) {
    const jobId = pendingQueue.shift();
    const job = jobs[jobId];
    if (job && job.status === 'queued') {
      activeJobs++;
      processJob(job).finally(() => {
        activeJobs--;
        processNextInQueue();
      });
    }
  }
}

async function processJob(job) {
  const commonFlags = getCommonFlags();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${job.id}.%(ext)s`);

  jobs[job.id].status = 'processing';
  log('info', `Processing job`, { id: job.id, format: job.format, url: job.url });

  try {
    // 1. Get video title
    const { stdout: titleOut } = await execAsync(
      `yt-dlp --print title ${commonFlags} "${job.url}"`,
      { timeout: 30000 }
    );
    const title = sanitizeTitle(titleOut.trim());
    jobs[job.id].title = title || 'Sem título';

    // 2. Convert / Download
    if (job.format === 'mp3') {
      await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 0 ${commonFlags} -o "${outputTemplate}" "${job.url}"`,
        { timeout: EXEC_TIMEOUT }
      );

      const outputFile = path.join(DOWNLOADS_DIR, `${job.id}.mp3`);
      if (!fs.existsSync(outputFile)) {
        const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(job.id));
        if (files.length === 0) throw new Error('Arquivo de saída não encontrado.');
        jobs[job.id].filename = files[0];
      } else {
        jobs[job.id].filename = `${job.id}.mp3`;
      }
    } else {
      // MP4
      let formatArg;
      if (job.quality && job.quality !== 'best') {
        formatArg = `${job.quality}+bestaudio/best`;
      } else {
        formatArg = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
      }

      await execAsync(
        `yt-dlp -f "${formatArg}" --merge-output-format mp4 ${commonFlags} -o "${outputTemplate}" "${job.url}"`,
        { timeout: EXEC_TIMEOUT }
      );

      const outputFile = path.join(DOWNLOADS_DIR, `${job.id}.mp4`);
      if (!fs.existsSync(outputFile)) {
        const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(job.id));
        if (files.length === 0) throw new Error('Arquivo de saída não encontrado.');
        jobs[job.id].filename = files[0];
      } else {
        jobs[job.id].filename = `${job.id}.mp4`;
      }
    }

    jobs[job.id].status = 'done';
    log('info', `Job completed`, { id: job.id, filename: jobs[job.id].filename });
  } catch (err) {
    jobs[job.id].status = 'error';
    jobs[job.id].error = err.stderr?.slice(0, 300) || err.message || 'Erro desconhecido';
    log('error', `Job failed`, { id: job.id, error: jobs[job.id].error });
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

function cleanupOldJobs() {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, job] of Object.entries(jobs)) {
    if (now - job.createdAt > JOB_TTL_MS) {
      // Remove file
      if (job.filename) {
        const filePath = path.join(DOWNLOADS_DIR, job.filename);
        try { fs.unlinkSync(filePath); } catch {}
      }
      delete jobs[id];
      cleaned++;
    }
  }
  if (cleaned > 0) log('info', `Cleanup: removed ${cleaned} expired jobs`);
}

setInterval(cleanupOldJobs, CLEANUP_INTERVAL_MS);

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/info — Get video info (for MP4 quality selection)
app.post('/api/info', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'URL do YouTube inválida.' });
  }

  const commonFlags = getCommonFlags();

  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json ${commonFlags} "${url}"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
    );

    const info = JSON.parse(stdout);

    // Get available video formats (streaming or combined)
    const formats = (info.formats || [])
      .filter(f => f.vcodec !== 'none' && f.height) // Must have video and height
      .map(f => ({
        format_id: f.format_id,
        quality: f.format_note || `${f.height}p`,
        height: f.height,
        filesize: f.filesize || f.filesize_approx || 0,
        ext: f.ext,
        is_combined: f.acodec !== 'none'
      }))
      .sort((a, b) => {
        // Sort by height desc, then prefer mp4
        if (b.height !== a.height) return b.height - a.height;
        if (a.ext === 'mp4' && b.ext !== 'mp4') return -1;
        if (a.ext !== 'mp4' && b.ext === 'mp4') return 1;
        return 0;
      });

    // Deduplicate by height, keeping the best within each height
    const seenHeights = new Set();
    const uniqueFormats = [];
    for (const f of formats) {
      if (!seenHeights.has(f.height)) {
        seenHeights.add(f.height);
        uniqueFormats.push(f);
      }
    }

    const availableQualities = uniqueFormats.length > 0 ? uniqueFormats : [
      { format_id: 'best', quality: 'Melhor qualidade', height: 9999, filesize: 0, ext: 'mp4' }
    ];

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      channel: info.channel || info.uploader,
      view_count: info.view_count,
      formats: availableQualities
    });
  } catch (err) {
    log('error', 'Failed to get video info', { url, error: err.message });
    res.status(500).json({ error: 'Não foi possível obter informações do vídeo.' });
  }
});

// POST /api/convert — Start conversion jobs
app.post('/api/convert', (req, res) => {
  const { urls, format = 'mp3', quality } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Forneça pelo menos uma URL.' });
  }

  if (urls.length > MAX_URLS) {
    return res.status(400).json({ error: `Máximo de ${MAX_URLS} URLs por vez.` });
  }

  if (!['mp3', 'mp4'].includes(format)) {
    return res.status(400).json({ error: 'Formato inválido. Use mp3 ou mp4.' });
  }

  const createdJobs = [];

  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) continue;

    if (!isValidYouTubeUrl(trimmed)) {
      continue; // Skip invalid URLs silently
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      url: trimmed,
      format,
      quality: quality || 'best',
      status: 'queued',
      title: 'Carregando...',
      filename: null,
      error: null,
      createdAt: Date.now(),
    };
    jobs[jobId] = job;
    createdJobs.push({ id: jobId, url: trimmed, format });

    pendingQueue.push(jobId);
  }

  // Trigger processing
  processNextInQueue();

  log('info', `Created ${createdJobs.length} jobs`, { format });
  res.json({ jobs: createdJobs });
});

// GET /api/status/:jobId
app.get('/api/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job não encontrado.' });

  res.json({
    id: job.id,
    url: job.url,
    format: job.format,
    status: job.status,
    title: job.title,
    filename: job.filename,
    error: job.error,
  });
});

// GET /api/download/:jobId — Stream the file
app.get('/api/download/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job não encontrado.' });
  if (job.status !== 'done') return res.status(400).json({ error: 'Conversão ainda não concluída.' });

  const filePath = path.join(DOWNLOADS_DIR, job.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado.' });

  const ext = job.format === 'mp3' ? 'mp3' : 'mp4';
  const mimeType = job.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
  const safeTitle = encodeURIComponent(`${job.title}.${ext}`);

  // Send file size for progress tracking
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeTitle}`);
  res.setHeader('Content-Type', mimeType);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);

  stream.on('error', (err) => {
    log('error', 'Stream error', { id: job.id, error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao enviar arquivo.' });
    }
  });
});

// POST /api/download-all — ZIP multiple done jobs
app.post('/api/download-all', (req, res) => {
  const { jobIds } = req.body;
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return res.status(400).json({ error: 'Nenhum job fornecido.' });
  }

  const doneJobs = jobIds
    .map(id => jobs[id])
    .filter(job => job && job.status === 'done' && job.filename);

  if (doneJobs.length === 0) {
    return res.status(400).json({ error: 'Nenhum arquivo concluído para baixar.' });
  }

  const format = doneJobs[0]?.format || 'mp3';
  const zipName = format === 'mp3' ? 'musicas_convertidas.zip' : 'videos_baixados.zip';

  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    log('error', 'Archive error', { error: err.message });
    if (!res.headersSent) res.status(500).end();
  });
  archive.pipe(res);

  for (const job of doneJobs) {
    const filePath = path.join(DOWNLOADS_DIR, job.filename);
    if (fs.existsSync(filePath)) {
      const ext = job.format === 'mp3' ? 'mp3' : 'mp4';
      archive.file(filePath, { name: `${job.title}.${ext}` });
    }
  }

  archive.finalize();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    activeJobs,
    queuedJobs: pendingQueue.length,
    totalJobs: Object.keys(jobs).length,
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log('info', `Server running on http://localhost:${PORT}`);
  log('info', `Downloads dir: ${DOWNLOADS_DIR}`);
  log('info', `FFmpeg: ${ffmpegPath}`);
  log('info', `Max concurrent jobs: ${MAX_CONCURRENT}`);
});
