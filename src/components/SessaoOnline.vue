<template>
  <div class="sessao-painel" :style="estiloJanela()">

    <div class="sessao-barra" @mousedown="iniciarArraste">
      <span class="sessao-titulo-barra">📡 Sessão Online</span>
      <button class="sessao-fechar" @mousedown.stop @click="$emit('fechar')" title="fechar">×</button>
    </div>

    <div class="sessao-corpo">

      <div v-if="sessaoEstado.erro" class="sessao-erro">{{ sessaoEstado.erro }}</div>

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

        <div class="sessao-jogadores-titulo">Jogadores conectados ({{ sessaoEstado.jogadores.length }})</div>
        <div class="sessao-jogadores-lista">
          <div v-for="j in sessaoEstado.jogadores" :key="j.id" class="sessao-jogador-item">
            <span class="sessao-online-dot" :class="{ offline: !j.online }"></span>
            <span class="sessao-jogador-nome">{{ j.nome }}</span>
            <span v-if="j.papel === 'mestre'" class="sessao-jogador-tag">Mestre</span>
            <span v-else-if="j.fichaNome" class="sessao-jogador-ficha">{{ j.fichaNome }}</span>
          </div>
        </div>

        <button class="sessao-btn-sair" @click="sair">Sair da Sessão</button>
      </template>

    </div>

  </div>
</template>

<script src="./SessaoOnline.js"></script>
<style src="./SessaoOnline.css"></style>