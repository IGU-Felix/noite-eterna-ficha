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
      { nome: "Anão", resumo: "Resilientes, honestos e determinados, cultivam tradição e honra, valorizam família e mestres artesãos, e são conhecidos por sua habilidade com metal e pedra.",
        habilidades: [
          { nome: "Natureza Poderosa", desc: "1x/cena: +2 num dado em teste de ROB, ou +1 em teste de MEN." },
          { nome: "Geologia", desc: "+1 em testes de Sobrevivência e Percepção." },
          { nome: "Devagar e Sempre", desc: "Deslocamento 6m, não reduzido por armadura ou carga." },
          { nome: "Duro como Pedra", desc: "+3 PV no 1º nível, +1 PV por nível seguinte." },
          { nome: "Mãos de Artesão", desc: "+1 em Ofício (Ferraria/Mineração) ou Conhecimentos, à escolha." },
          { nome: "Criado no Fogo e Aço", desc: "Proficiência com machados, martelos e picaretas; +2 no dano com elas." }
        ] },
      { nome: "Dahllan", resumo: "Adaptáveis e ligadas à natureza. Sua magia natural e empatia com animais permitem influenciar o ambiente. Apesar da aparência delicada, podem se tornar feras em batalha.",
        habilidades: [
          { nome: "Natureza Encantada", desc: "1x/cena: +1 dado em teste de PRE ou MEN." },
          { nome: "Amiga das Plantas", desc: "Lança Controlar Plantas usando MEN; +1 dado ao lidar com flora." },
          { nome: "Casca de Árvores", desc: "Ação de movimento: +2 em Bloqueio/Defesa até o fim da cena." },
          { nome: "Voz da Natureza", desc: "+1 em Sobrevivência, Adestramento ou Herbalismo, à escolha." },
          { nome: "Empatia Selvagem", desc: "+1 dado ao usar Adestramento com animais." }
        ] },
      { nome: "Elfo", resumo: "Naturalmente atentos e velozes. Sua conexão com a magia e percepção aguçada permite antecipar movimentos e reagir rapidamente. Valorizam liberdade e sabedoria.",
        habilidades: [
          { nome: "Olhos da Lua", desc: "1x/cena: +1 dado em testes de Percepção." },
          { nome: "Passos Silenciosos", desc: "1x/cena: +1 dado em Furtividade; deslocamento 12m." },
          { nome: "Graça Élfica", desc: "1x/cena: substitui 1 dado de teste de PRE pelo valor máximo (6)." }
        ] },
      { nome: "Goblin", resumo: "Ágeis, inteligentes e engenhosos. Apesar da estatura reduzida, compensam com astúcia, criatividade e rapidez, usando o ambiente a seu favor.",
        habilidades: [
          { nome: "Natureza Astuta", desc: "1x/cena: +2 num dado em teste de PRE ou MEN." },
          { nome: "Pequeno e Ágil", desc: "1x/cena: deslocamento 9m, +3 em Furtividade e Esquiva." },
          { nome: "Mestre das Armadilhas", desc: "+2 num dado em testes de Armadilhas/Prestidigitação." },
          { nome: "Engenheiro", desc: "+1 em Consertos Mecânicos, Elétricos ou Conhecimentos, à escolha." },
          { nome: "Sobrevivente de Esquinas", desc: "1x/cena: rerrola 1 dado em Furtividade ou Atletismo." }
        ] },
      { nome: "Minotauro", resumo: "Vigorosos, determinados e de temperamento explosivo. Carregam o chamado do labirinto — testar-se em combate, superar obstáculos e provar que sua fúria é também disciplina.",
        habilidades: [
          { nome: "Natureza Poderosa", desc: "1x/cena: transforma um 4 em 5, ou um 5 em 6, em teste de ROB." },
          { nome: "Investida Brutal", desc: "+2 no dano ao atacar corpo a corpo após se mover 3m+ em linha reta." },
          { nome: "Instinto Selvagem", desc: "1x/cena: rerrola 1 dado em Intimidação ou Percepção." },
          { nome: "Anatomia Primal", desc: "+1 em Sobrevivência, Intimidação ou Atletismo, à escolha." },
          { nome: "Corpo de Fera", desc: "Deslocamento 9m; chifres como arma natural (1d6 cortante)." }
        ] },
      { nome: "Qareen", resumo: "Carismáticos, exóticos e misteriosos. Alguns usam seus dons para encantar e manipular, outros para guiar e inspirar. Impossível passar despercebido.",
        habilidades: [
          { nome: "Aura Encantadora", desc: "1x/cena: rerrola um teste social (exceto Intimidação), fica com o melhor." },
          { nome: "Herança Mística", desc: "+1 em Persuasão, Ocultismo ou Intuição, à escolha." },
          { nome: "Toque de Essência", desc: "1x/cena: efeito mágico menor, puramente narrativo." },
          { nome: "Instinto do Além", desc: "+2 em testes para resistir a medo ou encantamento." }
        ] },
      { nome: "Golem", resumo: "Friamente lógicos e resilientes, sinônimo de força e resistência. Não precisam comer, beber ou dormir, mas sentem curiosidade pelo mundo.",
        habilidades: [
          { nome: "Corpo Rúnico", desc: "+3 PV no 1º nível, +1 por nível; ignora 1 de dano físico." },
          { nome: "Força Colossal", desc: "1x/cena: +2 num dado em teste de POD ou MEN." },
          { nome: "Runas Vivas", desc: "+1 em duas de: Conhecimentos, Arcanismo, Ocultismo, História, Intimidação." },
          { nome: "Presença Imponente", desc: "+1 em Intimidação." },
          { nome: "Construto Vivo", desc: "Não precisa comer, beber ou dormir." },
          { nome: "Lento e Pesado", desc: "Deslocamento 6m, nunca reduzido por armadura ou carga." },
          { nome: "Resistência Rúnica", desc: "Imune a venenos e doenças biológicas." }
        ] },
      { nome: "Halfling", resumo: "Rápidos, cautelosos e engenhosos. Valorizam liberdade e segurança, usando astúcia e Furtividade para sobreviver e escapar de situações perigosas.",
        habilidades: [
          { nome: "Sorte Sombria", desc: "1x/cena: +2 num dado em qualquer teste." },
          { nome: "Passos Silenciosos", desc: "+1 em Furtividade, +2 em Esquiva." },
          { nome: "Agilidade Pequena", desc: "Deslocamento 7m, não reduzido por armadura leve." },
          { nome: "Escapista", desc: "1x/cena: rerrola Furtividade, Esquiva ou Percepção após ser detectado." }
        ] },
      { nome: "Kliren", resumo: "Inteligentes, observadores e ágeis. Dominam o uso de tática em combate e possuem ligação intuitiva com o ambiente, transformando informação em ação decisiva.",
        habilidades: [
          { nome: "Observador Perspicaz", desc: "+1 em duas perícias de percepção/conhecimento, à escolha." },
          { nome: "Tática de Combate", desc: "1x/rodada: força um inimigo a rolar 1 dado a menos." },
          { nome: "Agilidade Instintiva", desc: "+1 em Esquiva." },
          { nome: "Mentor do Campo", desc: "Reação: permite a um aliado próximo rerrolar 1 dado." }
        ] },
      { nome: "Medusa", resumo: "Inteligentes, cautelosas e perigosas. Presença que intimida, corpo com traços petrificantes. Versáteis em combate e manipuladoras por natureza.",
        habilidades: [
          { nome: "Olhar Amedrontador", desc: "1x/cena: força teste de MEN vs Intimidação ou reduz dado/deslocamento do alvo." },
          { nome: "Sibilo Venenoso", desc: "1x/cena: +2 em Intimidação, Manipulação, Acrobacia ou Furtividade." },
          { nome: "Pele Petrificante", desc: "Reação ao sofrer dano corpo a corpo: 3 dano e -3m no atacante." },
          { nome: "Tática Precisa", desc: "+1 em duas perícias de percepção/conhecimento, à escolha." }
        ] },
      { nome: "Osteon", resumo: "Sábios, mágicos e calculistas. Apesar de fisicamente frágeis, são formidáveis estrategistas e mestres da magia sombria.",
        habilidades: [
          { nome: "Sábio da Ossada", desc: "+1 em duas de: Arcanismo, Ciências Ocultas, História, Conhecimentos, Intuição." },
          { nome: "Toque de Ossos", desc: "1x/turno: 1d4 de dano necrótico ao tocar um alvo, ignora resistência física." },
          { nome: "Aura Funérea", desc: "Hostis a 3m sofrem 1d6 em ataque ou perícia." },
          { nome: "Corpo Etéreo", desc: "1x/cena: fica parcialmente incorpóreo por 1 rodada." }
        ] },
      { nome: "Sereia", resumo: "Ágeis, carismáticas e manipuladoras. Dominam o ambiente aquático e têm presença sedutora e poderosa, tanto para aliados quanto inimigos.",
        habilidades: [
          { nome: "Canto Hipnótico", desc: "1x/combate: MEN vs CAR ou o alvo fica paralisado por 1 rodada." },
          { nome: "Nadadeira Ágil", desc: "Deslocamento 12m na água, +2 em Acrobacia/Furtividade nadando." },
          { nome: "Respiração Aquática", desc: "Respira debaixo d'água sem restrições." },
          { nome: "Empatia Marinha", desc: "+1 em Acrobacia, Furtividade, Manipulação ou Conhecimentos, à escolha." }
        ] },
      { nome: "Tritão", resumo: "Fortes, resistentes e adaptáveis. Mestres do combate e da sobrevivência subaquática, também lutam em terra firme, ainda que menos ágeis.",
        habilidades: [
          { nome: "Força do Mar", desc: "1x/cena: +2 num dado em teste de POD." },
          { nome: "Nadadeira Potente", desc: "Deslocamento 12m na água, 9m em terra." },
          { nome: "Resistência Aquática", desc: "Imune a exaustão e afogamento submerso." },
          { nome: "Arma Natural Aquática", desc: "Cauda/nadadeiras como arma (1d6 contundente) na água." },
          { nome: "Resistência Submersa", desc: "+5 de Defesa em combate subaquático." }
        ] },
      { nome: "Sílfide", resumo: "Rápidas, discretas e perceptivas. Usam mobilidade e astúcia para sobreviver, escapar ou observar — excelentes exploradoras e mensageiras.",
        habilidades: [
          { nome: "Corrente de Vento", desc: "1x/cena: rajada empurra inimigos/objetos leves até 3m." },
          { nome: "Camuflagem Natural", desc: "+2 em Furtividade entre folhagem, névoa ou céu aberto." },
          { nome: "Passo Leve", desc: "Deslocamento 12m, sem penalidade por terreno difícil." }
        ] },
      { nome: "Suraggel", resumo: "Astutos e carismáticos, combinam mobilidade e manipulação. Sua natureza dá habilidades de sobrevivência e truques sobrenaturais.",
        habilidades: [
          { nome: "Toque Etéreo", desc: "1x/cena: +1 (aliado) ou -1 (inimigo) em teste/ataque ao tocar." },
          { nome: "Reflexo Celestial", desc: "Rerrola 1 dado por turno ao falhar Esquiva ou Acrobacia." },
          { nome: "Chama Infernal", desc: "1x/turno: 1d4 de dano de fogo a inimigos adjacentes." },
          { nome: "Sussurro Sombrio", desc: "Teste de MEN vs Manipulação/Intimidação para reduzir 1 no próximo teste do alvo." }
        ] },
      { nome: "Trog", resumo: "Físicos, resistentes e audaciosos. Prosperam no combate direto, atraindo inimigos para lutar e protegendo aliados menos robustos.",
        habilidades: [
          { nome: "Força Bruta", desc: "Soma POD nos dados de ataque corpo a corpo." },
          { nome: "Pele Resistente", desc: "+1 PV por nível, -1 dano físico corpo a corpo (melhora a cada 5 níveis)." },
          { nome: "Provocador Selvagem", desc: "1x/turno: força um inimigo a atacá-lo (MEN vs Intimidação)." },
          { nome: "Instinto de Guarda", desc: "Reação: desvia um ataque contra aliado próximo para si." }
        ] },
      { nome: "Vampiro", resumo: "Predadores calculistas, astutos e perigosos. Vitalidade instável que precisa ser renovada constantemente ao custo de suas presas.",
        habilidades: [
          { nome: "Olhar Hipnótico", desc: "1x/cena: MEN vs CAR ou o alvo fica paralisado por 1 turno." },
          { nome: "Vitalidade Efêmera", desc: "Recebe 1d6×ROB de PV temporário por cena." },
          { nome: "Suga-Vida", desc: "1x/turno: recupera PV temporário igual ao dano causado ao atacar." },
          { nome: "Passos da Noite", desc: "+1 dado em Furtividade ou Acrobacia no escuro." }
        ] },
      { nome: "Duplo", resumo: "Mestres do disfarce e da adaptação, transitam entre identidades. Frágeis fisicamente, mas com astúcia rara e talento sobrenatural para se ocultar.",
        habilidades: [
          { nome: "Múltiplas Faces", desc: "Altera aparência física à vontade (só estética)." },
          { nome: "Arte do Disfarce", desc: "1x/cena: teste de Manipulação/Prestidigitação para enganar observadores." },
          { nome: "Natureza Fluida", desc: "+1 dado contra paralisia ou imobilização." },
          { nome: "Roubo de Identidade", desc: "Acumula Cargas de Essência (máx. MEN×6) para assumir a forma de criaturas." },
          { nome: "Identidade Instável", desc: "Falha crítica social: 50% de chance de revelar sua forma real." }
        ] },
      { nome: "Nephilim", resumo: "Antigos mensageiros da luz, agora fragmentados entre graça e ruína. Protetores e guerreiros em igual medida, equilibrando poder destrutivo e cura.",
        habilidades: [
          { nome: "Asas Carbonizadas", desc: "1 cena: deslocamento 12m, ignora terreno difícil; depois sofre 1d4 de fogo." },
          { nome: "Sangue Luminescente", desc: "Ao sofrer dano corpo a corpo, causa 1d4 de dano de Luz ao atacante." },
          { nome: "Carne de Consagração", desc: "+2 PV por nível, -2 dano físico; curas não-sagradas causam dano." },
          { nome: "O Juízo Final", desc: "1x/descanso: MEN vs CAR em área de 6m, falha = -1 em testes por 1 rodada." }
        ] },
      { nome: "Sátiro", resumo: "Impulsivos, carismáticos e instintivos. Especialistas em quebrar tensões, confundir inimigos e manipular emoções. Infiltradores sociais imprevisíveis.",
        habilidades: [
          { nome: "Espírito Indomável", desc: "+1 contra medo/controle mental; 1x/cena rerrola ao falhar." },
          { nome: "Ritmo Selvagem", desc: "1x/turno: salta sobre inimigos próximos, 1d4 de dano contundente cada (Acrobacia)." },
          { nome: "Saltos Ritmados", desc: "1x/cena: ação bônus extra após movimento/ataque impulsivo." },
          { nome: "Riso Desconcertante", desc: "1x/cena: MEN vs Manipulação/Intimidação, falha = -1 dado no próximo teste do alvo." },
          { nome: "Instinto Bestial", desc: "Ao derrubar ou critar um inimigo, move-se 3m grátis." }
        ] },
      { nome: "Ratman", resumo: "Desconfiados, adaptáveis e difíceis de exterminar. Dominam a Furtividade e a sobrevivência em ambientes urbanos degradados, mortais quando subestimados.",
        habilidades: [
          { nome: "Rato Familiar", desc: "Um rato acompanha e dá +1 em Percepção; some 1 dado se ele morrer." },
          { nome: "Olhos da Colônia", desc: "1x/cena: envia o rato a uma sala adjacente para espiar ou sabotar." },
          { nome: "Doença Infecciosa", desc: "1x/cena: envenena uma arma; acumula Cargas de Veneno no alvo." },
          { nome: "Arma Natural", desc: "Dentes e unhas como arma (1d6 cortante)." },
          { nome: "Caminhar da Noite", desc: "1x/cena: +1 em Furtividade; ataque furtivo soma 1d6 e revela a posição." }
        ] }
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

    // progressão específica de cada subclasse (níveis onde a tabela principal diz "Habilidade de
    // Subclasse"). Nem toda subclasse do livro foi mapeada aqui — algumas (como o baralho de
    // tarô do Cartomante) são sistemas complexos demais para condensar em 4 linhas; quando não
    // há dado específico, a ficha mantém o texto genérico "Habilidade de Subclasse".
    const subclassesDados = {
      "Caminho do Atroz de Sangue": [
        { nivel: 3, nome: "Sede de Caça", desc: "Marca uma presa; +1 dado em ataques contra ela." },
        { nivel: 7, nome: "Sangue Vigoroso", desc: "Ao finalizar um inimigo, PV temp. igual a ROB; +3 dano corpo a corpo." },
        { nivel: 11, nome: "Instinto Predatório", desc: "Ataques desarmados 1d6; PV temp. em sucesso pleno/crítico." },
        { nivel: 17, nome: "Banquete Sanguinário", desc: "Ao reduzir um inimigo a 0 PV, +1d6 no próximo ataque (acumula até 3)." }
      ],
      "Caminho do Chama Eterna": [
        { nivel: 3, nome: "Chama Interior", desc: "Ataques corpo a corpo em fúria causam +1d6 de fogo." },
        { nivel: 7, nome: "Aura Incandescente", desc: "Em fúria, quem chega perto sofre 1d4 de fogo." },
        { nivel: 11, nome: "Chamas Devastadoras", desc: "1x/cena: explosão de 1d10 de fogo em área." },
        { nivel: 17, nome: "Corpo Incandescente", desc: "Em fúria: -2 dano recebido, reflete 1d4 de fogo." }
      ],
      "Caminho do Protetor a Vapor": [
        { nivel: 3, nome: "Armadura de Vapor", desc: "Em fúria: +2 armadura, +4 resistência a corte/perfuração." },
        { nivel: 7, nome: "Impacto de Vapor", desc: "Reação: explode vapor, 1d6 de fogo e empurra 2m." },
        { nivel: 11, nome: "Escudo de Vapor", desc: "+2 defesa a aliados adjacentes; reduz dano em aliado pela metade." },
        { nivel: 17, nome: "Fortaleza a Vapor", desc: "Imune a medo/paralisia por 1 turno, -5 dano recebido." }
      ],
      "Caminho do Arauto dos Afogados": [
        { nivel: 3, nome: "Correntes da Maré", desc: "Ação bônus em fúria: puxa ou imobiliza 1 inimigo a 3m." },
        { nivel: 7, nome: "Vórtice Submerso", desc: "Redemoinho: 1d6/turno e desvantagem a até 3 inimigos." },
        { nivel: 11, nome: "Mergulho Mortal", desc: "2d6 necrótico em inimigo derrubado/imobilizado; sufoca o alvo." },
        { nivel: 17, nome: "Ira das Profundezas", desc: "6m de área: 1d6 necrótico/turno, puxa inimigos, +2 armadura." }
      ],

      "Caminho do Esgrimista": [
        { nivel: 3, nome: "Mira Crítica", desc: "1x/turno: crítico soma +1d6 de dano (exige arma de esgrima)." },
        { nivel: 7, nome: "Precisão Alternada", desc: "1x/cena: rerrola um ataque que errou ou não foi crítico." },
        { nivel: 11, nome: "Ripostar", desc: "Após crítico, ganha ataque extra; efeitos em cadeia se também crítico." },
        { nivel: 17, nome: "Desafio Grandioso", desc: "Certeiros viram críticos; 1x/cena escolhe lado do inimigo p/ crítico garantido." }
      ],
      "Caminho do Mestre da Reação": [
        { nivel: 3, nome: "Quebra Passos", desc: "Reação: ataca quem errou um aliado adjacente." },
        { nivel: 7, nome: "Rancor de Batalha", desc: "Acumula cargas ao ser atacado; gasta para somar dano num acerto." },
        { nivel: 11, nome: "Quebra Crânios", desc: "Reação: agarra o atacante, ataques contra ele viram acerto garantido." },
        { nivel: 17, nome: "Impacto Brutal", desc: "Mais cargas de Rancor; pode agarrar e arremessar inimigos." }
      ],
      "Caminho do Fio Envolvente": [
        { nivel: 3, nome: "Ritmo Espiral", desc: "Ataques em sequência com ioiô sobem de dano (1d2 até 1d10)." },
        { nivel: 7, nome: "Dueto de Impacto", desc: "Maneja dois ioiôs; ataque adicional no mesmo turno." },
        { nivel: 11, nome: "Furacão de Fogo", desc: "Ioiô passa a causar dano de fogo; aplica Incendiado." },
        { nivel: 17, nome: "Mestre das Cordas", desc: "Agarra inimigo com o fio; aplica Incendiado automaticamente." }
      ],
      "Caminho da Arma Viva": [
        { nivel: 3, nome: "Supremacia Mental", desc: "Força seu hospedeiro a agir (MEN vs MEN); cura ao acertar ferido." },
        { nivel: 7, nome: "Triunfo sobre a Carne", desc: "Qualquer hospedeiro; absorve 1 perícia/proficiência dele." },
        { nivel: 11, nome: "Ferocidade Carmin", desc: "Hospedeiro +2 POD/PRE; pode ser arremessado como arma." },
        { nivel: 17, nome: "O Inimigo", desc: "Mantém 2 hospedeiros; explode em dano de Corrupção se um morrer." }
      ],

      "Caminho do Arauto Espiritual": [
        { nivel: 3, nome: "Ascensão Espiritual", desc: "Escolhe um espírito (Urgil/Niru/Tandes/Onetta) que dá um ataque elemental." },
        { nivel: 7, nome: "Sincronização dos Espíritos", desc: "Fortalece o vínculo; dano e efeitos do espírito escolhido melhoram." },
        { nivel: 11, nome: "Evolução Espiritual", desc: "O espírito passa a lutar ao seu lado como extensão sua." },
        { nivel: 17, nome: "Irrestrição Astral", desc: "Torna-se avatar do espírito escolhido; todos os ataques usam o efeito dele." }
      ],
      "Caminho do Artista da Noite": [
        { nivel: 3, nome: "Corpo de Contorcionista", desc: "+2 Acrobacia e Esquiva; escapa de amarras como ação bônus." },
        { nivel: 7, nome: "Máscaras da Noite", desc: "Veste uma máscara (Comédia/Fúria/Tragédia) com efeito próprio no alvo." },
        { nivel: 11, nome: "Artista Macabro", desc: "Arremessa objetos como armas; usa o ambiente na performance." },
        { nivel: 17, nome: "Aclamação", desc: "Aplica todas as máscaras em sequência; efeito em área de 9m." }
      ],
      "Caminho das Pegadas Ascendentes": [
        { nivel: 3, nome: "Chute Ardente", desc: "Chutes causam 2 dados de dano; ataque bônus de chute." },
        { nivel: 7, nome: "Sequência Imparável", desc: "Acerto de chute permite outro; movimento extra e derruba o alvo." },
        { nivel: 11, nome: "Ímpeto Cósmico", desc: "Chutes passam a causar 2d8 de dano Astral por 1 minuto." },
        { nivel: 17, nome: "Só Deus Sabe", desc: "Invoca Alvorah; acumula cargas de Constelação para chutes extras." }
      ],

      "Caminho do Disparo Fantasmagórico": [
        { nivel: 3, nome: "Armas Etéreas", desc: "Ataques à distância causam +1d4 espectral, ignora resistência balística." },
        { nivel: 7, nome: "Mão Amiga", desc: "Uma mão fantasma dispara junto ou sozinha (1d6 espectral)." },
        { nivel: 11, nome: "Armado até a Alma", desc: "Segunda Mão Amiga; recarregar vira ação livre." },
        { nivel: 17, nome: "Mãos da Verdade de Atlas", desc: "4 Mãos Amigas; acertos em sequência garantem críticos." }
      ],
      "Caminho da Laminarma": [
        { nivel: 3, nome: "Sinfonia de Fogo e Aço", desc: "Ataque corpo a corpo + disparo bônus (1d6 de fogo)." },
        { nivel: 7, nome: "Brasas da Rainha Carmesim", desc: "Críticos acumulam cargas de Êxodo Ígneo (+1d4 de fogo cada)." },
        { nivel: 11, nome: "Portador Demoníaco", desc: "Disparos +1d8 de fogo; arpão puxa o inimigo." },
        { nivel: 17, nome: "Lâmina Demoníaca Turboalimentada", desc: "3 ataques alternando lâmina/disparo, +1d8 de fogo cada." }
      ],

      "Caminho do Exorcista": [
        { nivel: 3, nome: "Relíquia Consagrada do Exorcista", desc: "Arma sagrada; dano extra contra espíritos e possuídos." },
        { nivel: 7, nome: "Alvo de Exorcismo", desc: "Marca um alvo (+1d8 radiante); acumula Cargas Eclesiásticas." },
        { nivel: 11, nome: "Dominância", desc: "Corrente Radiante prende o Alvo de Exorcismo." },
        { nivel: 17, nome: "Confronto Cenobítico", desc: "Duelo espiritual 1x1 isolado do mundo físico." }
      ],

      "Caminho da Pestilência": [
        { nivel: 3, nome: "Arsenal Tóxico", desc: "Prepara venenos (neurotóxico, corrosivo, paralisante e outros)." },
        { nivel: 7, nome: "Corrente de Ar Nociva", desc: "Cria Névoa Tóxica que causa dano contínuo em área." },
        { nivel: 11, nome: "Eu Estava Escondido!!", desc: "Expande a névoa; fica quase impossível de rastrear dentro dela." },
        { nivel: 17, nome: "Veneno Paranoico / Armadilhas Venenosas", desc: "Névoa causa efeitos mentais; cria armadilhas venenosas no chão." }
      ]
    }
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
