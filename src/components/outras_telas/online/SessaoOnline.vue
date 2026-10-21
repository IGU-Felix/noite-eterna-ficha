<template>
  <div class="sessao-painel" :style="estiloJanela()">

    <div class="sessao-barra" @mousedown="iniciarArraste">
      <span class="sessao-titulo-barra">📡 Sessão Online</span>
      <div v-if="ehMestre && sessaoEstado.conectado" class="sessao-ferramentas-mestre" @mousedown.stop>
        <button class="sessao-ferramenta-mestre" @click="alternarPastas"
          title="Abrir ou fechar pastas de música" aria-label="Abrir ou fechar pastas de música">▤</button>
        <button class="sessao-ferramenta-mestre" @click="resetarDescansoJogador()"
          title="Resetar habilidades de todos os jogadores" aria-label="Resetar habilidades de todos os jogadores">↻</button>
        <button class="sessao-ferramenta-mestre"
          :class="{ 'sessao-ferramenta-pulsando': todosJogadoresRolaram }"
          @click="enviarIniciativasDiscord"
          title="Enviar ordem de iniciativa ao Discord" aria-label="Enviar ordem de iniciativa ao Discord">⚄</button>
        <button class="sessao-ferramenta-mestre" @click="cardAberto = true"
          title="Configurar card do Discord" aria-label="Configurar card do Discord">▣</button>
      </div>
      <button class="sessao-fechar" @mousedown.stop @click="$emit('fechar')" title="fechar">×</button>
    </div>

    <div class="sessao-corpo">
      <CardDiscord v-if="cardAberto" @fechar="cardAberto = false" />

      <div v-if="sessaoEstado.erro" class="sessao-erro">
        <span>{{ sessaoEstado.erro }}</span>
        <button
          v-if="!sessaoEstado.conectado && !sessaoEstado.conectando"
          class="sessao-btn-reconectar"
          @click="tentarConectarNovamente"
        >
          Tentar conectar
        </button>
      </div>

      <!-- MENU INICIAL -->
      <template v-if="!sessaoEstado.conectado && !sessaoEstado.conectando && modo === 'menu'">
        <p class="sessao-intro">Jogue com seu grupo em tempo real — conexão direta entre navegadores, sem servidor.</p>
        <button class="sessao-btn-principal" @click="irParaCriar">Criar Sessão</button>
        <button class="sessao-btn-secundario" @click="irParaEntrar">Entrar em Sessão</button>
      </template>

      <!-- FORM CRIAR -->
      <template v-if="!sessaoEstado.conectado && !sessaoEstado.conectando && modo === 'criar'">
        <label class="sessao-label">
          Seu nome (Mestre)
          <input v-model="nomeInput" class="sessao-input" placeholder="Nome do Mestre" />
        </label>
        <label class="sessao-label">
          Código da sala (opcional)
          <input v-model="codigoPersonalizado" class="sessao-input" placeholder="deixe em branco para gerar" maxlength="6" />
        </label>
        <div class="sessao-acoes-form">
          <button class="sessao-btn-voltar" @click="voltar">← Voltar</button>
          <button class="sessao-btn-principal" @click="confirmarCriarSessao">Criar Sessão</button>
        </div>
      </template>

      <!-- FORM ENTRAR -->
      <template v-if="!sessaoEstado.conectado && !sessaoEstado.conectando && modo === 'entrar'">
        <label class="sessao-label">
          Seu nome
          <input v-model="nomeInput" class="sessao-input" placeholder="Seu nome" />
        </label>
        <label class="sessao-label">
          Código da sessão
          <input v-model="codigoParaEntrar" class="sessao-input" placeholder="ex: 7XK3PL" maxlength="6" />
        </label>
        <label v-if="personagemDisponivel" class="sessao-checkbox">
          <input type="checkbox" v-model="vincularFicha" />
          Vincular minha Ficha de Personagem ({{ nomePersonagem || "sem nome" }})
        </label>
        <div class="sessao-acoes-form">
          <button class="sessao-btn-voltar" @click="voltar">← Voltar</button>
          <button class="sessao-btn-principal" @click="confirmarEntrarSessao">Entrar</button>
        </div>
      </template>

      <!-- CONECTANDO -->
      <template v-if="sessaoEstado.conectando">
        <p class="sessao-status">Conectando...</p>
        <button class="sessao-btn-cancelar" @click="cancelarConexao">Cancelar conexão</button>
      </template>

      <!-- CONECTADO -->
      <template v-if="sessaoEstado.conectado">
        <div class="sessao-info-conexao">
          <span class="sessao-papel-badge" :class="ehMestre ? 'badge-mestre' : 'badge-jogador'">
            {{ ehMestre ? "Mestre" : "Jogador" }}
          </span>
          <div class="sessao-codigo-linha">
            <span class="sessao-codigo">{{ sessaoEstado.codigoSessao }}</span>
            <button class="sessao-copiar" @click="copiarCodigo">{{ copiado ? "Copiado!" : "Copiar" }}</button>
          </div>
        </div>

        <div class="sessao-iniciativa-painel">
          <div class="sessao-jogadores-titulo">Jogadores conectados</div>
          <p v-if="ehMestre" class="sessao-iniciativa-ajuda">
            Arraste os participantes para resolver empates.
          </p>
          <p v-else class="sessao-iniciativa-ajuda">Ordem de iniciativa da sessão.</p>
          <TransitionGroup v-if="ordemIniciativa.length" tag="div" name="sessao-iniciativa"
            class="sessao-iniciativa-lista">
            <div v-for="(participante, indice) in ordemIniciativa" :key="participante.id"
              class="sessao-iniciativa-item"
              :class="{ 'sessao-iniciativa-ameaca': participante.tipo === 'ameaca',
                'sessao-iniciativa-arrastando': arrastandoIniciativa === participante.id }"
              :draggable="ehMestre"
              @dragstart="iniciarArrasteIniciativa(participante.id)"
              @dragover.prevent
              @drop.prevent="soltarIniciativa(participante.id)">
              <span class="sessao-iniciativa-posicao">{{ indice + 1 }}</span>
              <img v-if="participante.imagem" class="sessao-iniciativa-foto"
                :src="participante.imagem" :alt="`Imagem de ${participante.personagemNome || participante.nome}`" />
              <div v-else class="sessao-iniciativa-foto sessao-iniciativa-foto-vazia">⏾</div>
              <div class="sessao-iniciativa-identidade">
                <span class="sessao-iniciativa-jogador">
                  {{ participante.tipo === "ameaca" ? "Ameaça" : participante.jogadorNome }}
                </span>
                <span class="sessao-iniciativa-nome">{{ participante.personagemNome || participante.nome }}</span>
              </div>
              <span class="sessao-iniciativa-valor">
                {{ mostrarIniciativa(participante) }}
              </span>
              <button v-if="ehMestre && participante.tipo !== 'ameaca'" class="sessao-iniciativa-controle"
                @click.stop="abrirFichaVinculada(participante.fichaId)"
                title="Abrir ficha vinculada" aria-label="Abrir ficha vinculada">⟡</button>
              <button v-if="ehMestre && participante.tipo !== 'ameaca'" class="sessao-iniciativa-controle"
                @click.stop title="Configuração do jogador" aria-label="Configuração do jogador">⚙</button>
              <button v-if="ehMestre && participante.tipo !== 'ameaca'" class="sessao-iniciativa-controle"
                @click.stop="resetarDescansoJogador(participante.jogadorId)"
                title="Resetar habilidades deste jogador" aria-label="Resetar habilidades deste jogador">↻</button>
            </div>
          </TransitionGroup>
          <p v-else class="sessao-iniciativa-vazia">Nenhum participante disponível.</p>
        </div>

        <div v-if="ehMestre && iniciativaDiscordStatus" class="sessao-iniciativa-status">
          {{ iniciativaDiscordStatus }}
        </div>

        <PlaylistMusicas v-show="ehMestre" ref="playlistRef" />

        <button class="sessao-btn-sair" @click="sair">Sair da Sessão</button>
      </template>

    </div>

  </div>
</template>

<script src="./SessaoOnline.js"></script>
<style src="./SessaoOnline.css"></style>