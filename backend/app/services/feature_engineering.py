"""Basic automated feature engineering: date parts and categorical encoding."""
from typing import Any

import pandas as pd
from pandas.api import types as pdt

from app.services.cleaning import is_text

MAX_CATEGORIES = 50
MAX_CATEGORY_RATIO = 0.5


def engineer_features(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    df = df.copy()
    report: dict[str, Any] = {"date_features": {}, "categorical_columns": {}}

    for c in [c for c in df.columns if pdt.is_datetime64_any_dtype(df[c])]:
        s = df[c]
        if s.notna().sum() == 0:
            continue
        new = {
            f"{c}_year": s.dt.year.astype("Int64"),
            f"{c}_month": s.dt.month.astype("Int64"),
            f"{c}_quarter": s.dt.quarter.astype("Int64"),
            f"{c}_weekday": s.dt.day_name(),
        }
        added = []
        for name, values in new.items():
            if name not in df.columns:
                df[name] = values
                added.append(name)
        report["date_features"][c] = added

    n = len(df)
    for c in [c for c in df.columns if is_text(df[c])]:
        nunique = df[c].nunique(dropna=True)
        if 0 < nunique <= MAX_CATEGORIES and nunique / max(n, 1) <= MAX_CATEGORY_RATIO:
            df[c] = df[c].astype("category")
            # integer code per category, exposed in the report (original labels are kept in the frame)
            report["categorical_columns"][c] = {
                str(cat): int(i) for i, cat in enumerate(df[c].cat.categories)
            }

    return df, report
