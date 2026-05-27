"""External Web Monitor — Bright Data integration (MVP 3)."""
import hashlib
import json
import os
import re
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
from apscheduler.schedulers.background import BackgroundScheduler
from kafka import KafkaConsumer, KafkaProducer
from psycopg2.extras import RealDictCursor

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://leakradar:leakradar@localhost:5432/leakradar"
)
TOPIC = "dlp.external.candidates"
SERP_URL = "https://api.brightdata.com/request"
MOCK_MODE = os.getenv("BRIGHT_DATA_MOCK", "true").lower() == "true"


def db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def mask(value: str) -> str:
    if len(value) <= 4:
        return "****"
    return value[:2] + "****" + value[-2:]


def fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def publish(producer: KafkaProducer, candidate: dict):
    producer.send(TOPIC, key=candidate["candidateId"], value=json.dumps(candidate).encode())
    producer.flush()


def fetch_serp(api_key: str, query: str) -> list[dict]:
    if MOCK_MODE:
        return [
            {
                "url": f"https://gist.github.com/mock/{hashlib.md5(query.encode()).hexdigest()[:8]}",
                "snippet": f"AKIA0MOCK0KEY0FOUND for {query}",
                "title": "Mock paste result",
            }
        ]
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "zone": "serp_api",
        "url": f"https://www.google.com/search?q={httpx.QueryParams({'q': query})['q']}",
        "format": "raw",
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(SERP_URL, headers=headers, json=payload)
        resp.raise_for_status()
        text = resp.text
    results = []
    for line in text.splitlines()[:20]:
        if "http" in line:
            results.append({"url": line.strip(), "snippet": line[:200], "title": "SERP"})
    return results[:5]


def fetch_page(api_key: str, url: str) -> str:
    if MOCK_MODE:
        return f"mock content for {url}\nAKIA0MOCK0KEY0FOUND"
    headers = {"Authorization": f"Bearer {api_key}"}
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            SERP_URL,
            headers=headers,
            json={"zone": "unblocker", "url": url, "format": "raw"},
        )
        resp.raise_for_status()
        return resp.text[:50000]


def scan_content(text: str, url: str, tenant_id: str) -> list[dict]:
    candidates = []
    patterns = [
        (re.compile(r"AKIA[0-9A-Z]{16}"), "aws_key", "critical"),
        (re.compile(r"ghp_[a-zA-Z0-9]{36}"), "github_pat", "high"),
    ]
    for pattern, rule_id, severity in patterns:
        for match in pattern.finditer(text):
            raw = match.group()
            candidates.append(
                {
                    "candidateId": str(uuid.uuid4()),
                    "tenantId": tenant_id,
                    "url": url,
                    "siteType": "web",
                    "maskedSnippet": mask(raw),
                    "snippetHash": fingerprint(text[:500]),
                    "fingerprint": fingerprint(raw),
                    "confidence": 0.8,
                    "severity": severity,
                    "ruleId": rule_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
    return candidates


def run_tenant_scan(tenant_id: str, producer: KafkaProducer):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT api_key_encrypted FROM bright_data_config WHERE tenant_id = %s",
                (tenant_id,),
            )
            cfg = cur.fetchone()
            api_key = (
                cfg["api_key_encrypted"].decode()
                if cfg and cfg.get("api_key_encrypted")
                else "mock-key"
            )
            cur.execute(
                "SELECT keyword FROM watchlists WHERE tenant_id = %s AND enabled = true",
                (tenant_id,),
            )
            keywords = [r["keyword"] for r in cur.fetchall()]

    for keyword in keywords:
        for result in fetch_serp(api_key, keyword):
            url = result["url"]
            try:
                page = fetch_page(api_key, url)
            except Exception:
                page = result.get("snippet", "")
            for cand in scan_content(page, url, tenant_id):
                publish(producer, cand)
                with db() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO external_candidates
                            (id, tenant_id, url, site_type, snippet_hash, masked_snippet,
                             fingerprint, confidence, severity)
                            VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                cand["candidateId"],
                                tenant_id,
                                url,
                                "web",
                                cand["snippetHash"],
                                cand["maskedSnippet"],
                                cand["fingerprint"],
                                cand["confidence"],
                                cand["severity"],
                            ),
                        )
                    conn.commit()
            with db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE watchlists SET last_scan_at = NOW() WHERE tenant_id = %s AND keyword = %s",
                        (tenant_id, keyword),
                    )
                conn.commit()


def scheduled_job(producer: KafkaProducer):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tenants")
            for row in cur.fetchall():
                run_tenant_scan(str(row["id"]), producer)


def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: v,
    )
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_job, "interval", hours=1, args=[producer])
    scheduler.start()
    scheduled_job(producer)
    consumer = KafkaConsumer(
        "external.scan.trigger",
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_deserializer=lambda m: json.loads(m.decode()),
        group_id="external-monitor",
        auto_offset_reset="earliest",
    )
    for msg in consumer:
        tenant_id = msg.value.get("tenantId")
        if tenant_id:
            run_tenant_scan(tenant_id, producer)


if __name__ == "__main__":
    main()
