import { ref, reactive, computed, onMounted } from "vue"

let proximoId = 1
function gerarId() {
  return proximoId++
}

function rolarD6() {
  return Math.floor(Math.random() * 6) + 1
}

const NOMES_ACAO = {
  padrao: "Ação Padrão",
  bonus: "Ação Bônus",
  movimento: "Movimento",
  reacao: "Reação"
}

export default {
  props: {
    dadosIniciais: { type: Number, default: 3 },
    modificadorInicial: { type: Number, default: 0 },
    tituloTeste: { type: String, default: "" },
    periciaNome: { type: String, default: "" },
    habilidades: { type: Array, default: () => [] },
    acoesGastas: { type: Object, default: () => ({ padrao: false, bonus: false, movimento: false, reacao: false }) },
    alternarAcao: { type: Function, default: () => {} },
    autoRolar: { type: Boolean, default: false }
  },
  emits: ["fechar"],
  setup(props) {
    const quantidadeDados = ref(props.dadosIniciais)
    const modificadorTotal = ref(props.modificadorInicial)

    const dados = reactive([])
    const modificadorRestante = ref(modificadorTotal.value)
    const jaRolou = ref(false)
    const rolando = ref(false)
    const mostraNumero = ref(false)

    function rolar() {
      const novosDados = []
      for (let i = 0; i < quantidadeDados.value; i++) {
        const natural = rolarD6()
        novosDados.push({ id: gerarId(), natural, atual: natural, exibicao: natural, ajustes: 0 })
      }
      dados.splice(0, dados.length, ...novosDados)
      modificadorRestante.value = modificadorTotal.value
      jaRolou.value = true
      mostraNumero.value = false

      // pequeno efeito de "embaralhar" antes de fixar o valor final
      rolando.value = true
      let tique = 0
      const intervalo = setInterval(() => {
        tique++
        dados.forEach(d => { d.exibicao = Math.floor(Math.random() * 6) + 1 })
        if (tique >= 7) {
          clearInterval(intervalo)
          dados.forEach(d => { d.exibicao = d.atual })
          rolando.value = false
          // após 2 segundos, mostra o número
          setTimeout(() => {
            mostraNumero.value = true
          }, 500)
        }
      }, 55)
    }

    function aumentarDado(dado) {
      if (rolando.value) return
      if (modificadorRestante.value <= 0) return
      if (dado.atual >= 6) return
      dado.atual++
      dado.exibicao = dado.atual
      dado.ajustes++
      modificadorRestante.value--
    }

    function diminuirDado(dado) {
      if (rolando.value) return
      if (dado.ajustes <= 0) return
      dado.atual--
      dado.exibicao = dado.atual
      dado.ajustes--
      modificadorRestante.value++
    }

    const sucessos = computed(() => dados.filter(d => d.atual >= 4).length)
    const criticosNaturais = computed(() => dados.filter(d => d.natural === 6).length)

    // só entram habilidades explicitamente vinculadas a esta perícia (campo "Perícia Vinculada")
    const habilidadesFiltradas = computed(() =>
      props.habilidades.filter(h => h.periciaVinculada && h.periciaVinculada === props.periciaNome)
    )

    function nomeAcao(tipo) {
      return NOMES_ACAO[tipo] || ""
    }

    function usarHabilidade(h) {
      if (!h.tipoAcao) return
      props.alternarAcao(h.tipoAcao)
    }

    // ===== ARRASTAR =====
    const posicao = ref({ x: null, y: null })
    let arrastando = false
    let offset = { x: 0, y: 0 }

    function estiloJanela() {
      if (posicao.value.x === null || posicao.value.y === null) {
        return {
          right: "24px",
          bottom: "24px",
          left: "auto",
          top: "auto",
          transform: "none"
        }
      }

      return {
        left: `${posicao.value.x}px`,
        top: `${posicao.value.y}px`,
        right: "auto",
        bottom: "auto",
        transform: "none"
      }
    }

    function iniciarArraste(e) {
      const janela = e.currentTarget.parentElement
      const estilo = window.getComputedStyle(janela)
      const left = parseFloat(estilo.left) || window.innerWidth - janela.offsetWidth - 24
      const top = parseFloat(estilo.top) || window.innerHeight - janela.offsetHeight - 24

      posicao.value = { x: left, y: top }
      offset = { x: e.clientX - left, y: e.clientY - top }
      arrastando = true
      window.addEventListener("mousemove", moverArraste)
      window.addEventListener("mouseup", pararArraste)
      e.preventDefault()
    }

    function moverArraste(e) {
      if (!arrastando) return
      const maxX = Math.max(0, window.innerWidth - 360)
      const maxY = Math.max(0, window.innerHeight - 160)
      const novaX = Math.min(Math.max(0, e.clientX - offset.x), maxX)
      const novaY = Math.min(Math.max(0, e.clientY - offset.y), maxY)
      posicao.value = { x: novaX, y: novaY }
    }

    function pararArraste() {
      arrastando = false
      window.removeEventListener("mousemove", moverArraste)
      window.removeEventListener("mouseup", pararArraste)
    }

    onMounted(() => {
      if (props.autoRolar) rolar()
    })

    return {
      quantidadeDados,
      modificadorTotal,
      modificadorRestante,
      dados,
      jaRolou,
      rolando,
      mostraNumero,
      rolar,
      aumentarDado,
      diminuirDado,
      sucessos,
      criticosNaturais,
      habilidadesFiltradas,
      nomeAcao,
      usarHabilidade,
      estiloJanela,
      iniciarArraste,
      acoesGastas: props.acoesGastas,
      alternarAcao: props.alternarAcao,
      periciaNome: props.periciaNome
    }
  }
}