<template>
  <div class="seletor-overlay" @mousedown.self="fechar">
    <section class="seletor-janela" :style="estilo" @mousedown="ativar">
      <header class="seletor-barra" @mousedown="iniciarArraste">
        <span>Selecionar ficha</span>
        <button class="seletor-fechar" title="fechar" @mousedown.stop @click="fechar">×</button>
      </header>

      <div class="seletor-corpo" @mousedown.stop>
        <div class="seletor-topo">
          <div>
            <span class="seletor-legenda">Sessão atual</span>
            <h1>Fichas</h1>
          </div>
          <button class="seletor-importar" @click="abrirImportacao">Importar JSON</button>
          <input ref="inputImportacao" type="file" accept="application/json,.json" hidden
            @change="importarFicha" />
        </div>

        <div class="seletor-filtros">
          <button :class="{ ativo: filtro === 'todas' }" @click="filtro = 'todas'">Todas</button>
          <button :class="{ ativo: filtro === 'personagem' }" @click="filtro = 'personagem'">Personagens</button>
          <button :class="{ ativo: filtro === 'ameaca' }" @click="filtro = 'ameaca'">Ameaças</button>
        </div>

        <div v-if="fichasFiltradas.length" class="seletor-lista">
          <button v-for="ficha in fichasFiltradas" :key="ficha.id" class="ficha-card"
            @click="emit('abrir', ficha.id)">
            <img :src="ficha.imagem || icone(ficha.tipo)" :alt="ficha.tipo === 'ameaca' ? 'Ameaça' : 'Personagem'" />
            <span class="ficha-info">
              <small>{{ ficha.tipo === 'ameaca' ? 'Ameaça' : 'Personagem' }}</small>
              <strong>{{ ficha.nome || 'Sem nome' }}</strong>
            </span>
            <span class="ficha-abrir">Abrir</span>
          </button>
        </div>
        <p v-else class="seletor-vazio">Nenhuma ficha cadastrada nesta sessão.</p>

        <div class="seletor-acoes">
          <button @click="emit('criar', 'personagem')">+ Nova ficha</button>
          <button @click="emit('criar', 'ameaca')">+ Nova ameaça</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"

const props = defineProps({
  fichas: { type: Array, default: () => [] },
  tipoInicial: { type: String, default: "todas" }
})

const emit = defineEmits(["fechar", "abrir", "criar", "importar"])
const filtro = ref(props.tipoInicial === "todas" ? "todas" : props.tipoInicial)
const inputImportacao = ref(null)
const posicao = ref({ x: 0, y: 0 })
const arrastando = ref(false)
const deslocamento = ref({ x: 0, y: 0 })

const fichasFiltradas = computed(() => filtro.value === "todas"
  ? props.fichas
  : props.fichas.filter(ficha => ficha.tipo === filtro.value))

const estilo = computed(() => ({
  transform: `translate(calc(-50% + ${posicao.value.x}px), calc(-50% + ${posicao.value.y}px))`
}))

function icone(tipo) {
  return tipo === "ameaca" ? "/ameaca_icon.svg" : "/personagem_icon.svg"
}

function fechar() {
  emit("fechar")
}

function ativar(event) {
  event.stopPropagation()
}

function iniciarArraste(event) {
  arrastando.value = true
  deslocamento.value = { x: event.clientX - posicao.value.x, y: event.clientY - posicao.value.y }
  window.addEventListener("mousemove", mover)
  window.addEventListener("mouseup", pararArraste)
  event.preventDefault()
}

function mover(event) {
  if (!arrastando.value) return
  posicao.value = { x: event.clientX - deslocamento.value.x, y: event.clientY - deslocamento.value.y }
}

function pararArraste() {
  arrastando.value = false
  window.removeEventListener("mousemove", mover)
  window.removeEventListener("mouseup", pararArraste)
}

function abrirImportacao() {
  inputImportacao.value?.click()
}

async function importarFicha(event) {
  const input = event.target
  const arquivo = input.files?.[0]
  if (!arquivo) return

  try {
    const dados = JSON.parse(await arquivo.text())
    if (dados.formato !== "noite-eterna-ficha" || !dados.dados || typeof dados.dados !== "object") {
      throw new Error("O arquivo não é uma ficha válida.")
    }
    emit("importar", { arquivo, dados })
  } catch (erro) {
    window.alert(erro.message || "Não foi possível importar a ficha.")
  } finally {
    input.value = ""
  }
}
</script>

<style scoped>
.seletor-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  pointer-events: none;
}

.seletor-janela {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(620px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 32px));
  overflow: hidden;
  transform: translate(-50%, -50%);
  border: 1px solid #555;
  background: #101010;
  color: #ddd;
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.7);
  pointer-events: auto;
  font-family: "Aubrey", system-ui;
}

.seletor-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 12px;
  border-bottom: 1px solid #333;
  background: #171717;
  cursor: move;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.seletor-fechar {
  border: 0;
  background: transparent;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.seletor-fechar:hover {
  color: #fff;
}

.seletor-corpo {
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 104px);
}

.seletor-topo,
.seletor-filtros,
.seletor-acoes {
  display: flex;
  gap: 8px;
}

.seletor-topo {
  align-items: end;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #2a2a2a;
}

.seletor-legenda {
  color: #a37bd9;
  font-size: 9px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.seletor-topo h1 {
  margin: 4px 0 0;
  color: #eee;
  font-size: 22px;
  font-weight: 400;
}

.seletor-importar,
.seletor-acoes button,
.seletor-filtros button {
  border: 1px solid #444;
  background: transparent;
  color: #bbb;
  padding: 7px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
}

.seletor-importar:hover,
.seletor-acoes button:hover,
.seletor-filtros button:hover,
.seletor-filtros button.ativo {
  border-color: #d9a441;
  color: #fff;
}

.seletor-filtros {
  margin: 12px 0;
}

.seletor-lista {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}

.ficha-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border: 1px solid #303030;
  background: #151515;
  color: #ddd;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.ficha-card:hover {
  border-color: #d9a441;
}

.ficha-card img {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid #555;
}

.ficha-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}

.ficha-info small {
  color: #888;
  font-size: 9px;
  text-transform: uppercase;
}

.ficha-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 400;
}

.ficha-abrir {
  color: #d9a441;
  font-size: 10px;
}

.seletor-vazio {
  padding: 24px 0;
  color: #666;
  text-align: center;
  font-size: 11px;
}

.seletor-acoes button {
  flex: 1;
}
</style>
