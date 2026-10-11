import fs from "node:fs"
import crypto from "node:crypto"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import { WebSocket, WebSocketServer } from "ws"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDirectory = path.resolve(__dirname, "..")
const distDirectory = path.join(rootDirectory, "dist")
const botPort = Number(process.env.PORT || 3001)
const sitePort = Number(process.env.SITE_PORT || 4173)
const siteAccessPassword = process.env.SITE_ACCESS_PASSWORD || ""
const accessCookieName = "noite_eterna_access"
const relayPath = "/__noite_eterna_ws"
const accessToken = siteAccessPassword
  ? crypto.createHash("sha256").update(siteAccessPassword).digest("hex")
  : ""

if (!fs.existsSync(path.join(distDirectory, "index.html"))) {
  console.error("A pasta dist não existe. Execute npm run build antes de iniciar o site.")
  process.exit(1)
}

const app = express()
app.use(express.urlencoded({ extended: false }))

function temAcesso(request) {
  if (!siteAccessPassword) return false
  const cookies = request.headers.cookie || ""
  const cookie = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(`${accessCookieName}=`))
  let candidate = ""
  if (cookie) {
    try {
      candidate = decodeURIComponent(cookie.slice(accessCookieName.length + 1))
    } catch {
      return false
    }

  }
  const expected = Buffer.from(accessToken)
  const received = Buffer.from(candidate)
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

const relayRooms = new Map()
const relayServer = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 })
const relayRecoveryMs = 45_000
const relayHeartbeat = setInterval(() => {
  relayServer.clients.forEach(socket => {
    if (socket.isAlive === false) {
      socket.terminate()
      return
    }
    socket.isAlive = false
    socket.ping()
  })
}, 20_000)
relayHeartbeat.unref()

function enviarRelay(cliente, mensagem) {
  if (cliente.socket.readyState !== WebSocket.OPEN) return
  cliente.socket.send(JSON.stringify(mensagem))
}

function codigoRelayValido(codigo) {
  return typeof codigo === "string" && /^[A-Z0-9]{1,12}$/.test(codigo)
}

function tokenRelayValido(token) {
  return typeof token === "string" && token.length >= 16 && token.length <= 128
}

function removerClienteRelay(cliente) {
  const sala = cliente.sala
  if (!sala) return

  if (cliente.papel === "mestre") {
    if (sala.mestre !== cliente) return
    sala.mestre = null
    sala.mestreToken = cliente.token
    cliente.sala = null
    setTimeout(() => {
      if (relayRooms.get(sala.codigo) !== sala || sala.mestre) return
      sala.jogadores.forEach(jogador => {
        enviarRelay(jogador, { tipo: "RELAY_ENCERRADO" })
        try { jogador.socket.close() } catch { }
      })
      relayRooms.delete(sala.codigo)
    }, relayRecoveryMs)
    return
  }

  sala.jogadores.delete(cliente.id)
  if (sala.mestre) {
    enviarRelay(sala.mestre, {
      tipo: "RELAY_DESCONEXAO",
      de: cliente.id
    })
  }
}

relayServer.on("connection", socket => {
  socket.isAlive = true
  socket.on("pong", () => {
    socket.isAlive = true
  })

  const cliente = {
    socket,
    id: null,
    papel: null,
    sala: null
  }

  socket.on("message", dados => {
    let mensagem
    try {
      mensagem = JSON.parse(dados.toString())
    } catch {
      socket.close(1003, "Mensagem inválida")
      return
    }

    if (!cliente.sala) {
      if (mensagem.tipo !== "ENTRAR_RELAY") {
        enviarRelay(cliente, { tipo: "ERRO_RELAY", codigo: "protocolo-invalido" })
        socket.close(1002, "Handshake necessário")
        return
      }

      const codigo = String(mensagem.codigo || "").trim().toUpperCase()
      const papel = mensagem.papel === "mestre" ? "mestre" : "jogador"
      const token = String(mensagem.token || "")
      if (!codigoRelayValido(codigo)) {
        enviarRelay(cliente, { tipo: "ERRO_RELAY", codigo: "codigo-invalido" })
        socket.close(1008, "Código inválido")
        return
      }
      if (!tokenRelayValido(token)) {
        enviarRelay(cliente, { tipo: "ERRO_RELAY", codigo: "identidade-invalida" })
        socket.close(1008, "Identidade inválida")
        return
      }

      let sala = relayRooms.get(codigo)
      if (papel === "mestre") {
        if (sala?.mestre) {
          if (sala.mestre.token !== token) {
            enviarRelay(cliente, { tipo: "ERRO_RELAY", codigo: "codigo-em-uso" })
            socket.close(1008, "Código em uso")
            return
          }
          sala.mestre.sala = null
          try { sala.mestre.socket.close() } catch { }
          sala.mestre = cliente
        } else if (sala) {
          if (sala.mestreToken !== token) {
            enviarRelay(cliente, { tipo: "ERRO_RELAY", codigo: "codigo-em-uso" })
            socket.close(1008, "Código em uso")
            return
          }
          sala.mestre = cliente
        } else {
          sala = { codigo, mestre: cliente, mestreToken: token, jogadores: new Map() }
          relayRooms.set(codigo, sala)
        }
        sala.mestreToken = token
        cliente.id = `ne-vtt-${codigo}`
      } else {
        if (!sala?.mestre) {
          enviarRelay(cliente, { tipo: "ERRO_RELAY", codigo: "sala-inexistente" })
          socket.close(1008, "Sala inexistente")
          return
        }
        const jogadorAnterior = [...sala.jogadores.values()]
          .find(jogador => jogador.token === token)
        if (jogadorAnterior) {
          cliente.id = jogadorAnterior.id
          jogadorAnterior.sala = null
          sala.jogadores.delete(jogadorAnterior.id)
          try { jogadorAnterior.socket.close() } catch { }
        } else {
          cliente.id = `jogador-${crypto.randomBytes(6).toString("hex")}`
        }
        sala.jogadores.set(cliente.id, cliente)
      }

      cliente.token = token
      cliente.papel = papel
      cliente.sala = sala
      enviarRelay(cliente, { tipo: "RELAY_PRONTO", id: cliente.id })
      return
    }

    const sala = cliente.sala
    if (mensagem.tipo === "DADOS" && mensagem.mensagem && typeof mensagem.mensagem === "object") {
      if (cliente.papel === "mestre") {
        const alvo = sala.jogadores.get(mensagem.para)
        if (alvo) enviarRelay(alvo, { tipo: "DADOS", mensagem: mensagem.mensagem })
      } else if (sala.mestre) {
        enviarRelay(sala.mestre, {
          tipo: "DADOS",
          de: cliente.id,
          mensagem: mensagem.mensagem
        })
      }
      return
    }

    if (mensagem.tipo === "BROADCAST" && cliente.papel === "mestre") {
      sala.jogadores.forEach(jogador => {
        enviarRelay(jogador, { tipo: "DADOS", mensagem: mensagem.mensagem })
      })
    }
  })

  socket.on("close", () => removerClienteRelay(cliente))
  socket.on("error", () => removerClienteRelay(cliente))
})

function paginaDeAcesso(mensagem = "") {
  const aviso = mensagem
    ? `<p class="acesso-erro">${mensagem}</p>`
    : ""
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Aubrey&display=swap" rel="stylesheet">
    <title>Noite Eterna</title>
    <style>
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;min-height:100%;background:#0a0a0a}
      body{overflow:hidden}
      .acesso-tela{position:relative;width:100%;height:100vh;overflow:hidden;background:#0a0a0a;color:#f4edd8;display:flex;align-items:center;justify-content:center;font-family:"Aubrey",system-ui}
      .acesso-fundo{position:absolute;inset:0;background-image:url("/fundo_noite_eterna.svg");background-size:cover;background-position:center bottom;background-repeat:no-repeat;animation:zoom-fundo 20s ease-in-out infinite alternate}
      .acesso-ruido{position:absolute;inset:0;pointer-events:none;opacity:.05;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-repeat:repeat}
      .acesso-vinheta{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.36) 100%)}
      .acesso-conteudo{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;width:100%;height:100%;padding:40px 20px}
      .acesso-logo{margin-top:6vh;width:680px;max-width:70vw;height:auto;display:block;filter:drop-shadow(0 0 24px rgba(0,0,0,.6));animation:fade-in-top 2s ease-in-out}
      .acesso-form{margin-top:auto;margin-bottom:8vh;width:min(88vw,320px);display:flex;flex-direction:column;align-items:center;animation:fade-in-bottom 2s ease-in-out}
      .acesso-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
      .acesso-input{width:100%;padding:10px 14px;border:0;border-bottom:1px solid rgba(244,237,216,.7);border-radius:0;background:rgba(10,10,10,.25);outline:0;color:#f4edd8;text-align:center;font:16px "Aubrey",system-ui;letter-spacing:1px;transition:border-color .2s,background .2s,box-shadow .2s}
      .acesso-input::placeholder{color:rgba(244,237,216,.7)}
      .acesso-input:focus{border-bottom-color:#fff;background:rgba(10,10,10,.48);box-shadow:0 8px 18px -16px #fff}
      .acesso-erro{margin:0 0 12px;color:#f0aaa0;font:14px "Aubrey",system-ui;text-align:center;text-shadow:0 1px 3px #000}
      @keyframes zoom-fundo{from{transform:scale(1)}to{transform:scale(1.06)}}
      @keyframes fade-in-top{0%{transform:translateY(-50px);opacity:0}100%{transform:translateY(0);opacity:1}}
      @keyframes fade-in-bottom{0%{transform:translateY(50px);opacity:0}100%{transform:translateY(0);opacity:1}}
      @media (max-width:600px){.acesso-conteudo{padding:24px 16px}.acesso-logo{margin-top:10vh;max-width:88vw}.acesso-form{margin-bottom:10vh}}
    </style>
  </head>
  <body><div class="acesso-tela">
    <div class="acesso-fundo"></div>
    <div class="acesso-ruido"></div>
    <div class="acesso-vinheta"></div>
    <main class="acesso-conteudo">
      <img class="acesso-logo" src="/ne-logo-white.png" alt="Noite Eterna">
      <form class="acesso-form" method="post" action="/_acesso">
        ${aviso}
        <label class="acesso-label" for="password">Senha da ficha</label>
        <input class="acesso-input" id="password" name="password" type="password" placeholder="Senha" autocomplete="current-password" required autofocus>
      </form>
    </main>
  </div></body>
</html>`
}

app.get("/__noite_eterna_health", (_request, response) => {
  response.json({ ok: true, protegido: Boolean(siteAccessPassword) })
})

app.post("/_acesso", (request, response) => {
  if (!siteAccessPassword) {
    response.status(503).send("A proteção da ficha não foi configurada.")
    return
  }
  if (request.body?.password !== siteAccessPassword) {
    response.status(401).send(paginaDeAcesso("Senha incorreta."))
    return
  }
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""
  response.setHeader(
    "Set-Cookie",
    `${accessCookieName}=${encodeURIComponent(accessToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`
  )
  response.redirect("/")
})

for (const asset of ["fundo_noite_eterna.svg", "ne-logo-white.png"]) {
  app.get(`/${asset}`, (_request, response) => {
    response.sendFile(path.join(distDirectory, asset))
  })
}

app.use((request, response, next) => {
  if (!siteAccessPassword || request.path === "/_acesso" || temAcesso(request)) {
    next()
    return
  }
  if (request.path.startsWith("/api")) {
    response.status(401).json({ erro: "Informe a senha da ficha para acessar a API." })
    return
  }
  response.status(401).send(paginaDeAcesso())
})

app.use((request, response, next) => {
  if (!request.path.startsWith("/api")) {
    next()
    return
  }

  const proxyRequest = http.request({
    hostname: "127.0.0.1",
    port: botPort,
    path: request.originalUrl,
    method: request.method,
    headers: {
      ...request.headers,
      host: `127.0.0.1:${botPort}`
    }
  }, proxyResponse => {
    response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers)
    proxyResponse.pipe(response)
  })

  proxyRequest.on("error", error => {
    if (!response.headersSent) {
      response.status(502).json({
        erro: "O bot local não está disponível.",
        detalhe: error.message
      })
    } else {
      response.end()
    }
  })

  request.pipe(proxyRequest)
})

app.use(express.static(distDirectory))
app.use((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.status(404).end()
    return
  }
  response.sendFile(path.join(distDirectory, "index.html"))
})

const server = http.createServer(app)

server.on("upgrade", (request, socket, head) => {
  const requestPath = new URL(request.url || "/", "http://127.0.0.1").pathname
  if (requestPath !== relayPath) {
    socket.destroy()
    return
  }
  if (siteAccessPassword && !temAcesso(request)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n")
    socket.destroy()
    return
  }
  relayServer.handleUpgrade(request, socket, head, upgradedSocket => {
    relayServer.emit("connection", upgradedSocket, request)
  })
})

server.listen(sitePort, "127.0.0.1", () => {
  console.log(`Ficha local disponível em http://127.0.0.1:${sitePort}`)
  console.log(`API do bot encaminhada para http://127.0.0.1:${botPort}`)
  console.log(`Relay da sala disponível em ${relayPath}`)
})
