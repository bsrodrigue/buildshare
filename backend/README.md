# BuildShare Backend

Backend de la plateforme **BuildShare**, une solution de distribution d'applications Android pour les testeurs et parties prenantes.

## Stack Technique

- **Langage** : Python 3.14
- **Framework** : FastAPI
- **ORM** : SQLAlchemy 2.0
- **Auth** : JWT (python-jose)
- **Validation** : Pydantic v2
- **Tâches asynchrones** : Celery + RabbitMQ
- **Stockage** : Cloudflare R2 (boto3)
- **Base de données** : SQLite (Dev) / PostgreSQL (Prod)
- **Gestionnaire de paquets** : `uv`

## Architecture

Le backend suit une architecture modulaire orientée domaine :

```
app/
├── main.py              # Application FastAPI, middleware, error handlers
├── config.py            # Configuration via pydantic-settings
├── database.py          # Moteur SQLAlchemy et session
├── dependencies.py      # Dépendances FastAPI (auth, DB)
├── models/              # Modèles SQLAlchemy
├── schemas/             # Schémas Pydantic (validation entrée/sortie)
├── api/                 # Routeurs FastAPI
├── services/            # Logique métier (écritures)
├── tasks/               # Tâches Celery (processing APK)
└── libs/                # Utilitaires (FSM, codes d'erreur)
```

### Principes

- **Séparation des couches** : API (routes) → Services (logique) → Models (données)
- **RBAC Strict** : ADMIN peut uploader/modifier, MEMBER accès lecture seule
- **Typage explicite** : Annotations de type Python partout
- **Documentation OpenAPI** : Générée automatiquement par FastAPI

## Installation & Lancement

### Prérequis

- [uv](https://github.com/astral-sh/uv)
- RabbitMQ (pour Celery)

### Installation

```bash
uv sync
```

### Lancement du serveur

```bash
npm run server
# ou
uv run uvicorn app.main:app --reload
```

### Worker Celery

```bash
npm run celery
# ou
uv run celery -A app.tasks.celery_app worker -l info
```

### Qualité du code

```bash
npm run lint    # Ruff + Mypy
npm run format  # Ruff format
```

## Documentation API

Une fois le serveur lancé :

- **Swagger UI** : `/docs`
- **Redoc** : `/redoc`
- **OpenAPI JSON** : `/openapi.json`

## Variables d'environnement

Copier `.env` depuis la racine du projet :

| Variable                | Description                       |
| ----------------------- | --------------------------------- |
| `DATABASE_URL`          | URL de connexion (défaut: sqlite) |
| `JWT_SECRET_KEY`        | Clé de signature JWT              |
| `CELERY_BROKER_URL`     | URL RabbitMQ pour Celery          |
| `CELERY_RESULT_BACKEND` | Backend de résultats Celery       |
| `R2_*`                  | Credentials Cloudflare R2         |
