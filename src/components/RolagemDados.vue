<template>
  <div class="rolagem-painel" :style="[estiloJanela(), { zIndex: zIndexAtivo }]" @mousedown.capture="ativarPainelNoTopo">

    <div class="rolagem-barra" @mousedown="iniciarArraste">
      <span class="rolagem-titulo-barra">{{ tituloTeste || 'Rolagem de Dados' }}</span>
      <button class="rolagem-fechar" @mousedown.stop @click="$emit('fechar')" title="fechar">×</button>
    </div>

    <div class="rolagem-corpo">

      <div class="secao-acoes">
        <div class="secao-titulo">
          <button class="btn-expandir-secao" :class="{ aberto: acoesExpandidas }" @click="toggleAcoes" title="mostrar/ocultar ações">▾</button>
          Ações de Combate
        </div>
        <div v-show="acoesExpandidas" class="acoes-grid">
          <button
            v-for="tipo in ['padrao', 'bonus', 'movimento', 'reacao']"
            :key="tipo"
            class="acao-box"
            :class="{ gasta: acoesGastas[tipo] }"
            @click="alternarAcao(tipo)"
          >
            <span class="acao-nome">{{ nomeAcao(tipo) }}</span>
            <span class="acao-icone" aria-hidden="true">
              <span v-if="acoesGastas[tipo]" class="acao-x">×</span>
            </span>
          </button>
        </div>
      </div>

      <div class="secao-rolagem">
        <div class="secao-titulo">Rolagem de dados</div>

        <div class="rolagem-topo-controles">
          <div class="rolagem-badges">
            <div class="badge-losango badge-modificador">
              <input
                class="badge-valor badge-valor-input"
                v-model.number="modificadorTotal"
                type="number"
                min="0"
                aria-label="Modificador"
              />
              <span class="badge-rotulo">Modificador</span>
            </div>
            <div class="badge-losango badge-sucessos">
              <span class="badge-valor">{{ sucessos }}</span>
              <span class="badge-rotulo">Sucessos</span>
            </div>
          </div>

          <button class="btn-rolar" @click="rolar">Rolar Dados</button>
        </div>

        <div v-if="jaRolou" class="dados-linha">
          <div class="dado-coluna" v-for="dado in dados" :key="dado.id">

            <button class="dado-seta dado-seta-cima"
              :disabled="rolando || modificadorRestante <= 0 || dado.atual >= 6"
              @click="aumentarDado(dado)" title="gastar 1 ponto de modificador">▲</button>

            <div class="dado-caixa" :class="[rolando ? 'girando' : (dado.atual >= 4 ? 'cor-sucesso' : 'cor-neutro')]">
              <img
                :key="`${dado.id}-${mostraNumero}`"
                class="dado-imagem"
                :src="`/dados/dice_side_${rolando ? dado.exibicao : dado.atual}${!rolando && mostraNumero ? '_num' : ''}.svg`"
                :alt="'face ' + (rolando ? dado.exibicao : dado.atual)"
              />
              <span v-if="!rolando && dado.natural === 6" class="dado-critico" title="6 natural">★</span>
            </div>

            <button class="dado-seta dado-seta-baixo"
              :disabled="rolando || dado.ajustes <= 0"
              @click="diminuirDado(dado)" title="desfazer ajuste">▽</button>

          </div>

          <button
            v-if="dados.length < 6"
            class="dado-adicionar"
            @click="adicionarDado"
            title="Adicionar dado"
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div class="secao-habilidades">
        <div class="secao-titulo">Habilidades</div>

        <div v-if="habilidadesFiltradas.length === 0" class="habilidades-vazio">
          Nenhuma habilidade vinculada a "{{ periciaNome }}". Vincule habilidades na aba Habilidades da ficha.
        </div>

        <div v-else class="habilidades-lista">
          <div
            v-for="h in habilidadesFiltradas"
            :key="h.id"
            class="habilidade-card"
            :class="{ gasta: h.tipoAcao && acoesGastas[h.tipoAcao], desabilitada: !podeUsarHabilidade(h) }"
            @click="podeUsarHabilidade(h) && usarHabilidade(h)"
          >
            <div class="habilidade-topo">
              <span class="habilidade-nome">{{ h.nome || 'sem nome' }}</span>
              <span v-if="h.tipoAcao" class="habilidade-custo" :class="{ gasta: acoesGastas[h.tipoAcao] }">
                {{ nomeAcao(h.tipoAcao) }}
              </span>
            </div>
            <p v-if="h.detalhe" class="habilidade-detalhe">{{ h.detalhe }}</p>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script src="./RolagemDados.js"></script>
<style src="./RolagemDados.css"></style>