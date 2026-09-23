# Plan: Cabo Côco Censorship Fix (Capítulo 5)

## Objective
Fix the Cabo Côco mask image loading and CSS alignment on CAP5 PAG5.png in the comic-reader codebase.

## Requirements
1. **R1: Mask Image Path & Encoding**: Ensure `Cabo Côco.png` is properly loaded using `mask-image` (and `-webkit-mask-image`) in CSS, correctly handling spaces and special characters (such as 'ô') or using proper URL encoding / renamed reference if appropriate. Ensure no 404 network errors occur.
2. **R2: Mask Alignment & Scaling**: Position and scale the CSS mask layer so that it perfectly covers the character Cabo Côco on `CAP5 PAG5.png` with the yellow/black "CONTEÚDO BANIDO" censorship overlay, while keeping the rest of the page 100% visible.

## Execution Plan & Milestones

### Milestone 1: Exploration & Root Cause Analysis
- **Goal**: Investigate codebase (HTML, CSS, JS, image assets in `assets/`, `css/`, `data/`, etc.) for page 5 of Chapter 5.
- **Action**: Spawn Explorer subagent (`teamwork_preview_explorer`) to find where `CAP5 PAG5.png` and `Cabo Côco.png` (or mask CSS rules) are defined, identify 404 issues, character encoding problems, and alignment/positioning CSS declarations.

### Milestone 2: Implementation & Fixes
- **Goal**: Apply fixes to CSS/HTML/JS assets to correctly load `Cabo Côco.png` mask image and accurately position/scale the censorship overlay.
- **Action**: Spawn Worker subagent (`teamwork_preview_worker`) with Explorer findings to implement the changes and verify local loading / node build/test.

### Milestone 3: Review & Verification
- **Goal**: Thorough review of code changes, mask rendering, alignment, console errors, and cross-browser/CSS property compatibility (`-webkit-mask-image`, `mask-image`, `mask-size`, `mask-position`, `mask-repeat`, etc.).
- **Action**: Spawn Reviewer subagent (`teamwork_preview_reviewer`) to inspect implementation quality, test coverage, and verify acceptance criteria.

### Milestone 4: Forensic Integrity Audit
- **Goal**: Perform independent forensic audit to guarantee genuine implementation without hardcoded test hacks.
- **Action**: Spawn Forensic Auditor subagent (`teamwork_preview_auditor`) to verify implementation authenticity.
