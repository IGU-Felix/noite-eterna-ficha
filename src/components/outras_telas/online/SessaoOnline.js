import { ref, computed, watch, onBeforeUnmount } from "vue"
import {
  sessaoEstado,
  criarSessao,
  entrarSessao,
  desconectarSessao,
  resetarDescanso,
  publicarIniciativa,
  enviarSyncFichaParaMestre,
  definirFichaVinculada
} from "../../../services/sessaoP2P.js"
import PlaylistMusicas from "../../bot_musica_python/PlaylistMusicas.vue"
import CardDiscord from "./CardDiscord.vue"

export default {
  components: { PlaylistMusicas, CardDiscord },
  props: {
    nomePersonagem: { type: String, default: "" },
    personagemDisponivel: { type: Boolean, default: false },
    fichaVinculadaId: { type: String, default: null },
    participantesIniciativa: { type: Array, default: () => [] }
  },
  emits: ["fechar", "abrir-ficha"],
  setup(props, { emit }) {
    const modo = ref("menu") // "menu" | "criar" | "entrar"
    const nomeInput = ref(sessaoEstado.nomeUsuario)
    const codigoPersonalizado = ref("")
    const codigoParaEntrar = ref("")
    const vincularFicha = ref(false)
    const copiado = ref(false)
    const cardAberto = ref(false)
    const iniciativaDiscordStatus = ref("")
    const API_LOCAL = "http://127.0.0.1:3001"
    const API_CONFIGURADA = (import.meta.env.VITE_BOT_API_URL || "").replace(/\/+$/, "")
    const CHAVE_API_BOT = import.meta.env.VITE_BOT_API_KEY || ""
    const ordemIniciativa = ref([])
    const arrastandoIniciativa = ref(null)
    const playlistRef = ref(null)
    const iniciativaEnviada = ref(false)
    const iniciativasOcultas = ref(new Set())
    const temporizadoresIniciativa = new Map()
    const ultimasIniciativas = new Map()
    let ultimaAssinaturaIniciativa = ""

    const ehMestre = computed(() => sessaoEstado.papel === "mestre")
    const ehJogador = computed(() => sessaoEstado.papel === "jogador")
    const iniciativaPronta = computed(() => {
      const jogadores = props.participantesIniciativa.filter(item => item.tipo !== "ameaca")
      return jogadores.length > 0 && jogadores.every(item => Number.isInteger(item.iniciativaRolada))
    })
    const todosJogadoresRolaram = computed(() => iniciativaPronta.value && !iniciativaEnviada.value)

    function alternarPastas() {
      playlistRef.value?.alternarPastas?.()
    }

    function sincronizarOrdemIniciativa(participantes) {
      const assinatura = JSON.stringify(participantes.map(item => [
        item.id, item.iniciativa, item.iniciativaRolada, item.vidaAtual, item.vidaMax
      ]))
      if (ultimaAssinaturaIniciativa && assinatura !== ultimaAssinaturaIniciativa) {
        iniciativaEnviada.value = false
      }
      ultimaAssinaturaIniciativa = assinatura
      const porId = new Map(participantes.map(item => [item.id, item]))
      const ordemAnterior = ordemIniciativa.value.filter(item => porId.has(item.id))
      const idsAtuais = new Set(ordemAnterior.map(item => item.id))
      const novos = participantes.filter(item => !idsAtuais.has(item.id))
      const ordemBase = [
        ...ordemAnterior.map(item => porId.get(item.id)),
        ...novos
      ]
      const posicoesAnteriores = new Map(ordemBase.map((item, indice) => [item.id, indice]))

      ordemIniciativa.value = ordemBase.sort((a, b) => {
        if (!ehMestre.value) {
          return (Number.isInteger(a.ordem) ? a.ordem : Infinity)
            - (Number.isInteger(b.ordem) ? b.ordem : Infinity)
        }
        const valorA = Number.isInteger(a.iniciativa) ? a.iniciativa : -Infinity
        const valorB = Number.isInteger(b.iniciativa) ? b.iniciativa : -Infinity
        return valorB - valorA || posicoesAnteriores.get(a.id) - posicoesAnteriores.get(b.id)
      })

      participantes.forEach(participante => {
        if (!Number.isInteger(participante.iniciativa)) return
        const iniciativaAnterior = ultimasIniciativas.get(participante.id)
        if (iniciativaAnterior === participante.iniciativa && temporizadoresIniciativa.has(participante.id)) return
        const timer = temporizadoresIniciativa.get(participante.id)
        clearTimeout(timer)
        iniciativasOcultas.value = new Set([...iniciativasOcultas.value].filter(id => id !== participante.id))
        ultimasIniciativas.set(participante.id, participante.iniciativa)
        temporizadoresIniciativa.set(participante.id, setTimeout(() => {
          iniciativasOcultas.value = new Set([...iniciativasOcultas.value, participante.id])
        }, 10_000))
      })

      const idsParticipantes = new Set(participantes.map(item => item.id))
      temporizadoresIniciativa.forEach((timer, id) => {
        if (!idsParticipantes.has(id)) {
          clearTimeout(timer)
          temporizadoresIniciativa.delete(id)
          ultimasIniciativas.delete(id)
        }
      })
    }

    function iniciarArrasteIniciativa(id) {
      if (!ehMestre.value) return
      arrastandoIniciativa.value = id
    }

    function soltarIniciativa(id) {
      const origem = ordemIniciativa.value.findIndex(item => item.id === arrastandoIniciativa.value)
      const destino = ordemIniciativa.value.findIndex(item => item.id === id)
      if (origem < 0 || destino < 0 || origem === destino) {
        arrastandoIniciativa.value = null
        return
      }
      const ordem = [...ordemIniciativa.value]
      const [item] = ordem.splice(origem, 1)
      ordem.splice(destino, 0, item)
      ordemIniciativa.value = ordem
      arrastandoIniciativa.value = null
    }

    function mostrarIniciativa(participante) {
      return iniciativasOcultas.value.has(participante.id) ? "—" : (participante.iniciativa ?? "—")
    }

    watch(() => props.participantesIniciativa, sincronizarOrdemIniciativa, { deep: true, immediate: true })

    watch(ordemIniciativa, (ordem) => {
      if (!ehMestre.value) return
      publicarIniciativa(ordem)
    }, { deep: true })

    onBeforeUnmount(() => {
      temporizadoresIniciativa.forEach(timer => clearTimeout(timer))
      temporizadoresIniciativa.clear()
    })

    function abrirFichaVinculada(fichaId) {
      if (fichaId) emit("abrir-ficha", fichaId)
    }

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
      const fichaAtual = vincularFicha.value && props.nomePersonagem && props.fichaVinculadaId
        ? { id: props.fichaVinculadaId, tipo: "personagem", nome: props.nomePersonagem }
        : null
      await entrarSessao(nomeInput.value, codigoParaEntrar.value, fichaAtual)
      if (fichaAtual) definirFichaVinculada(fichaAtual.id)
    }

    function sair() {
      desconectarSessao()
      modo.value = "menu"
    }

    function cancelarConexao() {
      desconectarSessao()
      modo.value = "menu"
    }

    function copiarCodigo() {
      if (!sessaoEstado.codigoSessao) return
      navigator.clipboard?.writeText(sessaoEstado.codigoSessao).then(() => {
        copiado.value = true
        setTimeout(() => { copiado.value = false }, 1500)
      }).catch(() => { })
    }

    function resetarDescansoJogador(id = null) {
      resetarDescanso(id)
    }

    async function enviarIniciativasDiscord() {
      if (!ehMestre.value) return
      iniciativaDiscordStatus.value = "Coletando iniciativas..."

      const fichas = ordemIniciativa.value.map(item => ({
        nome: item.nome,
        tipo: item.tipo,
        iniciativa: item.iniciativa
      }))

      const pendentes = fichas.filter(ficha => ficha.iniciativa === null)
      if (!fichas.length || pendentes.length) {
        iniciativaDiscordStatus.value = pendentes.length
          ? `Falta rolar a iniciativa de: ${pendentes.map(ficha => ficha.nome).join(", ")}.`
          : "Nenhum jogador com ficha vinculada foi encontrado."
        return
      }

      const usandoServidorLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname)
      const base = API_CONFIGURADA || (usandoServidorLocal ? API_LOCAL : "")
      const headers = { "Content-Type": "application/json" }
      if (CHAVE_API_BOT) headers.Authorization = `Bearer ${CHAVE_API_BOT}`

      try {
        const resposta = await fetch(`${base}/api/discord/initiative`, {
          method: "POST",
          headers,
          body: JSON.stringify({ jogadores: fichas, preservarOrdem: true })
        })
        const dados = await resposta.json().catch(() => ({}))
        if (!resposta.ok) throw new Error(dados.erro || "O bot recusou a lista de iniciativa.")
        iniciativaDiscordStatus.value = dados.empates
          ? "Iniciativas enviadas. O Mestre deve pedir novas rolagens para os empates."
          : "Iniciativas enviadas ao Discord."
        iniciativaEnviada.value = true
      } catch (erro) {
        iniciativaDiscordStatus.value = erro.message || "Não foi possível enviar as iniciativas."
      }
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
      cardAberto,
      iniciativaDiscordStatus,
      ehMestre, ehJogador,
      todosJogadoresRolaram,
      ordemIniciativa, arrastandoIniciativa,
      mostrarIniciativa,
      playlistRef,
      irParaCriar, irParaEntrar, voltar,
      confirmarCriarSessao, confirmarEntrarSessao, sair, cancelarConexao, copiarCodigo,
      resetarDescansoJogador,
      abrirFichaVinculada,
      enviarIniciativasDiscord,
      iniciarArrasteIniciativa, soltarIniciativa,
      alternarPastas,
      estiloJanela, iniciarArraste
    }
  }
}