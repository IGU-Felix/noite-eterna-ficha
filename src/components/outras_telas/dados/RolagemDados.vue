<template>
  <div class="rolagem-painel" :style="[estiloJanela(), { zIndex: zIndexAtivo }]"
    @mousedown.capture="ativarPainelNoTopo">

    <div class="rolagem-barra" @mousedown="iniciarArraste">
      <span class="rolagem-titulo-barra">{{ tituloTeste || 'Rolagem de Dados' }}</span>
      <button class="rolagem-fechar" @mousedown.stop @click="$emit('fechar')" title="fechar">×</button>
    </div>

    <div class="rolagem-corpo">

      <div class="secao-acoes">
        <div class="secao-titulo">
          <button class="btn-expandir-secao" :class="{ aberto: acoesExpandidas }" @click="toggleAcoes"
            title="mostrar/ocultar ações">▾</button>
          Ações de Combate
        </div>
        <div v-show="acoesExpandidas" class="acoes-grid">
          <button v-for="tipo in ['padrao', 'bonus', 'movimento', 'reacao']" :key="tipo" class="acao-box"
            :class="{ gasta: acoesGastas[tipo] }" @click="alternarAcao(tipo)">
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
              <input class="badge-valor badge-valor-input" v-model.number="modificadorTotal" type="number" min="0"
                aria-label="Modificador" />
              <span class="badge-rotulo">Modificador</span>
            </div>
            <div class="badge-losango badge-sucessos">
              <span class="badge-valor">{{ sucessos }}</span>
              <span class="badge-rotulo">Sucessos</span>
            </div>
          </div>

          <button class="btn-rolar" @click="rolar">Rolar Dados</button>
        </div>

        <div v-if="resultadoDano" :class="[resultadoDano.tipo === 'magia' ? 'resultado-dano-magias' : 'resultado-dano', {
          'resultado-dano-oculto': !resultadoDanoVisivel,
          'resultado-dano-animacao': resultadoDanoVisivel
        }]">
          <span class="resultado-dano-titulo">Dano · {{ resultadoDano.nome }}</span>
          <span class="resultado-dano-valores"><strong>{{ resultadoDano.total }}</strong></span>
        </div>

        <div v-if="jaRolou" class="dados-linha">
          <div class="dado-coluna" v-for="dado in dados" :key="dado.id">

            <button class="dado-seta dado-seta-cima"
              :disabled="rolando || dado.rolandoIndividual || modificadorRestante <= 0 || dado.atual >= 6"
              @click="aumentarDado(dado)" title="gastar 1 ponto de modificador">▲</button>

            <div class="dado-caixa"
              :class="[(rolando || dado.rolandoIndividual) ? 'girando' : (dado.atual >= 4 ? 'cor-sucesso' : 'cor-neutro')]">
              <img
                :key="`${dado.id}-${mostraNumero}-${dado.rolandoIndividual}`"
                class="dado-imagem"
                :src="`/dados/dice_side_${(rolando || dado.rolandoIndividual) ? dado.exibicao : dado.atual}${!(rolando || dado.rolandoIndividual) && mostraNumero ? '_num' : ''}.svg`"
                :alt="'face ' + ((rolando || dado.rolandoIndividual) ? dado.exibicao : dado.atual)"
              />
              <span v-if="!rolando && !dado.rolandoIndividual && dado.natural === 6 && !dado.forcado && dado.atual === 6" class="dado-critico" title="6 natural">★</span>
            </div>

            <div class="dado-linha-baixo">
              <button class="dado-seta dado-seta-baixo"
                :disabled="rolando || dado.rolandoIndividual || dado.ajustes <= 0"
                @click="diminuirDado(dado)" title="desfazer ajuste">▽</button>

              <button v-if="rerrolagensDisponiveis > 0" class="dado-acao-mini dado-acao-ativa"
                :disabled="rolando || dado.rolandoIndividual"
                @click="executarRerrolagem(dado)"
                title="Rerolar este dado (habilidade ativada)">⟳</button>

              <button v-if="mudancasValorDisponiveis > 0" class="dado-acao-mini dado-acao-ativa"
                :disabled="rolando || dado.rolandoIndividual || (valorAlvoPendente !== 'qualquer' && dado.atual === Number(valorAlvoPendente))"
                @click="executarMudarValor(dado)"
                @contextmenu.prevent="escolherValor(dado)"
                :title="valorAlvoPendente === 'qualquer' ? 'Clique para escolher novo valor (1-6)' : `Mudar para ${valorAlvoPendente}`">
                {{ rotuloBotaoMudarValor }}
              </button>

              <button v-if="dado.forcado || dado.rerrolado" class="dado-acao-mini"
                :disabled="rolando || dado.rolandoIndividual"
                @click="restaurarValor(dado)" title="Restaurar valor original rolado">↺</button>
            </div>

          </div>

          <button v-if="dados.length < 6" class="dado-adicionar" @click="adicionarDado" title="Adicionar dado"
            type="button">
            +
          </button>
        </div>
      </div>

      <div class="secao-habilidades">
        <div class="secao-titulo">
          <span>Habilidades</span>
        </div>

        <div v-if="habilidadesFiltradas.length === 0" class="habilidades-vazio">
          Nenhuma habilidade vinculada a "{{ periciaNome }}".
        </div>

        <div v-else class="habilidades-lista">
          <div v-for="h in habilidadesFiltradas" :key="h.id" class="habilidade-card"
            :class="{
              ativa: habilidadesAtivas.includes(h.id),
              gasta: h.tipoAcao && acoesGastas[h.tipoAcao] && !habilidadesAtivas.includes(h.id),
              desabilitada: !podeUsarHabilidade(h) && !habilidadesAtivas.includes(h.id)
            }"
            @click="alternarUsoHabilidade(h)">
            <div class="habilidade-topo">
              <span class="habilidade-nome">
                <span v-if="habilidadesAtivas.includes(h.id)" class="habilidade-ativa-check">✔ </span>
                {{ h.nome || 'sem nome' }}
              </span>
              <div class="habilidade-tags">
                <span v-if="obterEfeitoDado(h) === 'rerolar'" class="habilidade-badge-efeito" title="Clique no card para ativar">⟳ Rerolar</span>
                <span v-if="obterEfeitoDado(h) === 'mudar_valor' || obterEfeitoDado(h) === 'mudar6'" class="habilidade-badge-efeito"
                  :title="`Clique no card para ativar mudança para ${obterValorAlvoDado(h)}`">
                  →{{ obterValorAlvoDado(h) === 'qualquer' ? '?' : (obterValorAlvoDado(h) || '6') }}
                </span>
                <span v-if="obterEfeitoDado(h) === 'modificador'" class="habilidade-badge-efeito" title="Clique no card para ativar">
                  +{{ h.modificadorHabilidade || 0 }} Modificador
                </span>
                <span v-if="h.tipoAcao" class="habilidade-custo" :class="{ gasta: acoesGastas[h.tipoAcao] && !habilidadesAtivas.includes(h.id) }">
                  {{ nomeAcao(h.tipoAcao) }}
                </span>
              </div>
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