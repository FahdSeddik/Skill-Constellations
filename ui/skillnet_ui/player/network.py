from dataclasses import dataclass
from typing import Any

import polars as pl

from skillnet_ui.anim_data import RunFrames, type_label
from skillnet_ui.player.calendar import WEEKLY
from skillnet_ui.player.schedule import schedule

PLACES = 4
ROLES = ("mainly an adopter", "mainly a copy source")


@dataclass(frozen=True)
class Panel:
    run: RunFrames
    title: str


def rounded(series: pl.Series) -> list[float]:
    return series.round(PLACES).to_list()


def node_payload(nodes: pl.DataFrame, types: list[str]) -> dict[str, Any]:
    tint = nodes["hub_type"].replace_strict(types, list(range(len(types))))
    spike = (nodes["role"] == "distributor").cast(pl.Int64)
    return {
        "spike": spike.to_list(),
        "tint": tint.to_list(),
        "tip": (tint * len(ROLES) + spike).to_list(),
        "tips": [f"{type_label(name)}, {role}" for name in types for role in ROLES],
    }


def indexed(frame: pl.DataFrame, nodes: pl.DataFrame, column: str) -> pl.DataFrame:
    places = nodes.select(pl.col("node").alias(column), pl.int_range(pl.len()).alias("index"))
    return frame.join(places, on=column).drop(column).rename({"index": column})


def keyframe_payload(keyframes: pl.DataFrame, nodes: pl.DataFrame) -> dict[str, Any]:
    times = sorted(set(keyframes["keyframe"].to_list()))
    placed = indexed(keyframes, nodes, "node").sort("node", "keyframe")
    starts = placed.group_by("node").agg(pl.col("keyframe").min())
    rank = {time: index for index, time in enumerate(times)}
    first = dict(zip(starts["node"], starts["keyframe"], strict=True))
    return {
        "times": times,
        "first": [rank[first[node]] if node in first else -1 for node in range(nodes.height)],
        "x": rounded(placed["x"]),
        "y": rounded(placed["y"]),
    }


def event_payload(events: pl.DataFrame, nodes: pl.DataFrame) -> dict[str, list]:
    placed = indexed(indexed(events, nodes, "source"), nodes, "copier").sort("depart", "event")
    return {
        "t": rounded(placed["depart"]),
        "a": rounded(placed["arrive"]),
        "s": placed["source"].to_list(),
        "c": placed["copier"].to_list(),
        "r": (placed["high_risk"] > 0).cast(pl.Int64).to_list(),
    }


def light_payload(lights: pl.DataFrame, nodes: pl.DataFrame) -> dict[str, list]:
    origins = indexed(lights.select("node", "origin").drop_nulls(), nodes, "origin")
    every = nodes.select("node").join(lights.drop("origin"), on="node", how="left")
    every = every.join(origins, on="node", how="left")
    every = indexed(every, nodes, "node").sort("node")
    return {
        "lit": every["lit"].fill_null(-1.0).round(PLACES).to_list(),
        "glow": every["lit_risk"].fill_null(False).cast(pl.Int64).to_list(),
        "origin": every["origin"].fill_null(-1).to_list(),
    }


def grow_payload(states: pl.DataFrame, nodes: pl.DataFrame) -> dict[str, Any]:
    placed = indexed(states, nodes, "node").sort("node", "week")
    return {
        "n": placed["node"].to_list(),
        "t": placed["week"].to_list(),
        "v": placed["copies_out"].to_list(),
        "ramp": 1.0,
    }


def panel_payload(panel: Panel, nodes: pl.DataFrame) -> dict[str, Any]:
    run = panel.run
    events, lights = schedule(run.states, run.edges, WEEKLY.travel)
    return {
        "title": panel.title,
        "events": event_payload(events, nodes),
        **light_payload(lights, nodes),
        "grow": grow_payload(run.states, nodes),
        "weeks": {
            "copies": run.weeks["copies"].to_list(),
            "off": run.weeks["off_canvas"].to_list(),
        },
    }
