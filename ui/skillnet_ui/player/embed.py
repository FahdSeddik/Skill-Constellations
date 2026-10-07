import json
from collections.abc import Iterable
from pathlib import Path
from string import Template

from skillnet_ui.config import APP_NAME
from skillnet_ui.theme import Tokens

ASSETS = Path(__file__).resolve().parent / "assets"
SHARED_STYLES = ("overlay.css",)
SCRIPTS = (
    "easing.js",
    "palette.js",
    "sprites.js",
    "clock.js",
    "growth.js",
    "motion.js",
    "run.js",
    "view.js",
    "camera.js",
    "trails.js",
    "gl_trails.js",
    "links.js",
    "exposure.js",
    "stars.js",
    "hud.js",
    "audit.js",
    "sky.js",
    "legend.js",
    "axis.js",
    "curve.js",
    "curve_base.js",
    "curve_labels.js",
    "controls.js",
    "pointer.js",
    "main.js",
    "record.js",
)


def palette(tokens: Tokens) -> dict[str, object]:
    return {**dict(tokens.showcase), "tints": list(tokens.colors.categorical)}


def view_payload(scene: dict[str, object], tokens: Tokens, key: str) -> str:
    payload = {
        **scene,
        "palette": palette(tokens),
        "font": tokens.ui_font,
        "labelFont": tokens.label_font,
        "key": key,
        "brand": APP_NAME,
    }
    return json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")


def page_html(template: Path, styles: Iterable[Path], scripts: Iterable[Path], data: str) -> str:
    style = "\n".join(path.read_text(encoding="utf-8") for path in styles)
    code = "\n".join(f"<script>\n{path.read_text(encoding='utf-8')}</script>" for path in scripts)
    page = Template(template.read_text(encoding="utf-8"))
    return page.substitute(style=style, data=data, scripts=code)


def player_html(scene: dict[str, object], tokens: Tokens, key: str) -> str:
    styles = [ASSETS / name for name in (*SHARED_STYLES, "player.css")]
    scripts = [ASSETS / name for name in SCRIPTS]
    return page_html(ASSETS / "player.html", styles, scripts, view_payload(scene, tokens, key))
