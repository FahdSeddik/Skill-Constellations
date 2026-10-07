from dataclasses import dataclass, field
from typing import Any

import polars as pl

from skillnet_ui.player.calendar import DAILY
from skillnet_ui.player.schedule import GAP

EVENT_KEYS = ("t", "a", "s", "c", "r")


@dataclass
class Tree:
    risky: bool
    lit: list[float] = field(default_factory=list)
    origin: list[int] = field(default_factory=list)
    events: dict[str, list] = field(default_factory=lambda: {key: [] for key in EVENT_KEYS})
    grow: dict[str, list] = field(default_factory=lambda: {"n": [], "t": [], "v": []})

    def link(self, parent: int, child: int, wanted: float) -> float:
        depart = max(wanted, self.lit[parent] + GAP)
        values = (depart, depart + DAILY.travel, parent, child, int(self.risky))
        for key, value in zip(EVENT_KEYS, values, strict=True):
            self.events[key].append(round(value, 4) if isinstance(value, float) else value)
        return depart

    def count_copy(self, parent: int, time: float, copies: dict[int, int]) -> None:
        copies[parent] = copies.get(parent, 0) + 1
        values = (parent, round(time, 4), copies[parent])
        for key, value in zip(("n", "t", "v"), values, strict=True):
            self.grow[key].append(value)

    def panel(self) -> dict[str, Any]:
        order = sorted(range(len(self.events["t"])), key=self.events["t"].__getitem__)
        events = {key: [values[i] for i in order] for key, values in self.events.items()}
        grow = sorted(zip(*self.grow.values(), strict=True))
        columns = [list(column) for column in zip(*grow, strict=True)] or [[], [], []]
        return {
            "title": "",
            "events": events,
            "lit": [round(time, 4) for time in self.lit],
            "glow": [int(self.risky)] * len(self.lit),
            "origin": self.origin,
            "grow": {**dict(zip(("n", "t", "v"), columns, strict=True)), "ramp": 1.0},
        }


def grown_tree(nodes: pl.DataFrame, positions: list[float], risky: bool) -> Tree:
    tree = Tree(risky)
    copies: dict[int, int] = {}
    rows = nodes.select("parent", "via").to_dicts()
    for index, (row, wanted) in enumerate(zip(rows, positions, strict=True)):
        parent = -1 if row["parent"] is None else int(row["parent"]) - 1
        tree.origin.append(parent)
        if row["via"] != "copy":
            tree.lit.append(wanted)
            continue
        tree.lit.append(tree.link(parent, index, wanted))
        tree.count_copy(parent, tree.lit[-1], copies)
    return tree
