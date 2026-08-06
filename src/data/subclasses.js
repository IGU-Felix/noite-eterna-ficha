export const subclassesDados = {
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
