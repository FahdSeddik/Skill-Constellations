from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

import polars as pl
import streamlit as st

from skillnet_ui.config import Settings
from skillnet_ui.tables import Schema, check_schema, read_parquet_table


@dataclass(frozen=True)
class Export:
    name: str
    schema: Schema
    stage: str = "compute"

    @property
    def file_name(self) -> str:
        return f"{self.name}.parquet"

    def path(self, settings: Settings) -> Path:
        return settings.export_dir(self.stage) / self.file_name


@st.cache_data(show_spinner=False)
def read_cached(path: str, modified_ns: int, _schema: Schema) -> pl.DataFrame:
    return read_parquet_table(Path(path), _schema)


def load_export(settings: Settings, export: Export) -> pl.DataFrame | None:
    path = export.path(settings)
    if not path.exists():
        return None
    return read_cached(str(path), path.stat().st_mtime_ns, export.schema)


def load_exports(settings: Settings, exports: Iterable[Export]) -> dict[str, pl.DataFrame | None]:
    return {export.name: load_export(settings, export) for export in exports}


def scan_export(settings: Settings, export: Export) -> pl.LazyFrame:
    path = export.path(settings)
    check_schema(pl.read_parquet_schema(path), export.schema, path)
    return pl.scan_parquet(path).select(list(export.schema)).cast(pl.Schema(export.schema))


def is_exported(settings: Settings, export: Export) -> bool:
    return export.path(settings).exists()


STR, INT, FLT, BOOL = pl.String, pl.Int64, pl.Float64, pl.Boolean
RUN = {"scenario": STR, "seed": INT}

ANIM_NODES = Export("ui_anim_nodes", {"node": INT, "role": STR})
ANIM_HUB_TYPES = Export("ui_anim_hub_types", {"node": INT, "hub_type": STR}, stage="ui")
ANIM_STATES = Export("ui_anim_states", {**RUN, "week": INT, "node": INT, "copies_out": INT})
ANIM_EDGES = Export(
    "ui_anim_edges",
    {**RUN, "week": INT, "source": INT, "copier": INT, "lineages": INT, "high_risk": INT},
)
ANIM_WEEKS = Export(
    "ui_anim_weeks",
    {
        **RUN,
        "week": INT,
        "date": STR,
        "copies": INT,
        "off_canvas": INT,
        "high_risk_total": INT,
    },
)
ANIM_KEYFRAMES = Export(
    "ui_anim_keyframes", {"keyframe": INT, "node": INT, "x": FLT, "y": FLT}, stage="ui"
)
ANIM_AUDITED = Export("ui_anim_audited", {"scenario": STR, "node": INT})
JOURNEY_LINEAGES = Export(
    "ui_journey_lineages",
    {"lineage": INT, "group": STR, "rank": INT, "name": STR, "holders": INT, "high_risk": BOOL},
)
JOURNEY_NODES = Export(
    "ui_journey_nodes",
    {
        "lineage": INT,
        "holder": INT,
        "parent": INT,
        "day": FLT,
        "frame": INT,
        "via": STR,
        "x": FLT,
        "y": FLT,
    },
)
JOURNEY_FRAMES = Export(
    "ui_journey_frames", {"lineage": INT, "frame": INT, "day": INT, "holders": INT, "mark": BOOL}
)

NETWORK_EXPORTS = (ANIM_NODES, ANIM_STATES, ANIM_EDGES, ANIM_WEEKS, ANIM_KEYFRAMES)
JOURNEY_EXPORTS = (JOURNEY_LINEAGES, JOURNEY_NODES, JOURNEY_FRAMES)
