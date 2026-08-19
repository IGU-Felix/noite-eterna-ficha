import { ref, reactive, computed, nextTick } from "vue"

let proximoId = 1
function gerarId() {
  return proximoId++
}

export default {
  setup() {
    // ===== IDENTIFICAÇÃO =====
    const nome = ref("Nome da Ameaça")
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
    const imagemAmeaca = ref(null)
    const inputFile = ref(null)

    function abrirUpload() {
      inputFile.value.click()
    }

    function carregarImagem(event) {
      const file = event.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => { imagemAmeaca.value = e.target.result }
      reader.readAsDataURL(file)
    }

    // ===== VIDA =====
    // livro: PV varia MUITO por tipo de ameaça (Comum = 7×ROB/nível, Humano = 70×ROB +15×ROB/nível),
    // então aqui o valor máximo fica editável direto pelo mestre em vez de travado numa fórmula.
    const vidaAtual = ref(20)
    const vidaMax = ref(20)

    const vidaPercent = computed(() => {
      const max = vidaMax.value || 1
      return Math.max(0, Math.min(100, (vidaAtual.value / max) * 100))
    })

    function alterarVida(valor) {
      vidaAtual.value = Math.max(0, Math.min(vidaMax.value, vidaAtual.value + valor))
    }

    // ===== ATRIBUTOS =====
    const atributos = ref([
      { nome: "ROB", valor: 1 },
      { nome: "POD", valor: 1 },
      { nome: "PRE", valor: 1 },
      { nome: "MEN", valor: 1 },
      { nome: "CAR", valor: 1 },
      { nome: "SOR", valor: "X" }
    ])

    function atualizarAtributo(attr, valor) {
      if (attr.nome === "SOR" && (valor === "" || valor === "X")) {
        attr.valor = "X"
        return
      }
      let num = Number(valor)
      if (!isNaN(num)) {
        if (num < 0) num = 0
        attr.valor = num
      }
    }

    const valorAtributo = (sigla) => {
      const attr = atributos.value.find(a => a.nome === sigla)
      if (!attr) return 0
      const num = Number(attr.valor)
      return isNaN(num) ? 0 : num
    }

    // ===== STATS SECUNDÁRIOS =====
    const nivel = ref(1)
    const defesa = ref(10)
    const pVan = ref(0)

    const iniciativa = computed(() => {
      const base = valorAtributo("PRE") + valorAtributo("MEN")
      return `${base} + 1d6`
    })

    // mesma tabela de requisito de acerto usada na ficha de personagem
    const tabelaAcertos = [
      { faixa: "Até 10", min: 0, max: 10, requisito: "1 acerto simples" },
      { faixa: "11 – 15", min: 11, max: 15, requisito: "2 acertos simples" },
      { faixa: "16 – 18", min: 16, max: 18, requisito: "3 acertos simples" },
      { faixa: "19 – 21", min: 19, max: 21, requisito: "3 sucessos, ao menos 1 com valor final 6" },
      { faixa: "22+", min: 22, max: Infinity, requisito: "3 sucessos, ao menos 2 com valor final 6" }
    ]

    const linhaAcertoAtiva = computed(() =>
      tabelaAcertos.find(l => defesa.value >= l.min && defesa.value <= l.max) || tabelaAcertos[0]
    )

    // ===== PERÍCIAS (lista livre — ameaças usam só 3 a 6 perícias escolhidas, não a lista toda) =====
    const pericias = ref([
      { id: gerarId(), nome: "Furtividade", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Vontade", atributo: "ROB", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Percepção", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Intimidação", atributo: "POD", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Lutar", atributo: "POD", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Reflexo", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Bloqueio", atributo: "ROB", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Conjuração", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Mirar", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Instinto", atributo: "SOR", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Acrobacia", atributo: "PRE", valor: 1, mod: 0 },
    ])

    function adicionarPericia() {
      pericias.value.push({ id: gerarId(), nome: "", atributo: "", valor: 1, mod: 0 })
    }

    function removerPericia(id) {
      pericias.value = pericias.value.filter(p => p.id !== id)
    }

    function atualizarPericia(item, valorBruto) {
      let num = Number(valorBruto)
      if (isNaN(num)) num = 0
      if (num < 0) num = 0
      item.valor = num
      item.mod = Math.floor(num / 2)
    }

    // ===== CARGAS =====
    const cargasAtual_1 = ref(0)
    const cargasMax_1 = ref(3)
    const tipoCarga_1 = ref("Fúria")

    const cargasAtual_2 = ref(0)
    const cargasMax_2 = ref(3)
    const tipoCarga_2 = ref("Fúria")

    const cargasBlocos = reactive([
  { tipo: "Fúria", atual: 0, max: 3 },
  { tipo: "Fúria", atual: 0, max: 3 }
])

function alternarCarga(bloco, i) {
  bloco.atual = (bloco.atual === i) ? 0 : i
}

    // ===== STATUS =====
    const status = ref([])

    function adicionarStatus() {
      status.value.push({ id: gerarId(), nome: "", duracao: "", efeito: "", editando: true, expandido: false })
    }
    function removerStatus(id) {
      status.value = status.value.filter(s => s.id !== id)
    }
    function salvarStatus(item) { item.editando = false }
    function editarStatus(item) { item.editando = true }

    // ===== COMBATE / HABILIDADES / MAGIAS =====
    const abas = ["Combate", "Habilidades", "Magias"]
    const abaAtiva = ref("Combate")

    const itens = reactive({ Combate: [], Habilidades: [], Magias: [] })

    function adicionarItem() {
      itens[abaAtiva.value].push({
        id: gerarId(), nome: "", detalhe: "", editando: true, expandido: false
      })
    }

    function removerItem(id) {
      itens[abaAtiva.value] = itens[abaAtiva.value].filter(i => i.id !== id)
    }

    function salvarItem(item) { item.editando = false }
    function editarItem(item) { item.editando = true }
    function toggleExpandido(item) { item.expandido = !item.expandido }

    // ===== INVENTÁRIO =====
    const inventario = ref([])
    const cargaMaxima = ref(10)

    const cargaAtualInventario = computed(() =>
      inventario.value.reduce((soma, item) => soma + (Number(item.peso) || 0), 0)
    )

    function adicionarItemInventario() {
      inventario.value.push({ id: gerarId(), nome: "", peso: 1 })
    }
    function removerItemInventario(id) {
      inventario.value = inventario.value.filter(i => i.id !== id)
    }

    const classeVida = computed(() => {
      const p = vidaPercent.value
      if (p > 60) return "vida-alta"
      if (p > 30) return "vida-media"
      return "vida-baixa"
    })

    return {
      nome, editandoNome, inputNome, ativarEdicaoNome,
      imagemAmeaca, inputFile, abrirUpload, carregarImagem,
      vidaAtual, vidaMax, vidaPercent, alterarVida,
      atributos, atualizarAtributo, valorAtributo,
      nivel, defesa, pVan, iniciativa,
      tabelaAcertos, linhaAcertoAtiva,
      pericias, adicionarPericia, removerPericia, atualizarPericia,
      cargasAtual_1, cargasMax_1, tipoCarga_1,
      cargasAtual_2, cargasMax_2, tipoCarga_2, cargasBlocos, alternarCarga,
      status, adicionarStatus, removerStatus, salvarStatus, editarStatus,
      abas, abaAtiva, itens, adicionarItem, removerItem, salvarItem, editarItem, toggleExpandido,
      classeVida, inventario, cargaMaxima, cargaAtualInventario, adicionarItemInventario, removerItemInventario
    }
  }
}