from typing import Any

import polars as pl

from skillnet_ui.anim_data import DEFAULT_TYPE, type_label
from skillnet_ui.player.calendar import WEEKLY, Timing, close_week, date_clock
from skillnet_ui.player.network import Panel, keyframe_payload, node_payload, panel_payload

RISK_TITLE = "Cumulative adoptions of high-risk skills"
NETWORK_ITEMS: list[dict[str, Any]] = [
    {"kind": "star", "spike": 1, "label": "Mainly a copy source"},
    {"kind": "star", "spike": 0, "label": "Mainly an adopter"},
    {"kind": "link", "tone": "glow", "label": "A copy"},
    {"kind": "link", "tone": "risk", "label": "A high-risk copy"},
]


def hub_types(hub_order: tuple[str, ...]) -> list[str]:
    return [DEFAULT_TYPE, *(name for name in hub_order if name != DEFAULT_TYPE)]


def network_legend(nodes: pl.DataFrame, types: list[str]) -> list[dict[str, Any]]:
    present = set(nodes["hub_type"].to_list())
    tints = [
        {"kind": "tint", "tint": index, "label": type_label(name)}
        for index, name in enumerate(types)
        if name in present
    ]
    return [*NETWORK_ITEMS, *(tints if len(tints) > 1 else [])]


def play_bounds(panels: list[dict], close: float, timing: Timing) -> dict[str, float]:
    lit = [time for panel in panels for time in panel["lit"] if time >= 0]
    arrivals = [time for panel in panels for time in panel["events"]["a"]]
    start = min(lit, default=0.0) - timing.lead
    end = max([close, *(time + timing.settle for time in arrivals)])
    return {"start": round(start, 4), "end": round(end, 4)}


def network_scene(
    nodes: pl.DataFrame,
    keyframes: pl.DataFrame,
    panels: list[Panel],
    curve: dict[str, Any],
    types: list[str],
) -> dict[str, Any]:
    parts = [panel_payload(panel, nodes) for panel in panels]
    weeks = panels[0].run.weeks
    bounds = play_bounds(parts, close_week(weeks), WEEKLY)
    return {
        "nodes": node_payload(nodes, types),
        "keys": keyframe_payload(keyframes, nodes),
        "types": types,
        "panels": parts,
        "clock": {**date_clock(weeks, bounds["start"]), **bounds},
        "timing": WEEKLY.payload(),
        "curve": curve,
        "legend": network_legend(nodes, types),
        "hud": "copies",
    }


def cumulative_series(
    weeks: pl.DataFrame, totals: pl.Series, label: str, tone: str
) -> dict[str, Any]:
    start = int(weeks["week"][0])
    return {
        "label": label,
        "tone": tone,
        "t": [start, *(weeks["week"] + 1).to_list()],
        "y": [0, *totals.to_list()],
    }


def risk_curve(observed: pl.DataFrame, simulated: pl.DataFrame) -> dict[str, Any]:
    lines = [
        cumulative_series(observed, observed["high_risk_total"], "Observed", "ink"),
        cumulative_series(simulated, simulated["high_risk_total"], "Simulated", "glow"),
    ]
    return {"title": RISK_TITLE, "series": lines, "ends": True, "marks": [], "step": False}
