// ============================================================================
// Validadores e expressões usadas por mais de uma rota da API (uma cópia só).
// ============================================================================
const { HttpError } = require('./http.js');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ID = /^[a-z0-9-]{1,64}$/;
// Invisíveis e de controle (inclui os que invertem a direção do texto).
const CONTROLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
// O mesmo, menos a quebra de linha (para textos com mais de uma linha).
const CONTROLE_TEXTO = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
const LINK = /(https?:|www\.|\.(com|net|org|br|io|gg|xyz|me)\b)/i;

/** Id em formato UUID, ou o erro 404 do recurso. */
function exigirUuid(id, mensagem = 'não encontrado') {
    if (!UUID.test(id)) throw new HttpError(404, mensagem);
    return id;
}

module.exports = { UUID, ID, CONTROLE, CONTROLE_TEXTO, LINK, exigirUuid };
