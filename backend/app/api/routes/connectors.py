from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import current_user
from app.db.database import User

from app.core.errors import ConnectorError, DataProcessingError
from app.core.ratelimit import RateLimiter
from app.models.schemas import ConnectorRequest, DatasetDetail
from app.services.connectors import fetch_remote
from app.services.pipeline import new_dataset_id, run_pipeline

router = APIRouter(prefix="/connectors", tags=["connectors"])
limiter = RateLimiter(limit=10, window_s=60)


@router.post("/import", response_model=DatasetDetail, dependencies=[Depends(limiter)])
def import_from_remote(req: ConnectorRequest, user: User = Depends(current_user)):
    """Fetch a table/query from Snowflake, Postgres or MySQL (RDS) and run the cleaning pipeline.

    Credentials are used for this request only; they are never stored or logged.
    """
    try:
        raw, name, source = fetch_remote(req)
        return run_pipeline(new_dataset_id(), raw, name=name, source=source, owner_id=user.id)
    except ConnectorError as e:
        raise HTTPException(502, str(e))
    except DataProcessingError as e:
        raise HTTPException(422, str(e))
