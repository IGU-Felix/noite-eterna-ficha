import { ref, reactive, computed, onMounted } from "vue"

let proximoId = 1
function gerarId() {
  return proximoId++
}

function rolarD6() {
  return Math.floor(Math.random() * 6) + 1
}

export default {
  props: {
    dadosIniciais: { type: Number, default: 3 },
    modificadorInicial: { type: Number, default: 0 },
    tituloTeste: { type: String, default: "" },
    autoRolar: { type: Boolean, default: false }, // rola sozinho ao montar (usado ao clicar na perícia)
    compacto: { type: Boolean, default: false }   // esconde os campos de configuração manual
  },
  setup(props) {
    const quantidadeDados = ref(props.dadosIniciais)
    const modificadorTotal = ref(props.modificadorInicial)

    const dados = reactive([])
    const modificadorRestante = ref(modificadorTotal.value)
    const jaRolou = ref(false)
    const rolando = ref(false)

    // ângulos fixos (não aleatórios a cada render) pra dar um ar "desenhado à mão"
    const angulosTraco = [-8, 5, -3, 7, -6]

    function anguloTraco(indice) {
      return angulosTraco[indice % angulosTraco.length]
    }

    let fimRolagem

    function rolar() {
      const quantidade = Math.max(1, Math.min(12, Number(quantidadeDados.value) || 1))
      quantidadeDados.value = quantidade
      const resultados = Array.from({ length: quantidade }, () => rolarD6())

      if (dados.length !== quantidade) {
        dados.splice(0, dados.length, ...resultados.map(natural => ({
          id: gerarId(), natural, atual: natural, exibicao: natural, face: 1, ajustes: 0
        })))
      } else {
        dados.forEach((dado, indice) => {
          const natural = resultados[indice]
          dado.natural = natural
          dado.atual = natural
          dado.exibicao = natural
          dado.face = 1
          dado.ajustes = 0
        })
      }

      modificadorRestante.value = modificadorTotal.value
      jaRolou.value = true
      rolando.value = true
      setTimeout(() => {
        dados.forEach(dado => { dado.face = dado.atual })
      }, 20)
      clearTimeout(fimRolagem)
      fimRolagem = setTimeout(() => {
        rolando.value = false
      }, 1000)
    }

    function aumentarDado(dado) {
      if (rolando.value) return
      if (modificadorRestante.value <= 0) return
      if (dado.atual >= 6) return
      dado.atual++
      dado.exibicao = dado.atual
      dado.face = dado.atual
      dado.ajustes++
      modificadorRestante.value--
    }

    function diminuirDado(dado) {
      if (rolando.value) return
      if (dado.ajustes <= 0) return
      dado.atual--
      dado.exibicao = dado.atual
      dado.face = dado.atual
      dado.ajustes--
      modificadorRestante.value++
    }

    function corDado(valor) {
      return valor >= 4 ? "cor-sucesso" : "cor-neutro"
    }

    const pontosPorFace = {
      1: [[50, 50]],
      2: [[20, 20], [80, 80]],
      3: [[20, 20], [50, 50], [80, 80]],
      4: [[20, 20], [80, 20], [20, 80], [80, 80]],
      5: [[20, 20], [80, 20], [50, 50], [20, 80], [80, 80]],
      6: [[20, 20], [80, 20], [20, 50], [80, 50], [20, 80], [80, 80]]
    }

    function pontosDaFace(face) {
      return pontosPorFace[face].map((_, indice) => ({ id: indice + 1 }))
    }

    function posicaoPonto(face, id) {
      const [top, left] = pontosPorFace[face][id - 1]
      return { top: `${top}%`, left: `${left}%` }
    }

    const sucessos = computed(() =>
      dados.filter(d => d.atual >= 4).length
    )

    const criticosNaturais = computed(() =>
      dados.filter(d => d.natural === 6).length
    )

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
      rolar,
      aumentarDado,
      diminuirDado,
      corDado,
      pontosDaFace,
      posicaoPonto,
      anguloTraco,
      sucessos,
      criticosNaturais
    }
  }
}