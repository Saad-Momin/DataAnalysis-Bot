import uuid

import pandas as pd

from app.core.errors import DataProcessingError
from app.services import dataset_store
from app.services.cleaning import clean_dataframe
from app.services.feature_engineering import engineer_features


def new_dataset_id() -> str:
    return uuid.uuid4().hex


def run_pipeline(
    dataset_id: str, raw: pd.DataFrame, *, name: str, source: str, owner_id: str, raw_file: str | None = None
) -> dict:
    """raw DataFrame -> clean -> feature-engineer -> cache as Parquet -> dataset detail."""
    if raw is None or raw.empty:
        raise DataProcessingError("The dataset has no rows.")
    cleaned, cleaning_report = clean_dataframe(raw)
    engineered, feature_report = engineer_features(cleaned)
    rec = dataset_store.save_dataset(
        dataset_id,
        engineered,
        name=name,
        source=source,
        cleaning_report=cleaning_report,
        feature_report=feature_report,
        raw_file=raw_file,
        owner_id=owner_id,
    )
    return dataset_store.to_detail(rec, engineered)
