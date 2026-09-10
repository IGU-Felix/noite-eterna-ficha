<template>
  <div class="ficha-remota-visualizacao">
    <!-- BARRA FIXA DE STATUS REMOTO -->
    <header class="remota-barra-topo">
      <div class="remota-barra-esquerda">
        <span class="remota-dot"></span>
        <span class="remota-titulo-espelho">Ficha ao Vivo</span>
        <span class="remota-divisor">/</span>
        <span class="remota-dono" v-if="dados?.dono">Jogador: <strong>{{ dados.dono }}</strong></span>
        <span class="remota-tag" :class="tipo === 'ameaca' ? 'tag-ameaca' : 'tag-personagem'">
          {{ tipo === "ameaca" ? "Ameaça" : "Personagem" }}
        </span>
      </div>

      <div class="remota-barra-direita">
        <span class="remota-atualizado" v-if="dados?.atualizadoEm">
          Atualizado às {{ formatarHora(dados.atualizadoEm) }}
        </span>
        <button class="remota-btn-sync" @click="pedirSync" title="Requisitar sincronização imediata ao jogador">
          ↻ Sincronizar
        </button>
      </div>
    </header>

    <!-- AGUARDANDO SINCRONIZAÇÃO COMPLETA -->
    <div v-if="!snapshot" class="remota-esperando-container">
      <div class="remota-esperando-card">
        <div class="remota-retrato">
          <img v-if="dados?.imagem" :src="dados.imagem" alt="retrato" />
          <span v-else class="remota-retrato-vazio">?</span>
        </div>

        <div class="remota-nome">{{ dados?.nome || "Sem nome" }}</div>

        <div class="remota-esperando-status">
          <span class="remota-spinner"></span>
          Conectado via P2P · Aguardando dados completos...
        </div>

        <p class="remota-esperando-texto">
          O jogador <strong>{{ dados?.dono || "conectado" }}</strong> ainda não enviou todos os blocos desta ficha.
        </p>

        <button class="remota-btn-solicitar" @click="pedirSync">
          Pedir envio agora
        </button>
      </div>
    </div>

    <!-- FICHA COMPLETA (PERSONAGEM OU AMEAÇA) -->
    <div v-else class="remota-ficha-wrapper">
      <component
        :is="tipo === 'ameaca' ? FichaAmeaca : Ficha"
        ref="fichaInternaRef"
        :persist-key="`remota-${fichaId}`"
        :dados-remotos="snapshot"
        :somente-leitura="true"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { sessaoEstado, solicitarSyncFicha } from "../services/sessaoP2P.js"
import Ficha from "./Ficha.vue"
import FichaAmeaca from "./FichaAmeaca.vue"

const props = defineProps({
  fichaId: { type: String, default: null }
})

const fichaInternaRef = ref(null)

const dados = computed(() => props.fichaId ? sessaoEstado.fichasRemotas[props.fichaId] : null)
const tipo = computed(() => dados.value?.tipo || "personagem")
const snapshot = computed(() => dados.value?.dados || null)

const nome = computed(() => snapshot.value?.nome || dados.value?.nome || "Sem Nome")
const imagemStatus = computed(() => snapshot.value?.imagemStatus || dados.value?.imagem || null)
const imagemAmeaca = computed(() => snapshot.value?.imagemAmeaca || dados.value?.imagem || null)

function pedirSync() {
  if (props.fichaId) {
    solicitarSyncFicha(props.fichaId)
  }
}

function formatarHora(timestamp) {
  if (!timestamp) return ""
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return ""
  }
}

function exportarJson() {
  fichaInternaRef.value?.exportarJson?.()
}

onMounted(() => {
  if (!snapshot.value && props.fichaId) {
    pedirSync()
  }
})

defineExpose({
  nome,
  imagemStatus,
  imagemAmeaca,
  exportarJson
})
</script>

<style scoped>
.ficha-remota-visualizacao {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #111;
  font-family: "Aubrey", system-ui;
}

/* BARRA FIXA DE STATUS NO TOPO */
.remota-barra-topo {
  position: sticky;
  top: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: #171717;
  border-bottom: 1px solid #2d2d2d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.remota-barra-esquerda,
.remota-barra-direita {
  display: flex;
  align-items: center;
  gap: 10px;
}

.remota-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.8);
  animation: pulsar 1.6s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulsar {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.85); }
}

.remota-titulo-espelho {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #4caf50;
  font-weight: bold;
}

.remota-divisor {
  color: #444;
  font-size: 11px;
}

.remota-dono {
  font-size: 12px;
  color: #bbb;
}

.remota-dono strong {
  color: #f1f1f1;
}

.remota-tag {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border: 1px solid;
}

.tag-personagem {
  color: #d9a441;
  border-color: #d9a441;
}

.tag-ameaca {
  color: #d97a7a;
  border-color: #d97a7a;
}

.remota-atualizado {
  font-size: 11px;
  color: #777;
}

.remota-btn-sync {
  background: #202020;
  border: 1px solid #444;
  color: #d9a441;
  padding: 3px 9px;
  font-size: 11px;
  cursor: pointer;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transition: all 0.15s ease;
}

.remota-btn-sync:hover {
  background: #2b2b2b;
  border-color: #d9a441;
  color: #f3be58;
}

/* ENVOLTÓRIO DA FICHA */
.remota-ficha-wrapper {
  flex: 1;
  width: 100%;
}

/* TELA DE ESPERA */
.remota-esperando-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.remota-esperando-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  max-width: 360px;
  padding: 26px;
  background: #181818;
  border: 1px solid #333;
}

.remota-retrato {
  width: 120px;
  height: 150px;
  background: #111;
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.remota-retrato img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remota-retrato-vazio {
  font-size: 36px;
  color: #444;
}

.remota-nome {
  font-size: 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #eee;
}

.remota-esperando-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #d9a441;
  letter-spacing: 0.5px;
}

.remota-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #555;
  border-top-color: #d9a441;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}

.remota-esperando-texto {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.remota-btn-solicitar {
  margin-top: 6px;
  background: #252525;
  border: 1px solid #d9a441;
  color: #d9a441;
  padding: 6px 14px;
  font-size: 12px;
  text-transform: uppercase;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.remota-btn-solicitar:hover {
  background: #d9a441;
  color: #111;
}
</style>