import { ref, reactive, computed, watch, onMounted, nextTick } from "vue"

// gerador simples de ids únicos para itens de listas (status, inventário, combate...)
let proximoId = 1
function gerarId() {
  return proximoId++
}

export default {
  setup() {

    // ===== IDENTIFICAÇÃO =====
    const jogador = ref("")
    const classe = ref("Anão - Bárbaro - Vaporário")

    // ===== VIDA =====
    const vidaAtual = ref(85)
    const vidaMax = ref(100)

    const vidaPercent = computed(() =>
      (vidaAtual.value / vidaMax.value) * 100
    )

    const classeVida = computed(() => {
      const percent = vidaPercent.value
      if (percent > 60) return "vida-alta"
      if (percent > 30) return "vida-media"
      return "vida-baixa"
    })

    const vidaCritica = computed(() =>
      vidaPercent.value <= 20
    )

    function alterarVida(valor) {
      vidaAtual.value += valor
    }

    // ===== MANA =====
    const manaAtual = ref(50)
    const manaMax = ref(80)

    const manaPercent = computed(() =>
      (manaAtual.value / manaMax.value) * 100
    )

    const classeMana = computed(() => {
      const percent = manaPercent.value
      if (percent > 60) return "mana-alta"
      if (percent > 30) return "mana-media"
      return "mana-baixa"
    })

    function alterarMana(valor) {
      manaAtual.value += valor
    }

    // ===== LIMITES =====
    watch(vidaAtual, (v) => {
      if (v > vidaMax.value) vidaAtual.value = vidaMax.value
      if (v < 0) vidaAtual.value = 0
    })

    watch(manaAtual, (v) => {
      if (v > manaMax.value) manaAtual.value = manaMax.value
      if (v < 0) manaAtual.value = 0
    })

    // ===== ANIMAÇÕES =====
    const animacaoDano = ref(false)
    const animacaoCura = ref(false)
    const efeitoCuraTela = ref(false)

    let ultimaVida = vidaAtual.value

    watch(vidaAtual, (novo) => {
      if (novo < ultimaVida) {
        animacaoDano.value = true
        setTimeout(() => animacaoDano.value = false, 200)
      } else if (novo > ultimaVida) {
        animacaoCura.value = true
        efeitoCuraTela.value = true

        setTimeout(() => animacaoCura.value = false, 300)
        setTimeout(() => efeitoCuraTela.value = false, 400)
      }

      ultimaVida = novo
    })

    // ===== NOME =====
    const nome = ref("Otto Vaenerys")
    const editandoNome = ref(false)
    const inputNome = ref(null)

    function ativarEdicaoNome() {
      editandoNome.value = true
      nextTick(() => {
        inputNome.value?.focus()
        inputNome.value?.select()
      })
    }

    // ===== IMAGEM =====
    const imagemStatus = ref(null)
    const inputFile = ref(null)

    function abrirUpload() {
      inputFile.value.click()
    }

    function carregarImagem(event) {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        imagemStatus.value = e.target.result
      }
      reader.readAsDataURL(file)
    }

    // ===== STATS SECUNDÁRIOS =====
    const nivel = ref(10)
    const iniciativa = ref("1+1d6")
    const defesa = ref(19)
    const pVan = ref("00")

    // ===== ATRIBUTOS =====
    const atributos = ref([
      { nome: "ROB", valor: 2 },
      { nome: "POD", valor: 4 },
      { nome: "PRE", valor: 1 },
      { nome: "MEN", valor: 0 },
      { nome: "CAR", valor: 1 },
      { nome: "SOR", valor: "" }
    ])

    function atualizarAtributo(attr, valor) {
      // permite ?
      if (attr.nome === "SOR") {
        if (valor === "" || valor === "?") {
          attr.valor = "?"
          return
        }
      }

      // números normais
      let num = Number(valor)

      if (!isNaN(num)) {
        if (num < 0) num = 0
        if (num > 10) num = 10
        attr.valor = num
      }
    }

    // mapa rápido nome -> valor numérico do atributo, usado pelas perícias
    const valorAtributo = (sigla) => {
      const attr = atributos.value.find(a => a.nome === sigla)
      if (!attr) return 0
      const num = Number(attr.valor)
      return isNaN(num) ? 0 : num
    }

    const patrimonio = ref([
      { nome: "TRI", valor: 0 },
      { nome: "QUADR", valor: 0 },
      { nome: "PENTA", valor: 0 },
      { nome: "HEXA", valor: 0 },
      { nome: "HEPTA", valor: 0 },
      { nome: "OCTA", valor: 0 },
      { nome: "ENNEA", valor: 0 },
      { nome: "DECA", valor: 0 }
    ])

    // ===== AUDIO =====
    const audio = new Audio("/sounds/heartbeat.mp3")

    onMounted(() => {
      audio.loop = true
      audio.volume = 0.25
    })

    watch(vidaCritica, (critico) => {
      if (critico) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        audio.pause()
      }
    })

    // ===== INSANIDADE E CARGAS =====
    const tiposCarga = [
      { nome: "Absurdo", max: 10 },
      { nome: "Cadavéricas", max: 4 },
      { nome: "Constelação", max: 4 },
      { nome: "Eclesiástica", max: 4 },
      { nome: "Essência", max: 4 },
      { nome: "Êxodo Ígneo", max: 3 },
      { nome: "Fúria", max: 6 },
      { nome: "KI", max: 4 },
      { nome: "Munição", max: 4 },
      { nome: "Pacto", max: 4 },
      { nome: "Rancor", max: 4 },
      { nome: "Reação em Cadeia", max: 4 },
      { nome: "Trovão", max: 4 },
      { nome: "Ventania", max: 4 },
      { nome: "Veneno", max: 4 }
    ]

    const tipoSelecionado_1 = ref("Fúria")
    const tipoSelecionado_2 = ref("Fúria")
    const tipoSelecionado_3 = ref("Fúria")

    const insanidadeAtual = ref(0)
    const insanidadeMax = ref(22)

    const cargasAtual_1 = ref(0)
    const cargasMax_1 = computed(() => {
      const tipo = tiposCarga.find(t => t.nome === tipoSelecionado_1.value)
      return tipo ? tipo.max : 0
    })

    const cargasAtual_2 = ref(0)
    const cargasMax_2 = computed(() => {
      const tipo = tiposCarga.find(t => t.nome === tipoSelecionado_2.value)
      return tipo ? tipo.max : 0
    })

    const cargasAtual_3 = ref(0)
    const cargasMax_3 = computed(() => {
      const tipo = tiposCarga.find(t => t.nome === tipoSelecionado_3.value)
      return tipo ? tipo.max : 0
    })

    watch(tipoSelecionado_1, () => { cargasAtual_1.value = 0 })
    watch(tipoSelecionado_2, () => { cargasAtual_2.value = 0 })
    watch(tipoSelecionado_3, () => { cargasAtual_3.value = 0 })

    // ===== STATUS =====
    // lista livre de condições/efeitos ativos na personagem (ex: "Fragmentado: Penumbra")
    const status = ref([
      { id: gerarId(), tipo: "", valor: "" },
      { id: gerarId(), tipo: "", valor: "" }
    ])

    function adicionarStatus() {
      status.value.push({ id: gerarId(), tipo: "", valor: "" })
    }

    function removerStatus(id) {
      status.value = status.value.filter(s => s.id !== id)
    }

    // ===== PERÍCIAS =====
    // cada perícia tem um atributo-base (usado só como referência visual) e dois valores editáveis:
    // "valor" = grau/rank da perícia, "mod" = modificador final que vai pro teste
    const pericias = ref([
      { id: gerarId(), nome: "Acrobacia", atributo: "PRE", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Arcanismo", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Armeiro", atributo: "MEN/PRE", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Atletismo", atributo: "POD", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Bloqueio", atributo: "ROB", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Ciências Ocultas", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Conhecimento", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Conjuração", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Consertos", atributo: "MEN/PRE", valor: 0, mod: 0 },

      { id: gerarId(), nome: "Furtividade", atributo: "PRE", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Herbalismo", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "História", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Intimidação", atributo: "POD", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Intuição", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Investigação", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Instinto", atributo: "SOR", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Lutar", atributo: "POD", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Manipulação", atributo: "ROB", valor: 0, mod: 0 },

      { id: gerarId(), nome: "Medicina", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Mirar", atributo: "PRE", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Percepção", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Primeiros Socorros", atributo: "MEN/PRE", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Reflexo", atributo: "PRE", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Religião", atributo: "MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Sobrevivência", atributo: "ROB/MEN", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Vontade", atributo: "ROB", valor: 0, mod: 0 },
      { id: gerarId(), nome: "Ofício", atributo: "MEN/PRE", valor: 0, mod: 0, especializacao: "Caça" }
    ])

    function atualizarPericia(item, campo, valorBruto) {
      let num = Number(valorBruto)
      if (isNaN(num)) num = 0

      if (campo === "valor") {
        if (num < 0) num = 0
        if (num > 10) num = 10
      }

      item[campo] = num
    }

    // ===== COMBATE / HABILIDADES / MAGIAS / VANTAGENS / DESVANTAGENS =====
    const abasCombate = ["Combate", "Habilidades", "Magias", "Vantagens", "Desvantagens"]
    const abaCombateAtiva = ref("Combate")

    const itensCombate = reactive({
      Combate: [],
      Habilidades: [],
      Magias: [],
      Vantagens: [],
      Desvantagens: []
    })

    function adicionarItemCombate() {
      itensCombate[abaCombateAtiva.value].push({ id: gerarId(), nome: "", detalhe: "" })
    }

    function removerItemCombate(id) {
      const aba = abaCombateAtiva.value
      itensCombate[aba] = itensCombate[aba].filter(i => i.id !== id)
    }

    // ===== INVENTÁRIO =====
    const inventario = ref([])
    const cargaMaxima = ref(30)

    const cargaAtualInventario = computed(() =>
      inventario.value.reduce((soma, item) => soma + (Number(item.peso) || 0), 0)
    )

    function adicionarItemInventario() {
      inventario.value.push({ id: gerarId(), nome: "", peso: 1 })
    }

    function removerItemInventario(id) {
      inventario.value = inventario.value.filter(i => i.id !== id)
    }

    return {
      jogador,
      classe,

      vidaAtual,
      vidaMax,
      vidaPercent,
      classeVida,
      vidaCritica,
      alterarVida,

      manaAtual,
      manaMax,
      manaPercent,
      classeMana,
      alterarMana,

      animacaoDano,
      animacaoCura,
      efeitoCuraTela,

      nome,
      editandoNome,
      inputNome,
      ativarEdicaoNome,

      imagemStatus,
      inputFile,
      abrirUpload,
      carregarImagem,

      nivel,
      iniciativa,
      defesa,
      pVan,

      atributos,
      atualizarAtributo,
      valorAtributo,
      audio,

      insanidadeAtual,
      insanidadeMax,
      cargasAtual_1,
      cargasMax_1,
      cargasAtual_2,
      cargasMax_2,
      cargasAtual_3,
      cargasMax_3,

      tiposCarga,
      tipoSelecionado_1,
      tipoSelecionado_2,
      tipoSelecionado_3,

      patrimonio,

      status,
      adicionarStatus,
      removerStatus,

      pericias,
      atualizarPericia,

      abasCombate,
      abaCombateAtiva,
      itensCombate,
      adicionarItemCombate,
      removerItemCombate,

      inventario,
      cargaMaxima,
      cargaAtualInventario,
      adicionarItemInventario,
      removerItemInventario
    }
  }
}
