"""Parquet-backed dataset cache with a small in-memory LRU, plus SQLite metadata."""
import json
import threading
from collections import OrderedDict
from pathlib import Path
from typing import Any

import pandas as pd

from app.core.config import get_settings
from app.core.errors import DatasetNotFound
from app.db.database import DatasetRecord, SessionLocal
from app.services import chat_state

MAX_IN_MEMORY = 8
_cache: "OrderedDict[str, pd.DataFrame]" = OrderedDict()
_lock = threading.Lock()


def _parquet_path(dataset_id: str) -> Path:
    return get_settings().cache_dir / f"{dataset_id}.parquet"


def parquet_path(dataset_id: str) -> Path:
    return _parquet_path(dataset_id)


def _jsonable(v: Any) -> Any:
    if v is None or (not isinstance(v, (list, dict)) and pd.isna(v)):
        return None
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    if hasattr(v, "item"):
        return v.item()
    return v if isinstance(v, (str, int, float, bool)) else str(v)


def build_profile(df: pd.DataFrame) -> list[dict[str, Any]]:
    out = []
    for c in df.columns:
        s = df[c]
        out.append(
            {
                "name": str(c),
                "dtype": str(s.dtype),
                "null_count": int(s.isna().sum()),
                "unique_count": int(s.nunique(dropna=True)),
                "sample": [_jsonable(v) for v in s.dropna().head(3).tolist()],
            }
        )
    return out


def preview_records(df: pd.DataFrame, limit: int = 10) -> list[dict[str, Any]]:
    return json.loads(df.head(limit).to_json(orient="records", date_format="iso"))


def save_dataset(
    dataset_id: str,
    df: pd.DataFrame,
    *,
    name: str,
    source: str,
    cleaning_report: dict,
    feature_report: dict,
    raw_file: str | None = None,
    owner_id: str,
) -> DatasetRecord:
    df.to_parquet(_parquet_path(dataset_id), index=False)
    meta = {
        "profile": build_profile(df),
        "cleaning_report": cleaning_report,
        "feature_report": feature_report,
        "raw_file": raw_file,
    }
    record = DatasetRecord(
        id=dataset_id,
        owner_id=owner_id,
        name=name[:255],
        source=source[:255],
        rows=int(df.shape[0]),
        n_columns=int(df.shape[1]),
        meta_json=json.dumps(meta, default=str),
    )
    with SessionLocal() as s:
        s.add(record)
        s.commit()
    _remember(dataset_id, df)
    return record


def _remember(dataset_id: str, df: pd.DataFrame) -> None:
    with _lock:
        _cache[dataset_id] = df
        _cache.move_to_end(dataset_id)
        while len(_cache) > MAX_IN_MEMORY:
            _cache.popitem(last=False)


def get_record(dataset_id: str, owner_id: str | None = None) -> DatasetRecord:
    """With owner_id, records owned by anyone else look exactly like missing ones."""
    with SessionLocal() as s:
        rec = s.get(DatasetRecord, dataset_id)
    if rec is None or (owner_id is not None and rec.owner_id != owner_id):
        raise DatasetNotFound(dataset_id)
    return rec


def get_dataframe(dataset_id: str, owner_id: str | None = None) -> pd.DataFrame:
    """Cleaned DataFrame for querying (memory first, Parquet fallback). Pass owner_id to enforce ownership."""
    if owner_id is not None:
        get_record(dataset_id, owner_id)
    with _lock:
        if dataset_id in _cache:
            _cache.move_to_end(dataset_id)
            return _cache[dataset_id]
    get_record(dataset_id)
    path = _parquet_path(dataset_id)
    if not path.exists():
        raise DatasetNotFound(dataset_id)
    df = pd.read_parquet(path)
    _remember(dataset_id, df)
    return df


def list_records(owner_id: str) -> list[DatasetRecord]:
    with SessionLocal() as s:
        return list(s.query(DatasetRecord).filter_by(owner_id=owner_id).order_by(DatasetRecord.created_at.desc()).all())


def _remove_files(dataset_id: str, meta_json: str) -> None:
    with _lock:
        _cache.pop(dataset_id, None)
    chat_state.purge_dataset(dataset_id)
    paths = [_parquet_path(dataset_id)]
    try:
        raw = json.loads(meta_json).get("raw_file")
        if raw:
            paths.append(Path(raw))
    except (ValueError, AttributeError):
        pass
    for p in paths:
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass  # a locked/missing file must not block deleting the record


def delete_dataset(dataset_id: str, owner_id: str) -> None:
    rec = get_record(dataset_id, owner_id)
    with SessionLocal() as s:
        s.query(DatasetRecord).filter_by(id=dataset_id, owner_id=owner_id).delete()
        s.commit()
    _remove_files(dataset_id, rec.meta_json)


def delete_all_for_owner(owner_id: str) -> None:
    with SessionLocal() as s:
        recs = s.query(DatasetRecord).filter_by(owner_id=owner_id).all()
        removed = [(r.id, r.meta_json) for r in recs]
        s.query(DatasetRecord).filter_by(owner_id=owner_id).delete()
        s.commit()
    for did, meta_json in removed:
        _remove_files(did, meta_json)


def to_detail(rec: DatasetRecord, df: pd.DataFrame) -> dict[str, Any]:
    meta = json.loads(rec.meta_json)
    return {
        "id": rec.id,
        "name": rec.name,
        "source": rec.source,
        "rows": rec.rows,
        "columns": rec.n_columns,
        "created_at": rec.created_at,
        "profile": meta["profile"],
        "cleaning_report": meta["cleaning_report"],
        "feature_report": meta["feature_report"],
        "preview": preview_records(df),
    }
