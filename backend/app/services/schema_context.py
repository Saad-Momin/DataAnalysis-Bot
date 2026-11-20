"""Compact, LLM-friendly description of a DataFrame (schema + value hints)."""
import pandas as pd
from pandas.api import types as pdt

MAX_COLUMNS = 80
MAX_CHOICES = 15


def _short(v, n: int = 40) -> str:
    s = str(v)
    return s if len(s) <= n else s[: n - 1] + "…"


def describe_dataframe(df: pd.DataFrame) -> str:
    lines = [f"Rows: {len(df)}, Columns: {df.shape[1]}"]
    for c in list(df.columns)[:MAX_COLUMNS]:
        s = df[c]
        nulls = int(s.isna().sum())
        extra = ""
        if pdt.is_bool_dtype(s):
            extra = f"counts={s.value_counts().to_dict()}"
        elif pdt.is_datetime64_any_dtype(s):
            extra = f"range {s.min()} to {s.max()}" if s.notna().any() else "all missing"
        elif pdt.is_numeric_dtype(s):
            extra = f"min={s.min():.4g}, max={s.max():.4g}, mean={s.mean():.4g}" if s.notna().any() else "all missing"
        else:
            nunique = int(s.nunique(dropna=True))
            if nunique <= MAX_CHOICES:
                extra = f"{nunique} values: " + ", ".join(_short(v) for v in s.dropna().unique()[:MAX_CHOICES])
            else:
                extra = f"{nunique} distinct, e.g. " + ", ".join(_short(v) for v in s.dropna().unique()[:3])
        lines.append(f"- {c} [{s.dtype}]{' nulls=' + str(nulls) if nulls else ''}: {extra}")
    if df.shape[1] > MAX_COLUMNS:
        lines.append(f"... {df.shape[1] - MAX_COLUMNS} more columns omitted")
    return "\n".join(lines)
