<template>
  <div class="ficha-container">
    <div class="ficha">

      <!-- ==================================================== -->
      <!-- COLUNA 1 — ESQUERDA: retrato, recursos, status, perícias -->
      <!-- ==================================================== -->
      <div class="coluna col-esquerda">

        <div class="topo">

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

            <div class="linha-cabecalho">
              <span class="rotulo-leve">Jogador:</span>
              <input class="campo-leve" v-model="jogador" placeholder="nome do jogador" />
              <input class="campo-leve campo-classe" v-model="classe" />
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

            <!-- VIDA + MANA -->
            <div class="recursos-principais">

              <!-- VIDA -->
              <div class="barra">
                <div
                  class="barra-preenchimento"
                  :class="[classeVida, { dano: animacaoDano, cura: animacaoCura, critica: vidaCritica }]"
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

            <!-- STATS SECUNDÁRIOS -->
            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-label">Nível</span>
                <input class="stat-valor" v-model="nivel" />
              </div>
              <div class="stat-box">
                <span class="stat-label">Iniciativa</span>
                <input class="stat-valor" v-model="iniciativa" />
              </div>
              <div class="stat-box">
                <span class="stat-label">Defesa</span>
                <input class="stat-valor" v-model="defesa" />
              </div>
              <div class="stat-box">
                <span class="stat-label">P. Van</span>
                <input class="stat-valor" v-model="pVan" />
              </div>
            </div>

          </div> <!-- FECHA info -->
        </div> <!-- FECHA topo -->

        <!-- STATUS -->
        <div class="painel status-painel">
          <div class="titulo-secao">
            <span class="icone-secao">☠</span> Status
          </div>

          <div class="status-lista">
            <div class="status-linha" v-for="s in status" :key="s.id">
              <input class="status-tipo" v-model="s.tipo" placeholder="condição" />
              <span class="separador-status">:</span>
              <input class="status-valor" v-model="s.valor" placeholder="—" />
              <button class="btn-remover" @click="removerStatus(s.id)" title="remover">×</button>
            </div>
          </div>

          <button class="btn-add" @click="adicionarStatus">+ adicionar condição</button>
        </div>

        <!-- PERÍCIAS -->
        <div class="painel pericias-painel">
          <div class="titulo-secao">
            <span class="icone-secao">✎</span> Perícias
          </div>

          <div class="pericias-grid">
            <div class="pericia-linha" v-for="p in pericias" :key="p.id">

              <div class="pericia-caixa">
                <input
                  type="text"
                  class="pericia-valor"
                  :value="p.valor"
                  @input="atualizarPericia(p, 'valor', $event.target.value)"
                />
                <input
                  type="text"
                  class="pericia-mod"
                  :value="p.mod"
                  @input="atualizarPericia(p, 'mod', $event.target.value)"
                />
              </div>

              <div class="pericia-nome">
                {{ p.nome }}
                <input
                  v-if="p.especializacao !== undefined"
                  class="pericia-especializacao"
                  v-model="p.especializacao"
                />
                <span class="pericia-atributo">({{ p.atributo }})</span>
              </div>

            </div>
          </div>
        </div>

      </div> <!-- FECHA col-esquerda -->

      <!-- ==================================================== -->
      <!-- COLUNA 2 — MEIO: insanidade, cargas, combate            -->
      <!-- ==================================================== -->
      <div class="coluna col-meio">

        <div class="painel-insanidade">

          <!-- INSANIDADE -->
          <div class="titulo-secao">
            <span class="icone-secao">☾</span> Insanidade
          </div>
          <div class="insanidade-grid">
            <div
              v-for="i in insanidadeMax"
              :key="'ins-' + i"
              class="insanidade-slot"
              :class="{ ativo: i <= insanidadeAtual }"
              @click="insanidadeAtual = (insanidadeAtual === i) ? 0 : i"
            ></div>
          </div>

          <!-- CARGAS 1 -->
          <div class="titulo-secao carga-titulo">
            Cargas de
            <select v-model="tipoSelecionado_1" class="select-carga">
              <option v-for="tipo in tiposCarga" :key="tipo.nome" :value="tipo.nome">
                {{ tipo.nome }}
              </option>
            </select>
          </div>
          <div class="cargas-grid">
            <div
              v-for="i in cargasMax_1"
              :key="'car1-' + i"
              class="carga-slot"
              :class="{ ativa: i <= cargasAtual_1 }"
              @click="cargasAtual_1 = (cargasAtual_1 === i) ? 0 : i"
            ></div>
          </div>

          <!-- CARGAS 2 -->
          <div class="titulo-secao carga-titulo">
            Cargas de
            <select v-model="tipoSelecionado_2" class="select-carga">
              <option v-for="tipo in tiposCarga" :key="tipo.nome" :value="tipo.nome">
                {{ tipo.nome }}
              </option>
            </select>
          </div>
          <div class="cargas-grid">
            <div
              v-for="i in cargasMax_2"
              :key="'car2-' + i"
              class="carga-slot"
              :class="{ ativa: i <= cargasAtual_2 }"
              @click="cargasAtual_2 = (cargasAtual_2 === i) ? 0 : i"
            ></div>
          </div>

          <!-- CARGAS 3 -->
          <div class="titulo-secao carga-titulo">
            Cargas de
            <select v-model="tipoSelecionado_3" class="select-carga">
              <option v-for="tipo in tiposCarga" :key="tipo.nome" :value="tipo.nome">
                {{ tipo.nome }}
              </option>
            </select>
          </div>
          <div class="cargas-grid">
            <div
              v-for="i in cargasMax_3"
              :key="'car3-' + i"
              class="carga-slot"
              :class="{ ativa: i <= cargasAtual_3 }"
              @click="cargasAtual_3 = (cargasAtual_3 === i) ? 0 : i"
            ></div>
          </div>

        </div>

        <!-- COMBATE / HABILIDADES / MAGIAS / VANTAGENS / DESVANTAGENS -->
        <div class="painel combate-painel">

          <div class="abas-combate">
            <button
              v-for="aba in abasCombate"
              :key="aba"
              class="aba-btn"
              :class="{ ativa: abaCombateAtiva === aba }"
              @click="abaCombateAtiva = aba"
            >{{ aba }}</button>
          </div>

          <div class="combate-lista">
            <div class="combate-item" v-for="item in itensCombate[abaCombateAtiva]" :key="item.id">
              <div class="combate-item-topo">
                <input class="combate-nome" v-model="item.nome" placeholder="nome" />
                <button class="btn-remover" @click="removerItemCombate(item.id)" title="remover">×</button>
              </div>
              <input class="combate-detalhe" v-model="item.detalhe" placeholder="dano, custo, efeito..." />
            </div>

            <p v-if="itensCombate[abaCombateAtiva].length === 0" class="lista-vazia">
              Nada por aqui ainda.
            </p>
          </div>

          <button class="btn-add" @click="adicionarItemCombate">+ adicionar em {{ abaCombateAtiva }}</button>
        </div>

      </div> <!-- FECHA col-meio -->

      <!-- ==================================================== -->
      <!-- COLUNA 3 — DIREITA: atributos, patrimônio, inventário   -->
      <!-- ==================================================== -->
      <div class="coluna col-direita">

        <div class="atributos-container">

          <div class="titulo-secao">
            <span class="icone-secao">✦</span> Atributos
          </div>

          <div class="grid-atributos">
            <div v-for="attr in atributos" :key="attr.nome" class="box">
              <input class="titulo-atributos"
                type="text"
                :value="attr.valor === '?' ? '' : attr.valor"
                @input="atualizarAtributo(attr, $event.target.value)"
              />
              <span>{{ attr.nome }}</span>
            </div>
          </div>

          <div class="titulo-secao">
            <span class="icone-secao">$</span> Patrimônio
          </div>

          <div class="grid-patrimonio">
            <div v-for="item in patrimonio" :key="item.nome" class="mini-box">
              <input type="number" v-model="item.valor" />
              <span>{{ item.nome }}</span>
            </div>
          </div>

        </div>

        <!-- INVENTÁRIO -->
        <div class="painel inventario-painel">
          <div class="titulo-secao">
            <span class="icone-secao">⟐</span> Inventário
          </div>

          <div class="inventario-lista">
            <div class="inventario-item" v-for="item in inventario" :key="item.id">
              <input class="inventario-nome" v-model="item.nome" placeholder="item" />
              <input class="inventario-peso" type="number" min="0" step="0.5" v-model.number="item.peso" />
              <button class="btn-remover" @click="removerItemInventario(item.id)" title="remover">×</button>
            </div>

            <p v-if="inventario.length === 0" class="lista-vazia">Mochila vazia.</p>
          </div>

          <button class="btn-add" @click="adicionarItemInventario">+ adicionar item</button>

          <div class="carga-limite">
            <span class="icone-secao">⚖</span> Limite de Carga:
            <span class="carga-numero">{{ cargaAtualInventario }}</span> /
            <input class="carga-max-input" type="number" min="0" v-model.number="cargaMaxima" />
          </div>
        </div>

      </div> <!-- FECHA col-direita -->

    </div> <!-- FECHA ficha -->
  </div> <!-- FECHA ficha-container -->
</template>

<script src="./Ficha.js"></script>
<style src="./Ficha.css"></style>
