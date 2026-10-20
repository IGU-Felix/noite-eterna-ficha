<template>
  <div class="app-root">
    <Intro @entrar="abrirPersonagem" @abrir-ameaca="abrirAmeaca" @consultar="abrirAssistente"
      @abrir-sessao="sessaoAberta = true" @abrir-mapa="mapaAberto = true" />
    <MapaMundi v-if="mapaAberto" @fechar="mapaAberto = false" @abrir-interno="abrirMapaInterno" />
    <MapaEditor v-if="mapaInternoAberto" @fechar="mapaInternoAberto = false" />

    <SeletorFichas v-if="seletorAberto" :fichas="fichasSessao" :tipo-inicial="tipoSeletor"
      @fechar="seletorAberto = false" @abrir="abrirFichaSessao" @criar="criarFicha" @importar="importarFicha" />

    <Assistente v-if="assistenteAberto" @fechar="assistenteAberto = false" />

    <SessaoOnline v-if="sessaoAberta" :nome-personagem="nomePersonagemAtual"
      :personagem-disponivel="personagemDisponivel" :ficha-vinculada-id="primeiroPersonagemId"
      :participantes-iniciativa="participantesIniciativa"
      @fechar="sessaoAberta = false" @abrir-ficha="abrirFichaSessao" />

    <FichaFlutuante v-if="todasJanelas.some(janela => !janela.minimizada) && !seletorAberto" :fichas="todasJanelas"
      :ativa-id="janelaAtiva" :janela-em-frente-id="janelaEmFrente" :importacao-pendente="importacaoPendente"
      @selecionar="selecionarJanela" @nome-atualizado="atualizarNome" @imagem-atualizada="atualizarImagem"
      @dados-atualizados="atualizarDadosFicha"
      @importacao-concluida="limparImportacao" @nova-ficha="abrirSeletor" @minimizar="minimizarJanela"
      @restaurada="restaurarJanela" @fechar="fecharJanela" @topo="registrarJanelaEmFrente" />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import Intro from "./components/Intro.vue"
import Assistente from "./components/outras_telas/Assistente.vue"
import FichaFlutuante from "./components/outras_telas/FichaFlutuante.vue"
import SeletorFichas from "./components/outras_telas/SeletorFichas.vue"
import SessaoOnline from "./components/outras_telas/online/SessaoOnline.vue"
import MapaMundi from "./components/mapa/MapaMundi.vue"
import MapaEditor from "./components/mapa/MapaEditor.vue"
import { watch } from "vue"
import { sessaoEstado, enviarSyncFichaParaMestre, restaurarSessao } from "./services/sessaoP2P.js"

const personagensAbertos = ref([])
const ameacasAbertas = ref([])
const fichasSessao = ref([])
const seletorAberto = ref(false)
const tipoSeletor = ref("todas")
const importacaoPendente = ref(null)
const assistenteAberto = ref(false)
const sessaoAberta = ref(false)
const mapaAberto = ref(false)
const mapaInternoAberto = ref(false)
const janelaAtiva = ref(null)
const janelaEmFrente = ref(null)
let timeoutSincronizacaoIniciativa = null
let ultimaListaIniciativa = ""
const todasJanelas = computed(() => [
  ...personagensAbertos.value.map(janela => ({ ...janela, tipo: "personagem" })),
  ...ameacasAbertas.value.map(janela => ({ ...janela, tipo: "ameaca" }))
])

function restaurarSessaoAoVoltar() {
  restaurarSessao()
}

let intervaloPresencaFicha = null

function enviarPresencaFicha() {
  fetch("/api/ficha/presenca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aberta: todasJanelas.value.some(janela => !janela.minimizada)
    })
  }).catch(() => { })
}

onMounted(() => {
  restaurarSessaoAoVoltar()
  enviarPresencaFicha()
  intervaloPresencaFicha = setInterval(enviarPresencaFicha, 30_000)
  window.addEventListener("pageshow", restaurarSessaoAoVoltar)
  document.addEventListener("visibilitychange", restaurarSessaoAoVoltar)
})

onBeforeUnmount(() => {
  clearInterval(intervaloPresencaFicha)
  clearTimeout(timeoutSincronizacaoIniciativa)
  window.removeEventListener("pageshow", restaurarSessaoAoVoltar)
  document.removeEventListener("visibilitychange", restaurarSessaoAoVoltar)
})
const nomePersonagemAtual = computed(() => {
  const ativa = todasJanelas.value.find(janela => janela.id === janelaAtiva.value)
  if (ativa && ativa.tipo === "personagem") return ativa.nome
  const primeiro = personagensAbertos.value[0]
  return primeiro ? primeiro.nome : ""
})

const personagemDisponivel = computed(() => personagensAbertos.value.length > 0)
const primeiroPersonagemId = computed(() => personagensAbertos.value[0]?.id || null)
const participantesIniciativa = computed(() => {
  if (sessaoEstado.papel === "jogador" && sessaoEstado.iniciativaCompartilhada.length) {
    return sessaoEstado.iniciativaCompartilhada
  }
  const jogadores = sessaoEstado.jogadores
    .filter(jogador => jogador.papel === "jogador" && jogador.online)
    .map(jogador => {
      const ficha = jogador.fichaId ? sessaoEstado.fichasRemotas[jogador.fichaId] : null
      const dados = ficha?.dados
      return {
        id: `jogador-${jogador.id}`,
        nome: ficha?.nome || jogador.fichaNome || jogador.nome || "Jogador",
        jogadorId: jogador.id,
        jogadorNome: jogador.nome || "Jogador",
        personagemNome: ficha?.nome || jogador.fichaNome || "Sem ficha",
        fichaId: jogador.fichaId,
        imagem: ficha?.imagem || jogador.fichaImagem || null,
        vidaAtual: dados?.vidaAtual ?? null,
        vidaMax: dados?.vidaMax ?? null,
        iniciativaRolada: obterDadoIniciativa(dados),
        tipo: ficha?.tipo || "personagem",
        iniciativa: obterIniciativa(dados)
      }
    })

  const ameacas = todasJanelas.value
    .filter(ficha => ficha.tipo === "ameaca" && !ficha.remota)
    .map(ficha => {
      const dados = fichasSessao.value.find(item => item.id === ficha.id)?.dados
      return {
        id: `ameaca-${ficha.id}`,
        nome: ficha.nome || "Ameaça",
        personagemNome: ficha.nome || "Ameaça",
        imagem: ficha.imagem || null,
        tipo: "ameaca",
        iniciativaRolada: obterDadoIniciativa(dados),
        iniciativa: obterIniciativa(dados)
      }
    })

  return [...jogadores, ...ameacas]
})

function abrirMapaInterno() {
  mapaAberto.value = false
  mapaInternoAberto.value = true
}

function abrirPersonagem() {
  abrirSeletor("personagem")
}

function criarPersonagem() {
  const id = gerarIdJanela()
  const ficha = { id, tipo: "personagem", nome: "Sem nome", imagem: null, minimizada: false }
  personagensAbertos.value.push(ficha)
  fichasSessao.value.push({ ...ficha })
  janelaAtiva.value = id
}

function abrirAmeaca() {
  abrirSeletor("ameaca")
}

function criarAmeaca() {
  const id = gerarIdJanela()
  const ficha = { id, tipo: "ameaca", nome: "Sem nome", imagem: null, minimizada: false }
  ameacasAbertas.value.push(ficha)
  fichasSessao.value.push({ ...ficha })
  janelaAtiva.value = id
}

function abrirSeletor(tipo = "todas") {
  tipoSeletor.value = tipo
  seletorAberto.value = true
}

function criarFicha(tipo) {
  seletorAberto.value = false
  if (tipo === "ameaca") criarAmeaca()
  else criarPersonagem()
}

function abrirFichaSessao(id) {
  const ficha = fichasSessao.value.find(item => item.id === id)
  if (!ficha) return

  const lista = ficha.tipo === "ameaca" ? ameacasAbertas : personagensAbertos
  const janela = lista.value.find(item => item.id === id)
  if (janela) janela.minimizada = false
  else lista.value.push({ ...ficha, minimizada: false })
  seletorAberto.value = false
  janelaAtiva.value = id
}

function importarFicha({ arquivo, dados }) {
  const id = gerarIdJanela()
  const tipo = dados.tipo === "ameaca" ? "ameaca" : "personagem"
  const ficha = {
    id,
    tipo,
    nome: dados.dados.nome || "Sem nome",
    imagem: dados.dados.imagemAmeaca || dados.dados.imagemStatus || null,
    minimizada: false
  }
  const lista = tipo === "ameaca" ? ameacasAbertas : personagensAbertos
  lista.value.push(ficha)
  fichasSessao.value.push({ ...ficha })
  seletorAberto.value = false
  janelaAtiva.value = id
  importacaoPendente.value = { id, arquivo }
}

function gerarIdJanela() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function selecionarJanela(id) {
  janelaAtiva.value = id
  registrarJanelaEmFrente(`ficha-${id}`)
  const janela = encontrarJanela(id)
  if (janela) janela.minimizada = false
}

function registrarJanelaEmFrente(id) {
  janelaEmFrente.value = id
}

function minimizarJanela(id) {
  const todas = [...personagensAbertos.value, ...ameacasAbertas.value]
  todas.forEach(janela => {
    janela.minimizada = true
  })
  janelaAtiva.value = id
  abrirSeletor("todas")
}

function encontrarJanela(id) {
  return [...personagensAbertos.value, ...ameacasAbertas.value].find(janela => janela.id === id)
}

function atualizarNome(id, nome) {
  const janela = encontrarJanela(id)
  if (janela) janela.nome = nome || "Sem nome"
  const ficha = fichasSessao.value.find(item => item.id === id)
  if (ficha) ficha.nome = nome || "Sem nome"
  sincronizarComMestreSeVinculada(id)
}

function atualizarDadosFicha(id, dados) {
  const ficha = fichasSessao.value.find(item => item.id === id)
  if (ficha) ficha.dados = dados
  sincronizarParticipantesComBot()
}

function obterIniciativa(dados) {
  const dado = obterDadoIniciativa(dados)
  if (!Number.isInteger(dado)) return null
  const atributos = Array.isArray(dados?.atributos) ? dados.atributos : []
  const valor = sigla => Number(atributos.find(item => item?.nome === sigla)?.valor) || 0
  return valor("PRE") + valor("MEN") + dado
}

function obterDadoIniciativa(dados) {
  const dado = Number(dados?.iniciativaRolada)
  return Number.isInteger(dado) ? dado : null
}

function sincronizarParticipantesComBot() {
  if (sessaoEstado.papel !== "mestre" || !sessaoEstado.conectado) return
  clearTimeout(timeoutSincronizacaoIniciativa)
  timeoutSincronizacaoIniciativa = setTimeout(async () => {
    const participantes = sessaoEstado.jogadores
      .filter(jogador => jogador.papel === "jogador" && jogador.online)
      .map(jogador => {
        const ficha = jogador.fichaId ? sessaoEstado.fichasRemotas[jogador.fichaId] : null
        return {
          id: `jogador-${jogador.id}`,
          nome: ficha?.nome || jogador.fichaNome || jogador.nome || "Jogador",
          tipo: ficha?.tipo || "personagem",
          iniciativa: obterIniciativa(ficha?.dados)
        }
      })

    todasJanelas.value
      .filter(ficha => ficha.tipo === "ameaca" && !ficha.remota)
      .forEach(ficha => {
        const dados = fichasSessao.value.find(item => item.id === ficha.id)?.dados
        participantes.push({
          id: `ameaca-${ficha.id}`,
          nome: ficha.nome || "Ameaça",
          tipo: "ameaca",
          iniciativa: obterIniciativa(dados)
        })
      })

    const serializado = JSON.stringify(participantes)
    if (serializado === ultimaListaIniciativa) return
    ultimaListaIniciativa = serializado
    const usandoServidorLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    const baseConfigurada = (import.meta.env.VITE_BOT_API_URL || "").replace(/\/+$/, "")
    const base = baseConfigurada || (usandoServidorLocal ? "http://127.0.0.1:3001" : "")
    const headers = { "Content-Type": "application/json" }
    const chave = import.meta.env.VITE_BOT_API_KEY || ""
    if (chave) headers.Authorization = `Bearer ${chave}`

    try {
      const resposta = await fetch(`${base}/api/discord/initiative/roster`, {
        method: "POST",
        headers,
        body: JSON.stringify({ participantes })
      })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(dados.erro || "O bot recusou a lista de participantes.")
    } catch (erro) {
      console.warn("Não foi possível sincronizar participantes com o bot:", erro)
    }
  }, 300)
}

watch(
  () => [
    sessaoEstado.conectado,
    sessaoEstado.papel,
    sessaoEstado.jogadores,
    sessaoEstado.fichasRemotas,
    todasJanelas.value.map(ficha => `${ficha.id}:${ficha.nome}:${ficha.tipo}`)
  ],
  sincronizarParticipantesComBot,
  { deep: true, immediate: true }
)

function atualizarImagem(id, imagem) {
  const janela = encontrarJanela(id)
  if (janela) janela.imagem = imagem || null
  const ficha = fichasSessao.value.find(item => item.id === id)
  if (ficha) ficha.imagem = imagem || null
  sincronizarComMestreSeVinculada(id)
}

function restaurarJanela(id) {
  selecionarJanela(id)
}

function sincronizarComMestreSeVinculada(id) {
  if (sessaoEstado.papel !== "jogador") return
  if (sessaoEstado.fichaVinculadaId !== id) return
  const janela = encontrarJanela(id)
  if (!janela) return
  enviarSyncFichaParaMestre({
    id: janela.id,
    tipo: janela.tipo,
    nome: janela.nome,
    imagem: janela.imagem
  })
}

function fecharJanela(id) {
  personagensAbertos.value = personagensAbertos.value.filter(janela => janela.id !== id)
  ameacasAbertas.value = ameacasAbertas.value.filter(janela => janela.id !== id)
  selecionarOutraJanela(id)
}

function selecionarOutraJanela(idFechada) {
  if (janelaAtiva.value !== idFechada) return
  janelaAtiva.value = todasJanelas.value.find(janela => !janela.minimizada)?.id || null
}

function abrirAssistente() {
  assistenteAberto.value = true
}

function limparImportacao(id) {
  if (importacaoPendente.value?.id === id) importacaoPendente.value = null
}

// Espelha as fichas recebidas dos jogadores (via P2P) na lista que alimenta o Seletor de Fichas
watch(
  () => ({ ...sessaoEstado.fichasRemotas }),
  (remotas) => {
    Object.values(remotas).forEach(remota => {
      const existente = fichasSessao.value.find(f => f.id === remota.id)
      if (existente) {
        existente.nome = remota.nome
        existente.imagem = remota.imagem
        existente.tipo = remota.tipo
        existente.remota = true
        existente.donoNome = remota.dono
      } else {
        fichasSessao.value.push({
          id: remota.id,
          tipo: remota.tipo,
          nome: remota.nome,
          imagem: remota.imagem,
          minimizada: true,
          remota: true,
          donoNome: remota.dono
        })
      }

      // Também atualiza as janelas abertas se já estiverem em exibição
      const aberta = [...personagensAbertos.value, ...ameacasAbertas.value].find(j => j.id === remota.id)
      if (aberta) {
        aberta.nome = remota.nome
        aberta.imagem = remota.imagem
        aberta.tipo = remota.tipo
        aberta.remota = true
        aberta.donoNome = remota.dono
      }
    })
  },
  { deep: true }
)

</script>

<style>
.app-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>