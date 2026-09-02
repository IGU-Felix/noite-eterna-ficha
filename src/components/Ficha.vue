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

            <input type="file" ref="inputFile" @change="carregarImagem" accept="image/*" hidden />
          </div>

          <!-- INFO -->
          <div class="info">

            <div class="linha-cabecalho">
              <span class="rotulo-leve">Jogador:</span>
              <input class="campo-leve" v-model="jogador" placeholder="nome do jogador" />
            </div>

            <div class="linha-raca-classe">
              <select v-model="racaSelecionada" class="select-rcs"
                :title="racas.find(r => r.nome === racaSelecionada)?.resumo || ''">
                <option value="" disabled>Raça</option>
                <option v-for="r in racas" :key="r.nome" :value="r.nome">{{ r.nome }}</option>
              </select>
              <select v-model="classeSelecionada" class="select-rcs"
                :title="classeInfo ? 'Dado de Vida: ' + classeInfo.dadoVida : ''">
                <option value="" disabled>Classe</option>
                <option v-for="c in classes" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
              </select>
              <select v-model="subclasseSelecionada" class="select-rcs" :disabled="!subclassesDisponiveis.length">
                <option value="" disabled>{{ subclassesDisponiveis.length ? 'Subclasse' : '—' }}</option>
                <option v-for="s in subclassesDisponiveis" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <!-- NOME -->
            <div class="barra nome-barra">
              <div class="barra-overlay">
                <div class="centro">

                  <span v-show="!editandoNome" @click="ativarEdicaoNome">
                    {{ nome }}
                  </span>

                  <input v-show="editandoNome" ref="inputNome" type="text" v-model="nome" @blur="editandoNome = false"
                    @keyup.enter="editandoNome = false" class="input-barra nome-input" />

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
                <div class="barra-preenchimento"
                  :class="[classeVida, { dano: animacaoDano, cura: animacaoCura, critica: vidaCritica }]"
                  :style="{ width: vidaPercent + '%' }"></div>

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
                <div class="barra-preenchimento" :class="[classeMana, { critica: manaCritica }]"
                  :style="{ width: manaPercent + '%' }"></div>

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
                <input class="stat-valor" v-model.number="nivel" />
              </div>
              <div class="stat-box" title="Calculado: PRE + MEN, mais 1d6 na hora de rolar">
                <span class="stat-label">Iniciativa</span>
                <span class="stat-valor-calc">{{ iniciativa }}</span>
              </div>
              <div class="stat-box stat-box-defesa">
                <span class="stat-label">Defesa</span>
                <span class="stat-valor-calc">{{ defesa }}</span>
                <span class="stat-sub">
                  <input type="number" class="stat-sub-input" v-model.number="armadura" />
                  armadura
                </span>

                <!-- TOOLTIP -->
                <div class="tabela-acertos-tooltip">

                  <div class="tabela-acertos-grid">
                    <div class="tabela-acertos-header">Defesa</div>
                    <div class="tabela-acertos-header">Requisito para Acerto</div>
                    <template v-for="linha in tabelaAcertos" :key="linha.faixa">
                      <div class="tabela-acertos-cel tabela-acertos-faixa"
                        :class="{ ativa: linha === linhaAcertoAtiva }">
                        {{ linha.faixa }}
                      </div>
                      <div class="tabela-acertos-cel" :class="{ ativa: linha === linhaAcertoAtiva }">
                        {{ linha.requisito }}
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              <div class="stat-box" title="Calculado: 3 pontos a cada 5 níveis">
                <span class="stat-label">P. Van</span>
                <span class="stat-valor-calc">{{ pVan }}</span>
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
            <div class="ataque-item" v-for="s in status" :key="s.id">

              <!-- MODO EDIÇÃO -->
              <div v-if="s.editando" class="ataque-editor">
                <div class="ataque-caixa">
                  <input class="ataque-nome-input" v-model="s.nome" placeholder="Nome da Condição"
                    list="lista-condicoes" />
                </div>

                <div class="ataque-form-linha">
                  <div class="ataque-caixa ataque-caixa-tipo">
                    <span class="ataque-caixa-label">Duração</span>
                    <input class="ataque-select ataque-select-tipo status-duracao-input" v-model="s.duracao"
                      placeholder="ex: 1 rodada, Até Descanso" list="lista-duracoes" />
                  </div>
                </div>

                <textarea class="ataque-efeito" v-model="s.efeito" placeholder="efeito da condição..."></textarea>

                <div class="ataque-editor-acoes">
                  <button class="btn-remover" @click="removerStatus(s.id)" title="remover">×</button>
                  <button class="btn-salvar-ataque" @click="salvarStatus(s)">Salvar</button>
                </div>
              </div>

              <!-- MODO RESUMO -->
              <div v-else class="ataque-resumo">
                <div class="ataque-resumo-topo">
                  <span class="ataque-resumo-nome">{{ s.nome || 'Condição sem nome' }}</span>
                  <div class="ataque-resumo-acoes">
                    <button class="btn-editar" @click="editarStatus(s)" title="editar">✎</button>
                    <button v-if="s.efeito" class="btn-expandir" :class="{ aberto: s.expandido }"
                      @click="toggleExpandido(s)" title="mostrar/ocultar efeito">▾</button>
                    <button class="btn-remover" @click="removerStatus(s.id)" title="remover">×</button>
                  </div>
                </div>
                <div class="ataque-resumo-linha" v-if="s.duracao">
                  <span class="ataque-badge ataque-badge-tipo">{{ s.duracao }}</span>
                </div>
                <p v-if="s.efeito && s.expandido" class="ataque-resumo-efeito">{{ s.efeito }}</p>
              </div>

            </div>

            <p v-if="status.length === 0" class="lista-vazia">Nenhuma condição ativa.</p>
          </div>

          <datalist id="lista-condicoes">
            <option v-for="c in condicoesComuns" :key="c" :value="c" />
          </datalist>
          <datalist id="lista-duracoes">
            <option v-for="d in duracoesComuns" :key="d" :value="d" />
          </datalist>

          <button class="btn-add" @click="adicionarStatus">+ adicionar condição</button>
        </div>

        <!-- PERÍCIAS -->
        <div class="painel pericias-painel">
          <div class="titulo-secao">
            <span class="icone-secao">✎</span> Perícias
          </div>

          <div class="pericias-grid">
            <div class="pericia-linha" v-for="p in pericias" :key="p.id">

              <div class="pericia-caixa" title="Cada 2 pontos aumentam 1 dado em +1 (regra do livro)">
                <input type="text" class="pericia-valor" :value="p.valor"
                  @input="atualizarPericia(p, $event.target.value)" />
                <span class="pericia-mod">+{{ p.mod }}</span>
              </div>

              <div class="pericia-nome">
                <span class="pericia-nome-texto" @click="abrirOuRolarPericia(p)" title="Rolar teste de perícia / Rolar novamente">{{
                  p.nome
                  }}</span>
                <input v-if="p.especializacao !== undefined" class="pericia-especializacao"
                  v-model="p.especializacao" />
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
            <div v-for="i in insanidadeMax" :key="'ins-' + i" class="insanidade-slot"
              :class="{ ativo: i <= insanidadeAtual }" @click="insanidadeAtual = (insanidadeAtual === i) ? 0 : i"></div>
          </div>

          <!-- CARGAS 1 -->
          <div class="titulo-secao carga-titulo">
            Cargas de
            <select v-model="tipoSelecionado_1" class="select-carga">
              <option v-for="tipo in tiposCarga" :key="tipo.nome" :value="tipo.nome">
                {{ tipo.nome }}
              </option>
            </select>
            <span class="carga-max-label">máx.</span>
            <input type="number" min="0" class="carga-max-input-inline" v-model.number="cargasMax_1" />
          </div>
          <div class="cargas-grid">
            <div v-for="i in cargasMax_1" :key="'car1-' + i" class="carga-slot" :class="{ ativa: i <= cargasAtual_1 }"
              @click="cargasAtual_1 = (cargasAtual_1 === i) ? 0 : i"></div>
          </div>

          <!-- CARGAS 2 -->
          <div class="titulo-secao carga-titulo">
            Cargas de
            <select v-model="tipoSelecionado_2" class="select-carga">
              <option v-for="tipo in tiposCarga" :key="tipo.nome" :value="tipo.nome">
                {{ tipo.nome }}
              </option>
            </select>
            <span class="carga-max-label">máx.</span>
            <input type="number" min="0" class="carga-max-input-inline" v-model.number="cargasMax_2" />
          </div>
          <div class="cargas-grid">
            <div v-for="i in cargasMax_2" :key="'car2-' + i" class="carga-slot" :class="{ ativa: i <= cargasAtual_2 }"
              @click="cargasAtual_2 = (cargasAtual_2 === i) ? 0 : i"></div>
          </div>

          <!-- CARGAS 3 -->
          <div class="titulo-secao carga-titulo">
            Cargas de
            <select v-model="tipoSelecionado_3" class="select-carga">
              <option v-for="tipo in tiposCarga" :key="tipo.nome" :value="tipo.nome">
                {{ tipo.nome }}
              </option>
            </select>
            <span class="carga-max-label">máx.</span>
            <input type="number" min="0" class="carga-max-input-inline" v-model.number="cargasMax_3" />
          </div>
          <div class="cargas-grid">
            <div v-for="i in cargasMax_3" :key="'car3-' + i" class="carga-slot" :class="{ ativa: i <= cargasAtual_3 }"
              @click="cargasAtual_3 = (cargasAtual_3 === i) ? 0 : i"></div>
          </div>

        </div>

        <!-- COMBATE / HABILIDADES / MAGIAS / VANTAGENS / DESVANTAGENS -->
        <div class="painel combate-painel">

          <div class="abas-combate">
            <button v-for="aba in abasCombate" :key="aba" class="aba-btn" :class="{ ativa: abaCombateAtiva === aba }"
              @click="abaCombateAtiva = aba">{{ aba }}</button>
          </div>

          <div class="combate-lista">

            <!-- aba Progressão: tabela calculada a partir da classe + nível, não é editável na mão -->
            <template v-if="abaCombateAtiva === 'Progressão'">
              <p v-if="!classeInfo" class="lista-vazia">Escolha uma classe acima para ver a progressão.</p>
              <div v-else class="progressao-linha" v-for="p in progressaoClasse" :key="p.nivel"
                :class="{ alcancado: p.alcancado }" :title="p.desc">
                <span class="progressao-nivel">{{ p.nivel }}</span>
                <span class="progressao-habilidade">{{ p.habilidade }}</span>
              </div>
            </template>

            <!-- demais abas: listas livres editáveis (a aba Habilidades ainda mostra as
                 habilidades raciais automaticamente, quando uma raça foi escolhida) -->
            <!-- ABA COMBATE: editor de ataque -->
            <template v-else-if="abaCombateAtiva === 'Combate'">
              <div class="ataque-item" v-for="item in itensCombate.Combate" :key="item.id">

                <!-- MODO EDIÇÃO -->
                <div v-if="item.editando" class="ataque-editor">
                  <div class="ataque-caixa">
                    <input class="ataque-nome-input" v-model="item.nome" placeholder="Nome do Ataque" />
                  </div>

                  <div class="ataque-form-linha">
                    <div class="ataque-caixa ataque-caixa-dano">
                      <span class="ataque-caixa-label">Dado de Dano</span>
                      <div class="ataque-dado-controles">
                        <select class="ataque-select ataque-select-qtd" v-model.number="item.qtdDados">
                          <option v-for="n in 6" :key="n" :value="n">{{ n }}</option>
                        </select>
                        <span class="ataque-d">d</span>
                        <select class="ataque-select" v-model.number="item.tipoDado">
                          <option v-for="d in dadosOptions" :key="d" :value="d">{{ d }}</option>
                        </select>
                      </div>
                    </div>

                    <div class="ataque-caixa ataque-caixa-tipo">
                      <span class="ataque-caixa-label">Tipo de Dano</span>
                      <select class="ataque-select ataque-select-tipo" v-model="item.tipoDano">
                        <option v-for="t in tiposDano" :key="t" :value="t">{{ t }}</option>
                      </select>
                    </div>
                  </div>

                  <input class="ataque-modificador" v-model="item.modificador"
                    placeholder="modificador (ex: + MEN, × ROB)" />
                  <textarea class="ataque-efeito" v-model="item.efeito"
                    placeholder="custo, alcance, efeito adicional..."></textarea>

                  <div class="ataque-editor-acoes">
                    <button class="btn-remover" @click="removerItemCombate(item.id)" title="remover">×</button>
                    <button class="btn-salvar-ataque" @click="salvarAtaque(item)">Salvar</button>
                  </div>
                </div>

                <!-- MODO RESUMO -->
                <div v-else class="ataque-resumo">
                  <div class="ataque-resumo-topo">
                    <span class="ataque-resumo-nome">{{ item.nome || 'Ataque sem nome' }}</span>
                    <div class="ataque-resumo-acoes">
                      <button class="btn-editar" @click="editarAtaque(item)" title="editar">✎</button>
                      <button v-if="item.efeito" class="btn-expandir" :class="{ aberto: item.expandido }"
                        @click="toggleExpandido(item)" title="mostrar/ocultar efeito">▾</button>
                      <button class="btn-remover" @click="removerItemCombate(item.id)" title="remover">×</button>
                    </div>
                  </div>
                  <div class="ataque-resumo-linha">
                    <span class="ataque-badge">{{ resumoAtaque(item) }}</span>
                    <span class="ataque-badge ataque-badge-tipo">{{ item.tipoDano }}</span>
                  </div>
                  <p v-if="item.efeito && item.expandido" class="ataque-resumo-efeito">{{ item.efeito }}</p>
                </div>

              </div>

              <p v-if="itensCombate.Combate.length === 0" class="lista-vazia">Nenhum ataque cadastrado ainda.</p>
            </template>

            <!-- ABA MAGIAS: editor de magia + seletor de truques (se Feiticeiro) -->
            <template v-else-if="abaCombateAtiva === 'Magias'">

              <div v-if="classeSelecionada === 'Feiticeiro'" class="seletor-truques">
                <div class="racial-titulo">Truques do Feiticeiro — clique pra adicionar</div>
                <select class="select-truque" @change="adicionarTruque($event.target.value); $event.target.value = ''">
                  <option value="">Escolher um truque...</option>
                  <option v-for="t in truquesFeiticeiro" :key="t.nome" :value="t.nome">{{ t.nome }} (nível {{ t.nivel
                    }})</option>
                </select>
              </div>

              <div class="ataque-item" v-for="item in itensCombate.Magias" :key="item.id">

                <div v-if="item.editando" class="ataque-editor">
                  <div class="ataque-caixa">
                    <input class="ataque-nome-input" v-model="item.nome" placeholder="Nome da Magia" />
                  </div>

                  <div class="ataque-form-linha">
                    <div class="ataque-caixa ataque-caixa-tipo">
                      <span class="ataque-caixa-label">Nível</span>
                      <select class="ataque-select" v-model.number="item.nivel">
                        <option v-for="n in 6" :key="n" :value="n">{{ n }}</option>
                      </select>
                    </div>
                    <div class="ataque-caixa ataque-caixa-tipo">
                      <span class="ataque-caixa-label">Custo de Mana</span>
                      <input class="ataque-select" type="number" min="0" v-model.number="item.custoMana" />
                    </div>
                    <div class="ataque-caixa ataque-caixa-tipo">
                      <span class="ataque-caixa-label">Tipo de Dano</span>
                      <select class="ataque-select ataque-select-tipo" v-model="item.tipoDano">
                        <option v-for="t in tiposMagia" :key="t" :value="t">{{ t }}</option>
                      </select>
                    </div>
                  </div>

                  <textarea class="ataque-efeito" v-model="item.efeito"
                    placeholder="alcance, tempo de conjuração, efeito..."></textarea>

                  <div class="ataque-editor-acoes">
                    <button class="btn-remover" @click="removerItemCombate(item.id)" title="remover">×</button>
                    <button class="btn-salvar-ataque" @click="salvarMagia(item)">Salvar</button>
                  </div>
                </div>

                <div v-else class="ataque-resumo">
                  <div class="ataque-resumo-topo">
                    <span class="ataque-resumo-nome">{{ item.nome || 'Magia sem nome' }}</span>
                    <div class="ataque-resumo-acoes">
                      <button class="btn-editar" @click="editarMagia(item)" title="editar">✎</button>
                      <button v-if="item.efeito" class="btn-expandir" :class="{ aberto: item.expandido }"
                        @click="toggleExpandido(item)" title="mostrar/ocultar efeito">▾</button>
                      <button class="btn-remover" @click="removerItemCombate(item.id)" title="remover">×</button>
                    </div>
                  </div>
                  <div class="ataque-resumo-linha">
                    <span class="ataque-badge">Nível {{ item.nivel }} · {{ item.custoMana }} mana</span>
                    <span class="ataque-badge ataque-badge-tipo">{{ item.tipoDano }}</span>
                  </div>
                  <p v-if="item.efeito && item.expandido" class="ataque-resumo-efeito">{{ item.efeito }}</p>
                </div>

              </div>

              <p v-if="itensCombate.Magias.length === 0" class="lista-vazia">Nenhuma magia cadastrada ainda.</p>
            </template>

            <!-- DEMAIS ABAS: continuam como listas livres -->
            <template v-else>

              <template v-if="abaCombateAtiva === 'Habilidades'">
                <p v-if="!racaSelecionada" class="lista-vazia">Escolha uma raça acima para ver as habilidades raciais.
                </p>
                <div v-else class="racial-bloco">
                  <div class="racial-titulo">Raça: {{ racaSelecionada }}</div>
                  <div class="racial-linha"
                    v-for="h in (racas.find(r => r.nome === racaSelecionada)?.habilidades || [])" :key="h.nome"
                    :title="h.desc">
                    <span class="racial-nome">{{ h.nome }}</span>
                  </div>
                </div>
                <div class="divisor-habilidades" v-if="racaSelecionada">Outras habilidades</div>
              </template>

              <div class="combate-item" v-for="item in itensCombate[abaCombateAtiva]" :key="item.id">
                <div class="combate-item-topo">
                  <input class="combate-nome" v-model="item.nome" placeholder="nome" />
                  <button class="btn-expandir" :class="{ aberto: item.expandido }" @click="toggleExpandido(item)"
                    title="mostrar/ocultar descrição">▾</button>
                  <button class="btn-remover" @click="removerItemCombate(item.id)" title="remover">×</button>
                </div>

                <div v-if="abaCombateAtiva === 'Habilidades'" class="habilidade-vinculos">
                  <select class="habilidade-select" v-model="item.tipoAcao">
                    <option value="">Sem custo de ação</option>
                    <option value="padrao">Ação Padrão</option>
                    <option value="bonus">Ação Bônus</option>
                    <option value="movimento">Movimento</option>
                    <option value="reacao">Reação</option>
                    <option value="descanso">Descanso</option>
                    <option value="cena">Cena</option>
                    <option value="mana">Mana</option>
                  </select>
                  <input 
                    type="number" 
                    class="habilidade-select" 
                    v-model.number="item.modificadorHabilidade" 
                    placeholder="Modificador (+/-)"/>
                  <select class="habilidade-select" v-model="item.periciaVinculada">
                    <option value="">Não vinculada a perícia</option>
                    <option v-for="p in pericias" :key="p.id" :value="p.nome">{{ p.nome }}</option>
                  </select>
                </div>

                <textarea v-show="item.expandido" class="combate-detalhe" v-model="item.detalhe"
                  placeholder="dano, custo, efeito, descrição..."></textarea>
              </div>

              <p v-if="itensCombate[abaCombateAtiva].length === 0" class="lista-vazia">
                Nada por aqui ainda.
              </p>
            </template>

          </div>

          <button v-if="abaCombateAtiva !== 'Progressão'" class="btn-add" @click="adicionarItemCombate">+ adicionar em
            {{
              abaCombateAtiva }}</button>
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
              <input class="titulo-atributos" type="text" :value="attr.valor === '?' ? '' : attr.valor"
                @input="atualizarAtributo(attr, $event.target.value)" />
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
    <RolagemDados v-if="rolagemAberta" :key="rolagemConfig.titulo + rolagemConfig.dados + rolagemConfig.modificador"
      :dados-iniciais="rolagemConfig.dados" :modificador-inicial="rolagemConfig.modificador"
      :titulo-teste="rolagemConfig.titulo" :pericia-nome="rolagemConfig.periciaNome"
      :habilidades="itensCombate.Habilidades" :acoes-gastas="acoesGastas" :alternar-acao="alternarAcao"
      :valor-atributo="obterValorAtributoAtual" :rolar-novamente="rolarPericia" :disparador-rolagem="disparadorRolagem"
      :habilidades-gastas-rolagem="habilidadesGastasRolagem" :marcar-habilidade-gasta="marcarHabilidadeGasta"
      @fechar="fecharRolagem" />
  </div> <!-- FECHA ficha-container -->
</template>

<script src="./Ficha.js"></script>
<style src="./Ficha.css"></style>
