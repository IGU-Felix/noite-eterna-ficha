"""Serviço Discord e API local usada pela ficha web."""

from __future__ import annotations

import asyncio
import base64
import binascii
import contextlib
import hmac
import io
import logging
import mimetypes
import re
import struct
import threading
import time
from typing import Any

try:
    from discord import AudioSource
except ImportError:
    class AudioSource:
        """Fallback para permitir que o serviço reporte a dependência ausente."""

        pass

logger = logging.getLogger("noite-eterna-bot")
TRANSITION_SECONDS = 4.0


class CrossfadeAudioSource(AudioSource):
    """Mistura a fonte atual com a próxima durante a troca de música."""

    def __init__(self, source: Any) -> None:
        self.current = source
        self.next_source: Any = None
        self.transition_started_at: float | None = None
        self.lock = threading.Lock()

    def is_opus(self) -> bool:
        return False

    def queue(self, source: Any) -> None:
        with self.lock:
            self.next_source = source
            self.transition_started_at = time.monotonic()

    def read(self) -> bytes:
        with self.lock:
            current = self.current
            next_source = self.next_source
            started_at = self.transition_started_at

        if next_source is None or started_at is None:
            return current.read()

        old_frame = current.read()
        new_frame = next_source.read()
        elapsed = time.monotonic() - started_at
        amount = min(max(elapsed / TRANSITION_SECONDS, 0.0), 1.0)

        if not old_frame:
            amount = 1.0
        if not new_frame:
            return old_frame

        mixed = self._mix_frames(old_frame, new_frame, amount)
        if amount >= 1.0:
            with self.lock:
                if self.next_source is next_source:
                    self.current = next_source
                    self.next_source = None
                    self.transition_started_at = None
            with contextlib.suppress(Exception):
                current.cleanup()
        return mixed

    @staticmethod
    def _mix_frames(old_frame: bytes, new_frame: bytes, amount: float) -> bytes:
        frame_size = min(len(old_frame), len(new_frame))
        frame_size -= frame_size % 2
        if frame_size <= 0:
            return new_frame if amount >= 0.5 else old_frame
        old_samples = struct.unpack("<" + "h" * (frame_size // 2), old_frame[:frame_size])
        new_samples = struct.unpack("<" + "h" * (frame_size // 2), new_frame[:frame_size])
        mixed = (
            max(-32768, min(32767, round(old * (1 - amount) + new * amount)))
            for old, new in zip(old_samples, new_samples)
        )
        return struct.pack("<" + "h" * (frame_size // 2), *mixed)

    def cleanup(self) -> None:
        with self.lock:
            sources = [self.current]
            if self.next_source is not None:
                sources.append(self.next_source)
            self.next_source = None
        for source in sources:
            with contextlib.suppress(Exception):
                source.cleanup()


class MusicBotService:
    """Executa o bot Discord e a API HTTP no mesmo loop assíncrono."""

    def __init__(
        self,
        config: dict[str, str],
        on_log: Any = None,
        on_ready: Any = None,
    ) -> None:
        self.config = config
        self.on_log = on_log or logger.info
        self.on_ready = on_ready
        self.loop: asyncio.AbstractEventLoop | None = None
        self.thread: threading.Thread | None = None
        self.bot: Any = None
        self.reconnect_task: asyncio.Task[Any] | None = None
        self.web_runner: Any = None
        self.connections: dict[str, Any] = {}
        self.current_urls: dict[str, str] = {}
        self.current_durations: dict[str, float] = {}
        self.playback_started_at: dict[str, float] = {}
        self.paused_elapsed: dict[str, float] = {}
        self.paused_playback: set[str] = set()
        self.loop_enabled: set[str] = set()
        self.playback_tasks: dict[str, asyncio.Task[Any]] = {}
        self.active_sources: dict[str, Any] = {}
        self.playback_versions: dict[str, int] = {}
        self.starting_playback: set[str] = set()
        self.ficha_presence = {"em": 0, "aberta": False}
        self.current_site_url = ""
        self.site_card: dict[str, str] = {
            "titulo": "A ficha está disponível",
            "descricao": "A ficha da sessão está pronta para ser acessada.",
            "imagem": "",
            "cor": "#6d4aa2",
        }
        self.last_initiatives: dict[str, list[dict[str, Any]]] = {}
        self.initiative_rosters: dict[str, list[dict[str, Any]]] = {}
        self.last_initiative_messages: dict[str, Any] = {}

    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            raise RuntimeError("O bot já está em execução.")
        if not self.config.get("DISCORD_BOT_TOKEN"):
            raise ValueError("Informe o token do bot antes de iniciar.")

        self.thread = threading.Thread(target=self._run_thread, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        if not self.loop:
            return
        future = asyncio.run_coroutine_threadsafe(self._shutdown(), self.loop)
        try:
            future.result(timeout=15)
        except (RuntimeError, TimeoutError) as erro:
            self.on_log(f"AVISO ao encerrar o bot: {erro}")
        finally:
            self.loop.call_soon_threadsafe(self.loop.stop)
            if self.thread:
                self.thread.join(timeout=15)
            self.loop = None
            self.thread = None
            self.bot = None

    def publish_site_link(self, url: str) -> None:
        """Registra o link para o card e informa a URL apenas no aplicativo."""
        self.current_site_url = url.strip()
        self.on_log(f"Link público da ficha: {self.current_site_url}")

    def set_site_card(self, card: dict[str, Any]) -> None:
        """Atualiza o card usado na próxima publicação da ficha."""
        allowed = ("titulo", "descricao", "imagem", "cor")
        self.site_card = {
            key: str(card.get(key) or "").strip()
            for key in allowed
        }
        self.site_card["imagemNome"] = str(card.get("imagemNome") or "").strip()[:120]

    def send_site_card(self) -> None:
        """Envia o card configurado imediatamente para o canal do Discord."""
        if not self.loop or not self.bot:
            self.on_log("ERRO: o bot não está pronto para enviar o card.")
            return
        future = asyncio.run_coroutine_threadsafe(
            self._publish_site_link(self.current_site_url, include_link=True),
            self.loop,
        )

        def report(result: Any) -> None:
            try:
                result.result()
            except (RuntimeError, ValueError, TypeError) as erro:
                self.on_log(f"ERRO ao enviar o card: {erro}")

        future.add_done_callback(report)

    async def _publish_site_link(
        self, url: str, *, include_link: bool = True
    ) -> None:
        import discord

        guild_id = self.config.get("DISCORD_GUILD_ID", "").strip()
        text_channel_id = self.config.get("DISCORD_TEXT_CHANNEL_ID", "").strip()
        guild = self.bot.get_guild(int(guild_id)) if guild_id else None
        if guild is None:
            raise ValueError("Servidor Discord não encontrado para publicar o link.")

        channel = None
        if text_channel_id:
            channel = guild.get_channel(int(text_channel_id))
        if channel is None:
            channel = guild.system_channel
        if channel is None:
            channel = next(
                (
                    item for item in guild.text_channels
                    if guild.me is None or item.permissions_for(guild.me).send_messages
                ),
                None,
            )
        if channel is None:
            raise ValueError("Nenhum canal de texto disponível para publicar o link.")

        password = self.config.get("SITE_ACCESS_PASSWORD", "").strip()
        try:
            color = int(self.site_card["cor"].lstrip("#"), 16)
        except ValueError:
            color = 0x6D4AA2
        embed = discord.Embed(
            title=self.site_card["titulo"] or "A ficha está disponível",
            description=self._card_description(url),
            color=color,
        )
        embed.add_field(name="Senha", value=password or "Não configurada", inline=False)
        arquivo_imagem = await self._download_card_image()
        if arquivo_imagem is not None:
            arquivo, nome_arquivo = arquivo_imagem
            embed.set_image(url=f"attachment://{nome_arquivo}")
            await channel.send(embed=embed, file=discord.File(arquivo, filename=nome_arquivo))
        else:
            await channel.send(embed=embed)
        if include_link and url:
            self.on_log(f"Card com link enviado para #{channel.name}.")
        else:
            self.on_log(f"Card enviado para #{channel.name}.")

    def _card_description(self, url: str) -> str:
        description = self.site_card["descricao"] or "A ficha da sessão está pronta."
        if url:
            return f"{description}\n\n[Acessar a ficha]({url})"
        return description

    async def _download_card_image(self) -> tuple[io.BytesIO, str] | None:
        image_url = self.site_card["imagem"]
        if image_url.startswith("data:image/"):
            try:
                header, encoded = image_url.split(",", 1)
                conteudo = base64.b64decode(encoded, validate=True)
                if len(conteudo) > 8 * 1024 * 1024:
                    raise ValueError("a imagem excede o limite de 8 MB")
                mime = header[5:].split(";", 1)[0]
                extensao = mimetypes.guess_extension(mime) or ".png"
                nome = re.sub(
                    r"[^A-Za-z0-9._-]",
                    "_",
                    self.site_card.get("imagemNome") or f"noite-eterna-card{extensao}",
                )
                return io.BytesIO(conteudo), nome[:120]
            except (ValueError, UnicodeError, binascii.Error) as erro:
                self.on_log(f"AVISO: não foi possível ler a imagem enviada: {erro}")
                return None
        if not image_url.startswith(("http://", "https://")):
            return None

        try:
            import aiohttp

            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(image_url) as response:
                    if response.status >= 400:
                        raise ValueError(f"servidor respondeu HTTP {response.status}")
                    content_type = response.headers.get("Content-Type", "").split(";")[0].lower()
                    if not content_type.startswith("image/"):
                        raise ValueError("a URL não retornou uma imagem")
                    conteudo = await response.read()
                    if len(conteudo) > 8 * 1024 * 1024:
                        raise ValueError("a imagem excede o limite de 8 MB")

            extensao = mimetypes.guess_extension(content_type) or ".png"
            nome = f"noite-eterna-card{extensao}"
            return io.BytesIO(conteudo), nome
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError, ValueError) as erro:
            self.on_log(f"AVISO: não foi possível anexar a imagem do card: {erro}")
            return None

    def _run_thread(self) -> None:
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._start())
            self.loop.run_forever()
        except Exception as erro:
            self.on_log(f"ERRO no serviço: {erro}")
        finally:
            self.web_runner = None
            self.loop.close()

    async def _start(self) -> None:
        try:
            import discord
            from aiohttp import web
            from discord.ext import commands
        except ImportError as erro:
            raise RuntimeError(
                "Dependências ausentes. Reinstale o aplicativo auxiliar ou consulte o README."
            ) from erro

        intents = discord.Intents.none()
        intents.guilds = True
        intents.voice_states = True

        class Bot(commands.Bot):
            async def setup_hook(bot_self: Any) -> None:
                guild_id = self.config.get("DISCORD_GUILD_ID", "").strip()
                if guild_id:
                    guild = discord.Object(id=int(guild_id))
                    bot_self.tree.copy_global_to(guild=guild)
                    comandos = await bot_self.tree.sync(guild=guild)
                    self.on_log(
                        f"{len(comandos)} comandos sincronizados no servidor {guild_id}."
                    )
                else:
                    comandos = await bot_self.tree.sync()
                    self.on_log(
                        f"{len(comandos)} comandos sincronizados globalmente."
                    )

        self.bot = Bot(command_prefix="!", intents=intents)
        self.bot.tree.command(name="play", description="Toca uma música")(
            self._slash_play
        )
        self.bot.tree.command(name="loop", description="Alterna o loop")(
            self._slash_loop
        )
        self.bot.tree.command(name="skip", description="Pula a música")(
            self._slash_skip
        )
        self.bot.tree.command(name="stop", description="Para a música")(
            self._slash_stop
        )
        self.bot.tree.command(name="iniciativa", description="Envia a ordem de iniciativa")(
            self._slash_initiative
        )
        self.bot.tree.command(name="ini_add", description="Adiciona um participante à iniciativa")(
            self._slash_ini_add
        )
        self.bot.tree.command(name="ini_troca", description="Troca dois participantes na iniciativa")(
            self._slash_ini_troca
        )
        self.bot.event(self._on_ready)

        @web.middleware
        async def cors_middleware(request: Any, handler: Any) -> Any:
            response = await handler(request)
            origin = request.headers.get("Origin", "")
            configured = self.config.get("FRONTEND_ORIGIN", "*").strip()
            allowed = configured == "*" or origin in {
                item.strip() for item in configured.split(",") if item.strip()
            }
            if allowed:
                response.headers["Access-Control-Allow-Origin"] = origin or "*"
                response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Private-Network"] = "true"
            return response

        app = web.Application(
            client_max_size=12 * 1024 * 1024,
            middlewares=[cors_middleware],
        )
        app.router.add_route("OPTIONS", "/api/{tail:.*}", self._preflight)
        app.router.add_get("/api/health", self._health)
        app.router.add_post("/api/ficha/presenca", self._presence)
        app.router.add_get("/api/discord/status", self._status)
        app.router.add_post("/api/discord/reconnect", self._reconnect)
        app.router.add_get("/api/discord/locations", self._locations)
        app.router.add_get("/api/discord/music/status", self._music_status)
        app.router.add_post("/api/discord/card", self._card)
        app.router.add_post("/api/discord/card/send", self._send_card)
        app.router.add_post("/api/discord/initiative", self._initiative)
        app.router.add_post("/api/discord/initiative/roster", self._initiative_roster)
        app.router.add_post("/api/discord/command", self._command)
        self.web_runner = web.AppRunner(app)
        await self.web_runner.setup()
        port = self._port()
        site = web.TCPSite(self.web_runner, "127.0.0.1", port)
        await site.start()
        self.on_log(f"API local disponível em http://127.0.0.1:{port}")
        await self.bot.start(self.config["DISCORD_BOT_TOKEN"])

    async def _on_ready(self) -> None:
        self.on_log(f"Bot conectado como {self.bot.user}")
        if self.on_ready:
            self.on_ready(str(self.bot.user))

    def _authorized(self, request: Any) -> bool:
        expected = self.config.get("DISCORD_API_KEY", "").strip()
        received = request.headers.get("Authorization", "").strip()
        if received.lower().startswith("bearer "):
            received = received[7:].strip()
        if expected and hmac.compare_digest(received, expected):
            return True
        # A API é vinculada exclusivamente a 127.0.0.1. Isso permite que
        # uma ficha hospedada localmente funcione sem expor a chave no Vue.
        return not received and request.remote in {"127.0.0.1", "::1", "localhost"}

    async def _preflight(self, request: Any) -> Any:
        del request
        response = self._response({})
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    def _port(self) -> int:
        try:
            port = int(self.config.get("PORT", "3001"))
        except ValueError as erro:
            raise ValueError("PORT precisa ser um número inteiro.") from erro
        if not 1 <= port <= 65535:
            raise ValueError("PORT precisa estar entre 1 e 65535.")
        return port

    async def _json(self, request: Any) -> dict[str, Any]:
        try:
            data = await request.json()
        except (TypeError, ValueError) as erro:
            raise ValueError("O corpo da requisição precisa ser JSON.") from erro
        if not isinstance(data, dict):
            raise ValueError("O corpo da requisição precisa ser um objeto JSON.")
        return data

    def _response(self, data: dict[str, Any], status: int = 200) -> Any:
        from aiohttp import web

        response = web.json_response(data, status=status)
        response.headers["Access-Control-Allow-Origin"] = self.config.get(
            "FRONTEND_ORIGIN", "*"
        )
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

    async def _health(self, request: Any) -> Any:
        del request
        return self._response({"aplicativo": True, "conectado": bool(self.bot and self.bot.is_ready())})

    async def _presence(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        try:
            data = await self._json(request)
        except ValueError as erro:
            return self._response({"erro": str(erro)}, 400)
        import time

        self.ficha_presence = {
            "em": int(time.time() * 1000),
            "aberta": data.get("aberta") is True,
        }
        return self._response({
            "registrada": True,
            "aberta": self.ficha_presence["aberta"],
        })

    async def _status(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        return self._response({
            "conectado": bool(self.bot and self.bot.is_ready()),
            "bot": str(self.bot.user) if self.bot and self.bot.user else None,
            "servidores": len(self.bot.guilds) if self.bot else 0,
        })

    async def _reconnect(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        if not self.bot:
            return self._response({"erro": "O bot ainda não foi iniciado."}, 503)
        if self.reconnect_task and not self.reconnect_task.done():
            return self._response({"reconectando": True})
        self.reconnect_task = asyncio.create_task(self._reconnect_discord())
        return self._response({"reconectando": True})

    async def _reconnect_discord(self) -> None:
        try:
            self.on_log("Solicitação de reconexão recebida pela ficha.")
            await self.bot.close()
            await self.bot.start(self.config["DISCORD_BOT_TOKEN"])
        except (RuntimeError, OSError) as erro:
            self.on_log(f"ERRO ao reconectar o bot: {erro}")

    async def _locations(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        if not self.bot or not self.bot.is_ready():
            return self._response({"erro": "Bot ainda não está conectado ao Discord."}, 503)
        servidores = []
        for guild in self.bot.guilds:
            servidores.append({
                "id": str(guild.id),
                "nome": guild.name,
                "canaisVoz": [
                    {"id": str(channel.id), "nome": channel.name}
                    for channel in guild.channels
                    if channel.type.name in {"voice", "stage_voice"}
                ],
            })
        return self._response({"servidores": servidores})

    async def _music_status(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        guild_id = request.query.get("guildId") or self.config.get("DISCORD_GUILD_ID", "")
        return self._response(self._status_for_guild(guild_id))

    async def _card(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        try:
            data = await self._json(request)
            card = {
                "titulo": str(data.get("titulo") or ""),
                "descricao": str(data.get("descricao") or ""),
                "imagem": str(data.get("imagem") or ""),
                "imagemNome": str(data.get("imagemNome") or ""),
                "cor": str(data.get("cor") or "#6d4aa2"),
            }
            imagem = card["imagem"]
            if imagem and not imagem.startswith(("http://", "https://", "data:image/")):
                raise ValueError("A imagem precisa ser uma URL HTTP/HTTPS ou um arquivo enviado.")
            if imagem.startswith("data:image/") and len(imagem) > 12 * 1024 * 1024:
                raise ValueError("A imagem enviada excede o limite permitido.")
            if not re.fullmatch(r"#[0-9a-fA-F]{6}", card["cor"]):
                raise ValueError("A cor precisa estar no formato hexadecimal.")
            self.set_site_card(card)
            return self._response({"salvo": True, "card": self.site_card})
        except ValueError as erro:
            return self._response({"erro": str(erro)}, 400)

    async def _send_card(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        self.send_site_card()
        return self._response({"enviando": True})

    async def _initiative(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        try:
            data = await self._json(request)
            jogadores = data.get("jogadores")
            if not isinstance(jogadores, list) or not jogadores:
                raise ValueError("Informe ao menos uma iniciativa.")
            resultado = await self._send_initiatives(
                jogadores,
                str(data.get("guildId") or ""),
                preservar_ordem=data.get("preservarOrdem") is True,
            )
            return self._response({"enviado": True, **resultado})
        except (ValueError, RuntimeError) as erro:
            return self._response({"erro": str(erro)}, 400)

    async def _initiative_roster(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        try:
            data = await self._json(request)
            participantes = data.get("participantes")
            if not isinstance(participantes, list):
                raise ValueError("Informe a lista de participantes.")
            guild = self._guild(str(data.get("guildId") or ""))
            roster = []
            for participante in participantes:
                if not isinstance(participante, dict):
                    raise ValueError("Cada participante precisa ser um objeto.")
                nome = str(participante.get("nome") or "").strip()
                if not nome:
                    raise ValueError("Todo participante precisa ter um nome.")
                iniciativa = participante.get("iniciativa")
                roster.append({
                    "nome": nome[:100],
                    "tipo": str(participante.get("tipo") or "personagem"),
                    "iniciativa": iniciativa if isinstance(iniciativa, int) else None,
                })
            self.initiative_rosters[str(guild.id)] = roster
            return self._response({"salvo": True, "participantes": len(roster)})
        except (ValueError, RuntimeError) as erro:
            return self._response({"erro": str(erro)}, 400)

    async def _command(self, request: Any) -> Any:
        if not self._authorized(request):
            return self._response({"erro": "API não autorizada."}, 401)
        import discord

        try:
            data = await self._json(request)
            action = str(data.get("acao") or self._infer_action(data.get("comando")))
            result = await self.execute_action(
                action,
                str(data.get("link") or ""),
                str(data.get("guildId") or ""),
                str(data.get("voiceChannelId") or ""),
            )
            return self._response({"executado": True, **result})
        except (ValueError, RuntimeError, TimeoutError, discord.DiscordException) as erro:
            return self._response({"erro": str(erro)}, 400)

    @staticmethod
    def _infer_action(command: Any) -> str:
        normalized = str(command or "").lower()
        if "skip" in normalized:
            return "skip"
        if "loop" in normalized:
            return "loop"
        if "stop" in normalized:
            return "stop"
        return "play"

    def _guild(self, guild_id: str) -> Any:
        selected = guild_id or self.config.get("DISCORD_GUILD_ID", "")
        if not selected:
            if self.bot and len(self.bot.guilds) == 1:
                return self.bot.guilds[0]
            raise ValueError("Informe o servidor da sessão.")
        guild = self.bot.get_guild(int(selected))
        if not guild:
            raise ValueError("Servidor não encontrado.")
        return guild

    async def execute_action(
        self, action: str, link: str = "", guild_id: str = "", voice_channel_id: str = ""
    ) -> dict[str, Any]:
        guild = self._guild(guild_id)
        if action == "move":
            channel = self._voice_channel(guild, voice_channel_id)
            guild_key = str(guild.id)
            await self._disconnect_other_guild_connections(guild_key)
            connection = self.connections.get(guild_key) or getattr(guild, "voice_client", None)
            if not connection or not connection.is_connected():
                if connection:
                    await self._disconnect_connection(guild_key, connection)
                self.connections[guild_key] = await asyncio.wait_for(
                    channel.connect(timeout=15, reconnect=True), timeout=20
                )
            elif not connection.channel or connection.channel.id != channel.id:
                if connection.is_playing():
                    connection.stop()
                await asyncio.wait_for(connection.move_to(channel), timeout=15)
            self.connections[guild_key] = connection
            self.on_log(f"Bot conectado ao canal {channel.name}.")
            return {"acao": "move", "canal": channel.name}
        if action == "play":
            if not link:
                raise ValueError("Informe o link da música.")
            channel_id = voice_channel_id or self.config.get("DISCORD_VOICE_CHANNEL_ID", "")
            channel = self._voice_channel(guild, channel_id)
            guild_key = str(guild.id)
            await self._cancel_playback(guild_key)
            version = self.playback_versions.get(guild_key, 0) + 1
            self.playback_versions[guild_key] = version
            self.current_urls[guild_key] = link
            self.current_durations.pop(guild_key, None)
            self.playback_started_at.pop(guild_key, None)
            self.paused_elapsed.pop(guild_key, None)
            self.paused_playback.discard(guild_key)
            self.starting_playback.add(guild_key)
            task = asyncio.create_task(
                self._start_playback(guild_key, channel, link, version)
            )
            self.playback_tasks[guild_key] = task
            return {
                "acao": "play",
                "url": link,
                "loop": guild_key in self.loop_enabled,
                "iniciando": True,
            }
        if action == "pause":
            guild_key = str(guild.id)
            connection = self.connections.get(guild_key) or getattr(
                guild, "voice_client", None
            )
            if not connection or not connection.is_playing():
                raise ValueError("Não há música tocando para pausar.")
            duration = self.current_durations.get(guild_key, 0)
            started_at = self.playback_started_at.get(guild_key)
            elapsed = min(max(time.monotonic() - started_at, 0), duration) if started_at else 0
            connection.pause()
            self.paused_elapsed[guild_key] = elapsed
            self.paused_playback.add(guild_key)
            return {"acao": "pause", "pausada": True, "decorrido": elapsed}
        if action == "resume":
            guild_key = str(guild.id)
            connection = self.connections.get(guild_key)
            if not connection or not connection.is_paused():
                raise ValueError("Não há música pausada para continuar.")
            elapsed = self.paused_elapsed.get(guild_key, 0)
            connection.resume()
            self.playback_started_at[guild_key] = time.monotonic() - elapsed
            self.paused_playback.discard(guild_key)
            return {"acao": "resume", "pausada": False, "reproduzindo": True}
        if action == "loop":
            enabled = str(guild.id) not in self.loop_enabled
            if enabled:
                self.loop_enabled.add(str(guild.id))
            else:
                self.loop_enabled.remove(str(guild.id))
            return {"acao": "loop", "loop": enabled}
        if action == "skip":
            guild_key = str(guild.id)
            await self._cancel_playback(guild_key)
            self.playback_versions[guild_key] = self.playback_versions.get(guild_key, 0) + 1
            connection = self.connections.get(guild_key)
            if connection:
                connection.stop()
            self.starting_playback.discard(guild_key)
            self.paused_elapsed.pop(guild_key, None)
            self.paused_playback.discard(guild_key)
            self.loop_enabled.discard(guild_key)
            return {"acao": "skip", "pulou": True}
        if action == "stop":
            guild_key = str(guild.id)
            await self._cancel_playback(guild_key)
            self.playback_versions[guild_key] = self.playback_versions.get(guild_key, 0) + 1
            connection = self.connections.pop(guild_key, None)
            if connection:
                connection.stop()
                await self._disconnect_connection(guild_key, connection)
            self.current_urls.pop(guild_key, None)
            self.current_durations.pop(guild_key, None)
            self.playback_started_at.pop(guild_key, None)
            self.paused_elapsed.pop(guild_key, None)
            self.paused_playback.discard(guild_key)
            self.starting_playback.discard(guild_key)
            self.loop_enabled.discard(guild_key)
            return {"acao": "stop", "parou": True}
        raise ValueError("Ação musical desconhecida.")

    async def _disconnect_other_guild_connections(self, selected_guild_key: str) -> None:
        """Mantém o bot em apenas um canal de voz ao trocar de servidor."""
        for guild_key, connection in list(self.connections.items()):
            if guild_key == selected_guild_key:
                continue
            await self._cancel_playback(guild_key)
            self.playback_versions[guild_key] = self.playback_versions.get(guild_key, 0) + 1
            await self._disconnect_connection(guild_key, connection)
            source = self.active_sources.pop(guild_key, None)
            if source:
                source.cleanup()
            self.current_urls.pop(guild_key, None)
            self.current_durations.pop(guild_key, None)
            self.playback_started_at.pop(guild_key, None)
            self.paused_elapsed.pop(guild_key, None)
            self.paused_playback.discard(guild_key)
            self.starting_playback.discard(guild_key)
            self.loop_enabled.discard(guild_key)

    @staticmethod
    def _voice_channel(guild: Any, channel_id: str) -> Any:
        if not channel_id:
            raise ValueError("Informe o canal de voz da sessão.")
        try:
            channel = guild.get_channel(int(channel_id))
        except (TypeError, ValueError) as erro:
            raise ValueError("O ID do canal de voz é inválido.") from erro
        if not channel or not hasattr(channel, "connect"):
            raise ValueError("Canal de voz não encontrado.")
        return channel

    async def _cancel_playback(self, guild_key: str) -> None:
        task = self.playback_tasks.pop(guild_key, None)
        if not task or task.done():
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    async def _disconnect_connection(self, guild_key: str, connection: Any) -> None:
        if self.connections.get(guild_key) is connection:
            self.connections.pop(guild_key, None)
        with contextlib.suppress(Exception):
            connection.stop()
        with contextlib.suppress(Exception):
            await asyncio.wait_for(connection.disconnect(force=True), timeout=5)

    async def _start_playback(
        self, guild_key: str, channel: Any, url: str, version: int
    ) -> None:
        task = asyncio.current_task()
        try:
            connection = self.connections.get(guild_key)
            if not connection or not connection.is_connected():
                if connection:
                    await self._disconnect_connection(guild_key, connection)
                connection = await asyncio.wait_for(
                    channel.connect(timeout=15, reconnect=True), timeout=20
                )
                self.connections[guild_key] = connection
            elif not connection.channel or connection.channel.id != channel.id:
                if connection.is_paused() and not isinstance(
                    self.active_sources.get(guild_key), CrossfadeAudioSource
                ):
                    connection.stop()
                self.on_log(f"Movendo o bot para o canal {channel.name}.")
                await asyncio.wait_for(connection.move_to(channel), timeout=15)
            if self.playback_versions.get(guild_key) != version:
                return
            duration = await self._play(connection, url, guild_key, version)
            if self.playback_versions.get(guild_key) != version:
                return
            self.current_durations[guild_key] = duration
            self.playback_started_at[guild_key] = time.monotonic()
            self.on_log(f"Reproduzindo música no servidor {guild_key}.")
        except asyncio.CancelledError:
            raise
        except Exception as erro:
            self.on_log(f"ERRO ao reproduzir música: {erro}")
            connection = self.connections.pop(guild_key, None)
            if connection:
                await self._disconnect_connection(guild_key, connection)
            if self.playback_tasks.get(guild_key) is task:
                self.current_urls.pop(guild_key, None)
        finally:
            if self.playback_tasks.get(guild_key) is task:
                self.starting_playback.discard(guild_key)

    async def _play(
        self, connection: Any, url: str, guild_key: str, version: int
    ) -> float:
        try:
            import yt_dlp
            import discord
        except ImportError as erro:
            raise RuntimeError("A dependência yt-dlp não está instalada.") from erro
        options = {
            "format": "bestaudio[ext=webm]/bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "socket_timeout": 15,
        }
        with yt_dlp.YoutubeDL(options) as downloader:
            info = await asyncio.to_thread(downloader.extract_info, url, download=False)
        stream_url = info.get("url") if info else None
        if not stream_url:
            raise RuntimeError("Não foi possível obter o áudio do link.")
        duration = float(info.get("duration") or 0)
        if self.playback_versions.get(guild_key) != version:
            return duration
        raw_source = discord.FFmpegPCMAudio(
            stream_url,
            before_options="-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
            options="-vn",
        )
        source = discord.PCMVolumeTransformer(raw_source, volume=1.0)

        def report_player_error(error: Exception | None) -> None:
            if error is None:
                self.on_log("Reprodução finalizada.")
                return
            self.on_log(f"ERRO no áudio/FFmpeg: {error}")

        active_source = self.active_sources.get(guild_key)
        if (
            connection.is_playing()
            and isinstance(active_source, CrossfadeAudioSource)
        ):
            active_source.queue(source)
            return duration
        if connection.is_playing() or connection.is_paused():
            connection.stop()
        mixer = CrossfadeAudioSource(source)
        self.active_sources[guild_key] = mixer
        connection.play(mixer, after=report_player_error)
        return duration

    def _status_for_guild(self, guild_id: str) -> dict[str, Any]:
        key = guild_id or self.config.get("DISCORD_GUILD_ID", "")
        duration = self.current_durations.get(key, 0)
        started_at = self.playback_started_at.get(key)
        elapsed = min(max(time.monotonic() - started_at, 0), duration) if started_at else 0
        return {
            "atual": self.current_urls.get(key),
            "loop": key in self.loop_enabled,
            "reproduzindo": key in self.starting_playback or bool(
                self.connections.get(key) and self.connections[key].is_playing()
            ),
            "pausada": key in self.paused_playback,
            "decorrido": self.paused_elapsed.get(key, elapsed),
            "duracao": duration,
            "fila": 0,
        }

    async def _slash_play(self, interaction: Any) -> None:
        await interaction.response.send_message("Use a playlist da ficha para iniciar uma música.")

    async def _slash_loop(self, interaction: Any) -> None:
        result = await self.execute_action("loop", guild_id=str(interaction.guild_id))
        await interaction.response.send_message("Loop ativado." if result["loop"] else "Loop desativado.")

    async def _slash_skip(self, interaction: Any) -> None:
        await self.execute_action("skip", guild_id=str(interaction.guild_id))
        await interaction.response.send_message("Música pulada.")

    async def _slash_stop(self, interaction: Any) -> None:
        await self.execute_action("stop", guild_id=str(interaction.guild_id))
        await interaction.response.send_message("Música parada.")

    async def _slash_initiative(self, interaction: Any) -> None:
        guild_key = str(interaction.guild_id)
        jogadores = self.last_initiatives.get(guild_key)
        if not jogadores:
            await interaction.response.send_message(
                "Nenhuma iniciativa foi coletada. Use o botão da sessão online primeiro."
            )
            return
        await interaction.response.send_message(
            self._format_initiatives(jogadores)
        )

    async def _slash_ini_add(
        self,
        interaction: Any,
        participante: str | None = None,
        posicao: int | None = None,
    ) -> None:
        guild_key = str(interaction.guild_id)
        roster = self.initiative_rosters.get(guild_key, [])
        if not roster:
            await interaction.response.send_message(
                "A lista de participantes ainda não foi enviada pela sessão online."
            )
            return
        if not participante or posicao is None:
            await interaction.response.send_message(
                self._format_roster(roster)
                + "\nUse `/ini_add participante posição` para adicionar ou posicionar alguém."
            )
            return
        if posicao < 1:
            await interaction.response.send_message("A posição precisa ser maior que zero.")
            return

        encontrado = self._find_named(roster, participante)
        if encontrado is None:
            await interaction.response.send_message(
                f"Participante não encontrado: {participante}."
            )
            return
        atual = self.last_initiatives.get(guild_key, [])
        entrada = next(
            (item for item in atual if item["nome"].casefold() == encontrado["nome"].casefold()),
            {"nome": encontrado["nome"], "iniciativa": encontrado["iniciativa"]},
        )
        nova_lista = [
            item for item in atual
            if item["nome"].casefold() != encontrado["nome"].casefold()
        ]
        nova_lista.insert(min(posicao - 1, len(nova_lista)), entrada)
        await self._publish_initiatives(interaction.guild_id, nova_lista)
        await interaction.response.send_message(
            f"{encontrado['nome']} foi colocado na posição {posicao}."
        )

    async def _slash_ini_troca(
        self,
        interaction: Any,
        primeiro: str | None = None,
        segundo: str | None = None,
    ) -> None:
        guild_key = str(interaction.guild_id)
        atual = self.last_initiatives.get(guild_key, [])
        if not primeiro or not segundo:
            if not atual:
                await interaction.response.send_message(
                    "Nenhuma iniciativa foi publicada ainda."
                )
                return
            await interaction.response.send_message(
                self._format_initiatives(atual)
                + "\nUse `/ini_troca primeiro segundo` para trocar duas posições."
            )
            return

        primeiro_item = self._find_named(atual, primeiro)
        segundo_item = self._find_named(atual, segundo)
        if primeiro_item is None or segundo_item is None:
            await interaction.response.send_message(
                "Os dois participantes precisam estar na lista de iniciativa."
            )
            return
        primeiro_indice = atual.index(primeiro_item)
        segundo_indice = atual.index(segundo_item)
        atual[primeiro_indice], atual[segundo_indice] = (
            atual[segundo_indice],
            atual[primeiro_indice],
        )
        await self._publish_initiatives(interaction.guild_id, atual)
        await interaction.response.send_message(
            f"Posições trocadas: {primeiro_item['nome']} e {segundo_item['nome']}."
        )

    async def _send_initiatives(
        self,
        jogadores: list[Any],
        guild_id: str = "",
        *,
        preservar_ordem: bool = False,
    ) -> dict[str, Any]:
        guild = self._guild(guild_id)
        normalizados: list[dict[str, Any]] = []
        for jogador in jogadores:
            if not isinstance(jogador, dict):
                raise ValueError("Cada jogador precisa ser um objeto.")
            nome = str(jogador.get("nome") or "").strip()
            iniciativa = jogador.get("iniciativa")
            if not nome:
                raise ValueError("Todo jogador precisa ter um nome.")
            if not isinstance(iniciativa, int) or isinstance(iniciativa, bool):
                raise ValueError(f"A iniciativa de {nome} é inválida.")
            normalizados.append({
                "nome": nome[:100],
                "iniciativa": iniciativa,
                "tipo": str(jogador.get("tipo") or "personagem"),
            })

        if not preservar_ordem:
            normalizados.sort(key=lambda jogador: jogador["iniciativa"], reverse=True)
        self.initiative_rosters[str(guild.id)] = [
            {
                "nome": jogador["nome"],
                "tipo": jogador["tipo"],
                "iniciativa": jogador["iniciativa"],
            }
            for jogador in normalizados
        ]
        await self._publish_initiatives(guild.id, normalizados)
        valores = [jogador["iniciativa"] for jogador in normalizados]
        empates = len(valores) != len(set(valores))
        return {"jogadores": len(normalizados), "empates": empates}

    async def _publish_initiatives(
        self, guild_id: Any, jogadores: list[dict[str, Any]]
    ) -> None:
        guild = self._guild(str(guild_id))
        guild_key = str(guild.id)
        channel = guild.get_channel(int(self.config["DISCORD_TEXT_CHANNEL_ID"])) \
            if self.config.get("DISCORD_TEXT_CHANNEL_ID") else None
        if channel is None:
            channel = guild.system_channel
        if channel is None:
            channel = next(
                (
                    item for item in guild.text_channels
                    if guild.me is None or item.permissions_for(guild.me).send_messages
                ),
                None,
            )
        if channel is None:
            raise ValueError("Nenhum canal de texto disponível para enviar a iniciativa.")
        mensagem_anterior = self.last_initiative_messages.pop(guild_key, None)
        if mensagem_anterior is not None:
            try:
                await mensagem_anterior.delete()
            except Exception as erro:
                self.on_log(f"AVISO: não foi possível apagar a iniciativa anterior: {erro}")
        mensagem = await channel.send(self._format_initiatives(jogadores))
        self.last_initiative_messages[guild_key] = mensagem
        self.last_initiatives[guild_key] = jogadores

    @staticmethod
    def _find_named(
        participantes: list[dict[str, Any]], nome: str
    ) -> dict[str, Any] | None:
        procurado = nome.strip().casefold()
        return next(
            (item for item in participantes if item["nome"].casefold() == procurado),
            None,
        )

    @staticmethod
    def _format_roster(participantes: list[dict[str, Any]]) -> str:
        linhas = ["**Participantes disponíveis**"]
        for participante in participantes:
            marcador = "ameaça" if participante.get("tipo") == "ameaca" else "jogador"
            linhas.append(f"- **{participante['nome']}** ({marcador})")
        return "\n".join(linhas)

    @staticmethod
    def _format_initiatives(jogadores: list[dict[str, Any]]) -> str:
        linhas = ["**Ordem de iniciativa**"]
        for posicao, jogador in enumerate(jogadores, 1):
            tipo = "Ameaça" if jogador.get("tipo") == "ameaca" else "Jogador"
            linhas.append(
                f"{posicao}. **{jogador['nome']}** ({tipo}) — {jogador['iniciativa']}"
            )
        valores = [jogador["iniciativa"] for jogador in jogadores]
        if len(valores) != len(set(valores)):
            linhas.append(
                "\n⚠️ Empate detectado. O Mestre deve pedir novas rolagens aos empatados."
            )
        return "\n".join(linhas)

    async def _shutdown(self) -> None:
        tasks = list(self.playback_tasks.values())
        for task in tasks:
            if not task.done():
                task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.playback_tasks.clear()
        for connection in list(self.connections.values()):
            guild_key = next(
                (
                    key for key, item in self.connections.items()
                    if item is connection
                ),
                "",
            )
            await self._disconnect_connection(guild_key, connection)
        self.connections.clear()
        if self.web_runner:
            with contextlib.suppress(Exception):
                await self.web_runner.cleanup()
        if self.bot and not self.bot.is_closed():
            with contextlib.suppress(Exception):
                await asyncio.wait_for(self.bot.close(), timeout=5)
