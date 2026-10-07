// ============================================================================
// Cargos da equipe. Quem está em ADMIN_EMAILS é o "dono" (sempre admin, ninguém muda). Os demais cargos ficam em
// users.cargo e o dono muda pelo terminal:
//   admin      tudo do terminal
//   moderador  só o histórico de lançamentos e o agendamento/publicação dos capítulos, e lê capítulos escondidos
//              (?previa=1) sem dar nem receber acesso antecipado
// Sem dependências, para o api/auth.js e o api/admin.js usarem sem importar um ao outro.
// ============================================================================
const CARGOS = ['moderador', 'admin'];

const emailDe = (usuario) => String(usuario?.email || '').toLowerCase();
const ehDono = (config, usuario) => Boolean(usuario?.email) && config.admins.has(emailDe(usuario));
const ehAdmin = (config, usuario) => ehDono(config, usuario) || usuario?.cargo === 'admin';
const ehModerador = (config, usuario) => !ehAdmin(config, usuario) && usuario?.cargo === 'moderador';
/** 'dono' | 'admin' | 'moderador' | null */
const cargoDe = (config, usuario) => (ehDono(config, usuario) ? 'dono' : ehAdmin(config, usuario) ? 'admin' : ehModerador(config, usuario) ? 'moderador' : null);

module.exports = { CARGOS, ehDono, ehAdmin, ehModerador, cargoDe };
