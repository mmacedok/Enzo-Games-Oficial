## 2026-07-22T12:54:38Z
You are a Worker subagent (teamwork_preview_worker) assigned to implement the robust Cabo Côco transparent PNG silhouette mask extraction in comic-reader (Iteration 3).

Working Directory for your metadata: C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader\.agents\worker_implementation_3
Project Directory: C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader

Root Cause Identified by Reviewers 3 & 4:
`make_cabo_coco_mask.py` and `generate_mask_node.js` previously failed flood fill because `Cabo Côco.png` has a solid black outer border frame and dark header banner (`R, G, B < 50`). Sampling the outer image edges for seed pixels resulted in 0 seed pixels (`R > 220, G > 220, B > 220`), causing flood fill to fail completely, leaving `assets/Personagens/cabo-coco.png` 100% opaque (`alpha == 255` everywhere) and triggering a fallback copy of the opaque poster image.

Your Assigned Tasks:
1. Fix `scripts/make_cabo_coco_mask.py` (and `scripts/generate_mask_node.js`):
   - Crop the inner character drawing ROI (avoiding the outer black border frame and header banner), or sample light/beige background pixels (`R > 200, G > 190, B > 150`) inside the canvas, OR apply thresholding/vector contouring to isolate Cabo Côco's character silhouette body outline.
   - Convert all background pixels to `RGBA(0, 0, 0, 0)` (`alpha = 0`), keep character body outline pixels opaque (`alpha = 255`), crop tightly using `getbbox()`, and save to `assets/Personagens/cabo-coco.png`.
2. Verify RGBA Transparency:
   - Run `python scripts/verify_cabo_coco_mask.py` and confirm `Image Mode: RGBA`, corner pixels `(0,0)`, `(width-1, 0)`, `(0, height-1)`, `(width-1, height-1)` have `alpha == 0`, transparent pixels > 0, and non-transparent character pixels > 0.
3. Remove Facade Fallback Copies:
   - In `server.js` and `atualizar.js`, remove `fs.copyFileSync` fallbacks that copy the opaque poster `Cabo Côco.png` when mask generation fails.
4. CSS Masking Rules (`css/style.css`):
   - Ensure `.cabo-coco-mask` references `url('../assets/Personagens/cabo-coco.png')` with `-webkit-mask-image` and `mask-image`, `mask-size: contain`, `mask-position: center`, `mask-repeat: no-repeat`.
5. Build & Test Verification:
   - Run `python scripts/make_cabo_coco_mask.py`, `python scripts/verify_cabo_coco_mask.py`, and `node atualizar.js`. Document verification outputs in `handoff.md` in `.agents/worker_implementation_3/`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
