from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import current_user
from app.db.database import User

from app.core.errors import DatasetNotFound
from app.models.schemas import DatasetDetail, DatasetSummary
from app.services import dataset_store

router = APIRouter(prefix="/datasets", tags=["datasets"])


def _summary(r) -> dict:
    return {"id": r.id, "name": r.name, "source": r.source, "rows": r.rows, "columns": r.n_columns, "created_at": r.created_at}


@router.get("", response_model=list[DatasetSummary])
def list_datasets(user: User = Depends(current_user)):
    return [_summary(r) for r in dataset_store.list_records(user.id)]


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(dataset_id: str, user: User = Depends(current_user)):
    try:
        rec = dataset_store.get_record(dataset_id, user.id)
        return dataset_store.to_detail(rec, dataset_store.get_dataframe(dataset_id, user.id))
    except DatasetNotFound:
        raise HTTPException(404, "Dataset not found.")


@router.get("/{dataset_id}/preview")
def preview(dataset_id: str, limit: int = Query(20, ge=1, le=200), user: User = Depends(current_user)):
    try:
        df = dataset_store.get_dataframe(dataset_id, user.id)
    except DatasetNotFound:
        raise HTTPException(404, "Dataset not found.")
    return {"columns": [str(c) for c in df.columns], "rows": dataset_store.preview_records(df, limit)}


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: str, user: User = Depends(current_user)):
    try:
        dataset_store.delete_dataset(dataset_id, user.id)
    except DatasetNotFound:
        raise HTTPException(404, "Dataset not found.")
