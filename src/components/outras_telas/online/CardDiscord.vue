<template>
  <div class="card-discord-overlay">
    <section class="card-discord-painel" role="dialog" aria-modal="true" aria-labelledby="card-discord-titulo">
      <header class="card-discord-barra">
        <span id="card-discord-titulo">Configurar card do Discord</span>
        <button type="button" class="card-discord-fechar" @click="$emit('fechar')" title="Fechar">×</button>
      </header>

      <div class="card-discord-corpo">
        <p class="card-discord-ajuda">
          O card será enviado antes da mensagem com o link público da ficha.
        </p>
        <label class="card-discord-label">
          Título
          <input v-model="card.titulo" class="card-discord-input" maxlength="256" placeholder="A ficha está disponível" />
        </label>
        <label class="card-discord-label">
          Descrição
          <textarea v-model="card.descricao" class="card-discord-input card-discord-textarea" maxlength="4000"
            placeholder="Escreva uma mensagem para os jogadores." />
        </label>
        <label class="card-discord-label">
          Imagem do card
          <input class="card-discord-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp"
            @change="selecionarImagem" />
          <small v-if="nomeImagem">{{ nomeImagem }}</small>
        </label>

        <label class="card-discord-label">
          Cor do card
          <input v-model="card.cor" class="card-discord-cor" type="color" />
        </label>

        <div class="card-discord-preview">
          <div class="card-discord-preview-acento" :style="{ backgroundColor: card.cor }"></div>
          <img v-if="card.imagem" :src="card.imagem" alt="" />
          <strong>{{ card.titulo || "Título do card" }}</strong>
          <p>{{ card.descricao || "Descrição do card" }}</p>
        </div>

        <p v-if="mensagem" class="card-discord-mensagem" :class="{ erro: erro }">{{ mensagem }}</p>
        <div class="card-discord-acoes">
          <button type="button" class="card-discord-cancelar" @click="$emit('fechar')">Cancelar</button>
          <button type="button" class="card-discord-enviar" :disabled="salvando || enviando" @click="enviar">
            {{ enviando ? "Enviando..." : "Enviar card" }}
          </button>
          <button type="button" class="card-discord-salvar" :disabled="salvando || enviando" @click="salvar">
            {{ salvando ? "Salvando..." : "Salvar card" }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue"

const emit = defineEmits(["fechar"])
const CHAVE = "noite-eterna-card-discord"
const API_LOCAL = "http://127.0.0.1:3001"
const API_CONFIGURADA = (import.meta.env.VITE_BOT_API_URL || "").replace(/\/+$/, "")
const CHAVE_API_BOT = import.meta.env.VITE_BOT_API_KEY || ""
const padrao = { titulo: "A ficha está disponível", descricao: "A ficha da sessão está pronta para ser acessada.", imagem: "", imagemNome: "", cor: "#6d4aa2" }
let salvo = null
try {
  salvo = JSON.parse(localStorage.getItem(CHAVE) || "null")
} catch {
  localStorage.removeItem(CHAVE)
}
if (salvo?.imagem?.startsWith?.("data:image/")) {
  salvo = { ...salvo, imagem: "" }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(salvo))
  } catch {
    localStorage.removeItem(CHAVE)
  }
}
const card = reactive({ ...padrao, ...(salvo && typeof salvo === "object" ? salvo : {}) })
const salvando = ref(false)
const enviando = ref(false)
const mensagem = ref("")
const erro = ref(false)
const nomeImagem = ref(card.imagemNome || "")

function obterRequisicao() {
  const usandoServidorLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  const base = API_CONFIGURADA || (usandoServidorLocal ? API_LOCAL : "")
  const headers = { "Content-Type": "application/json" }
  if (CHAVE_API_BOT) headers.Authorization = `Bearer ${CHAVE_API_BOT}`
  return { base, headers }
}

function selecionarImagem(evento) {
  const arquivo = evento.target.files?.[0]
  if (!arquivo) return
  if (!arquivo.type.startsWith("image/")) {
    erro.value = true
    mensagem.value = "Selecione um arquivo de imagem."
    evento.target.value = ""
    return
  }
  if (arquivo.size > 8 * 1024 * 1024) {
    erro.value = true
    mensagem.value = "A imagem precisa ter no máximo 8 MB."
    evento.target.value = ""
    return
  }
  const leitor = new FileReader()
  leitor.onload = () => {
    card.imagem = String(leitor.result || "")
    card.imagemNome = arquivo.name
    nomeImagem.value = arquivo.name
    erro.value = false
    mensagem.value = ""
  }
  leitor.onerror = () => {
    erro.value = true
    mensagem.value = "Não foi possível ler a imagem."
  }
  leitor.readAsDataURL(arquivo)
}

async function salvar(enviarAgora = false) {
  if (card.imagem && !/^https?:\/\//i.test(card.imagem) && !/^data:image\//i.test(card.imagem)) {
    erro.value = true
    mensagem.value = "A imagem precisa começar com http:// ou https://."
    return
  }
  salvando.value = !enviarAgora
  enviando.value = enviarAgora
  erro.value = false
  mensagem.value = ""
  const dados = { ...card }
  try {
    const dadosLocais = {
      titulo: dados.titulo,
      descricao: dados.descricao,
      imagemNome: dados.imagemNome,
      cor: dados.cor,
      imagem: /^https?:\/\//i.test(dados.imagem) ? dados.imagem : ""
    }
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dadosLocais))
    } catch {
      localStorage.removeItem(CHAVE)
    }
    const { base, headers } = obterRequisicao()
    const resposta = await fetch(`${base}/api/discord/card`, {
      method: "POST",
      headers,
      body: JSON.stringify(dados)
    })
    const respostaDados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) throw new Error(respostaDados.erro || "O bot recusou a configuração do card.")
    if (enviarAgora) {
      const envio = await fetch(`${base}/api/discord/card/send`, {
        method: "POST",
        headers
      })
      const envioDados = await envio.json().catch(() => ({}))
      if (!envio.ok) throw new Error(envioDados.erro || "O bot recusou o envio do card.")
      mensagem.value = "Card enviado para o Discord."
      return
    }
    mensagem.value = "Card salvo. Ele será usado na próxima publicação."
    setTimeout(() => emit("fechar"), 900)
  } catch (e) {
    erro.value = true
    mensagem.value = e.message || "Não foi possível salvar o card no bot."
  } finally {
    salvando.value = false
    enviando.value = false
  }
}

function enviar() {
  salvar(true)
}
</script>

<style scoped>
.card-discord-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(0, 0, 0, .65); display: flex; align-items: center; justify-content: center; padding: 16px; }
.card-discord-painel { width: min(430px, 100%); max-height: 90vh; overflow-y: auto; background: #111; border: 1px solid #333; box-shadow: 0 20px 60px #000; color: #ddd; font-family: "Aubrey", system-ui; }
.card-discord-barra { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #2a2a2a; color: #d9a441; font-size: 12px; text-transform: uppercase; letter-spacing: .6px; }
.card-discord-fechar { background: transparent; border: 1px solid #333; color: #888; font-size: 16px; cursor: pointer; }
.card-discord-corpo { display: flex; flex-direction: column; gap: 10px; padding: 14px; }
.card-discord-ajuda { margin: 0; color: #999; font-size: 11px; line-height: 1.4; }
.card-discord-label { display: flex; flex-direction: column; gap: 4px; color: #999; font-size: 10px; text-transform: uppercase; }
.card-discord-input { padding: 8px; background: #0e0e0e; border: 1px solid #333; color: #eee; font: inherit; font-size: 12px; }
.card-discord-label small { color: #8fd18f; text-transform: none; }
.card-discord-textarea { min-height: 72px; resize: vertical; }
.card-discord-cor { width: 48px; height: 28px; padding: 0; border: 1px solid #333; background: #0e0e0e; cursor: pointer; }
.card-discord-preview { position: relative; padding: 12px 12px 12px 16px; background: #1b1b1b; border: 1px solid #333; overflow: hidden; }
.card-discord-preview-acento { position: absolute; inset: 0 auto 0 0; width: 4px; }
.card-discord-preview img { display: block; width: 100%; max-height: 110px; object-fit: cover; margin-bottom: 8px; }
.card-discord-preview strong { display: block; color: #fff; font-size: 13px; }
.card-discord-preview p { margin: 5px 0 0; color: #aaa; font-size: 11px; white-space: pre-wrap; }
.card-discord-mensagem { margin: 0; color: #8fd18f; font-size: 11px; }
.card-discord-mensagem.erro { color: #e09a9a; }
.card-discord-acoes { display: flex; justify-content: flex-end; gap: 8px; }
.card-discord-cancelar, .card-discord-salvar { padding: 8px 12px; font: inherit; font-size: 11px; cursor: pointer; }
.card-discord-cancelar { color: #aaa; background: transparent; border: 1px solid #444; }
.card-discord-salvar { color: #111; background: #d9a441; border: 1px solid #d9a441; }
.card-discord-enviar { color: #111; background: #8fc1a9; border: 1px solid #8fc1a9; }
.card-discord-salvar:disabled { opacity: .5; cursor: wait; }
</style>
