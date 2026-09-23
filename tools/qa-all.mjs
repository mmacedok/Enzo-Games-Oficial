import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:3016';
const pages = ['index.html', 'personagens.html', 'degustador.html', ...[1,2,3,4,5,6].map(n => `reader.html?comic=capitulo-${n}`), 'reader.html?comic=degustador'];
const results = [];
mkdirSync('shots/site-audit', { recursive: true });
for (const mobile of [false, true]) {
    for (const page of pages) {
        const name = `${page.replace(/[^a-z0-9-]/gi, '_')}-${mobile ? 'mobile' : 'desktop'}`;
        const args = ['tools/qa.mjs', '--url', `${base}/${page}`, '--eval-file', 'tools/qa-site.js', '--out', `shots/site-audit/${name}.png`];
        if (mobile) args.push('--mobile', '--width', '390', '--height', '844');
        const run = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 45000 });
        const result = { page, mobile, status: run.status, output: run.stdout + run.stderr };
        results.push(result);
        console.log(`${run.status === 0 ? 'PASS' : 'FAIL'} ${name}`);
        if (run.status !== 0) console.log(result.output);
    }
}
writeFileSync('shots/site-audit/results.json', JSON.stringify(results, null, 2));
process.exitCode = results.some(r => r.status !== 0) ? 1 : 0;
