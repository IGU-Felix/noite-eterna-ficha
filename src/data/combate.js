// Fórmulas e regras centrais de combate, extraídas do livro.

export const formulasCombate = {
  iniciativa: "PRE + MEN, mais 1d6 rolado na hora.",
  defesa: "5 + ROB + ⌊Nível ÷ 2⌋ + Armadura.",
  acertosNecessarios: [
    { defesa: "até 10", requisito: "1 acerto simples" },
    { defesa: "11 – 15", requisito: "2 acertos simples" },
    { defesa: "16 – 18", requisito: "3 acertos simples" },
    { defesa: "19 – 21", requisito: "3 sucessos, sendo ao menos 1 com valor final 6 (natural ou ajustado por perícia)" },
    { defesa: "22+", requisito: "3 sucessos, sendo ao menos 2 com valor final 6 (natural ou ajustado por perícia)" }
  ],
  grausDeAtaque: [
    { seis: 0, grau: "Normal", efeito: "Resolvido normalmente." },
    { seis: 1, grau: "Bom", efeito: "Dificulta Bloqueio e Esquiva do alvo, sem dano extra." },
    { seis: 2, grau: "Certeiro", efeito: "Causa o dano máximo da arma." },
    { seis: "3+", grau: "Crítico", efeito: "Dano máximo da arma + dano máximo de 1 dado extra; não pode ser esquivado, só bloqueado." }
  ],
  esquiva: "Rola PRE/MEN + Reflexo/Acrobacia. Hierarquia: Impossível Desviar > Crítico > Certeiro > Normal — precisa de um grau igual ou superior ao do ataque.",
  bloqueio: "Rola ROB/POD + Bloqueio. Sucesso reduz o dano à metade (ou evita por completo, dependendo do grau)."
}

// Tabela de Fragmentação Elemental: quando o elemento do ATAQUE (linha) tem vantagem sobre
// a Fragmentação do ALVO (coluna), o ataque ganha +1 dado de dano.
export const elementosFragmentacao = [
  "Fogo", "Água", "Elétrico", "Vento", "Terra", "Radiante", "Penumbra", "Psiônico", "Nuclear", "Astral"
]

export const tabelaFragmentacao = {
  Fogo: ["Vento", "Penumbra"],
  Água: ["Fogo", "Nuclear"],
  Elétrico: ["Água", "Vento"],
  Vento: ["Terra", "Radiante"],
  Terra: ["Elétrico", "Nuclear"],
  Radiante: ["Penumbra", "Astral"],
  Penumbra: ["Fogo", "Água", "Psiônico"],
  Psiônico: ["Terra", "Radiante"],
  Nuclear: ["Fogo", "Radiante"],
  Astral: ["Penumbra", "Psiônico"]
}
