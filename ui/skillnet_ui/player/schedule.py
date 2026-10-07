import polars as pl

HASH_SPAN = 2**32
EVENT_FACTOR = 2654435761
NODE_FACTOR = 2246822519
EARLIEST, WIDTH, GAP = 0.04, 0.88, 0.02
ROUNDS = 16


def spread_within(index: pl.Expr, factor: int) -> pl.Expr:
    share = (index.cast(pl.Int64) * factor % HASH_SPAN) / HASH_SPAN
    return EARLIEST + WIDTH * share


def departures(edges: pl.DataFrame) -> pl.DataFrame:
    ordered = edges.sort("week", "source", "copier").with_row_index("event")
    offset = spread_within(pl.col("event"), EVENT_FACTOR)
    return ordered.with_columns(depart=pl.col("week") + offset)


def first_holdings(states: pl.DataFrame) -> pl.DataFrame:
    return states.group_by("node").agg(first=pl.col("week").min())


def landings(events: pl.DataFrame, first: pl.DataFrame) -> pl.DataFrame:
    landed = events.join(first, left_on="copier", right_on="node")
    earliest = landed.filter(pl.col("week") == pl.col("first")).sort("depart", "event")
    return earliest.group_by("copier").agg(
        landed=pl.col("depart").first(),
        origin=pl.col("source").first(),
        lit_risk=pl.col("high_risk").first() > 0,
    )


def wait_for_sources(events: pl.DataFrame, first: pl.DataFrame) -> pl.DataFrame:
    for _ in range(ROUNDS):
        ready = landings(events, first).select(source="copier", ready=pl.col("landed") + GAP)
        joined = events.join(ready, on="source", how="left", maintain_order="left")
        moved = joined.with_columns(depart=pl.max_horizontal("depart", "ready")).drop("ready")
        if moved["depart"].equals(events["depart"]):
            break
        events = moved
    return events


def light_times(states: pl.DataFrame, events: pl.DataFrame) -> pl.DataFrame:
    first = first_holdings(states)
    own = first.with_columns(own=pl.col("first") + spread_within(pl.col("node"), NODE_FACTOR))
    landed = landings(events, first).rename({"copier": "node"})
    leaving = events.group_by("source").agg(leave=pl.col("depart").min() - GAP)
    lit = own.join(landed, on="node", how="left").join(
        leaving.rename({"source": "node"}), on="node", how="left"
    )
    return lit.select(
        "node",
        "origin",
        lit=pl.min_horizontal(pl.coalesce("landed", "own"), "leave"),
        lit_risk=pl.col("lit_risk").fill_null(False),
    )


def schedule(
    states: pl.DataFrame, edges: pl.DataFrame, travel: float
) -> tuple[pl.DataFrame, pl.DataFrame]:
    events = wait_for_sources(departures(edges), first_holdings(states))
    events = events.with_columns(arrive=pl.col("depart") + travel).sort("depart", "event")
    return events, light_times(states, events)
