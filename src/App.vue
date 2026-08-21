<template>
  <div class="app-root">
    <Intro @entrar="abrirPersonagem" @abrir-ameaca="abrirAmeaca" @consultar="abrirAssistente" />

    <Assistente v-if="assistenteAberto" @fechar="assistenteAberto = false" />

    <FichaFlutuante
      v-if="todasJanelas.some(janela => !janela.minimizada)"
      :fichas="todasJanelas"
      :ativa-id="janelaAtiva"
      @selecionar="selecionarJanela"
      @nome-atualizado="atualizarNome"
      @nova-ficha="criarPersonagem"
      @minimizar="minimizarJanela"
      @restaurada="restaurarJanela"
      @fechar="fecharJanela"
    />

  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import Intro from "./components/Intro.vue"
import Assistente from "./components/Assistente.vue"
import FichaFlutuante from "./components/FichaFlutuante.vue"

const personagensAbertos = ref([])
const ameacasAbertas = ref([])
const assistenteAberto = ref(false)
const janelaAtiva = ref(null)
const todasJanelas = computed(() => [
  ...personagensAbertos.value.map(janela => ({ ...janela, tipo: "personagem" })),
  ...ameacasAbertas.value.map(janela => ({ ...janela, tipo: "ameaca" }))
])

function abrirPersonagem() {
  const existente = personagensAbertos.value[0]
  if (existente) {
    selecionarJanela(existente.id)
    return
  }

  criarPersonagem()
}

function criarPersonagem() {
  const id = gerarIdJanela()
  personagensAbertos.value.push({ id, tipo: "personagem", nome: "Sem nome", minimizada: false })
  janelaAtiva.value = id
}

function abrirAmeaca() {
  const existente = ameacasAbertas.value[0]
  if (existente) {
    selecionarJanela(existente.id)
    return
  }

  criarAmeaca()
}

function criarAmeaca() {
  const id = gerarIdJanela()
  ameacasAbertas.value.push({ id, tipo: "ameaca", nome: "Sem nome", minimizada: false })
  janelaAtiva.value = id
}

function gerarIdJanela() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function selecionarJanela(id) {
  janelaAtiva.value = id
  const janela = encontrarJanela(id)
  if (janela) janela.minimizada = false
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
</script>

<style>
.app-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

</style>