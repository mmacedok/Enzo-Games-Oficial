// ============================================================================
// Janela de jogo (<dialog>) compartilhada entre os easter eggs do site.
// Cria o modal em tela cheia com botão Fechar e canvas redimensionado à tela.
// ============================================================================
(() => {
    'use strict';

    /**
     * Cria e monta uma janela de jogo em tela cheia com canvas adaptável.
     * @param {Object} opcoes
     * @param {string} opcoes.titulo
     * @param {string} opcoes.descricaoCanvas
     * @param {number} opcoes.largura
     * @param {number} opcoes.altura
     * @param {number|function} [opcoes.espacoExtra] px reservados abaixo do canvas (ex.: botões de toque); pode ser uma função
     * @param {string} [opcoes.ranking] id do jogo no ranking global (mostra o botão 🏆 Ranking)
     */
    function create(opcoes = {}) {
        const {
            titulo = 'Jogo',
            descricaoCanvas = 'Tela do jogo',
            largura = 360,
            altura = 640,
            espacoExtra = 0,
            ranking = null,
        } = opcoes;

        const dialog = document.createElement('dialog');
        dialog.className = 'game-dialog';
        dialog.setAttribute('aria-label', titulo);
        dialog.innerHTML = `
            <div class="game-topo">
                <p class="game-aviso" aria-live="polite"></p>
                <button type="button" class="btn btn--small game-ranking" hidden><span>Ranking</span></button>
                <button type="button" class="btn btn--small game-close" aria-label="Fechar o jogo">Fechar ×</button>
            </div>
            <canvas class="game-canvas" tabindex="0" role="img"></canvas>`;
        document.body.appendChild(dialog);

        // Ranking global (js/auth-widget.js): só aparece se a API do site respondeu.
        const botaoRanking = dialog.querySelector('.game-ranking');
        botaoRanking.prepend(window.siteIcon?.('trofeu', '🏆') ?? '🏆');
        const aviso = dialog.querySelector('.game-aviso');
        let rankingPermitido = true;
        const atualizarRanking = () => {
            botaoRanking.hidden = !(ranking && window.EnzoConta?.disponivel && rankingPermitido);
        };
        window.EnzoConta?.pronto.then(atualizarRanking);
        botaoRanking.addEventListener('click', () => window.EnzoConta?.abrirRanking(ranking));

        const canvas = dialog.querySelector('canvas');
        canvas.setAttribute('aria-label', descricaoCanvas);
        const ctx = canvas.getContext('2d');

        let escala = 1;
        function ajustarTamanho() {
            const margem = 16;
            const livreW = innerWidth - margem * 2;
            const extra = typeof espacoExtra === 'function' ? espacoExtra() : espacoExtra;
            const livreH = innerHeight - margem * 2 - 56 - extra; // botão Fechar e extras
            escala = Math.max(0.3, Math.min(livreW / largura, livreH / altura));
            const dpr = Math.min(devicePixelRatio || 1, 3);
            canvas.style.width = `${Math.round(largura * escala)}px`;
            canvas.style.height = `${Math.round(altura * escala)}px`;
            canvas.width = Math.round(largura * escala * dpr);
            canvas.height = Math.round(altura * escala * dpr);
            ctx.setTransform(escala * dpr, 0, 0, escala * dpr, 0, 0);
            ctx.imageSmoothingQuality = 'high';
        }

        const callbacksFechar = [];
        function aoFechar(fn) {
            if (typeof fn === 'function') callbacksFechar.push(fn);
        }

        dialog.querySelector('.game-close').addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => {
            document.body.classList.remove('game-dialog-open');
            for (const fn of callbacksFechar) fn();
        });
        window.addEventListener('resize', () => {
            if (dialog.open) ajustarTamanho();
        });

        function abrir() {
            if (dialog.open) return;
            ajustarTamanho();
            document.body.classList.add('game-dialog-open');
            dialog.showModal();
            canvas.focus({ preventScroll: true });
        }

        function fechar() {
            dialog.close();
        }

        /** O jogo esconde o botão de ranking durante a partida (só aparece no início e no fim). */
        function mostrarRanking(visivel) {
            if (rankingPermitido === visivel) return;
            rankingPermitido = visivel;
            atualizarRanking();
        }

        /** Mensagem curta no topo da janela (ex.: posição no ranking). Vazio apaga. */
        function avisar(texto = '') {
            if (aviso.textContent !== texto) aviso.textContent = texto;
        }

        // Partida monitorada para o ranking (só com login; convidado joga igual, sem enviar).
        let partida = null;
        let rodada = 0;
        /** Chame quando a partida começa de fato (primeiro toque). */
        function iniciarPartida() {
            rodada++;
            avisar('');
            partida = ranking ? window.EnzoConta?.iniciarPartida(ranking) ?? null : null;
        }
        /** Chame no fim da partida: envia o placar e mostra a posição no topo da janela. */
        function enviarPartida(pontos, metadata = {}) {
            const conta = window.EnzoConta;
            const enviada = partida;
            const minha = rodada;
            partida = null;
            if (!enviada || pontos <= 0) {
                const convidado = conta?.loginAtivo && !conta.usuario;
                avisar(convidado && pontos > 0 ? 'Entre com Google (🔑 Entrar, no topo do site) para ir ao ranking.' : '');
                return;
            }
            avisar('Salvando no ranking...');
            conta.enviarPartida(enviada, pontos, metadata).then((r) => {
                if (minha !== rodada) return;   // já começou outra partida
                if (!r) avisar('');
                else if (r.accepted) {
                    const texto = r.position ? `🏆 ${r.position}º lugar no ranking${r.newRecord ? ' · novo recorde!' : ''}` : 'Placar salvo!';
                    // Pontos viram créditos do Baralho Enzo (api/baralho.js).
                    avisar(r.credits > 0 ? `${texto} · +${r.credits.toLocaleString('pt-BR')} créditos` : texto);
                }
                else avisar(`Não entrou no ranking: ${r.error}`);
            });
        }

        return {
            dialog,
            canvas,
            ctx,
            abrir,
            fechar,
            aoFechar,
            mostrarRanking,
            avisar,
            iniciarPartida,
            enviarPartida,
            get aberta() {
                return dialog.open;
            },
        };
    }

    window.GameDialog = { create };
})();
