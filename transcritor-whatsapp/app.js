// Transcritor de Áudio do WhatsApp — lógica da interface
// Tudo roda no navegador. O áudio nunca sai do aparelho.

const els = {
  fileInput: document.getElementById('fileInput'),
  fileInfo: document.getElementById('fileInfo'),
  langSelect: document.getElementById('langSelect'),
  modelSelect: document.getElementById('modelSelect'),
  transcribeBtn: document.getElementById('transcribeBtn'),
  statusBox: document.getElementById('statusBox'),
  statusText: document.getElementById('statusText'),
  progressWrap: document.getElementById('progressWrap'),
  progressBar: document.getElementById('progressBar'),
  progressLabel: document.getElementById('progressLabel'),
  resultBox: document.getElementById('resultBox'),
  resultText: document.getElementById('resultText'),
  copyBtn: document.getElementById('copyBtn'),
  shareBtn: document.getElementById('shareBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  copyFeedback: document.getElementById('copyFeedback'),
  engineInfo: document.getElementById('engineInfo'),
};

let selectedFile = null;
let worker = null;
let busy = false;

const hasWebGPU = 'gpu' in navigator;
els.engineInfo.textContent = hasWebGPU
  ? 'Processado no aparelho · Whisper + WebGPU'
  : 'Processado no aparelho · Whisper (WASM)';

// ---------- Seleção de arquivo ----------
els.fileInput.addEventListener('change', () => {
  const file = els.fileInput.files?.[0];
  if (!file) return;
  selectedFile = file;
  els.fileInfo.hidden = false;
  els.fileInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong><br>${formatBytes(file.size)}`;
  els.transcribeBtn.disabled = false;
  els.resultBox.hidden = true;
});

// ---------- Transcrever ----------
els.transcribeBtn.addEventListener('click', async () => {
  if (!selectedFile || busy) return;
  busy = true;
  els.transcribeBtn.disabled = true;
  els.resultBox.hidden = true;
  showStatus('Lendo o áudio…');

  let audio;
  try {
    audio = await decodeAudioTo16kMono(selectedFile);
  } catch (err) {
    console.error(err);
    showError(
      'Não consegui ler este áudio. Tente outro formato (ex.: .opus, .m4a, .mp3) ou atualize o iOS do iPhone.'
    );
    finishBusy();
    return;
  }

  if (!audio || audio.length === 0) {
    showError('O áudio parece estar vazio.');
    finishBusy();
    return;
  }

  ensureWorker();
  const model = els.modelSelect.value;
  const language = els.langSelect.value; // 'portuguese' | 'auto' | ...
  const device = hasWebGPU ? 'webgpu' : 'wasm';

  showStatus('Carregando modelo… (na primeira vez pode demorar)');
  // Transfere o buffer para o worker para não copiar dados grandes.
  worker.postMessage(
    { type: 'transcribe', audio, model, language, device },
    [audio.buffer]
  );
});

// ---------- Worker ----------
function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const m = e.data;
    switch (m.type) {
      case 'status':
        showStatus(m.message);
        if (m.status !== 'loading') hideProgress();
        break;
      case 'progress':
        handleProgress(m.data);
        break;
      case 'complete':
        showResult(m.text?.trim() || '(silêncio / nada reconhecido)');
        finishBusy();
        break;
      case 'error':
        showError('Erro na transcrição: ' + m.message);
        finishBusy();
        break;
    }
  };
  worker.onerror = (e) => {
    showError('Erro ao iniciar o motor de transcrição: ' + (e.message || ''));
    finishBusy();
  };
  return worker;
}

const fileProgress = {};
function handleProgress(data) {
  if (!data || data.status !== 'progress' || !data.file) return;
  fileProgress[data.file] = data.progress || 0;
  const vals = Object.values(fileProgress);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  els.progressWrap.hidden = false;
  els.progressBar.style.width = avg.toFixed(1) + '%';
  els.progressLabel.hidden = false;
  els.progressLabel.textContent = `Baixando modelo… ${avg.toFixed(0)}%`;
}

// ---------- Decodificação de áudio -> Float32 16kHz mono ----------
async function decodeAudioTo16kMono(file) {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const tmpCtx = new AudioCtx();
  let decoded;
  try {
    decoded = await tmpCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    if (tmpCtx.close) tmpCtx.close();
  }

  const targetRate = 16000;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineCtx(1, frames, targetRate); // 1 canal => downmix mono
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0); // Float32Array
}

// ---------- UI helpers ----------
function showStatus(text) {
  els.statusBox.hidden = false;
  els.statusBox.classList.remove('error');
  els.statusText.textContent = text;
}
function hideProgress() {
  els.progressWrap.hidden = true;
  els.progressLabel.hidden = true;
}
function showError(text) {
  els.statusBox.hidden = false;
  els.statusBox.classList.add('error');
  els.statusText.textContent = text;
  hideProgress();
}
function showResult(text) {
  els.statusBox.hidden = true;
  els.resultBox.hidden = false;
  els.resultText.value = text;
}
function finishBusy() {
  busy = false;
  els.transcribeBtn.disabled = !selectedFile;
}

// ---------- Ações do resultado ----------
els.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.resultText.value);
  } catch {
    els.resultText.select();
    document.execCommand('copy');
  }
  els.copyFeedback.hidden = false;
  setTimeout(() => (els.copyFeedback.hidden = true), 1600);
});

els.shareBtn.addEventListener('click', async () => {
  const text = els.resultText.value;
  if (navigator.share) {
    try { await navigator.share({ text }); } catch {}
  } else {
    els.copyBtn.click();
  }
});

els.downloadBtn.addEventListener('click', () => {
  const blob = new Blob([els.resultText.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const base = (selectedFile?.name || 'transcricao').replace(/\.[^.]+$/, '');
  a.href = url;
  a.download = base + '.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---------- utils ----------
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Service worker (offline app shell) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
