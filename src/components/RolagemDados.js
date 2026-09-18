import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from "vue"

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
    alternarAcao: { type: Function, default: () => { } },
    autoRolar: { type: Boolean, default: false },
    valorAtributo: { type: Function, default: () => 1 },
    rolarNovamente: { type: Function, default: () => { } },
    disparadorRolagem: { type: Number, default: 0 },
    resultadoDano: { type: Object, default: null },
    habilidadesGastasRolagem: { type: Array, default: () => [] },
    marcarHabilidadeGasta: { type: Function, default: () => { } }
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
      if (props.resultadoDano?.rolar) props.resultadoDano.rolar()

      audio.currentTime = 0
      rerrolagensDisponiveis.value = 0
      mudancas6Disponiveis.value = 0
      mudancasValorDisponiveis.value = 0
      habilidadesAtivas.value = []

      const novosDados = []
      for (let i = 0; i < quantidadeDados.value; i++) {
        const natural = rolarD6()
        novosDados.push({
          id: gerarId(),
          natural,
          naturalOriginal: natural,
          atual: natural,
          exibicao: natural,
          ajustes: 0,
          forcado: false,
          rerrolado: false,
          rolandoIndividual: false
        })
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

    const habilidadesAtivas = ref([])
    const rerrolagensDisponiveis = ref(0)
    const mudancas6Disponiveis = ref(0)
    const mudancasValorDisponiveis = ref(0)
    const valorAlvoPendente = ref("6")

    const rotuloBotaoMudarValor = computed(() => {
      if (valorAlvoPendente.value === "qualquer") return "→?"
      return `→${valorAlvoPendente.value}`
    })

    function rerolarDado(dado) {
      if (rolando.value || dado.rolandoIndividual) return
      audio.currentTime = 0
      audio.play().catch(() => { })
      dado.rolandoIndividual = true
      let tique = 0
      const intervalo = setInterval(() => {
        tique++
        dado.exibicao = Math.floor(Math.random() * 6) + 1
        if (tique >= 6) {
          clearInterval(intervalo)
          const novoValor = rolarD6()
          dado.natural = novoValor
          dado.atual = novoValor
          dado.exibicao = novoValor
          dado.ajustes = 0
          dado.forcado = false
          dado.rerrolado = true
          dado.rolandoIndividual = false
        }
      }, 45)
    }

    function forcarValor(dado, valor) {
      if (rolando.value || dado.rolandoIndividual) return
      const val = Math.max(1, Math.min(6, valor))
      dado.atual = val
      dado.exibicao = val
      dado.forcado = true
    }

function escolherValor(dado) {
      if (rolando.value || dado.rolandoIndividual) return
      // Remova a primeira linha 'const entrada = ...' que estava aqui. Deixe apenas esta:
      const entrada = window.prompt("Escolha o novo valor do dado (1 a 6):", String(dado.atual || 6))
      
      if (entrada === null) return
      const num = parseInt(entrada, 10)
      if (num >= 1 && num <= 6) {
        forcarValor(dado, num)
      }
    }

    function restaurarValor(dado) {
      if (rolando.value || dado.rolandoIndividual) return
      if (dado.ajustes > 0) {
        modificadorRestante.value += dado.ajustes
      }
      if (dado.rerrolado) {
        rerrolagensDisponiveis.value++
      }
      if (dado.forcado) {
        mudancas6Disponiveis.value++
        mudancasValorDisponiveis.value++
      }
      dado.atual = dado.naturalOriginal || dado.natural
      dado.natural = dado.naturalOriginal || dado.natural
      dado.exibicao = dado.atual
      dado.ajustes = 0
      dado.forcado = false
      dado.rerrolado = false
    }

    const sucessos = computed(() => dados.filter(d => d.atual >= 4).length)
    const criticosNaturais = computed(() => dados.filter(d => d.natural === 6 && !d.forcado && d.atual === 6).length)

    function habilidadeVinculadaA(habilidade, periciaNome) {
      const vinculadas = Array.isArray(habilidade.periciasVinculadas)
        ? habilidade.periciasVinculadas
        : habilidade.periciaVinculada
          ? [habilidade.periciaVinculada]
          : []
      const normalizar = valor => String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
      const periciaNormalizada = normalizar(periciaNome)
      return vinculadas.some(vinculo => vinculo === "TODAS" || normalizar(vinculo) === periciaNormalizada)
    }

    const habilidadesFiltradas = computed(() =>
      props.habilidades.filter(h => habilidadeVinculadaA(h, props.periciaNome))
    )

    function obterEfeitoDado(habilidade) {
      return habilidade?.efeitoDado || ""
    }

    function efeitoPermiteRerrolar(habilidade) {
      const efeito = obterEfeitoDado(habilidade)
      return efeito === "rerolar"
    }

    function efeitoPermiteMudarValor(habilidade) {
      const efeito = obterEfeitoDado(habilidade)
      return efeito === "mudar_valor" || efeito === "mudar6"
    }

    function obterValorAlvoDado(habilidade) {
      return habilidade?.valorAlvoDado || "6"
    }

    const habilidadesRerrolar = computed(() =>
      habilidadesFiltradas.value.filter(efeitoPermiteRerrolar)
    )
    const habilidadesMudar6 = computed(() =>
      habilidadesFiltradas.value.filter(efeitoPermiteMudarValor)
    )

    const temPoderRerolar = computed(() => habilidadesRerrolar.value.length > 0)
    const temPoderMudar6 = computed(() => habilidadesMudar6.value.length > 0)

    const podeUsarRerolar = computed(() => {
      if (rerrolagensDisponiveis.value > 0) return true
      return habilidadesRerrolar.value.some(h => podeUsarHabilidade(h))
    })

    const podeUsarMudar6 = computed(() => {
      if (mudancas6Disponiveis.value > 0) return true
      return habilidadesMudar6.value.some(h => podeUsarHabilidade(h))
    })

    function executarRerrolagem(dado) {
      if (rolando.value || dado.rolandoIndividual) return
      if (rerrolagensDisponiveis.value > 0) {
        rerrolagensDisponiveis.value--
        rerolarDado(dado)
        return
      }
      const hab = habilidadesRerrolar.value.find(h => podeUsarHabilidade(h))
      if (hab) {
        usarHabilidade(hab)
        if (rerrolagensDisponiveis.value > 0) {
          rerrolagensDisponiveis.value--
        }
        rerolarDado(dado)
      }
      if (rerrolagensDisponiveis.value <= 0) return
      rerrolagensDisponiveis.value--
      rerolarDado(dado)
    }

    function executarMudar6(dado) {
      if (rolando.value || dado.rolandoIndividual || dado.atual === 6) return
      if (mudancas6Disponiveis.value > 0) {
        mudancas6Disponiveis.value--
        forcarValor(dado, 6)
        return
      }
    }
    function executarMudarValor(dado) {
      if (rolando.value || dado.rolandoIndividual) return
      if (mudancasValorDisponiveis.value <= 0) return

      let valorFinal = 6
      if (valorAlvoPendente.value === "qualquer") {
        const entrada = window.prompt("Escolha o novo valor do dado (1 a 6):", String(dado.atual || 6))
        if (entrada === null) return
        const num = parseInt(entrada, 10)
        if (isNaN(num) || num < 1 || num > 6) return
        valorFinal = num
      } else {
        valorFinal = parseInt(valorAlvoPendente.value, 10) || 6
      }
      const hab = habilidadesMudar6.value.find(h => podeUsarHabilidade(h))
      if (hab) {
        usarHabilidade(hab)
        if (mudancas6Disponiveis.value > 0) {
          mudancas6Disponiveis.value--
        }
        forcarValor(dado, 6)
      }

      mudancasValorDisponiveis.value--
      forcarValor(dado, valorFinal)
    }

    function nomeAcao(tipo) {
      return NOMES_ACAO[tipo] || ""
    }

    function toggleAcoes() {
      acoesExpandidas.value = !acoesExpandidas.value
    }

 
      function alternarUsoHabilidade(h) {
        const index = habilidadesAtivas.value.indexOf(h.id)
        if (index >= 0) {
          // Desativar / cancelar antes de usar no dado
          habilidadesAtivas.value.splice(index, 1)

          if (h.tipoAcao) {
            props.alternarAcao(h.tipoAcao)
          }

          if (efeitoPermiteRerrolar(h)) {
            rerrolagensDisponiveis.value = Math.max(0, rerrolagensDisponiveis.value - 1)
          }
          if (efeitoPermiteMudarValor(h)) {
            mudancasValorDisponiveis.value = Math.max(0, mudancasValorDisponiveis.value - 1)
          }

          if (h.modificadorHabilidade) {
            modificadorTotal.value = Math.max(0, modificadorTotal.value - h.modificadorHabilidade)
            modificadorRestante.value = Math.max(0, modificadorRestante.value - h.modificadorHabilidade)
          }
          return
        }

        // Ativar habilidade
        if (!podeUsarHabilidade(h)) return

        if (h.tipoAcao === "descanso" || h.tipoAcao === "cena") {
          if (props.habilidadesGastasRolagem.includes(h.id)) {
            return
          }
          if (props.habilidadesGastasRolagem.includes(h.id)) return
          props.marcarHabilidadeGasta(h.id)
        }

        if (h.tipoAcao) {
          props.alternarAcao(h.tipoAcao)
        }

        // Concede cargas de efeitos de dado
        habilidadesAtivas.value.push(h.id)

        if (efeitoPermiteRerrolar(h)) {
          rerrolagensDisponiveis.value++
        }
        if (h.efeitoDado === "mudar6") {
          mudancas6Disponiveis.value++
        }
          if (efeitoPermiteMudarValor(h)) {
            mudancasValorDisponiveis.value++
            valorAlvoPendente.value = h.valorAlvoDado || (h.efeitoDado === "mudar6" ? "6" : "qualquer")
          }

          // Adiciona modificador da habilidade ao modificador total
          if (h.modificadorHabilidade) {
            if (modificadorUsadoNaRolagem.value) {
              modificadorUsadoNaRolagem.value = false
              modificadorTotal.value = modificadorInicial + h.modificadorHabilidade
            } else {
              modificadorTotal.value += h.modificadorHabilidade
            }
            modificadorRestante.value = modificadorTotal.value
          }
        }

        function usarHabilidade(h) {
          alternarUsoHabilidade(h)
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
            novosDados.push({
              id: gerarId(),
              natural: 1,
              naturalOriginal: 1,
              atual: 1,
              exibicao: 1,
              ajustes: 0,
              forcado: false,
              rerrolado: false,
              rolandoIndividual: false
            })
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
          habilidades: props.habilidades,
          habilidadesFiltradas,
          obterEfeitoDado,
          obterValorAlvoDado,
          temPoderRerolar,
          temPoderMudar6,
          podeUsarRerolar,
          podeUsarMudar6,
          habilidadesAtivas,
          rerrolagensDisponiveis,
          mudancas6Disponiveis,
          mudancasValorDisponiveis,
          valorAlvoPendente,
          rotuloBotaoMudarValor,
          executarRerrolagem,
          executarMudar6,
          executarMudarValor,
          alternarUsoHabilidade,
          nomeAcao,
          toggleAcoes,
          usarHabilidade,
          podeUsarHabilidade,
          estiloJanela,
          iniciarArraste,
          acoesExpandidas,
          rerolarDado,
          forcarValor,
          escolherValor,
          restaurarValor,
          acoesGastas: props.acoesGastas,
          alternarAcao: props.alternarAcao,
          periciaNome: props.periciaNome
        }
      }
    }