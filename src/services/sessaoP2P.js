import { ref, reactive } from "vue"
import { Peer } from "peerjs"

// Estado reativo da sessão compartilhada
export const sessaoEstado = reactive({
  conectado: false,
  conectando: false,
  erro: null,
  papel: null,
  codigoSessao: "",
  nomeUsuario: localStorage.getItem("noite-eterna-usuario") || "Jogador",
  jogadores: [],
  fichasRemotas: {},
  fichaVinculadaId: null
})

// Marca qual ficha local (janela aberta) deve ser reenviada ao Mestre sempre que mudar
export function definirFichaVinculada(id) {
  sessaoEstado.fichaVinculadaId = id
}

let peer = null
let conexoes = [] // array de conns para o mestre
let connMestre = null // conn para o mestre quando for jogador
let intervalPing = null

function gerarCodigoSala() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let res = ""
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return res
}

function formatarPeerId(codigo) {
  const limpo = (codigo || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  return `ne-vtt-${limpo}`
}

function salvarUsuario(nome) {
  sessaoEstado.nomeUsuario = nome
  try {
    localStorage.setItem("noite-eterna-usuario", nome)
  } catch (e) {
    console.warn("Não foi possível salvar nome no localStorage", e)
  }
}

// ==========================================
// MESTRE: CRIAR SESSÃO
// ==========================================
export async function criarSessao(nomeMestre, codigoPersonalizado = "") {
  desconectarSessao()
  salvarUsuario(nomeMestre || "Mestre")

  sessaoEstado.conectando = true
  sessaoEstado.erro = null

  const codigo = codigoPersonalizado.trim().toUpperCase() || gerarCodigoSala()
  sessaoEstado.codigoSessao = codigo
  sessaoEstado.papel = "mestre"

  const peerId = formatarPeerId(codigo)

  try {
    peer = new Peer(peerId, {
      debug: 1
    })

    peer.on("open", (id) => {
      sessaoEstado.conectado = true
      sessaoEstado.conectando = false
      sessaoEstado.jogadores = [
        {
          id: peer.id,
          nome: sessaoEstado.nomeUsuario,
          papel: "mestre",
          online: true,
          fichaNome: null
        }
      ]
    })

    peer.on("connection", (conn) => {
      configurarConexaoMestreComJogador(conn)
    })

    peer.on("error", (err) => {
      console.error("Erro PeerJS (Mestre):", err)
      sessaoEstado.conectando = false
      if (err.type === "unavailable-id") {
        sessaoEstado.erro = "Código de sessão já em uso. Tente outro código."
      } else {
        sessaoEstado.erro = `Erro na conexão: ${err.message || err.type}`
      }
    })

    peer.on("disconnected", () => {
      // Tenta reconectar se caiu do servidor signaling
      if (peer && !peer.destroyed) {
        peer.reconnect()
      }
    })

  } catch (err) {
    sessaoEstado.conectando = false
    sessaoEstado.erro = err.message || "Falha ao iniciar servidor da sessão."
  }
}

function configurarConexaoMestreComJogador(conn) {
  conn.on("open", () => {
    conexoes.push(conn)

    // Envia confirmação de boas-vindas com a lista atual
    conn.send({
      tipo: "BOAS_VINDAS",
      codigo: sessaoEstado.codigoSessao,
      jogadores: sessaoEstado.jogadores
    })
  })

  conn.on("data", (data) => {
    tratarMensagemNoMestre(conn, data)
  })

  conn.on("close", () => {
    removerJogadorConexao(conn.peer)
  })

  conn.on("error", (err) => {
    console.warn("Erro na conexão com player:", err)
    removerJogadorConexao(conn.peer)
  })
}

function tratarMensagemNoMestre(conn, msg) {
  if (!msg || typeof msg !== "object") return

  switch (msg.tipo) {
    case "IDENTIFICAR": {
      const idx = sessaoEstado.jogadores.findIndex(j => j.id === conn.peer)
      const playerInfo = {
        id: conn.peer,
        nome: msg.nome || "Jogador Conectado",
        papel: "jogador",
        online: true,
        fichaId: msg.fichaId || null,
        fichaNome: msg.fichaNome || null,
        fichaTipo: msg.fichaTipo || "personagem",
        fichaImagem: msg.fichaImagem || null
      }

      if (idx >= 0) {
        sessaoEstado.jogadores[idx] = { ...sessaoEstado.jogadores[idx], ...playerInfo }
      } else {
        sessaoEstado.jogadores.push(playerInfo)
      }

      // Notifica todos com a lista atualizada
      broadcastParaJogadores({
        tipo: "LISTA_JOGADORES",
        jogadores: sessaoEstado.jogadores
      })

      // Se o jogador se identificou com uma ficha, solicita o snapshot completo
      if (msg.fichaId) {
        try {
          conn.send({
            tipo: "SOLICITAR_SYNC_FICHA",
            fichaId: msg.fichaId
          })
        } catch (e) { }
      }
      break
    }

    case "SYNC_FICHA": {
      // Player enviou ou atualizou a ficha em tempo real
      if (msg.ficha && msg.ficha.id) {
        sessaoEstado.fichasRemotas[msg.ficha.id] = {
          ...msg.ficha,
          dono: msg.nomeUsuario || "Jogador",
          donoId: conn.peer,
          atualizadoEm: Date.now()
        }

        // Atualiza a ficha vinculada na lista de jogadores
        const p = sessaoEstado.jogadores.find(j => j.id === conn.peer)
        if (p) {
          p.fichaId = msg.ficha.id
          p.fichaNome = msg.ficha.nome
          p.fichaTipo = msg.ficha.tipo
          p.fichaImagem = msg.ficha.imagem
        }

        // Dispara evento global para componentes atualizarem
        window.dispatchEvent(new CustomEvent("sessao-ficha-recebida", {
          detail: sessaoEstado.fichasRemotas[msg.ficha.id]
        }))

        // Notifica todos com a lista atualizada
        broadcastParaJogadores({
          tipo: "LISTA_JOGADORES",
          jogadores: sessaoEstado.jogadores
        })
      }
      break
    }
  }
}

function broadcastParaJogadores(payload) {
  conexoes.forEach(conn => {
    if (conn.open) {
      try {
        conn.send(payload)
      } catch (e) {
        console.warn("Erro ao enviar broadcast:", e)
      }
    }
  })
}

function removerJogadorConexao(peerId) {
  conexoes = conexoes.filter(c => c.peer !== peerId)
  const j = sessaoEstado.jogadores.find(p => p.id === peerId)
  if (j) {
    j.online = false
  }
  sessaoEstado.jogadores = sessaoEstado.jogadores.filter(p => p.online || p.papel === "mestre")

  broadcastParaJogadores({
    tipo: "LISTA_JOGADORES",
    jogadores: sessaoEstado.jogadores
  })
}

// ==========================================
// JOGADOR: ENTRAR EM SESSÃO
// ==========================================
export async function entrarSessao(nomeJogador, codigoSessao, fichaAtual = null) {
  desconectarSessao()
  salvarUsuario(nomeJogador || "Jogador")

  const codigo = (codigoSessao || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!codigo) {
    sessaoEstado.erro = "Código de sessão inválido."
    return
  }

  sessaoEstado.conectando = true
  sessaoEstado.erro = null
  sessaoEstado.codigoSessao = codigo
  sessaoEstado.papel = "jogador"

  const peerMestreId = formatarPeerId(codigo)

  try {
    peer = new Peer({
      debug: 1
    })

    peer.on("open", () => {
      connMestre = peer.connect(peerMestreId, {
        reliable: true
      })

      connMestre.on("open", () => {
        sessaoEstado.conectado = true
        sessaoEstado.conectando = false

        // Envia identificação
        connMestre.send({
          tipo: "IDENTIFICAR",
          nome: sessaoEstado.nomeUsuario,
          fichaId: fichaAtual?.id || null,
          fichaNome: fichaAtual?.nome || null,
          fichaTipo: fichaAtual?.tipo || "personagem",
          fichaImagem: fichaAtual?.imagem || null
        })

        // Se o jogador já tiver uma ficha ativa, envia o sync completo
        if (fichaAtual) {
          enviarSyncFichaParaMestre(fichaAtual)
        }
      })

      connMestre.on("data", (data) => {
        tratarMensagemNoJogador(data)
      })

      connMestre.on("close", () => {
        sessaoEstado.conectado = false
        sessaoEstado.erro = "Conexão com o Mestre encerrada."
      })

      connMestre.on("error", (err) => {
        console.error("Erro na conexão com Mestre:", err)
        sessaoEstado.conectado = false
        sessaoEstado.erro = "Não foi possível conectar ao Mestre da sessão."
      })
    })

    peer.on("error", (err) => {
      console.error("Erro PeerJS (Jogador):", err)
      sessaoEstado.conectando = false
      if (err.type === "peer-unavailable") {
        sessaoEstado.erro = "Sessão não encontrada. Verifique se o Mestre já criou a sala com este código."
      } else {
        sessaoEstado.erro = `Erro na conexão: ${err.message || err.type}`
      }
    })

  } catch (err) {
    sessaoEstado.conectando = false
    sessaoEstado.erro = err.message || "Falha ao entrar na sessão."
  }
}

function tratarMensagemNoJogador(msg) {
  if (!msg || typeof msg !== "object") return

  switch (msg.tipo) {
    case "BOAS_VINDAS":
    case "LISTA_JOGADORES": {
      if (Array.isArray(msg.jogadores)) {
        sessaoEstado.jogadores = msg.jogadores
      }
      break
    }

    case "SOLICITAR_SYNC_FICHA": {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sessao-solicitar-sync-ficha", {
          detail: msg.fichaId || null
        }))
      }
      break
    }
  }
}

// Mestre solicita que o jogador reenvie o snapshot da ficha
export function solicitarSyncFicha(fichaId = null) {
  if (sessaoEstado.papel === "mestre") {
    conexoes.forEach(conn => {
      if (conn.open) {
        try {
          conn.send({
            tipo: "SOLICITAR_SYNC_FICHA",
            fichaId
          })
        } catch (e) {
          console.warn("Erro ao solicitar sync:", e)
        }
      }
    })
  }
}

// Envia ficha do jogador para o mestre em tempo real
export function enviarSyncFichaParaMestre(ficha) {
  if (!ficha) return
  if (sessaoEstado.papel === "jogador" && connMestre && connMestre.open) {
    connMestre.send({
      tipo: "SYNC_FICHA",
      nomeUsuario: sessaoEstado.nomeUsuario,
      ficha: {
        id: ficha.id,
        tipo: ficha.tipo || "personagem",
        nome: ficha.nome || "Sem Nome",
        imagem: ficha.imagem || null,
        dados: ficha.dados || null
      }
    })
  }
}

// Desconectar tudo
export function desconectarSessao() {
  if (connMestre) {
    try { connMestre.close() } catch (e) { }
    connMestre = null
  }
  conexoes.forEach(c => {
    try { c.close() } catch (e) { }
  })
  conexoes = []

  if (peer) {
    try { peer.destroy() } catch (e) { }
    peer = null
  }

  sessaoEstado.conectado = false
  sessaoEstado.conectando = false
  sessaoEstado.papel = null
  sessaoEstado.codigoSessao = ""
  sessaoEstado.jogadores = []
  sessaoEstado.erro = null
  sessaoEstado.fichaVinculadaId = null
}
