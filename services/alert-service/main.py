"""Alert & Notification Service (MVP 5)."""
import json
import os
import uuid
from datetime import datetime, timezone

import psycopg2
import redis
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from kafka import KafkaConsumer, KafkaProducer
from psycopg2.extras import RealDictCursor

app = FastAPI(title="Alert Service")
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://leakradar:leakradar@localhost:5432/leakradar"
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)


def db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def process_incident(incident: dict):
    tenant_id = incident.get("tenantId")
    incident_id = incident.get("incidentId")
    dedup_key = f"{tenant_id}:{incident_id}"
    if redis_client.get(f"dedup:{dedup_key}"):
        return
    redis_client.setex(f"dedup:{dedup_key}", 3600, "1")

    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, channel_type, config, severity_threshold
                FROM alert_routes WHERE tenant_id = %s AND enabled = true
                """,
                (tenant_id,),
            )
            routes = cur.fetchall()

    for route in routes:
        alert_id = str(uuid.uuid4())
        channel = route["channel_type"]
        status = "sent" if channel == "in_app" else "pending"
        with db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO alerts (id, tenant_id, incident_id, route_id, status,
                        channel_type, dedup_key, sent_at)
                    VALUES (%s::uuid, %s::uuid, %s::uuid, %s::uuid, %s, %s, %s, %s)
                    """,
                    (
                        alert_id,
                        tenant_id,
                        incident_id,
                        route["id"],
                        status,
                        channel,
                        dedup_key,
                        datetime.now(timezone.utc) if status == "sent" else None,
                    ),
                )
            conn.commit()

        event = {
            "type": "alert",
            "incidentId": incident_id,
            "tenantId": tenant_id,
            "channel": channel,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        redis_client.publish(f"sse:{tenant_id}", json.dumps(event))

        if channel in ("slack", "webhook"):
            webhook_url = (route.get("config") or {}).get("url")
            if webhook_url:
                try:
                    import httpx

                    httpx.post(webhook_url, json=event, timeout=10)
                except Exception:
                    pass


def kafka_worker():
    consumer = KafkaConsumer(
        "dlp.incidents",
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_deserializer=lambda m: json.loads(m.decode()),
        group_id="alert-service",
        auto_offset_reset="earliest",
    )
    for msg in consumer:
        process_incident(msg.value)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/sse/{tenant_id}")
def sse(tenant_id: str):
    pubsub = redis_client.pubsub()
    pubsub.subscribe(f"sse:{tenant_id}")

    def stream():
        yield "data: {\"type\":\"connected\"}\n\n"
        for message in pubsub.listen():
            if message["type"] == "message":
                yield f"data: {message['data'].decode()}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.on_event("startup")
def startup():
    import threading

    threading.Thread(target=kafka_worker, daemon=True).start()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8085)
