import polars as pl
import streamlit as st

from skillnet_ui.config import Settings
from skillnet_ui.exports import JOURNEY_EXPORTS
from skillnet_ui.journey_data import (
    GROUPS,
    journey_lineages,
    lineage_label,
    load_journey,
    present_groups,
)
from skillnet_ui.player.embed import player_html
from skillnet_ui.player.journey import CAPTION, journey_scene
from skillnet_ui.views import export_stamp, exports_ready, show_view, showcase_tokens


@st.cache_data(show_spinner="Preparing the animation", max_entries=16)
def cached_player(settings: Settings, lineage: int, stamp: tuple[int, ...]) -> str:
    nodes, frames = load_journey(settings, lineage)
    risky = bool(journey_lineages(settings).filter(pl.col("lineage") == lineage)["high_risk"].any())
    scene = {**journey_scene(nodes, frames, risky), "caption": CAPTION}
    return player_html(scene, showcase_tokens(settings), f"journey-{lineage}")


def choose_lineage(lineages: pl.DataFrame) -> int:
    groups = present_groups(lineages)
    group = st.sidebar.segmented_control(
        "Skills",
        groups,
        format_func=GROUPS.__getitem__,
        default=groups[0],
        required=True,
        key="journey_group",
    )
    rows = lineages.filter(pl.col("group") == (group or groups[0])).to_dicts()
    labels = {row["lineage"]: lineage_label(row) for row in rows}
    chosen = st.sidebar.selectbox(
        "Skill", list(labels), format_func=labels.__getitem__, key=f"journey_{group}"
    )
    return int(chosen if chosen is not None else rows[0]["lineage"])


def render(settings: Settings) -> None:
    if not exports_ready(settings, JOURNEY_EXPORTS):
        return
    lineages = journey_lineages(settings)
    if lineages.is_empty():
        st.info("No lineage in the exported data has dated adopters.")
        return
    lineage = choose_lineage(lineages)
    stamp = export_stamp(settings, JOURNEY_EXPORTS)
    show_view(showcase_tokens(settings), cached_player(settings, lineage, stamp))
