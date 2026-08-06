import { ref, reactive, computed, watch, onMounted, nextTick } from "vue"
import { racas, classes, subclassesDados, vantagens, moedas as moedasDb, formulasCombate, elementosFragmentacao, tabelaFragmentacao, referencia, truquesFeiticeiro } from "../data/index.js"

// gerador simples de ids únicos para itens de listas (status, inventário, combate...)
let proximoId = 1
function gerarId() {
  return proximoId++
}

export default {
  setup() {

    // ===== IDENTIFICAÇÃO =====
    const jogador = ref("")

    // ===== RAÇA / CLASSE / SUBCLASSE =====
    // racas, classes, subclassesDados e truquesFeiticeiro agora vêm de src/data/ (import no topo)

    const condicoesComuns = [
      "Amedrontado", "Atordoado", "Caído", "Cego", "Confuso", "Derrubado",
      "Desprevenido", "Envenenado", "Enfeitiçado", "Ensurdecido", "Exausto",
      "Fragmentado", "Imobilizado", "Incendiado", "Invisível", "Nauseado",
      "Paralisado", "Sangrando"
    ]

    const duracoesComuns = [
      "1 rodada", "2 rodadas", "1d4 rodadas", "1 turno", "1 cena",
      "Até Descanso", "Até Descanso Completo", "Permanente"
    ]


    const dadosOptions = [2, 4, 6, 8, 10, 12, 20]

    const tiposDano = [
      "Físico", "Cortante", "Perfurante", "Contundente",
      "Fogo", "Água", "Elétrico", "Vento", "Terra",
      "Radiante", "Penumbra", "Psiônico", "Nuclear", "Astral",
      "Necrótico", "Psíquico", "Ácido", "Veneno"
    ]

    const tiposMagia = [
      "Nenhum", "Fogo", "Água", "Elétrico", "Vento", "Terra", "Radiante", 
      "Penumbra", "Psiônico", "Nuclear", "Astral"
    ]

    const racaSelecionada = ref("")
    const classeSelecionada = ref("")
    const subclasseSelecionada = ref("")

    const classeInfo = computed(() =>
      classes.find(c => c.nome === classeSelecionada.value) || null
    )

    const subclassesDisponiveis = computed(() =>
      classeInfo.value ? classeInfo.value.subclasses : []
    )

    // tabela de progressão da classe escolhida. Quando o nível é um dos marcados como
    // "Habilidade de Subclasse" no livro E existe dado mapeado para a subclasse escolhida,
    // troca o nome genérico pelo nome real da habilidade daquela subclasse (com descrição).
    const progressaoClasse = computed(() => {
      if (!classeInfo.value) return []

      const dadosSub = subclassesDados[subclasseSelecionada.value] || []

      return classeInfo.value.niveis.map((habilidade, i) => {
        const nivelAtual = i + 1
        const ehSlotDeSubclasse = /Habilidade de Subclasse/i.test(habilidade)
        const specific = ehSlotDeSubclasse ? dadosSub.find(s => s.nivel === nivelAtual) : null

        return {
          nivel: nivelAtual,
          habilidade: specific ? habilidade.replace(/Habilidade de Subclasse/i, specific.nome) : habilidade,
          desc: specific ? specific.desc : "",
          alcancado: nivelAtual <= (Number(nivel.value) || 0)
        }
      })
    })

    // some subclasse ao trocar de classe, já que a subclasse anterior pode não existir na nova classe
    watch(classeSelecionada, () => { subclasseSelecionada.value = "" })

    // linha de identificação exibida no topo da ficha (ex: "Anão - Bárbaro - Caminho do Esgrimista")
    const linhaClasse = computed(() => {
      const partes = [racaSelecionada.value, classeSelecionada.value, subclasseSelecionada.value].filter(Boolean)
      return partes.length ? partes.join(" - ") : "Escolha raça, classe e subclasse"
    })

    // ===== VIDA =====
    const vidaAtual = ref(85)
    const vidaMaxBase = ref(100) // usado só enquanto nenhuma classe foi escolhida

    // livro: PV = (Dado Inicial × ROB) + (Dado por Nível × ROB × (Nível - 1))
    // cada classe tem seus próprios multiplicadores (ex: Guerreiro 10/7, Mago 10/4...)
    const vidaMax = computed(() => {
      const info = classeInfo.value
      if (!info) return vidaMaxBase.value
      const rob = valorAtributo("ROB")
      return rob * (info.dadoInicial + info.dadoPorNivel * (nivel.value - 1))
    })

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

    // a vida máxima pode mudar sozinha (trocar de classe, subir de nível, editar ROB) —
    // garante que a vida atual nunca fique maior que o novo máximo
    watch(vidaMax, (novoMax) => {
      if (vidaAtual.value > novoMax) vidaAtual.value = novoMax
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
    const nome = ref("Nome do Personagem")
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
    // livro: "Iniciativa Base ... soma de seus atributos de Pressa (PRE) e Mente (MEN)" + 1d6 na hora da rolagem
    // livro: "Defesa = Base + ⌊Nível / 2⌋ + Armadura" onde "Base = 5 + ROB"
    // livro: "A cada 5 níveis... recebem Pontos de Vantagem" — 3 pontos por marco (confirmado nas
    // tabelas de progressão de todas as classes: níveis 5, 10, 15 e 20 sempre concedem 3 P.Van)
    const nivel = ref(10)
    const armadura = ref(0)

    const iniciativa = computed(() => {
      const base = valorAtributo("PRE") + valorAtributo("MEN")
      return `${base} + 1d6`
    })

    const defesa = computed(() => {
      const base = 5 + valorAtributo("ROB")
      const bonusNivel = Math.floor((Number(nivel.value) || 0) / 2)
      return base + bonusNivel + (Number(armadura.value) || 0)
    })

    const pVan = computed(() => {
      const pontos = Math.floor((Number(nivel.value) || 0) / 5) * 3
      return String(pontos).padStart(2, "0")
    })

    // ===== ATRIBUTOS =====
    const atributos = ref([
      { nome: "ROB", valor: 2 },
      { nome: "POD", valor: 4 },
      { nome: "PRE", valor: 1 },
      { nome: "MEN", valor: 0 },
      { nome: "CAR", valor: 1 },
      { nome: "SOR", valor: "X" }
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
        if (num > 6) num = 6 // livro: atributo pode chegar no máximo a 6 P.A.
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
        audio.play().catch(() => { })
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
      { nome: "Sobrevivência", max: 4 },
      { nome: "Trovão", max: 4 },
      { nome: "Ventania", max: 4 },
      { nome: "Veneno", max: 4 }
    ]

    const tipoSelecionado_1 = ref("Fúria")
    const tipoSelecionado_2 = ref("Fúria")
    const tipoSelecionado_3 = ref("Fúria")

    const insanidadeAtual = ref(0)
    // livro: "O Valor padrão de SAN é 20 + modificador de Mente (MEN) do personagem"
    const insanidadeMax = computed(() => 20 + valorAtributo("MEN"))

    // Cargas: o livro mostra que o máximo real varia por classe/nível (ex: Cargas de Pacto =
    // nível + MEN), então em vez de travar num valor fixo por tipo, o valor inicial da lista
    // abaixo é só uma sugestão de partida — o número fica editável na ficha.
    const cargasAtual_1 = ref(0)
    const cargasMax_1 = ref(6)

    const cargasAtual_2 = ref(0)
    const cargasMax_2 = ref(6)

    const cargasAtual_3 = ref(0)
    const cargasMax_3 = ref(6)

    function definirMaxSugerido(tipoNome, maxRef) {
      const tipo = tiposCarga.find(t => t.nome === tipoNome)
      maxRef.value = tipo ? tipo.max : 0
    }

    watch(tipoSelecionado_1, (novo) => { cargasAtual_1.value = 0; definirMaxSugerido(novo, cargasMax_1) })
    watch(tipoSelecionado_2, (novo) => { cargasAtual_2.value = 0; definirMaxSugerido(novo, cargasMax_2) })
    watch(tipoSelecionado_3, (novo) => { cargasAtual_3.value = 0; definirMaxSugerido(novo, cargasMax_3) })

    // ===== STATUS =====
    // lista livre de condições/efeitos ativos na personagem (ex: "Fragmentado: Penumbra")
    const status = ref([])

    function adicionarStatus() {
      status.value.push({
        id: gerarId(),
        nome: "",
        duracao: "",
        efeito: "",
        editando: true
      })
    }

    function removerStatus(id) {
      status.value = status.value.filter(s => s.id !== id)
    }

    function salvarStatus(item) {
      item.editando = false
    }

    function editarStatus(item) {
      item.editando = true
    }

    // ===== PERÍCIAS =====
    // cada perícia tem um atributo-base (usado só como referência visual) e dois valores editáveis:
    // "valor" = grau/rank da perícia, "mod" = modificador final que vai pro teste
    const pericias = ref([
      { id: gerarId(), nome: "Acrobacia", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Arcanismo", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Armeiro", atributo: "MEN/PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Atletismo", atributo: "POD", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Bloqueio", atributo: "ROB", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Ciências Ocultas", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Conhecimentos", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Conjuração", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Consertos", atributo: "MEN/PRE", valor: 1, mod: 0 },

      { id: gerarId(), nome: "Furtividade", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Herbalismo", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "História", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Intimidação", atributo: "POD", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Intuição", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Investigação", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Instinto", atributo: "SOR", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Lutar", atributo: "POD", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Manipulação", atributo: "CAR", valor: 1, mod: 0 },

      { id: gerarId(), nome: "Medicina", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Mirar", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Percepção", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Primeiros Socorros", atributo: "MEN/PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Reflexo", atributo: "PRE", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Religião", atributo: "MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Sobrevivência", atributo: "ROB/MEN", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Vontade", atributo: "ROB", valor: 1, mod: 0 },
      { id: gerarId(), nome: "Ofício", atributo: "MEN/PRE", valor: 1, mod: 0, especializacao: "Caça" }
    ])

    // livro: "cada 2 pontos de Perícia permitem aumentar em 1 o valor de um dado" —
    // então o "mod" não é digitado à parte, ele é sempre derivado do valor investido na perícia.
    function atualizarPericia(item, valorBruto) {
      let num = Number(valorBruto)
      if (isNaN(num)) num = 0
      if (num < 0) num = 0

      item.valor = num
      item.mod = Math.floor(num / 2)
    }

    // ===== COMBATE / HABILIDADES / MAGIAS / VANTAGENS / DESVANTAGENS =====
    const abasCombate = ["Combate", "Habilidades", "Magias", "Vantagens", "Desvantagens", "Progressão"]
    const abaCombateAtiva = ref("Combate")

    const itensCombate = reactive({
      Combate: [],
      Habilidades: [],
      Magias: [],
      Vantagens: [],
      Desvantagens: []
    })

    function adicionarItemCombate() {
      const aba = abaCombateAtiva.value

      if (aba === "Combate") {
        itensCombate.Combate.push({
          id: gerarId(),
          nome: "",
          qtdDados: 1,
          tipoDado: 6,
          modificador: "",
          tipoDano: "Físico",
          efeito: "",
          editando: true // recém-criado já abre em modo de edição
        })
        return
      }

      if (aba === "Magias") {
        itensCombate.Magias.push({
          id: gerarId(),
          nome: "",
          nivel: 1,
          custoMana: 1,
          tipoDano: "Nenhum",
          efeito: "",
          editando: true
        })
        return
      }

      itensCombate[aba].push({ id: gerarId(), nome: "", detalhe: "" })
    }

    function salvarAtaque(item) {
      item.editando = false
    }

    function editarAtaque(item) {
      item.editando = true
    }

    function resumoAtaque(item) {
      const mod = item.modificador ? ` ${item.modificador}` : ""
      return `${item.qtdDados}d${item.tipoDado}${mod}`
    }

    function salvarMagia(item) {
      item.editando = false
    }

    function editarMagia(item) {
      item.editando = true
    }

    // adiciona um truque do Feiticeiro já pronto na lista de Magias (via seletor da aba)
    function adicionarTruque(nomeTruque) {
      if (!nomeTruque) return
      const truque = truquesFeiticeiro.find(t => t.nome === nomeTruque)
      if (!truque) return
      itensCombate.Magias.push({
        id: gerarId(),
        nome: truque.nome,
        nivel: truque.nivel,
        custoMana: 0,
        tipoDano: "Físico",
        efeito: `Alcance: ${truque.alcance} · Dado: ${truque.dado} · ${truque.desc}`,
        editando: false
      })
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
      racas,
      classes,
      racaSelecionada,
      classeSelecionada,
      subclasseSelecionada,
      classeInfo,
      subclassesDisponiveis,
      subclassesDados,
      progressaoClasse,
      linhaClasse,

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
      armadura,
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

      condicoesComuns,
      duracoesComuns,
      salvarStatus,
      editarStatus,

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
      removerItemInventario,

      dadosOptions,
      tiposDano,
      tiposMagia,
      salvarAtaque,
      editarAtaque,
      resumoAtaque,

      truquesFeiticeiro,
      salvarMagia,
      editarMagia,
      adicionarTruque
    }
  }
}
