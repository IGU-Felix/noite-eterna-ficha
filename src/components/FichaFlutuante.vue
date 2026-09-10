<template>
  <div class="janela-flutuante" :class="{ 'tela-cheia': modo === 'tela-cheia', minimizada: fichaAtiva?.minimizada }"
    :style="[estiloJanela, { zIndex: zIndexAtiva }]" @mousedown.capture="ativarJanelaNoTopo">
    <div class="janela-barra" @mousedown="iniciarArraste">
      <span class="janela-titulo">❖ {{ tituloBase }} ({{ nomePersonagem }})</span>

      <div class="janela-acoes" @mousedown.stop>
        <button class="janela-btn" @click="abrirImportacao" title="importar ficha JSON">🗁</button>
        <button class="janela-btn" @click="salvarFicha" title="salvar ficha em JSON">⇩</button>
        <input ref="inputImportacao" type="file" accept="application/json,.json" hidden @change="importarFicha" />
        <button class="janela-btn" @click="abrirAssistente" title="assistente de regras">☾</button>
        <button class="janela-btn" style="margin-left: 5px;" @click="minimizar" title="minimizar">-</button>
        <button class="janela-btn" @click.stop="alternarTelaCheia"
          :title="modo === 'tela-cheia' ? 'restaurar janela' : 'tela cheia'">{{ modo === 'tela-cheia' ? '⿻' : '⛶'
          }}</button>
        <button class="janela-btn btn-fechar" @click="emitirFechamento" title="fechar">X</button>
      </div>
    </div>

    <nav v-if="fichas.length" class="janela-abas" aria-label="Fichas abertas" @mousedown.stop>
      <div v-for="ficha in fichas" :key="ficha.id" class="janela-aba"
        :class="{ minimizada: ficha.minimizada, ativa: ficha.id === ativaId }" role="button" tabindex="0"
        @click.stop="selecionarFicha(ficha)">
        <img class="janela-aba-icone" :src="ficha.tipo === 'ameaca' ? '/ameaca_icon.svg' : '/personagem_icon.svg'"
          :alt="ficha.tipo === 'ameaca' ? 'Ameaça' : 'Ficha'" />
        {{ ficha.nome || "Sem nome" }}
      </div>
      <button class="janela-aba-adicionar" title="nova ficha" @click.stop="emitirNovaFicha">+</button>
    </nav>

    <div v-if="!fichaAtiva?.minimizada" class="janela-corpo">
      <KeepAlive>
        <component :is="componenteFicha" :key="ativaId" :persist-key="`ficha-${ativaId}`" :ficha-id="ativaId"
          ref="fichaRef" />
      </KeepAlive>
    </div>

    <template v-if="modo === 'flutuante' && !fichaAtiva?.minimizada">
      <div v-for="direcao in direcoesResize" :key="direcao" class="janela-resize" :class="`resize-${direcao}`"
        @mousedown="iniciarResize($event, direcao)"></div>
    </template>

    <Assistente v-if="assistenteAberto" @fechar="assistenteAberto = false" />
  </div>

</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue"
import Assistente from "./Assistente.vue"
import Ficha from "./Ficha.vue"
import FichaAmeaca from "./FichaAmeaca.vue"
import FichaRemotaVisualizacao from "./FichaRemotaVisualizacao.vue"
import { sessaoEstado, enviarSyncFichaParaMestre } from "../services/sessaoP2P.js"

const props = defineProps({
  fichas: { type: Array, default: () => [] },
  ativaId: { type: [String, Number], default: null },
  janelaEmFrenteId: { type: [String, Number, null], default: null },
  importacaoPendente: { type: Object, default: null }
})

const fichas = computed(() => props.fichas)

const fichaRef = ref(null)
const inputImportacao = ref(null)
const fichaAtiva = computed(() => fichas.value.find(ficha => ficha.id === props.ativaId))
const nomePersonagem = computed(() => fichaRef.value?.nome || "Sem Nome")
const imagemPersonagem = computed(() =>
  fichaRef.value?.imagemStatus || fichaRef.value?.imagemAmeaca || null
)

const emit = defineEmits(["fechar", "minimizada", "restaurada", "selecionar", "minimizar", "nome-atualizado", "imagem-atualizada", "importacao-concluida", "nova-ficha", "topo"])

const componenteFicha = computed(() => {
  if (fichaAtiva.value?.remota) return FichaRemotaVisualizacao
  return fichaAtiva.value?.tipo === "ameaca" ? FichaAmeaca : Ficha
})
const tituloBase = computed(() => fichaAtiva.value?.tipo === "ameaca" ? "Ameaça" : "Ficha")
const painelId = computed(() => `ficha-${props.ativaId ?? "none"}`)
const janelaAtivaGlobal = ref(typeof window !== "undefined" ? window.__janelaAtivaGeral || null : null)

function ativarJanelaNoTopo() {
  const payload = { id: painelId.value, tipo: "ficha", fichaId: props.ativaId }
  janelaAtivaGlobal.value = payload
  emit("topo", painelId.value)
  if (typeof window !== "undefined") {
    window.__janelaAtivaGeral = payload
    window.dispatchEvent(new CustomEvent("janela-ativa-global", { detail: payload }))
  }
}

function tratarJanelaAtivaGlobal(event) {
  janelaAtivaGlobal.value = event.detail || (typeof window !== "undefined" ? window.__janelaAtivaGeral : null)
}

const zIndexAtiva = computed(() => {
  if (typeof window !== "undefined" && window.__janelaAtivaGeral === painelId.value) return 350
  return 200
})

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("janela-ativa-global", tratarJanelaAtivaGlobal)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("janela-ativa-global", tratarJanelaAtivaGlobal)
  }
  clearTimeout(timeoutSyncCompleto)
})

watch(nomePersonagem, nome => {
  if (fichaAtiva.value?.remota) return
  if (props.ativaId !== null) emit("nome-atualizado", props.ativaId, nome)
}, { immediate: true })

watch(imagemPersonagem, imagem => {
  if (fichaAtiva.value?.remota) return
  if (props.ativaId !== null) emit("imagem-atualizada", props.ativaId, imagem)
}, { immediate: true })

// Sincroniza a FICHA INTEIRA com o Mestre (debounce de 400ms pra não disparar a cada tecla)
let timeoutSyncCompleto = null

watch(() => {
  if (sessaoEstado.papel !== "jogador") return null
  if (sessaoEstado.fichaVinculadaId !== props.ativaId) return null
  if (fichaAtiva.value?.remota) return null
  return fichaRef.value?.obterSnapshot?.() || null
}, (snapshot) => {
  if (!snapshot) return

  clearTimeout(timeoutSyncCompleto)
  timeoutSyncCompleto = setTimeout(() => {
    enviarSyncFichaParaMestre({
      id: props.ativaId,
      tipo: fichaAtiva.value?.tipo || "personagem",
      nome: snapshot.nome || "Sem Nome",
      imagem: snapshot.imagemStatus || snapshot.imagemAmeaca || null,
      dados: snapshot
    })
  }, 400)
}, { deep: true })

watch(() => [props.importacaoPendente, fichaRef.value, props.ativaId], async ([pendente, ficha, ativaId]) => {
  if (!pendente || pendente.id !== ativaId || !ficha?.importarJson) return

  try {
    await nextTick()
    await ficha.importarJson(pendente.arquivo)
    emit("importacao-concluida", pendente.id)
  } catch (erro) {
    window.alert(erro.message || "Não foi possível importar a ficha.")
  }
}, { immediate: true, flush: "post" })

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
  fichaRef.value?.salvarAgora?.()
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

function salvarFicha() {
  fichaRef.value?.exportarJson?.()
}

function abrirImportacao() {
  inputImportacao.value?.click()
}

async function importarFicha(event) {
  const input = event.target
  const arquivo = input.files?.[0]
  if (!arquivo) return

  try {
    await fichaRef.value?.importarJson?.(arquivo)
  } catch (erro) {
    window.alert(erro.message || "Não foi possível importar a ficha.")
  } finally {
    input.value = ""
  }
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

defineExpose({
  nome: nomePersonagem
})
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
  margin-right: 2px;
  margin-left: -3px;
  vertical-align: -1px;
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