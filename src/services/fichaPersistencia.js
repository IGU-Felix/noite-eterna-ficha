import { isReadonly, isRef, onMounted, watch } from "vue"

const camposIgnorados = new Set(["inputNome", "inputFile", "audio"])

function criarSnapshot(estado) {
  const campos = Object.entries(estado).filter(([nome, valor]) =>
    !camposIgnorados.has(nome) && typeof valor !== "function" && !isReadonly(valor)
  )

  return Object.fromEntries(campos.map(([nome, valor]) => [
    nome,
    isRef(valor) ? valor.value : valor
  ]))
}

function lerCookie(chave) {
  const prefixo = `${encodeURIComponent(chave)}=`
  const entrada = document.cookie.split("; ").find(item => item.startsWith(prefixo))
  return entrada ? decodeURIComponent(entrada.slice(prefixo.length)) : null
}

function salvarCookie(chave, valor) {
  document.cookie = `${encodeURIComponent(chave)}=${encodeURIComponent(valor)}; max-age=31536000; path=/; SameSite=Lax`
}

function removerCookie(chave) {
  document.cookie = `${encodeURIComponent(chave)}=; max-age=0; path=/; SameSite=Lax`
}

export function configurarPersistencia(chave, estado) {
  const campos = Object.entries(estado).filter(([nome, valor]) =>
    !camposIgnorados.has(nome) && typeof valor !== "function" && !isReadonly(valor)
  )

  function snapshot() {
    return criarSnapshot(estado)
  }

  function salvar() {
    try {
      const valor = JSON.stringify(snapshot())
      localStorage.setItem(chave, valor)
      salvarCookie(`${chave}-ref`, "localStorage")
      removerCookie(chave)
    } catch (erro) {
      console.warn("Não foi possível salvar a ficha:", erro)
    }
  }

  function carregar() {
    try {
      const referencia = lerCookie(`${chave}-ref`)
      const valor = referencia === "localStorage"
        ? localStorage.getItem(chave)
        : lerCookie(chave)
      if (!valor) return

      if (referencia === "localStorage") removerCookie(chave)

      const salvo = JSON.parse(valor)
      campos.forEach(([nome, estadoAtual]) => {
        if (!(nome in salvo)) return
        if (isRef(estadoAtual)) estadoAtual.value = salvo[nome]
        else if (estadoAtual && typeof estadoAtual === "object") Object.assign(estadoAtual, salvo[nome])
      })
    } catch (erro) {
      console.warn("Não foi possível carregar a ficha:", erro)
    }
  }

  onMounted(carregar)
  watch(() => campos.map(([, valor]) => isRef(valor) ? valor.value : valor), salvar, { deep: true })
}

export function exportarFichaJson(estado, tipo = "personagem", nome = "Ficha") {
  const arquivo = {
    formato: "noite-eterna-ficha",
    versao: 1,
    tipo,
    exportadoEm: new Date().toISOString(),
    dados: criarSnapshot(estado)
  }

  const conteudo = JSON.stringify(arquivo, null, 2)
  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${nome || "Ficha"}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function importarFichaJson(estado, arquivo, tipoEsperado) {
  const conteudo = await arquivo.text()
  const importado = JSON.parse(conteudo)

  if (importado.formato !== "noite-eterna-ficha" || !importado.dados || typeof importado.dados !== "object") {
    throw new Error("O arquivo não é uma ficha válida.")
  }

  if (tipoEsperado && importado.tipo !== tipoEsperado) {
    throw new Error(`Este arquivo é de uma ficha de ${importado.tipo}, não de ${tipoEsperado}.`)
  }

  const campos = Object.entries(estado).filter(([nome, valor]) =>
    !camposIgnorados.has(nome) && typeof valor !== "function" && !isReadonly(valor)
  )

  campos.forEach(([nome, estadoAtual]) => {
    if (!(nome in importado.dados)) return

    const valorSalvo = importado.dados[nome]
    if (isRef(estadoAtual)) {
      estadoAtual.value = valorSalvo
    } else if (Array.isArray(estadoAtual) && Array.isArray(valorSalvo)) {
      estadoAtual.splice(0, estadoAtual.length, ...valorSalvo)
    } else if (estadoAtual && typeof estadoAtual === "object" && valorSalvo && typeof valorSalvo === "object") {
      Object.assign(estadoAtual, valorSalvo)
    }
  })
}
