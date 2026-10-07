from bisect import bisect_right
from itertools import pairwise
from typing import Any

import polars as pl

from skillnet_ui.player.calendar import DAILY
from skillnet_ui.player.journey_tree import Tree, grown_tree

DAY_TICKS = (0, 1, 7, 30, 100, 365)
ORIGIN_SIZE = 2.6
UNATTRIBUTED = "No identified copy source, placed around the first adopter"
WEEK_DAYS = 7
CAPTION = (
    "The constellation of a skill is the network formed by its copies, shown day by day from "
    "its first adopter."
)


def day_position(days: list[int], day: float) -> float:
    index = max(bisect_right(days, day) - 1, 0)
    if index + 1 < len(days):
        return index + (day - days[index]) / (days[index + 1] - days[index])
    return index + (day - days[index]) / WEEK_DAYS


def holder_tip(row: dict[str, object]) -> str:
    text = f"Adopter {row['holder']}, day {row['day']:.1f}"
    if row["via"] == "first":
        return f"{text}, first adopter"
    if row["via"] == "copy":
        return f"{text}, copied from adopter {row['parent']}"
    return text


def node_payload(nodes: pl.DataFrame) -> dict[str, object]:
    rows = nodes.to_dicts()
    return {
        "spike": (nodes["via"] == "first").cast(pl.Int64).to_list(),
        "floor": ((nodes["via"] == "first").cast(pl.Float64) * ORIGIN_SIZE).to_list(),
        "tint": [0] * nodes.height,
        "tip": list(range(nodes.height)),
        "tips": [holder_tip(row) for row in rows],
    }


def axis_label(days: list[int]) -> str:
    daily = [day for day, after in pairwise(days) if after - day == 1]
    if not daily or daily[-1] + 1 == days[-1]:
        return "Days since the first adopter"
    return f"Days since the first adopter, weekly after day {daily[-1] + 1}"


def curve_payload(tree: Tree, frames: pl.DataFrame, days: list[int]) -> dict[str, object]:
    lit = sorted(round(time, 4) for time in tree.lit)
    marks = frames.filter(pl.col("mark")).select("day", "holders").rows()
    return {
        "title": "Adopters",
        "axis": axis_label(days),
        "series": [
            {"label": "Adopters", "tone": "risk" if tree.risky else "ink", "t": lit, "y": []}
        ],
        "ends": False,
        "marks": [
            {"t": round(day_position(days, day), 4), "y": held, "label": f"{held:,} by day {day}"}
            for day, held in marks
        ],
        "step": True,
    }


def tree_keys(nodes: pl.DataFrame) -> dict[str, object]:
    return {
        "times": [0],
        "first": [0] * nodes.height,
        "x": nodes["x"].round(4).to_list(),
        "y": nodes["y"].round(4).to_list(),
    }


def day_clock(days: list[int], tree: Tree) -> dict[str, object]:
    close = float(len(days) - 1)
    end = max([close, *(time + DAILY.settle for time in tree.events["a"])])
    places = [(round(day_position(days, day), 4), day) for day in DAY_TICKS]
    return {
        "kind": "day",
        "days": days,
        "start": -DAILY.lead,
        "end": round(end, 4),
        "ticks": [{"t": place, "label": str(day)} for place, day in places if place <= end],
    }


def journey_scene(nodes: pl.DataFrame, frames: pl.DataFrame, risky: bool) -> dict[str, Any]:
    days = frames.sort("frame")["day"].to_list()
    positions = [day_position(days, day) for day in nodes["day"].to_list()]
    tree = grown_tree(nodes, positions, risky)
    tone = "risk" if risky else "glow"
    return {
        "nodes": node_payload(nodes),
        "keys": tree_keys(nodes),
        "types": ["Adopter"],
        "panels": [tree.panel()],
        "clock": day_clock(days, tree),
        "timing": DAILY.payload(),
        "curve": curve_payload(tree, frames, days),
        "legend": [
            {"kind": "star", "spike": 1, "label": "First adopter"},
            {"kind": "link", "tone": tone, "label": "Copied from an earlier adopter"},
            {"kind": "star", "spike": 0, "label": UNATTRIBUTED},
        ],
        "hud": "holders",
    }
