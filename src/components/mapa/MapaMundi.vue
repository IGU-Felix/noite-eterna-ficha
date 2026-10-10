<template>
  <div class="mundo" @keydown.esc="fechar" tabindex="0">
    <header class="mundo-barra">
      <div class="mundo-marca">
        <span class="mundo-simbolo">✦</span>
        <div>
          <strong>Mapa-múndi</strong>
          <small>cartografia de Noite Eterna</small>
        </div>
      </div>

      <div class="mundo-acoes">
        <button class="acao" title="Desfazer" :disabled="!historico.length" @click="desfazer">↶</button>
        <button class="acao" title="Refazer" :disabled="!futuro.length" @click="refazer">↷</button>
        <span class="separador"></span>
        <button class="acao" :class="{ ativo: mostrarGrade }" title="Alternar grade" @click="mostrarGrade = !mostrarGrade">▦</button>
        <button class="acao" title="Limpar mapa" @click="limparMapa">⌫</button>
        <button class="acao" title="Abrir mapa interno isométrico" @click="abrirMapaInterno">⌘</button>
        <button class="acao fechar" title="Fechar mapa" @click="fechar">×</button>
      </div>
    </header>

    <aside class="ferramentas">
      <button v-for="item in ferramentas" :key="item.id" class="ferramenta" :class="{ ativo: ferramenta === item.id }"
        :title="item.nome" @click="ferramenta = item.id">
        <span>{{ item.icone }}</span>
        <small>{{ item.nome }}</small>
      </button>
      <span class="separador vertical"></span>
      <button class="ferramenta" title="Aumentar zoom" @click="alterarZoom(0.15)"><span>＋</span><small>Zoom</small></button>
      <button class="ferramenta" title="Diminuir zoom" @click="alterarZoom(-0.15)"><span>－</span><small>Zoom</small></button>
      <button class="ferramenta" title="Centralizar mapa" @click="centralizar"><span>⌖</span><small>Centro</small></button>
    </aside>

    <section class="paleta" :class="{ aberta: ferramenta === 'icone' || ferramenta === 'texto' || ferramenta === 'gerador' }">
      <div class="paleta-titulo">Pontos de interesse</div>
      <button v-for="item in todosIcones" :key="item.id" class="icone-opcao" :class="{ escolhido: iconeSelecionado === item.id }"
        :title="item.nome" @click="selecionarIcone(item.id)">
        <img v-if="item.imagem" :src="item.imagem" :alt="item.nome" />
        <span v-else>{{ item.simbolo }}</span>
        <small>{{ item.nome }}</small>
        <i v-if="item.personalizado" class="icone-remover" title="Excluir ícone" @click.stop="removerIcone(item)">×</i>
      </button>
      <button class="criar-icone" title="Criar ícone personalizado" @click="mostrarCriador = !mostrarCriador">＋ Criar ícone</button>
      <div v-if="mostrarCriador" class="criador-icone">
        <strong>Novo ícone</strong>
        <input v-model="nomeIcone" maxlength="18" placeholder="Nome do lugar" />
        <div class="criador-linha">
          <input v-model="simboloIcone" maxlength="2" placeholder="⌂" aria-label="Símbolo do ícone" />
          <button title="Escolher imagem" @click="inputIcone?.click()">Imagem</button>
          <input ref="inputIcone" type="file" accept="image/*" hidden @change="carregarImagemIcone" />
        </div>
        <img v-if="imagemIcone" class="previa-icone" :src="imagemIcone" alt="Prévia do ícone" />
        <label class="tipo-icone">
          <input v-model="interativoIcone" type="checkbox" />
          <span>Abre um mapa interno ao clicar</span>
        </label>
        <button class="criar-icone-confirmar" @click="criarIcone">Adicionar à biblioteca</button>
      </div>
      <label v-if="ferramenta === 'texto'" class="texto-editor">
        <span>Legenda</span>
        <input v-model="textoAtual" maxlength="36" placeholder="Nome do lugar" @keydown.enter="adicionarTexto" />
        <button @click="adicionarTexto">Adicionar</button>
      </label>
      <div v-if="ferramenta === 'gerador'" class="gerador-editor">
        <strong>Gerar ícones na área</strong>
        <span>Ícone: {{ iconeAtual?.nome || 'selecione um ícone' }}</span>
        <label>Distância mínima {{ distanciaMinima }}px
          <input v-model.number="distanciaMinima" type="range" min="32" max="180" step="4" />
        </label>
        <label>Quantidade {{ quantidadeGeracao }}
          <input v-model.number="quantidadeGeracao" type="range" min="1" max="200" step="1" />
        </label>
        <label class="cor-geracao">Cor dos ícones
          <input v-model="corGeracao" type="color" aria-label="Escolher cor dos ícones gerados" />
          <span :style="{ backgroundColor: corGeracao }"></span>
        </label>
        <small>Desenhe uma área, solte o mouse e clique no botão para gerar as cópias.</small>
        <button @click="gerarIconesNaArea">Gerar novamente nesta área</button>
      </div>
    </section>

    <main ref="viewport" class="viewport" :class="{ desenhando: ferramenta === 'pincel' || ferramenta === 'borracha', gerando: ferramenta === 'gerador', navegando: ferramenta === 'mao' }"
      @pointerdown="iniciarInteracao" @pointermove="moverInteracao" @pointerup="finalizarInteracao" @pointercancel="finalizarInteracao"
      @wheel.prevent="zoomComRoda">
      <div ref="mapa" class="mapa" :class="{ grade: mostrarGrade }" :style="estiloMapa">
        <svg class="desenho" :viewBox="`0 0 ${tamanhoTela} ${tamanhoTela}`" preserveAspectRatio="none">
          <path v-for="traco in tracos" :key="traco.id" :d="traco.d" :stroke="traco.cor" :stroke-width="traco.tamanho" :opacity="traco.opacidade" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <rect v-for="forma in formas" :key="forma.id" :x="forma.x" :y="forma.y" :width="forma.largura" :height="forma.altura" :fill="forma.preenchimento" :stroke="forma.cor" :stroke-width="forma.tamanho" rx="4" />
          <path v-if="desenhoArea.length" :d="caminhoArea(desenhoArea)" class="area-geracao" />
        </svg>
        <button v-for="item in objetos" :key="item.id" class="objeto" :class="{ selecionado: objetoSelecionado === item.id }"
          :style="{ ...posicaoObjeto(item), color: item.cor || '#d9a441' }" :title="item.interativo ? `${item.nome} · abrir mapa interno` : item.nome"
          @pointerdown.stop="iniciarObjeto($event, item)" @click.stop="ativarObjeto(item)" @dblclick.stop="!item.interativo && removerObjeto(item)">
          <img v-if="item.imagem" class="objeto-imagem" :src="item.imagem" :alt="item.nome || 'Ícone'" />
          <span v-else class="objeto-simbolo">{{ item.simbolo }}</span>
          <span v-if="item.nome" class="objeto-nome">{{ item.nome }}</span>
          <span v-if="item.interativo" class="objeto-portal">↗</span>
        </button>
      </div>
      <div class="coordenadas">{{ Math.round(zoom * 100) }}% · {{ objetos.length }} pontos · {{ tracos.length }} traços</div>
    </main>

    <footer class="mundo-rodape">
      <span><b>{{ nomeFerramenta }}</b> selecionado</span>
      <span>Duplo clique remove um ponto</span>
      <span class="salvo">● salvo localmente</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const emit = defineEmits(['fechar', 'abrir-interno'])
const CHAVE = 'noite-eterna-mapa-mundi'
const tamanhoTela = 2400
const viewport = ref(null)
const mapa = ref(null)
const ferramenta = ref('mao')
const iconeSelecionado = ref('casa')
const mostrarGrade = ref(true)
const zoom = ref(0.75)
const mapaPos = ref({ x: 0, y: 0 })
const textoAtual = ref('')
const mostrarCriador = ref(false)
const nomeIcone = ref('')
const simboloIcone = ref('✦')
const imagemIcone = ref(null)
const inputIcone = ref(null)
const interativoIcone = ref(false)
const distanciaMinima = ref(72)
const quantidadeGeracao = ref(40)
const corGeracao = ref('#d9a441')
const areaGeracao = ref([])
const desenhoArea = ref([])
const objetos = ref([])
const tracos = ref([])
const formas = ref([])
const historico = ref([])
const futuro = ref([])
let interacao = null
let proximoId = 1
let frameSalvamento = 0

const ferramentas = [
  { id: 'mao', nome: 'Mover', icone: '✥' },
  { id: 'pincel', nome: 'Pincel', icone: '✎' },
  { id: 'borracha', nome: 'Borracha', icone: '⌫' },
  { id: 'icone', nome: 'Ícones', icone: '⌂' },
  { id: 'texto', nome: 'Texto', icone: 'T' },
  { id: 'forma', nome: 'Área', icone: '□' },
  { id: 'gerador', nome: 'Gerar grupo', icone: '✣' }
]
const icones = [
  { id: 'casa', nome: 'Casa', simbolo: '⌂' },
  { id: 'castelo', nome: 'Castelo', simbolo: '♜' },
  { id: 'vila', nome: 'Vila', simbolo: '♧' },
  { id: 'arvore', nome: 'Floresta', simbolo: '♣' },
  { id: 'montanha', nome: 'Montanha', simbolo: '△' },
  { id: 'porto', nome: 'Porto', simbolo: '⚓' },
  { id: 'perigo', nome: 'Perigo', simbolo: '!' },
  { id: 'bandeira', nome: 'Marco', simbolo: '⚑' }
]
const iconesPersonalizados = ref([])
const todosIcones = computed(() => [...icones, ...iconesPersonalizados.value])
const iconeAtual = computed(() => todosIcones.value.find(item => item.id === iconeSelecionado.value))
const nomeFerramenta = computed(() => ferramentas.find(item => item.id === ferramenta.value)?.nome || '')
const estiloMapa = computed(() => ({ transform: `translate(${mapaPos.value.x}px, ${mapaPos.value.y}px) scale(${zoom.value})` }))

function novoId(prefixo) { return `${prefixo}-${proximoId++}` }
function pontoMapa(event) {
  const retangulo = mapa.value.getBoundingClientRect()
  return { x: (event.clientX - retangulo.left) * (tamanhoTela / retangulo.width), y: (event.clientY - retangulo.top) * (tamanhoTela / retangulo.height) }
}
function caminhoArea(pontos) { return `${pontos.map((pontoAtual, indice) => `${indice ? 'L' : 'M'} ${pontoAtual.x} ${pontoAtual.y}`).join(' ')} Z` }
function pontoDentroArea(x, y, poligono) {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const cruza = (poligono[i].y > y) !== (poligono[j].y > y) && x < (poligono[j].x - poligono[i].x) * (y - poligono[i].y) / (poligono[j].y - poligono[i].y) + poligono[i].x
    if (cruza) dentro = !dentro
  }
  return dentro
}
function gerarIconesNaArea(antes = snapshot()) {
  if (areaGeracao.value.length < 3 || !iconeAtual.value) return
  const minX = Math.min(...areaGeracao.value.map(pontoAtual => pontoAtual.x))
  const maxX = Math.max(...areaGeracao.value.map(pontoAtual => pontoAtual.x))
  const minY = Math.min(...areaGeracao.value.map(pontoAtual => pontoAtual.y))
  const maxY = Math.max(...areaGeracao.value.map(pontoAtual => pontoAtual.y))
  const novosPontos = []
  const distanciaQuadrada = distanciaMinima.value * distanciaMinima.value
  for (let tentativa = 0; tentativa < quantidadeGeracao.value * 12 && novosPontos.length < quantidadeGeracao.value; tentativa++) {
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    if (!pontoDentroArea(x, y, areaGeracao.value)) continue
    const longeDosNovos = novosPontos.every(item => (item.x - x) ** 2 + (item.y - y) ** 2 >= distanciaQuadrada)
    if (longeDosNovos) novosPontos.push({ x, y })
  }
  novosPontos.forEach(ponto => objetos.value.push({ id: novoId('obj'), ...ponto, ...iconeAtual.value, cor: corGeracao.value, nome: '' }))
  registrarAlteracao(antes)
}
function salvarEstado() {
  localStorage.setItem(CHAVE, JSON.stringify({ objetos: objetos.value, tracos: tracos.value, formas: formas.value, areaGeracao: areaGeracao.value, distanciaMinima: distanciaMinima.value, quantidadeGeracao: quantidadeGeracao.value, corGeracao: corGeracao.value, iconesPersonalizados: iconesPersonalizados.value, proximoId }))
}
function snapshot() { return JSON.stringify({ objetos: objetos.value, tracos: tracos.value, formas: formas.value }) }
function restaurar(valor) {
  const estado = JSON.parse(valor)
  objetos.value = estado.objetos || []; tracos.value = estado.tracos || []; formas.value = estado.formas || []
}
function registrarAlteracao(antes) {
  historico.value.push(antes); if (historico.value.length > 30) historico.value.shift(); futuro.value = []; salvarEstado()
}
function desfazer() { if (!historico.value.length) return; futuro.value.push(snapshot()); restaurar(historico.value.pop()) }
function refazer() { if (!futuro.value.length) return; historico.value.push(snapshot()); restaurar(futuro.value.pop()) }
function iniciarInteracao(event) {
  if (event.button !== 0) return
  event.currentTarget.setPointerCapture?.(event.pointerId)
  const ponto = pontoMapa(event)
  if (ferramenta.value === 'mao') { interacao = { tipo: 'pan', x: event.clientX, y: event.clientY, inicioX: mapaPos.value.x, inicioY: mapaPos.value.y }; return }
  const antes = snapshot()
  if (ferramenta.value === 'gerador') { desenhoArea.value = [ponto]; interacao = { tipo: 'area', antes }; return }
  if (ferramenta.value === 'icone') { objetos.value.push({ id: novoId('obj'), x: ponto.x, y: ponto.y, ...todosIcones.value.find(item => item.id === iconeSelecionado.value), nome: '' }); registrarAlteracao(antes); return }
  if (ferramenta.value === 'texto') { adicionarTextoNoPonto(ponto, antes); return }
  if (ferramenta.value === 'forma') { interacao = { tipo: 'forma', antes, inicio: ponto }; return }
  if (ferramenta.value === 'pincel' || ferramenta.value === 'borracha') {
    const traco = { id: novoId('traco'), d: `M ${ponto.x} ${ponto.y}`, cor: ferramenta.value === 'borracha' ? '#10151a' : '#e7bb70', tamanho: ferramenta.value === 'borracha' ? 38 : 10, opacidade: ferramenta.value === 'borracha' ? 1 : 0.85 }
    tracos.value.push(traco); interacao = { tipo: 'traco', antes, tracoId: traco.id }
  }
}
function moverInteracao(event) {
  if (!interacao) return
  if (event.pointerType === 'mouse' && event.buttons === 0) {
    finalizarInteracao(event)
    return
  }
  if (interacao.tipo === 'pan') { mapaPos.value = { x: interacao.inicioX + event.clientX - interacao.x, y: interacao.inicioY + event.clientY - interacao.y }; return }
  const ponto = pontoMapa(event)
  if (interacao.tipo === 'traco') { const traco = tracos.value.find(item => item.id === interacao.tracoId); if (traco) traco.d += ` L ${ponto.x} ${ponto.y}`; return }
  if (interacao.tipo === 'area') { desenhoArea.value.push(ponto); return }
  if (interacao.tipo === 'forma') { const x = Math.min(interacao.inicio.x, ponto.x); const y = Math.min(interacao.inicio.y, ponto.y); const forma = formas.value.find(item => item.id === interacao.formaId); if (forma) { forma.x = x; forma.y = y; forma.largura = Math.abs(ponto.x - interacao.inicio.x); forma.altura = Math.abs(ponto.y - interacao.inicio.y) } else { const novaForma = { id: novoId('forma'), x, y, largura: 0, altura: 0, cor: '#e7bb70', tamanho: 5, preenchimento: 'rgba(231,187,112,.14)' }; formas.value.push(novaForma); interacao.formaId = novaForma.id } }
  if (interacao.tipo === 'objeto') { const item = objetos.value.find(valor => valor.id === interacao.itemId); if (item) { item.x = ponto.x - interacao.offsetX; item.y = ponto.y - interacao.offsetY } }
}
function finalizarInteracao(event) {
  if (!interacao) return
  if (interacao.tipo === 'area' && desenhoArea.value.length > 3) { areaGeracao.value = [...desenhoArea.value]; desenhoArea.value = [] }
  else if (interacao.tipo !== 'pan') registrarAlteracao(interacao.antes)
  event.currentTarget.releasePointerCapture?.(event.pointerId); interacao = null
}
function iniciarObjeto(event, item) {
  objetoSelecionado.value = item.id
  if (item.interativo) return
  const ponto = pontoMapa(event)
  interacao = { tipo: 'objeto', antes: snapshot(), itemId: item.id, offsetX: ponto.x - item.x, offsetY: ponto.y - item.y }
}
const objetoSelecionado = ref(null)
function ativarObjeto(item) { if (item.interativo) emit('abrir-interno', item) }
function removerObjeto(item) { const antes = snapshot(); objetos.value = objetos.value.filter(valor => valor.id !== item.id); objetoSelecionado.value = null; registrarAlteracao(antes) }
function adicionarTexto() { if (!textoAtual.value.trim()) return; adicionarTextoNoPonto({ x: tamanhoTela / 2, y: tamanhoTela / 2 }, snapshot()); textoAtual.value = '' }
function adicionarTextoNoPonto(ponto, antes) { objetos.value.push({ id: novoId('texto'), x: ponto.x, y: ponto.y, simbolo: '•', nome: textoAtual.value.trim() || 'Novo lugar', tipo: 'texto' }); registrarAlteracao(antes) }
function selecionarIcone(id) { iconeSelecionado.value = id; ferramenta.value = 'icone' }
function carregarImagemIcone(event) {
  const arquivo = event.target.files?.[0]
  if (!arquivo) return
  const leitor = new FileReader()
  leitor.onload = () => { imagemIcone.value = leitor.result }
  leitor.readAsDataURL(arquivo)
  event.target.value = ''
}
function criarIcone() {
  const nome = nomeIcone.value.trim()
  if (!nome) return
  const novoIcone = { id: novoId('icone'), nome, simbolo: simboloIcone.value.trim() || '✦', imagem: imagemIcone.value, interativo: interativoIcone.value, personalizado: true }
  iconesPersonalizados.value.push(novoIcone)
  selecionarIcone(novoIcone.id)
  nomeIcone.value = ''; simboloIcone.value = '✦'; imagemIcone.value = null; interativoIcone.value = false; mostrarCriador.value = false
  salvarEstado()
}
function removerIcone(item) {
  iconesPersonalizados.value = iconesPersonalizados.value.filter(icone => icone.id !== item.id)
  if (iconeSelecionado.value === item.id) iconeSelecionado.value = 'casa'
  salvarEstado()
}
function alterarZoom(valor) { zoom.value = Math.min(1.8, Math.max(0.25, Number((zoom.value + valor).toFixed(2)))) }
function zoomComRoda(event) { alterarZoom(event.deltaY < 0 ? 0.1 : -0.1) }
function centralizar() { mapaPos.value = { x: 0, y: 0 }; zoom.value = 0.75 }
function limparMapa() { if (!objetos.value.length && !tracos.value.length && !formas.value.length) return; const antes = snapshot(); objetos.value = []; tracos.value = []; formas.value = []; registrarAlteracao(antes) }
function fechar() { salvarEstado(); emit('fechar') }
function abrirMapaInterno() { salvarEstado(); emit('abrir-interno') }
function posicaoObjeto(item) { return { left: `${item.x}px`, top: `${item.y}px` } }

function agendarSalvamento() {
  if (frameSalvamento) return
  frameSalvamento = requestAnimationFrame(() => { frameSalvamento = 0; salvarEstado() })
}

watch([objetos, tracos, formas, areaGeracao], agendarSalvamento, { deep: true })
onMounted(() => {
  try { const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (salvo) { objetos.value = salvo.objetos || []; tracos.value = salvo.tracos || []; formas.value = salvo.formas || []; areaGeracao.value = salvo.areaGeracao || []; distanciaMinima.value = salvo.distanciaMinima || 72; quantidadeGeracao.value = salvo.quantidadeGeracao || 40; corGeracao.value = salvo.corGeracao || '#d9a441'; iconesPersonalizados.value = salvo.iconesPersonalizados || []; proximoId = salvo.proximoId || 1 } } catch { localStorage.removeItem(CHAVE) }
  window.addEventListener('pointerup', finalizarInteracao)
  window.addEventListener('pointercancel', finalizarInteracao)
  window.addEventListener('mouseup', finalizarInteracao, true)
  window.addEventListener('blur', finalizarInteracao)
  viewport.value?.focus()
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', finalizarInteracao)
  window.removeEventListener('pointercancel', finalizarInteracao)
  window.removeEventListener('mouseup', finalizarInteracao, true)
  window.removeEventListener('blur', finalizarInteracao)
})
</script>

<style scoped>
.mundo { position: fixed; inset: 0; z-index: 300; display: grid; grid-template-rows: 58px 1fr 30px; background: #10151a; color: #e6e0d5; font-family: Georgia, 'Times New Roman', serif; outline: none; overflow: hidden; }
.mundo-barra { display: flex; align-items: center; justify-content: space-between; padding: 0 22px; background: #172127; border-bottom: 1px solid #40515a; box-shadow: 0 4px 18px #080b0d99; z-index: 10; }
.mundo-marca, .mundo-acoes { display: flex; align-items: center; gap: 12px; }
.mundo-simbolo { color: #e7bb70; font-size: 26px; }
.mundo-marca strong { display: block; font-size: 18px; letter-spacing: .02em; font-weight: normal; }
.mundo-marca small, .mundo-rodape, .ferramenta small, .paleta, .coordenadas { font-family: 'Trebuchet MS', sans-serif; }
.mundo-marca small { color: #8da0a5; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
.acao { width: 32px; height: 30px; border: 1px solid transparent; background: transparent; color: #aab8bb; cursor: pointer; font-size: 19px; }
.acao:hover, .acao.ativo { border-color: #c0934e; color: #e7bb70; background: #25343a; }
.acao:disabled { opacity: .3; cursor: default; }.acao.fechar { color: #d2816a; font-size: 25px; }.separador { width: 1px; height: 22px; background: #40515a; display: inline-block; }
.viewport { position: relative; overflow: hidden; background: #202b2f; cursor: crosshair; touch-action: none; }.viewport.navegando { cursor: grab; }.viewport.navegando:active { cursor: grabbing; }.viewport.desenhando { cursor: crosshair; }
.mapa { position: absolute; width: 2400px; height: 2400px; left: 50%; top: 50%; margin-left: -1200px; margin-top: -1200px; transform-origin: center; background-color: #293b3b; background-image: radial-gradient(#9eb0a033 1px, transparent 1px); background-size: 48px 48px; box-shadow: 0 0 0 1px #52635b, 0 0 80px #090e10; }
.mapa.grade { background-image: linear-gradient(#aec0b814 1px, transparent 1px), linear-gradient(90deg, #aec0b814 1px, transparent 1px), radial-gradient(#b8c7b927 1px, transparent 1px); background-size: 48px 48px, 48px 48px, 48px 48px; }
.desenho { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }.ferramentas { position: absolute; left: 16px; top: 74px; z-index: 8; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px 5px; background: #172127ee; border: 1px solid #40515a; box-shadow: 0 8px 20px #080b0d66; }
.ferramenta { width: 52px; min-height: 47px; border: 1px solid transparent; background: transparent; color: #aab8bb; cursor: pointer; }.ferramenta span { display: block; font-size: 22px; line-height: 24px; }.ferramenta small { display: block; margin-top: 3px; font-size: 9px; }.ferramenta:hover, .ferramenta.ativo { border-color: #c0934e; color: #e7bb70; background: #26373b; }.vertical { width: 34px; height: 1px; margin: 4px 0; }
.paleta { position: absolute; left: 87px; top: 74px; z-index: 7; display: none; width: 232px; padding: 12px; background: #172127f5; border: 1px solid #40515a; box-shadow: 0 8px 20px #080b0d66; }.paleta.aberta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }.paleta-titulo { grid-column: 1 / -1; color: #e7bb70; font-size: 12px; border-bottom: 1px solid #40515a; padding-bottom: 7px; margin-bottom: 2px; }.icone-opcao { min-height: 50px; border: 1px solid transparent; background: #233137; color: #d6d1c4; cursor: pointer; }.icone-opcao:hover, .icone-opcao.escolhido { border-color: #c0934e; color: #e7bb70; }.icone-opcao span { display: block; font-size: 24px; }.icone-opcao small { font-size: 9px; }.texto-editor { grid-column: 1 / -1; display: grid; gap: 5px; color: #aab8bb; font-size: 11px; }.texto-editor input { padding: 7px; background: #10181c; border: 1px solid #40515a; color: #eee; }.texto-editor button { padding: 7px; background: #76572f; border: 0; color: #fff5e2; cursor: pointer; }
.objeto { position: absolute; z-index: 2; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 4px; border: 1px solid transparent; background: transparent; color: #f2d494; cursor: grab; text-shadow: 0 2px 5px #10151a; }.objeto:active { cursor: grabbing; }.objeto.selecionado, .objeto:hover { border-color: #e7bb70; background: #152126aa; }.objeto-simbolo { display: block; min-width: 30px; font-size: 29px; line-height: 34px; }.objeto-nome { max-width: 150px; white-space: nowrap; font: 13px Georgia, serif; color: #efe4c6; }.coordenadas { position: absolute; right: 18px; bottom: 16px; padding: 5px 8px; background: #172127d9; color: #aab8bb; font-size: 10px; letter-spacing: .04em; }.mundo-rodape { display: flex; align-items: center; gap: 22px; padding: 0 18px; background: #172127; border-top: 1px solid #40515a; color: #819296; font-size: 10px; }.mundo-rodape b { color: #e7bb70; font-weight: normal; }.mundo-rodape .salvo { margin-left: auto; color: #79a889; }
@media (max-width: 640px) { .mundo-barra { padding: 0 10px; }.mundo-marca small { display: none; }.ferramentas { left: 7px; top: 68px; }.ferramenta { width: 43px; }.paleta { left: 57px; top: 68px; }.mundo-rodape span:nth-child(2) { display: none; } }

/* O mapa usa a mesma base visual das fichas: preto, cinza e dourado. */
.mundo {
  background: #111;
  color: #ccc;
  font-family: "Aubrey", system-ui;
}

.mundo-barra,
.mundo-rodape {
  background: #1a1a1a;
  border-color: #2a2a2a;
}

.mundo-marca strong,
.mundo-marca small,
.mundo-rodape,
.ferramenta small,
.paleta,
.coordenadas {
  font-family: "Aubrey", system-ui;
}

.mundo-marca strong,
.mundo-simbolo,
.paleta-titulo,
.mundo-rodape b,
.mundo-rodape .salvo {
  color: #d9a441;
}

.mundo-marca small {
  color: #777;
}

.acao:hover,
.acao.ativo,
.ferramenta:hover,
.ferramenta.ativo,
.icone-opcao:hover,
.icone-opcao.escolhido,
.objeto.selecionado,
.objeto:hover {
  border-color: #d9a441;
  color: #d9a441;
  background: rgba(217, 164, 65, 0.08);
}

.acao,
.ferramenta,
.objeto {
  color: #888;
}

.separador,
.mundo-barra,
.mundo-rodape,
.ferramentas,
.paleta,
.icone-opcao,
.texto-editor input {
  border-color: #2a2a2a;
}

.ferramentas,
.paleta,
.coordenadas {
  background: #141414ee;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
}

.viewport {
  background: #0e0e0e;
}

.mapa {
  background-color: #181818;
  background-image: radial-gradient(#5555552b 1px, transparent 1px);
  box-shadow: 0 0 0 1px #2a2a2a, 0 0 80px rgba(0, 0, 0, 0.7);
}

.mapa.grade {
  background-image: linear-gradient(#55555520 1px, transparent 1px), linear-gradient(90deg, #55555520 1px, transparent 1px), radial-gradient(#77777726 1px, transparent 1px);
}

.objeto-simbolo {
  color: inherit;
}

.objeto-nome,
.coordenadas {
  color: #aaa;
}

.texto-editor input {
  background: #0e0e0e;
  color: #ddd;
}

.texto-editor button {
  background: #d9a441;
  color: #111;
}

.icone-opcao {
  position: relative;
}

.icone-opcao img {
  display: block;
  width: 24px;
  height: 24px;
  margin: 0 auto;
  object-fit: contain;
}

.icone-remover {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  border: 1px solid #111;
  border-radius: 50%;
  background: #7a2828;
  color: #fff;
  font: 12px/12px Arial, sans-serif;
  font-style: normal;
}

.criar-icone,
.criar-icone-confirmar,
.criador-linha button {
  grid-column: 1 / -1;
  padding: 7px;
  border: 1px solid #333;
  background: #0e0e0e;
  color: #d9a441;
  cursor: pointer;
  font: 10px "Aubrey", system-ui;
}

.criar-icone:hover,
.criar-icone-confirmar:hover,
.criador-linha button:hover {
  border-color: #d9a441;
  background: rgba(217, 164, 65, 0.1);
}

.criador-icone {
  grid-column: 1 / -1;
  display: grid;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #2a2a2a;
}

.criador-icone strong {
  color: #ccc;
  font: 11px "Aubrey", system-ui;
  text-transform: uppercase;
}

.criador-icone input {
  min-width: 0;
  padding: 7px;
  border: 1px solid #333;
  background: #0e0e0e;
  color: #ddd;
  font: 10px "Aubrey", system-ui;
}

.criador-linha {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 5px;
}

.criador-linha button {
  grid-column: auto;
}

.previa-icone {
  width: 42px;
  height: 42px;
  margin: auto;
  object-fit: contain;
  background: #111;
  border: 1px solid #333;
}

.tipo-icone {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
}

.tipo-icone input {
  width: auto;
  accent-color: #d9a441;
}

.objeto-imagem {
  display: block;
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.objeto,
.objeto-nome,
.objeto-simbolo,
.objeto-imagem,
.objeto-portal {
  user-select: none;
  -webkit-user-select: none;
}

.objeto-nome,
.objeto-simbolo,
.objeto-imagem,
.objeto-portal {
  pointer-events: none;
}

.objeto-portal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid #d9a441;
  border-radius: 50%;
  color: #d9a441;
  font: 10px Arial, sans-serif;
}

.viewport.gerando {
  cursor: crosshair;
}

.area-geracao {
  fill: rgba(217, 164, 65, 0.08);
  stroke: #d9a441;
  stroke-width: 6;
  stroke-dasharray: 18 10;
  pointer-events: none;
}

.gerador-editor {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  padding-top: 8px;
  border-top: 1px solid #2a2a2a;
  color: #aaa;
  font: 10px "Aubrey", system-ui;
}

.gerador-editor strong {
  color: #d9a441;
  font-size: 11px;
  text-transform: uppercase;
}

.gerador-editor label {
  display: grid;
  gap: 4px;
}

.gerador-editor .cor-geracao {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 26px;
}

.cor-geracao input[type="color"] {
  width: 28px;
  height: 22px;
  margin-left: auto;
  padding: 0;
  border: 1px solid #333;
  background: transparent;
  cursor: pointer;
}

.cor-geracao span {
  width: 10px;
  height: 10px;
  margin-left: 5px;
  border: 1px solid #777;
}

.gerador-editor input {
  width: 100%;
  accent-color: #d9a441;
}

.gerador-editor small {
  color: #777;
  line-height: 1.35;
}

.gerador-editor button {
  padding: 7px;
  border: 1px solid #d9a441;
  background: #d9a441;
  color: #111;
  cursor: pointer;
  font: 10px "Aubrey", system-ui;
}
</style>
