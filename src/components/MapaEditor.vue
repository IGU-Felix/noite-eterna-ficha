<template>
  <div class="janela-flutuante mapa-editor" :class="{ minimizada: false }" :style="estiloJanela" @mousedown.capture="ativarJanelaNoTopo">
    <div class="janela-barra" @mousedown="iniciarArraste">
      <span class="janela-titulo">🌐︎</span>
      <div class="janela-acoes">
        <button class="janela-btn" @click.stop="expandirMapa" title="Expandir">+ 5</button>
        <button class="janela-btn" @click.stop="alternarTelaCheia" title="Tela cheia">
          {{ modo === 'tela-cheia' ? '⤢' : '⛶' }}
        </button>
        <button class="janela-btn modo-btn" @click.stop="alternarModo" title="Alternar modo">
          {{ editorMode ? '2D' : 'ISO' }}
        </button>
        <button class="janela-btn" @click.stop="fechar" title="Fechar">X</button>
      </div>
    </div>
    <div class="paleta-terrenos" @mousedown.stop>
      <button v-for="ferramenta in ferramentas" :key="ferramenta.id" class="ferramenta-btn"
        :class="[`ferramenta-${ferramenta.id}`, { selecionado: ferramentaSelecionada === ferramenta.id }]" :title="ferramenta.nome"
        @click="selecionarFerramenta(ferramenta.id)">
        <img :src="ferramenta.icone" :alt="ferramenta.nome" />
      </button>
      <button class="amostras-toggle" :class="{ aberto: mostrarAmostras }"
        title="Mostrar amostras" @click="mostrarAmostras = !mostrarAmostras">
        <img src="/map_tools_icons/palet_icon.svg" alt="Amostras" />
      </button>
      <label class="controle-cor" title="Cor do terreno selecionado">
        <img src="/map_tools_icons/color_icon.svg" alt="Cor" />
        <span class="cor-preview" :style="{ backgroundColor: corSelecionada }"></span>
        <input v-model="corSelecionada" type="color" aria-label="Selecionar cor" />
      </label>
      <label v-if="mostrarTamanhoPincel" class="controle-pincel" title="Tamanho do pincel">
        <span>Pincel {{ tamanhoPincel }}x{{ tamanhoPincel }}</span>
        <input v-model.number="tamanhoPincel" type="range" min="1" max="5" step="1" />
      </label>
      <div v-if="mostrarAmostras" class="pasta-amostras" aria-label="Pasta de amostras">
        <button v-for="terreno in terrenos" :key="terreno.id" class="legenda-item"
          :class="{ selecionado: terrenoSelecionado === terreno.id }"
          :title="`Selecionar ${terreno.nome}`" @click="selecionarTerreno(terreno)">
          <span class="terreno-amostra" :style="{ background: terreno.cor }"></span>
          <span>{{ terreno.nome }}</span>
          <span v-if="terreno.personalizado" class="amostra-remover"
            title="Remover amostra" @click.stop="removerAmostra(terreno)">×</span>
        </button>
        <div class="nova-amostra">
          <input v-model="nomeNovaAmostra" class="nome-amostra" placeholder="Nome da amostra" maxlength="18" />
          <button class="adicionar-amostra" title="Adicionar amostra personalizada" @click="adicionarAmostra">+</button>
        </div>
      </div>
    </div>
    <div class="janela-corpo">
      <div class="grid" :class="{ isometrico: editorMode }" :style="gridStyle"
            @mousedown="iniciarPan" @wheel.prevent="ajustarZoom">
          <div v-for="cell in celulasVisiveis" :key="cell.id" class="cell" :data-id="cell.id"
            :style="{ ...posicaoCelula(cell), background: cell.cor || undefined }"
              :class="`terreno-${cell.terreno}`" @mousedown.stop="iniciarInteracao($event, cell)"
              @mouseenter="continuarPintura(cell)"></div>
        <template v-if="editorMode">
          <div v-for="unidade in unidades" :key="unidade.id"
            class="unidade-combate" :class="`unidade-${unidade.tipo}`"
            :style="posicaoUnidade(unidade)" :title="`${unidade.nome} - arraste para mover`"
            @pointerdown.stop.prevent="iniciarArrasteUnidade($event, unidade)">
            {{ unidade.icone }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

// Emits for closing the window
const emit = defineEmits(['fechar'])

// Grid configuration
const LIMITE_MAPA = 200
const INICIO_MAPA = 100
const gridSize = ref(4) // Start with a small playable area
const cellSize = ref(40) // pixel size of each cell
const mapPos = ref({ x: 0, y: 0 }) // Map position for panning
const modo = ref('flutuante')
const zoom = ref(1)
const tamanhoPincel = ref(1)
const mostrarAmostras = ref(false)
const mostrarTamanhoPincel = ref(false)
const unidades = ref([
  { id: 'jogador', nome: 'Investigador', tipo: 'aliado', icone: '◆', linha: INICIO_MAPA + 1, coluna: INICIO_MAPA },
  { id: 'ameaca', nome: 'Ameaça', tipo: 'inimigo', icone: '◇', linha: INICIO_MAPA + 1, coluna: INICIO_MAPA + 2 }
])
const ferramentaSelecionada = ref('lapis')
const ferramentas = [
  { id: 'lapis', nome: 'Lápis', icone: '/map_tools_icons/pencil_icon.svg' },
  { id: 'borracha', nome: 'Borracha', icone: '/map_tools_icons/eraser_icon.svg' },
  { id: 'balde', nome: 'Balde', icone: '/map_tools_icons/bucket_icon.svg' },
  { id: 'mao', nome: 'Mão', icone: '/map_tools_icons/hand_icon.svg' }
]

function selecionarFerramenta(id) {
  ferramentaSelecionada.value = id
  mostrarTamanhoPincel.value = id === 'lapis'
}
const terrenoSelecionado = ref('floresta')
const terrenos = ref([
  { id: 'vazio', nome: 'Vazio', cor: '#1a1a1a' },
  { id: 'floresta', nome: 'Floresta', cor: '#254d35' },
  { id: 'cidade', nome: 'Cidade', cor: '#6b6254' },
  { id: 'agua', nome: 'Água', cor: '#24506b' },
  { id: 'montanha', nome: 'Montanha', cor: '#5b5550' },
  { id: 'estrada', nome: 'Estrada', cor: '#9a7a45' }
])
const nomeNovaAmostra = ref('')
const CHAVE_PALETA = 'noite-eterna-pasta-amostras'

function selecionarTerreno(terreno) {
  terrenoSelecionado.value = terreno.id
}

function adicionarAmostra() {
  const nome = nomeNovaAmostra.value.trim()
  if (!nome) return
  const id = `personalizado-${Date.now()}`
  terrenos.value.push({ id, nome, cor: corSelecionada.value, personalizado: true })
  terrenoSelecionado.value = id
  nomeNovaAmostra.value = ''
}

function removerAmostra(terreno) {
  if (!terreno.personalizado) return
  const indice = terrenos.value.findIndex(item => item.id === terreno.id)
  if (indice === -1) return
  terrenos.value.splice(indice, 1)
  if (terrenoSelecionado.value === terreno.id) terrenoSelecionado.value = 'floresta'
}

watch(terrenos, valor => {
  localStorage.setItem(CHAVE_PALETA, JSON.stringify(valor))
}, { deep: true })
const corSelecionada = computed({
  get: () => terrenos.value.find(terreno => terreno.id === terrenoSelecionado.value)?.cor || '#1a1a1a',
  set: cor => {
    const terreno = terrenos.value.find(item => item.id === terrenoSelecionado.value)
    if (terreno) terreno.cor = cor
  }
})

const cells = ref(
  Array.from({ length: LIMITE_MAPA * LIMITE_MAPA }, (_, id) => ({
    id,
    linha: Math.floor(id / LIMITE_MAPA),
    coluna: id % LIMITE_MAPA,
    terreno: 'vazio',
    cor: null,
    revelada: Math.floor(id / LIMITE_MAPA) >= INICIO_MAPA
      && Math.floor(id / LIMITE_MAPA) < INICIO_MAPA + 3
      && id % LIMITE_MAPA >= INICIO_MAPA
      && id % LIMITE_MAPA < INICIO_MAPA + 3
  }))
)

const celulasVisiveis = computed(() => {
  const desenhadas = cells.value.filter(cell => cell.terreno !== 'vazio')
  if (!desenhadas.length) {
    return cells.value.filter(cell => cell.revelada)
  }

  const ocupadas = new Set(desenhadas.map(cell => cell.id))
  const minLinha = Math.max(0, Math.min(...desenhadas.map(cell => cell.linha)) - 1)
  const maxLinha = Math.min(LIMITE_MAPA - 1, Math.max(...desenhadas.map(cell => cell.linha)) + 1)
  const minColuna = Math.max(0, Math.min(...desenhadas.map(cell => cell.coluna)) - 1)
  const maxColuna = Math.min(LIMITE_MAPA - 1, Math.max(...desenhadas.map(cell => cell.coluna)) + 1)
  const visiveis = []

  for (let linha = minLinha; linha <= maxLinha; linha++) {
    for (let coluna = minColuna; coluna <= maxColuna; coluna++) {
      const id = linha * LIMITE_MAPA + coluna
      if (ocupadas.has(id)) {
        visiveis.push(cells.value[id])
        continue
      }

      let vizinhaOcupada = false
      for (let vizinhaLinha = Math.max(minLinha, linha - 1); vizinhaLinha <= Math.min(maxLinha, linha + 1); vizinhaLinha++) {
        for (let vizinhaColuna = Math.max(minColuna, coluna - 1); vizinhaColuna <= Math.min(maxColuna, coluna + 1); vizinhaColuna++) {
          if (ocupadas.has(vizinhaLinha * LIMITE_MAPA + vizinhaColuna)) vizinhaOcupada = true
        }
      }
      if (vizinhaOcupada) visiveis.push(cells.value[id])
    }
  }

  return visiveis
})

const limitesMapa = computed(() => {
  const visiveis = celulasVisiveis.value
  if (!visiveis.length) return { minLinha: 0, maxLinha: 0, minColuna: 0, maxColuna: 0 }
  return {
    minLinha: Math.min(...visiveis.map(cell => cell.linha)),
    maxLinha: Math.max(...visiveis.map(cell => cell.linha)),
    minColuna: Math.min(...visiveis.map(cell => cell.coluna)),
    maxColuna: Math.max(...visiveis.map(cell => cell.coluna))
  }
})

function posicaoCelula(cell) {
  return {
    'grid-column': cell.coluna - limitesMapa.value.minColuna + 1,
    'grid-row': cell.linha - limitesMapa.value.minLinha + 1
  }
}

function posicaoUnidade(unidade) {
  return {
    'grid-column': unidade.coluna - limitesMapa.value.minColuna + 1,
    'grid-row': unidade.linha - limitesMapa.value.minLinha + 1
  }
}

let pintando = false

let unidadeArrastada = null

function iniciarArrasteUnidade(event, unidade) {
  if (!editorMode.value || event.button !== 0) return
  unidadeArrastada = unidade
  window.addEventListener('pointermove', moverUnidade)
  window.addEventListener('pointerup', pararArrasteUnidade, { once: true })
}

function moverUnidade(event) {
  if (!unidadeArrastada) return
  const elemento = document.elementFromPoint(event.clientX, event.clientY)
  const celula = elemento?.closest('.cell')
  if (!celula) return

  const indice = Number(celula.dataset.id)
  const destino = cells.value[indice]
  if (destino) {
    unidadeArrastada.linha = destino.linha
    unidadeArrastada.coluna = destino.coluna
  }
}

function pararArrasteUnidade() {
  unidadeArrastada = null
  window.removeEventListener('pointermove', moverUnidade)
}

function iniciarInteracao(event, cell) {
  if (event.button !== 0) return

  if (ferramentaSelecionada.value === 'mao') {
    iniciarPan(event, 0)
  } else if (ferramentaSelecionada.value === 'balde') {
    preencherArea(cell)
  } else {
    iniciarPintura(cell)
  }
}

function iniciarPintura(cell) {
  pintando = true
  pintar(cell)
  atualizarTamanhoAposDesenho(cell)
  window.addEventListener('mouseup', pararPintura)
}

function continuarPintura(cell) {
  if (pintando && (ferramentaSelecionada.value === 'lapis' || ferramentaSelecionada.value === 'borracha')) {
    pintar(cell)
    atualizarTamanhoAposDesenho(cell)
  }
}

function pintar(cell) {
  const apagar = ferramentaSelecionada.value === 'borracha'
  const raio = Math.floor(tamanhoPincel.value / 2)

  for (let linha = cell.linha - raio; linha <= cell.linha + raio; linha++) {
    for (let coluna = cell.coluna - raio; coluna <= cell.coluna + raio; coluna++) {
      if (linha < 0 || coluna < 0 || linha >= LIMITE_MAPA || coluna >= LIMITE_MAPA) continue
      const celula = cells.value[linha * LIMITE_MAPA + coluna]
      celula.terreno = apagar ? 'vazio' : terrenoSelecionado.value
      celula.cor = apagar ? null : corSelecionada.value
    }
  }
}

function atualizarTamanhoAposDesenho(cell) {
  if (ferramentaSelecionada.value === 'borracha') {
    reduzirAreaVazia()
  } else {
    expandirSeNecessario(cell)
  }
}

function expandirSeNecessario(cell) {
  const raio = 1
  for (let linha = cell.linha - raio; linha <= cell.linha + raio; linha++) {
    for (let coluna = cell.coluna - raio; coluna <= cell.coluna + raio; coluna++) {
      if (linha < 0 || coluna < 0 || linha >= LIMITE_MAPA || coluna >= LIMITE_MAPA) continue
      cells.value[linha * LIMITE_MAPA + coluna].revelada = true
    }
  }
}

function reduzirAreaVazia() {
  const desenhadas = cells.value.filter(cell => cell.terreno !== 'vazio')
  if (!desenhadas.length) {
    cells.value.forEach(cell => {
      cell.revelada = cell.linha >= INICIO_MAPA && cell.linha < INICIO_MAPA + 3
        && cell.coluna >= INICIO_MAPA && cell.coluna < INICIO_MAPA + 3
    })
    return
  }

  const minLinha = Math.min(...desenhadas.map(cell => cell.linha))
  const maxLinha = Math.max(...desenhadas.map(cell => cell.linha))
  const minColuna = Math.min(...desenhadas.map(cell => cell.coluna))
  const maxColuna = Math.max(...desenhadas.map(cell => cell.coluna))

  cells.value.forEach(cell => {
    const dentroDaMargem = cell.linha >= Math.max(0, minLinha - 1)
      && cell.linha <= Math.min(LIMITE_MAPA - 1, maxLinha + 1)
      && cell.coluna >= Math.max(0, minColuna - 1)
      && cell.coluna <= Math.min(LIMITE_MAPA - 1, maxColuna + 1)
    cell.revelada = dentroDaMargem
  })
}

function preencherArea(cell) {
  const terrenoInicial = cell.terreno
  const terrenoFinal = ferramentaSelecionada.value === 'borracha'
    ? 'vazio'
    : terrenoSelecionado.value
  if (terrenoInicial === terrenoFinal) return

  const fila = [cell.id]
  const visitados = new Set([cell.id])
  const borda = new Set()

  while (fila.length) {
    const indice = fila.shift()
    const celulaAtual = cells.value[indice]
    celulaAtual.terreno = terrenoFinal
    celulaAtual.cor = corSelecionada.value
    const { linha, coluna } = celulaAtual
    const vizinhos = []

    if (coluna > 0) vizinhos.push(indice - 1)
    if (coluna < LIMITE_MAPA - 1) vizinhos.push(indice + 1)
    if (linha > 0) vizinhos.push(indice - LIMITE_MAPA)
    if (linha < LIMITE_MAPA - 1) vizinhos.push(indice + LIMITE_MAPA)

    vizinhos.forEach(vizinho => {
      const celulaVizinha = cells.value[vizinho]
      if (!celulaVizinha.revelada && celulaVizinha.terreno === 'vazio') {
        borda.add(vizinho)
      } else if (!visitados.has(vizinho) && celulaVizinha.terreno === terrenoInicial) {
        visitados.add(vizinho)
        fila.push(vizinho)
      }
    })
  }

  borda.forEach(indice => {
    cells.value[indice].revelada = true
    cells.value[indice].terreno = terrenoFinal
    cells.value[indice].cor = corSelecionada.value
  })
}

function ajustarZoom(event) {
  const incremento = event.deltaY < 0 ? 0.1 : -0.1
  zoom.value = Math.min(2, Math.max(0.5, Number((zoom.value + incremento).toFixed(2))))
}

function pararPintura() {
  pintando = false
  window.removeEventListener('mouseup', pararPintura)
}

// Method to expand the grid
function expandirMapa() {
  gridSize.value = Math.min(LIMITE_MAPA, gridSize.value + 5)
}

// Enable panning/zooming via mouse drag
let panning = false
let startPan = { x: 0, y: 0 }
function iniciarPan(e, botao = 1) {
  if (e.button !== botao) return
  panning = true
  startPan = { x: e.clientX - mapPos.value.x, y: e.clientY - mapPos.value.y }
  window.addEventListener('mousemove', moverPan)
  window.addEventListener('mouseup', pararPan)
}
function moverPan(e) {
  if (!panning) return
  mapPos.value.x = e.clientX - startPan.x
  mapPos.value.y = e.clientY - startPan.y
}
function pararPan() {
  panning = false
  window.removeEventListener('mousemove', moverPan)
  window.removeEventListener('mouseup', pararPan)
}

// Mode flag: true = orthographic editor (no perspective), false = isometric view
const editorMode = ref(true)
function alternarModo() {
  editorMode.value = !editorMode.value
}

// Floating window positioning – similar to FichaFlutuante
const pos = ref({ x: 80, y: 60 })
const tamanho = ref({ w: 800, h: 600 })
const estiloJanela = computed(() => {
  if (modo.value === 'tela-cheia') {
    return { left: '0px', top: '0px', width: '100vw', height: '100vh' }
  }
  return { left: pos.value.x + 'px', top: pos.value.y + 'px', width: tamanho.value.w + 'px', height: tamanho.value.h + 'px' }
})

// Drag handling (same pattern as other floating windows)
let arrastando = false
let offset = { x: 0, y: 0 }
function iniciarArraste(e) {
  if (modo.value !== 'flutuante') return
  arrastando = true
  offset.x = e.clientX - pos.value.x
  offset.y = e.clientY - pos.value.y
  window.addEventListener('mousemove', moverArraste)
  window.addEventListener('mouseup', pararArraste)
}
function moverArraste(e) {
  if (!arrastando) return
  pos.value.x = Math.max(0, e.clientX - offset.x)
  pos.value.y = Math.max(0, e.clientY - offset.y)
}
function pararArraste() {
  arrastando = false
  window.removeEventListener('mousemove', moverArraste)
  window.removeEventListener('mouseup', pararArraste)
}

function fechar() {
  emit('fechar')
}

function alternarTelaCheia() {
  modo.value = modo.value === 'tela-cheia' ? 'flutuante' : 'tela-cheia'
  if (modo.value === 'tela-cheia') {
    mapPos.value = { x: 0, y: 0 }
  }
}

function ativarJanelaNoTopo() {
  // Placeholder – global z‑index logic can be added later
}

// Grid styling – apply isometric transform when in isometric mode
const gridStyle = computed(() => {
  const base = {
    display: 'grid',
    'grid-template-columns': `repeat(${limitesMapa.value.maxColuna - limitesMapa.value.minColuna + 1}, ${cellSize.value}px)`,
    'grid-template-rows': `repeat(${limitesMapa.value.maxLinha - limitesMapa.value.minLinha + 1}, ${cellSize.value}px)`,
    gap: '0px',
    width: `${(limitesMapa.value.maxColuna - limitesMapa.value.minColuna + 1) * cellSize.value}px`,
    height: `${(limitesMapa.value.maxLinha - limitesMapa.value.minLinha + 1) * cellSize.value}px`,
    cursor: 'grab',
    transform: `translate(${mapPos.value.x}px, ${mapPos.value.y}px) scale(${zoom.value})`
  }
  if (editorMode.value) {
    // Simple isometric transform
    base.transform += ' rotateX(60deg) rotateZ(-45deg) scale(0.8)'
    base.transformOrigin = 'center center'
  }
  return base
})

onMounted(() => {
  const paletaSalva = localStorage.getItem(CHAVE_PALETA)
  if (!paletaSalva) return
  try {
    const amostras = JSON.parse(paletaSalva)
    if (Array.isArray(amostras) && amostras.length) terrenos.value = amostras
  } catch {
    localStorage.removeItem(CHAVE_PALETA)
  }
})
onBeforeUnmount(() => {
  pararPintura()
  pararPan()
})
</script>

<style scoped>
.janela-flutuante.mapa-editor {
  position: fixed;
  z-index: 200;
  background: #111;
  border: 1px solid #333;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  min-width: 480px;
  min-height: 320px;
  overflow: visible;
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
}

.janela-titulo {
  font-size: 12px;
  color: #d9a441;
}

.janela-acoes {
  display: flex;
  gap: 4px;
}

.janela-acoes .janela-btn {
  width: 26px;
  height: 22px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.janela-acoes .janela-btn:hover {
  border-color: #d9a441;
  color: #d9a441;
}

.paleta-terrenos {
  position: absolute;
  top: 34px;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 40px;
  box-sizing: border-box;
  padding: 8px 0;
  background: #1f1e1e;
  border-right: 1px solid #454545;
  overflow: visible;
}

.ferramenta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 24px;
  padding: 0 7px;
  background: transparent;
  border: 0;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
  box-sizing: border-box;
  align-self: center;
  width: 34px;
  min-width: 34px;
  height: 30px;
  padding: 0;
}

.ferramenta-btn img,
.amostras-toggle img {
  display: block;
  width: 30px;
  height: 30px;
  object-fit: contain;
  flex: 0 0 30px;
  filter: brightness(0.86);
  transition: filter 0.2s ease;
}

.ferramenta-btn > span:last-child,
.amostras-toggle > span:last-child,
.controle-cor > span,
.controle-pincel > span {
  display: none;
}

.ferramenta-btn:hover,
.ferramenta-btn.selecionado {
  color: #f3be58;
}

.ferramenta-btn:hover img,
.amostras-toggle:hover img,
.amostras-toggle.aberto img {
  filter: brightness(1.3) drop-shadow(0 0 4px rgba(219, 218, 216, 0.274));
}

.ferramenta-btn.selecionado img {
  filter: brightness(1.22) drop-shadow(0 0 3px rgba(219, 218, 216, 0.274));
  animation: icone-selecionado-pulsar 1.8s ease-in-out infinite;
}

.ferramenta-btn.selecionado {
  animation: botao-selecionado-pulsar 1.8s ease-in-out infinite;
}

@keyframes botao-selecionado-pulsar {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

@keyframes icone-selecionado-pulsar {
  0%, 100% {
    filter: brightness(1.12) drop-shadow(0 0 -1px rgba(219, 218, 216, 0.274));
  }
  50% {
    filter: brightness(1.42) drop-shadow(0 0 4px rgba(250, 249, 249, 0.87));
  }
}

.paleta-divisor {
  width: 1px;
  height: 20px;
  flex: 0 0 1px;
  background: #1d1d1d;
}

.amostras-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 24px;
  padding: 0 7px;
  background: transparent;
  border: 0;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
  width: 34px;
  min-width: 34px;
  height: 30px;
  padding: 0;
  justify-content: center;
  box-sizing: border-box;
  align-self: center;
}

.amostras-toggle:hover,
.amostras-toggle.aberto {
  color: #f3be58;
}

.controle-cor,
.controle-pincel {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  width: 100%;
}

.controle-cor {
  position: relative;
  width: 34px;
  height: 30px;
  min-width: 34px;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 0;
  box-sizing: border-box;
  align-self: center;
}

.controle-cor input {
  position: absolute;
  inset: 0;
  z-index: 4;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.controle-cor > img {
  position: relative;
  z-index: 2;
  display: block;
  width: 28px;
  height: 28px;
  filter: brightness(0.86);
  transition: filter 0.2s ease;
}

.controle-cor:hover > img,
.controle-cor:focus-within > img {
  filter: brightness(1.25) drop-shadow(0 0 7px rgba(255, 255, 255, 0.55));
}

.cor-preview {
  position: absolute;
  z-index: 3;
  display: block;
  left: 12px;
  top: 10px;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.controle-pincel {
  position: absolute;
  top: 10px;
  left: calc(100% + 5px);
  z-index: 31;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  width: 112px;
  padding: 8px;
  background: #181818;
  border: 1px solid #3a3a3a;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
}

.controle-pincel > span {
  display: block;
  color: #d9a441;
}

.controle-pincel input {
  width: 100%;
  accent-color: #d9a441;
}

.pasta-amostras {
  position: absolute;
  top: 72px;
  left: calc(100% + 5px);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  width: 220px;
  padding: 5px;
  background: #181818;
  border: 1px solid #3a3a3a;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
}

.legenda-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: transparent;
  border: 1px solid transparent;
  color: #888;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
  white-space: nowrap;
}

.legenda-item:hover,
.legenda-item.selecionado {
  border-color: #d9a441;
  color: #eee;
}

.amostra-remover {
  margin-left: 2px;
  color: #777;
  font-size: 13px;
  line-height: 1;
}

.amostra-remover:hover {
  color: #bd6d62;
}

.nova-amostra {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding-left: 3px;
  border-left: 1px solid #3a3a3a;
}

.nome-amostra {
  width: 92px;
  height: 22px;
  padding: 0 5px;
  background: #202020;
  border: 1px solid #3a3a3a;
  color: #ddd;
  font: 10px "Aubrey", system-ui;
}

.nome-amostra::placeholder {
  color: #666;
}

.adicionar-amostra {
  width: 22px;
  height: 22px;
  background: #202020;
  border: 1px solid #3a3a3a;
  color: #d9a441;
  cursor: pointer;
}

.terreno-amostra {
  width: 11px;
  height: 11px;
  background: var(--cor-terreno);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.janela-corpo {
  flex: 1;
  overflow: hidden; /* Changed from auto */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin-left: 48px;
}

.grid {
  background: transparent;
  border: 0;
}

.cell {
  width: 100%;
  height: 100%;
  border: 0.1px solid #333;
  cursor: pointer;
}

.unidade-combate {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #f1f1f1;
  font-size: 25px;
  text-shadow: 0 2px 4px #000;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.unidade-combate:active {
  cursor: grabbing;
}

.unidade-aliado {
  color: #62a9c2;
}

.unidade-inimigo {
  color: #bd6d62;
}

.terreno-vazio {
  background: #1a1a1a;
}

.terreno-floresta {
  background: #254d35;
}

.terreno-cidade {
  background: #6b6254;
}

.terreno-agua {
  background: #24506b;
}

.terreno-montanha {
  background: #5b5550;
}

.terreno-estrada {
  background: #9a7a45;
}
</style>

