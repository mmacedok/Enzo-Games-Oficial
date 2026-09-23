# Cabo Côco Censorship Mask Analysis & Root Causes

## Summary of Findings

### 1. Root Causes of 404 / Missing Mask Image
- **Duplicate Script Conflict in `reader.html`**:
  `reader.html` loads both `js/reader.js` (line 19) and `js/reader.core.js` (line 62). `reader.js` contained code to inject `<div class="cabo-coco-mask">` on the 5th page of Capítulo 5. However, `reader.core.js` (loaded later) fetches `database.json` and clears `imageContainer.innerHTML`, removing the mask element that `reader.js` created. `reader.core.js` lacked the mask injection code.
- **Special Character Filename / Encoding**:
  The mask image file on disk is `assets/Personagens/Cabo Côco.png` (with a space and accent `ô`). In `css/style.css`, it is referenced as `url('../assets/Personagens/Cabo%20C%C3%B4co.png')`. Percent-encoded non-ASCII UTF-8 characters (`%C3%B4`) in CSS relative URLs cause path resolution issues on certain web server and file system configurations.

### 2. Root Causes of Mask Misalignment & Incorrect Scaling
- **Container Relative Sizing Mismatch**:
  In `css/style.css`, `.cabo-coco-mask` uses fixed percentage offsets (`left: 21%; bottom: -1%; width: 32%; height: 38%`). Because `.page-wrapper` width scales dynamically (up to `800px` max-width) while the image aspect ratio is fixed, the percentages do not scale synchronously with the comic page image content.
- **Viewport-Relative Font Size (`1.5vw`)**:
  The font size of the text `CONTEÚDO BANIDO` inside the mask is set to `1.5vw`. Viewport width units do not scale when zooming the comic page via reader zoom controls (`--zoom-level`), causing text size distortion.
- **Mask Containment vs Box Background**:
  `mask-size: contain` scales the mask image inside the 32% x 38% box, while `background: repeating-linear-gradient(...)` fills the entire bounding rectangle, creating alignment mismatches between the yellow/black stripes and the character silhouette.

## Recommended Fix Strategy
1. Integrate the `cabo-coco-mask` DOM creation logic into `js/reader.core.js` and remove redundant `js/reader.js` script tag from `reader.html`.
2. Normalize asset filename to an ASCII URL-safe name (e.g. `assets/Personagens/cabo-coco.png`) and update CSS/HTML references.
3. Tighten CSS positioning for `.cabo-coco-mask` using relative container scaling and replace `font-size: 1.5vw` with container-relative sizing.
4. Add E2E verification test in `js/game.test.js` or test suite for Capítulo 5 mask rendering.
