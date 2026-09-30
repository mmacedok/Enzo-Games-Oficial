// ============================================================================
// Efeitos do terminal admin (só visual; não mexe na lógica de js/admin.js):
//   - chuva de código ao fundo (canvas)
//   - fita de telemetria sob a barra
//   - sequência de boot na primeira vez da sessão (clique ou tecla pula)
// Tudo desliga com prefers-reduced-motion.
// ============================================================================
(() => {
    'use strict';
    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

    // ---------------------------------------------------------------- chuva de código
    function chuva() {
        const canvas = document.createElement('canvas');
        canvas.id = 'chuva';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);
        const ctx = canvas.getContext('2d');
        const glifos = Array.from('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEF<>/\\|=+*:.');
        let tam = 16;
        let gotas = [];
        let largura = 0;
        let altura = 0;

        function medir() {
            const d = Math.min(window.devicePixelRatio || 1, 2);
            largura = window.innerWidth;
            altura = window.innerHeight;
            canvas.width = largura * d;
            canvas.height = altura * d;
            ctx.setTransform(d, 0, 0, d, 0, 0);
            tam = largura < 760 ? 14 : 16;
            ctx.font = `${tam}px monospace`;
            gotas = Array.from({ length: Math.ceil(largura / tam) }, () => -Math.random() * (altura / tam));
        }
        medir();
        window.addEventListener('resize', medir);

        let ultimo = 0;
        function quadro(agora) {
            requestAnimationFrame(quadro);
            if (agora - ultimo < 55) return; // ~18 quadros por segundo: visual de terminal, pouca CPU
            ultimo = agora;
            // apaga um pouco do que já está (deixa o rastro) sem pintar de preto
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, .14)';
            ctx.fillRect(0, 0, largura, altura);
            ctx.globalCompositeOperation = 'source-over';
            for (let i = 0; i < gotas.length; i++) {
                const y = gotas[i];
                if (y >= 0) {
                    const glifo = glifos[Math.floor(Math.random() * glifos.length)];
                    ctx.fillStyle = '#d4ffe0';
                    ctx.fillText(glifo, i * tam, y * tam);
                    ctx.fillStyle = '#39ff88';
                    ctx.fillText(glifos[Math.floor(Math.random() * glifos.length)], i * tam, (y - 1) * tam);
                }
                gotas[i] = y * tam > altura && Math.random() > 0.975 ? -Math.random() * 20 : y + 1;
            }
        }
        requestAnimationFrame(quadro);
    }

    // ---------------------------------------------------------------- fita de telemetria
    function fita() {
        const barra = document.querySelector('.barra');
        if (!barra) return;
        const faixa = document.createElement('div');
        faixa.className = 'fita';
        faixa.setAttribute('aria-hidden', 'true');
        const trilho = document.createElement('span');
        trilho.className = 'fita-trilho';
        const trecho = () => `<b>UPLINK</b> <em>SEGURO</em><i>◆</i>NÓ 0x${hex(4)}<i>◆</i><b>CIFRA</b> AES-256-GCM<i>◆</i>LATÊNCIA ${12 + Math.floor(Math.random() * 30)}ms<i>◆</i><b>TRACE</b> ${hex(10)}<i>◆</i>ACESSO <em>ROOT</em><i>◆</i>VIGILÂNCIA ATIVA<i>◆</i>PACOTES ${1000 + Math.floor(Math.random() * 8000)}/s<i>◆</i>`;
        trilho.innerHTML = trecho() + trecho() + trecho(); // conteúdo gerado aqui, sem dado de usuário
        faixa.appendChild(trilho);
        barra.after(faixa);
    }

    // ---------------------------------------------------------------- boot
    function boot() {
        if (calmo) return;
        try {
            if (sessionStorage.getItem('enzoBoot')) return;
            sessionStorage.setItem('enzoBoot', '1');
        } catch { /* sem sessionStorage: mostra de novo, sem problema */ }
        const tela = document.createElement('div');
        tela.id = 'boot';
        tela.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tela);
        const roteiro = [
            ['ENZO-OS 3.1 // kernel 6.6.0-macarronada', 60],
            ['montando /dev/torados ........................ ', 'OK'],
            ['carregando módulos: degustador, superkid, torado . ', 'OK'],
            ['handshake TLS 1.3 com enzo-net ............... ', 'OK'],
            ['procurando IPs intrusos ....................... ', 'OK'],
            ['censura do Cabo Côco .......................... ', 'NEGADO'],
            ['elevando privilégios para ROOT ............... ', 'OK'],
            ['', 120],
            ['>> ACESSO CONCEDIDO. BEM-VINDO, OPERADOR.', 200],
        ];
        const dica = '<span class="boot-dica">clique ou tecle para pular</span>';
        let i = 0;
        let acabou = false;
        function sair() {
            if (acabou) return;
            acabou = true;
            tela.classList.add('boot--sai');
            setTimeout(() => tela.remove(), 650);
            window.removeEventListener('keydown', sair);
        }
        tela.addEventListener('click', sair);
        window.addEventListener('keydown', sair);
        (function proxima() {
            if (acabou) return;
            if (i >= roteiro.length) { setTimeout(sair, 450); return; }
            const [texto, extra] = roteiro[i++];
            const linha = document.createElement('div');
            linha.textContent = texto;
            if (typeof extra === 'string') {
                const marca = document.createElement('span');
                marca.className = extra === 'OK' ? 'boot-ok' : 'boot-no';
                marca.textContent = `[ ${extra} ]`;
                linha.appendChild(marca);
            }
            tela.insertBefore(linha, tela.querySelector('.boot-dica'));
            setTimeout(proxima, typeof extra === 'number' ? extra : 170);
        })();
        tela.insertAdjacentHTML('beforeend', dica);
    }


    // ---------------------------------------------------------------- realce de texto (datas, IPs, ids)
    // Como um realçador de sintaxe: acha no texto da saída e pinta por significado (ver admin-hacker.css).
    const PADROES = /(\d{2}\/\d{2}\/\d{4}(?:,? \d{2}:\d{2})?)|(\b(?:\d{1,3}\.){3}\d{1,3}\b)|(\b[0-9a-f]{8}\b)/g;
    function realcar(raiz) {
        if (!raiz || raiz.nodeType !== 1) return;
        const andador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
            acceptNode(no) {
                const pai = no.parentElement;
                if (!pai || pai.closest('button, input, textarea, .sx')) return NodeFilter.FILTER_REJECT;
                PADROES.lastIndex = 0;
                return PADROES.test(no.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
        });
        const nos = [];
        while (andador.nextNode()) nos.push(andador.currentNode);
        for (const no of nos) {
            const texto = no.nodeValue;
            const frag = document.createDocumentFragment();
            let fim = 0;
            for (const m of texto.matchAll(PADROES)) {
                if (m[3] && !(/[a-f]/.test(m[3]) && /\d/.test(m[3]))) continue; // id de verdade tem letra e número
                if (m.index > fim) frag.append(texto.slice(fim, m.index));
                const span = document.createElement('span');
                span.className = `sx sx-${m[1] ? 'tempo' : m[2] ? 'ip' : 'id'}`;
                span.textContent = m[0];
                frag.append(span);
                fim = m.index + m[0].length;
            }
            if (fim === 0) continue;
            if (fim < texto.length) frag.append(texto.slice(fim));
            no.replaceWith(frag);
        }
    }
    function observarSaida() {
        const saida = document.getElementById('saida');
        if (!saida) return;
        let agendado = false;
        new MutationObserver(() => {
            if (agendado) return;
            agendado = true;
            requestAnimationFrame(() => { agendado = false; realcar(saida); });
        }).observe(saida, { childList: true, subtree: true });
        realcar(saida);
    }

    if (!calmo) chuva();
    observarSaida();
    fita();
    boot();
})();
