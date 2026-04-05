import { ref, computed, watch, onMounted, nextTick } from "vue"

export default {
  setup() {

    // ===== VIDA =====
    const vidaAtual = ref(85)
    const vidaMax = ref(100)

    const vidaPercent = computed(() =>
      (vidaAtual.value / vidaMax.value) * 100
    )

    const classeVida = computed(() => {
      const percent = vidaPercent.value
      if (percent > 60) return "vida-alta"
      if (percent > 30) return "vida-media"
      return "vida-baixa"
    })

    const vidaCritica = computed(() =>
      vidaPercent.value <= 20
    )

    function alterarVida(valor) {
      vidaAtual.value += valor
    }

    // ===== MANA =====
    const manaAtual = ref(50)
    const manaMax = ref(80)

    const manaPercent = computed(() =>
      (manaAtual.value / manaMax.value) * 100
    )

    const classeMana = computed(() => {
      const percent = manaPercent.value
      if (percent > 60) return "mana-alta"
      if (percent > 30) return "mana-media"
      return "mana-baixa"
    })

    function alterarMana(valor) {
      manaAtual.value += valor
    }

    // ===== LIMITES =====
    watch(vidaAtual, (v) => {
      if (v > vidaMax.value) vidaAtual.value = vidaMax.value
      if (v < 0) vidaAtual.value = 0
    })

    watch(manaAtual, (v) => {
      if (v > manaMax.value) manaAtual.value = manaMax.value
      if (v < 0) manaAtual.value = 0
    })

    // ===== ANIMAÇÕES =====
    const animacaoDano = ref(false)
    const animacaoCura = ref(false)
    const efeitoCuraTela = ref(false)

    let ultimaVida = vidaAtual.value

    watch(vidaAtual, (novo) => {
      if (novo < ultimaVida) {
        animacaoDano.value = true
        setTimeout(() => animacaoDano.value = false, 200)
      } else if (novo > ultimaVida) {
        animacaoCura.value = true
        efeitoCuraTela.value = true

        setTimeout(() => animacaoCura.value = false, 300)
        setTimeout(() => efeitoCuraTela.value = false, 400)
      }

      ultimaVida = novo
    })

    // ===== NOME =====
    const nome = ref("Otto Vaenerys")
    const editandoNome = ref(false)
    const inputNome = ref(null)

    function ativarEdicaoNome() {
      editandoNome.value = true
      nextTick(() => {
        inputNome.value?.focus()
        inputNome.value?.select()
      })
    }

    // ===== IMAGEM =====
    const imagemStatus = ref(null)
    const inputFile = ref(null)

    function abrirUpload() {
      inputFile.value.click()
    }

    function carregarImagem(event) {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        imagemStatus.value = e.target.result
      }
      reader.readAsDataURL(file)
    }

    // ===== ATRIBUTOS =====
    const atributos = ref([
  { nome: "ROB", valor: 2 },
  { nome: "POD", valor: 4 },
  { nome: "PRE", valor: 1 },
  { nome: "MEN", valor: 0 },
  { nome: "CAR", valor: 1 },
  { nome: "SOR", valor: "?" }
])

function atualizarAtributo(attr, valor) {
  if (valor === "") {
    if (attr.nome === "SOR") {
      attr.valor = "?"
      return
    }
    valor = 0
  }

  valor = Number(valor)

  if (valor < 0) valor = 0
  if (valor > 6) valor = 6

  attr.valor = valor
}

    // ===== AUDIO (AGORA CERTO) =====
    const audio = new Audio("/sounds/heartbeat.mp3")

    onMounted(() => {
      audio.loop = true
      audio.volume = 0.25
    })

    watch(vidaCritica, (critico) => {
      if (critico) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        audio.pause()
      }
    })

const tiposCarga = [
  { nome: "Absurdo", max: 10 },
  { nome: "Cadavéricas", max: 4 },
  { nome: "Constelação", max: 4 },
  { nome: "Eclesiástica", max: 4 },
  { nome: "Essência", max: 4 },
  { nome: "Êxodo Ígneo", max: 3 },
  { nome: "Fúria", max: 6 },
  { nome: "KI", max: 4 },
  { nome: "Munição", max: 4 },
  { nome: "Pacto", max: 4 },
  { nome: "Rancor", max: 4 },
  { nome: "Reação em Cadeia", max: 4 },
  { nome: "Trovão", max: 4 },
  { nome: "Ventania", max: 4 },
  { nome: "Veneno", max: 4 }
]

const tipoSelecionado_1 = ref("Fúria")
const tipoSelecionado_2 = ref("Fúria")

const insanidadeAtual = ref(0)
const insanidadeMax = ref(22)
const cargasAtual_1 = ref(0)

const cargasMax_1 = computed(() => {
  const tipo = tiposCarga.find(t => t.nome === tipoSelecionado_1.value)
  return tipo ? tipo.max : 0
})

const cargasAtual_2 = ref(0)

const cargasMax_2 = computed(() => {
  const tipo = tiposCarga.find(t => t.nome === tipoSelecionado_2.value)
  return tipo ? tipo.max : 0
})

watch(tipoSelecionado_1, () => {
  cargasAtual_1.value = 0
})

watch(tipoSelecionado_2, () => {
  cargasAtual_2.value = 0
})

  


    return {
      vidaAtual,
      vidaMax,
      vidaPercent,
      classeVida,
      vidaCritica,
      alterarVida,

      manaAtual,
      manaMax,
      manaPercent,
      classeMana,
      alterarMana,

      animacaoDano,
      animacaoCura,
      efeitoCuraTela,

      nome,
      editandoNome,
      inputNome,
      ativarEdicaoNome,

      imagemStatus,
      inputFile,
      abrirUpload,
      carregarImagem,

      atributos,
      atualizarAtributo,
      audio,

      insanidadeAtual,
      insanidadeMax,
      cargasAtual_1,
      cargasMax_1,
      cargasAtual_2,
      cargasMax_2,

      tiposCarga,
      tipoSelecionado_1,
      tipoSelecionado_2

      
    }
  }
}