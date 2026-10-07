from pathlib import Path
from typing import Any

import polars as pl

from skillnet_ui.anim_data import type_label
from skillnet_ui.config import HUB_TYPES, Settings
from skillnet_ui.player.embed import ASSETS as PLAYER_ASSETS
from skillnet_ui.player.embed import SHARED_STYLES, page_html, view_payload
from skillnet_ui.player.network import ROLES
from skillnet_ui.player.scene import hub_types
from skillnet_ui.sky.exports import SKY_WEEKS, clump_payload, named_clumps, read_export
from skillnet_ui.tables import SchemaError
from skillnet_ui.theme import Tokens
from skillnet_ui.views import showcase_tokens

CAPTION = (
    "Each star is a repository, placed near the repositories with which it shares skills. "
    "Each line is an adoption of a skill, drawn from the first adopter of the skill, "
    "and a brighter line is an identified copy, drawn from its source."
)
LEGEND = {
    "items": [
        {"kind": "star", "label": "A repository, brighter when it holds more skills"},
        {"kind": "sparkle", "label": "A new skill"},
        {"kind": "origin", "label": "An adoption, drawn from the first adopter of the skill"},
        {"kind": "copy", "label": "An identified copy, drawn from its source"},
        {"kind": "risk", "label": "An adoption of a high-risk skill"},
        {"kind": "field", "label": "A repository that shares no skill with another repository"},
    ],
    "names": "Cluster names",
    "risk": "Highlight high-risk skills",
}
FIELD = "shares no skill with another repository"
LOADING = "Loading the repository network"
FAILED = "The repository network could not be loaded."
TAIL_WEEKS = 0.4


def sky_scene(
    weeks: pl.DataFrame, types: list[str], url: str, clumps: dict[str, Any]
) -> dict[str, Any]:
    weeks = weeks.sort("week")
    if not weeks["week"].equals(pl.Series("week", range(weeks.height)), check_dtypes=False):
        raise SchemaError("ui_sky_weeks must hold every week from 0 on")
    return {
        "data": url,
        "origin": weeks["date"][0],
        "weeks": {name: weeks[name].to_list() for name in ("births", "arrivals", "copies")},
        "clock": {"start": 0.0, "end": weeks.height + TAIL_WEEKS},
        "types": [type_label(name) for name in types],
        "roles": list(ROLES),
        "field": FIELD,
        "caption": CAPTION,
        "legend": LEGEND,
        "loading": LOADING,
        "failed": FAILED,
        "clumps": clumps,
    }


ASSETS = Path(__file__).resolve().parent / "assets"
SHARED_SCRIPTS = ("easing.js", "palette.js", "clock.js", "controls.js")
SCRIPTS = (
    "data.js",
    "map.js",
    "ledger.js",
    "camera.js",
    "raster.js",
    "lines.js",
    "tones.js",
    "stars.js",
    "clumps.js",
    "light.js",
    "painter.js",
    "compose.js",
    "surface.js",
    "relight.js",
    "hud.js",
    "pointer.js",
    "main.js",
    "playback.js",
    "colour.js",
    "record.js",
    "boot.js",
)


def sky_html(scene: dict[str, object], tokens: Tokens, key: str) -> str:
    styles = [*(PLAYER_ASSETS / name for name in SHARED_STYLES), ASSETS / "sky.css"]
    scripts = [
        *(PLAYER_ASSETS / name for name in SHARED_SCRIPTS),
        *(ASSETS / name for name in SCRIPTS),
    ]
    return page_html(ASSETS / "sky.html", styles, scripts, view_payload(scene, tokens, key))


def sky_view(settings: Settings, url: str, coloured: bool) -> str:
    types = hub_types(HUB_TYPES)
    clumps = {"items": clump_payload(named_clumps(settings)), "coloured": coloured}
    scene = sky_scene(read_export(settings, SKY_WEEKS), types, url, clumps)
    return sky_html(scene, showcase_tokens(settings), "sky")
