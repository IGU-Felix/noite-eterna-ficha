<template>
  <div class="ficha-container">
    <div class="ficha">

      <!-- LADO ESQUERDO -->
      <div class="left">

        <!-- TOPO -->
        <div class="top">

  <!-- RETRATO -->
  <div class="portrait"></div>

  <!-- INFO -->
  <div class="info">

        <div class="classe">
      Bárbaro • Vagabundo
    </div>

<div class="barra nome-barra">

  <div class="barra-overlay">

    <div class="centro">

      <span v-show="!editandoNome" @click="ativarEdicaoNome">
        {{ nome }}
      </span>

      <input
        v-show="editandoNome"
        ref="inputNome"
        type="text"
        v-model="nome"
        @blur="editandoNome = false"
        @keyup.enter="editandoNome = false"
        @focus="$event.target.select()"
        class="input-barra nome-input"
      />

    </div>

  </div>

</div>

  <div 
    class="efeito-critico"
    v-if="vidaCritica"
  ></div>

    <!-- VIDA -->
<div class="barra">
<div
  class="barra-preenchimento"
  :class="[classeVida, { dano: animacaoDano, cura: animacaoCura }]"
  :style="{ width: vidaPercent + '%' }"
></div>

  <div class="barra-overlay">

    <button class="btn-esq" @click="alterarVida(-5)">-5</button>

    <div class="centro">
      <span v-show="!editandoVida" @click="ativarEdicaoVida">
        {{ vidaAtual }} / {{ vidaMax }}
      </span>

      <input
        v-show="editandoVida"
        ref="inputVida"
        type="number"
        v-model.number="vidaAtual"
        @blur="editandoVida = false"
        @keyup.enter="editandoVida = false"
        @focus="$event.target.select()"
        class="input-barra"
      />
    </div>

    <button class="btn-dir" @click="alterarVida(5)">+5</button>

  </div>
</div>

    <!-- MANA -->
<div class="barra">
  <div
    class="barra-preenchimento"
    :class="classeMana"
    :style="{ width: manaPercent + '%' }"
  ></div>

  <div class="barra-overlay">

    <button class="btn-esq" @click="alterarMana(-5)">-5</button>

    <div class="centro">
      <span v-show="!editandoMana" @click="ativarEdicaoMana">
        {{ manaAtual }} / {{ manaMax }}
      </span>

      <input
        v-show="editandoMana"
        ref="inputMana"
        type="number"
        v-model.number="manaAtual"
        @blur="editandoMana = false"
        @keyup.enter="editandoMana = false"
        @focus="$event.target.select()"
        class="input-barra"
      />
    </div>

    <button class="btn-dir" @click="alterarMana(5)">+5</button>

  </div>
</div>

    <!-- INFO EXTRA -->
    <div class="stats">
      <span>NEX 50%</span>
      <span>DT 17</span>
      <span>DEF 19</span>
      <span>PE 3</span>
    </div>

  </div>

</div>

        <!-- STATUS -->
        <div class="box">
          <h3>Status</h3>
        </div>

        <!-- PERÍCIAS -->
        <div class="box">
          <h3>Perícias</h3>
        </div>

      </div>

      <!-- LADO DIREITO -->
      <div class="right">

        <!-- ATRIBUTOS -->
        <div class="atributos">
          <div class="attr" v-for="a in atributos" :key="a">
            <span>{{ a }}</span>
            <strong>0</strong>
          </div>
        </div>

        <!-- COMBATE -->
        <div class="box">
          <h3>Combate</h3>
        </div>

        <!-- INVENTÁRIO -->
        <div class="box">
          <h3>Inventário</h3>
        </div>

      </div>

    </div>
  </div>

  <button @click="audio.play()" style="display: none;">Ativar som</button>
  
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue"

// VIDA
const vidaAtual = ref(85)
const vidaMax = ref(100)

// CONTROLE VISUAL
const levouDano = ref(false)

// ÁUDIO
const audio = ref(null)

// % VIDA
const vidaPercent = computed(() => 
  (vidaAtual.value / vidaMax.value) * 100
)

// 🎨 COR DINÂMICA
const classeVida = computed(() => {
  const percent = vidaPercent.value

  if (percent > 60) return "vida-alta"
  if (percent > 30) return "vida-media"
  return "vida-baixa"
})

// 💀 CRÍTICO
const vidaCritica = computed(() => 
  vidaPercent.value <= 20
)

// 💥 DANO
function perderVida(valor) {
  vidaAtual.value = Math.max(0, vidaAtual.value - valor)

  levouDano.value = true
  setTimeout(() => {
    levouDano.value = false
  }, 200)
}

// 💚 CURA
function curarVida(valor) {
  vidaAtual.value = Math.min(vidaMax.value, vidaAtual.value + valor)
}

function alterarVida(valor) {
  vidaAtual.value += valor
}

// 🔊 CONFIGURA ÁUDIO
onMounted(() => {
  audio.value = new Audio("/sounds/heartbeat.mp3")
  audio.value.loop = true
  audio.value.volume = 0.7

})

// 🎧 CONTROLE AUTOMÁTICO
watch(vidaCritica, (critico) => {
  if (!audio.value) return

  if (critico) {
    audio.value.currentTime = 0
    audio.value.play().catch(() => {}) // evita erro de autoplay
  } else {
    audio.value.pause()
  }
})


// 🔮 MANA
const manaAtual = ref(50)
const manaMax = ref(80)

const manaPercent = computed(() => 
  (manaAtual.value / manaMax.value) * 100
)

// (opcional) cor dinâmica também
const classeMana = computed(() => {
  const percent = manaPercent.value

  if (percent > 60) return "mana-alta"
  if (percent > 30) return "mana-media"
  return "mana-baixa"
})



// VIDA
watch(vidaAtual, (valor) => {
  if (valor > vidaMax.value) vidaAtual.value = vidaMax.value
  if (valor < 0) vidaAtual.value = 0
})

// MANA
watch(manaAtual, (valor) => {
  if (valor > manaMax.value) manaAtual.value = manaMax.value
  if (valor < 0) manaAtual.value = 0
})


const editandoVida = ref(false)
const editandoMana = ref(false)

const animacaoDano = ref(false)
const animacaoCura = ref(false)

function alterarMana(valor) {
  manaAtual.value += valor
}


let ultimaVida = vidaAtual.value

watch(vidaAtual, (novo) => {
  if (novo < ultimaVida) {
    // 💥 DANO
    animacaoDano.value = true
    setTimeout(() => animacaoDano.value = false, 200)
  } else if (novo > ultimaVida) {
    // 💚 CURA
    animacaoCura.value = true
    setTimeout(() => animacaoCura.value = false, 300)
  }

  ultimaVida = novo
})

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

</script>

<style scoped>
/* RESET BASE */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* FUNDO */
.ficha-container {
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Arial, sans-serif;
}

/* CARD PRINCIPAL */
.ficha {
  width: 1150px;
  height: 650px;
  background: #111;
  border: 1px solid #2a2a2a;

  display: grid;
  grid-template-columns: 2.2fr 1fr;
  gap: 10px;
  font-family: "Aubrey", system-ui;

  padding: 10px;
}

/* COLUNAS */
.left, .right {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* TOPO */
.top {
  display: flex;
  gap: 10px;
}

/* RETRATO */
.portrait {
  width: 110px;
  height: 140px;
  background: #1a1a1a;
  border: 1px solid #444;
}

/* INFO */
.info {
  flex: 1;
}

.info h2 {
  font-size: 18px;
  font-weight: bold;
}

.info span {
  font-size: 11px;
  color: #aaa;
}

/* BARRAS */
.barra {
  height: 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  margin-top: 4px;
  position: relative;
}

.fill {
  height: 100%;
}

.vida .fill {
  background: #7a1c1c;
}

.sanidade .fill {
  background: #2e4f7a;
}

/* STATS */
.stats {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
}

/* CAIXAS */
.box {
  flex: 1;
  border: 1px solid #2f2f2f;
  background: #141414;
  padding: 6px;
}

.box h3 {
  font-size: 12px;
  margin-bottom: 5px;
  border-bottom: 1px solid #333;
}

/* ATRIBUTOS */
.atributos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.attr {
  border: 1px solid #3a3a3a;
  background: #181818;
  text-align: center;
  padding: 6px;
  font-size: 11px;
}

.attr strong {
  display: block;
  font-size: 16px;
}

/* LINHA NOME */
.nome-linha {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nome-linha h2 {
  font-size: 16px;
}

.raca {
  font-size: 11px;
  color: #bbb;
}

/* CLASSE */
.classe {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

/* BARRA WRAPPER */
.barra-wrapper {
  margin-top: 4px;
}

.barra-wrapper span {
  font-size: 10px;
  color: #aaa;
}

.barra-wrapper small {
  font-size: 10px;
  color: #777;
}

/* BARRAS MAIS FIÉIS */
.barra {
  height: 14px;
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  margin: 2px 0;
  position: relative;
}

.vida .fill {
  background: linear-gradient(to right, #5a0f0f, #a83232);
}

.sanidade .fill {
  background: linear-gradient(to right, #1f3f5a, #3a7aa8);
}

/* STATS */
.stats {
  margin-top: 6px;
  display: flex;
  gap: 6px;
  font-size: 10px;
}

.stats span {
  background: #1a1a1a;
  padding: 2px 6px;
  border: 1px solid #333;
}


/* BARRA SEGMENTADA */
.segmentada {
  display: flex;
  gap: 2px;
  padding: 2px;
}

/* CADA BLOCO */
.segmento {
  flex: 1;
  height: 12px;
  background: #111;
  border: 1px solid #2a2a2a;
}

/* VIDA ATIVA */
.segmento.ativo {
  background: linear-gradient(to top, #5a0f0f, #a83232);
}

/* SANIDADE */
.segmento.sanidade.ativo {
  background: linear-gradient(to top, #1f3f5a, #3a7aa8);
}


.barra {
  width: 100%;
  height: 14px;
  background: #0e0e0e;
  border: 1px solid #2a2a2a;
  position: relative;
  overflow: hidden;
}

/* preenchimento base */
.barra-preenchimento {
  height: 100%;
  transition: width 0.3s ease;
}

/* VIDA */
.barra-preenchimento.vida {
  background: linear-gradient(to top, #5a0f0f, #a83232);
}

/* SANIDADE */
.barra-preenchimento.sanidade {
  background: linear-gradient(to top, #1f3f5a, #3a7aa8);
}

.barra {
  width: 100%;
  height: 22px;
  background: #0e0e0e;
  border: 1px solid #2a2a2a;
  position: relative;
  overflow: hidden;
}

/* preenchimento */
.barra-preenchimento {
  height: 100%;
  transition: width 0.3s ease;
}

/* VIDA */
.barra-preenchimento.vida {
  background: linear-gradient(to right, #6e1a1a, #8f2323);
}

/* TEXTO CENTRAL */
.barra {
  position: relative;
  height: 22px;
  background: #0e0e0e;
  border: 1px solid #2a2a2a;
  overflow: hidden;
}

/* camada da UI por cima */
.barra-ui {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 6px;
}

/* TEXTO CENTRAL */
.barra-texto {
  flex: 1;
  text-align: center;
  color: white;
  font-weight: bold;
}

/* BOTÕES */
.btn-barra {
  background: rgba(0,0,0,0.6);
  border: 1px solid #333;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
}

.btn-barra:hover {
  background: rgba(255,255,255,0.1);
}

.barra {
  width: 100%;
  height: 22px;
  background: #0e0e0e;
  border: 1px solid #2a2a2a;
  position: relative;
  overflow: hidden;
}

.barra-preenchimento {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease;
}

/* 🟢 VIDA ALTA */
.vida-alta {
  background: linear-gradient(to right, #380306, #7c1a1f);
}

/* 🟡 VIDA MÉDIA */
.vida-media {
  background: linear-gradient(to right, #380b0e, #581216);
}

/* 🔴 VIDA BAIXA */
.vida-baixa {
  background: linear-gradient(to right, #140404, #270808);
}



/* TEXTO */
.barra-texto {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  
  color: #ffffff;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1px;
  
  pointer-events: auto; /* ✅ agora funciona */
}

/* 💀 ESTADO CRÍTICO */
.barra-preenchimento.critica {
  animation: pulseCritico 1s infinite;
}

/* 💥 TREMER */
.barra-preenchimento.critica::before {
  content: "";
  position: absolute;
  inset: 0;
  animation: shakeCritico 0.2s infinite;
}

/* PULSAR (respiração tensa) */
@keyframes pulseCritico {
  0% {
    filter: brightness(1);
  }
  20% {
    filter: brightness(1.3);
  }
  100% {
    filter: brightness(1);
  }
}

/* TREMER (AGORA FUNCIONA) */
@keyframes shakeCritico {
  0% { transform: translate(0px, 0px); }
  25% { transform: translate(-1px, 1px); }
  50% { transform: translate(1px, -1px); }
  75% { transform: translate(-1px, -1px); }
  100% { transform: translate(1px, 1px); }
}

/* 💀 CAMADA DA TELA */
.efeito-critico {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  
  pointer-events: none;
  z-index: 999;

  /* VINHETA + VERMELHO */
  background: radial-gradient(
    circle,
    rgba(0,0,0,0) 40%,
    rgba(0,0,0,0.6) 100%
  ),
  radial-gradient(
    circle,
    rgba(255,0,0,0) 60%,
    rgba(190, 1, 1, 0.35) 100%
  );

  animation: pulseTela 1.5s infinite;
}

/* 💓 BATIMENTO */
@keyframes pulseTela {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}


/* 🔮 MANA ALTA */
.mana-alta {
  background: linear-gradient(to right, #403686, #2873a5);
}

/* 🔮 MANA MÉDIA */
.mana-media {
  background: linear-gradient(to right, #1c1c3a, #403686);
}

/* 🔮 MANA BAIXA */
.mana-baixa {
  background: linear-gradient(to right, #0d0d1a, #1c1c3a);
}


.controle {
  margin-top: 5px;
}

.controle input {
  width: 60px;
  padding: 4px;
  background: #111;
  border: 1px solid #333;
  color: white;
  text-align: center;
}

.input-barra {
  width: 60px;
  background: transparent;
  border: none;
  color: white;
  text-align: left;
  font-weight: bold;
  outline: none;
}

/* CONTEÚDO DA BARRA (flex interno) */
.barra-conteudo {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 6px;
}

/* BOTÕES */
.btn-barra {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #333;
  color: white;

  font-size: 11px;
  padding: 2px 6px;

  cursor: pointer;
  transition: 0.2s;
  
}

.btn-barra:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* TEXTO CENTRAL */
.barra-texto {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  
}

/* 🔥 GARANTE BASE LIMPA */
.barra {
  position: relative;
  height: 22px;
  background: #0e0e0e;
  border: 1px solid #2a2a2a;
  overflow: hidden;
}

/* PREENCHIMENTO */
.barra-preenchimento {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: 1;
}

/* 🔥 CAMADA SUPERIOR */
.barra-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;

  display: flex;
  align-items: center;
  justify-content: flex-start; /* 👈 tudo pra esquerda */

  gap: 6px;
  padding-left: 6px;
}

/* BOTÕES */
.btn-esq,
.btn-dir {
  background: rgba(0, 0, 0, 0);
  border: none;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  cursor: pointer;
  height: 100%;
  font-family: "Aubrey", system-ui;
}

.btn-esq:hover,
.btn-dir:hover {
  background: rgba(255,255,255,0.1);
  font-family: "Aubrey", system-ui;
}

/* CENTRO */
.centro {
  color: white;
  font-weight: bold;
  pointer-events: auto;
  z-index: 3; /* 👈 garante que fica clicável */
}

.input-barra {
  width: 70px;
  background: transparent;
  border: none;
  color: white;
  font-weight: bold;
  outline: none;

  pointer-events: auto; /* 👈 ESSENCIAL */
}

.barra-overlay {
  pointer-events: none;
}

.btn-esq,
.btn-dir,
.centro {
  pointer-events: auto;
}


/* 💚 CURA (brilho suave) */
.barra-preenchimento.cura {
  animation: curaGlow 0.4s;
}

@keyframes curaGlow {
  15% {
    box-shadow: 15px 0 30px rgba(0, 255, 102, 0.452);
    filter: brightness(2);
  }
  100% {
    box-shadow: 0 0 10px rgba(0, 255, 85, 0.514);
    filter: brightness(1);
  }
}

.barra-overlay {
  pointer-events: none;
}

.btn-esq,
.btn-dir,
.centro {
  pointer-events: auto;
}


/* BARRA DO NOME */
.nome-barra {
  height: 26px;
  margin-bottom: 1px;
}

/* TEXTO */
.nome-barra .centro {
  font-family: "Aubrey", system-ui;
  font-size: 20px;
  font-weight: normal;
  letter-spacing: 1px;
}

/* INPUT */
.nome-input {
  width: 200px;
  text-align: left;
    font-family: "Aubrey", system-ui;
}
</style>