const apiKey = import.meta.env.VITE_GEMINI_API_KEY
const model = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash"

export async function perguntarAoMestre(historico, pergunta, onTentativa) {
  if (!apiKey) {
    throw new Error("Configure VITE_GEMINI_API_KEY para consultar o livro de regras.")
  }

  onTentativa?.(1, 1)
  const conteudo = historico
    .map((mensagem) => `${mensagem.autor}: ${mensagem.texto}`)
    .concat(`usuario: ${pergunta}`)
    .join("\n")

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Responda conforme as regras de Noite Eterna.\n${conteudo}` }]
        }]
      })
    }
  )

  if (!resposta.ok) {
    throw new Error("Não foi possível consultar o livro de regras agora.")
  }

  const dados = await resposta.json()
  return dados.candidates?.[0]?.content?.parts?.[0]?.text || "Não encontrei uma resposta para essa dúvida."
}
