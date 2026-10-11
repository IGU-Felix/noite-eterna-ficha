"""Leitura e persistência das configurações locais do bot desktop."""

import os
from collections.abc import Mapping
from pathlib import Path
from typing import Dict, Tuple

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(
    os.environ.get("NOITE_ETERNA_DATA_DIR", BASE_DIR)
).resolve()
ENV_PATH = DATA_DIR / ".env"

DEFAULT_CONFIG: Dict[str, str] = {
    "DISCORD_BOT_TOKEN": "",
    "DISCORD_GUILD_ID": "",
    "DISCORD_VOICE_CHANNEL_ID": "",
    "DISCORD_API_KEY": "chaveforteteste",
    "PORT": "3001",
    "FRONTEND_ORIGIN": "*",
    "MINIMIZE_TO_TRAY": "true",
    "START_MINIMIZED": "false",
}


def carregar_config() -> Dict[str, str]:
    """Carrega o arquivo local e permite sobrescrita por variáveis do sistema."""
    config = dict(DEFAULT_CONFIG)

    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    linha = line.strip()
                    if not linha or linha.startswith("#") or "=" not in linha:
                        continue
                    chave, _, valor = linha.partition("=")
                    chave = chave.strip()
                    valor = valor.strip().strip("\"'")
                    if chave in config:
                        config[chave] = valor
        except OSError as erro:
            print(f"Erro ao carregar .env: {erro}")

    # Também carrega variáveis de ambiente do sistema se disponíveis
    for chave in config:
        if chave in os.environ and os.environ[chave]:
            config[chave] = os.environ[chave]

    config["FRONTEND_ORIGIN"] = config["FRONTEND_ORIGIN"].rstrip("/")
    return config


def salvar_config(novos_valores: Mapping[str, str]) -> Tuple[bool, str]:
    """Salva os novos valores no arquivo .env local."""
    config_atual = carregar_config()
    config_atual.update(novos_valores)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    linhas = [
        "# ====================================================",
        "# Configuracoes do Noite Eterna - Bot de Musica Desktop",
        "# Gerado automaticamente pela interface desktop",
        "# ====================================================",
        "",
        "# Token do Bot gerado no Discord Developer Portal",
        f"DISCORD_BOT_TOKEN={config_atual.get('DISCORD_BOT_TOKEN', '')}",
        "",
        "# ID do Servidor (opcional se o bot estiver em apenas 1 servidor)",
        f"DISCORD_GUILD_ID={config_atual.get('DISCORD_GUILD_ID', '')}",
        "",
        "# ID do Canal de Voz Padrao (opcional)",
        f"DISCORD_VOICE_CHANNEL_ID={config_atual.get('DISCORD_VOICE_CHANNEL_ID', '')}",
        "",
        "# Chave de autenticacao de seguranca local",
        f"DISCORD_API_KEY={config_atual.get('DISCORD_API_KEY', 'chaveforteteste')}",
        "",
        "# Porta do servidor local de roteamento",
        f"PORT={config_atual.get('PORT', '3001')}",
        "",
        "# Origens permitidas para a ficha (* permite qualquer origem)",
        f"FRONTEND_ORIGIN={config_atual.get('FRONTEND_ORIGIN', '*')}",
        "",
        "# Opcoes do aplicativo Desktop",
        f"MINIMIZE_TO_TRAY={str(config_atual.get('MINIMIZE_TO_TRAY', 'true')).lower()}",
        f"START_MINIMIZED={str(config_atual.get('START_MINIMIZED', 'false')).lower()}",
        ""
    ]

    try:
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.write("\n".join(linhas))
        return True, "Configurações salvas com sucesso no arquivo .env local!"
    except OSError as erro:
        return False, f"Erro ao salvar configurações: {erro}"
