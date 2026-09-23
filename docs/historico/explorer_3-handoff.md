# Handoff Report — Explorer 3 (Cabo Côco Silhouette Mask Remediation Analysis)

## 1. Observation
- `assets/Personagens/cabo-coco.png` (7,820,625 bytes) is currently identical to `assets/Personagens/Cabo Côco.png` (7,820,625 bytes), which is a fully opaque rectangular infographic poster titled "FICHA DE PERSONAGEM CONSISTENTE DO CABO COCO".
- In `css/style.css` (lines 1241–1275), `.cabo-coco-mask` applies a yellow/black hazard gradient background (`repeating-linear-gradient`). It currently uses a manually hardcoded 16-vertex CSS `clip-path: polygon(...)` approximation instead of CSS `mask-image` alpha transparency.
- Existing image tools in the project (`remove_bg.py`, `process_images.py`, `remove_bg.js`, `remove_bg.ps1`) demonstrate that Python `PIL`/`Pillow` flood-fill and white-background alpha thresholding is the established pattern for character asset transparency creation.
- In `js/reader.js` (lines 109–115) and `js/reader.core.js` (lines 132–137), `.cabo-coco-mask` is dynamically injected over Chapter 5 Page 5 (`assets/Capitulo 5/Paginas/CAP5 PAG5.png`) at `left: 21%`, `bottom: -1%`, `width: 32%`, `height: 38%`.

## 2. Logic Chain
1. **From Observation 1**: `cabo-coco.png` contains non-transparent background pixels (poster grid, profile text, header banner), filling the entire rectangular image dimension.
2. **From Observation 2 & CSS specifications**: CSS `mask-image: url('cabo-coco.png')` treats all opaque pixels (`alpha > 0`) as mask visibility regions. Because `cabo-coco.png` is 100% opaque across its entire rectangular area, CSS `mask-image` displays a solid rectangular block instead of Cabo Côco's character silhouette contour.
3. **From Observation 3**: The repository already contains Python `PIL` utilities (`remove_bg.py` and `process_images.py`) that perform white-background color filtering, RGBA conversion, alpha transparency setting (`alpha = 0`), and bounding box cropping (`getbbox()`).
4. **From Observation 4**: A dedicated Python processing script (`scripts/make_cabo_coco_mask.py` or similar) can isolate Cabo Côco's body figure from `assets/Personagens/Cabo Côco.png` (or `assets/Capitulo 5/Paginas/CAP5 PAG5.png`), set all non-character background pixels to `alpha = 0`, crop to character bounds, and overwrite `assets/Personagens/cabo-coco.png` with a genuine RGBA silhouette mask.
5. **Conclusion**: Replacing `cabo-coco.png` with a processed transparent PNG silhouette and updating CSS `.cabo-coco-mask` to use `mask-image: url('../assets/Personagens/cabo-coco.png')` cleanly resolves the Forensic Audit Integrity Violation.

## 3. Caveats
- Direct execution of Python scripts via `run_command` timed out waiting for user permission in this session. The Worker will need to execute the Python script or utilize PIL in their environment.
- If automatic flood-fill leaves residual poster text/grid artifacts, a vector alpha mask generated using the precise polygon coordinates can be combined with character pixel data.

## 4. Conclusion
The Forensic Audit Integrity Violation is caused by `assets/Personagens/cabo-coco.png` being an opaque full-page reference sheet poster instead of an RGBA character cutout with alpha transparency. Overwriting `cabo-coco.png` with a processed transparent PNG silhouette created via Python PIL background removal, combined with updating CSS `.cabo-coco-mask` to use CSS `mask-image`, will fully resolve the violation.

## 5. Verification Method
1. **Inspect `assets/Personagens/cabo-coco.png`**:
   - Verify image mode is `RGBA`.
   - Verify corner pixels `(0,0)`, `(w-1,0)`, `(0,h-1)`, `(w-1,h-1)` have alpha channel equal to 0 (`transparent`).
   - Verify non-transparent pixels (`alpha > 0`) strictly trace Cabo Côco's character outline.
2. **Inspect Page Rendering**:
   - Open `personagens.html` and `reader.html?comic=capitulo-5` in a browser.
   - Verify Cabo Côco's ban overlay mask conforms to the character body shape rather than a solid rectangle.
