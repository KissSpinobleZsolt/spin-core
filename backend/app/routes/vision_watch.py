import asyncio
import os
import sys
import tempfile
import zipfile
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.database import get_ch, get_pg
from app.deps import token_dep

router = APIRouter(prefix="/api/vision-watch", tags=["vision-watch"])

MODELS_DIR = os.getenv("YOLO_MODELS_DIR", "/app/vision-models")


# ── WebSocket connection manager (same pattern as ingestion.py) ──────────────

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, ws: WebSocket, job_id: str):
        await ws.accept()
        self.active[job_id] = ws

    def disconnect(self, job_id: str):
        self.active.pop(job_id, None)

    async def send(self, message: str, job_id: str):
        ws = self.active.get(job_id)
        if ws:
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(job_id)


manager = ConnectionManager()
_results: dict[str, Any] = {}


# ── YOLO model cache ─────────────────────────────────────────────────────────

_yolo_models: dict[str, Any] = {}


def _get_model(model_name: str = "yolov8n.pt") -> Any:
    if model_name not in _yolo_models:
        from ultralytics import YOLO
        _yolo_models[model_name] = YOLO(model_name)
    return _yolo_models[model_name]


# ── Background: video analysis ───────────────────────────────────────────────

async def _analyze_video(job_id: str, video_path: str, module_id: str, model_name: str):
    try:
        import cv2
        model = _get_model(model_name)
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        sample_every = max(1, int(fps / 2))
        frame_no = 0
        event_count = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_no % sample_every == 0:
                results = model(frame, verbose=False)
                detections = [
                    {
                        "label": model.names[int(b.cls)],
                        "confidence": round(float(b.conf), 3),
                        "box": [round(x, 1) for x in b.xyxy[0].tolist()],
                    }
                    for r in results
                    for b in r.boxes
                ]
                if detections:
                    event = {
                        "frame": frame_no,
                        "timestamp_s": round(frame_no / fps, 2),
                        "detections": detections,
                        "labels": list({d["label"] for d in detections}),
                        "model": model_name,
                    }
                    get_pg().insert_document(module_id, "detections", event)
                    try:
                        mod = get_pg().get_module(module_id)
                        if mod:
                            get_ch().write_module_log(
                                scope=mod["scope"],
                                user_email="system",
                                event_type="yolo.detection",
                                details={"frame": frame_no, "labels": event["labels"]},
                            )
                    except Exception:
                        pass
                    event_count += 1
                    await manager.send(f"frame:{frame_no}/{total}:events:{event_count}", job_id)
            frame_no += 1
            await asyncio.sleep(0)  # yield to event loop

        cap.release()
    except Exception as exc:
        print(f"[vision-watch] analyze error: {exc}", file=sys.stderr)
        await manager.send(f"error:{exc}", job_id)
    finally:
        try:
            os.unlink(video_path)
        except Exception:
            pass

    _results[job_id] = {"total_events": event_count, "total_frames": frame_no}
    await manager.send("CALL_OUTPUT_ENDPOINT", job_id)


# ── Background: fine-tune ────────────────────────────────────────────────────

async def _finetune(job_id: str, dataset_path: str, module_id: str, epochs: int):
    extract_dir = os.path.join(tempfile.gettempdir(), f"vw-dataset-{job_id}")
    model_path = None
    try:
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(dataset_path, "r") as zf:
            zf.extractall(extract_dir)

        data_yaml = os.path.join(extract_dir, "data.yaml")
        if not os.path.exists(data_yaml):
            raise FileNotFoundError("data.yaml not found in ZIP root")

        await manager.send(f"Starting training for {epochs} epoch(s)…", job_id)

        from ultralytics import YOLO
        model = YOLO("yolov8n.pt")
        os.makedirs(MODELS_DIR, exist_ok=True)

        def _train():
            return model.train(
                data=data_yaml,
                epochs=epochs,
                project=MODELS_DIR,
                name=module_id,
                exist_ok=True,
                verbose=False,
            )

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _train)

        best = os.path.join(MODELS_DIR, module_id, "weights", "best.pt")
        if os.path.exists(best):
            model_path = best
            get_pg().insert_document(module_id, "models", {"model_path": best, "epochs": epochs})
            await manager.send(f"Training complete — weights at {best}", job_id)
        else:
            await manager.send("Training complete (weights path not found)", job_id)

    except Exception as exc:
        print(f"[vision-watch] finetune error: {exc}", file=sys.stderr)
        await manager.send(f"error:{exc}", job_id)
    finally:
        try:
            os.unlink(dataset_path)
        except Exception:
            pass
        import shutil
        try:
            shutil.rmtree(extract_dir, ignore_errors=True)
        except Exception:
            pass

    _results[job_id] = {"model_path": model_path or ""}
    await manager.send("CALL_OUTPUT_ENDPOINT", job_id)


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/analyze", status_code=202)
async def analyze_video(
    background_tasks: BackgroundTasks,
    video: UploadFile,
    module_id: str = Form(...),
    model_name: str = Form(default="yolov8n.pt"),
    job_id: str = Form(default=None),
    _: str = Depends(token_dep),
):
    if not get_pg().get_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")

    suffix = os.path.splitext(video.filename or "video")[1] or ".mp4"
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        content = await video.read()
        f.write(content)

    returned_job_id = job_id or str(uuid4())
    background_tasks.add_task(_analyze_video, returned_job_id, tmp_path, module_id, model_name)
    return {"job_id": returned_job_id}


@router.post("/finetune", status_code=202)
async def finetune_model(
    background_tasks: BackgroundTasks,
    dataset: UploadFile,
    module_id: str = Form(...),
    epochs: int = Form(default=10),
    job_id: str = Form(default=None),
    _: str = Depends(token_dep),
):
    if not get_pg().get_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")

    fd, tmp_path = tempfile.mkstemp(suffix=".zip")
    with os.fdopen(fd, "wb") as f:
        content = await dataset.read()
        f.write(content)

    returned_job_id = job_id or str(uuid4())
    background_tasks.add_task(_finetune, returned_job_id, tmp_path, module_id, epochs)
    return {"job_id": returned_job_id}


@router.websocket("/listener/{job_id}")
async def ws_listener(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, job_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(job_id)


@router.get("/response/{job_id}")
async def get_response(job_id: str, _: str = Depends(token_dep)):
    result = _results.pop(job_id, None)
    if result is not None:
        return {"status": "completed", **result}
    return {"status": "pending"}


@router.get("/models/{module_id}")
async def list_models(module_id: str, _: str = Depends(token_dep)):
    models = [{"name": "yolov8n (base)", "path": "yolov8n.pt"}]
    module_dir = os.path.join(MODELS_DIR, module_id, "weights")
    if os.path.isdir(module_dir):
        for fname in os.listdir(module_dir):
            if fname.endswith(".pt"):
                fpath = os.path.join(module_dir, fname)
                models.append({"name": f"{fname} (fine-tuned)", "path": fpath})
    return models
