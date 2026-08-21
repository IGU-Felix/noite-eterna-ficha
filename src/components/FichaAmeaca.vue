<template>
    <div class="ficha-container ameaca-container">
        <div class="ameaca ficha">

            <!-- CABEÇALHO -->
            <div class="topo ameaca-topo">

                <div class="status-imagem" @click="abrirUpload">
                    <img v-if="imagemAmeaca" :src="imagemAmeaca" />
                    <span v-else class="placeholder">+</span>
                    <input type="file" ref="inputFile" @change="carregarImagem" accept="image/*" hidden />
                </div>

                <div class="info">

                    <div class="barra nome-barra">
                        <div class="barra-overlay">
                            <div class="centro">
                                <span v-show="!editandoNome" @click="ativarEdicaoNome">{{ nome }}</span>
                                <input v-show="editandoNome" ref="inputNome" type="text" v-model="nome"
                                    @blur="editandoNome = false" @keyup.enter="editandoNome = false"
                                    class="input-barra nome-input" />
                            </div>
                        </div>
                    </div>

                    <div class="barra">
                        <div class="barra-preenchimento" :class="classeVida" :style="{ width: vidaPercent + '%' }">
                        </div>
                        <div class="barra-overlay">
                            <button class="btn-esq" @click="alterarVida(-5)">-5</button>
                            <div class="centro">
                                <input class="input-barra" style="width:40px" type="number"
                                    v-model.number="vidaAtual" />
                                /
                                <input class="input-barra" style="width:40px" type="number" v-model.number="vidaMax" />
                            </div>
                            <button class="btn-dir" @click="alterarVida(5)">+5</button>
                        </div>
                    </div>

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
                            <input class="stat-valor" v-model.number="defesa" />

                            <div class="tabela-acertos-tooltip">
                                <div class="tabela-acertos-grid">
                                    <div class="tabela-acertos-header">Defesa</div>
                                    <div class="tabela-acertos-header">Requisito</div>
                                    <template v-for="linha in tabelaAcertos" :key="linha.faixa">
                                        <div class="tabela-acertos-cel tabela-acertos-faixa"
                                            :class="{ ativa: linha === linhaAcertoAtiva }">{{ linha.faixa }}</div>
                                        <div class="tabela-acertos-cel" :class="{ ativa: linha === linhaAcertoAtiva }">
                                            {{ linha.requisito }}</div>
                                    </template>
                                </div>
                            </div>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">P. Van</span>
                            <input class="stat-valor" v-model.number="pVan" />
                        </div>
                    </div>

                    <!-- ATRIBUTOS (agora dentro da coluna de info, ao lado do retrato) -->
                    <div class="titulo-secao ameaca-atributos-titulo">
                        <span class="icone-secao">⊗</span> Atributos
                    </div>
                    <div class="grid-atributos ameaca-grid-atributos">
                        <div v-for="attr in atributos" :key="attr.nome" class="box">
                            <input type="text" :value="attr.valor === '?' ? '' : attr.valor"
                                @input="atualizarAtributo(attr, $event.target.value)" />
                            <span>{{ attr.nome }}</span>
                        </div>
                    </div>

                </div>
            </div>

            <!-- CORPO -->
            <div class="ameaca-corpo">

                <!-- PERÍCIAS -->
                <div class="painel ameaca-col-pericias">
                    <div class="titulo-secao">
                        <span class="icone-secao">✦</span> Perícias
                    </div>

                    <div class="ameaca-pericias-lista">
                        <div class="pericia-linha" v-for="p in pericias" :key="p.id">
                            <div class="pericia-caixa">
                                <input type="text" class="pericia-valor" :value="p.valor"
                                    @input="atualizarPericia(p, $event.target.value)" />
                                <span class="pericia-mod">+{{ p.mod }}</span>
                            </div>
                            <input class="ameaca-pericia-nome-input" v-model="p.nome" placeholder="perícia" />
                            <input class="ameaca-pericia-attr-input" v-model="p.atributo" placeholder="attr" />
                            <button class="btn-remover" @click="removerPericia(p.id)" title="remover">×</button>
                        </div>
                        <p v-if="pericias.length === 0" class="lista-vazia">Nenhuma perícia adicionada.</p>
                    </div>

                    <button class="btn-add" @click="adicionarPericia">+ adicionar perícia</button>
                </div>

                <!-- COMBATE / HABILIDADES / MAGIAS + INVENTÁRIO -->
                <div class="ameaca-coluna-meio">

                    <div class="painel combate-painel">
                        <div class="abas-combate">
                            <button v-for="aba in abas" :key="aba" class="aba-btn" :class="{ ativa: abaAtiva === aba }"
                                @click="abaAtiva = aba">{{ aba }}</button>
                        </div>

                        <div class="combate-lista">
                            <div class="ataque-item" v-for="item in itens[abaAtiva]" :key="item.id">

                                <div v-if="item.editando" class="ataque-editor">
                                    <div class="ataque-caixa">
                                        <input class="ataque-nome-input" v-model="item.nome" placeholder="nome" />
                                    </div>
                                    <textarea class="ataque-efeito" v-model="item.detalhe"
                                        placeholder="dano, teste, efeito..."></textarea>
                                    <div class="ataque-editor-acoes">
                                        <button class="btn-remover" @click="removerItem(item.id)"
                                            title="remover">×</button>
                                        <button class="btn-salvar-ataque" @click="salvarItem(item)">Salvar</button>
                                    </div>
                                </div>

                                <div v-else class="ataque-resumo">
                                    <div class="ataque-resumo-topo">
                                        <span class="ataque-resumo-nome">{{ item.nome || 'sem nome' }}</span>
                                        <div class="ataque-resumo-acoes">
                                            <button class="btn-editar" @click="editarItem(item)"
                                                title="editar">✎</button>
                                            <button v-if="item.detalhe" class="btn-expandir"
                                                :class="{ aberto: item.expandido }" @click="toggleExpandido(item)"
                                                title="mostrar/ocultar">▾</button>
                                            <button class="btn-remover" @click="removerItem(item.id)"
                                                title="remover">×</button>
                                        </div>
                                    </div>
                                    <p v-if="item.detalhe && item.expandido" class="ataque-resumo-efeito">{{
                                        item.detalhe }}</p>
                                </div>

                            </div>
                            <p v-if="itens[abaAtiva].length === 0" class="lista-vazia">Nada cadastrado ainda.</p>
                        </div>

                        <button class="btn-add" @click="adicionarItem">+ adicionar em {{ abaAtiva }}</button>
                    </div>

                    <div class="painel inventario-painel">
                        <div class="titulo-secao">
                            <span class="icone-secao">⟐</span> Inventário
                        </div>

                        <div class="inventario-lista">
                            <div class="inventario-item" v-for="item in inventario" :key="item.id">
                                <input class="inventario-nome" v-model="item.nome" placeholder="item" />
                                <input class="inventario-peso" type="number" min="0" step="0.5"
                                    v-model.number="item.peso" />
                                <button class="btn-remover" @click="removerItemInventario(item.id)"
                                    title="remover">×</button>
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

                </div>

                <!-- CARGAS + STATUS -->
                <div class="ameaca-coluna-direita">

                    <div class="painel-insanidade">
                        <template v-for="(bloco, idx) in cargasBlocos" :key="idx">
                            <div class="titulo-secao carga-titulo">
                                Cargas de
                                <input class="select-carga" v-model="bloco.tipo" />
                                <span class="carga-max-label">máx.</span>
                                <input type="number" min="0" class="carga-max-input-inline"
                                    v-model.number="bloco.max" />
                            </div>
                            <div class="cargas-grid">
                                <div v-for="i in bloco.max" :key="'c' + idx + '-' + i" class="carga-slot"
                                    :class="{ ativa: i <= bloco.atual }" @click="alternarCarga(bloco, i)"></div>
                            </div>
                        </template>
                    </div>

                    <div class="painel status-painel">
                        <div class="titulo-secao">
                            <span class="icone-secao">☠</span> Status
                        </div>

                        <div class="status-lista">
                            <div class="ataque-item" v-for="s in status" :key="s.id">

                                <div v-if="s.editando" class="ataque-editor">
                                    <div class="ataque-caixa">
                                        <input class="ataque-nome-input" v-model="s.nome" placeholder="condição" />
                                    </div>
                                    <input class="ataque-select status-duracao-input" v-model="s.duracao"
                                        placeholder="duração" />
                                    <textarea class="ataque-efeito" v-model="s.efeito"
                                        placeholder="efeito..."></textarea>
                                    <div class="ataque-editor-acoes">
                                        <button class="btn-remover" @click="removerStatus(s.id)"
                                            title="remover">×</button>
                                        <button class="btn-salvar-ataque" @click="salvarStatus(s)">Salvar</button>
                                    </div>
                                </div>

                                <div v-else class="ataque-resumo">
                                    <div class="ataque-resumo-topo">
                                        <span class="ataque-resumo-nome">{{ s.nome || 'sem nome' }}</span>
                                        <div class="ataque-resumo-acoes">
                                            <button class="btn-editar" @click="editarStatus(s)"
                                                title="editar">✎</button>
                                            <button v-if="s.efeito" class="btn-expandir"
                                                :class="{ aberto: s.expandido }" @click="toggleExpandido(s)"
                                                title="mostrar/ocultar">▾</button>
                                            <button class="btn-remover" @click="removerStatus(s.id)"
                                                title="remover">×</button>
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

                        <button class="btn-add" @click="adicionarStatus">+ adicionar condição</button>
                    </div>

                </div>

            </div>

        </div>
    </div>
</template>

<script src="./FichaAmeaca.js"></script>
<style src="./Ficha.css"></style>
<style src="./FichaAmeaca.css"></style>