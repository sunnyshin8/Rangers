"""ML/LLM Classification Service — Stage 2 triage (MVP 4)."""
import json
import os
import re
from datetime import datetime, timezone

import psycopg2
from kafka import KafkaConsumer, KafkaProducer
from psycopg2.extras import RealDictCursor

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://leakradar:leakradar@localhost:5432/leakradar"
)
IN_TOPICS = ["dlp.candidates", "dlp.external.candidates"]
OUT_TOPIC = "dlp.candidates.classified"
MODEL_VERSION = "heuristic-v1"


def db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def classify_internal(candidate: dict) -> dict:
    rule = candidate.get("ruleId", "")
    snippet = candidate.get("maskedSnippet", "")
    confidence = candidate.get("confidence", 0.5)

    label = "unknown"
    if rule == "aws_key":
        label = "aws_access_key"
        confidence = min(0.98, confidence + 0.05)
    elif rule == "github_pat":
        label = "github_personal_access_token"
        confidence = min(0.95, confidence + 0.03)
    elif rule == "payment_card_number":
        label = "payment_card_number"
        confidence = min(0.99, confidence + 0.2)
    elif rule == "payment_card_cvv":
        label = "payment_card_cvv"
        confidence = 0.99
    elif rule == "private_key":
        label = "private_key_pem"
        confidence = 0.99
    elif rule == "env_file":
        label = "environment_file"
    elif rule == "generic_secret":
        label = "generic_credential"
        if re.search(r"(?i)password", snippet):
            label = "password"

    ambiguous = 0.55 <= confidence <= 0.75
    remediation = suggest_remediation(label)
    if ambiguous:
        remediation += " Review manually; confidence is borderline."

    candidate["mlLabel"] = label
    candidate["mlConfidence"] = confidence
    candidate["remediation"] = remediation
    return candidate


def classify_external(candidate: dict) -> dict:
    candidate["mlLabel"] = "external_exposure"
    candidate["mlConfidence"] = candidate.get("confidence", 0.7)
    candidate["remediation"] = (
        "Rotate exposed credentials immediately. Request takedown of the external URL."
    )
    return candidate


def suggest_remediation(label: str) -> str:
    steps = {
        "aws_access_key": "Revoke the IAM key in AWS Console, rotate credentials, and enable git-secrets pre-commit hooks.",
        "github_personal_access_token": "Revoke the PAT on GitHub, scan git history with BFG, and add secret scanning in CI.",
        "payment_card_number": "Treat the card number as exposed, remove it from public content, and notify the payment or fraud team for immediate review.",
        "payment_card_cvv": "Treat the CVV as highly sensitive, remove it immediately, and rotate the affected payment workflow or form handling.",
        "private_key_pem": "Invalidate the certificate/key pair and replace across all services.",
        "environment_file": "Remove .env from repository history and use a secrets manager.",
        "password": "Rotate the password and audit access logs for misuse.",
        "generic_credential": "Treat as compromised: rotate the credential and audit usage.",
        "external_exposure": "Rotate and monitor; document in incident timeline.",
    }
    return steps.get(label, "Investigate and rotate any exposed credentials.")


def save_classification(candidate_id: str, source: str, label: str, confidence: float, remediation: str):
    try:
        with db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO classification_results
                    (candidate_id, candidate_source, label, confidence, remediation, model_version)
                    VALUES (%s::uuid, %s, %s, %s, %s, %s)
                    """,
                    (candidate_id, source, label, confidence, remediation, MODEL_VERSION),
                )
            conn.commit()
    except Exception:
        pass


def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode(),
    )
    consumer = KafkaConsumer(
        *IN_TOPICS,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_deserializer=lambda m: json.loads(m.decode()),
        group_id="ml-classifier",
        auto_offset_reset="earliest",
    )
    for msg in consumer:
        data = msg.value
        topic = msg.topic
        if topic == "dlp.external.candidates":
            classified = classify_external(data)
            producer.send("dlp.external.candidates", key=classified["candidateId"], value=classified)
        else:
            classified = classify_internal(data)
            save_classification(
                classified["candidateId"],
                "internal",
                classified["mlLabel"],
                classified["mlConfidence"],
                classified.get("remediation", ""),
            )
            producer.send(OUT_TOPIC, key=classified["candidateId"], value=classified)
        producer.flush()


if __name__ == "__main__":
    main()
