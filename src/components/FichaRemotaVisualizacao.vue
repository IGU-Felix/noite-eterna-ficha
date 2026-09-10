<template>
  <div class="ficha-remota-visualizacao">
    <div class="remota-card">

      <div class="remota-retrato">
        <img v-if="dados?.imagem" :src="dados.imagem" alt="retrato" />
        <span v-else class="remota-retrato-vazio">?</span>
      </div>

      <div class="remota-nome">{{ dados?.nome || "Sem nome" }}</div>

      <div class="remota-meta">
        <span class="remota-tag" :class="dados?.tipo === 'ameaca' ? 'tag-ameaca' : 'tag-personagem'">
          {{ dados?.tipo === "ameaca" ? "Ameaça" : "Personagem" }}
        </span>
        <span class="remota-dono" v-if="dados?.dono">Jogador: {{ dados.dono }}</span>
      </div>

      <div v-if="snapshot" class="remota-stats">
        <div class="remota-stat">
          <span class="remota-stat-valor">{{ snapshot.vidaAtual }}/{{ snapshot.vidaMaxEditavel ?? snapshot.vidaMax }}</span>
          <span class="remota-stat-label">Vida</span>
        </div>
        <div class="remota-stat" v-if="snapshot.manaAtual !== undefined">
          <span class="remota-stat-valor">{{ snapshot.manaAtual }}/{{ snapshot.manaMaxEditavel ?? snapshot.manaMax }}</span>
          <span class="remota-stat-label">Mana</span>
        </div>
        <div class="remota-stat">
          <span class="remota-stat-valor">{{ snapshot.nivel }}</span>
          <span class="remota-stat-label">Nível</span>
        </div>
      </div>

      <div class="remota-status">
        <span class="remota-dot"></span>
        Espelho ao vivo — atualiza automaticamente
      </div>

      <p v-if="!dados" class="remota-vazio">
        Aguardando dados desta ficha chegarem pelo jogador...
      </p>

    </div>
  </div>
</template>
<script setup>
import { computed } from "vue"
import { sessaoEstado } from "../services/sessaoP2P.js"

const props = defineProps({
  fichaId: { type: String, default: null }
})



const dados = computed(() => props.fichaId ? sessaoEstado.fichasRemotas[props.fichaId] : null)
const nome = computed(() => dados.value?.nome || "Sem Nome")
const imagemStatus = computed(() => dados.value?.imagem || null)
const snapshot = computed(() => dados.value?.dados || null)

defineExpose({
  nome,
  imagemStatus
})
</script>

<style scoped>
.ficha-remota-visualizacao {
  min-height: 100%;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-family: "Aubrey", system-ui;
}

.remota-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  max-width: 320px;
}

.remota-retrato {
  width: 140px;
  height: 170px;
  background: #1a1a1a;
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
  font-size: 40px;
  color: #444;
}

.remota-nome {
  font-size: 22px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #eee;
}

.remota-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.remota-tag {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
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

.remota-dono {
  font-size: 11px;
  color: #999;
}

.remota-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-top: 6px;
}

.remota-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4caf50;
  flex-shrink: 0;
  animation: pulsar 1.6s ease-in-out infinite;
}

@keyframes pulsar {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.remota-vazio {
  font-size: 11px;
  color: #666;
  font-style: italic;
  line-height: 1.5;
}

.remota-stats {
  display: flex;
  gap: 14px;
  margin-top: 4px;
}

.remota-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.remota-stat-valor {
  font-size: 15px;
  font-weight: bold;
  color: #d9a441;
}

.remota-stat-label {
  font-size: 9px;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>