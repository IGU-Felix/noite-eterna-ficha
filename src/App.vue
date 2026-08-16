<template>
  <div class="app-root">
    <Intro @entrar="abrirPersonagem" @abrir-ameaca="abrirAmeaca" />

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
import FichaFlutuante from "./components/FichaFlutuante.vue"

const personagemAberto = ref(false)
const ameacaAberta = ref(false)

function abrirPersonagem() {
  personagemAberto.value = true
}

function abrirAmeaca() {
  ameacaAberta.value = true
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