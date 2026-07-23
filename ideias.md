Quick wins (baixo esforço, alto valor)

- Persistir áudio em disco — resolve ressalva #1. Salva blob via IPC em userData, reload mantém playback. Também destrava export.
- Offset de timestamp acumulado — resolve ressalva #2. Cada chunk soma duração anterior.
- Export/download — .md, .txt, .srt/.vtt (legenda), .json. Download do áudio.
- Copiar summary individual (já tem copy transcript).
- Word/char count + duração no header do meeting.

Transcrição / IA

- Transcrição ao vivo (streaming) — texto aparece enquanto grava, não só no stop.
- Chat com o meeting ("pergunta ao transcript") — já tem chatFast/chatThink, falta UI. RAG simples sobre o transcript.
- Auto-título + auto-tags — Gemini gera título/tags do conteúdo em vez de "Untitled".
- Action items extraídos como lista com checkbox (estado done/undone), separado do summary markdown.
- Tradução do transcript/summary p/ outro idioma.
- Timestamps clicáveis — clicar linha do transcript → seek no player.

Captura

- System audio / tab audio — gravar áudio do outro lado da call (Zoom/Meet), não só mic. getDesktopSources já exposto no preload, subutilizado.
- Upload de arquivo — importar mp3/mp4/wav existente → transcrever. Não depende de gravar ao vivo.
- Device picker — escolher qual microfone.

Organização

- Busca full-text dentro de transcripts (não só título).
- Favoritar / pin meetings.
- Trash / soft-delete com undo (sonner já instalado).
- Ordenação (data, duração, nome) + filtro por tag.

Overlay pill

- Persistir posição arrastada (ressalva atual reseta ao centro).
- Timer visível na pill.
- Mini transcript ao vivo na pill expandida.

Polish

- Global shortcut (registrar via Electron globalShortcut) — iniciar gravação com app minimizado.
- Tray icon — controlar sem abrir janela.
- Onboarding — primeiro uso pede API key + permissão mic.

Recomendo primeiro: persistir áudio em disco + timestamp offset (fecham ressalvas conhecidas) e upload de arquivo (destrava uso sem gravar ao vivo, alto ROI).

Quer que eu implemente algum? Qual?

Antes das ideias novas, dois pontos: pelo resumo, faltam duas coisas que são o coração da proposta original — vale priorizar antes de features novas.

**1. Captura de áudio do sistema (o outro lado da call).** Hoje você só pega o microfone. Pra um _meeting_ transcriber, o áudio de quem está do outro lado é metade do conteúdo. Sem isso, ele transcreve só você. Essa é, de longe, a de maior impacto — mixa mic + loopback do sistema em dois canais (já te dá "eu vs. os outros" de graça pra diarização).

**2. Citação de segmentos no resumo (o "81" da imagem 2).** Era o pedido original e não aparece na lista. Faz cada afirmação do summary apontar pro id do turno da transcrição → clicar no badge rola até o trecho, destaca, e (se o áudio persistir) toca aquele momento. É o que separa isso de "só mais um transcritor".

Essas duas dependem de resolver duas ressalvas que você já mapeou: **persistir áudio em disco** (não em memória) e **acumular o offset de timestamp** entre chunks. Vale fazer esses dois fixes primeiro porque destravam tudo abaixo.

Depois disso, as que eu faria em ordem de valor:

**Alto valor**

- **Chat com a reunião** — "o que decidimos sobre X?" respondido pelo Gemini com citação do segmento. Você já tem transcript + Gemini no main; é quase de graça e muito útil.
- **Transcrição ao vivo durante a gravação** — mostrar o texto aparecendo em tempo real (streaming), igual Notion, em vez de só depois do stop. Lift maior, mas é o maior "wow".
- **Capítulos / tópicos automáticos** — segmentar a reunião em temas com timestamp (o "Temas discutidos" da sua imagem) e permitir pular pro tópico. Sai fácil do transcript que você já tem.

**Ganhos rápidos (baixo esforço)**

- **Export real pra arquivo** — PDF/DOCX/MD, não só copiar. Você já monta o Markdown.
- **Compartilhar (Copy link / Email / Slack)** — os botões da sua imagem 1. Slack via webhook é trivial e fecha o loop "reunião → time".
- **Talk-time por participante** — % de quem falou quanto, direto dos turnos. Analytics barato e vistoso.
- **Action items como tarefas de verdade** — checkbox, marcar concluído, agregados numa view "todos os pendentes" entre reuniões.
- **Bookmark ao vivo** — hotkey durante a gravação pra marcar "isso é importante"; vira ponto de pulo depois.

**Se sobrar fôlego**

- **Busca global semântica** entre todas as reuniões (embeddings), não só a busca por reunião que já existe.
- **Google Calendar** — puxar título/participantes e sugerir auto-gravar quando cai numa reunião agendada.
- **Aviso de consentimento + redação de PII** — não é só "nice", é LGPD. Gravar terceiro sem consentimento tem risco real; um banner no início já ajuda muito.
- **Tradução** do transcript/summary (você já é multi-idioma).

**A que eu NÃO faria agora:** biometria de voz pra diarização. É caro, frágil, e o seu approach por conteúdo/prompt já resolve 80% dos casos. Não vale o custo agora.

Se quiser, eu pego **uma** dessas (sugiro citação de segmentos ou chat-com-a-reunião) e escrevo o prompt pro Claude Code implementar ponta a ponta. Qual você quer atacar primeiro?
