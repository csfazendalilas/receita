// Web Worker: roda o Whisper (transformers.js) fora da thread principal,
// para a interface não travar durante a transcrição.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

// Só usamos modelos remotos (do Hugging Face Hub), nunca locais.
env.allowLocalModels = false;

let transcriber = null;
let loadedKey = null; // `${model}|${device}`

async function buildPipeline(model, device, progress_callback) {
  const opts = { progress_callback };
  if (device === 'webgpu') {
    opts.device = 'webgpu';
    opts.dtype = { encoder_model: 'fp32', decoder_model_merged: 'fp32' };
  } else {
    opts.device = 'wasm';
    opts.dtype = 'q8';
  }
  return pipeline('automatic-speech-recognition', model, opts);
}

async function getTranscriber(model, device, progress_callback) {
  const key = `${model}|${device}`;
  if (transcriber && loadedKey === key) return transcriber;

  if (transcriber) {
    try { await transcriber.dispose?.(); } catch {}
    transcriber = null;
    loadedKey = null;
  }

  try {
    transcriber = await buildPipeline(model, device, progress_callback);
    loadedKey = key;
  } catch (err) {
    // Se a WebGPU falhar (driver/iOS antigo), cai para WASM.
    if (device === 'webgpu') {
      self.postMessage({ type: 'status', status: 'loading', message: 'WebGPU indisponível, usando modo compatível…' });
      transcriber = await buildPipeline(model, 'wasm', progress_callback);
      loadedKey = `${model}|wasm`;
    } else {
      throw err;
    }
  }
  return transcriber;
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type !== 'transcribe') return;

  try {
    self.postMessage({ type: 'status', status: 'loading', message: 'Carregando modelo…' });

    const t = await getTranscriber(msg.model, msg.device, (p) => {
      self.postMessage({ type: 'progress', data: p });
    });

    self.postMessage({ type: 'status', status: 'transcribing', message: 'Transcrevendo o áudio…' });

    const output = await t(msg.audio, {
      // 'auto' => deixa o Whisper detectar; senão usamos o idioma escolhido.
      language: msg.language === 'auto' ? undefined : msg.language,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });

    self.postMessage({
      type: 'complete',
      text: typeof output === 'string' ? output : output.text,
      chunks: output.chunks || [],
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message || String(err) });
  }
};
