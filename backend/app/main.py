from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, Header, Response, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal
import asyncio

from app.database import engine, get_db, Base
from app.models import User, PageResponse
from app.auth import hash_password, verify_password, create_token, decode_token


# --- LIFESPAN: create tables + seed ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        if not db.query(User).first():
            db.add(User(
                email="admin",
                name="User Doe",
                hashed_password=hash_password("password123"),
                roles=["user", "admin"],
                default_theme="dark",
            ))
        if not db.query(PageResponse).first():
            db.add(PageResponse(page_key="dashboard", content="Hello welcome"))
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="Corea Ingestion API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- WEBSOCKET MANAGER ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)


manager = ConnectionManager()
fake_database: dict[str, str] = {}


# --- PYDANTIC SCHEMAS ---

class DataInput(BaseModel):
    client_id: str
    data_payload: str

class LoginCredentials(BaseModel):
    email: str
    password: str

class ThemePayload(BaseModel):
    theme: Literal["dark", "light"]


# --- AUTH ---

@app.post("/api/auth/login")
async def login(credentials: LoginCredentials, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.email)
    return {
        "token": token,
        "user": {
            "name": user.name,
            "roles": user.roles,
            "defaultTheme": user.default_theme,
        },
    }


# --- DASHBOARD ---

@app.get("/api/dashboard")
async def dashboard(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    decode_token(authorization.removeprefix("Bearer "))
    page = db.query(PageResponse).filter(PageResponse.page_key == "dashboard").first()
    if not page:
        raise HTTPException(status_code=404, detail="Dashboard content not found")
    return {"message": page.content}


# --- USER THEME ---

@app.patch("/api/user/theme", status_code=204)
async def set_theme(
    payload: ThemePayload,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    email = decode_token(authorization.removeprefix("Bearer "))
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.default_theme = payload.theme
    db.commit()
    return Response(status_code=204)


# --- DATA INGESTION (unchanged) ---

async def process_data_in_background(client_id: str, data: str):
    await asyncio.sleep(2)
    await manager.send_message("Status: Am început procesarea datelor...", client_id)
    await asyncio.sleep(3)
    await manager.send_message("Status: Procesare la 80%...", client_id)
    await asyncio.sleep(1)
    fake_database[client_id] = f"SUCCES: Datele '{data}' au fost transformate!"
    await manager.send_message("CALL_OUTPUT_ENDPOINT", client_id)


@app.post("/api/data-ingestion")
async def data_ingestion(payload: DataInput, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_data_in_background, payload.client_id, payload.data_payload)
    return {"status": "accepted", "message": "Datele au intrat în procesare."}


@app.websocket("/api/data-ingestion-listener/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)


@app.get("/api/data-ingestion-response/{client_id}")
async def data_ingestion_response(client_id: str):
    result = fake_database.get(client_id)
    if result:
        del fake_database[client_id]
        return {"status": "completed", "final_data": result}
    return {"status": "pending", "message": "Datele nu sunt gata încă."}
