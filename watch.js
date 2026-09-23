const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const ROOT = __dirname;
let timer, running = false, dirty = false;
function changed(filename) {
    const normalized = String(filename || '').replaceAll('\\', '/');
    if (!filename || normalized.startsWith('web/') || path.basename(normalized).startsWith('.') || path.basename(normalized) === 'cabo-coco.png') return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(build, 1000);
}
function build() {
    if (running || !dirty) return;
    running = true; dirty = false;
    execFile(process.execPath, ['atualizar.js'], { cwd: ROOT }, (error, stdout, stderr) => {
        running = false;
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
        if (error) console.error('Falha ao atualizar o catálogo:', error.message);
        if (dirty) { clearTimeout(timer); timer = setTimeout(build, 1000); }
    });
}
fs.watch(path.join(ROOT, 'assets'), { recursive: true }, (_, filename) => changed(filename));
fs.watch(path.join(ROOT, 'data'), (_, filename) => { if (filename === 'comics.manifest.json') changed(filename); });
console.log('Observando imagens e metadados. Alterações durante o build ficam na fila.');
changed('initial-build');
