from datetime import date
from typing import Any

import polars as pl

from skillnet_ui.anim_data import RunFrames
from skillnet_ui.player.calendar import week_origin, week_position
from skillnet_ui.player.network import Panel, indexed
from skillnet_ui.player.scene import cumulative_series, network_scene

AUDIT_DAY = date(2026, 4, 1)
PANELS = {
    "stars": "100 most starred audited, 1 April 2026",
    "model": "100 ranked by the model audited, 1 April 2026",
}
SERIES = (
    ("none", "No audit", "muted"),
    ("stars", "100 most starred", "mark"),
    ("model", "Model", "glow"),
)
DASHED = "none"
SCENARIOS = tuple(scenario for scenario, _, _ in SERIES)
TITLE = "High-risk adoptions so far"
RULE = "Audit"
RING = "An audited repository"
CAPTION = (
    "One run of the spread model. Both panels share their random draws, and rings mark audited "
    "repositories among those drawn."
)


def audit_week(runs: dict[str, RunFrames]) -> float:
    return round(week_position(week_origin(runs["none"].weeks), AUDIT_DAY), 4)


def audit_curve(runs: dict[str, RunFrames], week: float) -> dict[str, Any]:
    series = []
    for scenario, label, tone in SERIES:
        weeks = runs[scenario].weeks
        line = cumulative_series(weeks, weeks["high_risk_total"], label, tone)
        series.append({**line, "dashed": scenario == DASHED})
    return {
        "title": TITLE,
        "series": series,
        "ends": False,
        "values": False,
        "marks": [],
        "rules": [{"t": week, "label": RULE}],
        "step": False,
    }


def ringed(audited: pl.DataFrame, scenario: str, nodes: pl.DataFrame) -> list[int]:
    chosen = audited.filter(pl.col("scenario") == scenario).drop_nulls("node").select("node")
    return indexed(chosen, nodes, "node").sort("node")["node"].to_list()


def audit_scene(
    nodes: pl.DataFrame,
    keyframes: pl.DataFrame,
    runs: dict[str, RunFrames],
    audited: pl.DataFrame,
    types: list[str],
) -> dict[str, Any]:
    week = audit_week(runs)
    panels = [Panel(runs[scenario], title) for scenario, title in PANELS.items()]
    scene = network_scene(nodes, keyframes, panels, audit_curve(runs, week), types)
    for part, scenario in zip(scene["panels"], PANELS, strict=True):
        part.update(audited=ringed(audited, scenario, nodes), auditAt=week)
    copies = [item for item in scene["legend"] if item["kind"] == "link"]
    lines = [
        {"kind": "line", "tone": tone, "label": label, "dashed": scenario == DASHED}
        for scenario, label, tone in SERIES
    ]
    legend = [*copies, {"kind": "ring", "label": RING}, *lines]
    return {**scene, "legend": legend, "caption": CAPTION}
