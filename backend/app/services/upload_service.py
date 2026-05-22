"""Handles chunked file upload assembly and status tracking."""

import os
from pathlib import Path

from app.config import settings


def get_upload_dir(upload_id: str) -> Path:
    p = Path(settings.upload_dir) / upload_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def save_chunk(upload_id: str, chunk_index: int, total_chunks: int, filename: str, data: bytes) -> dict:
    """Save a single chunk to disk. Returns status dict."""
    upload_dir = get_upload_dir(upload_id)

    chunk_path = upload_dir / f"chunk_{chunk_index:05d}"
    chunk_path.write_bytes(data)

    # Write metadata
    meta_path = upload_dir / "meta.txt"
    meta_path.write_text(f"{filename}\n{total_chunks}")

    uploaded = list_chunks(upload_id)
    return {
        "upload_id": upload_id,
        "uploaded_chunks": uploaded,
        "total_chunks": total_chunks,
        "complete": len(uploaded) == total_chunks,
    }


def list_chunks(upload_id: str) -> list[int]:
    """Return sorted list of uploaded chunk indices."""
    upload_dir = get_upload_dir(upload_id)
    chunks = []
    for f in upload_dir.glob("chunk_*"):
        try:
            idx = int(f.name.split("_")[1])
            chunks.append(idx)
        except (IndexError, ValueError):
            pass
    return sorted(chunks)


def assemble_file(upload_id: str) -> tuple[str, str]:
    """Concatenate all chunks into a single file. Returns (filepath, original_filename)."""
    upload_dir = get_upload_dir(upload_id)

    # Read metadata
    meta_path = upload_dir / "meta.txt"
    if meta_path.exists():
        lines = meta_path.read_text().strip().split("\n")
        original_filename = lines[0] if lines else "upload.xlsx"
    else:
        original_filename = "upload.xlsx"

    # Assemble
    output_path = upload_dir / original_filename
    chunks = list_chunks(upload_id)

    with open(output_path, "wb") as out:
        for idx in chunks:
            chunk_path = upload_dir / f"chunk_{idx:05d}"
            out.write(chunk_path.read_bytes())

    return str(output_path), original_filename


def cleanup_upload(upload_id: str):
    """Remove all files for an upload."""
    import shutil

    upload_dir = Path(settings.upload_dir) / upload_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir)


def get_assembly_progress(upload_id: str) -> float:
    """Get upload progress as percentage."""
    upload_dir = Path(settings.upload_dir) / upload_id
    meta_path = upload_dir / "meta.txt"
    if not meta_path.exists():
        return 0.0

    try:
        lines = meta_path.read_text().strip().split("\n")
        total = int(lines[1]) if len(lines) > 1 else 0
    except (ValueError, IndexError):
        return 0.0

    if total == 0:
        return 0.0

    uploaded = len(list_chunks(upload_id))
    return min(uploaded / total, 1.0)
