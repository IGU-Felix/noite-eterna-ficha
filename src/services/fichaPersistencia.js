import { isReadonly, isRef, onBeforeUnmount, onMounted, watch } from "vue"

const camposIgnorados = new Set([
  "inputNome", "inputFile", "audio", "vidaMaxEditada", "manaMaxEditada",
  // Dados fixos do sistema, já disponíveis no código da aplicação.
  "racas", "classes", "origens", "subclassesDados", "truquesFeiticeiro",
  "condicoesComuns", "duracoesComuns", "dadosOptions", "tiposDano", "tiposMagia",
  "tabelaAcertos", "abasCombate", "abas", "tiposCarga", "cargasBlocos",
  // Estado temporário da interface e das rolagens.
  "editandoNome", "abaCombateAtiva", "abaAtiva", "rolagemAberta", "disparadorRolagem",
  "rolagemConfig", "resultadoDano", "acoesGastas", "habilidadesGastasRolagem",
  "racasExpandidas", "somenteLeitura"
])

export function criarSnapshot(estado) {
  const campos = Object.entries(estado).filter(([nome, valor]) =>
    !camposIgnorados.has(nome) && typeof valor !== "function" && !isReadonly(valor)
  )

  const obj = Object.fromEntries(campos.map(([nome, valor]) => [
    nome,
    isRef(valor) ? valor.value : valor
  ]))

  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return obj
  }
}

export function aplicarSnapshot(estado, dados) {
  if (!dados || typeof dados !== "object") return

  // Campos estruturais prioritários para calcular limites antes de aplicar valores customizados
  const prioridades = [
    "racaSelecionada", "classeSelecionada", "subclasseSelecionada", "nivel", "atributos",
    "tipoSelecionado_1", "tipoSelecionado_2", "tipoSelecionado_3"
  ]
  const chaves = [
    ...prioridades.filter(k => k in dados),
    ...Object.keys(dados).filter(k => !prioridades.includes(k))
  ]

  chaves.forEach((nome) => {
    if (camposIgnorados.has(nome)) return
    const estadoAtual = estado[nome]
    if (estadoAtual === undefined || typeof estadoAtual === "function" || isReadonly(estadoAtual)) return

    const valorSalvo = dados[nome]
    if (valorSalvo === undefined) return

    if (isRef(estadoAtual)) {
      if (Array.isArray(estadoAtual.value) && Array.isArray(valorSalvo)) {
        if (nome === "pericias" && estadoAtual.value.some(pericia => pericia.nome === "Ofício")) {
          const salvasPorNome = new Map(
            valorSalvo.filter(pericia => pericia?.nome).map(pericia => [pericia.nome, pericia])
          )
          const nomesAtuais = new Set(estadoAtual.value.map(pericia => pericia.nome))
          const periciasAtuais = estadoAtual.value.map(pericia =>
            salvasPorNome.has(pericia.nome)
              ? { ...pericia, ...salvasPorNome.get(pericia.nome) }
              : pericia
          )
          const periciasPersonalizadas = valorSalvo.filter(pericia => !nomesAtuais.has(pericia.nome))
          estadoAtual.value = [...periciasAtuais, ...periciasPersonalizadas]
        } else {
          estadoAtual.value = JSON.parse(JSON.stringify(valorSalvo))
        }
      } else if (estadoAtual.value && typeof estadoAtual.value === "object" && valorSalvo && typeof valorSalvo === "object") {
        estadoAtual.value = JSON.parse(JSON.stringify(valorSalvo))
      } else {
        estadoAtual.value = valorSalvo
      }
    } else if (Array.isArray(estadoAtual) && Array.isArray(valorSalvo)) {
      estadoAtual.splice(0, estadoAtual.length, ...JSON.parse(JSON.stringify(valorSalvo)))
    } else if (estadoAtual && typeof estadoAtual === "object" && valorSalvo && typeof valorSalvo === "object") {
      Object.entries(valorSalvo).forEach(([subChave, subValor]) => {
        if (Array.isArray(estadoAtual[subChave]) && Array.isArray(subValor)) {
          estadoAtual[subChave].splice(0, estadoAtual[subChave].length, ...JSON.parse(JSON.stringify(subValor)))
        } else {
          estadoAtual[subChave] = JSON.parse(JSON.stringify(subValor))
        }
      })
    }
  })

  if ("vidaAtual" in dados && estado.vidaAtual && isRef(estado.vidaAtual)) {
    estado.vidaAtual.value = dados.vidaAtual
  }
  if ("manaAtual" in dados && estado.manaAtual && isRef(estado.manaAtual)) {
    estado.manaAtual.value = dados.manaAtual
  }
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

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open("noite-eterna-fichas", 1)
    requisicao.onupgradeneeded = () => requisicao.result.createObjectStore("fichas")
    requisicao.onsuccess = () => resolve(requisicao.result)
    requisicao.onerror = () => reject(requisicao.error)
  })
}

async function salvarNoBanco(chave, valor) {
  const banco = await abrirBanco()
  await new Promise((resolve, reject) => {
    const transacao = banco.transaction("fichas", "readwrite")
    transacao.objectStore("fichas").put(valor, chave)
    transacao.oncomplete = resolve
    transacao.onerror = () => reject(transacao.error)
  })
  banco.close()
}

async function lerDoBanco(chave) {
  const banco = await abrirBanco()
  const valor = await new Promise((resolve, reject) => {
    const transacao = banco.transaction("fichas", "readonly")
    const requisicao = transacao.objectStore("fichas").get(chave)
    requisicao.onsuccess = () => resolve(requisicao.result || null)
    requisicao.onerror = () => reject(requisicao.error)
  })
  banco.close()
  return valor
}

export function configurarPersistencia(chave, estado, ativo = true) {
  if (!ativo) {
    return () => {}
  }

  const campos = Object.entries(estado).filter(([nome, valor]) =>
    !camposIgnorados.has(nome) && typeof valor !== "function" && !isReadonly(valor)
  )

  function snapshot() {
    return criarSnapshot(estado)
  }

  function salvar() {
    try {
      const valor = JSON.stringify(snapshot())
      try {
        localStorage.setItem(chave, valor)
        salvarCookie(`${chave}-ref`, "localStorage")
        removerCookie(chave)
      } catch (erro) {
        salvarNoBanco(chave, valor)
          .then(() => {
            salvarCookie(`${chave}-ref`, "indexeddb")
            removerCookie(chave)
            localStorage.removeItem(chave)
          })
          .catch(() => console.warn("Não foi possível salvar a ficha no navegador."))
      }
    } catch (erro) {
      console.warn("Não foi possível salvar a ficha:", erro)
    }
  }

  async function carregar() {
    try {
      const referencia = lerCookie(`${chave}-ref`)
      const valor = referencia === "indexeddb"
        ? await lerDoBanco(chave)
        : referencia === "localStorage"
          ? localStorage.getItem(chave)
          : lerCookie(chave)
      if (!valor) return

      if (referencia === "localStorage") removerCookie(chave)

      const salvo = JSON.parse(valor)
      aplicarSnapshot(estado, salvo)
    } catch (erro) {
      console.warn("Não foi possível carregar a ficha:", erro)
    }
  }

  onMounted(carregar)
  watch(() => campos.map(([, valor]) => isRef(valor) ? valor.value : valor), salvar, { deep: true })
  onBeforeUnmount(salvar)

  return salvar
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

  aplicarSnapshot(estado, importado.dados)
}

