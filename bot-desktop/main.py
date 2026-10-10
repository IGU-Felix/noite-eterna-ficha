"""Interface desktop mínima do Noite Eterna Bot."""

from __future__ import annotations

import logging
import threading
import tkinter as tk
from tkinter import messagebox, ttk
from typing import Any

from config import carregar_config, salvar_config
from music_service import MusicBotService


class BotApp:
    def __init__(self) -> None:
        self.config = carregar_config()
        self.service: MusicBotService | None = None
        self.tray_icon: Any = None
        self.root = tk.Tk()
        self.root.title("Noite Eterna - Bot de Música")
        self.root.geometry("560x520")
        self.root.minsize(500, 420)
        self.fields: dict[str, ttk.Entry] = {}
        self.status = tk.StringVar(value="Parado")
        self._build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self._close)
        self._start_tray()
        if self.config.get("START_MINIMIZED", "").lower() == "true":
            self.root.after(100, self._minimize_to_tray)

    def _build_ui(self) -> None:
        frame = ttk.Frame(self.root, padding=18)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Noite Eterna", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        ttk.Label(frame, text="Configuração local do bot de música").pack(anchor="w", pady=(0, 16))

        fields = [
            ("DISCORD_BOT_TOKEN", "Token do bot", True),
            ("DISCORD_GUILD_ID", "ID do servidor (opcional)", False),
            ("DISCORD_VOICE_CHANNEL_ID", "ID do canal de voz (opcional)", False),
            ("DISCORD_API_KEY", "Chave da API local", False),
            ("PORT", "Porta local", False),
            ("FRONTEND_ORIGIN", "Origem da ficha", False),
        ]
        for key, label, secret in fields:
            row = ttk.Frame(frame)
            row.pack(fill="x", pady=4)
            ttk.Label(row, text=label, width=25).pack(side="left")
            entry = ttk.Entry(row, show="*" if secret else "")
            entry.insert(0, self.config.get(key, ""))
            entry.pack(side="left", fill="x", expand=True)
            self.fields[key] = entry

        actions = ttk.Frame(frame)
        actions.pack(fill="x", pady=14)
        ttk.Button(actions, text="Salvar configurações", command=self._save).pack(side="left")
        self.start_button = ttk.Button(actions, text="Iniciar bot", command=self._start)
        self.start_button.pack(side="left", padx=8)
        self.stop_button = ttk.Button(actions, text="Parar bot", command=self._stop, state="disabled")
        self.stop_button.pack(side="left")
        ttk.Label(frame, textvariable=self.status).pack(anchor="w")

        ttk.Label(frame, text="Log").pack(anchor="w", pady=(14, 4))
        self.log = tk.Text(frame, height=10, state="disabled", wrap="word")
        self.log.pack(fill="both", expand=True)

    def _values(self) -> dict[str, str]:
        return {key: entry.get().strip() for key, entry in self.fields.items()}

    def _save(self) -> None:
        success, message = salvar_config(self._values())
        if success:
            self.config.update(self._values())
        messagebox.showinfo("Configurações", message) if success else messagebox.showerror("Configurações", message)

    def _start(self) -> None:
        try:
            self._save()
            self.service = MusicBotService(self.config, self._append_log)
            self.service.start()
            self.status.set("Iniciando...")
            self.start_button.configure(state="disabled")
            self.stop_button.configure(state="normal")
        except (RuntimeError, ValueError) as erro:
            self._append_log(str(erro))
            messagebox.showerror("Não foi possível iniciar", str(erro))

    def _stop(self) -> None:
        if self.service:
            threading.Thread(target=self._stop_background, daemon=True).start()
        self.status.set("Parando...")

    def _stop_background(self) -> None:
        if self.service:
            self.service.stop()
        self.root.after(0, lambda: self.status.set("Parado"))
        self.root.after(0, lambda: self.start_button.configure(state="normal"))
        self.root.after(0, lambda: self.stop_button.configure(state="disabled"))

    def _start_tray(self) -> None:
        try:
            import pystray
            from PIL import Image, ImageDraw
        except ImportError:
            self._append_log("Bandeja indisponível; instale as dependências do requirements.txt.")
            return

        image = Image.new("RGB", (64, 64), "#161323")
        drawer = ImageDraw.Draw(image)
        drawer.text((15, 20), "NE", fill="#e7c86e")
        menu = pystray.Menu(
            pystray.MenuItem("Mostrar janela", lambda: self.root.after(0, self._show_window)),
            pystray.MenuItem("Sair", lambda: self.root.after(0, self._exit)),
        )
        self.tray_icon = pystray.Icon("noite-eterna-bot", image, "Noite Eterna Bot", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def _minimize_to_tray(self) -> None:
        if self.tray_icon:
            self.root.withdraw()
            self._append_log("Aplicativo minimizado para a bandeja.")

    def _show_window(self) -> None:
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def _append_log(self, text: str) -> None:
        self.root.after(0, self._write_log, text)

    def _write_log(self, text: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", f"{text}\n")
        self.log.see("end")
        self.log.configure(state="disabled")
        if "conectado" in text.lower():
            self.status.set("Conectado")
        elif "erro" in text.lower():
            self.status.set("Erro ao iniciar")
            self.start_button.configure(state="normal")
            self.stop_button.configure(state="disabled")

    def _close(self) -> None:
        if self.tray_icon:
            self._minimize_to_tray()
            return
        self._exit()

    def _exit(self) -> None:
        if self.service and self.service.thread and self.service.thread.is_alive():
            if not messagebox.askyesno("Sair", "Parar o bot e fechar o aplicativo?"):
                return
            self.service.stop()
        if self.tray_icon:
            self.tray_icon.stop()
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    BotApp().run()
