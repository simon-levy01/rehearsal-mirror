# Verification — October 2, 2026

Completed against the production static build served by `python tools/serve.py` at localhost, using real Chrome on Windows. No inference mock was used. Only fictional/synthetic practice content was used.

## Passed

Four Node unit checks: 12 distinct questions with four per role; elapsed-time timer pause/resume/completion/reset; valid backup round trip and malformed-data rejection; similarity ordering.

The original verification run recorded eighteen browser checks in `output/playwright/results.json`. Generated reports, logs, backups and screenshots are not committed to this source-only repository; run `npm run test:browser` after building and serving the app to generate fresh evidence:

1. Honest manual mode and disabled matching before model load.
2. Visible download progress and actual q8 MiniLM WASM model load.
3. Calendar collision first for the assistant scheduling question.
4. Delayed delivery first for the upset-customer question.
5. Duplicate invoice first for the administration record-error question.
6. Matching an edited synthetic story with browser networking disabled after load; no additional requests.
7. Browser-local data survives reload.
8. Both timer durations, pause, restart and completion (completion accelerated by Playwright's clock).
9. Cancelled full deletion preserves data.
10. Confirmed full deletion removes practice local storage, cards and answer text.
11. Actual downloaded JSON export and file-input import restore equivalent state.
12. Invalid import preserves existing data.
13. Desktop and 390px mobile rendering, no horizontal overflow.
14. All inputs, textareas and selects have associated labels.
15. Confirmed model-cache deletion removes the Transformers cache.
16. Blocked model download produces manual-only fallback and a retry control.
17. New card receives focus; editing and individual deletion confirmations work.
18. Page **and worker** network requests are GET-only; neither synthetic private-answer nor story canary occurs in any URL/body; no uncaught page errors.

The production runtime JS/WASM is served from localhost. Model/config/tokenizer files are fetched from Hugging Face at the pinned revision and redirected to its CDN where appropriate. The test harness strips signed query strings before writing its generated `network.json` log. No model endpoint is given stories or typed answers.

## Visual inspection

Desktop: 1280 × 900 viewport, full-page capture. Mobile: 390 × 844 viewport, full-page capture. `desktop-ai.png` and `mobile-ai.png` were opened and visually inspected, showing real ranked excerpts. Header, question text, labelled controls, timer, answer area, retrieval results, story fields and privacy/deletion controls are readable and fit the layout. The mobile layout stacks panels and cards. Native select menus shorten the displayed option to fit, with the full question repeated as page text. Longer STAR fields use editable scrolling textareas.

## Limits

- No recipient handover, usability study, hiring/proficiency scoring or income validation.
- Tested on one Chrome/Windows environment, not all browsers or low-memory phones.
- Screen-reader behaviour and full WCAG compliance were not independently audited.
- Three deliberately distinct synthetic ranking examples are a smoke test, not a retrieval benchmark. Similar or subtle experiences may rank poorly.
- Browser-local storage is unencrypted. Offline startup is not promised. Network metadata is visible to model hosts during download.
- This report describes local-build verification only. It does not establish publication status, contest eligibility or recipient consent.

## Source-release rebuild — October 2, 2026

A clean Linux x64 dependency install succeeded with the pinned lockfile using `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci`, with npm cache directed to a writable temporary directory. The dependency's supported setting skips unused native CUDA binaries; browser inference uses WASM. A plain install in this environment had failed while downloading the optional native CUDA archive through its network proxy.

`npm run build` and all four Node unit tests then passed. The six generated build files were byte-for-byte identical to the originally verified Windows build. No additional Linux browser-suite run is claimed. Generated `dist/`, `output/`, and installed dependencies remain excluded from the source repository.
