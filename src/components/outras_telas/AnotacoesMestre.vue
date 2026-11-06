<template>
  <aside class="anotacoes-painel" @mousedown.stop>
    <header class="anotacoes-cabecalho">
      <div>
        <span class="anotacoes-legenda">{{ sessaoConectada ? "Diário da campanha" : "Anotações" }}</span>
        <h1>Anotações</h1>
      </div>
      <button class="anotacoes-fechar" title="fechar" @click="emit('fechar')">×</button>
    </header>

    <div class="anotacoes-acoes">
      <button @click="criarDocumento">+ Novo documento</button>
      <button v-if="!sessaoConectada" title="importar todos os documentos salvos no banco local"
        @click="emit('importar-banco')">
        Importar banco
      </button>
    </div>

    <div class="anotacoes-layout">
      <nav class="anotacoes-lista" aria-label="Documentos">
        <input v-model="busca" class="anotacoes-busca" placeholder="Buscar documento..." />
        <div v-for="grupo in grupos" :key="grupo.tipo" class="anotacoes-grupo">
          <h2>{{ grupo.rotulo }}</h2>
          <button v-for="documento in grupo.documentos" :key="documento.id" class="anotacao-item"
            :class="{ ativo: documento.id === documentoAtivo?.id }" @click="selecionar(documento.id)">
            <strong>{{ documento.titulo || "Sem título" }}</strong>
            <small>{{ documento.autor ? `${documento.autor} · ` : "" }}{{ resumoDocumento(documento) }}</small>
          </button>
        </div>
        <p v-if="!documentosFiltrados.length" class="anotacoes-vazio">Nenhum documento encontrado.</p>
      </nav>

      <section v-if="documentoAtivo" class="anotacoes-editor">
        <div class="editor-meta">
          <select v-model="documentoAtivo.tipo" aria-label="Tipo do documento" @change="salvar">
            <option value="local">Local</option>
            <option value="npc">NPC</option>
            <option value="objeto">Objeto</option>
            <option value="evento">Evento</option>
            <option value="outro">Outro</option>
          </select>
          <button class="editor-remover" title="remover documento" @click="removerDocumento">Excluir</button>
        </div>
        <input :value="documentoAtivo.titulo || ''" class="editor-titulo" placeholder="Título do documento"
          @input="atualizarTitulo" />
        <div class="documento-visualizacao">
          <div class="postagens">
            <article v-for="postagem in postagensAtivas" :key="postagem.id" class="postagem">
              <header>
                <strong>{{ postagem.autor || "Jogador" }}</strong>
                <span class="postagem-meta">
                  <time>{{ formatarData(postagem.criadoEm) }}</time>
                  <button type="button" class="postagem-excluir" title="Excluir postagem"
                    @click="removerPostagem(postagem.id)">×</button>
                </span>
              </header>
              <p>{{ postagem.conteudo }}</p>
              <img v-if="postagem.imagem" class="postagem-imagem" :src="postagem.imagem.dataUrl"
                :alt="postagem.imagem.nome" />
            </article>
            <p v-if="!postagensAtivas.length" class="postagens-vazio">Nenhuma postagem ainda.</p>
          </div>
          <form class="nova-postagem" @submit.prevent="adicionarPostagem">
            <div class="nova-postagem-campo">
              <textarea ref="textareaPostagem" v-model="textoPostagem" rows="1"
                placeholder="Escreva uma postagem para a campanha..." @input="ajustarAlturaPostagem"></textarea>
              <div class="nova-postagem-acoes">
                <input id="seletor-imagem-postagem" type="file" accept="image/*" hidden
                  @change="selecionarImagemPostagem" />
                <label class="botao-imagem" for="seletor-imagem-postagem">+ Imagem</label>
                <span v-if="imagemPostagem">{{ imagemPostagem.nome }}</span>
                <button type="submit">Publicar postagem</button>
              </div>
              <img v-if="imagemPostagem" class="nova-postagem-previa" :src="imagemPostagem.dataUrl"
                :alt="`Prévia de ${imagemPostagem.nome}`" />
            </div>
          </form>
        </div>
      </section>
      <section v-else class="anotacoes-sem-selecao">
        <strong>Crie sua primeira anotação</strong>
        <span>Organize locais, NPCs, objetos e eventos da sessão.</span>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue"

const props = defineProps({
  documentos: { type: Array, default: () => [] },
  nomeUsuario: { type: String, default: "Jogador" },
  sessaoConectada: { type: Boolean, default: false }
})

const emit = defineEmits(["fechar", "atualizar", "importar-banco"])
const busca = ref("")
const documentoSelecionado = ref(null)
const textoPostagem = ref("")
const textareaPostagem = ref(null)
const imagemPostagem = ref(null)
let salvamentoPendente = null

const tipos = [
  { tipo: "local", rotulo: "Locais" },
  { tipo: "npc", rotulo: "NPCs" },
  { tipo: "objeto", rotulo: "Objetos" },
  { tipo: "evento", rotulo: "Eventos" },
  { tipo: "outro", rotulo: "Outros" }
]

const documentosFiltrados = computed(() => {
  const termo = busca.value.trim().toLocaleLowerCase()
  return props.documentos.filter(documento => !termo
    || `${documento.titulo} ${documento.conteudo} ${documento.postagens?.map(postagem => postagem.conteudo).join(" ") || ""}`
      .toLocaleLowerCase().includes(termo))
})

const grupos = computed(() => tipos.map(grupo => ({
  ...grupo,
  documentos: documentosFiltrados.value.filter(documento => documento.tipo === grupo.tipo)
})).filter(grupo => grupo.documentos.length))

const documentoAtivo = computed(() => props.documentos.find(documento => documento.id === documentoSelecionado.value))
const postagensAtivas = computed(() => {
  const documento = documentoAtivo.value
  if (!documento) return []
  if (Array.isArray(documento.postagens)) return documento.postagens
  if (documento.conteudo?.trim()) {
    return [{
      id: `${documento.id}-legado`,
      autor: documento.autor || "Registro anterior",
      conteudo: documento.conteudo,
      criadoEm: documento.atualizadoEm
    }]
  }
  return []
})
watch(() => props.documentos, documentos => {
  if (!documentoSelecionado.value && documentos.length) documentoSelecionado.value = documentos[0].id
  if (documentoSelecionado.value && !documentos.some(documento => documento.id === documentoSelecionado.value)) {
    documentoSelecionado.value = documentos[0]?.id || null
  }
}, { immediate: true })

function atualizarTitulo(event) {
  if (!documentoAtivo.value) return
  documentoAtivo.value.titulo = event.target.value
  salvar()
}

onBeforeUnmount(() => {
  clearTimeout(salvamentoPendente)
  if (documentoAtivo.value) emit("atualizar", { ...documentoAtivo.value })
})

function selecionar(id) {
  documentoSelecionado.value = id
}

function criarDocumento() {
  const documento = {
    id: gerarId(),
    titulo: "Novo documento",
    tipo: "outro",
    conteudo: "",
    imagens: [],
    autor: props.nomeUsuario,
    postagens: [],
    atualizadoEm: new Date().toISOString()
  }

  emit("atualizar", documento)
  documentoSelecionado.value = documento.id
}

function selecionarImagemPostagem(event) {
  const arquivo = event.target.files?.[0]
  if (!arquivo) return
  if (!arquivo.type.startsWith("image/")) {
    window.alert("Selecione um arquivo de imagem.")
    event.target.value = ""
    return
  }
  const leitor = new FileReader()
  leitor.onload = () => {
    if (typeof leitor.result !== "string" || !leitor.result.startsWith("data:image/")) {
      window.alert("Não foi possível carregar esta imagem.")
      return
    }
    imagemPostagem.value = { nome: arquivo.name, dataUrl: leitor.result }
  }
  leitor.onerror = () => window.alert("Não foi possível ler esta imagem.")
  leitor.readAsDataURL(arquivo)
  event.target.value = ""
}

function adicionarPostagem() {
  const conteudo = textoPostagem.value.trim()
  if ((!conteudo && !imagemPostagem.value) || !documentoAtivo.value) return
  if (!Array.isArray(documentoAtivo.value.postagens)) {
    documentoAtivo.value.postagens = postagensAtivas.value.map(postagem => ({ ...postagem }))
  }
  documentoAtivo.value.postagens.push({
    id: gerarId(),
    autor: props.nomeUsuario,
    conteudo,
    criadoEm: new Date().toISOString(),
    imagem: imagemPostagem.value
  })
  documentoAtivo.value.conteudo = ""
  textoPostagem.value = ""
  imagemPostagem.value = null
  ajustarAlturaPostagem()
  salvar()
}

function removerPostagem(postagemId) {
  if (!documentoAtivo.value || !Array.isArray(documentoAtivo.value.postagens)) return
  if (!window.confirm("Excluir esta postagem?")) return
  documentoAtivo.value.postagens = documentoAtivo.value.postagens
    .filter(postagem => postagem.id !== postagemId)
  salvar()
}

function ajustarAlturaPostagem() {
  const campo = textareaPostagem.value
  if (!campo) return
  requestAnimationFrame(() => {
    campo.style.height = "0px"
    campo.style.height = `${campo.scrollHeight}px`
  })
}

function salvar() {
  if (!documentoAtivo.value) return
  documentoAtivo.value.atualizadoEm = new Date().toISOString()
  clearTimeout(salvamentoPendente)
  salvamentoPendente = setTimeout(() => emit("atualizar", { ...documentoAtivo.value }), 250)
}

function removerDocumento() {
  if (!documentoAtivo.value) return
  if (!window.confirm(`Excluir "${documentoAtivo.value.titulo || "Sem título"}"?`)) return
  emit("atualizar", { id: documentoAtivo.value.id, removido: true })
}

function resumoDocumento(documento) {
  const texto = Array.isArray(documento.postagens)
    ? documento.postagens.at(-1)?.conteudo || "Imagem anexada"
    : documento.conteudo
  return String(texto || "").replace(/\s+/g, " ").trim().slice(0, 64) || "Sem postagens"
}

function formatarData(data) {
  if (!data) return ""
  return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

function gerarId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
</script>

<style scoped>
.anotacoes-painel {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 450;
  width: min(620px, 42vw);
  min-width: 430px;
  display: flex;
  flex-direction: column;
  background: #101010;
  border-left: 1px solid #3b3b3b;
  color: #ddd;
  box-shadow: -18px 0 55px rgba(0, 0, 0, 0.55);
  font-family: "Aubrey", system-ui;
}
.anotacoes-cabecalho, .anotacoes-acoes, .editor-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.anotacoes-cabecalho {
  min-height: 60px;
  padding: 10px 14px;
  border-bottom: 1px solid #2d2d2d;
  background: #181818;
}
.anotacoes-legenda { color: #d9a441; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
h1 { margin: 3px 0 0; font-size: 20px; font-weight: 400; }
.anotacoes-fechar, .editor-remover {
  border: 1px solid #333; background: transparent; color: #999; cursor: pointer;
}
.anotacoes-fechar { font-size: 22px; width: 28px; height: 28px; }
.anotacoes-fechar:hover, .editor-remover:hover { color: #e7b54d; border-color: #e7b54d; }
.anotacoes-acoes { gap: 7px; padding: 9px; border-bottom: 1px solid #292929; }
.anotacoes-acoes button, .editor-ajuda button {
  border: 1px solid #3a3a3a; background: #1b1b1b; color: #bbb; padding: 6px 8px; cursor: pointer;
  font-family: inherit; font-size: 12px;
}
.anotacoes-acoes button:first-child { color: #e7b54d; border-color: #72551f; }
.anotacoes-layout { min-height: 0; flex: 1; display: flex; }
.anotacoes-lista { width: 190px; flex: 0 0 190px; overflow-y: auto; padding: 9px; border-right: 1px solid #2d2d2d; }
.anotacoes-busca { width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #333; background: #181818; color: #ddd; font-size: 13px; }
.anotacoes-grupo h2 { margin: 10px 3px 4px; color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
.anotacao-item { width: 100%; display: block; padding: 7px; margin-bottom: 3px; border: 1px solid transparent; background: transparent; color: #aaa; text-align: left; cursor: pointer; font-family: inherit; }
.anotacao-item:hover, .anotacao-item.ativo { background: #1d1d1d; border-color: #4a3b20; color: #e7b54d; }
.anotacao-item strong, .anotacao-item small { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.anotacao-item strong { font-size: 13px; }.anotacao-item small { margin-top: 4px; color: #888; font-size: 11px; }
.anotacoes-editor { min-width: 0; flex: 1; display: flex; flex-direction: column; padding: 12px; }
.editor-meta { gap: 8px; }.editor-meta select { flex: 1; }
.editor-meta select, .editor-remover { padding: 7px; border: 1px solid #333; background: #181818; color: #bbb; font-family: inherit; font-size: 12px; }
.editor-titulo { width: 100%; margin: 12px 0 8px; padding: 8px 0; border: 0; border-bottom: 1px solid #383838; background: transparent; color: #d9a441; font: 20px "Aubrey", system-ui; outline: none; }
.editor-vinculo { display: flex; gap: 6px; margin-bottom: 8px; }
.editor-vinculo select, .editor-vinculo button, .editor-imagens button { min-width: 0; padding: 7px; border: 1px solid #333; background: #181818; color: #bbb; cursor: pointer; font-family: inherit; font-size: 12px; }
.editor-vinculo select { flex: 1; }
.editor-vinculo button { color: #d9a441; border-color: #72551f; }
.editor-formatacao { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; }
.editor-formatacao label { color: #888; font: 12px system-ui; }
.editor-formatacao select, .editor-formatacao button { padding: 5px 7px; border: 1px solid #333; background: #181818; color: #bbb; cursor: pointer; font-family: inherit; font-size: 12px; }
.editor-formatacao button:hover { color: #e7b54d; border-color: #806126; }
.editor-conteudo-wrap { position: relative; flex: 1; min-height: 180px; overflow: hidden; border: 1px solid #2b2b2b; background: #151515; }
.editor-conteudo { width: 100%; height: 100%; min-height: 180px; margin: 0; padding: 10px; outline: none; color: #d5d5d5; line-height: 1.5; font: 13px system-ui; white-space: pre-wrap; overflow: auto; overflow-wrap: break-word; }
.editor-conteudo:empty::before { content: attr(data-placeholder); color: #777; pointer-events: none; }
.editor-conteudo :deep(.link-anotacao) { color: #e7b54d; cursor: pointer; }
.editor-conteudo-wrap:focus-within { border-color: #806126; }
.editor-imagens { display: flex; align-items: center; gap: 8px; padding: 7px 0; color: #888; font: 12px system-ui; }
.editor-imagens button { color: #d9a441; }
.editor-visualizacao { max-height: 180px; overflow: auto; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; padding: 8px; border: 1px solid #292929; background: #121212; }
.editor-visualizacao img { display: block; max-width: 100%; max-height: 150px; margin: 6px 0; object-fit: contain; }
.documento-visualizacao { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; padding: 12px 4px; color: #d5d5d5; font: 16px/1.55 system-ui; }
.postagens { min-height: 0; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.postagem { width: fit-content; max-width: 100%; align-self: flex-start; padding: 10px 12px; border: 1px solid #2d2d2d; background: #151515; }
.postagem header { display: flex; justify-content: space-between; gap: 10px; color: #d9a441; font-size: 12px; }
.postagem-meta { display: flex; align-items: center; gap: 6px; }
.postagem time { color: #777; font-size: 11px; }
.postagem-excluir { padding: 0 3px; border: 0; background: transparent; color: #777; cursor: pointer; font-size: 16px; line-height: 1; }
.postagem-excluir:hover { color: #b94a48; }
.postagem p { margin: 7px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.postagem-imagem { display: block; width: auto; height: auto; max-width: 100%; margin-top: 9px; }
.postagens-vazio { color: #777; }
.nova-postagem { flex-shrink: 0; margin-top: 12px; }
.nova-postagem-campo { display: flex; flex-direction: column; min-height: 100px; border: 1px solid #333; background: #181818; }
.nova-postagem textarea { display: block; width: 100%; height: 76px; min-height: 0; padding: 8px; resize: none; overflow: hidden; border: 0; outline: none; background: transparent; color: #ddd; font: 14px system-ui; }
.nova-postagem-campo:focus-within { border-color: #806126; }
.nova-postagem-acoes { display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding: 6px; border-top: 1px solid #292929; }
.nova-postagem-acoes span { max-width: 120px; overflow: hidden; color: #888; font: 10px system-ui; text-overflow: ellipsis; white-space: nowrap; }
.nova-postagem button, .nova-postagem .botao-imagem { padding: 5px 7px; border: 1px solid #72551f; background: #211b10; color: #d9a441; cursor: pointer; font-family: inherit; font-size: 10px; }
.nova-postagem-previa { display: block; max-width: calc(100% - 12px); max-height: 120px; margin: 0 6px 6px; object-fit: contain; }
.editor-ajuda { min-height: 34px; padding-top: 8px; color: #888; font: 12px system-ui; }
.editor-ajuda button { margin-left: 4px; padding: 3px 6px; color: #d9a441; }.editor-ajuda button.indisponivel { color: #777; }
.anotacoes-sem-selecao, .anotacoes-vazio { color: #777; padding: 20px; font: 12px system-ui; }
.anotacoes-sem-selecao { display: flex; flex-direction: column; gap: 8px; margin: auto; text-align: center; }
@media (max-width: 700px) { .anotacoes-painel { width: 100vw; min-width: 0; } }
</style>
