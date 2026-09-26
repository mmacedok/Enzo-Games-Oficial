// Confere o ID Token do Google Identity Services sem google-auth-library
// (que depende de coisas do Node). Mesmas checagens: assinatura pelas chaves
// públicas do Google, validade, emissor e audiência (GOOGLE_CLIENT_ID).
import { createRemoteJWKSet, jwtVerify } from 'jose';

const EMISSORES = ['https://accounts.google.com', 'accounts.google.com'];

export function criarVerificadorGoogle(clientId, chaves = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))) {
    return async (idToken) => {
        const { payload } = await jwtVerify(idToken, chaves, { issuer: EMISSORES, audience: clientId, algorithms: ['RS256'] });
        return payload;
    };
}
