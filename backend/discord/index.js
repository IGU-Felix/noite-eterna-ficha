import "dotenv/config"
import cors from "cors"
import express from "express"
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js"
import {
  alternarLoop,
  pararMusica,
  pularMusica,
  statusMusica,
  tocarMusica
} from "./musicPlayer.js"

const {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_VOICE_CHANNEL_ID,
  DISCORD_API_KEY,
  PORT = 3001,
  FRONTEND_ORIGIN = "http://localhost:5173"
} = process.env

for (const [nome, valor] of Object.entries({
  DISCORD_BOT_TOKEN,
  DISCORD_API_KEY
})) {
  if (!valor) {
    console.error(`${nome} não foi configurado no arquivo .env`)
    process.exit(1)
  }
}

const app = express()
const discord = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
})
let ultimaPresencaFicha = { em: 0, aberta: false }
const TEMPO_PRESENCA_MS = 90_000

app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json({ limit: "8kb" }))

function apiAutorizada(req) {
  return req.headers.authorization === `Bearer ${DISCORD_API_KEY}`
}

function fichaEstaAberta() {
  return ultimaPresencaFicha.aberta && Date.now() - ultimaPresencaFicha.em < TEMPO_PRESENCA_MS
}

app.post("/api/ficha/presenca", (req, res) => {
  if (!apiAutorizada(req)) return res.status(401).json({ erro: "API não autorizada." })
  ultimaPresencaFicha = { em: Date.now(), aberta: req.body?.aberta === true }
  res.json({ registrada: true, aberta: fichaEstaAberta() })
})

async function resolverGuildId(guildId) {
  const escolhido = guildId || DISCORD_GUILD_ID
  if (escolhido) return escolhido
  if (discord.guilds.cache.size === 1) return discord.guilds.cache.first().id
  throw new Error("Informe o servidor da sessão.")
}

async function obterCanalDeVoz(voiceChannelId) {
  const escolhido = voiceChannelId || DISCORD_VOICE_CHANNEL_ID
  if (!escolhido) throw new Error("Informe o canal de voz da sessão.")
  const canal = await discord.channels.fetch(escolhido)
  if (!canal?.isVoiceBased?.() || !canal.guild) {
    throw new Error("O canal escolhido não é um canal de voz válido.")
  }
  return canal
}

function inferirAcao(comando) {
  const normalizado = String(comando || "").trim().toLowerCase()
  if (normalizado.includes("skip")) return "skip"
  if (normalizado.includes("loop")) return "loop"
  return "play"
}

async function executarAcao(acao, link = "", guildId = null, voiceChannelId = null) {
  const guild = await discord.guilds.fetch(await resolverGuildId(guildId))

  if (acao === "play") {
    if (!link) throw new Error("Informe o link da música.")
    const voiceChannel = await obterCanalDeVoz(voiceChannelId)
    return { acao, ...(await tocarMusica({ guild, voiceChannel, url: link })) }
  }

  if (acao === "loop") return { acao, loop: alternarLoop(guild.id) }
  if (acao === "skip") return { acao, pulou: pularMusica(guild.id) }
  if (acao === "stop") return { acao, parou: pararMusica(guild.id) }
  throw new Error("Ação musical desconhecida.")
}

app.get("/api/discord/status", (req, res) => {
  if (!apiAutorizada(req)) return res.status(401).json({ erro: "API não autorizada." })

  res.json({
    conectado: discord.isReady(),
    bot: discord.user?.tag || null,
    servidores: discord.guilds.cache.size,
    fichaAberta: fichaEstaAberta()
  })
})

app.get("/api/discord/locations", async (req, res) => {
  if (!apiAutorizada(req)) return res.status(401).json({ erro: "API não autorizada." })
  if (!discord.isReady()) return res.status(503).json({ erro: "Bot ainda não está conectado ao Discord." })

  try {
    const servidores = await Promise.all(discord.guilds.cache.map(async guild => {
      const canais = await guild.channels.fetch()
      return {
        id: guild.id,
        nome: guild.name,
        canaisVoz: canais.filter(canal => canal?.isVoiceBased?.()).map(canal => ({
          id: canal.id,
          nome: canal.name
        }))
      }
    }))
    res.json({ servidores })
  } catch (erro) {
    res.status(502).json({ erro: "Não foi possível listar os canais do bot." })
  }
})

app.get("/api/discord/music/status", async (req, res) => {
  if (!apiAutorizada(req)) return res.status(401).json({ erro: "API não autorizada." })
  try {
    res.json(statusMusica(await resolverGuildId(req.query.guildId)))
  } catch (erro) {
    res.status(400).json({ erro: erro.message })
  }
})

app.post("/api/discord/command", async (req, res) => {
  if (!apiAutorizada(req)) return res.status(401).json({ erro: "API não autorizada." })
  if (!discord.isReady()) return res.status(503).json({ erro: "Bot ainda não está conectado ao Discord." })
  if (!fichaEstaAberta()) {
    return res.status(409).json({ erro: "A ficha está fechada. Use os comandos do Discord." })
  }

  const comando = typeof req.body?.comando === "string" ? req.body.comando.trim() : ""
  const acao = typeof req.body?.acao === "string" ? req.body.acao : inferirAcao(comando)
  const link = typeof req.body?.link === "string" ? req.body.link.trim() : ""
  const guildId = typeof req.body?.guildId === "string" ? req.body.guildId : null
  const voiceChannelId = typeof req.body?.voiceChannelId === "string" ? req.body.voiceChannelId : null

  try {
    res.json({ executado: true, ...(await executarAcao(acao, link, guildId, voiceChannelId)) })
  } catch (erro) {
    console.error("Erro ao executar ação musical:", erro)
    res.status(502).json({ erro: erro.message || "Não foi possível executar a ação musical." })
  }
})

const comandos = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Toca uma música no seu canal de voz atual")
    .addStringOption(opcao => opcao.setName("url").setDescription("URL do vídeo no YouTube").setRequired(true)),
  new SlashCommandBuilder().setName("loop").setDescription("Alterna o loop da música atual"),
  new SlashCommandBuilder().setName("skip").setDescription("Pula a música atual"),
  new SlashCommandBuilder().setName("stop").setDescription("Para a música e sai do canal de voz")
].map(comando => comando.toJSON())

async function registrarComandos(guildId) {
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN)
  await rest.put(Routes.applicationGuildCommands(discord.user.id, guildId), { body: comandos })
}

discord.once("clientReady", async client => {
  console.log(`Bot conectado como ${client.user.tag}`)
  try {
    await Promise.all(client.guilds.cache.map(guild => registrarComandos(guild.id)))
    console.log(`Comandos slash registrados em ${client.guilds.cache.size} servidor(es).`)
  } catch (erro) {
    console.error("Não foi possível registrar os comandos slash:", erro.message)
  }
})

discord.on("guildCreate", guild => {
  registrarComandos(guild.id).catch(erro => {
    console.error(`Não foi possível registrar comandos em ${guild.name}:`, erro.message)
  })
})

discord.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return
  if (!interaction.guildId) return

  try {
    if (interaction.commandName === "play") {
      const voiceChannel = interaction.member?.voice?.channel
      if (!voiceChannel) {
        await interaction.reply({ content: "Entre em um canal de voz primeiro.", ephemeral: true })
        return
      }
      await tocarMusica({
        guild: interaction.guild,
        voiceChannel,
        url: interaction.options.getString("url", true)
      })
      await interaction.reply("Tocando a música.")
      return
    }

    if (interaction.commandName === "loop") {
      await interaction.reply(alternarLoop(interaction.guildId) ? "Loop ativado." : "Loop desativado.")
      return
    }

    if (interaction.commandName === "skip") {
      pularMusica(interaction.guildId)
      await interaction.reply("Música pulada.")
      return
    }

    if (interaction.commandName === "stop") {
      pararMusica(interaction.guildId)
      await interaction.reply("Música parada.")
    }
  } catch (erro) {
    console.error("Erro no comando slash:", erro)
    const resposta = { content: erro.message || "Não foi possível executar o comando.", ephemeral: true }
    if (interaction.replied || interaction.deferred) await interaction.followUp(resposta)
    else await interaction.reply(resposta)
  }
})

app.listen(PORT, () => {
  console.log(`API do bot disponível em http://localhost:${PORT}`)
})

discord.login(DISCORD_BOT_TOKEN).catch(erro => {
  console.error("Não foi possível conectar o bot ao Discord:", erro.message)
  process.exit(1)
})
