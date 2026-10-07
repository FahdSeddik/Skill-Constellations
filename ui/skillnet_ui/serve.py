import os
import sys
from pathlib import Path

from skillnet_ui.config import load_settings
from skillnet_ui.tables import SchemaError
from skillnet_ui.theme import Tokens, load_tokens, theme_flags

APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
LOCAL_ONLY_FLAGS = [
    "--server.address=127.0.0.1",
    "--server.headless=true",
    "--browser.gatherUsageStats=false",
]
VIEWER_FLAGS = ["--client.toolbarMode=viewer"]


def streamlit_command(tokens: Tokens, extra: list[str]) -> list[str]:
    base = [sys.executable, "-m", "streamlit", "run", str(APP_PATH)]
    return [*base, *LOCAL_ONLY_FLAGS, *VIEWER_FLAGS, *theme_flags(tokens), *extra]


def main() -> None:
    try:
        tokens = load_tokens(load_settings().tokens_path)
    except SchemaError as error:
        raise SystemExit(str(error)) from error
    command = streamlit_command(tokens, sys.argv[1:])
    os.execv(command[0], command)
