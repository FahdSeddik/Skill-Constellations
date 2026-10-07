from dataclasses import dataclass

import polars as pl

from skillnet_ui.config import Settings
from skillnet_ui.exports import (
    ANIM_EDGES,
    ANIM_HUB_TYPES,
    ANIM_KEYFRAMES,
    ANIM_NODES,
    ANIM_STATES,
    ANIM_WEEKS,
    Export,
    load_export,
    scan_export,
)

DEFAULT_TYPE = "Repository"
DEFAULT_LABEL = "Unlabelled repository"
OBSERVED = "observed"


@dataclass(frozen=True)
class Run:
    scenario: str
    seed: int


@dataclass(frozen=True)
class RunFrames:
    weeks: pl.DataFrame
    states: pl.DataFrame
    edges: pl.DataFrame


def type_label(name: str) -> str:
    return DEFAULT_LABEL if name == DEFAULT_TYPE else name


def run_rows(settings: Settings, export: Export, run: Run) -> pl.DataFrame:
    chosen = (pl.col("scenario") == run.scenario) & (pl.col("seed") == run.seed)
    return scan_export(settings, export).filter(chosen).collect()


def exported_or_empty(settings: Settings, export: Export) -> pl.DataFrame:
    frame = load_export(settings, export)
    return pl.DataFrame(schema=dict(export.schema)) if frame is None else frame


def load_nodes(settings: Settings) -> pl.DataFrame:
    nodes = exported_or_empty(settings, ANIM_NODES)
    typed = nodes.join(exported_or_empty(settings, ANIM_HUB_TYPES), on="node", how="left")
    return typed.with_columns(pl.col("hub_type").fill_null(DEFAULT_TYPE)).sort("node")


def load_keyframes(settings: Settings) -> pl.DataFrame:
    return exported_or_empty(settings, ANIM_KEYFRAMES).sort("node", "keyframe")


def load_run(settings: Settings, run: Run) -> RunFrames:
    weeks = run_rows(settings, ANIM_WEEKS, run).sort("week")
    states = run_rows(settings, ANIM_STATES, run).sort("node", "week")
    return RunFrames(weeks, states, run_rows(settings, ANIM_EDGES, run))


def simulated_runs(settings: Settings) -> list[Run]:
    runs = scan_export(settings, ANIM_WEEKS).filter(pl.col("scenario") != OBSERVED)
    pairs = runs.select("scenario", "seed").unique().sort("scenario", "seed").collect()
    return [Run(str(scenario), int(seed)) for scenario, seed in pairs.iter_rows()]
