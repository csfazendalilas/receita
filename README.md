# RX Print BR (Local-first)

Aplicacao web local para preencher e imprimir:
- Notificacao de Receita A (219mm x 100mm)
- Notificacao de Receita B (212mm x 96mm)

## Stack
- Vite + React + TypeScript
- pdfjs-dist (parse do PDF no cliente)
- Sem backend

## Requisitos
- Node.js 18+
- npm

## Instalar e rodar
```bash
npm install
npm run dev
```
Abra o URL mostrado pelo Vite (normalmente http://localhost:5173).

## Build
```bash
npm run build
npm run preview
```

## Testes
```bash
npm run test
```
Cobertura atual:
- encurtamento de endereco
- normalizacao de quantidade

## Uso rapido
1. Escolha o tipo de receita A ou B.
2. Preencha manualmente os campos no painel esquerdo.
3. Opcional: importe um PDF pelo seletor de arquivo. Exemplos ficticios versionados em `samples/downloada.pdf` e `samples/downloadb.pdf` (nao coloque PDFs com dados reais em `public/`).
4. Ajuste a calibracao global e por campo se necessario.
5. Revise no preview (com template ON/OFF).
6. Clique em "Imprimir Receita".

## Calibracao
- Global X/Y (mm): desloca todos os campos.
- Por campo:
  - X/Y (mm): ajuste fino por campo.
  - Fonte (pt): fonte inicial.
  - Min (pt): minimo para shrink-to-fit.
  - Espaco (pt): letter spacing opcional.
- Todos os ajustes sao persistidos em `localStorage`.
- "Resetar calibracao" volta aos valores padrao do layout.

## Impressao correta (critico)
- Por padrao imprime **somente texto** (sem template).
- A janela de impressao usa `@page { size: ...mm ...mm; margin: 0; }`.
- Use sempre:
  - Escala: **100%**
  - Opcao: **Tamanho real / Actual size**
  - Nao usar "Ajustar pagina"

## Regras de texto
- Campos usam `maxWidthMm` com:
  - sem quebra de linha
  - shrink de fonte ate minimo
  - truncamento com `...` se ainda nao couber
- Endereco:
  - tenta abreviar logradouros (Rua->R., Avenida->Av., Servidao->Serv., Rodovia->Rod., Travessa->Tv., Estrada->Estr.)
  - opcional: abreviacao de cidade/estado (Florianopolis->Floripa, Santa Catarina->SC)
  - mostra status `fits/overflow` e texto final usado
  - permite override manual

## Assets locais
- `public/A.png` e `public/B.png` — templates vazios para o preview (servidos na URL publica do deploy).
- `samples/downloada.pdf` e `samples/downloadb.pdf` — exemplos **ficticios** para testar a extracao e o prefill; **nao** sao servidos pelo Vite (use o seletor de ficheiro na app). Os nomes ajudam a detetar automaticamente o tipo A ou B.

## Persistencia localStorage
- calibracao
- valores de formulario
- preferencias (tipo de receita + template ON/OFF)
- botao "Clear all data" limpa tudo
