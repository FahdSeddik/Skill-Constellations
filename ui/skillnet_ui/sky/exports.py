from typing import Any

import polars as pl

from skillnet_ui.config import Settings
from skillnet_ui.exports import Export
from skillnet_ui.tables import read_parquet_table

INT, STR = pl.Int64, pl.String

SKY_NODES = Export(
    "ui_sky_nodes",
    {"node": INT, "x": INT, "y": INT, "hour": INT, "role": INT, "field": INT},
)
SKY_HUB_TYPES = Export("ui_sky_hub_types", {"node": INT, "hub_type": STR}, stage="ui")
SKY_BIRTHS = Export("ui_sky_births", {"hour": INT, "node": INT, "lineages": INT})
SKY_ARRIVALS = Export(
    "ui_sky_arrivals",
    {"hour": INT, "holder": INT, "origin": INT, "lineages": INT, "high_risk": INT},
)
SKY_COPIES = Export("ui_sky_copies", {"hour": INT, "source": INT, "copier": INT, "lineages": INT})
SKY_WEEKS = Export(
    "ui_sky_weeks",
    {"week": INT, "date": STR, "births": INT, "arrivals": INT, "copies": INT},
)
SKY_EXPORTS = (SKY_NODES, SKY_BIRTHS, SKY_ARRIVALS, SKY_COPIES, SKY_WEEKS)
SKY_CLUMP_NODES = Export("ui_sky_clump_nodes", {"node": INT, "clump": INT})
SKY_CLUMPS = Export(
    "ui_sky_clumps",
    {"clump": INT, "size": INT, "x": INT, "y": INT, "colour": INT, "terms": STR},
)
SKY_CLUMP_LABELS = Export(
    "ui_sky_clump_labels", {"clump": INT, "label": STR, "sentence": STR}, stage="ui"
)
SKY_CLUMP_EXPORTS = (SKY_CLUMP_NODES, SKY_CLUMPS, SKY_CLUMP_LABELS)
CLUMP_PAYLOAD = ("x", "y", "size", "colour", "label")


def read_export(settings: Settings, export: Export) -> pl.DataFrame:
    path = export.path(settings)
    if not path.exists():
        return pl.DataFrame(schema=dict(export.schema))
    return read_parquet_table(path, export.schema)


def named_clumps(settings: Settings) -> pl.DataFrame:
    clumps = read_export(settings, SKY_CLUMPS).sort("clump")
    labels = read_export(settings, SKY_CLUMP_LABELS).filter(pl.col("label").str.strip_chars() != "")
    joined = clumps.join(labels.select("clump", "label"), on="clump", how="left")
    return joined.with_columns(
        position=pl.int_range(1, pl.len() + 1),
        label=pl.col("label").str.strip_chars().fill_null(""),
    )


def clump_column(nodes: pl.DataFrame, members: pl.DataFrame, clumps: pl.DataFrame) -> pl.Series:
    positions = members.join(clumps.select("clump", "position"), on="clump", how="inner")
    placed = nodes.select("node").join(positions.select("node", "position"), on="node", how="left")
    return placed["position"].fill_null(0).alias("nclump")


def clump_payload(clumps: pl.DataFrame) -> list[dict[str, Any]]:
    return clumps.select(CLUMP_PAYLOAD).to_dicts()
