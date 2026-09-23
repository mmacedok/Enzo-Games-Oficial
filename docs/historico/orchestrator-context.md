# Context — Cabo Côco Censorship Fix

## Project Overview
Comic Reader web app located at `C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader`.
Target task: Fix Cabo Côco mask image loading and CSS alignment on CAP5 PAG5.png.

## Key Files & Paths
- Project Root: `C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader`
- Request File: `C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader\.agents\ORIGINAL_REQUEST.md`
- Working Directory: `C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader\.agents\orchestrator`

## Requirements Summary
- R1: Silhouette image `Cabo Côco.png` loaded correctly in CSS via `mask-image` (and `-webkit-mask-image`), handling spaces and special characters ('ô') without 404 console errors.
- R2: Yellow and black bar ("CONTEÚDO BANIDO") mask layer accurately positioned and sized to cover Cabo Côco on page 5 of Chapter 5 (`CAP5 PAG5.png`).
- Rest of page must remain 100% visible.
