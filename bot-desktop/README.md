# Noite Eterna Bot Desktop

Aplicativo separado para conectar o bot de música ao Discord e expor a API local usada pela ficha.

## Executar no Windows

1. Execute `Noite-Eterna-Instalador.exe` com duplo clique. Ele exibirá uma janela para escolher a pasta-base e criará dentro dela a pasta `Noite-Eterna-Ficha` antes de baixar os arquivos.
2. Abra o atalho **Noite Eterna Bot** criado na área de trabalho.
3. Informe o token do bot, salve e clique em **Iniciar bot**.

A instalação publicada fica organizada assim:

```text
Noite-Eterna-Ficha\
├── noite-eterna-ficha\  código da ficha web
├── app-auxiliar\        bot, Python, logs e cache
├── Noite-Eterna.exe     iniciador do programa
├── Noite-Eterna.ico     ícone
└── Desinstalar-Noite-Eterna.exe
```

O instalador `.exe` não depende de PowerShell, `install.bat` ou `install.ps1`.
O túnel deve ser iniciado pelo aplicativo instalado, quando essa integração
estiver configurada.

O arquivo `.env` fica dentro desta pasta e não deve ser enviado ao repositório. O aplicativo usa `127.0.0.1` para aceitar comandos somente do computador do usuário.

Fechar a janela pelo botão `X` apenas a oculta na bandeja do Windows; o bot continua rodando. Para encerrar de verdade, clique com o botão direito no ícone da bandeja e escolha **Sair**.

É necessário ter o **FFmpeg** instalado e disponível no `PATH` para reproduzir áudio no Discord.

Ao trocar manualmente de música pela ficha, o áudio faz uma transição suave de 4 segundos, reduzindo o volume da faixa atual e aumentando gradualmente o volume da próxima.

Se o bot entrar no canal, mas não houver som, confira no log do aplicativo se aparece `ERRO no áudio/FFmpeg`. O bot precisa ter permissão para **Conectar** e **Falar** no canal de voz.

O instalador não envia credenciais para a Vercel. O token do Discord permanece no `.env` local. A URL do túnel e `VITE_BOT_API_KEY` ainda precisam ser cadastradas nas variáveis do projeto Vercel e exigem um novo deploy.

## Integração

A API mantém os endpoints `/api/discord/status`, `/api/discord/locations`, `/api/discord/music/status`, `/api/discord/command` e `/api/discord/initiative` usados pela ficha. A autenticação aceita o valor de `DISCORD_API_KEY` no header `Authorization` ou `Bearer`. Como o serviço escuta somente em `127.0.0.1`, chamadas locais sem header também são aceitas para permitir a integração com uma ficha hospedada.

Na sessão online, o Mestre pode enviar a ordem de iniciativa ao canal de texto configurado. O bot ordena os resultados do maior para o menor e disponibiliza a última lista pelo comando `/iniciativa`. Quando houver empate, o Discord avisa o Mestre para pedir novas rolagens aos jogadores empatados; cada novo clique no valor da iniciativa substitui a rolagem anterior.

Os comandos `/ini_add` e `/ini_troca` permitem ajustar a ordem diretamente no Discord. `/ini_add` sem argumentos lista os jogadores e ameaças sincronizados pela sessão; com participante e posição, insere ou reposiciona a entrada. `/ini_troca` sem argumentos lista a ordem atual; com dois nomes, troca as posições. Cada alteração apaga a mensagem anterior de iniciativa e publica uma nova.
