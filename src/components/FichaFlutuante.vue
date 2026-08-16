<template>
  <div v-show="modo !== 'minimizada'" class="janela-flutuante" :class="{ 'tela-cheia': modo === 'tela-cheia' }"
    :style="estiloJanela">
    <div class="janela-barra" @mousedown="iniciarArraste">
      <span class="janela-titulo">❖ {{ tituloBase }} ({{ nomePersonagem }})</span>

      <div class="janela-acoes" @mousedown.stop>
        <button class="janela-btn" @click="minimizar" title="minimizar">–</button>
        <button class="janela-btn" @click="alternarTelaCheia"
          :title="modo === 'tela-cheia' ? 'restaurar janela' : 'tela cheia'">{{ modo === 'tela-cheia' ? '❐' : '⛶'
          }}</button>
        <button class="janela-btn btn-fechar" @click="$emit('fechar')" title="fechar">X</button>
      </div>
    </div>

    <div class="janela-corpo">
      <component :is="componenteFicha" ref="fichaRef" />
    </div>

    <div v-if="modo === 'flutuante'" class="janela-resize" @mousedown="iniciarResize"></div>
  </div>

  <!-- ABA MINIMIZADA -->
  <button v-if="modo === 'minimizada'" class="aba-minimizada" @click="restaurar">
    ❖ Ficha de {{ nomePersonagem }} <span class="aba-seta">▲</span>
  </button>
</template>

<script setup>
import { ref, computed } from "vue"
import Ficha from "./Ficha.vue"
import FichaAmeaca from "./FichaAmeaca.vue"

const props = defineProps({
  tipo: { type: String, default: "personagem" } // "personagem" | "ameaca"
})

const fichaRef = ref(null)
const nomePersonagem = computed(() => fichaRef.value?.nome || "Sem Nome")

defineEmits(["fechar"])

const componenteFicha = computed(() => props.tipo === "ameaca" ? FichaAmeaca : Ficha)
const tituloBase = computed(() => props.tipo === "ameaca" ? "Ameaça" : "Ficha")

// 'flutuante' | 'tela-cheia' | 'minimizada'
const modo = ref("flutuante")
let modoAntesDeMinimizar = "flutuante"

const pos = ref({ x: 60, y: 40 })
const tamanho = ref({ w: 1360, h: 820 })

const estiloJanela = computed(() => {
  if (modo.value === "tela-cheia") {
    return { left: "0px", top: "0px", width: "100vw", height: "100vh" }
  }
  return {
    left: pos.value.x + "px",
    top: pos.value.y + "px",
    width: tamanho.value.w + "px",
    height: tamanho.value.h + "px"
  }
})

function minimizar() {
  modoAntesDeMinimizar = modo.value
  modo.value = "minimizada"
}

function restaurar() {
  modo.value = modoAntesDeMinimizar
}

function alternarTelaCheia() {
  modo.value = modo.value === "tela-cheia" ? "flutuante" : "tela-cheia"
}

// ===== ARRASTAR (só faz sentido no modo flutuante) =====
let arrastando = false
let offset = { x: 0, y: 0 }

function iniciarArraste(e) {
  if (modo.value !== "flutuante") return
  arrastando = true
  offset.x = e.clientX - pos.value.x
  offset.y = e.clientY - pos.value.y
  window.addEventListener("mousemove", moverArraste)
  window.addEventListener("mouseup", pararArraste)
}

function moverArraste(e) {
  if (!arrastando) return
  pos.value.x = Math.max(0, e.clientX - offset.x)
  pos.value.y = Math.max(0, e.clientY - offset.y)
}

function pararArraste() {
  arrastando = false
  window.removeEventListener("mousemove", moverArraste)
  window.removeEventListener("mouseup", pararArraste)
}

// ===== REDIMENSIONAR =====
let redimensionando = false
let inicioResize = { x: 0, y: 0, w: 0, h: 0 }

function iniciarResize(e) {
  redimensionando = true
  inicioResize = { x: e.clientX, y: e.clientY, w: tamanho.value.w, h: tamanho.value.h }
  window.addEventListener("mousemove", moverResize)
  window.addEventListener("mouseup", pararResize)
  e.stopPropagation()
}

function moverResize(e) {
  if (!redimensionando) return
  tamanho.value.w = Math.max(480, inicioResize.w + (e.clientX - inicioResize.x))
  tamanho.value.h = Math.max(320, inicioResize.h + (e.clientY - inicioResize.y))
}

function pararResize() {
  redimensionando = false
  window.removeEventListener("mousemove", moverResize)
  window.removeEventListener("mouseup", pararResize)
}
</script>

<style scoped>
.janela-flutuante {
  position: fixed;
  z-index: 100;
  background: #111;
  border: 1px solid #333;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  min-width: 480px;
  min-height: 320px;
}

.janela-flutuante.tela-cheia {
  border: none;
  box-shadow: none;
}

.janela-barra {
  height: 34px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}

.janela-flutuante.tela-cheia .janela-barra {
  cursor: default;
}

.janela-titulo {
  font-size: 11px;
  letter-spacing: 1px;
  color: #d9a441;
  text-transform: uppercase;
  font-family: "Aubrey", system-ui;
}

.janela-acoes {
  display: flex;
  gap: 4px;
}

.janela-btn {
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.janela-btn:hover {
  border-color: #d9a441;
  color: #d9a441;
}

.janela-btn.btn-fechar:hover {
  border-color: #a83232;
  color: #a83232;
}

.janela-corpo {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.janela-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}

.janela-resize::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #555;
  border-bottom: 2px solid #555;
}

/* ===== ABA MINIMIZADA ===== */
.aba-minimizada {
  position: fixed;
  right: 24px;
  bottom: 0;
  z-index: 100;
  background: #1a1a1a;
  border: 1px solid #333;
  border-bottom: none;
  color: #d9a441;
  font-family: "Aubrey", system-ui;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 8px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s ease;
}

.aba-minimizada:hover {
  background: #242424;
}

.aba-seta {
  color: #666;
}
</style>