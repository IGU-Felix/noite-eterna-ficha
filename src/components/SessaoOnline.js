import { ref, computed } from "vue"
import {
  sessaoEstado,
  criarSessao,
  entrarSessao,
  desconectarSessao,
  enviarSyncFichaParaMestre
} from "../services/sessaoP2P.js"

export default {
  props: {
    nomePersonagem: { type: String, default: "" },
    personagemDisponivel: { type: Boolean, default: false }
  },
  emits: ["fechar"],
  setup(props) {
    const modo = ref("menu") // "menu" | "criar" | "entrar"
    const nomeInput = ref(sessaoEstado.nomeUsuario)
    const codigoPersonalizado = ref("")
    const codigoParaEntrar = ref("")
    const vincularFicha = ref(false)
    const copiado = ref(false)

    const ehMestre = computed(() => sessaoEstado.papel === "mestre")
    const ehJogador = computed(() => sessaoEstado.papel === "jogador")

    function irParaCriar() {
      modo.value = "criar"
    }

    function irParaEntrar() {
      modo.value = "entrar"
    }

    function voltar() {
      modo.value = "menu"
    }

    async function confirmarCriarSessao() {
      await criarSessao(nomeInput.value, codigoPersonalizado.value)
    }

    async function confirmarEntrarSessao() {
      const fichaAtual = vincularFicha.value && props.nomePersonagem
        ? { id: "personagem-local", tipo: "personagem", nome: props.nomePersonagem }
        : null
      await entrarSessao(nomeInput.value, codigoParaEntrar.value, fichaAtual)
    }

    function sair() {
      desconectarSessao()
      modo.value = "menu"
    }

    function copiarCodigo() {
      if (!sessaoEstado.codigoSessao) return
      navigator.clipboard?.writeText(sessaoEstado.codigoSessao).then(() => {
        copiado.value = true
        setTimeout(() => { copiado.value = false }, 1500)
      }).catch(() => {})
    }

    // ===== ARRASTAR =====
    const posicao = ref({ x: null, y: null })
    let arrastando = false
    let offset = { x: 0, y: 0 }

    function estiloJanela() {
      if (posicao.value.x === null || posicao.value.y === null) return {}
      return { left: `${posicao.value.x}px`, top: `${posicao.value.y}px`, right: "auto", bottom: "auto" }
    }

    function iniciarArraste(e) {
      const painel = e.currentTarget.parentElement
      const caixa = painel.getBoundingClientRect()
      posicao.value = { x: caixa.left, y: caixa.top }
      offset = { x: e.clientX - caixa.left, y: e.clientY - caixa.top }
      arrastando = true
      window.addEventListener("mousemove", moverArraste)
      window.addEventListener("mouseup", pararArraste)
      e.preventDefault()
    }

    function moverArraste(e) {
      if (!arrastando) return
      posicao.value.x = Math.max(0, e.clientX - offset.x)
      posicao.value.y = Math.max(0, e.clientY - offset.y)
    }

    function pararArraste() {
      arrastando = false
      window.removeEventListener("mousemove", moverArraste)
      window.removeEventListener("mouseup", pararArraste)
    }

    return {
      sessaoEstado,
      modo, nomeInput, codigoPersonalizado, codigoParaEntrar, vincularFicha, copiado,
      ehMestre, ehJogador,
      irParaCriar, irParaEntrar, voltar,
      confirmarCriarSessao, confirmarEntrarSessao, sair, copiarCodigo,
      estiloJanela, iniciarArraste
    }
  }
}