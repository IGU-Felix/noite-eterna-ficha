<template>
  <div class="ficha-container">
    <div class="ficha">

      <!-- LADO ESQUERDO -->
      <div class="left">

        <!-- TOPO -->
        <div class="top">

          <!-- RETRATO -->
          <div class="status-imagem" @click="abrirUpload">
            <img v-if="imagemStatus" :src="imagemStatus" />
            <span v-else class="placeholder">+</span>

            <input 
              type="file" 
              ref="inputFile"
              @change="carregarImagem" 
              accept="image/*"
              hidden
            />
          </div>

          <!-- INFO -->
          <div class="info">

            <div class="classe">
              Anão - Bárbaro - Vaporário 
            </div>

            <!-- NOME -->
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
                    class="input-barra nome-input"
                  />

                </div>
              </div>
            </div>

            <!-- EFEITOS -->
            <div v-if="vidaCritica" class="efeito-critico"></div>
            <div v-if="efeitoCuraTela" class="efeito-cura-tela"></div>

            <!-- PAINEL DE RECURSOS -->
            <div class="painel-recursos">

              <!-- VIDA + MANA -->
              <div class="recursos-principais">

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
                      {{ vidaAtual }} / {{ vidaMax }}
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
                      {{ manaAtual }} / {{ manaMax }}
                    </div>

                    <button class="btn-dir" @click="alterarMana(5)">+5</button>
                  </div>
                </div>

              </div>



            </div>

            <!-- INFO EXTRA -->
            <div class="stats">
              <span>Nivel: 10</span>
              <span>Iniciativa: 1+1d6</span>
              <span>DEF 19</span>
              <span>P.Van: 00</span>
            </div>

          </div> <!-- FECHA info -->
                  <!-- 🔥 PAINEL DE INSANIDADE (SEPARADO DE VERDADE) -->
        <div class="painel-insanidade">

          <!-- INSANIDADE -->
          <div class="titulo">INSANIDADE</div>
          <div class="insanidade-grid">
            <div
              v-for="i in insanidadeMax"
              :key="'ins-' + i"
              class="insanidade-slot"
              :class="{ ativo: i <= insanidadeAtual }"
              @click="insanidadeAtual = i"
            ></div>
          </div>

          <!-- CARGAS -->
          <div class="titulo">Cargas de</div>
          <div class="cargas-grid">
            <div
              v-for="i in cargasMax_1"
              :key="'car-' + i"
              class="carga-slot"
              :class="{ ativa: i <= cargasAtual_1 }"
              @click="cargasAtual_1 = i"
            ></div>
          </div>

          <div class="titulo">Cargas de</div>
          <div class="cargas-grid">
            <div
              v-for="i in cargasMax_2"
              :key="'car-' + i"
              class="carga-slot"
              :class="{ ativa: i <= cargasAtual_2 }"
              @click="cargasAtual_2 = i"
            ></div>
          </div>

        </div>
        </div> <!-- FECHA top -->

        <!-- STATUS -->
        <div class="box">
          <h3>Status</h3>
        </div>

        <!-- PERÍCIAS -->
        <div class="box">
          <h3>Perícias</h3>
        </div>

      </div> <!-- FECHA left -->

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

      </div> <!-- FECHA right -->

    </div> <!-- FECHA ficha -->
  </div> <!-- FECHA ficha-container -->

  <button @click="audio.play()" style="display: none;"></button>
</template>

<script src="./Ficha.js"></script>
<style src="./Ficha.css"></style>