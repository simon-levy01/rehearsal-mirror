# Rehearsal Mirror

A browser-local interview practice pilot for personal-assistant, customer-support and administration roles. It helps users organise their own experiences into STAR cards and retrieve relevant notes with local semantic search. All included examples are fictional. No recipient testing or interview-outcome validation has taken place.

## Run locally

[Try the public demo](https://rehearsal-mirror-private-pilot.simonlevy00.chatgpt.site).

This repository includes application source, reproducible build/test commands and dependency licences. Generated build assets and test output are not committed. Install Node 22.12+ (or Node 24) and Python 3, then run:

```powershell
cd rehearsal-mirror
npm ci
npm run build
npm test
python tools/serve.py
```

Open http://127.0.0.1:4173 . Keep the terminal open; Ctrl+C stops the preview. This local server only serves static files; it has no upload, account or database endpoints. Use localhost or HTTPS for browser cache APIs. Opening index.html directly as a file will not work.

On Linux x64, this browser-only app does not need the transitive `onnxruntime-node` CUDA binaries. To skip that optional native download, replace `npm ci` with the following supported installation command, then run the build/test/serve commands above:

```bash
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
```

This setting is documented in the pinned dependency's [official v1.21.0 installer](https://github.com/microsoft/onnxruntime/blob/v1.21.0/js/node/script/install.js). Browser inference still uses the bundled WASM runtime.

For live development after installing dependencies:

```powershell
npm run dev
```

Browser verification uses an installed Chrome:

```powershell
# In one terminal:
python tools/serve.py
# In another:
npm run test:browser
npm run test:retrieval
```

If Chrome is unavailable, install Playwright Chromium with `npx playwright install chromium` and set `BROWSER_CHANNEL=chromium` in the environment. The test downloads a public model, uses only synthetic data, and writes its report to `output/playwright/`.

`test:retrieval` uses controlled worker replies to exercise UI races without inference or model downloads. `test:browser` separately verifies actual browser WASM retrieval. Both target the production build at http://127.0.0.1:4173.

## A two-minute demo

1. Click **Load fictional demo** beside the empty matching area or above the story cards. The three clearly labelled stories are examples, never claimed to be yours. Existing cards are replaced only after confirmation; loading the demo does not download the model.
2. Select Personal assistant and the first scheduling question. Click **Download & load local AI**. Inspect per-file download status and progress. First use downloads about 50 MB of model/runtime assets, depending on transport compression. No account or token is needed.
3. Click **Find relevant stories**. The calendar story should appear first, with a relevant excerpt copied exactly from the card. Try the customer complaint and invoice-record questions for the other two matches.
4. Write your own answer while keeping retrieved excerpts visible. Select 60 or 90 seconds, Start, Pause, resume or Restart. Answer and timer changes retain matches; changing a question or role, editing a card, or adding/removing cards clears them, so match again. Question/role/length changes reset the timer. Restart leaves typed text intact.
5. Export a JSON backup, then try confirmed deletion and import. A deletion cancellation keeps the data. Imported files replace existing data only after confirmation and validation.

## How open-source AI is central

The official **@huggingface/transformers 3.8.1** package runs a feature-extraction pipeline in a dedicated browser worker. The ungated **Xenova/all-MiniLM-L6-v2** ONNX conversion is pinned to revision **751bff37182d3f1213fa05d7196b954e230abad9**. It derives from **sentence-transformers/all-MiniLM-L6-v2**. Both model repositories declare **Apache-2.0**, verified October 2, 2026; the downloaded model card and API metadata are retained in `MODEL-CARD.md` and `model-provenance.json`.

The q8 ONNX model runs on WASM, one thread. Mean pooling and normalisation produce 384-dimensional embeddings. Cosine similarity ranks the selected question against up to 40 user cards. For the top three, the same model selects the most related STAR-field excerpt. No similarity values are presented as quality, hiring or proficiency scores. No text-generation model is used. Long input is truncated by the model (roughly 256 word pieces); concise cards work best. Retrieval can miss nuance, so review the full card.

Before loading, or after a load failure, the app honestly offers **manual-only** card browsing. Downloading the model is an explicit choice. The matching feature is genuinely unavailable until inference can run.

Matching returns the closest saved cards even when none answers the question. No confidence threshold or suitability verdict is inferred. The UI reminds users to review the full story and use it only if it supports a truthful answer.

## Privacy and deletion

- The one local-storage key is `rehearsal-mirror-v1`. Only cards, question selection, duration and typed answers are persisted. Embeddings exist only in worker memory. No telemetry, cookies, credentials, paid APIs, transcription, analytics or server storage.
- The build process bundles runtime scripts and WASM with the static app. Model GET requests contact Hugging Face and its file hosts. They reveal connection metadata, not your stories or answers. Inference itself makes no text-bearing network request.
- The real browser test captures page and worker requests, types distinct synthetic canaries, and checks that neither appears in any URL or request body. It also runs matching with browser networking disabled after loading. This is evidence for these tested flows, not a guarantee against a compromised browser/device.
- Deleting practice data removes only this app's local-storage key and clears active UI results. Exported JSON files remain wherever you saved them. A separate confirmed control clears the Transformers model cache and unloads its worker. If cache APIs are unavailable, browser site-data controls can remove cached downloads.
- Local storage and exported backups are unencrypted. Do not use a shared or untrusted browser profile. Clearing browser data can lose all notes; export first.
- **Offline inference after loading is tested. Offline startup is not promised.** Model cache eviction, a cold browser, or reload/runtime assets can require network. Keep the preview server running. There is no service worker.

## Evidence and scope

The original verification run produced a browser-check report, sanitized GET-only network log, and desktop/mobile screenshots showing live retrieval. Those generated artifacts are not committed to this source-only repository. Run `npm run test:browser` after building and serving the app to generate fresh evidence in `output/playwright/`. Desktop and 390px mobile screenshots from the original run were inspected. Form labels, visible focus, native controls, readable contrast and mobile reflow are included; no screen-reader or exhaustive WCAG audit was performed. Tested in Chrome on Windows; other browser/device combinations are unverified.

This is a bounded prototype: 12 original questions, two timer lengths, up to 40 editable STAR cards, one answer per question, and JSON import/export. It omits audio, coaching, grammar grading, invented stories, billing and accounts.

## Development and verification status

The original production build and synthetic test reports were produced on October 2, 2026; they are not included in this source-only repository. See `VERIFIED.md` for the exact scope. This source is prepared for open-source release; its presence does not establish a contest entry or eligibility. It contains no recipient feedback or personal practice records.

Built using OpenAI Codex. Codex provided substantial assistance with implementation, automated verification, and documentation. Review source, licenses and limitations before adapting the app. If this version is entered into a time-bounded challenge, preserve the submitted commit and identify later changes here.

## Attribution

Original app source: MIT; see `LICENSE`. Model/library/runtime terms are distinct; see `THIRD-PARTY-NOTICES.md` and bundled licence files. The pretrained model weights are downloaded at runtime and are not included in this repository.
