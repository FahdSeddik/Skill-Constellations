import polars as pl

from skillnet_ui.config import Settings
from skillnet_ui.exports import (
    JOURNEY_FRAMES,
    JOURNEY_LINEAGES,
    JOURNEY_NODES,
    Export,
    load_export,
    scan_export,
)

GROUPS = {
    "most_held": "Most adopted",
    "high_risk": "Most adopted high-risk",
    "malicious": "Confirmed malicious",
}
PUBLISHED_GROUPS = ("most_held", "high_risk")


def journey_lineages(settings: Settings) -> pl.DataFrame:
    lineages = load_export(settings, JOURNEY_LINEAGES)
    if lineages is None:
        return pl.DataFrame(schema=dict(JOURNEY_LINEAGES.schema))
    return lineages.sort("rank")


def present_groups(lineages: pl.DataFrame) -> list[str]:
    found = set(lineages["group"].to_list())
    return [group for group in GROUPS if group in found]


def lineage_label(row: dict[str, object]) -> str:
    holders = f"{row['holders']:,} adopters"
    if row["group"] == "malicious":
        return f"Confirmed malicious lineage {row['rank']}, {holders}"
    risk = ", high-risk" if row["high_risk"] else ""
    return f"#{row['rank']} {row['name']}, {holders}{risk}"


def lineage_rows(settings: Settings, export: Export, lineage: int) -> pl.DataFrame:
    return scan_export(settings, export).filter(pl.col("lineage") == lineage).collect()


def load_journey(settings: Settings, lineage: int) -> tuple[pl.DataFrame, pl.DataFrame]:
    nodes = lineage_rows(settings, JOURNEY_NODES, lineage).sort("holder")
    frames = lineage_rows(settings, JOURNEY_FRAMES, lineage).sort("frame")
    return nodes, frames
