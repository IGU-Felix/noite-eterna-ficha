import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from "vue"

let proximoId = 1
function gerarId() {
  return proximoId++
}

function rolarD6() {
  return Math.floor(Math.random() * 6) + 1
}

const NOMES_ACAO = {
  bonus: "Ação Bônus",
  movimento: "Movimento",
  reacao: "Reação",
  descanso: "Descanso",
  cena: "Cena",
  mana: "Mana"
}

export default {
  props: {
    dadosIniciais: { type: Number, default: 3 },
    modificadorInicial: { type: Number, default: 0 },
    tituloTeste: { type: String, default: "" },
    periciaNome: { type: String, default: "" },
    habilidades: { type: Array, default: () => [] },
    acoesGastas: { type: Object, default: () => ({ padrao: false, bonus: false, movimento: false, reacao: false, descanso: false, cena: false, mana: false }) },
    alternarAcao: { type: Function, default: () => {} },
    autoRolar: { type: Boolean, default: false },
    valorAtributo: { type: Function, default: () => 1 },
    rolarNovamente: { type: Function, default: () => {} },
    disparadorRolagem: { type: Number, default: 0 },
    resultadoDano: { type: Object, default: null },
    habilidadesGastasRolagem: { type: Array, default: () => [] },
    marcarHabilidadeGasta: { type: Function, default: () => {} }
  },
  emits: ["fechar"],
  setup(props) {
    const quantidadeDados = ref(props.dadosIniciais)
    const modificadorInicial = props.modificadorInicial
    const modificadorTotal = ref(props.modificadorInicial)
    const audio = new Audio("/sounds/dice_roll_sound.mp3")
    audio.volume = 0.45
    const painelId = `rolagem-${Math.random().toString(36).slice(2)}`
    const janelaAtivaGlobal = ref(typeof window !== "undefined" ? window.__janelaAtivaGeral || null : null)

    const dados = reactive([])
    const modificadorRestante = ref(modificadorTotal.value)
    const jaRolou = ref(false)
    const rolando = ref(false)
    const mostraNumero = ref(false)
    const resultadoDanoVisivel = ref(false)
    const acoesExpandidas = ref(false)
    const modificadorUsadoNaRolagem = ref(false)

    function ativarPainelNoTopo() {
      const payload = { id: painelId, tipo: "rolagem" }
      janelaAtivaGlobal.value = payload
      if (typeof window !== "undefined") {
        window.__janelaAtivaGeral = payload
        window.dispatchEvent(new CustomEvent("janela-ativa-global", { detail: payload }))
      }
    }

    function tratarJanelaAtivaGlobal(event) {
      janelaAtivaGlobal.value = event.detail || (typeof window !== "undefined" ? window.__janelaAtivaGeral : null)
    }

    const zIndexAtivo = computed(() => {
      if (typeof window !== "undefined" && window.__janelaAtivaGeral === painelId) return 350
      return 300
    })

    function rolar() {
      audio.currentTime = 0
      audio.play().catch(() => {})

      const novosDados = []
      for (let i = 0; i < quantidadeDados.value; i++) {
        const natural = rolarD6()
        novosDados.push({ id: gerarId(), natural, atual: natural, exibicao: natural, ajustes: 0 })
      }
      dados.splice(0, dados.length, ...novosDados)
      
      // Marca que o modificador foi usado e reseta para o valor inicial
      modificadorUsadoNaRolagem.value = true
      modificadorTotal.value = modificadorInicial
      modificadorRestante.value = modificadorTotal.value
      
      jaRolou.value = true
      resultadoDanoVisivel.value = false
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
          // revela o número antes do fim da transição, deixando o efeito mais antecipado
          setTimeout(() => {
            mostraNumero.value = true
            resultadoDanoVisivel.value = true
          }, 420)
        }
      }, 55)
    }

    function adicionarDado() {
      if (quantidadeDados.value >= 6) return
      quantidadeDados.value++
      if (jaRolou.value) rolar()
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

    function toggleAcoes() {
      acoesExpandidas.value = !acoesExpandidas.value
    }

    function usarHabilidade(h) {
      // Verifica se é descanso ou cena
      if (h.tipoAcao === "descanso" || h.tipoAcao === "cena") {
        // Verifica se já foi gasta nesta rolagem
        if (props.habilidadesGastasRolagem.includes(h.id)) {
          // Já foi gasta, não faz nada
          return
        }
        // Marca como gasta nesta rolagem
        props.marcarHabilidadeGasta(h.id)
      }

      if (!h.tipoAcao) return
      props.alternarAcao(h.tipoAcao)
      
      // Adiciona modificador da habilidade ao modificador total
      if (h.modificadorHabilidade) {
        // Se já usou na rolagem anterior, reseta o flag
        if (modificadorUsadoNaRolagem.value) {
          modificadorUsadoNaRolagem.value = false
          modificadorTotal.value = modificadorInicial + h.modificadorHabilidade
        } else {
          modificadorTotal.value += h.modificadorHabilidade
        }
        modificadorRestante.value = modificadorTotal.value
      }
    }

    function podeUsarHabilidade(h) {
      // Se não tem tipo de ação, pode usar
      if (!h.tipoAcao) return true
      // Se é descanso ou cena, só pode usar se não foi gasta nesta rolagem
      if (h.tipoAcao === "descanso" || h.tipoAcao === "cena") {
        return !props.habilidadesGastasRolagem.includes(h.id)
      }
      // Outras ações podem ser usadas se a ação não foi gasta
      return !props.acoesGastas[h.tipoAcao]
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
      if (typeof window !== "undefined") {
        window.addEventListener("janela-ativa-global", tratarJanelaAtivaGlobal)
      }
      
      // Inicializa os dados sem rolar (mostra na tela)
      const novosDados = []
      for (let i = 0; i < quantidadeDados.value; i++) {
        novosDados.push({ id: gerarId(), natural: 1, atual: 1, exibicao: 1, ajustes: 0 })
      }
      dados.splice(0, dados.length, ...novosDados)
      jaRolou.value = true
      
      // Observa mudanças no atributo
      watch(() => props.valorAtributo(), () => {
        const novoValor = props.valorAtributo()
        if (novoValor !== quantidadeDados.value && jaRolou.value) {
          quantidadeDados.value = novoValor || 1
          rolar()
        }
      })

      // Observa trigger de rolagem novamente
      watch(() => props.disparadorRolagem, () => {
        if (jaRolou.value) {
          // Reseta o flag quando rolar novamente
          modificadorUsadoNaRolagem.value = false
          rolar()
        }
      })

      if (props.autoRolar) rolar()
    })

    onBeforeUnmount(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("janela-ativa-global", tratarJanelaAtivaGlobal)
      }
    })

    return {
      quantidadeDados,
      modificadorTotal,
      modificadorRestante,
      dados,
      jaRolou,
      rolando,
      mostraNumero,
      resultadoDanoVisivel,
      zIndexAtivo,
      rolar,
      ativarPainelNoTopo,
      adicionarDado,
      aumentarDado,
      diminuirDado,
      sucessos,
      criticosNaturais,
      habilidadesFiltradas,
      nomeAcao,
      toggleAcoes,
      usarHabilidade,
      podeUsarHabilidade,
      estiloJanela,
      iniciarArraste,
      acoesExpandidas,
      acoesGastas: props.acoesGastas,
      alternarAcao: props.alternarAcao,
      periciaNome: props.periciaNome
    }
  }
}