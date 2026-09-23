# Cabo Côco Censorship Mask & Image Loading Analysis

## Executive Summary
This report presents a comprehensive investigation into the Cabo Côco censorship mask rendering, image loading, and alignment issues in the `comic-reader` application.

Two primary failures were identified:
1. **Mask Image Loading Failure (404 / Missing Mask)**: Caused by duplicate script inclusion (`reader.js` and `reader.core.js` both executed in `reader.html`), where `reader.core.js` overwrites the DOM without rendering the `.cabo-coco-mask`, combined with special character filename encoding (`Cabo Côco.png` with space and 'ô') in CSS `mask-image` URLs.
2. **Mask Misalignment & Scaling Issues**: Caused by percentage-based container positioning (`left: 21%; bottom: -1%; width: 32%; height: 38%`) on a non-locked aspect ratio wrapper, inappropriate `font-size: 1.5vw` (viewport-relative instead of container-relative), and mask sizing (`mask-size: contain`) mismatch against the yellow-black warning stripes background.

---

## Code Locations & Asset Mapping

| Component | File Path | Line Range / Element | Description |
|---|---|---|---|
| **Comic Page Asset** | `assets/Capitulo 5/Paginas/CAP5 PAG5.png` | N/A | Target comic page (Page 5 of Chapter 5) |
| **Character Asset** | `assets/Personagens/Cabo Côco.png` | N/A | Mask image silhouette file |
| **Reader View HTML** | `reader.html` | Lines 19 & 62 | Includes BOTH `js/reader.js` and `js/reader.core.js` |
| **Mask JS Injection** | `js/reader.js` | Lines 109–115 | Injects `<div class="cabo-coco-mask">` for Cap 5 last page |
| **Reader Core JS** | `js/reader.core.js` | Lines 104–157 | Main reader script (missing mask injection logic) |
| **Mask CSS Rules** | `css/style.css` | Lines 1241–1273 | `.cabo-coco-mask` and `.cabo-coco-mask span` styles |
| **Character Gallery** | `personagens.html` | Line 178 | Character card displaying `Cabo Côco.png` |

---

## Detailed Root Cause Analysis

### 1. Image Loading / 404 / Missing Mask Element

#### Cause 1.1: Script Execution Conflict in `reader.html`
- `reader.html` includes two separate reader scripts:
  - Line 19: `<script src="js/reader.js?v=28"></script>`
  - Line 62: `<script src="js/reader.core.js?v=5"></script>`
- Both scripts attach listeners to `DOMContentLoaded` and perform an asynchronous `fetch('data/database.json')`.
- `js/reader.js` checks:
  ```javascript
  if (comicId === 'capitulo-5' && index === chapter.pages.length - 1) {
      const maskDiv = document.createElement('div');
      maskDiv.className = 'cabo-coco-mask';
      maskDiv.innerHTML = '<span>CONTEÚDO BANIDO<br><small style="font-size: 0.8rem; color: #fff;">EM 456 PAÍSES</small></span>';
      wrapper.appendChild(maskDiv);
  }
  ```
- `js/reader.core.js` does **NOT** contain this logic. When `reader.core.js` finishes its async fetch, it executes `elements.imageContainer.innerHTML = ''`, wiping out the DOM elements rendered by `reader.js`.
- Result: The `.cabo-coco-mask` element is removed from the DOM completely during page load.

#### Cause 1.2: URL Encoding & Filename Special Characters in CSS
- In `css/style.css` (lines 1247–1248):
  ```css
  -webkit-mask-image: url('../assets/Personagens/Cabo%20C%C3%B4co.png');
  mask-image: url('../assets/Personagens/Cabo%20C%C3%B4co.png');
  ```
- File on disk: `assets/Personagens/Cabo Côco.png` (contains space and non-ASCII character `ô`).
- Standard web practice and file protocol handling (`file://` or certain web servers): Percent-encoded UTF-8 sequences (`%C3%B4`) in CSS relative URLs can fail resolution depending on browser URL normalization and OS filesystem encodings.
- Renaming assets to URL-safe ASCII names (e.g. `cabo-coco.png` or `cabo_coco.png`) avoids non-ASCII URI encoding pitfalls across cross-platform browsers.

---

### 2. Mask Misalignment & Incorrect Scaling

#### Cause 2.1: Percentage-Based Positioning on Unconstrained Container
- In `css/style.css`:
  ```css
  .cabo-coco-mask {
      position: absolute;
      bottom: -1%;
      left: 21%;
      width: 32%;
      height: 38%;
  }
  ```
- The parent wrapper (`.page-wrapper` or `wrapper` in `js/reader.js`) expands to width `100%` with `max-width: 800px`.
- Because the image aspect ratio is fixed, but the container height/width adjusts dynamically based on zoom (`--zoom-level`), window resizing, and screen aspect ratio:
  - `left: 21%` and `width: 32%` compute values relative to the container width rather than the rendered image bounds.
  - `bottom: -1%` and `height: 38%` compute relative to container height.
- Small shifts in viewport resolution cause the mask box to drift away from the target figure in `CAP5 PAG5.png`.

#### Cause 2.2: Viewport-Relative Font Sizing (`1.5vw`)
- In `css/style.css` (line 1266):
  ```css
  .cabo-coco-mask span {
      font-size: 1.5vw;
  }
  ```
- `vw` (viewport width) ties text sizing to the browser window size rather than the comic image or container size.
- When the user zooms in using the reader controls (`currentZoom`), `--zoom-level` scales the image size, but `1.5vw` remains fixed relative to the screen. On desktop monitors, text appears oversized; when zoomed in or on smaller screens, text becomes disproportionate.

#### Cause 2.3: Mask Scaling vs Background Gradient Mismatch
- In `css/style.css`:
  ```css
  background: repeating-linear-gradient(45deg, #000, #000 20px, #ffcc00 20px, #ffcc00 40px);
  mask-size: contain;
  mask-position: bottom center;
  ```
- `mask-size: contain` scales the character outline (`Cabo Côco.png`) inside the 32% x 38% box. If the aspect ratio of the 32% x 38% box does not match the image aspect ratio, transparent padding is added.
- The `repeating-linear-gradient` fills the entire rectangular box (including transparent areas outside the mask shape).

---

## Recommended Strategy & Fix Plan

1. **Unify Reader Scripts in `reader.html`**:
   - Remove duplicate `<script src="js/reader.js">` from `reader.html` (or combine reader script into single source of truth `reader.core.js`).
   - Move the `.cabo-coco-mask` injection logic into `reader.core.js` inside `renderPage()`.

2. **Standardize Asset Filename & Path**:
   - Create a URL-safe copy/rename or alias `Cabo_Coco.png` or `cabo-coco.png` in `assets/Personagens/`.
   - Update CSS references in `style.css` and HTML `personagens.html` to reference the clean filename.

3. **Refine CSS Mask Positioning & Scaling**:
   - Ensure `.cabo-coco-mask` is appended inside a wrapper that exactly matches the `.webtoon-image` bounding box (`position: relative; display: inline-block` or tight `.page-wrapper`).
   - Adjust `left`, `bottom`, `width`, and `height` to align precisely with the panel character in `CAP5 PAG5.png`.
   - Replace `font-size: 1.5vw` with container-relative units (e.g. `clamp(...)` or `%` or `cqw` / `em` relative to container width).

4. **Add E2E Verification Check**:
   - Add a test assertion in `js/game.test.js` or dedicated test script to verify `reader.html?comic=capitulo-5` renders `.cabo-coco-mask` successfully.
