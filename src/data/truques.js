// Truques do Feiticeiro — magias menores que não exigem preparação nem gasto de mana.
// Extraídos do livro de regras (tabela "Truques do Feiticeiro").
export const truquesFeiticeiro = [
  { nome: "Toque Arcano", alcance: "Corpo a corpo / 3m", nivel: 1, dado: "1d4", desc: "Golpe de energia arcana que causa dano imediato ao inimigo próximo." },
  { nome: "Faísca", alcance: "6m", nivel: 1, dado: "1d4", desc: "Faísca de fogo ou eletricidade; atinge 1 inimigo ou objetos inflamáveis." },
  { nome: "Chicote de Energia", alcance: "6m", nivel: 1, dado: "1d4", desc: "Linha de energia que atinge 1 inimigo em linha reta." },
  { nome: "Impacto Etéreo", alcance: "3m", nivel: 1, dado: "Teste MEN vs MEN", desc: "Onda de força que empurra 1 inimigo até 2m." },
  { nome: "Orbe Flamejante", alcance: "3m", nivel: 1, dado: "1d4", desc: "Pequena esfera de fogo controlável que causa dano ao atingir um inimigo próximo." },
  { nome: "Choque Rápido", alcance: "4m", nivel: 1, dado: "1d4", desc: "Curto jato de energia elétrica; pode ser usado como reação." },
  { nome: "Raio Penetrante", alcance: "10m", nivel: 1, dado: "1d4", desc: "Feixe de energia que atravessa obstáculos leves, ideal para atacar inimigos distantes." },
  { nome: "Corrente de Choque", alcance: "6m", nivel: 2, dado: "1d6", desc: "Raio elétrico que salta entre até 2 inimigos próximos, causando dano em cada um." },
  { nome: "Fogo Dançante", alcance: "4m", nivel: 2, dado: "1d6", desc: "Chamas que perseguem o inimigo, causando dano contínuo por 1 turno (1d4 por turno)." },
  { nome: "Garras Etéreas", alcance: "Corpo a corpo / 3m", nivel: 2, dado: "1d6", desc: "Projeta garras de energia que atravessam armaduras leves, ignorando 5 de ROB." },
  { nome: "Mente Turbulenta", alcance: "3m", nivel: 3, dado: "Teste MEN vs MEN", desc: "Atordoa o inimigo por 1 turno se falhar; reduz 1 dado em ataque ou perícia." },
  { nome: "Cintilação Arcana", alcance: "8m", nivel: 3, dado: "1d6", desc: "Feixe de energia que ricocheteia em paredes ou obstáculos leves, atingindo 1 inimigo adicional." },
  { nome: "Rajada de Sombras", alcance: "5m", nivel: 3, dado: "1d6", desc: "Sombras cortantes que atravessam inimigos; causam dano e reduzem movimento em 1m." },
  { nome: "Campo Flamejante", alcance: "3m", nivel: 3, dado: "1d6", desc: "Cria círculo de fogo ao redor do inimigo; ele sofre dano se tentar sair da área." },
  { nome: "Poço de Gravidade", alcance: "4m", nivel: 4, dado: "Teste MEN vs MEN / 1d10", desc: "Distorção gravitacional puxa inimigos até 2m e causa dano." },
  { nome: "Estilhaço Elemental", alcance: "5m", nivel: 4, dado: "1d8", desc: "Fragmento mágico que explode ao contato em 3m; tipo de dano aleatório (fogo, gelo, ácido ou eletricidade)." },
  { nome: "Ilusão Tática", alcance: "6m", nivel: 5, dado: "Teste MEN vs MEN", desc: "Cria duplicata ilusória; inimigo atacando tem -1 dado e o Feiticeiro ganha +2 de esquiva por 1 turno." },
  { nome: "Pulso de Corrupção", alcance: "5m", nivel: 5, dado: "Teste MEN vs MEN / 1d8", desc: "Explosão de energia instável que reduz ROB e MEN de um inimigo pela metade por 1 turno." },
  { nome: "Prisão Arcana", alcance: "4m", nivel: 6, dado: "Teste MEN vs MEN", desc: "Cria campo de energia que restringe movimento e ações do inimigo por 1 turno, se falhar no teste." },
  { nome: "Véu de Confusão", alcance: "12m", nivel: 6, dado: "Teste MEN vs MEN", desc: "Névoa ilusória; inimigos devem rolar MEN para ataques ou perícias, falha reduz 1 dado." }
]
