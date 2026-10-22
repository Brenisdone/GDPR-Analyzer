import logging
import json
import os
import tempfile
from collections.abc import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from modules.report.generate_report import generate_report
from sqlalchemy.orm import Session

from api.database import Base, engine, get_db
from api.models import Scan
from api.scanner import normalize_target, run_scan
from api.schemas import ScanCreate, ScanHistoryItem, ScanRead

from typing import List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GDPR Analyzer API",
    description="Run website privacy and transmission-security scans.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
def create_database_tables() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "GDPR Analyzer API is running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/scans", response_model=ScanRead, status_code=201)
def create_scan(
    payload: ScanCreate,
    db: Session = Depends(get_db),
):
    try:
        target = normalize_target(payload.target)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    scan = Scan(
        target=target,
        status="running",
    )

    db.add(scan)
    db.commit()
    db.refresh(scan)

    try:
        result = run_scan(target)

    except Exception as exc:
        logger.exception("Scan %s failed", scan.id)

        scan.status = "failed"
        scan.error = f"{type(exc).__name__}: {exc}"

        db.commit()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Scan {scan.id} failed. "
                "Check the API terminal for the full error."
            ),
        ) from exc

    scan.status = "completed"
    scan.grade = result.get("grade")
    scan.result = result

    db.commit()
    db.refresh(scan)

    return scan


@app.get("/api/scans", response_model=List[ScanHistoryItem])
def list_scans(
    db: Session = Depends(get_db),
):
    return (
        db.query(Scan)
        .order_by(Scan.created_at.desc())
        .limit(50)
        .all()
    )


@app.get("/api/scans/{scan_id}", response_model=ScanRead)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    return scan

@app.get("/api/scans/{scan_id}/report.json")
def download_scan_report(
    scan_id: int,
    db: Session = Depends(get_db),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    if not scan.result:
        raise HTTPException(
            status_code=404,
            detail="No report is available for this scan",
        )

    return Response(
        content=json.dumps(scan.result, indent=2, default=str),
        media_type="application/json",
        headers={
            "Content-Disposition": (
                'attachment; filename="gdpr-scan-{}.json"'.format(scan.id)
            )
        },
    )

@app.get("/api/scans/{scan_id}/report.pdf")
def download_scan_pdf(
    scan_id: int,
    db: Session = Depends(get_db),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()

    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    if not scan.result:
        raise HTTPException(
            status_code=404,
            detail="No report is available for this scan",
        )

    fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)

    try:
        generate_report(
            "scan_{}".format(scan.id),
            json.dumps(scan.result, default=str),
            pdf_path,
        )

        with open(pdf_path, "rb") as pdf_file:
            pdf_content = pdf_file.read()

        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    'attachment; filename="gdpr-scan-{}.pdf"'.format(scan.id)
                )
            },
        )
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)