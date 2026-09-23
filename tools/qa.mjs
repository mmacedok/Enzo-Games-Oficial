// QA harness: headless Chrome + DevTools Protocol.
// Renders a page at a given viewport, captures a full-page screenshot,
// and reports console errors, page exceptions and failed network requests.
//
// Usage:
//   node tools/qa.mjs --url http://localhost:3000/index.html --out shots/home-desktop.png
//   node tools/qa.mjs --url ... --mobile --width 390 --height 844 --wait 2500
//   node tools/qa.mjs --url ... --eval "document.querySelector('.garfield-classic-logo').click()" --click-js
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync, mkdtempSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let PORT = 0;

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const url = arg('url', 'http://localhost:3000/index.html');
const out = arg('out');
const width = Number(arg('width', 1440));
const height = Number(arg('height', 900));
const mobile = Boolean(arg('mobile', false));
const waitMs = Number(arg('wait', 1800));
const evalScript = arg('eval-file') ? readFileSync(resolve(arg('eval-file')), 'utf8') : arg('eval', null);
const evalAfterWait = Number(arg('eval-wait', 1200));
const fullPage = Boolean(arg('full-page', false));
const scale = Number(arg('scale', 1));

const userDataDir = mkdtempSync(resolve(tmpdir(), 'enzo-qa-'));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJson(path) {
  for (let i = 0; i < 60; i++) {
    try {
      if (!PORT) PORT = Number(readFileSync(resolve(userDataDir, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error(`Chrome DevTools endpoint not reachable: ${path}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: res, reject } = this.pending.get(msg.id);
        clearTimeout(this.pending.get(msg.id).timeout);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`));
        else res(msg.result);
        return;
      }
      if (msg.method && this.handlers.has(msg.method)) {
        for (const fn of this.handlers.get(msg.method)) fn(msg.params);
      }
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((res, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 35000);
      this.pending.set(id, { resolve: res, reject, timeout });
    });
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=' + scale,
    `--window-size=${width},${height}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let exitCode = 0;
try {
  const version = await getJson('/json/version');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const browser = new Cdp(ws);

  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const session = sessionId;
  const send = (m, p) => browser.send(m, p, session);

  const consoleErrors = [];
  const consoleWarnings = [];
  const exceptions = [];
  const failedRequests = [];

  browser.on('Runtime.consoleAPICalled', (p) => {
    const text = (p.args || [])
      .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
      .join(' ');
    if (p.type === 'error') consoleErrors.push(text);
    else if (p.type === 'warning') consoleWarnings.push(text);
  });
  browser.on('Runtime.exceptionThrown', (p) => {
    exceptions.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'unknown exception');
  });
  browser.on('Network.loadingFailed', (p) => {
    if (!p.canceled) failedRequests.push(`${p.errorText} (${p.type})`);
  });
  browser.on('Network.responseReceived', (p) => {
    if (p.response.status >= 400) failedRequests.push(`HTTP ${p.response.status} ${p.response.url}`);
  });

  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');

  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: scale,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  await send('Page.navigate', { url });
  await sleep(waitMs);

  if (evalScript) {
    const result = await send('Runtime.evaluate', {
      expression: evalScript,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      exceptions.push(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    } else if (result.result?.value !== undefined) {
      console.log('EVAL:', JSON.stringify(result.result.value));
    }
    await sleep(evalAfterWait);
  }

  if (out) {
    const target = resolve(out);
    mkdirSync(dirname(target), { recursive: true });
    const shotArgs = { format: 'png', captureBeyondViewport: fullPage };
    if (fullPage) {
      const metrics = await send('Page.getLayoutMetrics');
      const size = metrics.cssContentSize;
      shotArgs.clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
    }
    const { data } = await send('Page.captureScreenshot', shotArgs);
    writeFileSync(target, Buffer.from(data, 'base64'));
    console.log('SHOT:', target);
  }

  const report = { url, width, height, mobile };
  if (consoleErrors.length) report.consoleErrors = consoleErrors;
  if (consoleWarnings.length) report.consoleWarnings = consoleWarnings;
  if (exceptions.length) report.exceptions = exceptions;
  if (failedRequests.length) report.failedRequests = [...new Set(failedRequests)];
  console.log('REPORT:', JSON.stringify(report, null, 2));

  if (consoleErrors.length || exceptions.length || failedRequests.length) exitCode = 1;
} catch (err) {
  console.error('QA HARNESS ERROR:', err.message);
  exitCode = 2;
} finally {
  chrome.kill();
  await sleep(300);
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch {}
  process.exit(exitCode);
}
