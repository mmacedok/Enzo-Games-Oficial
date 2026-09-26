// Verificador do Google usado na Cloudflare (cloudflare/google-id-token.mjs):
// assinatura, audiência, emissor e validade, com chaves geradas aqui.
const test = require('node:test');
const assert = require('node:assert/strict');

const CLIENTE = '123-teste.apps.googleusercontent.com';

async function preparar() {
    const jose = await import('jose');
    const { criarVerificadorGoogle } = await import('../cloudflare/google-id-token.mjs');
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
    const outro = await jose.generateKeyPair('RS256');
    const assinar = ({ aud = CLIENTE, iss = 'https://accounts.google.com', exp = '1h', chave = privateKey } = {}) => new jose.SignJWT({ email: 'a@b.com' })
        .setProtectedHeader({ alg: 'RS256' }).setSubject('g-1').setAudience(aud).setIssuer(iss)
        .setIssuedAt().setExpirationTime(exp).sign(chave);
    return { verificar: criarVerificadorGoogle(CLIENTE, async () => publicKey), assinar, outraChave: outro.privateKey };
}

test('aceita token do Google para este site', async () => {
    const { verificar, assinar } = await preparar();
    assert.equal((await verificar(await assinar())).sub, 'g-1');
    assert.equal((await verificar(await assinar({ iss: 'accounts.google.com' }))).sub, 'g-1');
});

test('recusa outra audiência, outro emissor, vencido ou outra chave', async () => {
    const { verificar, assinar, outraChave } = await preparar();
    await assert.rejects(verificar(await assinar({ aud: 'outro.apps.googleusercontent.com' })));
    await assert.rejects(verificar(await assinar({ iss: 'https://evil.example' })));
    await assert.rejects(verificar(await assinar({ exp: Math.floor(Date.now() / 1000) - 3600 })));
    await assert.rejects(verificar(await assinar({ chave: outraChave })));
});
