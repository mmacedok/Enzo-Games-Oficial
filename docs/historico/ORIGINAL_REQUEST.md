# Original User Request

## 2026-07-22T12:06:33-03:00

# Teamwork Project Prompt

O objetivo é corrigir e aperfeiçoar a censura do personagem Cabo Côco na página final do Capítulo 5 do leitor de HQs. Atualmente a máscara CSS (mask-image) não está aparecendo ou não está alinhada corretamente na imagem, possivelmente devido a problemas de cache, caminhos de arquivo quebrados por caracteres especiais ou posicionamento CSS impreciso.

Working directory: C:\Users\Henrique\.gemini\antigravity\scratch\comic-reader

## Requirements

### R1. Corrigir o carregamento da imagem de máscara
A silhueta (Cabo Côco.png) deve ser carregada corretamente pelo CSS usando `mask-image`, garantindo que o caminho do arquivo suporte os espaços e caracteres especiais (como o 'ô').

### R2. Alinhamento da máscara
A máscara CSS deve estar posicionada e redimensionada de forma a cobrir perfeitamente o corpo do Cabo Côco desenhado na imagem do Capítulo 5 (CAP5 PAG5.png).

## Acceptance Criteria

### Visibilidade e Alinhamento
- [ ] A tarja amarela e preta ("CONTEÚDO BANIDO") deve aparecer cobrindo exatamente o Cabo Côco na última página do Cap 5.
- [ ] O restante da página da HQ deve continuar 100% visível, sem ser coberto.
- [ ] O console do navegador não deve apresentar erros 404 (Not Found) ao tentar carregar a imagem da máscara.
