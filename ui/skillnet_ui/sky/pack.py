import json

import polars as pl

from skillnet_ui.anim_data import DEFAULT_TYPE
from skillnet_ui.config import Settings
from skillnet_ui.sky.exports import (
    SKY_ARRIVALS,
    SKY_BIRTHS,
    SKY_CLUMP_NODES,
    SKY_COPIES,
    SKY_HUB_TYPES,
    SKY_NODES,
    clump_column,
    named_clumps,
    read_export,
)
from skillnet_ui.tables import SchemaError

ALIGN = 8
WIDTHS = ((pl.UInt8, "u8", 2**8 - 1), (pl.UInt16, "u16", 2**16 - 1), (pl.UInt32, "u32", 2**32 - 1))


def encoded(name: str, series: pl.Series) -> tuple[str, bytes]:
    values = series.cast(pl.Int64)
    low, top = values.min(), values.max()
    if values.null_count() or (isinstance(low, int) and low < 0):
        raise SchemaError(f"the network column '{name}' must hold whole numbers from 0 up")
    reach = top if isinstance(top, int) else 0
    dtype, kind = next((dtype, kind) for dtype, kind, limit in WIDTHS if reach <= limit)
    return kind, values.cast(dtype).to_numpy().tobytes()


def padded(size: int) -> int:
    return -(-size // ALIGN) * ALIGN


def pack_arrays(columns: dict[str, pl.Series]) -> bytes:
    arrays: dict[str, list[object]] = {}
    chunks, offset = [], 0
    for name, series in columns.items():
        kind, data = encoded(name, series)
        arrays[name] = [kind, offset, series.len()]
        chunks.append(data + bytes(padded(len(data)) - len(data)))
        offset += padded(len(data))
    header = json.dumps({"arrays": arrays}, separators=(",", ":")).encode()
    prefix = len(header).to_bytes(4, "little") + header
    return prefix + bytes(padded(len(prefix)) - len(prefix)) + b"".join(chunks)


def node_columns(nodes: pl.DataFrame, typed: pl.DataFrame, types: list[str]) -> dict:
    if not nodes["node"].equals(pl.Series("node", range(1, nodes.height + 1)), check_dtypes=False):
        raise SchemaError("ui_sky_nodes must number its nodes 1 to n in order")
    hub = nodes.join(typed, on="node", how="left")["hub_type"].fill_null(DEFAULT_TYPE)
    tint = hub.replace_strict(types, list(range(len(types))), return_dtype=pl.Int64)
    return {
        "nx": nodes["x"],
        "ny": nodes["y"],
        "nrole": nodes["role"],
        "nfield": nodes["field"],
        "ntype": tint,
    }


def event_columns(births: pl.DataFrame, arrivals: pl.DataFrame, copies: pl.DataFrame) -> dict:
    births = births.sort("hour", "node")
    arrivals = arrivals.sort("hour", "holder", "origin")
    copies = copies.sort("hour", "source", "copier")
    return {
        "bh": births["hour"],
        "bn": births["node"] - 1,
        "bc": births["lineages"],
        "ah": arrivals["hour"],
        "ad": arrivals["holder"] - 1,
        "ao": arrivals["origin"] - 1,
        "ac": arrivals["lineages"],
        "ar": arrivals["high_risk"],
        "ch": copies["hour"],
        "cs": copies["source"] - 1,
        "cc": copies["copier"] - 1,
        "cl": copies["lineages"],
    }


def pack_sky(settings: Settings, types: list[str]) -> bytes:
    nodes = read_export(settings, SKY_NODES).sort("node")
    tables = [read_export(settings, export) for export in (SKY_BIRTHS, SKY_ARRIVALS, SKY_COPIES)]
    columns = node_columns(nodes, read_export(settings, SKY_HUB_TYPES), types)
    members = read_export(settings, SKY_CLUMP_NODES)
    columns["nclump"] = clump_column(nodes, members, named_clumps(settings))
    return pack_arrays({**columns, **event_columns(*tables)})
