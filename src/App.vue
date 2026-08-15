<template>
  <Transition name="fade" mode="out-in">
    <Intro v-if="!entrou" key="intro" @entrar="entrou = true" />
    <Ficha v-else key="ficha" />
  </Transition>
</template>

<script setup>
import { ref } from "vue"
import Intro from "./components/Intro.vue"
import Ficha from "./components/Ficha.vue"

const entrou = ref(false)
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>