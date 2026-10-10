import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel
} from "@discordjs/voice"
import play from "play-dl"
import spotifyUrlInfo from "spotify-url-info"
import ytDlp from "yt-dlp-exec"

const { getPreview } = spotifyUrlInfo(fetch)

const players = new Map()

function obterEstado(guildId) {
  if (!players.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    })
    const estado = {
      player,
      connection: null,
      fila: [],
      atual: null,
      loop: false,
      reproduzindo: false,
      processo: null
    }

    player.on(AudioPlayerStatus.Idle, () => {
      estado.reproduzindo = false
      if (estado.loop && estado.atual) {
        iniciarStream(estado, estado.atual)
        return
      }
      const proxima = estado.fila.shift()
      if (proxima) iniciarStream(estado, proxima)
    })

    player.on("error", erro => {
      console.error("Erro no player de música:", erro.message)
      estado.reproduzindo = false
      const proxima = estado.fila.shift()
      if (proxima) iniciarStream(estado, proxima)
    })

    players.set(guildId, estado)
  }
  return players.get(guildId)
}

function conectarCanal(estado, voiceChannel) {
  if (!voiceChannel?.guild) throw new Error("Canal de voz inválido.")

  const status = estado.connection?.state.status
  const conexaoSaudavel = status === VoiceConnectionStatus.Ready
    || status === VoiceConnectionStatus.Connecting
    || status === VoiceConnectionStatus.Signalling

  if (!conexaoSaudavel || estado.connection.joinConfig.channelId !== voiceChannel.id) {
    estado.connection?.destroy()
    estado.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator
    })
    estado.connection.subscribe(estado.player)
  }
}

async function iniciarStream(estado, url) {
  estado.processo?.kill()
  const processo = ytDlp.exec(url, {
    format: "bestaudio[ext=webm][acodec=opus]",
    output: "-",
    noPlaylist: true,
    quiet: true,
    noWarnings: true
  }, {
    stdio: ["ignore", "pipe", "pipe"]
  })

  estado.processo = processo
  processo.stderr?.on("data", dados => {
    const texto = dados.toString().trim()
    if (texto) console.warn("yt-dlp:", texto)
  })

  const recurso = createAudioResource(processo.stdout, { inputType: StreamType.WebmOpus })
  estado.atual = url
  estado.reproduzindo = true
  estado.player.play(recurso)

  processo.catch(erro => {
    if (estado.processo !== processo) return
    estado.processo = null
    estado.reproduzindo = false
    console.error("Erro ao baixar o áudio:", erro.message)
    estado.player.stop(true)
  })
}

async function resolverLinkMusical(url) {
  if (!url.includes("spotify.com/") && !url.startsWith("spotify:")) return url

  const dados = await getPreview(url)
  if (!dados?.artist || !dados?.title) {
    throw new Error("Não foi possível ler a faixa do Spotify.")
  }

  const resultados = await play.search(`${dados.artist} - ${dados.title}`, {
    limit: 1,
    source: { youtube: "video" }
  })
  const video = resultados.find(resultado => resultado.type === "video")
  if (!video?.url) {
    throw new Error("Não foi encontrada uma versão da faixa no YouTube.")
  }

  return video.url
}

export async function tocarMusica({ guild, voiceChannel, url }) {
  const estado = obterEstado(guild.id)
  conectarCanal(estado, voiceChannel)
  const urlResolvida = await resolverLinkMusical(url)

  if (play.yt_validate(urlResolvida) !== "video") {
    throw new Error("Informe um link válido do YouTube ou Spotify.")
  }

  estado.fila = []
  estado.loop = false
  await iniciarStream(estado, urlResolvida)
  return { url: urlResolvida, loop: estado.loop }
}

export function alternarLoop(guildId) {
  const estado = obterEstado(guildId)
  estado.loop = !estado.loop
  return estado.loop
}

export function pularMusica(guildId) {
  const estado = obterEstado(guildId)
  estado.loop = false
  estado.processo?.kill()
  estado.processo = null
  estado.player.stop(true)
  return true
}

export function pararMusica(guildId) {
  const estado = obterEstado(guildId)
  estado.fila = []
  estado.atual = null
  estado.loop = false
  estado.reproduzindo = false
  estado.player.stop(true)
  estado.processo?.kill()
  estado.processo = null
  estado.connection?.destroy()
  estado.connection = null
  return true
}

export function statusMusica(guildId) {
  const estado = obterEstado(guildId)
  return {
    atual: estado.atual,
    loop: estado.loop,
    reproduzindo: estado.reproduzindo,
    fila: estado.fila.length
  }
}
