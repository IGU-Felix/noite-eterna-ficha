<template>
  <div class="app-root">
    <Intro @entrar="fichaAberta = true" />
    <FichaFlutuante v-if="fichaAberta" @fechar="fichaAberta = false" />
  </div>
</template>

<script setup>
import { ref } from "vue"
import Intro from "./components/Intro.vue"
import FichaFlutuante from "./components/FichaFlutuante.vue"

const fichaAberta = ref(false)
</script>

<style>
.app-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>