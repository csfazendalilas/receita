# 🎙️ Transcritor de Áudio do WhatsApp

Aplicativo web que transcreve áudios do WhatsApp **direto no navegador do seu iPhone** — sem servidor, sem chave de API, sem custo e **sem enviar o áudio para a internet**. Tudo acontece no próprio aparelho.

Feito para rodar de graça no **GitHub Pages** e abrir bem no **Safari do iPhone 15**.

---

## ✨ Como funciona

- **Motor de transcrição:** [Whisper](https://openai.com/research/whisper) (modelo da OpenAI) rodando 100% no navegador via [`transformers.js`](https://github.com/huggingface/transformers.js).
- **Aceleração:** usa **WebGPU** quando disponível (iPhone 15 com iOS recente) e cai automaticamente para **WASM** quando não houver.
- **Formatos aceitos:** `.opus` (formato que o WhatsApp exporta), além de `.ogg`, `.m4a`, `.mp3`, `.wav` e `.aac`.
- **Idioma:** padrão **Português**, com opção de detecção automática e outros idiomas.
- **Privacidade:** o áudio é decodificado e transcrito localmente. Nada sai do telefone.

### Por que essa escolha de ferramenta?

Como o requisito era hospedar no GitHub (hospedagem **estática**, sem back-end) e ter boa qualidade em português, o Whisper local via `transformers.js` é o encaixe ideal: não precisa de servidor nem de chave secreta (que não podem ficar seguras num site estático), funciona offline depois do primeiro carregamento e mantém o áudio privado.

---

## 📱 Como mandar o áudio do WhatsApp (iPhone)

> ⚠️ O iOS/Safari **não permite** que um site seja "alvo de compartilhamento" direto. Então o caminho é salvar o áudio em Arquivos e abri-lo no app:

1. No WhatsApp, **toque e segure** o áudio → **Encaminhar** (ou abra e use **Compartilhar**).
2. Escolha **Salvar em Arquivos** (*Save to Files*).
3. Abra o app, toque em **Escolher áudio** → **Procurar** e selecione o arquivo salvo.
4. Toque em **Transcrever**.

💡 Dica: no Safari, use **Compartilhar → Adicionar à Tela de Início** para abrir o site como um app (PWA), em tela cheia.

---

## 🚀 Publicar no GitHub Pages

Este repositório já está pronto. Escolha **uma** das opções:

### Opção A — Deploy automático (recomendado)
1. Vá em **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Pronto: a cada `push` na branch `main`, o workflow [`deploy.yml`](.github/workflows/deploy.yml) publica o site.

### Opção B — Servir direto da branch
1. Vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta **/(root)** e salve.

Em poucos minutos o site fica disponível em:
`https://<seu-usuario>.github.io/<nome-do-repo>/`

Abra esse endereço no Safari do iPhone. ✅

---

## 🧠 Modelos disponíveis (no app)

| Opção | Modelo | Tamanho aprox. | Quando usar |
|------|--------|----------------|-------------|
| Rápido | `whisper-tiny` | ~40 MB | Áudios curtos, prioridade em velocidade |
| Equilibrado (padrão) | `whisper-base` | ~80 MB | Bom custo-benefício no dia a dia |
| Preciso | `whisper-small` | ~250 MB | Melhor qualidade em português |

O modelo é **baixado uma única vez** e fica em cache no navegador.

---

## 🛠️ Rodar localmente (opcional)

Por usar ES Modules e Web Workers, é preciso servir por HTTP (não abra o `index.html` por `file://`):

```bash
# Python
python3 -m http.server 8080
# ou Node
npx serve .
```

Depois acesse `http://localhost:8080`.

> Observação: WebGPU/Web Worker exigem **contexto seguro** (HTTPS ou `localhost`). No GitHub Pages já é HTTPS.

---

## 📂 Estrutura

```
index.html            Interface
styles.css            Estilo (tema escuro, mobile-first)
app.js                Seleção de arquivo, decodificação de áudio e UI
worker.js             Web Worker que roda o Whisper (transformers.js)
manifest.webmanifest  Configuração de PWA
sw.js                 Service worker (abrir offline)
icon.svg / apple-touch-icon.png   Ícones
.github/workflows/deploy.yml       Deploy no GitHub Pages
```

---

## 🔒 Privacidade

Nenhum áudio ou texto é enviado a servidores. As únicas requisições de rede são o download (uma vez) do modelo do Whisper a partir do Hugging Face / CDN jsDelivr.
