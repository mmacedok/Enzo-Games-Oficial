# Plano de Implementação: Google OAuth, Sessões Seguras & Sistema de Recordes (Leaderboards)

Status: **Planejado / Especificação Completa**  
Data: 24/09/2026  
Módulos: `server.js`, `js/flappy.js`, `js/ronda.js`, `js/reader.core.js`, `js/characters.js`, novo `js/auth-widget.js`

---

## 1. Visão Geral e Objetivos

Transformar o site atual (catálogo estático + leitor com `localStorage`) em uma plataforma com:
1. **Autenticação com Google (OAuth 2.0 / OpenID Connect)**: login com um clique via Google Identity Services (GIS).
2. **Sessões Blindadas (Zero-Hole)**: cookies `HttpOnly`, `SameSite=Lax`, sem tokens expostos em `localStorage`.
3. **Persistência de Recordes & Leaderboards Globais**: ranking para *Flappy Enzo* e *Ronda Noturna*, com validação matemática anti-cheat.
4. **Sincronização de Progresso do Leitor & Conquistas**: último gibi e página lidos salvos na nuvem, conquistas desbloqueadas mantidas entre dispositivos.
5. **Migração Transparente de Convidados**: jogadores que já possuem recordes no `localStorage` não perdem seus dados ao fazer login.

---

## 2. O que Depende do Desenvolvedor (Google Cloud Console)

Antes da implementação do código, são necessárias as credenciais do Google:

1. **Acessar**: [Google Cloud Console](https://console.cloud.google.com/) no projeto `Enzo Games`.
2. **Tela de Consentimento OAuth**: Tipo **Externo**, app `Enzo Games`, escopos básicos (`openid`, `profile`, `email`).
3. **Credencial**: Criar **ID do cliente OAuth** do tipo **Aplicativo da Web**:
   - **Origens JavaScript autorizadas**:
     - `http://localhost:3000`
     - `https://enzogames.com.br` (produção)
   - **URIs de redirecionamento autorizados**:
     - `http://localhost:3000/api/auth/google/callback`
4. **Variáveis de Ambiente (`.env`)**:
   ```env
   PORT=3000
   NODE_ENV=development
   GOOGLE_CLIENT_ID="xxxxxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxx"
   SESSION_SECRET="chave-criptografica-aleatoria-64-bytes"
   ```

---

## 3. Banco de Dados & Modelagem (`data/schema.sql`)

Utilização de **SQLite com modo WAL** (`data/users.db`) através de `better-sqlite3`. Alta performance, arquivo local único, backup trivial e zero custo de infraestrutura externa.

```sql
-- 1. Usuários
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                 -- UUIDv4
    google_id TEXT UNIQUE NOT NULL,      -- 'sub' do Google
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'player',          -- 'player', 'admin', 'banned'
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL
);

-- 2. Sessões Ativas (Cookies HttpOnly)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                 -- Hash SHA-256 de token de 32 bytes
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 3. Histórico e Recordes de Jogos
CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,               -- 'flappy-enzo' | 'ronda-noturna'
    score INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    client_metadata TEXT,                -- JSON (talheres, metros, tiros)
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_leaderboard ON game_scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_user_best_score ON game_scores(user_id, game_id, score DESC);

-- 4. Partidas em Andamento (Tokens Anti-Cheat)
CREATE TABLE IF NOT EXISTS game_runs (
    run_token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

-- 5. Progresso de Leitura
CREATE TABLE IF NOT EXISTS reading_progress (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comic_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    last_page INTEGER DEFAULT 0,
    zoom_level REAL DEFAULT 1.0,
    completed INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, comic_id, chapter_id)
);

-- 6. Conquistas & Desbloqueios
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,         -- 'macarronada', 'cabo-coco', 'ronda-100'
    unlocked_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);
```

---

## 4. Segurança & Motor Anti-Cheat

### 4.1. Proteção de Sessão
- O navegador recebe apenas um cookie de sessão assinado (`sid`).
- Flags do Cookie: `HttpOnly = true`, `SameSite = 'Lax'`, `Secure = (NODE_ENV === 'production')`.
- O cliente nunca tem acesso a chaves JWT ou dados sensíveis via JavaScript.

### 4.2. Anti-Cheat Matemático (Flappy & Ronda)
1. **Handshake obrigatório**: Quando o jogo começa, chama `POST /api/games/session/start`. O servidor cria um `run_token` único associado ao `started_at = Date.now()`.
2. **Submissão com validação física**: No Game Over, chama `POST /api/games/session/submit` enviando `{ runToken, score, metadata }`.
3. **Cálculo de Teto Teórico**:
   - $\Delta t = \text{Date.now()} - \text{started\_at}$.
   - **Flappy Enzo**: Espaçamento mínimo de talheres = $240\text{ px}$, velocidade constante $\approx 220\text{ px/s}$. Tempo mínimo por ponto $\approx 1{,}05\text{ s}$. Se $\text{score} / (\Delta t / 1000) > 1{,}05$, pontuação rejeitada.
   - **Ronda Noturna**: Velocidade máxima de corrida = $520\text{ px/s}$. Bônus por segundo limitado pela cadência de tiro (6 tiros/s). Se a pontuação violar o teto teórico do motor físico em `ronda-core.js`, a submissão é bloqueada.
4. **Token de uso único**: O `run_token` é consumido e destruído imediatamente.

---

## 5. Rotas do Backend (Express)

### Autenticação (`/api/auth/*`)
- `POST /api/auth/google`:
  - Recebe o ID Token (JWT) do Google Identity Services.
  - Valida a assinatura com `google-auth-library`.
  - Insere ou atualiza o usuário no banco de dados.
  - Gera token criptográfico de 32 bytes, armazena o hash em `sessions` e define o cookie `sid`.
- `GET /api/auth/me`: Retorna dados do usuário ativo ou `{ loggedIn: false }`.
- `POST /api/auth/logout`: Revoga a sessão no banco e remove o cookie.

### Jogos & Ranking (`/api/games/*`)
- `POST /api/games/session/start`: Inicia partida monitorada.
- `POST /api/games/session/submit`: Valida e grava pontuação.
- `GET /api/games/leaderboard/:gameId`: Retorna Top 50 geral + posição do usuário logado.

### Progresso & Conquistas (`/api/user/*`)
- `GET /api/user/sync`: Retorna estado completo (progresso de leitura, conquistas, recordes).
- `POST /api/user/sync-guest`: Migra recordes locais do `localStorage` para a conta Google no primeiro login.
- `POST /api/reader/progress`: Atualiza o ponto de leitura de um gibi.
- `POST /api/user/achievement`: Salva conquista desbloqueada.

---

## 6. Frontend & Experiência do Usuário (UI/UX)

1. **Header Widget (`js/auth-widget.js`)**:
   - Integrado no cabeçalho de todas as páginas (`index.html`, `degustador.html`, `zezoverso.html`, `personagens.html`, `reader.html`).
   - Se deslogado: botão estilizado no tema HQ `[ 🔑 Entrar com Google ]`.
   - Se logado: Avatar oficial Google + Primeiro Nome com menu dropdown (Meus Recordes, Ranking, Sair).
2. **Leaderboard Modal nos Jogos**:
   - Botão **"🏆 Ranking Global"** na tela de início e de Game Over de Flappy Enzo e Ronda Noturna.
   - Exibe pódio (Top 3) com badges estilizados e linha destacada da posição do jogador atual.
3. **Leitor Conectado**:
   - Restauração automática de capítulo e página onde parou em qualquer dispositivo.
   - Cabo Côco desbloqueado permanece liberado para sempre no perfil do usuário.

---

## 7. Roteiro de Execução em Fases

| Fase | Descrição | Arquivos Envolvidos |
|---|---|---|
| **Fase 1** | Banco de dados SQLite, migrações e schema | `data/db.js`, `data/schema.sql`, `package.json` (`better-sqlite3`) |
| **Fase 2** | Autenticação Google e rotas de sessão | `routes/auth.js`, `middleware/auth.js`, `server.js` |
| **Fase 3** | Widget visual de login no cabeçalho | `js/auth-widget.js`, `css/style.css`, HTMLs |
| **Fase 4** | Backend de Scores, anti-cheat e Leaderboards | `routes/games.js`, `services/anti-cheat.js` |
| **Fase 5** | Conexão dos jogos (Flappy & Ronda) e modal de ranking | `js/flappy.js`, `js/ronda.js`, `js/game-dialog.js` |
| **Fase 6** | Sincronização do leitor, conquistas e migração de convidados | `js/reader.core.js`, `js/characters.js`, `routes/user.js` |
| **Fase 7** | Testes automatizados e auditoria | `test/auth.test.js`, `test/scores.test.js`, `tools/qa-site.js` |
