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
     */
    function create(opcoes = {}) {
        const {
            titulo = 'Jogo',
            descricaoCanvas = 'Tela do jogo',
            largura = 360,
            altura = 640,
        } = opcoes;

        const dialog = document.createElement('dialog');
        dialog.className = 'game-dialog';
        dialog.setAttribute('aria-label', titulo);
        dialog.innerHTML = `
            <button type="button" class="btn btn--small game-close" aria-label="Fechar o jogo">Fechar ×</button>
            <canvas class="game-canvas" tabindex="0" role="img"></canvas>`;
        document.body.appendChild(dialog);

        const canvas = dialog.querySelector('canvas');
        canvas.setAttribute('aria-label', descricaoCanvas);
        const ctx = canvas.getContext('2d');

        let escala = 1;
        function ajustarTamanho() {
            const margem = 16;
            const livreW = innerWidth - margem * 2;
            const livreH = innerHeight - margem * 2 - 56; // espaço do botão Fechar
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

        return {
            dialog,
            canvas,
            ctx,
            abrir,
            fechar,
            aoFechar,
            get aberta() {
                return dialog.open;
            },
        };
    }

    window.GameDialog = { create };
})();
