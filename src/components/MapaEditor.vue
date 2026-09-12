<template>
  <div class="janela-flutuante mapa-editor" :class="{ minimizada: false }" :style="estiloJanela"
    @mousedown.capture="ativarJanelaNoTopo">
    <div class="janela-barra" @mousedown="iniciarArraste">
      <span class="janela-titulo">🌐︎</span>
      <div class="janela-acoes">
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
        :class="[`ferramenta-${ferramenta.id}`, { selecionado: ferramentaSelecionada === ferramenta.id }]"
        :title="ferramenta.nome" @click="selecionarFerramenta(ferramenta.id)">
        <img :src="ferramenta.icone" :alt="ferramenta.nome" />
      </button>
      <button class="amostras-toggle" :class="{ aberto: mostrarAmostras }" title="Mostrar amostras"
        @click="mostrarAmostras = !mostrarAmostras">
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
          :class="{ selecionado: terrenoSelecionado === terreno.id }" :title="`Selecionar ${terreno.nome}`"
          @click="selecionarTerreno(terreno)">
          <span class="terreno-amostra" :style="{ background: terreno.cor }"></span>
          <span>{{ terreno.nome }}</span>
          <span v-if="terreno.personalizado" class="amostra-remover" title="Remover amostra"
            @click.stop="removerAmostra(terreno)">×</span>
        </button>
        <div class="nova-amostra">
          <input v-model="nomeNovaAmostra" class="nome-amostra" placeholder="Nome da amostra" maxlength="18" />
          <button class="adicionar-amostra" title="Adicionar amostra personalizada" @click="adicionarAmostra">+</button>
        </div>
      </div>
      <div v-if="mostrarObjetos" class="pasta-objetos" aria-label="Objetos criados">
        <div class="pasta-objetos-titulo">Objetos</div>
        <button v-for="objeto in objetosCriados" :key="objeto.id" class="objeto-amostra"
          :class="{ selecionado: objetoAtual?.id === objeto.id }" :title="`${objeto.nome} - duplo clique para editar`"
          @click="selecionarObjetoAmostra(objeto)" @dblclick.stop="abrirEditorAmostra(objeto)">
          <img v-if="objeto.imagem" :src="objeto.imagem" :alt="objeto.nome" />
          <span v-else>◇</span>
          <small>{{ objeto.nome }}</small>
        </button>
        <span v-if="!objetosCriados.length" class="objetos-vazio">Crie um objeto em um quadrado.</span>
      </div>
    </div>
    <div class="janela-corpo" :class="{ 'mao-ativa': ferramentaSelecionada === 'mao' }" @mousedown="iniciarPanNoCorpo">
      <div class="grid" :class="{ isometrico: editorMode }" :style="gridStyle" @mousedown="iniciarPan"
        @wheel.prevent="ajustarZoom">
        <div v-for="cell in celulasVisiveis" :key="cell.id" class="cell" :data-id="cell.id" :style="estiloCelula(cell)"
          :class="`terreno-${cell.terreno}`" @mousedown.stop="iniciarInteracao($event, cell)"
          @mouseenter="continuarPintura(cell)" @dblclick.stop="abrirEditorCelula(cell)">
          <div v-if="imagemObjeto(cell)" class="objeto-celula"
            :class="[{ 'objeto-arrastavel': ferramentaSelecionada === 'objeto' }, { 'objeto-parede': cell.orientacao === 'parede' }]"
            :style="estiloObjeto(cell)" @pointerdown.stop.prevent="iniciarArrasteObjeto($event, cell)">
            <img :src="imagemObjeto(cell)" :alt="cell.objetoNome || 'Objeto'" />
          </div>
        </div>
        <template v-if="editorMode">
          <div v-for="unidade in unidades" :key="unidade.id" class="unidade-combate" :class="`unidade-${unidade.tipo}`"
            :style="posicaoUnidade(unidade)" :title="`${unidade.nome} - arraste para mover`"
            @pointerdown.stop.prevent="iniciarArrasteUnidade($event, unidade)">
            {{ unidade.icone }}
          </div>
        </template>
      </div>
    </div>
    <div v-if="editorQuadradoAberto" class="editor-quadrado janela-flutuante" @mousedown.stop>
      <div class="editor-quadrado-barra">
        <span>Editar quadrado</span>
        <button class="janela-btn" @click="fecharEditorQuadrado">X</button>
      </div>
      <div class="editor-quadrado-corpo">
        <div class="visualizador-controles">
          <button :class="{ ativo: modoVisualizador === '2d' }" @click="modoVisualizador = '2d'">2D</button>
          <button :class="{ ativo: modoVisualizador === 'iso' }" @click="modoVisualizador = 'iso'">ISO</button>
          <button :class="{ ativo: modoVisualizador === 'desenho' }"
            @click="modoVisualizador = 'desenho'">Desenhar</button>
        </div>
        <div v-if="modoVisualizador !== 'desenho'" class="objeto-visualizador">
          <div class="celula-visualizador" :class="{ 'visualizador-iso': modoVisualizador === 'iso' }">
            <img v-if="imagemVisualizador" :src="imagemVisualizador" alt="Visualização do objeto"
              :style="estiloVisualizador" />
            <span v-else>Sem imagem</span>
          </div>
        </div>
        <canvas v-show="modoVisualizador === 'desenho'" ref="canvasTextura" width="240" height="240"
          class="canvas-textura" @pointerdown="iniciarDesenhoTextura" @pointermove="desenharTextura"
          @pointerup="pararDesenhoTextura" @pointerleave="pararDesenhoTextura"></canvas>
        <div class="objeto-editor">
          <input v-model="nomeObjetoEditado" class="objeto-nome" placeholder="Nome do objeto" maxlength="24" />
          <div class="objeto-arquivos">
            <input ref="inputObjeto2d" type="file" accept="image/*" hidden
              @change="carregarObjeto($event, 'objeto2d')" />
            <input ref="inputObjetoIso" type="file" accept="image/*" hidden
              @change="carregarObjeto($event, 'objetoIso')" />
            <button @click="inputObjeto2d?.click()">Ícone 2D</button>
            <button @click="inputObjetoIso?.click()">Modelo ISO</button>
          </div>
          <div class="objeto-orientacao">
            <button :class="{ ativo: orientacaoObjetoEditada === 'chao' }"
              @click="orientacaoObjetoEditada = 'chao'">Chão</button>
            <button :class="{ ativo: orientacaoObjetoEditada === 'parede' }"
              @click="orientacaoObjetoEditada = 'parede'">Parede</button>
          </div>
          <label v-if="orientacaoObjetoEditada === 'parede'" class="altura-objeto">
            Altura {{ alturaObjetoEditada }}x
            <input v-model.number="alturaObjetoEditada" type="range" min="1" max="4" step="0.5" />
          </label>
          <div v-if="orientacaoObjetoEditada === 'parede'" class="lado-parede">
            <button v-for="lado in ladosParede" :key="lado.id" :class="{ ativo: ladoParedeEditada === lado.id }"
              @click="ladoParedeEditada = lado.id">{{ lado.nome }}</button>
          </div>
          <div class="objeto-previews">
            <img v-if="objeto2dEditado" :src="objeto2dEditado" alt="Prévia 2D" />
            <img v-if="objetoIsoEditado" :src="objetoIsoEditado" alt="Prévia semi 3D" />
          </div>
          <div class="objeto-exemplo">
            <span>Exemplo no mapa</span>
            <div class="exemplo-cenarios">
              <div class="exemplo-cenario">
                <img v-if="objeto2dEditado" :src="objeto2dEditado" alt="Exemplo 2D" />
                <span v-else>2D</span>
              </div>
              <div class="exemplo-cenario exemplo-iso">
                <img v-if="objetoIsoEditado || objeto2dEditado" :src="objetoIsoEditado || objeto2dEditado"
                  alt="Exemplo isométrico" />
                <span v-else>ISO</span>
              </div>
            </div>
          </div>
        </div>
        <div class="editor-quadrado-acoes">
          <input ref="inputTextura" type="file" accept="image/*" hidden @change="carregarTextura" />
          <button @click="inputTextura?.click()">Imagem</button>
          <button @click="limparTextura">Limpar</button>
          <button class="aplicar-textura" @click="aplicarTextura">Aplicar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

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
const mostrarObjetos = ref(false)
const editorQuadradoAberto = ref(false)
const celulaEditada = ref(null)
const canvasTextura = ref(null)
const inputTextura = ref(null)
const inputObjeto2d = ref(null)
const inputObjetoIso = ref(null)
const nomeObjetoEditado = ref('')
const objeto2dEditado = ref(null)
const objetoIsoEditado = ref(null)
const orientacaoObjetoEditada = ref('chao')
const alturaObjetoEditada = ref(1)
const ladoParedeEditada = ref('norte')
const ladosParede = [
  { id: 'norte', nome: 'N' },
  { id: 'leste', nome: 'L' },
  { id: 'sul', nome: 'S' },
  { id: 'oeste', nome: 'O' }
]
const modoVisualizador = ref('visualizador')
const objetoAtual = ref(null)
const amostraObjetoEditada = ref(null)
const assinaturaObjetoOriginal = ref('')
let desenhandoTextura = false
const unidades = ref([
  { id: 'jogador', nome: 'Investigador', tipo: 'aliado', icone: '◆', linha: INICIO_MAPA + 1, coluna: INICIO_MAPA },
  { id: 'ameaca', nome: 'Ameaça', tipo: 'inimigo', icone: '◇', linha: INICIO_MAPA + 1, coluna: INICIO_MAPA + 2 }
])
const ferramentaSelecionada = ref('lapis')
const ferramentas = [
  { id: 'lapis', nome: 'Lápis', icone: '/map_tools_icons/pencil_icon.svg' },
  { id: 'borracha', nome: 'Borracha', icone: '/map_tools_icons/eraser_icon.svg' },
  { id: 'balde', nome: 'Balde', icone: '/map_tools_icons/bucket_icon.svg' },
  { id: 'mao', nome: 'Mão', icone: '/map_tools_icons/hand_icon.svg' },
  { id: 'objeto', nome: 'Objeto', icone: '/map_tools_icons/object_icon.svg' }
]

function selecionarFerramenta(id) {
  ferramentaSelecionada.value = id
  mostrarTamanhoPincel.value = id === 'lapis'
  mostrarObjetos.value = id === 'objeto'
}

function estiloCelula(cell) {
  return {
    ...posicaoCelula(cell),
    background: cell.cor || undefined,
    backgroundImage: cell.textura ? `url(${cell.textura})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
}

function estiloObjeto(cell) {
  const estilo = {}
  if (cell.orientacao === 'parede') {
    const lado = cell.ladoParede || 'norte'
    estilo.position = 'absolute'
    estilo.height = `${(cell.altura || 2) * 100}%`
    estilo.width = '84%'
    estilo.transform = transformacaoParede(lado)
    estilo.transformOrigin = origemParede(lado)
    Object.assign(estilo, posicaoParede(lado))
  }
  return estilo
}

function posicaoParede(lado) {
  const posicoes = {
    norte: { left: '8%', bottom: '0' },
    sul: { left: '8%', top: '0' },
    leste: { right: '0', bottom: '0' },
    oeste: { left: '0', bottom: '0' }
  }
  return posicoes[lado] || posicoes.norte
}

function transformacaoParede(lado) {
  const transformacoes = {
    norte: 'rotateX(-90deg)',
    leste: 'rotateY(90deg)',
    sul: 'rotateX(90deg)',
    oeste: 'rotateY(-90deg)'
  }
  return transformacoes[lado] || transformacoes.norte
}

function origemParede(lado) {
  const origens = {
    norte: 'bottom left',
    leste: 'bottom right',
    sul: 'top left',
    oeste: 'bottom left'
  }
  return origens[lado] || origens.norte
}

const imagemVisualizador = computed(() => modoVisualizador.value === 'iso'
  ? (objetoIsoEditado.value || objeto2dEditado.value)
  : objeto2dEditado.value)

const estiloVisualizador = computed(() => {
  const estilo = { objectFit: 'contain', transform: 'none' }
  if (orientacaoObjetoEditada.value === 'parede') {
    estilo.position = 'absolute'
    estilo.height = `${alturaObjetoEditada.value * 100}%`
    estilo.width = '84%'
    Object.assign(estilo, posicaoParede(ladoParedeEditada.value))
  }
  return estilo
})

function imagemObjeto(cell) {
  return editorMode.value
    ? (cell.objetoIso || cell.objeto2d)
    : (cell.objeto2d || cell.objetoIso)
}

function abrirEditorUltimaCelula() {
  const celula = celulasVisiveis.value.find(cell => cell.terreno !== 'vazio') || celulasVisiveis.value[0]
  if (celula) abrirEditorCelula(celula)
}

async function abrirEditorCelula(cell) {
  amostraObjetoEditada.value = null
  assinaturaObjetoOriginal.value = ''
  celulaEditada.value = cell
  nomeObjetoEditado.value = cell.objetoNome || ''
  objeto2dEditado.value = cell.objeto2d || null
  objetoIsoEditado.value = cell.objetoIso || null
  orientacaoObjetoEditada.value = cell.orientacao || 'chao'
  alturaObjetoEditada.value = cell.altura || 1
  ladoParedeEditada.value = cell.ladoParede || 'norte'
  modoVisualizador.value = 'visualizador'
  objetoAtual.value = cell.objetoNome || cell.objeto2d || cell.objetoIso
    ? {
      nome: cell.objetoNome || 'Objeto',
      objeto2d: cell.objeto2d || null,
      objetoIso: cell.objetoIso || null,
      orientacao: cell.orientacao || 'chao',
      altura: cell.altura || 1,
      ladoParede: cell.ladoParede || 'norte'
    }
    : null
  editorQuadradoAberto.value = true
  await nextTick()
  desenharTexturaExistente()
}

async function abrirEditorAmostra(objeto) {
  const celula = cells.value.find(cell => {
    const assinatura = `${cell.objetoNome}|${cell.objeto2d || ''}|${cell.objetoIso || ''}`
    return assinatura === objeto.id
  })
  if (!celula) return

  amostraObjetoEditada.value = objeto
  assinaturaObjetoOriginal.value = objeto.id
  celulaEditada.value = { ...celula }
  nomeObjetoEditado.value = objeto.nome || ''
  objeto2dEditado.value = objeto.objeto2d || null
  objetoIsoEditado.value = objeto.objetoIso || null
  orientacaoObjetoEditada.value = objeto.orientacao || 'chao'
  alturaObjetoEditada.value = objeto.altura || 1
  ladoParedeEditada.value = objeto.ladoParede || 'norte'
  modoVisualizador.value = 'visualizador'
  editorQuadradoAberto.value = true
  await nextTick()
  desenharTexturaExistente()
}

function fecharEditorQuadrado() {
  editorQuadradoAberto.value = false
  celulaEditada.value = null
  amostraObjetoEditada.value = null
  assinaturaObjetoOriginal.value = ''
}

function contextoTextura() {
  return canvasTextura.value?.getContext('2d') || null
}

function desenharTexturaExistente() {
  const contexto = contextoTextura()
  if (!contexto) return
  contexto.clearRect(0, 0, 240, 240)
  if (!celulaEditada.value?.textura) return
  const imagem = new Image()
  imagem.onload = () => contexto.drawImage(imagem, 0, 0, 240, 240)
  imagem.src = celulaEditada.value.textura
}

function pontoCanvas(event) {
  const retangulo = canvasTextura.value.getBoundingClientRect()
  return {
    x: (event.clientX - retangulo.left) * (240 / retangulo.width),
    y: (event.clientY - retangulo.top) * (240 / retangulo.height)
  }
}

function iniciarDesenhoTextura(event) {
  desenhandoTextura = true
  canvasTextura.value.setPointerCapture(event.pointerId)
  desenharTextura(event)
}

function desenharTextura(event) {
  if (!desenhandoTextura) return
  const contexto = contextoTextura()
  const ponto = pontoCanvas(event)
  contexto.fillStyle = corSelecionada.value
  contexto.beginPath()
  contexto.arc(ponto.x, ponto.y, Math.max(2, tamanhoPincel.value * 3), 0, Math.PI * 2)
  contexto.fill()
}

function pararDesenhoTextura() {
  desenhandoTextura = false
}

function limparTextura() {
  const contexto = contextoTextura()
  if (!contexto) return
  contexto.clearRect(0, 0, 240, 240)
}

function carregarObjeto(event, tipo) {
  const arquivo = event.target.files?.[0]
  if (!arquivo) return
  const leitor = new FileReader()
  leitor.onload = () => {
    if (tipo === 'objeto2d') objeto2dEditado.value = leitor.result
    else objetoIsoEditado.value = leitor.result
  }
  leitor.readAsDataURL(arquivo)
  event.target.value = ''
}

function carregarTextura(event) {
  const arquivo = event.target.files?.[0]
  if (!arquivo) return
  const leitor = new FileReader()
  leitor.onload = () => {
    const imagem = new Image()
    imagem.onload = () => contextoTextura()?.drawImage(imagem, 0, 0, 240, 240)
    imagem.src = leitor.result
  }
  leitor.readAsDataURL(arquivo)
  event.target.value = ''
}

function aplicarTextura() {
  if (!celulaEditada.value || !canvasTextura.value) return
  const textura = canvasTextura.value.toDataURL('image/png')
  const nome = nomeObjetoEditado.value.trim()
  const desenhoObjeto = canvasTextura.value.toDataURL('image/png')
  const objeto2dFinal = objeto2dEditado.value || desenhoObjeto
  const objetoIsoFinal = objetoIsoEditado.value || desenhoObjeto
  if (amostraObjetoEditada.value) {
    cells.value.forEach(cell => {
      const assinatura = `${cell.objetoNome}|${cell.objeto2d || ''}|${cell.objetoIso || ''}`
      if (assinatura !== assinaturaObjetoOriginal.value) return
      cell.textura = textura
      cell.objetoNome = nome
      cell.objeto2d = objeto2dFinal
      cell.objetoIso = objetoIsoFinal
      cell.orientacao = orientacaoObjetoEditada.value
      cell.altura = alturaObjetoEditada.value
      cell.ladoParede = ladoParedeEditada.value
    })
  } else {
    celulaEditada.value.textura = textura
    celulaEditada.value.objetoNome = nome
    celulaEditada.value.objeto2d = objeto2dFinal
    celulaEditada.value.objetoIso = objetoIsoFinal
    celulaEditada.value.orientacao = orientacaoObjetoEditada.value
    celulaEditada.value.altura = alturaObjetoEditada.value
    celulaEditada.value.ladoParede = ladoParedeEditada.value
  }
  objetoAtual.value = {
    nome: celulaEditada.value.objetoNome || 'Objeto',
    objeto2d: objeto2dFinal,
    objetoIso: objetoIsoFinal,
    orientacao: orientacaoObjetoEditada.value,
    altura: alturaObjetoEditada.value
    , ladoParede: ladoParedeEditada.value
  }
  celulaEditada.value.revelada = true
  fecharEditorQuadrado()
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
    objetoNome: '',
    objeto2d: null,
    objetoIso: null,
    orientacao: 'chao',
    altura: 1,
    ladoParede: 'norte',
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

const objetosCriados = computed(() => {
  const unicos = new Map()
  cells.value.forEach(cell => {
    if (!cell.objetoNome && !cell.objeto2d && !cell.objetoIso) return
    const id = `${cell.objetoNome}|${cell.objeto2d || ''}|${cell.objetoIso || ''}`
    if (!unicos.has(id)) {
      unicos.set(id, {
        id,
        nome: cell.objetoNome || 'Objeto',
        imagem: cell.objeto2d || cell.objetoIso,
        objeto2d: cell.objeto2d,
        objetoIso: cell.objetoIso,
        orientacao: cell.orientacao || 'chao',
        altura: cell.altura || 1,
        ladoParede: cell.ladoParede || 'norte'
      })
    }
  })
  return [...unicos.values()]
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
let objetoArrastado = null
let objetoDestino = null

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

function iniciarArrasteObjeto(event, cell) {
  if (ferramentaSelecionada.value !== 'objeto' || event.button !== 0) return
  selecionarObjeto(cell)
  objetoArrastado = cell
  objetoDestino = cell
  window.addEventListener('pointermove', moverObjeto)
  window.addEventListener('pointerup', pararArrasteObjeto, { once: true })
}

function moverObjeto(event) {
  if (!objetoArrastado) return
  const elemento = document.elementFromPoint(event.clientX, event.clientY)
  const celulaDestino = elemento?.closest('.cell')
  if (!celulaDestino) return

  const destino = cells.value[Number(celulaDestino.dataset.id)]
  if (!destino || destino === objetoArrastado) return
  objetoDestino = destino
}

function pararArrasteObjeto() {
  if (objetoArrastado && objetoDestino && objetoDestino !== objetoArrastado) {
    objetoDestino.objetoNome = objetoArrastado.objetoNome
    objetoDestino.objeto2d = objetoArrastado.objeto2d
    objetoDestino.objetoIso = objetoArrastado.objetoIso
    objetoDestino.orientacao = objetoArrastado.orientacao
    objetoDestino.altura = objetoArrastado.altura
    objetoDestino.ladoParede = objetoArrastado.ladoParede
    objetoDestino.textura = objetoArrastado.textura
    objetoDestino.cor = objetoArrastado.cor
    objetoDestino.terreno = objetoArrastado.terreno
    objetoDestino.revelada = true

    objetoArrastado.objetoNome = ''
    objetoArrastado.objeto2d = null
    objetoArrastado.objetoIso = null
    objetoArrastado.textura = null
  }
  objetoArrastado = null
  objetoDestino = null
  window.removeEventListener('pointermove', moverObjeto)
}

function iniciarInteracao(event, cell) {
  if (event.button !== 0) return

  if (ferramentaSelecionada.value === 'objeto') {
    colocarObjeto(cell)
  } else if (ferramentaSelecionada.value === 'mao') {
    iniciarPan(event, 0)
  } else if (ferramentaSelecionada.value === 'balde') {
    preencherArea(cell)
  } else {
    iniciarPintura(cell)
  }
}

function colocarObjeto(cell) {
  if (cell.objeto2d || cell.objetoIso || cell.objetoNome) {
    selecionarObjeto(cell)
    return
  }
  if (!objetoAtual.value) {
    abrirEditorCelula(cell)
    return
  }
  cell.objetoNome = objetoAtual.value.nome
  cell.objeto2d = objetoAtual.value.objeto2d
  cell.objetoIso = objetoAtual.value.objetoIso
  cell.orientacao = objetoAtual.value.orientacao || 'chao'
  cell.altura = objetoAtual.value.altura || 1
  cell.ladoParede = objetoAtual.value.ladoParede || 'norte'
  cell.revelada = true
  objetoAtual.value = null
}

function selecionarObjeto(cell) {
  objetoAtual.value = {
    id: `${cell.objetoNome}|${cell.objeto2d || ''}|${cell.objetoIso || ''}`,
    nome: cell.objetoNome || 'Objeto',
    objeto2d: cell.objeto2d || null,
    objetoIso: cell.objetoIso || null,
    orientacao: cell.orientacao || 'chao',
    altura: cell.altura || 1,
    ladoParede: cell.ladoParede || 'norte'
  }
}

function selecionarObjetoAmostra(objeto) {
  objetoAtual.value = objeto
}

function iniciarPanNoCorpo(event) {
  if (ferramentaSelecionada.value === 'mao') iniciarPan(event, 0)
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

.ferramenta-btn>span:last-child,
.amostras-toggle>span:last-child,
.controle-cor>span,
.controle-pincel>span {
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

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }
}

@keyframes icone-selecionado-pulsar {

  0%,
  100% {
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

.controle-cor>img {
  position: relative;
  z-index: 2;
  display: block;
  width: 28px;
  height: 28px;
  filter: brightness(0.86);
  transition: filter 0.2s ease;
}

.controle-cor:hover>img,
.controle-cor:focus-within>img {
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

.controle-pincel>span {
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

.pasta-objetos {
  position: absolute;
  top: 118px;
  left: calc(100% + 5px);
  z-index: 30;
  display: grid;
  grid-template-columns: repeat(2, 70px);
  gap: 5px;
  width: 150px;
  padding: 7px;
  background: #181818;
  border: 1px solid #3a3a3a;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
}

.pasta-objetos-titulo,
.objetos-vazio {
  grid-column: 1 / -1;
  color: #d9a441;
  font: 10px "Aubrey", system-ui;
}

.objetos-vazio {
  color: #777;
  line-height: 1.3;
}

.objeto-amostra {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 58px;
  padding: 4px;
  background: #242424;
  border: 1px solid #454545;
  color: #aaa;
  cursor: pointer;
}

.objeto-amostra:hover,
.objeto-amostra.selecionado {
  border-color: #d9a441;
  color: #f3be58;
}

.objeto-amostra img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.objeto-amostra small {
  max-width: 62px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
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
  overflow: hidden;
  /* Changed from auto */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin-left: 48px;
}

.editor-quadrado {
  position: absolute;
  top: 76px;
  left: 190px;
  z-index: 50;
  width: 292px;
  min-width: 0;
  min-height: 0;
  background: #171717;
  border: 1px solid #454545;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65);
}

.editor-quadrado-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 7px 0 10px;
  color: #d9a441;
  font-size: 11px;
  border-bottom: 1px solid #333;
}

.editor-quadrado-barra .janela-btn {
  width: 22px;
  height: 22px;
}

.editor-quadrado-corpo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.canvas-textura {
  display: block;
  width: 240px;
  height: 240px;
  background: #1a1a1a;
  border: 1px solid #444;
  cursor: crosshair;
  touch-action: none;
}

.visualizador-controles {
  display: flex;
  gap: 5px;
}

.visualizador-controles button {
  flex: 1;
  padding: 4px;
  background: #292929;
  border: 1px solid #454545;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
}

.visualizador-controles button.ativo,
.visualizador-controles button:hover {
  border-color: #d9a441;
  color: #f3be58;
}

.objeto-visualizador {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240px;
  height: 240px;
  background: #111;
  border: 1px solid #444;
}

.celula-visualizador {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 150px;
  overflow: visible;
  background: #254d35;
  border: 1px solid #536d5d;
  color: #777;
  font-size: 10px;
}

.celula-visualizador.visualizador-iso {
  background: #242424;
  transform: rotateX(60deg) rotateZ(-45deg);
  transform-style: preserve-3d;
}

.celula-visualizador img {
  position: absolute;
  left: 8%;
  bottom: 8%;
  width: 84%;
  height: 84%;
  object-fit: contain;
  pointer-events: none;
}



.editor-quadrado-acoes {
  display: flex;
  gap: 5px;
}

.objeto-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 7px;
  background: #202020;
  border: 1px solid #3a3a3a;
}

.objeto-nome {
  height: 24px;
  padding: 0 6px;
  background: #151515;
  border: 1px solid #454545;
  color: #eee;
  font: 10px "Aubrey", system-ui;
}

.objeto-arquivos,
.objeto-previews {
  display: flex;
  justify-content: center;
  gap: 5px;
}

.objeto-arquivos button {
  flex: 1;
  padding: 4px;
  background: #292929;
  border: 1px solid #454545;
  color: #bbb;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
}

.objeto-arquivos button:hover {
  border-color: #d9a441;
  color: #f3be58;
}

.objeto-orientacao {
  display: flex;
  gap: 5px;
}

.objeto-orientacao button {
  flex: 1;
  padding: 4px;
  background: #292929;
  border: 1px solid #454545;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
}

.objeto-orientacao button.ativo,
.objeto-orientacao button:hover {
  border-color: #d9a441;
  color: #f3be58;
}

.altura-objeto {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #aaa;
  font-size: 10px;
}

.altura-objeto input {
  flex: 1;
  accent-color: #d9a441;
}

.lado-parede {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.lado-parede button {
  padding: 4px 0;
  background: #292929;
  border: 1px solid #454545;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
}

.lado-parede button.ativo,
.lado-parede button:hover {
  border-color: #d9a441;
  color: #f3be58;
}

.objeto-previews {
  min-height: 42px;
}

.objeto-previews img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  background: #111;
  border: 1px solid #454545;
}

.objeto-exemplo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #d9a441;
  font-size: 10px;
}

.exemplo-cenarios {
  display: flex;
  gap: 8px;
}

.exemplo-cenario {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 82px;
  height: 62px;
  overflow: hidden;
  background: #254d35;
  border: 1px solid #454545;
  color: #777;
  font-size: 9px;
}

.exemplo-cenario img {
  width: 88%;
  height: 88%;
  object-fit: contain;
}

.exemplo-iso {
  background: #242424;
  transform: perspective(120px) rotateX(12deg);
}

.editor-quadrado-acoes button {
  flex: 1;
  padding: 5px 6px;
  background: #242424;
  border: 1px solid #454545;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
  cursor: pointer;
}

.editor-quadrado-acoes button:hover,
.editor-quadrado-acoes .aplicar-textura {
  border-color: #d9a441;
  color: #f3be58;
}

.editor-quadrado-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 30px;
  padding: 0;
  background: transparent;
  border: 0;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
}

.editor-quadrado-btn:hover {
  color: #f3be58;
}

.editor-quadrado-btn.selecionado {
  color: #f3be58;
  animation: botao-selecionado-pulsar 1.8s ease-in-out infinite;
}

.janela-corpo.mao-ativa {
  cursor: grab;
}

.janela-corpo.mao-ativa:active {
  cursor: grabbing;
}

.grid {
  background: transparent;
  border: 0;
  transform-style: preserve-3d;
}

.cell {
  width: 100%;
  height: 100%;
  border: 0.1px solid #333;
  cursor: pointer;
  position: relative;
  overflow: visible;
  transform-style: preserve-3d;
}

.objeto-celula {
  position: absolute;
  inset: 8%;
  z-index: 3;
  width: 84%;
  height: 84%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  transform-origin: bottom center;
}

.objeto-celula>img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: none;
  pointer-events: none;
  user-select: none;
}

.objeto-celula.objeto-parede {
  inset: auto;
  max-height: none;
}

.objeto-celula.objeto-arrastavel {
  pointer-events: auto;
  cursor: grab;
}

.objeto-celula.objeto-arrastavel:active {
  cursor: grabbing;
}

.isometrico .objeto-celula {
  inset: -18% 2% 2%;
  width: 96%;
  height: 116%;
  filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.55));
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
