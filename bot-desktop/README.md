# Noite Eterna Bot Desktop

Aplicativo separado para conectar o bot de música ao Discord e expor a API local usada pela ficha.

## Executar no Windows

1. Execute `install.bat` pelo CMD ou dê duplo clique nele. Ele instala Python, FFmpeg, Cloudflare Tunnel e as dependências.
2. Abra o atalho **Noite Eterna Bot** criado na área de trabalho.
3. Informe o token do bot, salve e clique em **Iniciar bot**.

Para disponibilizar a API para a ficha na Vercel, execute `start-tunnel.bat` pelo CMD ou dê duplo clique nele depois de iniciar o bot. O script exibirá a URL HTTPS temporária do Cloudflare Tunnel.

Os arquivos `.bat` chamam o PowerShell internamente com uma política temporária apenas para executar a instalação. Não é necessário abrir o PowerShell ou alterar a política do Windows.

Se preferir executar diretamente pelo PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

O arquivo `.env` fica dentro desta pasta e não deve ser enviado ao repositório. O aplicativo usa `127.0.0.1` para aceitar comandos somente do computador do usuário.

Fechar a janela pelo botão `X` apenas a oculta na bandeja do Windows; o bot continua rodando. Para encerrar de verdade, clique com o botão direito no ícone da bandeja e escolha **Sair**.

É necessário ter o **FFmpeg** instalado e disponível no `PATH` para reproduzir áudio no Discord.

Ao trocar manualmente de música pela ficha, o áudio faz uma transição suave de 4 segundos, reduzindo o volume da faixa atual e aumentando gradualmente o volume da próxima.

Se o bot entrar no canal, mas não houver som, confira no log do aplicativo se aparece `ERRO no áudio/FFmpeg`. O bot precisa ter permissão para **Conectar** e **Falar** no canal de voz.

O instalador não envia credenciais para a Vercel. O token do Discord permanece no `.env` local. A URL do túnel e `VITE_BOT_API_KEY` ainda precisam ser cadastradas nas variáveis do projeto Vercel e exigem um novo deploy.

## Integração

A API mantém os endpoints `/api/discord/status`, `/api/discord/locations`, `/api/discord/music/status` e `/api/discord/command` usados pela ficha. A autenticação aceita o valor de `DISCORD_API_KEY` no header `Authorization` ou `Bearer`. Como o serviço escuta somente em `127.0.0.1`, chamadas locais sem header também são aceitas para permitir a integração com uma ficha hospedada.
