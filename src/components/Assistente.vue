<template>
  <div class="assistente-fundo">
    <div class="assistente-janela" :style="estiloJanela()">

      <div class="assistente-barra" @mousedown="iniciarArraste">
        <span class="assistente-titulo">☾ Assistente de Regras — Noite Eterna</span>
        <button class="assistente-btn-fechar" @mousedown.stop @click="$emit('fechar')" title="fechar">×</button>
      </div>

      <div class="assistente-corpo" ref="corpoRef">
        <div class="assistente-boasvindas">
          Pergunte sobre atributos, perícias, combate, magias, insanidade, cargas, classes, raças ou qualquer outra
          regra do livro de <strong>Noite Eterna</strong>.
        </div>

        <div v-for="(m, i) in mensagens" :key="i" class="msg" :class="m.autor === 'usuario' ? 'msg-usuario' : 'msg-ia'">
          <div class="msg-autor">{{ m.autor === 'usuario' ? 'Você' : 'Assistente' }}</div>
          <div class="msg-texto">{{ m.texto }}</div>
        </div>

        <div v-if="carregando" class="msg msg-ia msg-carregando">
          <div class="msg-autor">Assistente</div>
          <div class="msg-texto">{{ textoCarregando }}</div>
        </div>

        <div v-if="erro" class="assistente-erro">{{ erro }}</div>
      </div>

      <form class="assistente-form" @submit.prevent="enviarPergunta">
        <textarea v-model="pergunta" class="assistente-input" placeholder="Digite sua dúvida sobre as regras..."
          rows="1" @keydown.enter.exact.prevent="enviarPergunta"></textarea>
        <button type="submit" class="assistente-btn-enviar" :disabled="carregando || !pergunta.trim()">
          Enviar
        </button>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue"
import { perguntarAoMestre } from "../services/gemini.js"

defineEmits(["fechar"])

const pergunta = ref("")
const mensagens = ref([])
const carregando = ref(false)
const erro = ref("")
const corpoRef = ref(null)
const textoCarregando = ref("consultando o livro de regras...")
const posicao = ref({ x: null, y: null })
let arrastando = false
let offset = { x: 0, y: 0 }

function estiloJanela() {
  if (posicao.value.x === null || posicao.value.y === null) return {}
  return {
    left: `${posicao.value.x}px`,
    top: `${posicao.value.y}px`,
    transform: "none"
  }
}

function iniciarArraste(e) {
  const janela = e.currentTarget.parentElement
  const caixa = janela.getBoundingClientRect()
  posicao.value = { x: caixa.left, y: caixa.top }
  offset = { x: e.clientX - caixa.left, y: e.clientY - caixa.top }
  arrastando = true
  window.addEventListener("mousemove", moverArraste)
  window.addEventListener("mouseup", pararArraste)
  e.preventDefault()
}

function moverArraste(e) {
  if (!arrastando) return
  posicao.value.x = Math.max(0, e.clientX - offset.x)
  posicao.value.y = Math.max(0, e.clientY - offset.y)
}

function pararArraste() {
  arrastando = false
  window.removeEventListener("mousemove", moverArraste)
  window.removeEventListener("mouseup", pararArraste)
}

async function rolarParaFinal() {
  await nextTick()
  if (corpoRef.value) corpoRef.value.scrollTop = corpoRef.value.scrollHeight
}

async function enviarPergunta() {
  const texto = pergunta.value.trim()
  if (!texto || carregando.value) return

  const historicoAnterior = mensagens.value.map(m => ({ autor: m.autor, texto: m.texto }))
  mensagens.value.push({ autor: "usuario", texto })
  pergunta.value = ""
  erro.value = ""
  carregando.value = true
  textoCarregando.value = "consultando o livro de regras..."
  rolarParaFinal()

  try {
    const resposta = await perguntarAoMestre(historicoAnterior, texto, (tentativa, total) => {
      textoCarregando.value = `modelo ocupado, tentando de novo (${tentativa}/${total})...`
    })
    mensagens.value.push({ autor: "ia", texto: resposta })
  } catch (e) {
    erro.value = e.message || "Não foi possível falar com a IA agora. Tente novamente."
  } finally {
    carregando.value = false
    rolarParaFinal()
  }
}
</script>

<style scoped>
.assistente-fundo {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assistente-janela {
  pointer-events: auto;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 640px;
  max-width: 92vw;
  height: 720px;
  max-height: 88vh;
  background: #111;
  border: 1px solid #333;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  font-family: system-ui;
}

.assistente-barra {
  height: 40px;
  flex-shrink: 0;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  cursor: move;
  user-select: none;
}

.assistente-titulo {
  font-family: "Aubrey", system-ui;
  font-size: 12px;
  letter-spacing: 1px;
  color: #d9a441;
  text-transform: uppercase;
}

.assistente-btn-fechar {
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assistente-btn-fechar:hover {
  border-color: #a83232;
  color: #a83232;
}

.assistente-corpo {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assistente-boasvindas {
  font-size: 12px;
  color: #777;
  line-height: 1.5;
  border: 1px dashed #2a2a2a;
  padding: 10px 12px;
}

.assistente-boasvindas strong {
  color: #d9a441;
}

.msg {
  max-width: 85%;
  padding: 8px 12px;
  border: 1px solid #2a2a2a;
}

.msg-usuario {
  align-self: flex-end;
  background: #1a1a1a;
  border-color: #333;
}

.msg-ia {
  align-self: flex-start;
  background: #161616;
  border-color: #2a2a2a;
}

.msg-autor {
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #d9a441;
  margin-bottom: 4px;
}

.msg-texto {
  font-size: 13px;
  color: #ddd;
  line-height: 1.5;
  white-space: pre-wrap;
}

.msg-carregando .msg-texto {
  color: #777;
  font-style: italic;
}

.assistente-erro {
  align-self: center;
  font-size: 12px;
  color: #d97a7a;
  border: 1px solid #4a2626;
  background: #1c1414;
  padding: 8px 12px;
}

.assistente-form {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #2a2a2a;
  background: #141414;
}

.assistente-input {
  flex: 1;
  resize: none;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #eee;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  line-height: 1.4;
}

.assistente-input:focus {
  outline: none;
  border-color: #d9a441;
}

.assistente-btn-enviar {
  background: transparent;
  border: 1px solid #d9a441;
  color: #d9a441;
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 0 16px;
  cursor: pointer;
}

.assistente-btn-enviar:hover:not(:disabled) {
  background: #d9a441;
  color: #111;
}

.assistente-btn-enviar:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
