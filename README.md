# Vue 3 + TypeScript + Vite

## Ficha e aplicativo auxiliar

A ficha web fica nesta pasta. O bot de música e a configuração do Discord ficam
no aplicativo auxiliar, em `app-auxiliar\bot-desktop`. O token do bot nunca é
armazenado no Vue ou no `localStorage`.

### Desenvolvimento local

Para testar a ficha e o bot juntos nesta cópia do projeto, execute
`start-dev.bat`. O script abre a ficha e o bot em janelas separadas, sem
reinstalar dependências a cada execução.

Na primeira vez, prepare o ambiente Python do bot executando
`bot-desktop\setup-dev.bat`. Esse passo cria `bot-desktop\.venv` e instala as
dependências uma única vez. Depois, basta executar `start-dev.bat` novamente.

O bot usa o arquivo `bot-desktop\.env` desta cópia e a ficha acessa a API local
em `http://127.0.0.1:3001`.

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

No `app-auxiliar/bot-desktop/.env`, use uma chave forte e informe a origem exata da ficha:

```env
DISCORD_API_KEY=mesmo-valor-de-VITE_BOT_API_KEY
FRONTEND_ORIGIN=https://seu-projeto.vercel.app
```

O bot precisa estar iniciado no seu PC antes de abrir a playlist. A URL temporária do `cloudflared --url` muda quando o túnel é reiniciado; para uma URL fixa, crie um túnel nomeado no painel da Cloudflare.

A instalação local usa subpastas organizadas: `app` contém o código, `dados`
contém configurações locais, `logs` contém registros e `cache` contém arquivos
temporários.

O bot registra `/play`, `/loop`, `/skip` e `/stop` em todos os servidores onde estiver instalado. A playlist lista os servidores e canais de voz disponíveis, e o endpoint `POST /api/discord/command` recebe uma ação musical, como `{ "acao": "play", "link": "https://...", "guildId": "...", "voiceChannelId": "..." }`.

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
