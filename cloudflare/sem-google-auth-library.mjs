// Substitui google-auth-library no pacote da Cloudflare (ver tools/build-cloudflare.mjs).
export class OAuth2Client {
    constructor() { throw new Error('google-auth-library não roda na Cloudflare; use cloudflare/google-id-token.mjs'); }
}
