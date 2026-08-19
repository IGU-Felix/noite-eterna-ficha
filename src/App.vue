<template>
  <div class="app-root">
    <Intro @entrar="abrirPersonagem" @abrir-ameaca="abrirAmeaca" @consultar="abrirAssistente" />

    <Assistente v-if="assistenteAberto" @fechar="assistenteAberto = false" />

    <FichaFlutuante
      v-if="personagemAberto"
      tipo="personagem"
      @fechar="personagemAberto = false"
    />

    <FichaFlutuante
      v-if="ameacaAberta"
      tipo="ameaca"
      @fechar="ameacaAberta = false"
    />
  </div>
</template>

<script setup>
import { ref } from "vue"
import Intro from "./components/Intro.vue"
import Assistente from "./components/Assistente.vue"
import FichaFlutuante from "./components/FichaFlutuante.vue"

const personagemAberto = ref(false)
const ameacaAberta = ref(false)
const assistenteAberto = ref(false)

function abrirPersonagem() {
  personagemAberto.value = true
}

function abrirAmeaca() {
  ameacaAberta.value = true
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