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
    // Fala do balão na Ficha do Leitor (pública; null = fala sorteada do Enzo).
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS fala TEXT',
    'CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at)',
    // id = HMAC-SHA256 do token do cookie: vazar o banco não entrega sessões.
    `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
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
    'CREATE INDEX IF NOT EXISTS idx_game_scores_created ON game_scores(created_at DESC)',
    `CREATE TABLE IF NOT EXISTS game_runs (
        run_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id TEXT NOT NULL,
        started_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_game_runs_user ON game_runs(user_id, started_at)',
    'CREATE INDEX IF NOT EXISTS idx_game_runs_expires ON game_runs(expires_at)',
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
    // Histórico do painel admin (quem mexeu em quê).
    `CREATE TABLE IF NOT EXISTS admin_log (
        id TEXT PRIMARY KEY,
        admin_id TEXT,
        acao TEXT NOT NULL,
        alvo TEXT,
        detalhe TEXT,
        created_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_log(created_at)',
    // Cartas dos Leitores (api/comentarios.js). censuras = JSON [[inicio, fim], ...];
    // apagar é "soft delete" (apagado_em), para o histórico saber o que saiu.
    `CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comic_id TEXT NOT NULL,
        chapter_id TEXT NOT NULL,
        texto TEXT NOT NULL,
        censuras TEXT,
        apagado_em BIGINT,
        apagado_por TEXT,
        created_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_comments_capitulo ON comments(comic_id, chapter_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_comments_usuario ON comments(user_id, created_at)',
    // Baralho Enzo (api/baralho.js). Sem transações (o driver do Neon roda um
    // comando por vez): cada operação com dinheiro é UM comando (CTE), com a
    // condição de saldo no próprio UPDATE.
    `CREATE TABLE IF NOT EXISTS carteira (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        creditos BIGINT NOT NULL DEFAULT 0 CHECK (creditos >= 0),
        po BIGINT NOT NULL DEFAULT 0 CHECK (po >= 0),
        boas_vindas BOOLEAN NOT NULL DEFAULT FALSE,
        created_at BIGINT NOT NULL
    )`,
    // Todo ganho e gasto: moeda = 'creditos' | 'po'; motivo = partida, compra, po, admin.
    `CREATE TABLE IF NOT EXISTS extrato (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        moeda TEXT NOT NULL,
        delta BIGINT NOT NULL,
        motivo TEXT NOT NULL,
        ref TEXT,
        created_at BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_extrato_usuario ON extrato(user_id, created_at)',
    // Inventário = pacotes com aberto_em IS NULL. resultado = JSON com os ids das cartas.
    `CREATE TABLE IF NOT EXISTS pacotes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        origem TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        aberto_em BIGINT,
        resultado TEXT
    )`,
    'CREATE INDEX IF NOT EXISTS idx_pacotes_usuario ON pacotes(user_id, aberto_em)',
    `CREATE TABLE IF NOT EXISTS colecao (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL,
        qtd INTEGER NOT NULL CHECK (qtd >= 1),
        primeira_em BIGINT NOT NULL,
        PRIMARY KEY (user_id, card_id)
    )`,
    // ---- Batalha dos Torados online (api/tcg.js) ----------------------------
    // Sala com código: some em 15 min se ninguém entrar.
    `CREATE TABLE IF NOT EXISTS tcg_salas (
        codigo TEXT PRIMARY KEY,
        criador TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deck TEXT NOT NULL,
        criado_em BIGINT NOT NULL,
        expira_em BIGINT NOT NULL,
        partida_id TEXT
    )`,
    'CREATE INDEX IF NOT EXISTS idx_tcg_salas_criador ON tcg_salas(criador)',
    // A limpeza apaga por expira_em (api/tcg.js) e isso roda a cada sala/partida criada.
    'CREATE INDEX IF NOT EXISTS idx_tcg_salas_expira ON tcg_salas(expira_em)',
    // estado = partida completa, com a sorte: NUNCA sai do servidor (o navegador recebe visaoDe).
    // versao sobe a cada jogada e trava duas jogadas ao mesmo tempo (UPDATE ... WHERE versao = ?).
    `CREATE TABLE IF NOT EXISTS tcg_partidas (
        id TEXT PRIMARY KEY,
        jogador_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        jogador_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deck_a TEXT NOT NULL,
        deck_b TEXT NOT NULL,
        estado TEXT NOT NULL,
        versao INTEGER NOT NULL DEFAULT 0,
        regras INTEGER NOT NULL,
        prazo BIGINT NOT NULL,
        estouros_a INTEGER NOT NULL DEFAULT 0,
        estouros_b INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'jogando',
        vencedor INTEGER,
        motivo TEXT,
        criado_em BIGINT NOT NULL,
        atualizado_em BIGINT NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_tcg_partidas_a ON tcg_partidas(jogador_a, status)',
    'CREATE INDEX IF NOT EXISTS idx_tcg_partidas_b ON tcg_partidas(jogador_b, status)',
    'CREATE INDEX IF NOT EXISTS idx_tcg_partidas_criado ON tcg_partidas(criado_em)',
    // A limpeza apaga as partidas terminadas por atualizado_em (api/tcg.js, limpar()).
    'CREATE INDEX IF NOT EXISTS idx_tcg_partidas_atualizado ON tcg_partidas(atualizado_em)',
    // n = versão da partida depois da jogada; eventos completos (filtrados por jogador na leitura).
    `CREATE TABLE IF NOT EXISTS tcg_jogadas (
        partida_id TEXT NOT NULL REFERENCES tcg_partidas(id) ON DELETE CASCADE,
        n INTEGER NOT NULL,
        jogador INTEGER NOT NULL,
        jogada TEXT NOT NULL,
        eventos TEXT NOT NULL,
        automatica BOOLEAN NOT NULL DEFAULT FALSE,
        criado_em BIGINT NOT NULL,
        PRIMARY KEY (partida_id, n)
    )`,
    // Fica para sempre (pequeno): a partida e as jogadas somem 7 dias depois do fim.
    `CREATE TABLE IF NOT EXISTS tcg_resultados (
        partida_id TEXT PRIMARY KEY,
        vencedor TEXT,
        perdedor TEXT,
        decks TEXT NOT NULL,
        turnos INTEGER NOT NULL,
        motivo TEXT,
        fim_em BIGINT NOT NULL
    )`,
];
