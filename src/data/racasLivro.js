// Fonte canonica das racas conforme o livro Sistema Noite Eterna.
// A estrutura foi mantida plana para facilitar a futura migracao para arquivos JSON.

const habilidade = (id, nome, descricao, opcoes = undefined) => ({
  id,
  nome,
  descricao,
  ...(opcoes ? { opcoes } : {})
})

export const racasLivro = [
  {
    id: "anao",
    nome: "Anão",
    resumo: "Resiliente, tradicional e determinado, ligado a metal, pedra e resistencia.",
    habilidades: [
      habilidade("pele-de-granito", "Pele de Granito", "Uma vez por descanso, ao ficar com menos da metade dos PV, use uma Reacao para receber Resistencia a dano fisico (-2) ate o fim da cena."),
      habilidade("furia-da-montanha", "Furia da Montanha", "Uma vez por descanso, todos os inimigos em 3m fazem teste de ROB (Medio) ou ficam Derrubados."),
      habilidade("duro-como-pedra", "Duro como Pedra", "+3 PV no 1o nivel e +1 PV por nivel seguinte."),
      habilidade("escolha-de-pericia-anao", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Investigacao", "Intimidacao", "Conhecimentos", "Consertos"])
    ]
  },
  {
    id: "dahllan",
    nome: "Dahllan",
    resumo: "Adaptavel e ligada a natureza, com magia natural e empatia com animais.",
    habilidades: [
      habilidade("natureza-encantada", "Natureza Encantada", "Aprende a magia Controlar Plantas."),
      habilidade("amiga-das-plantas", "Amiga das Plantas", "Pode se comunicar com plantas e pequenos animais. Ao fazer um teste de Herbalismo ou Adestramento (Facil), pode obter informacoes do ambiente."),
      habilidade("casca-de-arvores", "Casca de Arvores", "Gastando sua Reacao, recebe +2 na Defesa pelo turno."),
      habilidade("escolha-de-pericia-dahllan", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Sobrevivencia", "Adestramento", "Herbalismo", "Percepcao"]),
      habilidade("empatia-selvagem", "Empatia Selvagem", "Uma vez por descanso, ao realizar um teste de Herbalismo ou Adestramento, pode rerrolar 1 dado.")
    ]
  },
  {
    id: "elfo",
    nome: "Elfo",
    resumo: "Atento, veloz e perceptivo, com conexao natural com magia e movimento.",
    habilidades: [
      habilidade("olhos-da-lua", "Olhos da Lua", "Uma vez por descanso, ao fazer um teste de Percepcao, pode adicionar +1 a um dado."),
      habilidade("passos-silenciosos", "Passos Silenciosos", "Deslocamento 12m. Uma vez por descanso, pode adicionar +1 a um dado em testes de Furtividade."),
      habilidade("graca-elfica", "Graca Elfica", "Uma vez por cena, ao usar PRE em testes durante combate, pode substituir 1 dado pelo valor 6."),
      habilidade("escolha-de-pericia-elfo", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Percepcao", "Furtividade", "Arcanismo", "Conhecimentos"]),
      habilidade("afinidade-natural", "Afinidade Natural", "Uma vez por descanso, faz um teste de Percepcao ou Arcanismo (Facil). Se passar, revela automaticamente armadilhas, passagens secretas ou pontos fracos estruturais em ate 9m.")
    ]
  },
  {
    id: "goblin",
    nome: "Goblin",
    resumo: "Agil, inteligente e engenhoso, especialista em armadilhas e sobrevivencia urbana.",
    habilidades: [
      habilidade("natureza-astuta", "Natureza Astuta", "Uma vez por descanso, pode adicionar +1 ao valor de um dado em testes que envolvam MEN."),
      habilidade("pequeno-e-agil", "Pequeno e Agil", "Deslocamento 9m. Uma vez por cena, ao realizar um teste de Furtividade e obter sucesso, seu deslocamento se torna 12m enquanto estiver furtivo."),
      habilidade("mestre-das-armadilhas", "Mestre das Armadilhas", "Uma vez por descanso, identifica automaticamente o funcionamento de uma armadilha. Se desarmada dessa forma, pode ser recolhida intacta e reaplicada com 10 minutos e teste de Consertos (Medio)."),
      habilidade("escolha-de-pericia-goblin", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Percepcao", "Furtividade", "Conhecimentos", "Consertos"]),
      habilidade("sobrevivente-de-esquinas", "Sobrevivente de Esquinas", "Ao ser exposto a uma emboscada, pode gastar sua Reacao para realizar um teste de Furtividade. Em sucesso, nao e afetado pela emboscada e mantem sua acao normal.")
    ]
  },
  {
    id: "minotauro",
    nome: "Minotauro",
    resumo: "Vigoroso, determinado e explosivo, feito para combate direto e investidas.",
    habilidades: [
      habilidade("furia-do-labirinto", "Furia do Labirinto", "Uma vez por descanso, ao entrar em combate, marca um inimigo visivel. Enquanto ele estiver vivo e visivel, seus ataques contra ele ganham +1d4 de dano."),
      habilidade("investida-brutal", "Investida Brutal", "Como acao, avanca em linha reta ate um inimigo alcancavel e realiza ataque corpo a corpo com +1d6 de dano. Se acertar, o alvo faz ROB (Medio) ou e Derrubado e empurrado 2m."),
      habilidade("instinto-selvagem", "Instinto Selvagem", "Uma vez por cena, pode rerrolar 1 dado em um teste de Intimidacao ou Percepcao."),
      habilidade("escolha-de-pericia-minotauro", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Sobrevivencia", "Intimidacao", "Atletismo", "Lutar"]),
      habilidade("corpo-de-fera", "Corpo de Fera", "Deslocamento 9m. Chifres contam como arma natural e causam 1d6 de dano cortante.")
    ]
  },
  {
    id: "qareen",
    nome: "Qareen",
    resumo: "Carismatico, exotico e misterioso, ligado a magia e influencia sobrenatural.",
    habilidades: [
      habilidade("aura-encantadora", "Aura Encantadora", "Uma vez por descanso, pode rolar novamente um teste social, exceto Intimidacao, mantendo o melhor resultado."),
      habilidade("escolha-de-pericia-qareen", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Manipulacao", "Ciencias Ocultas", "Intuicao", "Religiao"]),
      habilidade("toque-de-essencia", "Toque de Essencia", "Uma vez por cena, cria um efeito menor de magia sem custo mecanico, apenas narrativo."),
      habilidade("instinto-do-alem", "Instinto do Alem", "Soma +1 em testes para resistir a efeitos de medo ou encantamento."),
      habilidade("sopro-do-alem", "Sopro do Alem", "Uma vez por descanso, um inimigo em ate 6m faz MEN (Medio) ou fica Amedrontado por 1 rodada.")
    ]
  },
  {
    id: "golem",
    nome: "Golem",
    resumo: "Resiliente e logico, um construto vivo de pedra, ferro, cristal ou argila.",
    habilidades: [
      habilidade("nucleo-ressonante", "Nucleo Ressonante", "Ao criar o personagem, escolha a natureza do nucleo. Nucleo Fisico: +3 PV no 1o nivel e +1 PV por nivel; uma vez por descanso, Golpe Poderoso causa +1d8. Nucleo Magico: aprende uma magia de nivel 1 usando MEN e pode conjura-la uma vez por descanso; uma vez por descanso, Rajada Mistica causa 1d4 psiquico em todos os inimigos em 3m.", ["Nucleo Fisico", "Nucleo Magico"]),
      habilidade("presenca-imponente", "Presenca Imponente", "Uma vez por descanso, recebe +1 em Intimidacao contra criaturas com menos ROB."),
      habilidade("escolha-de-pericia-golem", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Conhecimentos", "Arcanismo", "Ciencias Ocultas", "Historia", "Intimidacao"]),
      habilidade("feito-de-pedra-e-runa", "Feito de Pedra e Runa", "Nao precisa comer, beber ou dormir. E imune a doencas biologicas e tem Resistencia (-2) contra venenos."),
      habilidade("lento-e-pesado", "Lento e Pesado", "Deslocamento 6m. Nao sofre reducao de movimento por armadura, carga ou terreno.")
    ]
  },
  {
    id: "halfling",
    nome: "Halfling",
    resumo: "Rapido, cauteloso e engenhoso, especialista em furtividade e sobrevivencia.",
    habilidades: [
      habilidade("sorte-sombria", "Sorte Sombria", "Uma vez por descanso, ao falhar em um teste, pode tratar um dos resultados do teste como um sucesso simples, aceitando uma pequena complicacao."),
      habilidade("escapista", "Escapista", "Uma vez por descanso, pode refazer uma rolagem de Furtividade, Esquiva ou Percepcao apos ser Detectado."),
      habilidade("escolha-de-pericia-halfling", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Furtividade", "Crime", "Percepcao", "Sobrevivencia"]),
      habilidade("pequeno-demais-pra-pegar", "Pequeno Demais Pra Pegar", "Uma vez por descanso, pode se espremer por um espaco apertado demais para uma criatura media ou maior, escapando automaticamente de agarramento, cerco ou area contida."),
      habilidade("esquiva-sortuda", "Esquiva Sortuda", "Uma vez por descanso, ao ser alvo de um ataque, recebe -2 em um dos dados do atacante.")
    ]
  },
  {
    id: "kliren",
    nome: "Kliren",
    resumo: "Inteligente, observador e agil, transformando informacao em vantagem tatica.",
    habilidades: [
      habilidade("escolha-de-pericia-kliren", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Percepcao", "Conhecimentos", "Ciencias Ocultas", "Sobrevivencia"]),
      habilidade("tatica-de-combate", "Tatica de Combate", "Uma vez por cena, gastando sua Acao Bonus, força um inimigo a rolar 1 dado a menos em seu proximo teste de ataque ou pericia relacionada a combate."),
      habilidade("reflexo-calculado", "Reflexo Calculado", "Uma vez por descanso, ao ser alvo de um ataque, pode gastar sua Reacao para reduzir o dano sofrido em 1d6."),
      habilidade("mentor-do-campo", "Mentor do Campo", "Uma vez por rodada, quando um aliado completar um teste de ataque ou pericia de combate no alcance, pode gastar sua Reacao para permitir que ele rerrole 1 dado."),
      habilidade("leitura-de-combate", "Leitura de Combate", "Uma vez por descanso, antes da iniciativa, escolhe um inimigo; o primeiro ataque de qualquer aliado contra ele na cena e automaticamente tratado como Ataque Certeiro.")
    ]
  },
  {
    id: "medusa",
    nome: "Medusa",
    resumo: "Inteligente, cautelosa e perigosa, com olhar petrificante e presenca intimidante.",
    habilidades: [
      habilidade("olhar-paralisante", "Olhar Paralisante", "Uma vez por cena, um inimigo visivel em alcance faz MEN (Medio) ou fica Paralisado por 1 rodada. Pode repetir o teste no inicio do turno."),
      habilidade("sussurro-hipnotico", "Sussurro Hipnotico", "Uma vez por descanso, um alvo em ate 3m faz MEN (Medio) ou obedece uma ordem simples e nao suicida ate o efeito terminar."),
      habilidade("pele-petrificante", "Pele Petrificante", "Uma vez por rodada, ao sofrer dano corpo a corpo, pode usar sua Reacao para causar 1d6 de dano ao atacante e reduzir seu deslocamento em 3m."),
      habilidade("escolha-de-pericia-medusa", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Percepcao", "Conhecimentos", "Ciencias Ocultas", "Sobrevivencia", "Adestramento"]),
      habilidade("peconha-do-olhar", "Peconha do Olhar", "Uma vez por descanso, fixa o olhar em um inimigo a distancia. O alvo faz ROB (Medio) ou fica com metade do deslocamento ate o fim da cena.")
    ]
  },
  {
    id: "osteon",
    nome: "Osteon",
    resumo: "Sabio, magico e calculista, mestre de energia sombria e necromantica.",
    habilidades: [
      habilidade("escolha-de-pericia-osteon", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Ciencias Ocultas", "Historia", "Conhecimentos", "Intuicao", "Religiao"]),
      habilidade("toque-de-ossos", "Toque de Ossos", "Uma vez por turno como Acao Bonus, causa 1d4 de dano de Penumbra ao tocar diretamente um alvo. Ignora resistencias fisicas."),
      habilidade("sopro-da-sepultura", "Sopro da Sepultura", "Uma vez por descanso, um inimigo em ate 3m sofre 1d6 de dano necrotico e o Osteon recupera PV igual a metade do dano causado."),
      habilidade("agarrão-espectral", "Agarrão Espectral", "Uma vez por descanso, atinge um inimigo em ate 6m mesmo atraves de paredes ou obstaculos finos. Causa 1d8 de dano necrotico e exige ROB (Medio) ou puxa o alvo 3m."),
      habilidade("vinculo-com-a-morte", "Vinculo com a Morte", "Perto de um cadaver, faz Ciencias Ocultas (Medio); em sucesso, o Mestre revela uma informacao sobre a causa da morte, tempo decorrido ou ultimo testemunho.")
    ]
  },
  {
    id: "oceanico",
    nome: "Oceânico",
    resumo: "Forte, resistente e adaptavel, mestre do combate e da sobrevivencia subaquatica.",
    habilidades: [
      habilidade("corpo-das-mares", "Corpo das Mares", "Deslocamento na agua 12m, em terra 9m. Respira debaixo d'agua e e imune a exaustao ou afogamento enquanto submerso."),
      habilidade("canto-hipnotico", "Canto Hipnotico", "Uma vez por combate, um inimigo faz Vontade (Medio) ou fica Hipnotizado por 1d4 rodadas, movendo-se 3m na direcao do Oceanico."),
      habilidade("arma-natural-aquatica", "Arma Natural Aquatica", "Cauda ou nadadeiras causam 1d6 contundente, ou 1d10 na agua. Recebe +2 de Defesa enquanto luta submerso."),
      habilidade("furia-das-mares", "Furia das Mares", "Uma vez por descanso, o proximo ataque corpo a corpo causa +1d6, ou +1d8 se estiver submerso, e empurra o alvo 2m.")
    ]
  },
  {
    id: "satiro",
    nome: "Sátiro",
    resumo: "Impulsivo, carismatico e instintivo, especialista em tensao social e caos.",
    habilidades: [
      habilidade("espirito-indomavel", "Espirito Indomavel", "+1 em testes contra medo, controle mental ou encantamento. Uma vez por cena, ao falhar em um desses testes, pode rerrolar 1 dado."),
      habilidade("saltos-ritmados", "Saltos Ritmados", "Uma vez por cena, apos realizar uma acao de movimento ou ataque, pode ganhar uma Acao Bonus adicional se executar algo impulsivo."),
      habilidade("riso-desconcertante", "Riso Desconcertante", "Uma vez por cena, um inimigo em ate 6m faz MEN contra Manipulacao ou Intimidacao do Satiro; em falha, sofre -1 dado no proximo ataque ou teste."),
      habilidade("escolha-de-pericia-satiro", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Manipulacao", "Acrobacia", "Furtividade", "Sobrevivencia"]),
      habilidade("ritmo-selvagem", "Ritmo Selvagem", "Ao reduzir um inimigo a 0 PV ou causar Sucesso Critico, pode se mover ate 3m gratuitamente. Uma vez por turno, pode saltar sobre inimigos com teste de Acrobacia para causar 1d4 contundente em cada.")
    ]
  },
  {
    id: "silfide",
    nome: "Sílfide",
    resumo: "Rapida, discreta e perceptiva, ligada ao ar, vento e mobilidade.",
    habilidades: [
      habilidade("corrente-de-vento", "Corrente de Vento", "Uma vez por cena, empurra inimigos ou objetos leves ate 3m."),
      habilidade("camuflagem-natural", "Camuflagem Natural", "Ao se mover entre folhagens, nuvens, nevoa ou ambientes abertos, recebe +1 em testes de Furtividade."),
      habilidade("passo-leve", "Passo Leve", "Deslocamento 12m, sem penalidade por terreno dificil ou obstaculos baixos. Pode atravessar superficies frageis sem barulho."),
      habilidade("escolha-de-pericia-silfide", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Acrobacia", "Artes", "Furtividade", "Sobrevivencia"]),
      habilidade("sopro-ascendente", "Sopro Ascendente", "Uma vez por descanso, pode saltar verticalmente ate 6m ou pairar suavemente ao cair, sem sofrer dano de queda.")
    ]
  },
  {
    id: "suraggel",
    nome: "Suraggel",
    resumo: "Astuto e carismatico, combina mobilidade, manipulacao e truques sobrenaturais.",
    habilidades: [
      habilidade("toque-etereo", "Toque Etereo", "Uma vez por cena, concede +1 em teste de pericia ou ataque de um aliado, ou reduz 1 de um inimigo."),
      habilidade("reflexo-celestial", "Reflexo Celestial", "Uma vez por cena, ao falhar em Esquiva ou Acrobacia, pode rerrolar 1 dado."),
      habilidade("chama-infernal", "Chama Infernal", "Uma vez por turno, exala chama que causa 1d4 de dano de fogo em inimigos adjacentes."),
      habilidade("sussurro-sombrio", "Sussurro Sombrio", "Faz Vontade contra Manipulacao ou Intimidacao; em falha, o alvo sofre -1 no proximo ataque ou pericia."),
      habilidade("escolha-de-pericia-suraggel", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Manipulacao", "Intimidacao", "Acrobacia", "Furtividade"])
    ]
  },
  {
    id: "trog",
    nome: "Trog",
    resumo: "Fisico, resistente e audacioso, feito para atrair inimigos e proteger aliados.",
    habilidades: [
      habilidade("forca-bruta", "Forca Bruta", "Soma POD aos dados de ataques corpo a corpo."),
      habilidade("pele-resistente", "Pele Resistente", "Recebe +1 PV por nivel e reduz 1 ponto de dano fisico de ataques corpo a corpo. O bonus aumenta em +1 a cada 5 niveis."),
      habilidade("provocador-selvagem", "Provocador Selvagem", "Uma vez por cena, gasta sua Acao Bonus para forcar um inimigo a fazer MEN contra Intimidacao; em falha, ele deve atacar o Trog no proximo turno."),
      habilidade("instinto-de-guarda", "Instinto de Guarda", "Uma vez por cena, ao ser atacado um aliado proximo, usa sua Reacao para obrigar o inimigo a mirar no Trog."),
      habilidade("escolha-de-pericia-trog", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Lutar", "Intimidacao", "Atletismo", "Vontade"])
    ]
  },
  {
    id: "vampiro",
    nome: "Vampiro",
    resumo: "Predador calculista e perigoso, dependente de vitalidade roubada.",
    habilidades: [
      habilidade("vitalidade-efemera", "Vitalidade Efemera", "Recebe 1d6 + ROB de PV Temporarios no inicio de cada cena. Enquanto tiver PV Temporarios, recebe +1 em testes de Atletismo, Lutar e Manipulacao. Sem PV Temporarios, fica Exaurido e sofre -1 em todos os testes."),
      habilidade("suga-vida", "Suga-Vida", "Uma vez por turno, ao acertar ataque corpo a corpo contra criatura viva, recupera PV Temporarios iguais a metade do dano causado, arredondado para cima."),
      habilidade("nevoa-sombria", "Nevoa Sombria", "Uma vez por descanso, fica imune a dano fisico e atravessa frestas por 1 rodada, mas nao pode atacar ou interagir com objetos."),
      habilidade("fascinio-predatorio", "Fascinio Predatorio", "Uma vez por descanso, um alvo em ate 6m faz MEN (Medio) ou fica Enfeiticado por 1 minuto, tratando o Vampiro como aliado de confianca."),
      habilidade("escolha-de-pericia-vampiro", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Manipulacao", "Furtividade", "Artes", "Intimidacao"])
    ]
  },
  {
    id: "duplo",
    nome: "Duplo",
    resumo: "Mestre do disfarce e da adaptacao, capaz de copiar formas e identidades.",
    habilidades: [
      habilidade("multiplas-faces", "Multiplas Faces", "Pode alterar sua aparencia fisica a vontade. A mudanca e estetica e nao concede habilidades raciais da forma copiada."),
      habilidade("escolha-de-pericia-duplo", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Manipulacao", "Furtividade", "Artes", "Intuicao"]),
      habilidade("arte-do-disfarce", "Arte do Disfarce", "Uma vez por cena, gasta uma acao e faz teste de Manipulacao ou Artes para enganar observadores; em sucesso, recebe +1 no valor de um dado nesses testes."),
      habilidade("natureza-fluida", "Natureza Fluida", "Recebe +1 no valor de um dado em testes de resistencia contra paralisia ou imobilizacao."),
      habilidade("roubo-de-identidade", "Roubo de Identidade", "Pode assumir a forma de uma criatura Comum ou inferior cujo sangue tenha coletado, armazenando cargas de Essencia ate MEN x 6. Ao gastar uma carga, escolhe duas habilidades raciais da especie por uma cena.")
    ]
  },
  {
    id: "nephilim",
    nome: "Nephilim",
    resumo: "Antigo mensageiro da luz, fragmentado entre graca e ruina.",
    habilidades: [
      habilidade("asas-carbonizadas", "Asas Carbonizadas", "Invoca asas por uma acao. Durante 1 cena, deslocamento 12m e ignora terreno dificil; ao final sofre 1d4 de dano de fogo."),
      habilidade("sangue-luminescente", "Sangue Luminescente", "Ao sofrer dano corpo a corpo, causa 1d4 de dano Radiante ao atacante por 1d6 rodadas. Se o inimigo morrer sob o efeito, recupera 1d6 PV."),
      habilidade("carne-de-consagracao", "Carne de Consagracao", "Recebe +2 PV por nivel e reduz 2 de dano fisico. Magias de cura e regeneracao nao-sagradas causam dano igual ao valor curado."),
      habilidade("o-juizo-final", "O Juizo Final", "Uma vez por descanso, inimigos em ate 6m fazem MEN contra CAR; em falha sofrem -1 em todos os testes por 1 rodada. Aliados recebem +1 no valor de um dado em ataques."),
      habilidade("escolha-de-pericia-nephilim", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Lutar", "Intimidacao", "Ciencias Ocultas", "Sobrevivencia", "Religiao"])
    ]
  },
  {
    id: "homem-rato",
    nome: "Homem Rato",
    resumo: "Desconfiado, adaptavel e dificil de exterminar, mestre das sombras urbanas.",
    habilidades: [
      habilidade("olhos-da-colonia", "Olhos da Colonia", "Possui um rato familiar. Enquanto ativo, recebe +1 em testes de Percepcao; se morrer, sofre -1 no valor de um dado em todos os testes ate o fim da cena."),
      habilidade("doenca-infecciosa", "Doenca Infecciosa", "Uma vez por cena, envenena uma arma corpo a corpo ou a distancia a ate 3m. Cada acerto aplica uma Carga de Veneno, causando 1 dano por carga no inicio do turno; as cargas acumulam ate 5."),
      habilidade("arma-natural-homem-rato", "Arma Natural", "Dentes e unhas contam como arma natural e causam 1d6 de dano cortante."),
      habilidade("caminhar-da-noite", "Caminhar da Noite", "Uma vez por cena, recebe +1 em Furtividade. Um ataque enquanto furtivo causa +1d6 de dano adicional e encerra a Furtividade."),
      habilidade("escolha-de-pericia-homem-rato", "Escolha de Pericia", "Recebe +1 em duas pericias escolhidas.", ["Furtividade", "Sobrevivencia", "Artes", "Intimidacao"])
    ]
  }
]

const mecanicasRaciais = {
  "duro-como-pedra": { pvInicial: 3, pvPorNivel: 1 },
  "graca-elfica": { uso: "cena" },
  "pele-de-granito": { uso: "descanso", status: "Resistência a dano físico (-2) até o fim da cena." },
  "casca-de-arvores": { uso: "cena", armadura: 2, status: "+2 de Armadura até o fim da cena." },
  "pele-resistente": { pvPorNivel: 1, reducaoDanoFisico: 1 },
  "feito-de-pedra-e-runa": { pvInicial: 3, pvPorNivel: 1, reducaoDanoFisico: 1 },
  "carne-de-consagracao": { pvPorNivel: 2, reducaoDanoFisico: 2 },
  "furia-da-montanha": {
    ataque: { nome: "Fúria da Montanha", atributoAtaque: "POD", qtdDados: 1, tipoDado: 6, tipoDano: "Físico", efeito: "Ação: golpeia o chão. Inimigos em 3m fazem ROB (Médio) ou ficam Derrubados.", racial: true }
  },
  "investida-brutal": {
    ataque: { nome: "Investida Brutal", atributoAtaque: "POD", qtdDados: 1, tipoDado: 6, tipoDano: "Contundente", efeito: "Ação: avance em linha reta e cause +1d6 de dano. Em acerto, ROB (Médio) ou Derrubado e empurrado 2m.", racial: true }
  },
  "natureza-encantada": {
    magia: { nome: "Controlar Plantas", nivel: 1, qtdDados: 0, tipoDado: 6, custoMana: 1, tipoDano: "Nenhum", efeito: "Magia racial: controla plantas conforme a situacao. Uso narrativo, sem custo de Mana.", racial: true }
  },
  "nucleo-ressonante": {
    uso: "descanso",
    magia: { nome: "Rajada Mística", nivel: 1, qtdDados: 1, tipoDado: 4, custoMana: 0, tipoDano: "Psiônico", efeito: "Uma vez por descanso: inimigos em 3m sofrem 1d4 de dano psiônico.", racial: true }
  }
}

const efeitosDeRolagem = {
  "empatia-selvagem": { efeitoDado: "rerolar", periciasVinculadas: ["Adestramento"] },
  "olhos-da-lua": { modificadorHabilidade: 1, periciasVinculadas: ["Percepcao"] },
  "graca-elfica": { efeitoDado: "mudar_valor", valorAlvoDado: "6", atributosVinculados: ["PRE"] },
  "passos-silenciosos": { modificadorHabilidade: 1, periciasVinculadas: ["Furtividade"] },
  "natureza-astuta": { modificadorHabilidade: 1, atributosVinculados: ["MEN"] },
  "sobrevivente-de-esquinas": { efeitoDado: "rerolar", periciasVinculadas: ["Furtividade"] },
  "instinto-selvagem": { efeitoDado: "rerolar", periciasVinculadas: ["Intimidacao", "Percepcao"] },
  "aura-encantadora": { efeitoDado: "rerolar", periciasVinculadas: ["Manipulacao", "Artes", "Intuicao", "Persuasao"] },
  "esquiva-sortuda": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["TODAS"] },
  "tatica-de-combate": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Lutar", "Mirar", "Acrobacia", "Atletismo", "Furtividade", "Percepcao"] },
  "mentor-do-campo": { efeitoDado: "rerolar", periciasVinculadas: ["Lutar", "Mirar", "Acrobacia", "Atletismo", "Furtividade", "Percepcao"] },
  "espirito-indomavel": { efeitoDado: "rerolar", periciasVinculadas: ["TODAS"] },
  "reflexo-celestial": { efeitoDado: "rerolar", periciasVinculadas: ["Acrobacia", "Reflexo"] },
  "sussurro-sombrio": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Manipulacao", "Intimidacao"] },
  "fascinio-predatorio": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Manipulacao", "Artes", "Intuicao"] },
  "arte-do-disfarce": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Manipulacao", "Artes"] },
  "natureza-fluida": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["TODAS"] },
  "o-juizo-final": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["TODAS"] },
  "canto-hipnotico": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["TODAS"] },
  "riso-desconcertante": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Manipulacao", "Intimidacao"] },
  "saltos-ritmados": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Acrobacia", "Atletismo"] },
  "toque-etereo": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["TODAS"] },
  "olhos-da-colonia": { modificadorHabilidade: 1, atributosVinculados: ["MEN"] },
  "caminhar-da-noite": { efeitoDado: "mudar_valor", valorAlvoDado: "qualquer", periciasVinculadas: ["Furtividade"] }
}

racasLivro.forEach(raca => {
  raca.habilidades.forEach(item => {
    const efeito = efeitosDeRolagem[item.id]
    const mecanica = mecanicasRaciais[item.id]
    if (efeito) Object.assign(item, efeito)
    if (mecanica) Object.assign(item, { mecanica })
  })
})

export default racasLivro
