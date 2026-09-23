# Handoff Report — Cabo Côco Censorship Mask & Alignment Investigation

## 1. Observation

### Codebase Locations & Verbatim Evidence
1. **Asset Files**:
   - Comic Page 5 of Chapter 5: `C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader\assets\Capitulo 5\Paginas\CAP5 PAG5.png`
   - Mask Silhouette Image: `C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader\assets\Personagens\Cabo Côco.png`
2. **HTML Structure (`reader.html`)**:
   - Line 19: `<script src="js/reader.js?v=28"></script>`
   - Line 62: `<script src="js/reader.core.js?v=5"></script>`
3. **DOM Mask Injection (`js/reader.js`, lines 109–115)**:
   ```javascript
   if (comicId === 'capitulo-5' && index === chapter.pages.length - 1) {
       const maskDiv = document.createElement('div');
       maskDiv.className = 'cabo-coco-mask';
       maskDiv.innerHTML = '<span>CONTEÚDO BANIDO<br><small style="font-size: 0.8rem; color: #fff;">EM 456 PAÍSES</small></span>';
       wrapper.appendChild(maskDiv);
   }
   ```
4. **Reader Core Logic (`js/reader.core.js`, lines 104–157)**:
   - Does NOT contain the condition `if (currentComic.id === 'capitulo-5' ...)` to append `.cabo-coco-mask`.
   - Clears container: `elements.imageContainer.innerHTML = ''` (line 84).
5. **CSS Mask Definition (`css/style.css`, lines 1241–1273)**:
   ```css
   .cabo-coco-mask {
       position: absolute;
       bottom: -1%;
       left: 21%;
       width: 32%;
       height: 38%;
       background: repeating-linear-gradient(45deg, #000, #000 20px, #ffcc00 20px, #ffcc00 40px);
       -webkit-mask-image: url('../assets/Personagens/Cabo%20C%C3%B4co.png');
       mask-image: url('../assets/Personagens/Cabo%20C%C3%B4co.png');
       -webkit-mask-size: contain;
       mask-size: contain;
       -webkit-mask-repeat: no-repeat;
       mask-repeat: no-repeat;
       -webkit-mask-position: bottom center;
       mask-position: bottom center;
       display: flex;
       align-items: center;
       justify-content: center;
       z-index: 10;
       pointer-events: none;
   }
   .cabo-coco-mask span {
       ...
       font-size: 1.5vw;
       ...
   }
   ```

---

## 2. Logic Chain

1. **DOM Erasure by Duplicate Script Execution**:
   - `reader.html` loads `reader.js` at line 19 and `reader.core.js` at line 62.
   - When the document finishes loading (`DOMContentLoaded`), both scripts execute asynchronously.
   - `reader.js` creates the DOM wrapper and appends `.cabo-coco-mask`.
   - `reader.core.js` completes its database fetch, runs `renderPage()`, clears `elements.imageContainer.innerHTML = ''`, and re-renders pages without appending `.cabo-coco-mask`.
   - Observation 3 & 4 directly support this step: `reader.core.js` lacks mask injection code and clears `imageContainer`.

2. **Asset Pathing and URI Encoding Failure**:
   - In `style.css`, the path uses `url('../assets/Personagens/Cabo%20C%C3%B4co.png')`.
   - The file on disk is named `Cabo Côco.png` with unicode character `ô` (U+00F4) and space.
   - Non-ASCII percent-encoded strings (`%C3%B4`) in CSS relative URLs fail static file matching under certain web server configurations and file protocol implementations.

3. **Mask Misalignment & Unresponsive Sizing**:
   - In `style.css`, `.cabo-coco-mask` relies on `left: 21%; bottom: -1%; width: 32%; height: 38%`.
   - The parent `.page-wrapper` width varies (up to `800px`), causing percentages to compute differently depending on resolution and zoom scale (`--zoom-level`).
   - `font-size: 1.5vw` sets text scale relative to viewport width (`vw`) instead of image/container size, causing text scaling distortion when zooming.

---

## 3. Caveats

- **Browser-Specific WebKit Mask Behavior**: Different browser engines (Chromium vs Firefox vs Safari) handle `-webkit-mask-image` with URL-encoded special characters slightly differently. Normalizing the filename to standard ASCII (`cabo-coco.png`) is guaranteed to work across all platforms.
- **No Direct Code Modifications**: Per Explorer subagent mandate, no source files were modified during this investigation. All findings are documented in `.agents/explorer_1/`.

---

## 4. Conclusion

The Cabo Côco censorship mask failure stems from:
1. Script race condition / DOM override between `reader.js` and `reader.core.js`.
2. URL-encoding issue with special character `ô` in `Cabo Côco.png`.
3. Percentage and viewport unit misalignment in CSS (`.cabo-coco-mask` and `font-size: 1.5vw`).

### Actionable Fix Plan for Implementer:
1. Edit `reader.html` to remove the redundant `<script src="js/reader.js">` tag.
2. In `js/reader.core.js`, add the mask injection check inside `renderPage()` when `comicId === 'capitulo-5'` and `index === chapter.pages.length - 1`.
3. Create an ASCII-named copy/rename `cabo-coco.png` in `assets/Personagens/` and update references in `style.css` and `personagens.html`.
4. Update `css/style.css` `.cabo-coco-mask` rule: adjust container-relative positioning and change `font-size: 1.5vw` to container relative size.

---

## 5. Verification Method

1. **Verify Asset HTTP 200**:
   - Run server: `node server.js`
   - Access `http://localhost:3000/assets/Personagens/cabo-coco.png` (or renamed path) in browser or curl to confirm HTTP status 200.
2. **Verify DOM Element & Mask Display**:
   - Navigate to `http://localhost:3000/reader.html?comic=capitulo-5`
   - Inspect the last page (Page 5) in DevTools and confirm `.cabo-coco-mask` exists as a child of the page wrapper.
   - Confirm yellow and black stripes with `CONTEÚDO BANIDO` overlay cleanly on top of the character in `CAP5 PAG5.png`.
3. **Verify Responsive Zoom Alignment**:
   - Click Zoom In (+) and Zoom Out (-) buttons in reader.
   - Confirm mask stays aligned to the target panel on `CAP5 PAG5.png` across zoom levels (50% to 300%).
