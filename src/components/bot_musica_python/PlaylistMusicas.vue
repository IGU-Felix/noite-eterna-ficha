<template>
  <section class="playlist-painel">
    <div class="playlist-destino">
      <label>
        Servidor
        <select v-model="servidorId" @change="selecionarServidor">
          <option value="">Selecionar servidor</option>
          <option v-for="servidor in servidores" :key="servidor.id" :value="servidor.id">{{ servidor.nome }}</option>
        </select>
      </label>
      <label>
        Canal de voz
        <select v-model="canalVozId" :disabled="!servidorSelecionado" @change="trocarCanal">
          <option value="">Selecionar canal</option>
          <option v-for="canal in servidorSelecionado?.canaisVoz || []" :key="canal.id" :value="canal.id">{{ canal.nome }}</option>
        </select>
      </label>
    </div>

    <div
      class="playlist-atual"
      :style="{ '--playlist-acento': musicaAtual?.acento || '#d9a441' }"
    >
      <div class="playlist-atual-capa">
        <img v-if="musicaAtual?.imagem" :src="musicaAtual.imagem" :alt="`Capa de ${musicaAtual.nome}`" />
        <div v-else class="playlist-capa-vazia">♪</div>
      </div>
      <div
        class="playlist-atual-conteudo"
        :class="{ 'playlist-tocando': playlistTocando }"
      >
        <div class="playlist-atual-cabecalho">
          <div>
            <span class="playlist-kicker">Noite Real da Música</span>
            <strong>{{ musicaAtual?.nome || "Nenhuma música selecionada" }}</strong>
            <small>[{{ pastaAtual?.nome || "Pastas" }}]</small>
          </div>
          <span class="playlist-fechar">×</span>
        </div>
        <div class="playlist-controles">
          <button
            type="button"
            class="playlist-btn playlist-btn-controle"
            @click="alternarPausa"
            :disabled="!musicaAtual?.link || enviando"
            :aria-label="playlistTocando ? 'Pausar música' : 'Continuar música'"
          >
            <img :src="playlistTocando ? pauseIcon : playIcon" alt="" />
          </button>
          <button type="button" class="playlist-btn playlist-btn-controle" @click="enviarComando(musicaAtual?.link, 'play')" :disabled="!musicaAtual?.link || enviando" aria-label="Repetir música">
            <img :src="loopIcon" alt="" />
          </button>
          <div
            class="playlist-progresso"
            :style="{ '--playlist-posicao': `${progresso.duracao ? Math.min(progresso.decorrido / progresso.duracao * 100, 100) : 0}%` }"
          >
            <span :style="{ width: 'var(--playlist-posicao)' }"></span>
            <img class="playlist-lua playlist-lua-progresso" :src="moonIcon" alt="" />
          </div>
          <small class="playlist-tempo">{{ formatarTempo(progresso.duracao - progresso.decorrido) }}</small>
        </div>
      </div>
    </div>



    <div v-if="pastasAbertas" class="playlist-gerenciador">
      <div class="playlist-gerenciador-cabecalho">
        <span class="playlist-subtitulo">Pastas da sessão</span>
        <div class="playlist-cabecalho-acoes">
          <button type="button" class="playlist-btn playlist-btn-principal" @click.stop="adicionarPasta">+ Pasta</button>
          <button type="button" class="playlist-btn playlist-btn-principal" @click.stop="adicionarMusicaPrincipal">+ Música</button>
        </div>
      </div>

      <div v-if="pastas.length === 0" class="playlist-vazia">Crie uma pasta para organizar as músicas da sessão.</div>
      <div v-for="pasta in pastas" :key="pasta.id" class="playlist-pasta">
        <div class="playlist-pasta-cabecalho">
          <button type="button" class="playlist-pasta-toggle" @click="pastaAbertaId = pastaAbertaId === pasta.id ? null : pasta.id">
            <span>{{ pastaAbertaId === pasta.id ? "▾" : "▸" }}</span>
            <input v-model="pasta.nome" class="playlist-pasta-nome" aria-label="Nome da pasta" @click.stop @input="agendarPersistencia" />
          </button>
          <button type="button" class="playlist-btn playlist-btn-perigo" @click.stop="removerPasta(pasta.id)" title="Remover pasta">×</button>
        </div>

        <div v-if="pastaAbertaId === pasta.id" class="playlist-pasta-conteudo">
          <div v-if="pasta.musicas.length === 0" class="playlist-sem-musicas">Nenhuma música cadastrada.</div>
          <div v-for="musica in pasta.musicas" :key="musica.id" class="playlist-musica">
            <img v-if="musica.imagem" class="playlist-musica-capa" :src="musica.imagem" :alt="`Capa de ${musica.nome}`" />
            <div v-else class="playlist-musica-capa playlist-capa-vazia">♪</div>
            <div class="playlist-musica-dados">
              <span class="playlist-kicker">Noite Real da Música</span>
              <input v-model="musica.nome" placeholder="Nome da música" aria-label="Nome da música" @input="agendarPersistencia" />
              <input v-model="musica.link" placeholder="YouTube ou Spotify" type="url" aria-label="Link da música" @input="agendarPersistencia" @change="atualizarCapa(musica)" />
            </div>
            <div class="playlist-musica-acoes">
              <button type="button" class="playlist-btn playlist-btn-controle" @click.stop="selecionarMusica(pasta, musica)" :disabled="!musica.link || enviando" aria-label="Reproduzir música">
                <img :src="musicaAtual?.id === musica.id && playlistTocando ? pauseIcon : playIcon" alt="" />
              </button>
              <button type="button" class="playlist-btn playlist-btn-controle" @click.stop="selecionarMusica(pasta, musica)" :disabled="!musica.link || enviando" aria-label="Repetir música">
                <img :src="loopIcon" alt="" />
              </button>
              <div class="playlist-progresso"><span></span></div>
              <button type="button" class="playlist-btn playlist-btn-perigo" @click.stop="removerMusica(pasta, musica.id)" title="Remover música">×</button>
            </div>
          </div>
          <button type="button" class="playlist-btn playlist-btn-adicionar" @click.stop="adicionarMusica(pasta)">+ Música</button>
        </div>
      </div>
    </div>

    <p
      v-if="mensagem"
      class="playlist-mensagem"
      :class="{ 'playlist-mensagem-saindo': mensagemSaindo }"
    >
      {{ mensagem }}
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import playIcon from "../../assets/music/play_button.svg"
import pauseIcon from "../../assets/music/pause_button.svg"
import loopIcon from "../../assets/music/loop_button.svg"
import moonIcon from "../../assets/music/moon_icon_player.svg"

const CHAVE = "noite-eterna-playlist-mestre"
const mensagem = ref("")
const mensagemSaindo = ref(false)
const enviando = ref(false)
const servidores = ref([])
const pastasAbertas = ref(false)
const pastaAbertaId = ref(null)
const pastaAtualId = ref(localStorage.getItem("noite-eterna-playlist-pasta-atual") || "")
const musicaAtualId = ref(localStorage.getItem("noite-eterna-playlist-musica-atual") || "")
const servidorId = ref(localStorage.getItem("noite-eterna-playlist-servidor") || "")
const canalVozId = ref(localStorage.getItem("noite-eterna-playlist-canal-voz") || "")
const progresso = ref({ decorrido: 0, duracao: 0, reproduzindo: false, pausada: false })
const brilhoAtivo = ref(false)
let intervaloStatus = null
let timeoutMensagem = null
let timeoutMensagemSaida = null
let timeoutPersistencia = null
let tentativasLocais = 0
let permitirPlaylistVazia = false
let ultimoPlaySolicitado = 0
const API_LOCAL = "http://127.0.0.1:3001"
const API_CONFIGURADA = (import.meta.env.VITE_BOT_API_URL || "").replace(/\/+$/, "")
const CHAVE_API_BOT = import.meta.env.VITE_BOT_API_KEY || ""

function gerarId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function estadoInicial() {
  return {
    pastas: []
  }
}

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null")
    if (!salvo || !Array.isArray(salvo.pastas)) return estadoInicial()
    if (typeof salvo.pastaAtualId === "string") {
      pastaAtualId.value = salvo.pastaAtualId
    }
    if (typeof salvo.musicaAtualId === "string") {
      musicaAtualId.value = salvo.musicaAtualId
    }
    return {
      pastas: salvo.pastas.map(pasta => ({
        id: pasta.id || gerarId(),
        nome: pasta.nome || "Nova pasta",
        musicas: Array.isArray(pasta.musicas) ? pasta.musicas.map(musica => ({
          id: musica.id || gerarId(),
          nome: musica.nome || "Sem nome",
          link: musica.link || "",
          imagem: musica.imagem || "",
          acento: musica.acento || ""
        })) : []
      }))
    }
  } catch {
    return estadoInicial()
  }
}

const salvo = carregar()
const pastas = reactive(salvo.pastas)
const servidorSelecionado = computed(() => servidores.value.find(
  servidor => String(servidor.id) === String(servidorId.value)
) || null)
const pastaAtual = computed(() => pastas.find(pasta => pasta.id === pastaAtualId.value) || pastas[0] || null)
const musicaAtual = computed(() => {
  const pasta = pastaAtual.value
  if (!pasta) return null
  return pasta.musicas.find(musica => musica.id === musicaAtualId.value) || pasta.musicas[0] || null
})
const playlistTocando = computed(() => progresso.value.reproduzindo === true)

watch(pastas, () => {
  normalizarSelecao()
  agendarPersistencia()
}, { deep: true, flush: "post" })

watch(pastaAtualId, valor => localStorage.setItem("noite-eterna-playlist-pasta-atual", valor || ""))
watch(musicaAtualId, valor => localStorage.setItem("noite-eterna-playlist-musica-atual", valor || ""))
watch(servidorId, valor => localStorage.setItem("noite-eterna-playlist-servidor", valor))
watch(canalVozId, valor => localStorage.setItem("noite-eterna-playlist-canal-voz", valor))

onMounted(() => {
  carregarLocais()
  normalizarSelecao()
  carregarStatus()
  intervaloStatus = setInterval(carregarStatus, 1000)
  window.addEventListener("pagehide", persistirAgora)
})
onUnmounted(() => {
  clearInterval(intervaloStatus)
  clearTimeout(timeoutPersistencia)
  clearTimeout(timeoutMensagem)
  clearTimeout(timeoutMensagemSaida)
  window.removeEventListener("pagehide", persistirAgora)
  persistirAgora()
})

async function requisitarApi(caminho, opcoes = {}) {
  const usandoServidorLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  const base = API_CONFIGURADA || (usandoServidorLocal ? API_LOCAL : "")
  const enderecos = base
    ? [`${base}/api${caminho}`]
    : [`/api${caminho}`]
  let ultimoErro = null

  for (const endereco of enderecos) {
    try {
      const headers = new Headers(opcoes.headers || {})
      if (CHAVE_API_BOT) headers.set("Authorization", `Bearer ${CHAVE_API_BOT}`)
      const resposta = await fetch(endereco, { ...opcoes, headers })
      if (resposta.ok || resposta.status !== 404 && resposta.status !== 405) return resposta
    } catch (erro) {
      ultimoErro = erro
    }
  }

  throw ultimoErro || new Error(
    "A API local do bot não está disponível. Confirme se o bot está iniciado."
  )
}

async function carregarLocais() {
  try {
    const resposta = await requisitarApi("/discord/locations")
    const dados = await resposta.json()
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível listar os servidores.")
    servidores.value = dados.servidores || []
    if (!servidores.value.some(servidor => String(servidor.id) === String(servidorId.value))) {
      servidorId.value = ""
      canalVozId.value = ""
    }
    if (!servidorSelecionado.value && servidores.value.length === 1) {
      servidorId.value = String(servidores.value[0].id)
    }
    selecionarServidor()
    normalizarSelecao()
    tentativasLocais = 0
  } catch (erro) {
    tentativasLocais += 1
    if (tentativasLocais < 5) {
      setTimeout(carregarLocais, 1500)
    }
    mostrarMensagem(erro.message || "Não foi possível carregar os canais de voz.")
  }
}

function normalizarSelecao() {
  const pastaValida = pastas.find(pasta => pasta.id === pastaAtualId.value)
  if (!pastaValida && pastas.length > 0) {
    pastaAtualId.value = pastas[0].id
  }
  const pasta = pastas.find(item => item.id === pastaAtualId.value) || pastas[0]
  const musicaValida = pasta?.musicas.find(musica => musica.id === musicaAtualId.value)
  if (!musicaValida) {
    musicaAtualId.value = pasta?.musicas[0]?.id || ""
  }
}

function selecionarServidor() {
  const canais = servidorSelecionado.value?.canaisVoz || []
  if (!canais.some(canal => String(canal.id) === String(canalVozId.value))) {
    canalVozId.value = canais.length === 1 ? String(canais[0].id) : ""
  }
  if (servidorId.value && canalVozId.value) {
    enviarComando("", "move")
  }
}

function trocarCanal() {
  if (canalVozId.value) enviarComando("", "move")
}

async function carregarStatus() {
  if (!servidorId.value) {
    if (!servidores.value.length) await carregarLocais()
    return
  }
  try {
    const resposta = await requisitarApi(`/discord/music/status?guildId=${encodeURIComponent(servidorId.value)}`)
    if (!resposta.ok) return
    const dados = await resposta.json()
    progresso.value = {
      decorrido: Number(dados.decorrido) || 0,
      duracao: Number(dados.duracao) || 0,
      reproduzindo: dados.reproduzindo === true,
      pausada: dados.pausada === true
    }
    if (dados.reproduzindo === true) {
      brilhoAtivo.value = true
      ultimoPlaySolicitado = 0
    } else if (dados.pausada === true) {
      brilhoAtivo.value = false
      ultimoPlaySolicitado = 0
    } else if (!enviando.value && (!ultimoPlaySolicitado || Date.now() - ultimoPlaySolicitado > 3000)) {
      brilhoAtivo.value = false
    }
  } catch {
    // A API pode estar iniciando ou indisponível enquanto a ficha permanece aberta.
  }
}

function formatarTempo(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

function mostrarMensagem(texto) {
  mensagem.value = texto
  mensagemSaindo.value = false
  clearTimeout(timeoutMensagem)
  clearTimeout(timeoutMensagemSaida)
  timeoutMensagemSaida = setTimeout(() => {
    mensagemSaindo.value = true
  }, 1800)
  timeoutMensagem = setTimeout(() => {
    mensagem.value = ""
    mensagemSaindo.value = false
  }, 2400)
}

function agendarPersistencia() {
  clearTimeout(timeoutPersistencia)
  timeoutPersistencia = setTimeout(persistirAgora, 100)
}

function persistirAgora() {
  clearTimeout(timeoutPersistencia)
  try {
    if (pastas.length === 0 && !permitirPlaylistVazia) {
      return
    }
    const dados = pastas.map(pasta => ({
      id: pasta.id,
      nome: pasta.nome,
      musicas: pasta.musicas.map(musica => ({
        id: musica.id,
        nome: musica.nome,
        link: musica.link,
        imagem: musica.imagem,
        acento: musica.acento
      }))
    }))
    const conteudo = JSON.stringify({
      pastas: dados,
      pastaAtualId: pastaAtualId.value,
      musicaAtualId: musicaAtualId.value
    })
    localStorage.setItem(CHAVE, conteudo)
    if (localStorage.getItem(CHAVE) !== conteudo) {
      throw new Error("O navegador não confirmou o salvamento da playlist.")
    }
    permitirPlaylistVazia = false
  } catch (erro) {
    console.error("Não foi possível salvar a playlist localmente:", erro)
    mostrarMensagem("Não foi possível salvar a playlist neste navegador.")
  }
}

function adicionarPasta() {
  permitirPlaylistVazia = false
  const pasta = { id: gerarId(), nome: "Nova pasta", musicas: [] }
  pastas.push(pasta)
  pastaAtualId.value = pasta.id
  pastaAbertaId.value = pasta.id
  pastasAbertas.value = true
  persistirAgora()
}

function removerPasta(id) {
  const indice = pastas.findIndex(pasta => pasta.id === id)
  if (indice >= 0) pastas.splice(indice, 1)
  if (pastaAtualId.value === id) {
    pastaAtualId.value = pastas[0]?.id || ""
    musicaAtualId.value = ""
  }

  permitirPlaylistVazia = pastas.length === 0
  persistirAgora()
}

function alternarPastas() {
  pastasAbertas.value = !pastasAbertas.value
}

defineExpose({ alternarPastas })

function adicionarMusica(pasta) {
  permitirPlaylistVazia = false
  const musica = { id: gerarId(), nome: "Nova música", link: "", imagem: "", acento: "" }
  pasta.musicas.push(musica)
  pastaAtualId.value = pasta.id
  musicaAtualId.value = musica.id
  pastaAbertaId.value = pasta.id
  persistirAgora()
}

function adicionarMusicaPrincipal() {
  if (pastas.length === 0) adicionarPasta()
  adicionarMusica(pastas[0])
}

function removerMusica(pasta, id) {
  const indice = pasta.musicas.findIndex(musica => musica.id === id)
  if (indice >= 0) pasta.musicas.splice(indice, 1)
  if (musicaAtualId.value === id) musicaAtualId.value = pasta.musicas[0]?.id || ""
  normalizarSelecao()
  persistirAgora()
}

async function selecionarMusica(pasta, musica) {
  pastaAtualId.value = pasta.id
  musicaAtualId.value = musica.id
  await atualizarCapa(musica)
  await enviarComando(musica.link, "play")
}

function extrairYoutubeId(link) {
  try {
    const url = new URL(link)
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0]
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").pop()
  } catch {
    return ""
  }
  return ""
}

async function atualizarCapa(musica) {
  const link = musica.link.trim()
  if (!link) {
    musica.imagem = ""
    musica.acento = ""
    persistirAgora()
    return
  }
  const youtubeId = extrairYoutubeId(link)
  if (youtubeId) {
    musica.imagem = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    await atualizarCor(musica)
    persistirAgora()
    return
  }
  if (!link.includes("open.spotify.com/")) {
    musica.imagem = ""
    musica.acento = ""
    persistirAgora()
    return
  }
  try {
    const resposta = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`)
    if (!resposta.ok) throw new Error(`Spotify oEmbed retornou ${resposta.status}.`)
    const dados = await resposta.json()
    if (typeof dados.thumbnail_url === "string") {
      musica.imagem = dados.thumbnail_url
      await atualizarCor(musica)
      persistirAgora()
    }
  } catch (erro) {
    console.warn("Não foi possível carregar a capa do Spotify:", erro)
    persistirAgora()
  }
}

async function atualizarCor(musica) {
  if (!musica.imagem) return
  try {
    const imagem = new Image()
    imagem.crossOrigin = "anonymous"
    imagem.src = musica.imagem
    await new Promise((resolve, reject) => {
      imagem.onload = resolve
      imagem.onerror = reject
    })
    const canvas = document.createElement("canvas")
    canvas.width = 24
    canvas.height = 24
    const contexto = canvas.getContext("2d")
    if (!contexto) return
    contexto.drawImage(imagem, 0, 0, 24, 24)
    const pixels = contexto.getImageData(0, 0, 24, 24).data
    const gruposDeCor = new Map()
    for (let indice = 0; indice < pixels.length; indice += 4) {
      const vermelho = pixels[indice]
      const verde = pixels[indice + 1]
      const azul = pixels[indice + 2]
      const maximo = Math.max(vermelho, verde, azul)
      const minimo = Math.min(vermelho, verde, azul)
      const saturacao = maximo === 0 ? 0 : (maximo - minimo) / maximo
      const luminosidade = (maximo + minimo) / 2
      if (saturacao < 0.25 || luminosidade <= 35 || luminosidade >= 245) continue
      const grupo = [
        Math.round(vermelho / 32) * 32,
        Math.round(verde / 32) * 32,
        Math.round(azul / 32) * 32
      ]
      const chave = grupo.join(",")
      const atual = gruposDeCor.get(chave) || { quantidade: 0, saturacao: 0 }
      atual.quantidade += 1
      atual.saturacao += saturacao
      gruposDeCor.set(chave, atual)
    }
    let corMaisVibrante = [217, 164, 65]
    let maiorPontuacao = 0
    for (const [chave, grupo] of gruposDeCor) {
      const pontuacao = grupo.quantidade * (1 + grupo.saturacao / grupo.quantidade * 0.35)
      if (pontuacao > maiorPontuacao) {
        maiorPontuacao = pontuacao
        corMaisVibrante = chave.split(",").map(Number)
      }
    }
    musica.acento = `rgb(${corMaisVibrante.join(", ")})`
  } catch {
    musica.acento = "#d9a441"
  }
  persistirAgora()
}

async function enviarComando(link = "", acao = "play") {
  if ((acao === "play" && !link) || enviando.value) return
  enviando.value = true
  if (acao === "play") {
    brilhoAtivo.value = true
    ultimoPlaySolicitado = Date.now()
    progresso.value.reproduzindo = true
    progresso.value.pausada = false
  }
  if (acao === "pause") {
    brilhoAtivo.value = false
    progresso.value.reproduzindo = false
    progresso.value.pausada = true
  }
  if (acao === "resume") {
    brilhoAtivo.value = true
    progresso.value.reproduzindo = true
    progresso.value.pausada = false
  }

  try {
    const resposta = await requisitarApi("/discord/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link, acao, guildId: servidorId.value, voiceChannelId: canalVozId.value })
    })
    const resultado = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível enviar o comando.")
    if (acao === "stop") brilhoAtivo.value = false
    mostrarMensagem(resultado.iniciando ? "Música sendo carregada..." : "Comando enviado ao Discord.")
    await carregarStatus()
  } catch (erro) {
    mostrarMensagem(
      erro.message || "Não foi possível conectar ao bot. Verifique se o aplicativo está aberto."
    )
  } finally {
    enviando.value = false
  }
}

function alternarPausa() {
  const estaTocando = progresso.value.reproduzindo || brilhoAtivo.value
  if (estaTocando) {
    enviarComando("", "pause")
    return
  }
  if (progresso.value.pausada) {
    enviarComando("", "resume")
    return
  }
  enviarComando(musicaAtual.value?.link || "", "play")
}
</script>

<style scoped>
.playlist-painel {
  background: #111111;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playlist-cabecalho,
.playlist-pasta-cabecalho,
.playlist-musica,
.playlist-musica-acoes {
  display: flex;
  align-items: center;
  gap: 6px;
}

.playlist-cabecalho-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.playlist-cabecalho,
.playlist-pasta-cabecalho {
  justify-content: space-between;
}

.playlist-kicker,
.playlist-subtitulo {
  color: #999;
  font-size: 11px;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.playlist-kicker {
  align-items: center;
  display: flex;
  gap: 5px;
}

.playlist-lua {
  height: 14px;
  width: 13px;
}

.playlist-lua-progresso {
  left: var(--playlist-posicao);
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.playlist-cabecalho h3 {
  color: #d9a441;
  font-size: 18px;
  font-weight: normal;
  margin: 2px 0 0;
}

.playlist-pasta {
  background: #111111;
  border: 1px solid #292929;
  padding: 9px;
}

.playlist-atual,
.playlist-gerenciador {
  background: #111111;
  border: 1px solid #292929;
  padding: 12px;
}

.playlist-atual {
  display: flex;
  background: #111111;
  border: 0;
  gap: 12px;
  height: 132px;
  min-height: 132px;
  padding: 0;
  overflow: hidden;
  position: relative;
}

.playlist-atual-capa {
  flex: 0 0 132px;
  height: 132px;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.playlist-atual-conteudo::before {
  background: radial-gradient(
    ellipse 44% 100% at left center,
    var(--playlist-acento) 0%,
    color-mix(in srgb, var(--playlist-acento) 42%, transparent) 46%,
    transparent 100%
  );
  content: "";
  filter: saturate(1.8) blur(8px);
  height: 100%;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  z-index: 0;
}

.playlist-tocando::before {
  animation: playlist-pulsar 1.8s ease-in-out infinite;
}

.playlist-atual-capa img,
.playlist-capa-vazia {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.playlist-atual-capa img {
  filter: saturate(1.35) contrast(1.08);
  transform: scale(1.3);
  transform-origin: center;
}

.playlist-musica-capa:not(.playlist-capa-vazia) {
  filter: saturate(1.28) contrast(1.06);
  object-fit: cover;
  transform: scale(1);
  transform-origin: center;
}

.playlist-capa-vazia {
  align-items: center;
  background: #2a2416;
  color: #d9a441;
  display: flex;
  font-size: 48px;
  justify-content: center;
}

.playlist-atual-conteudo {
  background: #111111;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 8px 10px 8px 0;
  position: relative;
  z-index: 1;
}

.playlist-atual-conteudo > * {
  position: relative;
  z-index: 1;
}

@keyframes playlist-pulsar {
  0%, 100% {
    box-shadow: 0 0 9px 2px var(--playlist-acento);
    opacity: .3;
  }
  50% {
    box-shadow: 0 0 18px 4px var(--playlist-acento);
    opacity: .62;
  }
}

.playlist-atual-cabecalho,
.playlist-gerenciador-cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.playlist-atual-cabecalho strong {
  display: block;
  color: #eee;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 400;
  line-height: 1.05;
  margin-top: 5px;
}

.playlist-atual-cabecalho small {
  color: #d9a441;
  display: block;
  font-size: 10px;
  margin-top: 3px;
}

.playlist-fechar {
  color: #777;
  font-size: 18px;
}

.playlist-controles {
  align-items: center;
  display: flex;
  gap: 7px;
  margin-top: auto;
}

.playlist-btn.playlist-btn-controle {
  align-items: center;
  background: transparent;
  border: 0;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  min-width: 34px;
  padding: 0;
}

.playlist-btn-controle img {
  display: block;
  height: 34px;
  pointer-events: none;
  width: 34px;
}

.playlist-progresso {
  background: #777;
  flex: 1;
  height: 2px;
  margin: 0 4px;
  position: relative;
}

.playlist-progresso span {
  background: #eee;
  display: block;
  height: 100%;
  transition: width .8s linear;
}

.playlist-tempo {
  color: #999;
  font-size: 9px;
  min-width: 24px;
  text-align: right;
}

.playlist-pastas-link {
  align-self: stretch;
  background: #111111;
  border: 0;
  color: #d9a441;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  height: 20px;
  padding: 2px 0 0 132px;
  text-align: left;
}

.playlist-musica-capa {
  background: #0e0e0e;
  object-fit: cover;
}

.playlist-gerenciador {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playlist-pasta-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: #d9a441;
  cursor: pointer;
  display: flex;
  flex: 1;
  font: inherit;
  gap: 7px;
  min-width: 0;
  padding: 0;
  text-align: left;
}

.playlist-pasta-toggle > span {
  color: #999;
  font-size: 13px;
}

.playlist-pasta-conteudo {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.playlist-destino {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.playlist-destino label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: #999;
  font-size: 11px;
}

.playlist-destino select,
.playlist-pasta-nome,
.playlist-musica input {
  min-width: 0;
  background: #0e0e0e;
  border: 1px solid #333;
  color: #eee;
  font: inherit;
  font-size: 13px;
  padding: 7px;
}

.playlist-destino select {
  min-width: 0;
}

.playlist-pasta-nome {
  flex: 1;
  color: #d9a441;
  font-size: 14px;
}

.playlist-vazia,
.playlist-sem-musicas {
  color: #777;
  font-size: 12px;
  line-height: 1.35;
  margin: 0;
}

.playlist-pasta {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.playlist-musica {
  align-items: stretch;
  border-top: 1px solid #252525;
  padding-top: 7px;
}

.playlist-musica-capa { flex: 0 0 88px; height: 88px; width: 88px; }

.playlist-musica-dados {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.playlist-musica-acoes {
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.playlist-btn {
  background: transparent;
  border: 1px solid #444;
  color: #bbb;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 7px 9px;
  white-space: nowrap;
}

.playlist-btn:hover:not(:disabled) {
  border-color: #d9a441;
  color: #d9a441;
}

.playlist-btn:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.playlist-btn-principal,
.playlist-btn-tocar {
  border-color: #d9a441;
  color: #d9a441;
}

.playlist-btn-adicionar {
  align-self: flex-start;
  border-style: dashed;
}

.playlist-btn-perigo {
  border-color: #6d3030;
  color: #d97a7a;
}

.playlist-mensagem {
  position: fixed;
  z-index: 1000;
  right: 20px;
  bottom: 20px;
  max-width: min(360px, calc(100vw - 40px));
  background: #182218;
  border: 1px solid #315231;
  color: #a8d6a8;
  font-size: 10px;
  margin: 0;
  padding: 6px;
  overflow-wrap: anywhere;
  animation: slide-in-blurred-bottom 0.6s cubic-bezier(.23, 1, .32, 1) both;
}

.playlist-mensagem-saindo {
  animation-direction: reverse;
}

@keyframes slide-in-blurred-bottom {
  0% {
    transform: translateY(70px) scaleY(1.05) scaleX(.98);
    transform-origin: 50% 100%;
    filter: blur(8px);
    opacity: 0;
  }

  100% {
    transform: translateY(0) scaleY(1) scaleX(1);
    transform-origin: 50% 50%;
    filter: blur(0);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .playlist-destino {
    grid-template-columns: 1fr;
  }

  .playlist-atual-cabecalho,
  .playlist-gerenciador-cabecalho {
    align-items: flex-start;
    flex-direction: column;
  }

  .playlist-atual {
    gap: 9px;
  }

  .playlist-atual-capa {
    flex-basis: 105px;
    height: 105px;
  }

  .playlist-pastas-link {
    padding-left: 0;
  }

  .playlist-musica {
    flex-direction: column;
  }

  .playlist-musica-acoes {
    justify-content: flex-start;
  }
}
</style>
