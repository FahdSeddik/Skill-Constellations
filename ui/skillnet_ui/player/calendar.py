from dataclasses import dataclass
from datetime import date, timedelta

import polars as pl

WEEK_DAYS = 7
TRAVEL_SECONDS = 0.7
SETTLE_SECONDS = 0.9
BLOOM_SECONDS = 1.4
LEAD_SECONDS = 0.5


def week_origin(weeks: pl.DataFrame) -> date:
    first = weeks.sort("week").row(0, named=True)
    return date.fromisoformat(first["date"]) - timedelta(days=WEEK_DAYS * first["week"] + 6)


def week_position(origin: date, day: date) -> float:
    return (day - origin).days / WEEK_DAYS


def month_starts(first: date, last: date) -> list[date]:
    month = date(first.year, first.month, 1)
    starts = []
    while month <= last:
        if month >= first:
            starts.append(month)
        month = date(month.year + month.month // 12, month.month % 12 + 1, 1)
    return starts


def month_ticks(origin: date, first: date, last: date) -> list[dict[str, object]]:
    return [
        {
            "t": round(week_position(origin, start), 4),
            "label": start.strftime("%b %Y" if index == 0 or start.month == 1 else "%b"),
        }
        for index, start in enumerate(month_starts(first, last))
    ]


def last_day(weeks: pl.DataFrame) -> date:
    return date.fromisoformat(weeks.sort("week")["date"][-1])


def close_week(weeks: pl.DataFrame) -> float:
    return week_position(week_origin(weeks), last_day(weeks) + timedelta(days=1))


def date_clock(weeks: pl.DataFrame, start: float) -> dict[str, object]:
    origin = week_origin(weeks)
    first = origin + timedelta(days=WEEK_DAYS * max(start, 0.0))
    return {
        "kind": "date",
        "origin": origin.isoformat(),
        "last": last_day(weeks).isoformat(),
        "ticks": month_ticks(origin, first, last_day(weeks)),
    }


@dataclass(frozen=True)
class Timing:
    unit_seconds: float

    def units(self, seconds: float) -> float:
        return seconds / self.unit_seconds

    @property
    def travel(self) -> float:
        return self.units(TRAVEL_SECONDS)

    @property
    def settle(self) -> float:
        return self.units(SETTLE_SECONDS)

    @property
    def lead(self) -> float:
        return self.units(LEAD_SECONDS)

    def payload(self) -> dict[str, float]:
        return {
            "unitSeconds": self.unit_seconds,
            "settle": self.settle,
            "bloom": self.units(BLOOM_SECONDS),
            "glide": self.travel,
        }


WEEKLY = Timing(1.0)
DAILY = Timing(0.5)
