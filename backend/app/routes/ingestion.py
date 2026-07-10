import asyncio

from fastapi import APIRouter, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["ingestion"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_message(self, message: str, client_id: str):
        ws = self.active_connections.get(client_id)
        if ws:
            await ws.send_text(message)


manager = ConnectionManager()
_results: dict[str, str] = {}


class DataInput(BaseModel):
    client_id: str
    data_payload: str


async def _process(client_id: str, data: str):
    await asyncio.sleep(2)
    await manager.send_message("Status: Processing started...", client_id)
    await asyncio.sleep(3)
    await manager.send_message("Status: Processing at 80%...", client_id)
    await asyncio.sleep(1)
    _results[client_id] = f"SUCCESS: Data '{data}' has been transformed!"
    await manager.send_message("CALL_OUTPUT_ENDPOINT", client_id)


@router.post("/data-ingestion")
async def data_ingestion(payload: DataInput, background_tasks: BackgroundTasks):
    background_tasks.add_task(_process, payload.client_id, payload.data_payload)
    return {"status": "accepted", "message": "Data accepted for processing."}


@router.websocket("/data-ingestion-listener/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)


@router.get("/data-ingestion-response/{client_id}")
async def data_ingestion_response(client_id: str):
    result = _results.pop(client_id, None)
    if result:
        return {"status": "completed", "final_data": result}
    return {"status": "pending", "message": "Data not ready yet."}
