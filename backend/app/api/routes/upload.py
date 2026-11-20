from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import current_user
from app.core.config import get_settings
from app.db.database import User
from app.core.ratelimit import RateLimiter
from app.core.errors import DataProcessingError
from app.models.schemas import DatasetDetail
from app.services.ingestion import ALLOWED_EXTENSIONS, read_file
from app.services.pipeline import new_dataset_id, run_pipeline

router = APIRouter(tags=["upload"])
CHUNK = 1024 * 1024
limiter = RateLimiter(limit=20, window_s=60)


@router.post("/upload", response_model=DatasetDetail, dependencies=[Depends(limiter)])
def upload_dataset(
    file: UploadFile = File(...),
    sheet: str | None = Form(None, description="Excel sheet name (default: first)"),
    table: str | None = Form(None, description=".sql only: table to load (default: largest)"),
    user: User = Depends(current_user),
):
    settings = get_settings()
    original = Path(file.filename or "upload")
    ext = original.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    dataset_id = new_dataset_id()
    dest = settings.upload_dir / f"{dataset_id}{ext}"  # never use the client-supplied name on disk
    limit = settings.max_upload_mb * 1024 * 1024
    size = 0
    try:
        with open(dest, "wb") as out:
            while chunk := file.file.read(CHUNK):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"File exceeds the {settings.max_upload_mb} MB limit.")
                out.write(chunk)
        if size == 0:
            raise HTTPException(400, "The uploaded file is empty.")

        raw = read_file(dest, ext, sheet=sheet, table=table)
        return run_pipeline(dataset_id, raw, name=original.stem, source=f"file:{original.name}", raw_file=str(dest), owner_id=user.id)
    except DataProcessingError as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(422, str(e))
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
