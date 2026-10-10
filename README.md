# Vue 3 + TypeScript + Vite

## Backend do bot Discord

O servidor Discord fica em `backend/discord/index.js`. O token do bot nunca deve ser colocado no Vue ou no `localStorage`.

1. Copie `.env.example` para `.env`.
2. Preencha `DISCORD_BOT_TOKEN` e `DISCORD_API_KEY`. `DISCORD_GUILD_ID` e `DISCORD_VOICE_CHANNEL_ID` são opcionais e funcionam apenas como destino padrão.
3. Instale as dependências com `npm install`.
4. Inicie a API com `npm run server`.

No Windows, `iniciar-bot.cmd` inicia o bot em uma janela minimizada e grava eventos em `logs/server.log`. O bot continua funcionando mesmo quando o frontend é fechado. A ficha envia uma presença periódica apenas quando há uma ficha aberta; nesse caso, a playlist pode controlar o bot. Sem essa presença, somente os comandos do Discord ficam disponíveis.

### Ficha na Vercel com bot local

Para controlar o bot no seu PC enquanto os amigos usam a ficha publicada, exponha somente a API local por um Cloudflare Tunnel:

```powershell
cloudflared tunnel --url http://127.0.0.1:3001
```

No projeto publicado na Vercel, configure estas variáveis:

```env
VITE_BOT_API_URL=https://sua-url-do-tunnel.trycloudflare.com
VITE_BOT_API_KEY=mesmo-valor-de-DISCORD_API_KEY
```

No `bot-desktop/.env`, use uma chave forte e informe a origem exata da ficha:

```env
DISCORD_API_KEY=mesmo-valor-de-VITE_BOT_API_KEY
FRONTEND_ORIGIN=https://seu-projeto.vercel.app
```

O bot precisa estar iniciado no seu PC antes de abrir a playlist. A URL temporária do `cloudflared --url` muda quando o túnel é reiniciado; para uma URL fixa, crie um túnel nomeado no painel da Cloudflare.

O bot registra `/play`, `/loop`, `/skip` e `/stop` em todos os servidores onde estiver instalado. A playlist lista os servidores e canais de voz disponíveis, e o endpoint `POST /api/discord/command` recebe uma ação musical, como `{ "acao": "play", "link": "https://...", "guildId": "...", "voiceChannelId": "..." }`.

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
