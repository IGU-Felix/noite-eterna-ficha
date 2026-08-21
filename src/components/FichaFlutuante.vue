<template>
  <div class="janela-flutuante"
    :class="{ 'tela-cheia': modo === 'tela-cheia', minimizada: fichaAtiva?.minimizada }"
    :style="estiloJanela">
    <div class="janela-barra" @mousedown="iniciarArraste">
      <span class="janela-titulo">❖ {{ tituloBase }} ({{ nomePersonagem }})</span>

      <div class="janela-acoes" @mousedown.stop>
        <button class="janela-btn" @click="minimizar" title="minimizar">–</button>
        <button class="janela-btn" @click="abrirAssistente" title="assistente de regras">☾</button>
        <button class="janela-btn" @click.stop="alternarTelaCheia"
          :title="modo === 'tela-cheia' ? 'restaurar janela' : 'tela cheia'">{{ modo === 'tela-cheia' ? '❐' : '⛶'
          }}</button>
        <button class="janela-btn btn-fechar" @click="emitirFechamento" title="fechar">X</button>
      </div>
    </div>

    <nav v-if="fichas.length" class="janela-abas" aria-label="Fichas abertas" @mousedown.stop>
      <div v-for="ficha in fichas" :key="ficha.id" class="janela-aba"
        :class="{ minimizada: ficha.minimizada, ativa: ficha.id === ativaId }" role="button" tabindex="0"
        @click.stop="selecionarFicha(ficha)">
        <img class="janela-aba-icone"
          :src="ficha.tipo === 'ameaca' ? '/ameaca_icon.svg' : '/personagem_icon.svg'"
          :alt="ficha.tipo === 'ameaca' ? 'Criatura' : 'Personagem'" />
        {{ ficha.nome || "Sem nome" }}
      </div>
      <button class="janela-aba-adicionar" title="nova ficha" @click.stop="emitirNovaFicha">+</button>
    </nav>

    <div v-if="!fichaAtiva?.minimizada" class="janela-corpo">
      <KeepAlive>
        <component :is="componenteFicha" :key="ativaId" :persist-key="`ficha-${ativaId}`" ref="fichaRef" />
      </KeepAlive>
    </div>

    <template v-if="modo === 'flutuante' && !fichaAtiva?.minimizada">
      <div v-for="direcao in direcoesResize" :key="direcao" class="janela-resize"
        :class="`resize-${direcao}`" @mousedown="iniciarResize($event, direcao)"></div>
    </template>

    <Assistente v-if="assistenteAberto" @fechar="assistenteAberto = false" />
  </div>

</template>

<script setup>
import { ref, computed, watch } from "vue"
import Assistente from "./Assistente.vue"
import Ficha from "./Ficha.vue"
import FichaAmeaca from "./FichaAmeaca.vue"

const props = defineProps({
  fichas: { type: Array, default: () => [] },
  ativaId: { type: [String, Number], default: null }
})

const fichas = computed(() => props.fichas)

const fichaRef = ref(null)
const fichaAtiva = computed(() => fichas.value.find(ficha => ficha.id === props.ativaId))
const nomePersonagem = computed(() => fichaRef.value?.nome || "Sem Nome")

const emit = defineEmits(["fechar", "minimizada", "restaurada", "selecionar", "minimizar", "nome-atualizado", "nova-ficha"])

const componenteFicha = computed(() => fichaAtiva.value?.tipo === "ameaca" ? FichaAmeaca : Ficha)
const tituloBase = computed(() => fichaAtiva.value?.tipo === "ameaca" ? "Ameaça" : "Ficha")

watch(nomePersonagem, nome => {
  if (props.ativaId !== null) emit("nome-atualizado", props.ativaId, nome)
}, { immediate: true })

// 'flutuante' | 'tela-cheia' | 'minimizada'
const modo = ref("flutuante")
const assistenteAberto = ref(false)

const pos = ref({ x: 60, y: 40 })
const tamanho = ref({ w: 1440, h: 980 })
const direcoesResize = ["n", "s", "e", "w", "ne", "nw", "se", "sw"]

function tamanhoPadrao(tipo) {
  return tipo === "ameaca"
    ? { w: 840, h: 850 }
    : { w: 1440, h: 980 }
}

watch(() => props.ativaId, () => {
  tamanho.value = tamanhoPadrao(fichaAtiva.value?.tipo)
}, { immediate: true })

const estiloJanela = computed(() => {
  if (modo.value === "tela-cheia") {
    return { left: "0px", top: "0px", width: "100vw", height: "100vh" }
  }
  if (fichaAtiva.value?.minimizada) {
    return {
      left: pos.value.x + "px",
      top: pos.value.y + "px",
      width: "520px",
      height: "70px"
    }
  }
  return {
    left: pos.value.x + "px",
    top: pos.value.y + "px",
    width: tamanho.value.w + "px",
    height: tamanho.value.h + "px"
  }
})

function minimizar() {
  if (props.ativaId !== null) emit("minimizar", props.ativaId)
}

function alternarTelaCheia() {
  modo.value = modo.value === "tela-cheia" ? "flutuante" : "tela-cheia"
}

function restaurar() {
  modo.value = "flutuante"
  emit("restaurada")
}

function selecionarFicha(ficha) {
  emit("selecionar", ficha.id)
}

function emitirNovaFicha() {
  emit("nova-ficha")
}

function emitirFechamento() {
  if (props.ativaId !== null) emit("fechar", props.ativaId)
}

function abrirAssistente() {
  assistenteAberto.value = true
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
let direcaoResize = "se"
let inicioResize = { x: 0, y: 0, posX: 0, posY: 0, w: 0, h: 0 }

function iniciarResize(e, direcao) {
  redimensionando = true
  direcaoResize = direcao
  inicioResize = {
    x: e.clientX,
    y: e.clientY,
    posX: pos.value.x,
    posY: pos.value.y,
    w: tamanho.value.w,
    h: tamanho.value.h
  }
  window.addEventListener("mousemove", moverResize)
  window.addEventListener("mouseup", pararResize)
  e.preventDefault()
  e.stopPropagation()
}

function moverResize(e) {
  if (!redimensionando) return
  const deltaX = e.clientX - inicioResize.x
  const deltaY = e.clientY - inicioResize.y
  const moveEsquerda = direcaoResize.includes("w")
  const moveTopo = direcaoResize.includes("n")
  const novaLargura = Math.max(480, inicioResize.w + (moveEsquerda ? -deltaX : deltaX))
  const novaAltura = Math.max(320, inicioResize.h + (moveTopo ? -deltaY : deltaY))

  tamanho.value.w = novaLargura
  tamanho.value.h = novaAltura

  if (moveEsquerda) {
    pos.value.x = inicioResize.posX + inicioResize.w - novaLargura
  }
  if (moveTopo) {
    pos.value.y = inicioResize.posY + inicioResize.h - novaAltura
  }
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
  max-width: calc(100vw - 80px);
  max-height: calc(100vh - 80px);
  box-sizing: border-box;
}

.janela-flutuante.tela-cheia {
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none;
  max-height: none;
  border: none;
  box-shadow: none;
}

.janela-flutuante.minimizada .janela-acoes {
  display: none;
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

.janela-abas {
  display: flex;
  gap: 4px;
  padding: 5px 8px 0;
  background: #111;
  border-bottom: 1px solid #2a2a2a;
  overflow-x: auto;
  flex-shrink: 0;
}

.janela-aba {
  flex: 0 0 auto;
  padding: 5px 9px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-bottom: none;
  color: #777;
  cursor: pointer;
  font-family: "Aubrey", system-ui;
  font-size: 10px;
  text-transform: uppercase;
}

.janela-aba-icone {
  width: 10px;
  height: 10px;
  margin-right:2px;
  vertical-align: -2px;
}

.janela-aba-adicionar {
  flex: 0 0 auto;
  width: 24px;
  padding: 0;
  background: transparent;
  border: 1px solid #333;
  border-bottom: none;
  color: #777;
  cursor: pointer;
  font-size: 16px;
}

.janela-aba-adicionar:hover {
  color: #d9a441;
  border-color: #d9a441;
}

.janela-aba:hover {
  color: #aaa;
}

.janela-aba.ativa {
  color: #d9a441;
  border-color: #d9a441;
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
  z-index: 2;
}

.resize-n,
.resize-s {
  left: 10px;
  right: 10px;
  height: 8px;
}

.resize-n {
  top: -4px;
  cursor: ns-resize;
}

.resize-s {
  bottom: -4px;
  cursor: ns-resize;
}

.resize-e,
.resize-w {
  top: 10px;
  bottom: 10px;
  width: 8px;
}

.resize-e {
  right: -4px;
  cursor: ew-resize;
}

.resize-w {
  left: -4px;
  cursor: ew-resize;
}

.resize-ne,
.resize-nw,
.resize-se,
.resize-sw {
  width: 14px;
  height: 14px;
}

.resize-ne {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}

.resize-nw {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}

.resize-se {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.resize-sw {
  left: -4px;
  bottom: -4px;
  cursor: nesw-resize;
}

.resize-se::after {
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
  color: #555555;
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

.aba-minimizada.aba-ameaca {
  right: 250px;
}

.aba-minimizada:hover {
  background: #242424;
}

.aba-seta {
  color: #666;
}
</style>