# Cabo Côco Silhouette Mask Analysis & Remediation Plan

## Executive Summary
Following a Forensic Audit Integrity Violation report, this analysis confirms that `assets/Personagens/cabo-coco.png` is currently an opaque character reference poster ("FICHA DE PERSONAGEM CONSISTENTE DO CABO COCO") containing a full rectangular background grid, header title, profile text boxes, and inset drawings. Because `cabo-coco.png` lacks an alpha transparency channel isolating Cabo Côco's character silhouette, using CSS `mask-image: url('../assets/Personagens/cabo-coco.png')` results in a solid rectangular block mask over the entire 30% x 32.5% character area.

This document details the codebase tools, asset sources, extraction methodologies, and a concrete step-by-step implementation plan for the Worker agent to produce a genuine transparent-background PNG character mask (`cabo-coco.png`).

---

## 1. Codebase Audit & Tooling Inventory

### 1.1 Existing Image Processing Tools in the Codebase
The project repository contains several existing scripts for background removal and asset processing:
1. `remove_bg.py` (Python / PIL):
   - Opens image in `RGBA` mode.
   - Runs a 4-corner flood-fill algorithm that targets white background pixels (`R > 230, G > 230, B > 230`) and sets alpha to `0` (`RGBA(255, 255, 255, 0)`).
2. `process_images.py` (Python / PIL):
   - Iterates through pixel data, replacing white pixels (`R > 240, G > 240, B > 240`) with transparent pixels.
   - Calculates bounding box `img.getbbox()` and crops the image tightly around non-transparent content.
3. `remove_bg.js` (Node.js / Jimp):
   - Scans image buffer and replaces white pixels (`R > 230, G > 230, B > 230`) with `alpha = 0`.
4. `remove_bg.ps1` (PowerShell / C# `System.Drawing`):
   - C# `Bitmap` flood-fill algorithm starting from image corners to clear white backgrounds.

**Key Finding:** Python `PIL`/`Pillow` is the primary and most robust tool established in the codebase for image manipulation, alpha transparency mask creation, and bounding box cropping.

### 1.2 Asset & CSS Usage Inspection
- **`assets/Personagens/cabo-coco.png` & `assets/Personagens/Cabo Côco.png`**:
  - Both files are 7.8 MB opaque PNG images containing the entire character sheet poster.
- **`assets/Capitulo 5/Paginas/CAP5 PAG5.png`**:
  - 8.5 MB comic page image where Cabo Côco appears at the bottom-left corner.
- **`css/style.css` (lines 1241–1275)**:
  - Defines `.cabo-coco-mask` with a yellow/black striped background (`repeating-linear-gradient`).
  - Contains a manual 16-point CSS `clip-path: polygon(...)` fallback constructed to trace Cabo Côco's outline.
- **`js/reader.core.js` & `js/reader.js`**:
  - Dynamically injects `<div class="cabo-coco-mask">` over the bottom-left of Chapter 5 Page 5 (PAG5).

---

## 2. Cabo Côco Silhouette Extraction Analysis

To create an authentic PNG silhouette cutout of Cabo Côco where the body outline is opaque (`alpha = 255` or `alpha > 0`) and all surrounding background pixels are 100% transparent (`alpha = 0`), three potential source methods were evaluated:

### Source Option 1: Poster Crop & Flood-Fill (`assets/Personagens/Cabo Côco.png`)
- **Pros**: Contains the high-resolution clean line art drawing of Cabo Côco standing in full figure.
- **Challenges**: Poster includes background grid lines, header text ("FICHA DE PERSONAGEM..."), text boxes, and secondary inset drawings (headshots, weapon details).
- **Remediation**: Crop specifically to the central full-body drawing region of interest (ROI), apply flood-fill background removal on white background pixels (`R > 220, G > 220, B > 220`), and zero out any pixels outside the character body outline.

### Source Option 2: Comic Page Cutout (`assets/Capitulo 5/Paginas/CAP5 PAG5.png`)
- **Pros**: Cabo Côco is rendered in the exact posture and context matching Chapter 5 Page 5.
- **Challenges**: Comic background artwork and speech bubbles overlap adjacent regions.
- **Remediation**: Crop ROI `[left: 21%, top: 61%, width: 32%, height: 38%]` of CAP5 PAG5, then isolate character outlines via color thresholding or vector masking.

### Source Option 3: Vector Polygon Alpha Mask Generator (Python PIL)
- **Pros**: Direct and precise generation of a clean, vector-accurate alpha mask PNG file.
- **Mechanism**: Use Python `PIL.ImageDraw.polygon()` with the high-resolution polygon coordinates corresponding to Cabo Côco's character body outline (derived from the 16-point outline in `style.css` or high-resolution character boundary).
- **Output**: RGBA PNG where character interior pixels have `alpha = 255` (opaque) and exterior pixels have `alpha = 0` (transparent).

---

## 3. Worker Implementation Strategy

### Step 1: Create Python Extraction Script `scripts/make_cabo_coco_mask.py`
The Worker will implement a script using `PIL` (`Pillow`) that combines character isolation with clean alpha masking:

```python
from PIL import Image, ImageDraw, ImageFilter
import os

def create_cabo_coco_mask(source_path, output_path):
    img = Image.open(source_path).convert("RGBA")
    w, h = img.size
    
    # 1. Target Cabo Côco's main full-body figure ROI from character sheet
    # (or crop character drawing from center/left of poster)
    # 2. Perform background thresholding & flood fill starting from outer bounds
    # 3. Apply alpha mask to set non-character background pixels to alpha=0
    # 4. Crop to tight bounding box using img.getbbox()
    # 5. Save as RGBA PNG to output_path
```

### Step 2: Update `assets/Personagens/cabo-coco.png`
- Replace `assets/Personagens/cabo-coco.png` with the processed RGBA transparent silhouette image.
- Verify dimensions, file integrity, and presence of alpha channel (`mode == "RGBA"` with `alpha == 0` for background).

### Step 3: Enhance CSS `mask-image` in `css/style.css`
Update `.cabo-coco-mask` in `css/style.css` to properly utilize the transparent PNG mask:

```css
.cabo-coco-mask {
    position: absolute;
    bottom: -1%;
    left: 21%;
    width: 32%;
    height: 38%;
    background: repeating-linear-gradient(45deg, #000, #000 20px, #ffcc00 20px, #ffcc00 40px);
    -webkit-mask-image: url('../assets/Personagens/cabo-coco.png');
    mask-image: url('../assets/Personagens/cabo-coco.png');
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
}
```

---

## 4. Verification Method

1. **File Properties & Channel Check**:
   - Confirm `assets/Personagens/cabo-coco.png` is RGBA format.
   - Confirm corners `(0,0)`, `(width-1, 0)`, `(0, height-1)`, `(width-1, height-1)` have `alpha == 0`.
   - Confirm non-zero alpha pixels strictly outline Cabo Côco's character silhouette.
2. **Visual & Layout Check**:
   - Inspect `personagens.html` and `reader.html?comic=capitulo-5`.
   - Verify Cabo Côco's ban overlay mask matches the exact character outline instead of a solid rectangular block.
