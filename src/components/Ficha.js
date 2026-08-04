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

    // ===== RAÇA / CLASSE / SUBCLASSE =====
    // dados extraídos diretamente do livro de regras (Sistema Noite Eterna)
    const racas = [
      { nome: "Anão", resumo: "Resilientes, honestos e determinados, cultivam tradição e honra, valorizam família e mestres artesãos, e são conhecidos por sua habilidade com metal e pedra." },
      { nome: "Dahllan", resumo: "Adaptáveis e ligadas à natureza. Sua magia natural e empatia com animais permitem influenciar o ambiente. Apesar da aparência delicada, podem se tornar feras em batalha." },
      { nome: "Elfo", resumo: "Naturalmente atentos e velozes. Sua conexão com a magia e percepção aguçada permite antecipar movimentos e reagir rapidamente. Valorizam liberdade e sabedoria." },
      { nome: "Goblin", resumo: "Ágeis, inteligentes e engenhosos. Apesar da estatura reduzida, compensam com astúcia, criatividade e rapidez, usando o ambiente a seu favor." },
      { nome: "Minotauro", resumo: "Vigorosos, determinados e de temperamento explosivo. Carregam o chamado do labirinto — testar-se em combate, superar obstáculos e provar que sua fúria é também disciplina." },
      { nome: "Qareen", resumo: "Carismáticos, exóticos e misteriosos. Alguns usam seus dons para encantar e manipular, outros para guiar e inspirar. Impossível passar despercebido." },
      { nome: "Golem", resumo: "Friamente lógicos e resilientes, sinônimo de força e resistência. Não precisam comer, beber ou dormir, mas sentem curiosidade pelo mundo." },
      { nome: "Halfling", resumo: "Rápidos, cautelosos e engenhosos. Valorizam liberdade e segurança, usando astúcia e Furtividade para sobreviver e escapar de situações perigosas." },
      { nome: "Kliren", resumo: "Inteligentes, observadores e ágeis. Dominam o uso de tática em combate e possuem ligação intuitiva com o ambiente, transformando informação em ação decisiva." },
      { nome: "Medusa", resumo: "Inteligentes, cautelosas e perigosas. Presença que intimida, corpo com traços petrificantes. Versáteis em combate e manipuladoras por natureza." },
      { nome: "Osteon", resumo: "Sábios, mágicos e calculistas. Apesar de fisicamente frágeis, são formidáveis estrategistas e mestres da magia sombria." },
      { nome: "Sereia", resumo: "Ágeis, carismáticas e manipuladoras. Dominam o ambiente aquático e têm presença sedutora e poderosa, tanto para aliados quanto inimigos." },
      { nome: "Tritão", resumo: "Fortes, resistentes e adaptáveis. Mestres do combate e da sobrevivência subaquática, também lutam em terra firme, ainda que menos ágeis." },
      { nome: "Sílfide", resumo: "Rápidas, discretas e perceptivas. Usam mobilidade e astúcia para sobreviver, escapar ou observar — excelentes exploradoras e mensageiras." },
      { nome: "Suraggel", resumo: "Astutos e carismáticos, combinam mobilidade e manipulação. Sua natureza dá habilidades de sobrevivência e truques sobrenaturais." },
      { nome: "Trog", resumo: "Físicos, resistentes e audaciosos. Prosperam no combate direto, atraindo inimigos para lutar e protegendo aliados menos robustos." },
      { nome: "Vampiro", resumo: "Predadores calculistas, astutos e perigosos. Vitalidade instável que precisa ser renovada constantemente ao custo de suas presas." },
      { nome: "Duplo", resumo: "Mestres do disfarce e da adaptação, transitam entre identidades. Frágeis fisicamente, mas com astúcia rara e talento sobrenatural para se ocultar." },
      { nome: "Nephilim", resumo: "Antigos mensageiros da luz, agora fragmentados entre graça e ruína. Protetores e guerreiros em igual medida, equilibrando poder destrutivo e cura." },
      { nome: "Sátiro", resumo: "Impulsivos, carismáticos e instintivos. Especialistas em quebrar tensões, confundir inimigos e manipular emoções. Infiltradores sociais imprevisíveis." },
      { nome: "Ratman", resumo: "Desconfiados, adaptáveis e difíceis de exterminar. Dominam a Furtividade e a sobrevivência em ambientes urbanos degradados, mortais quando subestimados." }
    ]

    // cada classe: dado de vida (texto informativo) + subclasses + progressão de nível (nome da
    // habilidade apenas — a descrição completa de cada uma está no livro de regras)
    const classes = [
      {
        nome: "Bárbaro",
        dadoVida: "12×ROB inicial, 8×ROB por nível",
        subclasses: ["Caminho do Atroz de Sangue", "Caminho do Chama Eterna", "Caminho do Protetor a Vapor", "Caminho do Arauto dos Afogados"],
        niveis: [
          "Fúria + Arma Predileta", "Resistência Brutal", "Habilidade de Subclasse", "Instinto Primitivo + Aumento de Atributo",
          "3 pontos de Vantagem", "Fúria Aprimorada", "Habilidade de Subclasse", "Pele Grossa + Aumento de Atributo",
          "Passos do Caçador", "3 pontos de Vantagem", "Habilidade de Subclasse", "Espírito Indomável + Aumento de Atributo",
          "Força Descomunal", "Resistência à Dor", "3 pontos de Vantagem", "Frenesi de Batalha + Aumento de Atributo",
          "Habilidade de Subclasse", "Pele de Pedra", "Sangue Eterno + Aumento de Atributo", "Apogeu Bárbaro + 3 pontos de Vantagem"
        ]
      },
      {
        nome: "Guerreiro",
        dadoVida: "10×ROB inicial, 7×ROB por nível",
        subclasses: ["Caminho do Esgrimista", "Caminho do Mestre da Reação", "Caminho do Fio Envolvente", "Caminho da Arma Viva"],
        niveis: [
          "Estilo de Combate + Disciplina de Aço", "Ação Extra (1x)", "Habilidade de Subclasse", "Aumento de Atributo",
          "Golpe Preciso + 3 pontos de Vantagem", "Resistência Marcial", "Habilidade de Subclasse", "Postura Defensiva + Aumento de Atributo",
          "Ataque Pesado", "3 pontos de Vantagem", "Ação Extra (2 vezes)", "Aumento de Atributo",
          "Presença de Guerra", "Resistência Heroica", "Fôlego de Ferro + 3 pontos de Vantagem", "Domínio Marcial + Aumento de Atributo",
          "Habilidade de Subclasse + 1d6 de Ataque", "Guardião da Batalha", "Aumento de Atributo", "Campeão da Noite + 3 pontos de Vantagem"
        ]
      },
      {
        nome: "Monge",
        dadoVida: "10×ROB inicial, 7×ROB por nível",
        subclasses: ["Caminho do Arauto Espiritual", "Caminho do Artista da Noite", "Caminho das Pegadas Ascendentes"],
        niveis: [
          "Golpe Desarmado + Defesa do Monge + 1 Ki + 3 Técnicas", "1 Ki + Nova Técnica de Ki", "Habilidade de Subclasse + 1 Ki", "Aumento de Atributo + 1 Ki + 2 Técnicas de Ki",
          "Golpe Aprimorado + 3 pontos de Vantagem + 1 Ki", "Movimento Ágil + 1 Ki", "Habilidade de Subclasse + 1 Ki", "Postura Defensiva + Aumento de Atributo + 1 Ki + 1 Técnica de Ki",
          "Evasão + 1 Ki", "1 Ki + 3 pontos de Vantagem", "Habilidade de Subclasse + 1d6 de Ataque + 1 Ki", "Aumento de Atributo + 1 Ki + 1 Técnica de Ki",
          "Fluxo Marcial + 1 Ki", "Resistência do Monge + 1 Ki", "Golpe Devastador + 3 pontos de Vantagem + 1 Ki", "Aumento de Atributo + 1 Ki + 1 Técnica de Ki",
          "Habilidade de Subclasse + 1 Ki", "1 Ki + 4 de Esquiva", "Aumento de Atributo + 1 Ki + 1 Técnica de Ki", "Perfeição Monástica + 3 pontos de Vantagem + 3 Ki"
        ]
      },
      {
        nome: "Atirador",
        dadoVida: "10×ROB inicial, 7×ROB por nível",
        subclasses: ["Caminho do Disparo Fantasmagórico", "Caminho da Laminarma"],
        niveis: [
          "Estilo de Tiro + Defesa Ágil", "Ação Extra", "Habilidade de Subclasse", "Aumento de Atributo",
          "Tiro Mortal + 3 Pontos de Vantagem", "Mira Letal", "Habilidade de Subclasse", "Aumento de Atributo",
          "Tiro Rápido", "3 Pontos de Vantagem", "Habilidade de Subclasse + 1d6 de Ataque", "Aumento de Atributo + Velocidade Insana",
          "Olho de Falcão", "Tiro Crítico", "Tiro Explosivo + 3 Pontos de Vantagem", "Aumento de Atributo",
          "Habilidade de Subclasse", "Recarga Instantânea", "Aumento de Atributo", "Tiro Supremo + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Paladino",
        dadoVida: "10×ROB inicial, 6×ROB por nível",
        subclasses: ["Caminho do Exorcista"],
        niveis: [
          "Imposição Sagrada / Arma Sagrada", "Juramento de Proteção", "Escolha de Subclasse", "Aura de Determinação + Aumento de Atributo",
          "3 Pontos de Vantagem", "Cura Divina", "Habilidade de Subclasse", "Golpe Sagrado Aprimorado + Aumento de Atributo",
          "Proteção Divina", "3 Pontos de Vantagem", "Aura de Inspiração + Habilidade de Subclasse", "Escudo da Fé + Aumento de Atributo",
          "Confiança", "Selo da Vigília", "3 Pontos de Vantagem", "Ira do Guardião + Aumento de Atributo",
          "Habilidade de Subclasse", "Aura de Cura Divina", "Força da Justiça + Aumento de Atributo", "Apogeu do Paladino + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Ladino",
        dadoVida: "8×ROB inicial, 5×ROB por nível",
        subclasses: ["Caminho da Extravagância", "Caminho da Pestilência"],
        niveis: [
          "Ataque Vantajoso", "Golpe de Emboscada", "Habilidade de Subclasse", "Reflexos Felinos + Aumento de Atributo",
          "3 pontos de Vantagem", "Passo Fantasma", "Habilidade de Subclasse", "Sombra em Movimento + Aumento de Atributo",
          "Ferramentas Improvisadas", "3 pontos de Vantagem", "Habilidade de Subclasse", "Mestre das Sombras + Aumento de Atributo",
          "Passo da Serpente", "Assassino", "3 pontos de Vantagem", "Execução Silenciosa + Aumento de Atributo",
          "Habilidade de Subclasse", "Impacto Imobilizante", "Assassino Perfeito + Aumento de Atributo", "Ápice do Ladino + 3 pontos de Vantagem"
        ]
      },
      {
        nome: "Mago",
        dadoVida: "10×ROB inicial, 4×ROB por nível",
        subclasses: ["Caminho do Cartomante"],
        niveis: [
          "Livro de Magias + Magia Imediata", "Reserva de Mana", "Habilidade de Subclasse", "Aumento de Atributo + Expandir Conhecimento (Magias Nv.2)",
          "3 Pontos de Vantagem", "Amplificação Arcana + Nível de Magia", "Habilidade de Subclasse", "Aumento de Atributo + Expandir Conhecimento (Magias Nv.3)",
          "Fluxo Arcano", "3 Pontos de Vantagem", "Habilidade de Subclasse", "Aumento de Atributo + Expandir Conhecimento (Magias Nv.4)",
          "Contramagia Rápida", "Magia Esculpida + Conhecimento Perdido", "3 Pontos de Vantagem", "Aumento de Atributo + Expandir Conhecimento (Magias Nv.5)",
          "Habilidade de Subclasse", "Arcano Ininterrupto", "Aumento de Atributo + Expandir Conhecimento (Magias Nv.6)", "Arquimago da Eternidade + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Feiticeiro",
        dadoVida: "8×ROB inicial, 5×ROB por nível",
        subclasses: ["Caminho do Mestre dos Truques", "Caminho do Invocador de Pesadelos"],
        niveis: [
          "Poder Latente", "Explosão de Mana", "Habilidade de Subclasse", "Aumento de Atributo + Expandir Conhecimento (Nv.2)",
          "3 Pontos de Vantagem + Ruptura Arcana", "Ritual Imperecível", "Habilidade de Subclasse", "Aumento de Atributo + Expandir Conhecimento (Nv.3)",
          "Foco Arcano", "3 Pontos de Vantagem + Canal Arcano", "Habilidade de Subclasse", "Aumento de Atributo + Expandir Conhecimento (Nv.4)",
          "Concentração Arcana", "Canalização Prolongada", "3 Pontos de Vantagem", "Aumento de Atributo + Expandir Conhecimento (Nv.5)",
          "Habilidade de Subclasse", "Magia Instantânea Parcial", "Aumento de Atributo + Expandir Conhecimento (Nv.6)", "Convergência Arcana + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Bruxo",
        dadoVida: "10×ROB inicial, 6×ROB por nível",
        subclasses: ["Caminho do Possuído", "Caminho do Sepulcro"],
        niveis: [
          "Juramento Profano + Ritual de Sangue", "Sacrifício Prematuro", "Dom do Patrono (Subclasse)", "Aumento de Atributo + Selo de Dor",
          "3 Pontos de Vantagem + Lembrança Profana", "Sacrifício de Potência", "Dom do Patrono", "Aumento de Atributo + Marca de Sangue",
          "Véu do Sacrifício", "3 Pontos de Vantagem + Corrente da Devoção", "Dom do Patrono", "Aumento de Atributo + Runa do Devoto",
          "Banquete Profano", "Lamento Profano", "3 Pontos de Vantagem + Pacto Vivo", "Aumento de Atributo + Expansão do Pacto",
          "Dom do Patrono", "Oferenda Maior", "Aumento de Atributo + Ritual Perfeito", "Apoteose Profana + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Clérigo",
        dadoVida: "10×ROB inicial, 6×ROB por nível",
        subclasses: ["Caminho do Penitente", "Caminho do Alquimista"],
        niveis: [
          "Olhar do Julgamento (Fundamentos da Anatomia)", "Luz Purificadora", "Habilidade de Subclasse", "Aumento de Atributo + Escudo da Graça",
          "Estudo dos Tecidos + Julgamento Rápido", "Prece da Salvação", "Habilidade de Subclasse", "Aumento de Atributo + Benção Clínica",
          "Cirurgia de Campo + Domínio dos Órgãos Vitais", "3 Pontos de Vantagem + Expurgo Clínico", "Habilidade de Subclasse", "Aumento de Atributo + Palavra Curativa",
          "Cartografia da Dor + Luz do Mártir", "Milagre Menor", "3 Pontos de Vantagem + Julgamento Final", "Dissecação Viva",
          "Anatomia Perfeita + Habilidade de Subclasse", "Milagre Supremo", "Aumento de Atributo + Fé Inabalável", "Apoteose Médica + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Engenheiro",
        dadoVida: "10×ROB inicial, 6×ROB por nível",
        subclasses: ["Caminho do Pirotécnico"],
        niveis: [
          "Oficina Adaptativa + Sistema Multidisciplinar", "Improviso Letal", "Habilidade de Subclasse", "Aumento de Atributo + Eficiência de Campo",
          "3 Pontos de Vantagem + Mente Analítica", "Reaproveitamento Preciso", "Habilidade de Subclasse", "Aumento de Atributo + Oficina Portátil",
          "Estabilidade Experimental", "3 Pontos de Vantagem + Análise de Campo", "Habilidade de Subclasse", "Aumento de Atributo + Engenho de Guerra",
          "Conserto de Emergência", "Plano de Contingência", "3 Pontos de Vantagem + Criação Contínua", "Aumento de Atributo + Otimização",
          "Habilidade de Subclasse", "Gênio Instável", "Aumento de Atributo + Redundância Técnica", "Apoteose da Invenção + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Bardo",
        dadoVida: "8×ROB inicial, 5×ROB por nível",
        subclasses: ["Caminho do Maestro da Liberdade"],
        niveis: [
          "Canção da Noite + Inspiração Melódica", "Ritmo de Batalha", "Habilidade de Subclasse", "Aumento de Atributo + Nova Canção",
          "3 Pontos de Vantagem + Som do Penumbra", "Multifunções + Dissonância", "Habilidade de Subclasse", "Aumento de Atributo + Nova Canção",
          "Ecos da Eternidade + Forçar Dissonância", "3 Pontos de Vantagem + Ultimo Ato", "Habilidade de Subclasse + Mensagem Subliminar", "Aumento de Atributo + Nova Canção",
          "Sinfonia Viva", "Canção Suprema", "3 Pontos de Vantagem + Som da Noite", "Aumento de Atributo + Nova Canção",
          "Habilidade de Subclasse", "Melodia Imortal", "Aumento de Atributo + Nova Canção", "Virtuoso da Noite Eterna + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Druida",
        dadoVida: "10×ROB inicial, 6×ROB por nível",
        subclasses: ["Caminho da Encarnação", "Caminho da Invocação", "Caminho do Sobrevivente"],
        niveis: [
          "Forma Espiritual Maleável + Caminho da Maldição", "Maldição Natural", "Habilidade de Subclasse", "Aumento de Atributo + Espírito Vinculado",
          "3 Pontos de Vantagem", "Expansão da Forma Espiritual", "Habilidade de Subclasse", "Aumento de Atributo + Maldição Aprimorada",
          "Persistência Espiritual", "3 Pontos de Vantagem", "Reescrita Corporal", "Aumento de Atributo + Espírito Vinculado",
          "Maldição Profunda", "Manifestação Superior", "3 Pontos de Vantagem", "Aumento de Atributo + Forma Instável",
          "Habilidade de Subclasse", "Domínio da Forma Espiritual", "Aumento de Atributo", "Mestre das Maldições + Ordenar Alma + 3 Pontos de Vantagem"
        ]
      },
      {
        nome: "Maníaco",
        dadoVida: "12×ROB inicial, 7×ROB por nível",
        subclasses: [],
        niveis: [
          "Estilo Assassino + Imortalidade Distorcida + A Presença", "Andar Imparável", "Olhos de Predador", "Aumento de Atributo",
          "Golpe Brutal", "Carne que Não Sente", "Sequência Brutal", "Aumento de Atributo",
          "Regeneração Sanguinária", "Levantamento Prematuro", "Massacre Contínuo", "Aumento de Atributo",
          "A Sombra Não Para", "Resistência Impossível", "Ressurgimento Imediato", "Aumento de Atributo",
          "Finalizador", "Aura de Dolorosa Presença", "A Fúria Não Morre", "Eu Sempre Volto"
        ]
      }
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

    // tabela de progressão da classe escolhida, já com o nível numerado e se já foi alcançado
    const progressaoClasse = computed(() => {
      if (!classeInfo.value) return []
      return classeInfo.value.niveis.map((habilidade, i) => ({
        nivel: i + 1,
        habilidade,
        alcancado: (i + 1) <= (Number(nivel.value) || 0)
      }))
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
      { id: gerarId(), nome: "Conhecimentos", atributo: "MEN", valor: 0, mod: 0 },
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
      { id: gerarId(), nome: "Manipulação", atributo: "CAR", valor: 0, mod: 0 },

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
      racas,
      classes,
      racaSelecionada,
      classeSelecionada,
      subclasseSelecionada,
      classeInfo,
      subclassesDisponiveis,
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
