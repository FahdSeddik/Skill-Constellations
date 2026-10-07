from collections.abc import Mapping
from pathlib import Path

import polars as pl

Schema = Mapping[str, pl.DataType | type[pl.DataType]]


class SchemaError(ValueError):
    pass


def require_field[T](mapping: object, key: str, kind: type[T]) -> T:
    if not isinstance(mapping, Mapping):
        raise SchemaError(f"expected a mapping holding '{key}'")
    if key not in mapping:
        raise SchemaError(f"missing key '{key}'")
    value = mapping[key]
    if not isinstance(value, kind) or (kind is int and isinstance(value, bool)):
        raise SchemaError(f"key '{key}' must be {kind.__name__}, got {type(value).__name__}")
    return value


def dtype_matches(actual: pl.DataType, expected: pl.DataType | type[pl.DataType]) -> bool:
    if expected.is_integer():
        return actual.is_integer()
    if expected.is_float():
        return actual.is_numeric()
    return actual == expected


def check_schema(actual: Mapping[str, pl.DataType], expected: Schema, source: Path) -> None:
    for name, dtype in expected.items():
        if name not in actual:
            raise SchemaError(f"{source}: missing column '{name}'")
        if not dtype_matches(actual[name], dtype):
            raise SchemaError(f"{source}: column '{name}' is {actual[name]}, expected {dtype}")


def read_parquet_table(path: Path, schema: Schema) -> pl.DataFrame:
    check_schema(pl.read_parquet_schema(path), schema, path)
    return pl.read_parquet(path, columns=list(schema)).cast(pl.Schema(schema))
