<template>
    <div class="ameaca-container ficha-container">
        <div class="ameaca ficha">

            <!-- CABEÇALHO -->
            <div class="ameaca-topo topo">

                <div class="ameaca-retrato status-imagem" @click="abrirUpload">
                    <img v-if="imagemAmeaca" :src="imagemAmeaca" />
                    <span v-else class="placeholder">+</span>
                    <input type="file" ref="inputFile" @change="carregarImagem" accept="image/*" hidden />
                </div>

                <div class="ameaca-info info">

                    <div class="ameaca-nome-barra barra nome-barra">
                        <span v-show="!editandoNome" @click="ativarEdicaoNome">{{ nome }}</span>
                        <input v-show="editandoNome" ref="inputNome" type="text" v-model="nome"
                            @blur="editandoNome = false" @keyup.enter="editandoNome = false"
                            class="ameaca-nome-input" />
                    </div>

                    <div class="ameaca-vida-barra barra">
                        <div class="ameaca-vida-preenchimento barra-preenchimento" :style="{ width: vidaPercent + '%' }"></div>
                        <div class="ameaca-vida-overlay barra-overlay">
                            <button class="btn-esq" @click="alterarVida(-5)">-5</button>
                            <div class="centro">
                                <input class="vida-input" type="number" v-model.number="vidaAtual" />
                                / <input class="vida-input" type="number" v-model.number="vidaMax" />
                            </div>
                            <button class="btn-dir" @click="alterarVida(5)">+5</button>
                        </div>
                    </div>

                    <div class="ameaca-stats-grid stats-grid">
                        <div class="ameaca-stat-box stat-box">
                            <span class="ameaca-stat-label">Nível</span>
                            <input class="ameaca-stat-valor" v-model.number="nivel" />
                        </div>
                        <div class="ameaca-stat-box" title="Calculado: PRE + MEN, mais 1d6 na hora de rolar">
                            <span class="ameaca-stat-label">Iniciativa</span>
                            <span class="ameaca-stat-valor-calc">{{ iniciativa }}</span>
                        </div>
                        <div class="ameaca-stat-box ameaca-stat-box-defesa stat-box stat-box-defesa">
                            <span class="ameaca-stat-label">Defesa</span>
                            <input class="ameaca-stat-valor" v-model.number="defesa" />

                            <div class="ameaca-tooltip">
                                <div class="ameaca-tooltip-grid">
                                    <div class="ameaca-tooltip-header">Defesa</div>
                                    <div class="ameaca-tooltip-header">Requisito</div>
                                    <template v-for="linha in tabelaAcertos" :key="linha.faixa">
                                        <div class="ameaca-tooltip-cel" :class="{ ativa: linha === linhaAcertoAtiva }">
                                            {{ linha.faixa }}</div>
                                        <div class="ameaca-tooltip-cel" :class="{ ativa: linha === linhaAcertoAtiva }">
                                            {{ linha.requisito }}</div>
                                    </template>
                                </div>
                            </div>
                        </div>
                        <div class="ameaca-stat-box">
                            <span class="ameaca-stat-label">P. Van</span>
                            <input class="ameaca-stat-valor" v-model.number="pVan" />
                        </div>
                    </div>

                </div>
            </div>

            <!-- ATRIBUTOS -->
            <div class="ameaca-atributos-titulo">
                <span class="icone-secao">⊗</span> Atributos
            </div>
            <div class="ameaca-atributos-grid grid-atributos">
                <div v-for="attr in atributos" :key="attr.nome" class="ameaca-attr-box box">
                    <input type="text" :value="attr.valor === '?' ? '' : attr.valor"
                        @input="atualizarAtributo(attr, $event.target.value)" />
                    <span>{{ attr.nome }}</span>
                </div>
            </div>

            <!-- CORPO -->
            <div class="ameaca-corpo coluna">

                <!-- PERÍCIAS -->
                <div class="ameaca-painel ameaca-pericias painel">
                    <div class="ameaca-titulo-secao">
                        <span class="icone-secao">✦</span> Perícias
                    </div>

                    <div class="ameaca-pericias-lista">
                        <div class="ameaca-pericia-linha" v-for="p in pericias" :key="p.id">
                            <div class="ameaca-pericia-caixa">
                                <input type="text" class="ameaca-pericia-valor" :value="p.valor"
                                    @input="atualizarPericia(p, $event.target.value)" />
                                <span class="ameaca-pericia-mod">+{{ p.mod }}</span>
                            </div>
                            <input class="ameaca-pericia-nome" v-model="p.nome" placeholder="perícia" />
                            <input class="ameaca-pericia-atributo" v-model="p.atributo" placeholder="attr" />
                            <button class="btn-remover" @click="removerPericia(p.id)" title="remover">×</button>
                        </div>

                        <p v-if="pericias.length === 0" class="lista-vazia">Nenhuma perícia adicionada.</p>
                    </div>

                    <button class="btn-add" @click="adicionarPericia">+ adicionar perícia</button>
                </div>

                <!-- COMBATE / HABILIDADES / MAGIAS + CARGAS -->
                <div class="ameaca-coluna-meio coluna col-meio">

                    <div class="ameaca-cargas-linha">
                        <div class="ameaca-carga-bloco" v-for="(bloco, idx) in cargasBlocos" :key="idx">
                            <div class="ameaca-titulo-secao ameaca-carga-titulo">
                                Cargas de
                                <input class="ameaca-carga-tipo-input" v-model="bloco.tipo" />
                                <span class="carga-max-label">máx.</span>
                                <input type="number" min="0" class="carga-max-input-inline"
                                    v-model.number="bloco.max" />
                            </div>
                            <div class="cargas-grid">
                                <div v-for="i in bloco.max" :key="'c' + idx + '-' + i" class="carga-slot"
                                    :class="{ ativa: i <= bloco.atual }" @click="alternarCarga(bloco, i)"></div>
                            </div>
                        </div>
                    </div>

                    <div class="ameaca-painel ameaca-combate painel combate-painel">
                        <div class="ameaca-abas">
                            <button v-for="aba in abas" :key="aba" class="ameaca-aba-btn"
                                :class="{ ativa: abaAtiva === aba }" @click="abaAtiva = aba">{{ aba }}</button>
                        </div>

                        <div class="ameaca-combate-lista">
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
                                        <span class="ataque-resumo-nome">🎲 {{ item.nome || 'sem nome' }}</span>
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

                </div>

                <!-- STATUS -->
                <div class="ameaca-painel ameaca-status painel status-painel">
                    <div class="ameaca-titulo-secao">
                        <span class="icone-secao">☠</span> Status
                    </div>

                    <div class="ameaca-status-lista">
                        <div class="ataque-item" v-for="s in status" :key="s.id">

                            <div v-if="s.editando" class="ataque-editor">
                                <div class="ataque-caixa">
                                    <input class="ataque-nome-input" v-model="s.nome" placeholder="condição" />
                                </div>
                                <input class="ameaca-carga-tipo-input" v-model="s.duracao" placeholder="duração" />
                                <textarea class="ataque-efeito" v-model="s.efeito" placeholder="efeito..."></textarea>
                                <div class="ataque-editor-acoes">
                                    <button class="btn-remover" @click="removerStatus(s.id)" title="remover">×</button>
                                    <button class="btn-salvar-ataque" @click="salvarStatus(s)">Salvar</button>
                                </div>
                            </div>

                            <div v-else class="ataque-resumo">
                                <div class="ataque-resumo-topo">
                                    <span class="ataque-resumo-nome">{{ s.nome || 'sem nome' }}</span>
                                    <div class="ataque-resumo-acoes">
                                        <button class="btn-editar" @click="editarStatus(s)" title="editar">✎</button>
                                        <button v-if="s.efeito" class="btn-expandir" :class="{ aberto: s.expandido }"
                                            @click="toggleExpandido(s)" title="mostrar/ocultar">▾</button>
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

            <!-- INVENTÁRIO -->
            <div class="ameaca-painel ameaca-inventario painel inventario-painel">
                <div class="ameaca-titulo-secao">
                    <span class="icone-secao">⟐</span> Inventário
                </div>

                <div class="ameaca-inventario-lista">
                    <div class="inventario-item" v-for="item in inventario" :key="item.id">
                        <input class="inventario-nome" v-model="item.nome" placeholder="item" />
                        <input class="inventario-peso" type="number" min="0" step="0.5" v-model.number="item.peso" />
                        <button class="btn-remover" @click="removerItemInventario(item.id)" title="remover">×</button>
                    </div>
                    <p v-if="inventario.length === 0" class="lista-vazia">Nenhum item.</p>
                </div>

                <button class="btn-add" @click="adicionarItemInventario">+ adicionar item</button>

                <div class="carga-limite">
                    <span class="icone-secao">⚖</span> Limite de Carga:
                    <span class="carga-numero">{{ cargaAtualInventario }}</span> /
                    <input class="carga-max-input" type="number" min="0" v-model.number="cargaMaxima" />
                </div>
            </div>

        </div>
    </div>
</template>

<script src="./FichaAmeaca.js"></script>
<style src="./Ficha.css"></style>
<style src="./FichaAmeaca.css"></style>