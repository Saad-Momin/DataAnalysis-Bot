import pandas as pd
import pytest

from app.core.errors import DataProcessingError
from app.services.cleaning import clean_dataframe
from app.services.feature_engineering import engineer_features


def test_cleaning_infers_types_and_fixes_data():
    raw = pd.DataFrame(
        {
            "Order ID": ["1", "2", "2", None],
            "When": ["2024-01-05", "2024-02-06", "2024-02-06", None],
            "Sales ($)": ["1,200.50", "N/A", "N/A", None],
            "Active": ["yes", "no", "no", None],
            "Zip": ["01234", "02345", "02345", None],
        }
    )
    df, rep = clean_dataframe(raw)
    assert list(df.columns) == ["order_id", "when", "sales", "active", "zip"]
    assert rep["duplicates_removed"] == 1
    assert pd.api.types.is_datetime64_any_dtype(df["when"])
    assert df["sales"].dtype == "float64" and df["sales"].notna().all()
    assert df["active"].dtype == bool
    assert df["zip"].iloc[0] == "01234"  # leading zeros preserved


def test_empty_dataset_rejected():
    with pytest.raises(DataProcessingError):
        clean_dataframe(pd.DataFrame({"a": [None, None]}))


def test_feature_engineering_adds_date_parts_and_categories():
    df, _ = clean_dataframe(
        pd.DataFrame({"d": ["2024-01-05", "2024-02-06"] * 10, "k": ["a", "b"] * 10, "v": [str(i) for i in range(20)]})
    )
    out, rep = engineer_features(df)
    assert {"d_year", "d_month", "d_quarter", "d_weekday"} <= set(out.columns)
    assert str(out["k"].dtype) == "category" and "k" in rep["categorical_columns"]
