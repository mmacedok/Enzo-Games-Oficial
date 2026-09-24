// ============================================================================
// Esquema do banco (Postgres: Neon/Netlify DB em produção, PGlite no
// computador e nos testes). Tempos em milissegundos (Date.now()).
// Um comando por item: o driver HTTP do Neon roda um de cada vez.
// Só crie coisas com IF NOT EXISTS: o esquema roda a cada início do servidor.
// ============================================================================
module.exports = [
    `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT NOT NULL DEFAULT 'player',
        created_at BIGINT NOT NULL,
        last_login_at BIGINT NOT NULL
    )`,
    // id = HMAC-SHA256 do token do cookie: vazar o banco não entrega sessões.
    `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
    // verified = passou pelo anti-cheat. Recordes trazidos do localStorage
    // (convidado) ficam com verified = false: contam no perfil, não no ranking.
    `CREATE TABLE IF NOT EXISTS game_scores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        duration_ms BIGINT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT TRUE,
        client_metadata TEXT,
        created_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_game_leaderboard ON game_scores(game_id, verified, score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_user_best_score ON game_scores(user_id, game_id, score DESC)',
    `CREATE TABLE IF NOT EXISTS game_runs (
        run_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id TEXT NOT NULL,
        started_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_game_runs_user ON game_runs(user_id, started_at)',
    `CREATE TABLE IF NOT EXISTS reading_progress (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comic_id TEXT NOT NULL,
        chapter_id TEXT NOT NULL,
        last_page INTEGER NOT NULL DEFAULT 0,
        zoom_level REAL NOT NULL DEFAULT 1.0,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, comic_id, chapter_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL,
        unlocked_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, achievement_id)
    )`,
];
