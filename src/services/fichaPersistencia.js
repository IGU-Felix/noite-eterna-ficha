import { isReadonly, isRef, onMounted, watch } from "vue"

const camposIgnorados = new Set(["inputNome", "inputFile", "audio"])

function lerCookie(chave) {
  const prefixo = `${encodeURIComponent(chave)}=`
  const entrada = document.cookie.split("; ").find(item => item.startsWith(prefixo))
  return entrada ? decodeURIComponent(entrada.slice(prefixo.length)) : null
}

function salvarCookie(chave, valor) {
  document.cookie = `${encodeURIComponent(chave)}=${encodeURIComponent(valor)}; max-age=31536000; path=/; SameSite=Lax`
}

export function configurarPersistencia(chave, estado) {
  const campos = Object.entries(estado).filter(([nome, valor]) =>
    !camposIgnorados.has(nome) && typeof valor !== "function" && !isReadonly(valor)
  )

  function snapshot() {
    return Object.fromEntries(campos.map(([nome, valor]) => [
      nome,
      isRef(valor) ? valor.value : valor
    ]))
  }

  function salvar() {
    try {
      const valor = JSON.stringify(snapshot())
      if (valor.length <= 3800) {
        salvarCookie(chave, valor)
        localStorage.removeItem(chave)
      } else {
        localStorage.setItem(chave, valor)
        salvarCookie(`${chave}-ref`, "localStorage")
      }
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
