"""Interface desktop mínima do Noite Eterna Bot."""

from __future__ import annotations

import asyncio
import ctypes
import logging
import os
import queue
import re
import socket
import subprocess
import threading
import tempfile
import urllib.error
import urllib.request
import tkinter as tk
from collections import deque
from io import BytesIO
from pathlib import Path
from tkinter import font as tkfont
from tkinter import messagebox, ttk
from typing import Any

from PIL import Image, ImageTk, UnidentifiedImageError

from config import carregar_config, salvar_config
from music_service import MusicBotService


BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
ICONS_DIR = BASE_DIR / "icons"
ICON_PATH = ICONS_DIR / "Moon_Yellow.ico"
TRAY_ICON_PATH = ICONS_DIR / "Moon_black.ico"
TRAY_ACTIVE_ICON_PATH = ICONS_DIR / "Moon_Yellow.ico"
LOGO_PATH = ASSETS_DIR / "ne_ascii.png"
CONFIG_LOGO_PATH = ASSETS_DIR / "config_ascii.png"
FONT_FAMILY = "Consolas"
BACKGROUND_COLOR = "#000000"
CARD_COLOR = "#000000"
MUTED_COLOR = "#000000"
MUTED_TEXT_COLOR = "#AAAAAA"
BORDER_COLOR = "#FFFFFF"
ACCENT_COLOR = "#FFFFFF"
TEXT_COLOR = "#FFFFFF"
CYAN_COLOR = "#FFFFFF"
CONFIG_LABEL_COLOR = "#F3AC2A"
ASCII_LOGO = (
    "           _   _  ___  ___ _____ _____\n"
    "          | \\ | |/ _ \\|_ _|_   _| ____|\n"
    "          |  \\| | | | || |  | | |  _|\n"
    "          | |\\  | |_| || |  | | | |___\n"
    "          |_| \\_|\\___/|___| |_| |_____|\n"
    "\n"
    "              E T E R N A"
)


class BotApp:
    def __init__(self) -> None:
        self._instance_lock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            self._instance_lock.bind(("127.0.0.1", 31999))
            self._instance_lock.listen(1)
        except OSError as erro:
            self._instance_lock.close()
            raise RuntimeError(
                "O aplicativo do bot já está aberto. Feche a outra instância "
                "antes de iniciar uma nova."
            ) from erro
        self.config = carregar_config()
        self.service: MusicBotService | None = None
        self.site_process: subprocess.Popen[str] | None = None
        self.tunnel_process: subprocess.Popen[str] | None = None
        self._tunnel_config_path: str | None = None
        self._pending_site_url: str | None = None
        self._tunnel_connected = False
        self.tray_icon: Any = None
        self._tray_black_image: Image.Image | None = None
        self._tray_yellow_image: Image.Image | None = None
        self._app_icon_path = ICON_PATH
        self._set_windows_app_id()
        self.root = tk.Tk()
        self.root.title("Noite Eterna")
        self.root.geometry("600x400")
        self.root.minsize(600, 400)
        self.root.maxsize(600, 400)
        self.font_family = self._resolve_font_family()
        self.config_vars: dict[str, tk.StringVar] = {
            key: tk.StringVar(value=value) for key, value in self.config.items()
        }
        self.fields: dict[str, tk.Entry] = {}
        self.status = tk.StringVar(value="Parado")
        self.online_status = tk.StringVar(value="Offline")
        self.bot_name = tk.StringVar(value="Nome do Bot")
        self._ficha_status_item: int | None = None
        self._bot_status_item: int | None = None
        self.online_status.trace_add("write", self._refresh_home_status_text)
        self.status.trace_add("write", self._refresh_home_status_text)
        self.bot_name.trace_add("write", self._refresh_home_status_text)
        self._ui_queue: queue.Queue[tuple[str, Any]] = queue.Queue()
        self._bot_avatar_photo: ImageTk.PhotoImage | None = None
        self._app_icon_photo: ImageTk.PhotoImage | None = None
        self._bot_avatar_item: int | None = None
        self._button_images: dict[str, ImageTk.PhotoImage] = {}
        self._panel_photos: list[ImageTk.PhotoImage] = []
        self._page = "home"
        self._config_window: tk.Toplevel | None = None
        self._build_ui()
        self._set_app_icon()
        self.root.protocol("WM_DELETE_WINDOW", self._close)
        self._start_tray()
        self.root.after(100, self._process_ui_queue)
        if self.config.get("START_MINIMIZED", "").lower() == "true":
            self.root.after(100, self._minimize_to_tray)

    def _resolve_font_family(self) -> str:
        available = set(tkfont.families(self.root))
        return FONT_FAMILY if FONT_FAMILY in available else "Courier New"

    def _build_ui(self) -> None:
        self.style = ttk.Style(self.root)
        try:
            self.style.theme_use("clam")
        except tk.TclError:
            pass
        self.style.configure(
            "Dark.Horizontal.TProgressbar",
            troughcolor=BACKGROUND_COLOR,
            background=ACCENT_COLOR,
            bordercolor=BACKGROUND_COLOR,
            lightcolor=ACCENT_COLOR,
            darkcolor=ACCENT_COLOR,
        )

        self.canvas = tk.Canvas(
            self.root,
            background=BACKGROUND_COLOR,
            highlightthickness=0,
            bd=0,
        )
        self.canvas.pack(fill="both", expand=True)
        self._show_home()

    def _set_app_icon(self) -> None:
        try:
            icon_path = self._app_icon_path
            if icon_path.exists():
                self.root.iconbitmap(str(icon_path))
        except tk.TclError:
            pass

    def _set_windows_app_id(self) -> None:
        if os.name != "nt":
            return
        try:
            app_id = "IGUFelix.NoiteEterna.Bot"
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(app_id)
        except (AttributeError, OSError):
            pass

    def _clear_page(self) -> None:
        current_log = getattr(self, "log", None)
        for widget in self.canvas.winfo_children():
            if widget is not current_log:
                widget.destroy()
        self.canvas.delete("page")
        self.fields = {}
        self._panel_photos = []
        self._bot_avatar_item = None

    def _show_home(self) -> None:
        self._page = "home"
        self.root.geometry("600x400")
        self.root.minsize(600, 400)
        self.root.maxsize(600, 400)
        self._clear_page()
        if LOGO_PATH.exists():
            with Image.open(LOGO_PATH) as image:
                logo = image.convert("RGBA")
                logo.thumbnail((360, 145), Image.Resampling.LANCZOS)
            self._logo_photo = ImageTk.PhotoImage(logo)
            self.canvas.create_image(
                300, 14, image=self._logo_photo,
                anchor="n", tags="page",
            )

        self._ficha_status_item = self.canvas.create_text(
            10, 150, text="[ FICHA ] - " + self.online_status.get().upper(),
            fill=TEXT_COLOR, font=(self.font_family, 8),
            anchor="nw", tags="page",
        )
        self._bot_status_item = self.canvas.create_text(
            10, 166, text="[BOT] " + self.bot_name.get() + " - " + self.status.get().upper(),
            fill=TEXT_COLOR, font=(self.font_family, 8),
            anchor="nw", tags="page",
        )
        self.canvas.create_text(
            10, 184, text="C:\\NOITE\\LOG> REGISTRO DA SESSAO",
            fill=TEXT_COLOR, font=(self.font_family, 8),
            anchor="nw", tags="page",
        )
        self.start_button, self._start_button_item = self._create_action_button(
            325, 180, "[ INICIAR BOT ]", self._start
        )
        self.stop_button, self._stop_button_item = self._create_action_button(
            325, 180, "[ PARAR BOT ]", self._stop
        )
        self.online_button, self._online_button_item = self._create_action_button(
            420, 180, "[ ABRIR FICHA ]", self._start_online
        )
        self.stop_online_button, self._stop_online_button_item = self._create_action_button(
            420, 180, "[ PARAR FICHA ]", self._stop_online
        )
        self.settings_button, self._settings_button_item = self._create_action_button(
            515, 180, "[ CONFIG ]", self._show_config
        )
        self.start_button.configure(font=(self.font_family, 8, "bold"), width=15, padx=0, pady=0)
        self.stop_button.configure(font=(self.font_family, 8, "bold"), width=15, padx=0, pady=0)
        self.online_button.configure(font=(self.font_family, 8, "bold"), width=15, padx=0, pady=0)
        self.stop_online_button.configure(font=(self.font_family, 8, "bold"), width=15, padx=0, pady=0)
        self.settings_button.configure(font=(self.font_family, 8, "bold"), width=11, padx=0, pady=0)
        bot_running = bool(self.service and self.service.thread and self.service.thread.is_alive())
        online_running = bool(self.tunnel_process and self.tunnel_process.poll() is None)
        self._set_bot_button_state(bot_running)
        self._set_online_button_state(online_running)

        self._create_blurred_panel(8, 200, 570, 183)
        if not hasattr(self, "log") or not self.log.winfo_exists():
            self.log = tk.Text(
                self.canvas,
                height=12,
                width=72,
                wrap="word",
                bg=BACKGROUND_COLOR,
                fg=TEXT_COLOR,
                insertbackground=CYAN_COLOR,
                relief="flat",
                bd=0,
                highlightthickness=0,
                padx=8,
                pady=6,
                font=(self.font_family, 8),
            )
            self.log.bind("<Return>", self._run_console_command)
        self.canvas.create_window(
            10,
            202,
            window=self.log,
            width=566,
            height=179,
            anchor="nw",
            tags="page",
        )
        self.log.configure(state="normal")
        if not self.log.get("1.0", "end-1c").strip():
            self.log.insert("end", "C:\\NOITE\\LOG> ")
        self.log.mark_set("insert", "end-1c")
        self.log.focus_set()

    def _refresh_home_status_text(self, *_args: Any) -> None:
        if self._page != "home":
            return
        if self._ficha_status_item is not None:
            self.canvas.itemconfigure(
                self._ficha_status_item,
                text="[ FICHA ] - " + self.online_status.get().upper(),
            )
        if self._bot_status_item is not None:
            self.canvas.itemconfigure(
                self._bot_status_item,
                text="[BOT] " + self.bot_name.get() + " - " + self.status.get().upper(),
            )

    def _build_home_card(self) -> None:
        self.canvas.create_text(
            8, 42, text="[ BOT ]", fill=TEXT_COLOR,
            font=(self.font_family, 8, "bold"),
            anchor="nw", tags="page",
        )
        self.bot_name_label = tk.Label(
            self.canvas, textvariable=self.bot_name,
            bg=BACKGROUND_COLOR, fg=TEXT_COLOR,
            font=(self.font_family, 8, "bold"),
        )
        self.canvas.create_window(
            58, 42, window=self.bot_name_label,
            anchor="nw", tags="page",
        )
        self.canvas.create_text(
            8, 58, text="[ BOT ] STATUS:", fill=TEXT_COLOR,
            font=(self.font_family, 8, "bold"),
            anchor="nw", tags="page",
        )
        self.status_label = tk.Label(
            self.canvas, textvariable=self.status,
            bg=BACKGROUND_COLOR, fg=ACCENT_COLOR,
            font=(self.font_family, 8, "bold"),
        )
        self.canvas.create_window(
            113, 58, window=self.status_label,
            anchor="nw", tags="page",
        )
        self.canvas.create_text(
            8, 76, text="Discord / audio / ficha",
            fill=TEXT_COLOR, font=(self.font_family, 7),
            anchor="nw", tags="page",
        )

    def _create_blurred_panel(
        self,
        x: int,
        y: int,
        width: int,
        height: int,
    ) -> None:
        self.canvas.create_rectangle(
            x,
            y,
            x + width,
            y + height,
            fill=BACKGROUND_COLOR,
            outline=BORDER_COLOR,
            width=1,
            tags="page",
        )
        self.canvas.create_line(
            x,
            y + 8,
            x,
            y,
            x + 8,
            y,
            fill=ACCENT_COLOR,
            width=1,
            tags="page",
        )
        self.canvas.create_line(
            x + width - 8,
            y + height,
            x + width,
            y + height,
            x + width,
            y + height - 8,
            fill=ACCENT_COLOR,
            width=1,
            tags="page",
        )

    def _on_bot_ready(self, user: Any) -> None:
        name = getattr(user, "display_name", None) or getattr(user, "name", None)
        if not name:
            name = str(user)
        avatar_asset = getattr(user, "display_avatar", None) or getattr(
            user, "avatar", None
        )
        avatar = getattr(avatar_asset, "url", None)
        avatar_url = str(avatar) if avatar else ""
        self._ui_queue.put(("identity", (str(name), avatar_url)))

    def _process_ui_queue(self) -> None:
        try:
            while True:
                event, value = self._ui_queue.get_nowait()
                if event == "identity":
                    name, avatar_url = value
                    self._apply_bot_identity(name, avatar_url)
                elif event == "avatar":
                    self._set_bot_avatar(value)
                elif event == "log":
                    self._write_log(value)
        except queue.Empty:
            pass
        if self.root.winfo_exists():
            self.root.after(100, self._process_ui_queue)

    def _apply_bot_identity(self, name: str, avatar_url: str) -> None:
        self.bot_name.set(name)
        self.status.set("Online")
        if avatar_url:
            threading.Thread(
                target=self._download_bot_avatar,
                args=(avatar_url,),
                daemon=True,
            ).start()

    def _download_bot_avatar(self, avatar_url: str) -> None:
        try:
            request = urllib.request.Request(
                avatar_url,
                headers={"User-Agent": "Noite-Eterna-Bot-Desktop"},
            )
            with urllib.request.urlopen(request, timeout=10) as response:
                data = response.read()
            with Image.open(BytesIO(data)) as image:
                avatar = image.convert("RGBA").resize(
                    (96, 96),
                    Image.Resampling.LANCZOS,
                )
        except (OSError, urllib.error.URLError, UnidentifiedImageError) as erro:
            self._append_log(f"ERRO ao carregar avatar do bot: {erro}")
            return
        self._ui_queue.put(("avatar", avatar))

    def _set_bot_avatar(self, avatar: Image.Image) -> None:
        if not self.root.winfo_exists():
            return
        self._bot_avatar_photo = ImageTk.PhotoImage(avatar)
        if self._bot_avatar_item is None:
            return
        self.canvas.itemconfigure(
            self._bot_avatar_item,
            image=self._bot_avatar_photo,
        )

    def _build_home_actions(self) -> None:
        self._build_home_card()
        self.start_button, self._start_button_item = self._create_image_button(
            445, 52, "start", self._start
        )
        self.stop_button, self._stop_button_item = self._create_image_button(
            445, 52, "pause", self._stop
        )
        self.online_button, self._online_button_item = self._create_action_button(
            300, 52, "[ ABRIR FICHA ]", self._start_online
        )
        self.stop_online_button, self._stop_online_button_item = self._create_action_button(
            300, 52, "[ PARAR FICHA  ]", self._stop_online
        )
        self.settings_button, self._settings_button_item = self._create_image_button(
            530, 52, "config", self._show_config
        )
        bot_running = bool(self.service and self.service.thread and self.service.thread.is_alive())
        online_running = bool(self.tunnel_process and self.tunnel_process.poll() is None)
        self._set_bot_button_state(bot_running)
        self._set_online_button_state(online_running)

    def _create_action_button(
        self,
        x: int,
        y: int,
        text: str,
        command: Any,
    ) -> tuple[tk.Button, int]:
        button = tk.Button(
            self.canvas,
            text=text,
            command=command,
            bg=BACKGROUND_COLOR,
            fg=CYAN_COLOR,
            activebackground=CYAN_COLOR,
            activeforeground=BACKGROUND_COLOR,
            relief="solid",
            bd=1,
            borderwidth=0,
            padx=4,
            pady=1,
            highlightthickness=0,
            font=(self.font_family, 9, "bold"),
            cursor="hand2",
        )
        item = self.canvas.create_window(x, y, window=button, anchor="nw", tags="page")
        return button, item

    def _create_image_button(
        self,
        x: int,
        y: int,
        image_key: str,
        command: Any,
    ) -> tuple[tk.Label, int]:
        if image_key not in {"start", "pause", "config"}:
            raise ValueError(f"Botão desconhecido: {image_key}")
        button_labels = {
            "start": "[ INICIAR ]",
            "pause": "[ PAUSAR  ]",
            "config": "[ CONFIG  ]",
        }
        button = tk.Label(
            self.canvas,
            text=button_labels[image_key],
            bg=BACKGROUND_COLOR,
            fg=ACCENT_COLOR,
            bd=0,
            highlightthickness=0,
            font=(self.font_family, 9, "bold"),
            cursor="hand2",
        )
        button.bind(
            "<Button-1>",
            lambda _event: command()
            if str(button.cget("state")) != "disabled"
            else None,
        )
        item = self.canvas.create_window(x, y, window=button, anchor="nw", tags="page")
        return button, item

    def _draw_button_image(self, image_key: str) -> Image.Image:
        if image_key not in {"start", "pause", "config"}:
            raise ValueError(f"Botão desconhecido: {image_key}")
        asset_names = {
            "start": "start_button.png",
            "pause": "pause_button_yellow.png",
            "config": "config_button.png",
        }
        asset_path = ASSETS_DIR / asset_names[image_key]
        if not asset_path.exists():
            raise FileNotFoundError(f"Asset do botão não encontrado: {asset_path}")
        with Image.open(asset_path) as image:
            button_image = image.convert("RGBA").resize(
                (35, 34),
                Image.Resampling.LANCZOS,
            )
        return self._remove_white_background(button_image)

    @staticmethod
    def _remove_white_background(image: Image.Image) -> Image.Image:
        """Remove o fundo branco conectado às bordas sem apagar os ícones brancos."""
        pixels = image.load()
        width, height = image.size
        pending: deque[tuple[int, int]] = deque()
        visited: set[tuple[int, int]] = set()

        for x in range(width):
            pending.extend(((x, 0), (x, height - 1)))
        for y in range(height):
            pending.extend(((0, y), (width - 1, y)))

        while pending:
            x, y = pending.popleft()
            if (x, y) in visited or not (0 <= x < width and 0 <= y < height):
                continue
            visited.add((x, y))
            red, green, blue, _ = pixels[x, y]
            if min(red, green, blue) < 230:
                continue
            pixels[x, y] = (red, green, blue, 0)
            pending.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

        return image

    def _set_button_pair_visibility(
        self,
        start_item: int,
        stop_item: int,
        running: bool,
    ) -> None:
        self.canvas.itemconfigure(start_item, state="hidden" if running else "normal")
        self.canvas.itemconfigure(stop_item, state="normal" if running else "hidden")

    def _set_bot_button_state(self, running: bool) -> None:
        if hasattr(self, "_start_button_item"):
            self._set_button_pair_visibility(
                self._start_button_item,
                self._stop_button_item,
                running,
            )
        self._update_tray_icon()

    def _set_online_button_state(self, running: bool) -> None:
        self.online_status.set("Online" if running else "Offline")
        if hasattr(self, "_online_button_item"):
            self._set_button_pair_visibility(
                self._online_button_item,
                self._stop_online_button_item,
                running,
            )
        self._update_tray_icon()

    def _create_button(
        self,
        x: int,
        y: int,
        text: str,
        command: Any,
        background: str,
        foreground: str,
    ) -> tk.Button:
        button = tk.Button(
            self.canvas,
            text=text,
            command=command,
            bg=background,
            fg=foreground,
            activebackground=foreground,
            activeforeground=background,
            relief="solid",
            bd=1,
            padx=12,
            pady=8,
            font=(self.font_family, 9, "bold"),
            cursor="hand2",
        )
        self.canvas.create_window(x, y, window=button, anchor="nw", tags="page")
        return button

    def _show_config(self) -> None:
        if self._config_window is not None and self._config_window.winfo_exists():
            self._config_window.deiconify()
            self._config_window.lift()
            self._config_window.focus_force()
            return

        config_window = tk.Toplevel(self.root)
        self._config_window = config_window
        config_window.title("Configurações - Noite Eterna")
        try:
            if ICON_PATH.exists():
                config_window.iconbitmap(str(ICON_PATH))
        except tk.TclError:
            pass
        config_window.geometry("380x720")
        config_window.minsize(383, 720)
        config_window.maxsize(383, 720)
        config_window.configure(bg=BACKGROUND_COLOR)
        config_window.protocol("WM_DELETE_WINDOW", self._close_config)
        original_canvas = self.canvas
        self.canvas = tk.Canvas(
            config_window,
            background=BACKGROUND_COLOR,
            highlightthickness=0,
            bd=0,
        )
        self.canvas.pack(fill="both", expand=True)

        if CONFIG_LOGO_PATH.exists():
            with Image.open(CONFIG_LOGO_PATH) as image:
                config_logo = image.convert("RGBA")
                config_logo.thumbnail((320, 70), Image.Resampling.LANCZOS)
            self._config_logo_photo = ImageTk.PhotoImage(config_logo)
            self.canvas.create_image(
                190,
                8,
                image=self._config_logo_photo,
                anchor="n",
                tags="page",
            )

        self._build_config_column(
            18,
            88,
            [
                ("DISCORD_BOT_TOKEN", "Token do bot", True),
                ("PORT", "Porta local", False),
                ("DISCORD_GUILD_ID", "ID do servidor", False),
                ("FRONTEND_ORIGIN", "Origem da ficha", False),
                ("DISCORD_TEXT_CHANNEL_ID", "ID do canal de texto", False),
                ("CLOUDFLARE_TUNNEL_NAME", "Nome do túnel Cloudflare", False),
                ("DISCORD_VOICE_CHANNEL_ID", "ID do canal de voz", False),
                ("CLOUDFLARE_HOSTNAME", "Domínio público", False),
                ("DISCORD_API_KEY", "Chave da API local", False),
                ("SITE_ACCESS_PASSWORD", "Senha da ficha pública", True),
            ],
        )
        self._build_config_options()
        save_button = self._create_button(
            20, 680, "[ SALVAR ]", self._save, BACKGROUND_COLOR, CONFIG_LABEL_COLOR
        )
        save_button.configure(
            relief="flat",
            bd=0,
            padx=0,
            pady=0,
            font=(self.font_family, 8, "bold"),
        )
        self.canvas = original_canvas

    def _close_config(self) -> None:
        if self._config_window is not None and self._config_window.winfo_exists():
            self._config_window.destroy()
        self._config_window = None

    def _build_config_column(
        self,
        x: int,
        y: int,
        fields: list[tuple[str, str, bool]],
    ) -> None:
        for index, (key, label, secret) in enumerate(fields):
            row_y = y + index * 50
            self.canvas.create_text(
                x,
                row_y,
                text=f"[{label.upper()}]",
                fill=CONFIG_LABEL_COLOR,
                font=(FONT_FAMILY, 7, "bold"),
                anchor="w",
                tags="page",
            )
            self.canvas.create_text(
                x,
                row_y + 18,
                text="{",
                fill=TEXT_COLOR,
                font=(self.font_family, 8),
                anchor="w",
                tags="page",
            )
            entry = tk.Entry(
                self.canvas,
                textvariable=self.config_vars[key],
                show="*" if secret else "",
                bg=BACKGROUND_COLOR,
                fg=TEXT_COLOR,
                insertbackground=TEXT_COLOR,
                relief="flat",
                bd=0,
                highlightthickness=0,
                font=(self.font_family, 8),
            )
            self.fields[key] = entry
            self.canvas.create_window(
                x + 10,
                row_y + 14,
                window=entry,
                width=330,
                height=25,
                anchor="nw",
                tags="page",
            )
            self.canvas.create_text(
                x + 345,
                row_y + 18,
                text="}",
                fill=TEXT_COLOR,
                font=(self.font_family, 8),
                anchor="w",
                tags="page",
            )

    def _build_config_options(self) -> None:
        self.canvas.create_text(
            20,
            608,
            text="OPÇÕES DA BANDEJA",
            fill=ACCENT_COLOR,
            font=(FONT_FAMILY, 7, "bold"),
            anchor="w",
            tags="page",
        )
        self._create_checkbutton(
            20,
            627,
            "Minimizar ao fechar",
            "MINIMIZE_TO_TRAY",
        )
        self._create_checkbutton(
            190,
            627,
            "Iniciar minimizado",
            "START_MINIMIZED",
        )

    def _create_checkbutton(self, x: int, y: int, text: str, key: str) -> None:
        variable = tk.BooleanVar(
            value=self.config_vars[key].get().lower() == "true"
        )
        setattr(self, f"_{key.lower()}_variable", variable)
        checkbutton = tk.Checkbutton(
            self.canvas,
            text=f"[{'X' if variable.get() else ' '}] {text}",
            variable=variable,
            indicatoron=False,
            command=lambda: (
                self.config_vars[key].set("true" if variable.get() else "false"),
                checkbutton.configure(
                    text=f"[{'X' if variable.get() else ' '}] {text}"
                ),
            ),
            bg=BACKGROUND_COLOR,
            fg=TEXT_COLOR,
            activebackground=BACKGROUND_COLOR,
            activeforeground=ACCENT_COLOR,
            selectcolor=BACKGROUND_COLOR,
            relief="flat",
            bd=0,
            padx=0,
            pady=0,
            highlightthickness=0,
            font=(self.font_family, 8),
        )
        self.canvas.create_window(x, y, window=checkbutton, anchor="nw", tags="page")

    def _values(self) -> dict[str, str]:
        return {key: variable.get().strip() for key, variable in self.config_vars.items()}

    def _save(self) -> None:
        values = self._values()
        success, message = salvar_config(values)
        if success:
            self.config.update(values)
        if success:
            messagebox.showinfo("Configurações", message)
        else:
            messagebox.showerror("Configurações", message)

    def _start(self) -> None:
        if self.service and self.service.thread and self.service.thread.is_alive():
            self._append_log("O bot já está em execução.")
            return
        try:
            self._save()
            self.service = MusicBotService(
                self.config,
                self._append_log,
                self._on_bot_ready,
            )
            self.service.start()
            self.status.set("Iniciando...")
            self._set_bot_button_state(True)
            self.start_button.configure(state="disabled")
            self.stop_button.configure(state="normal")
            self.root.after(1000, self._check_startup)
        except (RuntimeError, ValueError) as erro:
            self._append_log(str(erro))
            messagebox.showerror("Não foi possível iniciar", str(erro))

    def _check_startup(self) -> None:
        if self.service and self.service.thread and self.service.thread.is_alive():
            return
        self.service = None
        self.status.set("Parado")
        self._set_bot_button_state(False)
        self._set_online_button_state(False)
        self.start_button.configure(state="normal")
        self.stop_button.configure(state="disabled")
        self.online_button.configure(state="normal")
        self.stop_online_button.configure(state="disabled")
        self._append_log(
            "O bot não iniciou. Verifique se outra instância já está usando a porta configurada."
        )

    def _stop(self) -> None:
        if self.service:
            threading.Thread(target=self._stop_background, daemon=True).start()
        self.status.set("Parando...")

    def _stop_background(self) -> None:
        self._stop_online_processes()
        if self.service:
            self.service.stop()
        self.root.after(0, lambda: self.status.set("Parado"))
        self.root.after(0, lambda: self._set_bot_button_state(False))
        self.root.after(0, lambda: self._set_online_button_state(False))
        self.root.after(0, lambda: self.start_button.configure(state="normal"))
        self.root.after(0, lambda: self.stop_button.configure(state="disabled"))
        self.root.after(0, lambda: self.online_button.configure(state="normal"))
        self.root.after(0, lambda: self.stop_online_button.configure(state="disabled"))

    def _start_online(self) -> None:
        if self.tunnel_process and self.tunnel_process.poll() is None:
            self._append_log("O acesso online já está em execução.")
            return
        if not self.service or not self.service.thread or not self.service.thread.is_alive():
            self._append_log("Inicie o bot antes de iniciar o acesso online.")
            return
        valores = self._values()
        senha = valores.get("SITE_ACCESS_PASSWORD", "")
        if not senha:
            self._append_log(
                "Configure uma senha da ficha pública antes de iniciar o acesso online."
            )
            messagebox.showerror(
                "Senha obrigatória",
                "Informe uma senha para proteger o link público da ficha.",
            )
            return
        sucesso, mensagem = salvar_config(valores)
        if not sucesso:
            self._append_log(mensagem)
            messagebox.showerror("Configurações", mensagem)
            return
        self.config.update(valores)
        self._set_online_button_state(True)
        self.online_button.configure(state="disabled")
        self._append_log("Gerando a versão online da ficha...")
        threading.Thread(target=self._start_online_background, daemon=True).start()

    def _start_online_background(self) -> None:
        root = self._find_ficha_root()
        try:
            build = subprocess.run(
                ["npm.cmd", "run", "build"],
                cwd=root,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
            )
            if build.returncode != 0:
                raise RuntimeError("A build da ficha falhou.\n" + build.stderr[-2000:])

            creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            site_environment = os.environ.copy()
            site_environment["SITE_ACCESS_PASSWORD"] = self.config["SITE_ACCESS_PASSWORD"]
            self.site_process = subprocess.Popen(
                ["node", "server/host.js"],
                cwd=root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=creation_flags,
                env=site_environment,
            )
            tunnel_name = self.config.get("CLOUDFLARE_TUNNEL_NAME", "").strip()
            if tunnel_name:
                tunnel_command = ["cloudflared", "tunnel", "run", tunnel_name]
            else:
                descriptor, self._tunnel_config_path = tempfile.mkstemp(
                    prefix="noite-eterna-cloudflared-",
                    suffix=".yml",
                )
                os.close(descriptor)
                with open(self._tunnel_config_path, "w", encoding="utf-8") as config_file:
                    config_file.write("no-autoupdate: true\n")
                tunnel_command = [
                    "cloudflared",
                    "--config",
                    self._tunnel_config_path,
                    "tunnel",
                    "--edge-ip-version",
                    "4",
                    "--url",
                    "http://127.0.0.1:4173",
                ]
            self.tunnel_process = subprocess.Popen(
                tunnel_command,
                cwd=root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=creation_flags,
            )
            self._pending_site_url = None
            self._tunnel_connected = False
            self.root.after(0, lambda: self._set_online_button_state(True))
            self.root.after(0, lambda: self.stop_online_button.configure(state="normal"))
            self._append_log("Acesso online iniciado em segundo plano.")
            self._append_log(
                "A ficha pública está protegida por senha; compartilhe a senha apenas com seus amigos."
            )
            self._read_online_output(self.tunnel_process)
        except (OSError, RuntimeError) as erro:
            self._stop_online_processes()
            self._append_log(f"ERRO ao iniciar acesso online: {erro}")
            self.root.after(0, lambda: self._set_online_button_state(False))
            self.root.after(0, lambda: self.online_button.configure(state="normal"))

    def _find_ficha_root(self) -> str:
        """Find the web-ficha directory in source and installed layouts."""
        bot_directory = Path(__file__).resolve().parent
        candidates = (
            bot_directory.parent.parent / "noite-eterna-ficha",
            bot_directory.parent / "noite-eterna-ficha",
            bot_directory.parent,
        )
        for candidate in candidates:
            if (candidate / "package.json").is_file() and (candidate / "server" / "host.js").is_file():
                return str(candidate)
        raise RuntimeError(
            "A pasta da ficha não foi encontrada. Reinstale o aplicativo para corrigir a estrutura."
        )

    def _read_online_output(self, process: subprocess.Popen[str]) -> None:
        if process.stdout:
            for line in process.stdout:
                texto = line.strip()
                if texto:
                    self._append_log(texto)
                    hostname = self.config.get("CLOUDFLARE_HOSTNAME", "").strip()
                    if "trycloudflare.com" in texto or (hostname and hostname in texto):
                        urls = re.findall(
                            r"https://[A-Za-z0-9.-]+(?:/[^\s|)]*)?",
                            texto,
                        )
                        if urls:
                            self._pending_site_url = urls[0].rstrip(".,")
                    if "Registered tunnel connection" in texto:
                        self._tunnel_connected = True
                        self._publish_pending_site_url()
        if process.poll() is not None:
            self.root.after(0, lambda: self._set_online_button_state(False))
            self.root.after(0, lambda: self.online_button.configure(state="normal"))
            self.root.after(0, lambda: self.stop_online_button.configure(state="disabled"))

    def _publish_pending_site_url(self) -> None:
        if not self._tunnel_connected or not self._pending_site_url or not self.service:
            return
        url = self._pending_site_url
        self._pending_site_url = None
        self._append_log("Túnel conectado; verificando o acesso público à ficha...")
        threading.Thread(
            target=self._verify_and_publish_site_url,
            args=(url,),
            daemon=True,
        ).start()

    def _verify_and_publish_site_url(self, url: str) -> None:
        ultimo_status: int | None = None
        tentativas = 4
        self._append_log(
            "Aguardando a propagação do link público (até 10 segundos)..."
        )
        for _ in range(10):
            if not self.tunnel_process or self.tunnel_process.poll() is not None:
                self._append_log("ERRO: o túnel Cloudflare foi encerrado antes de publicar o link.")
                return
            threading.Event().wait(1)

        self._append_log("Validando o link público...")
        for tentativa in range(1, tentativas + 1):
            if not self.tunnel_process or self.tunnel_process.poll() is not None:
                self._append_log("ERRO: o túnel Cloudflare foi encerrado antes de publicar o link.")
                return
            try:
                health_url = f"{url.rstrip('/')}/__noite_eterna_health"
                with urllib.request.urlopen(health_url, timeout=2) as response:
                    ultimo_status = response.status
                    if 200 <= response.status < 400:
                        self._append_log(
                            "Ficha pública confirmada; enviando o link ao Discord..."
                        )
                        if self.service:
                            self.service.publish_site_link(url)
                        return
            except urllib.error.HTTPError as erro:
                ultimo_status = erro.code
            except (OSError, urllib.error.URLError):
                ultimo_status = None
            if tentativa < tentativas:
                self._append_log(
                    f"Aguardando o acesso público... tentativa {tentativa}/{tentativas}."
                )
                threading.Event().wait(2)
        detalhe = f" (último status HTTP: {ultimo_status})" if ultimo_status else ""
        self._append_log(
            "ERRO: a URL pública não respondeu à ficha"
            f"{detalhe}. O link não foi enviado. Gere um novo túnel e tente novamente."
        )
        self._stop_online_processes()
        self.root.after(0, lambda: self.online_button.configure(state="normal"))
        self.root.after(0, lambda: self.stop_online_button.configure(state="disabled"))

    def _stop_online(self) -> None:
        self._stop_online_processes()
        self._set_online_button_state(False)
        self.online_button.configure(state="normal")
        self.stop_online_button.configure(state="disabled")
        self._append_log("Acesso online encerrado.")

    def _stop_online_processes(self) -> None:
        for process in (self.tunnel_process, self.site_process):
            if process and process.poll() is None:
                process.terminate()
        self.tunnel_process = None
        self.site_process = None
        self._pending_site_url = None
        self._tunnel_connected = False
        if self._tunnel_config_path:
            try:
                os.remove(self._tunnel_config_path)
            except OSError:
                pass
            self._tunnel_config_path = None

    def _start_tray(self) -> None:
        try:
            import pystray
        except ImportError:
            self._append_log("Bandeja indisponível; instale as dependências do requirements.txt.")
            return

        if not TRAY_ICON_PATH.exists():
            self._append_log("Ícone da bandeja não encontrado em assets.")
            return
        if not TRAY_ACTIVE_ICON_PATH.exists() or not TRAY_ICON_PATH.exists():
            self._append_log("Ícones da bandeja não encontrados em assets.")
            return
        self._tray_black_image = Image.open(TRAY_ICON_PATH).convert("RGBA")
        self._tray_yellow_image = Image.open(TRAY_ACTIVE_ICON_PATH).convert("RGBA")
        menu = pystray.Menu(
            pystray.MenuItem("Mostrar janela", lambda: self.root.after(0, self._show_window)),
            pystray.MenuItem("Sair", lambda: self.root.after(0, self._exit)),
        )
        self.tray_icon = pystray.Icon(
            "noite-eterna-bot",
            self._tray_black_image,
            "Noite Eterna Bot",
            menu,
        )
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def _update_tray_icon(self) -> None:
        if not self.tray_icon or self._tray_black_image is None:
            return
        bot_running = bool(
            self.service and self.service.thread and self.service.thread.is_alive()
        )
        ficha_running = bool(
            self.tunnel_process and self.tunnel_process.poll() is None
        )
        self.tray_icon.icon = (
            self._tray_yellow_image
            if bot_running and ficha_running and self._tray_yellow_image is not None
            else self._tray_black_image
        )

    def _minimize_to_tray(self) -> None:
        if self.tray_icon:
            self.root.withdraw()
            self._append_log("Aplicativo minimizado para a bandeja.")

    def _show_window(self) -> None:
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def _append_log(self, text: str) -> None:
        self._ui_queue.put(("log", text))

    def _write_log(self, text: str) -> None:
        self.log.configure(state="normal")
        current = self.log.get("1.0", "end-1c")
        if current and not current.endswith("\n"):
            self.log.insert("end", "\n")
        self.log.insert("end", f"{text}\nC:\\NOITE\\LOG> ")
        self.log.see("end")
        self.log.mark_set("insert", "end-1c")
        if "conectado" in text.lower():
            self.status.set("Conectado")
        elif "erro" in text.lower():
            self.status.set("Erro ao iniciar")
            if hasattr(self, "_start_button_item"):
                self._set_bot_button_state(False)
            if hasattr(self, "start_button"):
                self.start_button.configure(state="normal")
            if hasattr(self, "stop_button"):
                self.stop_button.configure(state="disabled")

    def _run_console_command(self, _event: Any = None) -> str:
        """Executa um comando digitado depois do último prompt do console."""
        content = self.log.get("1.0", "end-1c")
        command = content.rsplit("C:\\NOITE\\LOG> ", 1)[-1].strip()
        if not command:
            return "break"

        self.log.insert("end", "\n")
        self._execute_console_command(command)
        return "break"

    def _execute_console_command(self, command: str) -> None:
        parts = command.split(maxsplit=1)
        action = parts[0].lower()
        argument = parts[1].strip() if len(parts) > 1 else ""

        if action in {"ajuda", "help", "?"}:
            self._append_log(
                "Comandos: ajuda, iniciar, parar, ficha, config, limpar, "
                "skip, loop, stop, play <link>"
            )
        elif action in {"iniciar", "start", "bot"}:
            self._start()
        elif action in {"parar", "pause"}:
            self._stop()
        elif action in {"ficha", "online"}:
            self._start_online()
        elif action in {"config", "configurar"}:
            self._show_config()
        elif action in {"limpar", "clear"}:
            self.log.delete("1.0", "end")
            self.log.insert("end", "C:\\NOITE\\LOG> ")
        elif action in {"play", "skip", "loop", "stop"}:
            self._execute_music_command(action, argument)
        else:
            self._append_log(f"Comando desconhecido: {action}. Digite ajuda.")

    def _execute_music_command(self, action: str, link: str) -> None:
        if not self.service or not self.service.loop:
            self._append_log("ERRO: inicie o bot antes de enviar comandos de musica.")
            return
        if action == "play" and not link:
            self._append_log("Uso: play <link>")
            return

        future = asyncio.run_coroutine_threadsafe(
            self.service.execute_action(action, link),
            self.service.loop,
        )

        def report(result: Any) -> None:
            try:
                response = result.result()
            except (RuntimeError, ValueError, TypeError) as erro:
                self._append_log(f"ERRO no comando {action}: {erro}")
                return
            self._append_log(f"Comando {action} executado: {response}")

        future.add_done_callback(report)

    def _close(self) -> None:
        if self.tray_icon and self.config_vars["MINIMIZE_TO_TRAY"].get().lower() == "true":
            self._minimize_to_tray()
            return
        self._exit()

    def _exit(self) -> None:
        if self.service and self.service.thread and self.service.thread.is_alive():
            if not messagebox.askyesno("Sair", "Parar o bot e fechar o aplicativo?"):
                return
            self.service.stop()
        self._stop_online_processes()
        if self.tray_icon:
            self.tray_icon.stop()
        self._instance_lock.close()
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        BotApp().run()
    except RuntimeError as erro:
        messagebox.showerror("Noite Eterna Bot", str(erro))
