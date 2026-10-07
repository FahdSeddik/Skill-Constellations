import re
import shutil
from pathlib import Path

import polars as pl

from skillnet_ui.config import Settings
from skillnet_ui.journey_data import GROUPS, PUBLISHED_GROUPS, journey_lineages, load_journey
from skillnet_ui.player.embed import player_html
from skillnet_ui.player.journey import CAPTION, journey_scene
from skillnet_ui.site.menu import menu_html, menu_style, with_menu
from skillnet_ui.site.replay import write_audit_page
from skillnet_ui.sky.exports import SKY_CLUMPS
from skillnet_ui.sky.route import packed, sky_stamp
from skillnet_ui.sky.view import sky_view
from skillnet_ui.views import showcase_tokens

DATA_FILE = "sky.bin"
NETWORK_TITLE = "Repository network"
LOGO = Path("media") / "logo.svg"
FILE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")


def published(lineages: pl.DataFrame) -> pl.DataFrame:
    return lineages.filter(pl.col("group").is_in(PUBLISHED_GROUPS))


def page_names(lineages: pl.DataFrame) -> dict[int, str]:
    names = {row["lineage"]: row["name"] for row in published(lineages).to_dicts()}
    if len(set(names.values())) != len(names):
        raise ValueError("two published lineages share a skill name")
    unsafe = [name for name in names.values() if not FILE_NAME.fullmatch(name)]
    if unsafe:
        raise ValueError(f"skill names that cannot be file names: {unsafe}")
    return names


def picker_groups(lineages: pl.DataFrame) -> dict[str, list[str]]:
    rows = published(lineages).sort("rank").to_dicts()
    return {
        GROUPS[group]: [row["name"] for row in rows if row["group"] == group]
        for group in PUBLISHED_GROUPS
    }


def skill_page(settings: Settings, lineages: pl.DataFrame, lineage: int, menu: str) -> str:
    nodes, frames = load_journey(settings, lineage)
    row = lineages.filter(pl.col("lineage") == lineage).row(0, named=True)
    scene = {**journey_scene(nodes, frames, bool(row["high_risk"])), "caption": CAPTION}
    tokens = showcase_tokens(settings)
    page = player_html(scene, tokens, f"journey-{lineage}")
    return with_menu(page, row["name"], menu, menu_style(tokens))


def build_site(settings: Settings) -> None:
    out = settings.root / "dist" / "site"
    logo = (settings.root / LOGO).read_text(encoding="utf-8")
    lineages = journey_lineages(settings)
    groups = picker_groups(lineages)
    tokens = showcase_tokens(settings)
    shutil.rmtree(out / "skills", ignore_errors=True)
    (out / "skills").mkdir(parents=True)
    sky = sky_view(settings, DATA_FILE, False)
    menu = menu_html(groups, None, "", bool(SKY_CLUMPS.path(settings).exists()), logo)
    index = with_menu(sky, NETWORK_TITLE, menu, menu_style(tokens))
    (out / "index.html").write_text(index, "utf-8")
    (out / DATA_FILE).write_bytes(packed(settings, sky_stamp(settings)))
    (out / ".nojekyll").touch()
    for lineage, name in page_names(lineages).items():
        menu = menu_html(groups, name, "../", False, logo)
        page = skill_page(settings, lineages, lineage, menu)
        (out / "skills" / f"{name}.html").write_text(page, "utf-8")
    audit_menu = menu_html(groups, None, "../", False, logo)
    write_audit_page(settings, out / "replay", audit_menu, menu_style(tokens))
