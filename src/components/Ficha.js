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
    const vidaAtual = ref(10)
    const vidaMaxBase = ref(10) // usado só enquanto nenhuma classe foi escolhida

    // livro: PV = (Dado Inicial × ROB) + (Dado por Nível × ROB × (Nível - 1))
    // cada classe tem seus próprios multiplicadores (ex: Guerreiro 10/7, Mago 10/4...)
    const vidaMax = computed(() => {
      const info = classeInfo.value
      if (!info) return vidaMaxBase.value
      const rob = valorAtributo("ROB")
      return (info.dadoInicial + rob) + (info.dadoPorNivel + rob) * (nivel.value - 1)
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
    const manaAtual = ref(10)
    const manaMaxBase = ref(10) // usado só enquanto nenhuma classe foi escolhida

    const manaMax = computed(() => {
      const info = classeInfo.value
      if (!info) return manaMaxBase.value
      const men = valorAtributo("MEN")
      return (info.dadoInicial_mn + men) + (info.dadoPorNivel_mn + men) * (nivel.value - 1)
    })

    const manaPercent = computed(() => {
      const max = manaMax.value || 1
      return (manaAtual.value / max) * 100
    })

    const classeMana = computed(() => {
      const percent = manaPercent.value
      if (percent > 60) return "mana-alta"
      if (percent > 30) return "mana-media"
      return "mana-baixa"
    })

    const manaCritica = computed(() =>
      manaPercent.value <= 20
    )

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

    watch(manaMax, (novoMax_mn) => {
      if (manaAtual.value > novoMax_mn) manaAtual.value = novoMax_mn
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
    const nivel = ref(1)
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

    const tabelaAcertos = [
      { faixa: "Até 10", min: 0, max: 10, requisito: "1 acerto simples" },
      { faixa: "11 – 15", min: 11, max: 15, requisito: "2 acertos simples" },
      { faixa: "16 – 18", min: 16, max: 18, requisito: "3 acertos simples" },
      { faixa: "19 – 21", min: 19, max: 21, requisito: "3 sucessos, sendo ao menos 1 com valor final 6 (natural ou ajustado por perícia)" },
      { faixa: "22+", min: 22, max: Infinity, requisito: "3 sucessos, sendo ao menos 2 com valor final 6 (natural ou ajustado por perícia)" }
    ]

    const linhaAcertoAtiva = computed(() =>
      tabelaAcertos.find(l => defesa.value >= l.min && defesa.value <= l.max) || tabelaAcertos[0]
    )

    const requisitoAcerto = computed(() => linhaAcertoAtiva.value.requisito)

    const pVan = computed(() => {
      const pontos = Math.floor((Number(nivel.value) || 0) / 5) * 3
      return String(pontos).padStart(2, "0")
    })

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
      // permite ?
      if (attr.nome === "SOR") {
        if (valor === "" || valor === "X") {
          attr.valor = "X"
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

    // calcula um valor a partir de uma expressão textual usando os atributos atuais.
    // exemplos válidos: "CAR", "ROB + 2", "(PRE + MEN) * 2"
    const calcularValorComAtributos = (expressao) => {
      if (expressao === null || expressao === undefined) return 0

      const texto = String(expressao).trim()
      if (!texto) return 0

      const expressaoSegura = texto.replace(/\b([A-Z]{3})\b/g, (match) => {
        const valor = valorAtributo(match)
        return Number.isFinite(valor) ? String(valor) : "0"
      })

      try {
        const resultado = Function(`"use strict"; return (${expressaoSegura})`)()
        return Number.isFinite(resultado) ? Math.round(resultado) : 0
      } catch {
        return 0
      }
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
    const tiposCarga = computed(() => [
      { nome: "Absurdo", max: calcularValorComAtributos("CAR") },
      { nome: "Adaptação", max: 10 },  // o livro não define um máximo fixo, mas 10 é o valor sugerido
      { nome: "Cadavéricas", max: calcularValorComAtributos("MEN") },
      { nome: "Constelação", max: 6 },
      { nome: "Eclesiástica", max: 10 }, // o livro não define um máximo fixo, mas 10 é o valor sugerido
      { nome: "Essência", max: calcularValorComAtributos("MEN") + 6 },
      { nome: "Êxodo Ígneo", max: 3 },
      { nome: "Fúria", max: calcularValorComAtributos("ROB") },
      { nome: "KI", max: nivel.value + 4 },
      { nome: "Munição", max: 4 }, // o livro não define um máximo fixo, mas 4 é o valor sugerido
      { nome: "Pacto", max: Math.round(nivel.value / 2) + calcularValorComAtributos("MEN") },
      { nome: "Rancor", max: (nivel.value < 17) ? 2 : 4 },
      { nome: "Reação em Cadeia", max: 3 + calcularValorComAtributos("MEN") },
      { nome: "Trovão", max: 3 },
      { nome: "Ventania", max: 3 },
      { nome: "Veneno", max: 5 }
    ])

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
      const tipo = tiposCarga.value.find(t => t.nome === tipoNome)
      maxRef.value = tipo ? tipo.max : 0
    }

    const atualizarMaximosCargas = () => {
      definirMaxSugerido(tipoSelecionado_1.value, cargasMax_1)
      definirMaxSugerido(tipoSelecionado_2.value, cargasMax_2)
      definirMaxSugerido(tipoSelecionado_3.value, cargasMax_3)
    }

    watch(() => valorAtributo("ROB"), atualizarMaximosCargas)
    watch(() => valorAtributo("POD"), atualizarMaximosCargas)
    watch(() => valorAtributo("PRE"), atualizarMaximosCargas)
    watch(() => valorAtributo("MEN"), atualizarMaximosCargas)
    watch(() => valorAtributo("CAR"), atualizarMaximosCargas)
    watch(nivel, atualizarMaximosCargas)

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
        editando: true,
        expandido: false
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
          editando: true, // recém-criado já abre em modo de edição
          expandido: false
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
          editando: true,
          expandido: false
        })
        return
      }

      itensCombate[aba].push({ id: gerarId(), nome: "", detalhe: "", expandido: false })
    }

    function salvarAtaque(item) {
      item.editando = false
    }

    function editarAtaque(item) {
      item.editando = true
    }

    function toggleExpandido(item) {
      item.expandido = !item.expandido
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
        editando: false,
        expandido: false
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
      manaCritica,
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
      calcularValorComAtributos,
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
      toggleExpandido,
      tabelaAcertos,
      linhaAcertoAtiva,
      requisitoAcerto,
      adicionarTruque
    }
  }
}
