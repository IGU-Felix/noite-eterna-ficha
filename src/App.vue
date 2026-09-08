<template>
  <div class="app-root">
    <Intro @entrar="abrirPersonagem" @abrir-ameaca="abrirAmeaca" @consultar="abrirAssistente" />

    <SeletorFichas v-if="seletorAberto" :fichas="fichasSessao" :tipo-inicial="tipoSeletor"
      @fechar="seletorAberto = false" @abrir="abrirFichaSessao" @criar="criarFicha"
      @importar="importarFicha" />

    <Assistente v-if="assistenteAberto" @fechar="assistenteAberto = false" />

    <FichaFlutuante
      v-if="todasJanelas.length"
      :fichas="todasJanelas"
      :ativa-id="janelaAtiva"
      :janela-em-frente-id="janelaEmFrente"
      :importacao-pendente="importacaoPendente"
      @selecionar="selecionarJanela"
      @nome-atualizado="atualizarNome"
      @imagem-atualizada="atualizarImagem"
      @importacao-concluida="limparImportacao"
      @nova-ficha="abrirSeletor"
      @minimizar="minimizarJanela"
      @restaurada="restaurarJanela"
      @fechar="fecharJanela"
      @topo="registrarJanelaEmFrente"
    />

  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import Intro from "./components/Intro.vue"
import Assistente from "./components/Assistente.vue"
import FichaFlutuante from "./components/FichaFlutuante.vue"
import SeletorFichas from "./components/SeletorFichas.vue"

const personagensAbertos = ref([])
const ameacasAbertas = ref([])
const fichasSessao = ref([])
const seletorAberto = ref(false)
const tipoSeletor = ref("todas")
const importacaoPendente = ref(null)
const assistenteAberto = ref(false)
const janelaAtiva = ref(null)
const janelaEmFrente = ref(null)
const todasJanelas = computed(() => [
  ...personagensAbertos.value.map(janela => ({ ...janela, tipo: "personagem" })),
  ...ameacasAbertas.value.map(janela => ({ ...janela, tipo: "ameaca" }))
])

function abrirPersonagem() {
  abrirSeletor()
}

function criarPersonagem() {
  const id = gerarIdJanela()
  const ficha = { id, tipo: "personagem", nome: "Sem nome", imagem: null, minimizada: false }
  personagensAbertos.value.push(ficha)
  fichasSessao.value.push({ ...ficha })
  janelaAtiva.value = id
}

function abrirAmeaca() {
  abrirSeletor()
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
  if (!lista.value.some(item => item.id === id)) lista.value.push({ ...ficha, minimizada: false })
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
}

function encontrarJanela(id) {
  return [...personagensAbertos.value, ...ameacasAbertas.value].find(janela => janela.id === id)
}

function atualizarNome(id, nome) {
  const janela = encontrarJanela(id)
  if (janela) janela.nome = nome || "Sem nome"
  const ficha = fichasSessao.value.find(item => item.id === id)
  if (ficha) ficha.nome = nome || "Sem nome"
}

function atualizarImagem(id, imagem) {
  const janela = encontrarJanela(id)
  if (janela) janela.imagem = imagem || null
  const ficha = fichasSessao.value.find(item => item.id === id)
  if (ficha) ficha.imagem = imagem || null
}

function restaurarJanela(id) {
  selecionarJanela(id)
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

</script>

<style>
.app-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

</style>