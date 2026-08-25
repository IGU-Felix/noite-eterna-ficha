<template>
  <div class="rolagem-painel" :class="{ compacto }">

    <div class="rolagem-cabecalho" v-if="tituloTeste || compacto">
      <span class="rolagem-titulo">{{ tituloTeste }}</span>
      <button v-if="compacto" class="btn-rerolar" @click="rolar" title="rolar novamente">⚄</button>
    </div>

    <div v-if="!compacto" class="rolagem-config">
      <label>
        Dados
        <input type="number" min="1" max="12" v-model.number="quantidadeDados" />
      </label>
      <label>
        Modificador
        <input type="number" min="0" v-model.number="modificadorTotal" />
      </label>
      <button class="btn-rolar" @click="rolar">⚄ Rolar</button>
    </div>

    <div v-if="jaRolou" class="rolagem-resultado">

      <div class="rolagem-badges">
        <div class="badge-losango badge-modificador">
          <span class="badge-valor">+{{ modificadorRestante }}</span>
          <span class="badge-rotulo">Modificador</span>
        </div>
        <div class="badge-losango badge-sucessos">
          <span class="badge-valor">{{ sucessos }}</span>
          <span class="badge-rotulo">Sucessos</span>
        </div>
      </div>

      <div class="dados-linha">
        <div class="dado-coluna" v-for="(dado, indice) in dados" :key="dado.id">

          <button class="dado-seta dado-seta-cima"
            :disabled="rolando || modificadorRestante <= 0 || dado.atual >= 6"
            @click="aumentarDado(dado)" title="gastar 1 ponto de modificador">▲</button>

          <div class="dado-caixa"
            :style="{ '--atraso-rolagem': `${indice * 35}ms` }">
            <div class="dado-cubo" :class="[
              corDado(rolando ? dado.exibicao : dado.atual),
              `show-${dado.face}`
            ]">
              <div v-for="face in 6" :key="face" class="dado-face" :class="`dado-face-${face}`">
                <span v-for="ponto in pontosDaFace(face)" :key="ponto.id" class="dot"
                  :style="posicaoPonto(face, ponto.id)"></span>
              </div>
            </div>
            <span v-if="!rolando && dado.natural === 6" class="dado-critico" title="6 natural">★</span>
          </div>

          <button class="dado-seta dado-seta-baixo"
            :disabled="rolando || dado.ajustes <= 0"
            @click="diminuirDado(dado)" title="desfazer ajuste">▽</button>

        </div>
      </div>

    </div>

  </div>
</template>

<script src="./RolagemDados.js"></script>
<style src="./RolagemDados.css"></style>