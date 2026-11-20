"""Automated Pandas cleaning: normalise names/text, infer types, dedupe, handle missing values."""
import re
import warnings
from typing import Any

import pandas as pd
from pandas.api import types as pdt

from app.core.errors import DataProcessingError

NA_TOKENS = {"", "na", "n/a", "nan", "null", "none", "nil", "-", "--", "?", "#n/a", "#na"}
BOOL_TRUE = {"true", "yes", "t"}
BOOL_FALSE = {"false", "no", "f"}
DATE_LIKE = re.compile(
    r"(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})|(\d{4}-\d{2}-\d{2}T)|"
    r"((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2})|"
    r"(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))",
    re.IGNORECASE,
)
MAX_MISSING_COL_FRAC = 0.6
TYPE_MATCH_THRESHOLD = 0.95


def is_text(s: pd.Series) -> bool:
    return pdt.is_object_dtype(s) or pdt.is_string_dtype(s)


def normalize_columns(cols) -> list[str]:
    seen: dict[str, int] = {}
    out = []
    for i, c in enumerate(cols):
        name = re.sub(r"[^0-9a-zA-Z]+", "_", str(c).strip()).strip("_").lower() or f"column_{i}"
        if name[0].isdigit():
            name = f"c_{name}"
        if name in seen:
            seen[name] += 1
            name = f"{name}_{seen[name]}"
        else:
            seen[name] = 0
        out.append(name)
    return out


def _clean_text(s: pd.Series) -> pd.Series:
    s = s.astype("string").str.strip()
    return s.mask(s.str.lower().isin(NA_TOKENS))


def _strip_number(s: pd.Series) -> pd.Series:
    return s.str.replace(r"[,\$€£%\s]", "", regex=True)


def _infer_type(s: pd.Series) -> tuple[pd.Series, str | None]:
    if not is_text(s):
        return s, None
    nonnull = s.dropna()
    if nonnull.empty:
        return s, None

    lowered = nonnull.str.lower()
    uniq = set(lowered.unique())
    if len(uniq) >= 2 and uniq <= (BOOL_TRUE | BOOL_FALSE):
        return s.str.lower().map(lambda v: pd.NA if pd.isna(v) else v in BOOL_TRUE).astype("boolean"), "boolean"

    stripped = _strip_number(nonnull)
    num = pd.to_numeric(stripped, errors="coerce")
    if num.notna().mean() >= TYPE_MATCH_THRESHOLD and not stripped.str.match(r"^-?0\d+").any():
        full = pd.to_numeric(_strip_number(s), errors="coerce")
        if (full.dropna() % 1 == 0).all():
            full = full.astype("Int64")
        return full, "numeric"

    sample = nonnull.head(200)
    if sample.str.contains(DATE_LIKE).mean() >= 0.9:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                parsed = pd.to_datetime(s, errors="coerce", format="mixed")
            except (ValueError, TypeError):
                parsed = pd.to_datetime(s, errors="coerce")
        if parsed.notna().sum() / len(nonnull) >= TYPE_MATCH_THRESHOLD:
            return parsed, "datetime"

    return s, None


def clean_dataframe(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    if raw.empty or raw.shape[1] == 0:
        raise DataProcessingError("The dataset is empty.")

    df = raw.copy()
    report: dict[str, Any] = {"rows_before": int(df.shape[0]), "columns_before": int(df.shape[1])}

    df.columns = normalize_columns(df.columns)

    for c in df.columns:
        if is_text(df[c]):
            df[c] = _clean_text(df[c])

    df = df.dropna(how="all", axis=0).dropna(how="all", axis=1)
    if df.empty:
        raise DataProcessingError("The dataset contains no usable values.")

    inferred: dict[str, str] = {}
    for c in df.columns:
        df[c], kind = _infer_type(df[c])
        if kind:
            inferred[c] = kind
    report["inferred_types"] = inferred

    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    report["duplicates_removed"] = before - len(df)

    n = len(df)
    drop_cols = [c for c in df.columns if df[c].isna().mean() > MAX_MISSING_COL_FRAC]
    if len(drop_cols) == len(df.columns):
        drop_cols = []  # never drop everything
    df = df.drop(columns=drop_cols)
    report["dropped_columns_mostly_missing"] = drop_cols

    filled: dict[str, dict[str, Any]] = {}
    for c in df.columns:
        nulls = int(df[c].isna().sum())
        if not nulls:
            continue
        s = df[c]
        if pdt.is_numeric_dtype(s):
            value = s.median()
            if pdt.is_integer_dtype(s):
                value = int(round(value))
            df[c] = s.fillna(value)
            filled[c] = {"count": nulls, "strategy": "median", "value": float(value)}
        elif pdt.is_datetime64_any_dtype(s):
            filled[c] = {"count": nulls, "strategy": "left_as_NaT"}
        elif pdt.is_bool_dtype(s):
            mode = s.mode(dropna=True)
            value = bool(mode.iloc[0]) if len(mode) else False
            df[c] = s.fillna(value)
            filled[c] = {"count": nulls, "strategy": "mode", "value": value}
        else:
            df[c] = s.fillna("Unknown")
            filled[c] = {"count": nulls, "strategy": "constant", "value": "Unknown"}
    report["missing_filled"] = filled

    # Plain numpy dtypes are friendlier for generated Pandas code than nullable ones.
    for c in df.columns:
        s = df[c]
        if pdt.is_integer_dtype(s) and not s.isna().any():
            df[c] = s.astype("int64")
        elif pdt.is_float_dtype(s) and not isinstance(s.dtype, pd.CategoricalDtype):
            df[c] = s.astype("float64")
        elif pdt.is_bool_dtype(s) and not s.isna().any():
            df[c] = s.astype(bool)
        elif pdt.is_string_dtype(s) and not isinstance(s.dtype, pd.CategoricalDtype):
            df[c] = s.astype(object)

    report["rows_after"] = int(df.shape[0])
    report["columns_after"] = int(df.shape[1])
    return df, report
