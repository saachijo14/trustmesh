from fastapi import APIRouter
from app.services.data_generator import generate_full_dataset
from app.services.graph_ingestion import ingest_events

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.post("/generate")
def generate_dataset():
    """
    Generate the full synthetic dataset (normal events + two abuse
    rings + legitimate household cluster) and persist it into Neo4j.
    """
    events = generate_full_dataset()
    ingest_counts = ingest_events(events)

    return {
        "total_events": len(events),
        "ingested": ingest_counts,
    }