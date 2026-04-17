# App-share Backend 🚀

Backend de la plateforme **App-share**, une solution de distribution d'applications Android pour les testeurs et parties prenantes.

## 🏛️ Architecture & Philosophie

Ce projet suit le **HackSoft Django Styleguide**, une architecture modulaire orientée domaine qui sépare strictement la logique métier des couches de présentation.

### Structure des modules
Chaque domaine (Users, Projects, Binaries) est organisé comme suit :
- `models.py` : Définition des entités et des contraintes (Zero Business Logic).
- `services.py` : Actions de mutation (Écritures). C'est ici que vit la logique métier.
- `selectors.py` : Requêtes de récupération de données (Lectures).
- `apis.py` : Points d'entrée REST utilisant DRF `APIView`.
- `serializers.py` : Serializers d'entrée/sortie spécifiques à chaque API.

### Principes de qualité
- **Isolation Multi-tenant** : Les données sont isolées au niveau du Projet via le `UserProjectProfile`.
- **RBAC Strict** : Seul l'Admin d'un projet peut uploader des binaires. Les Membres ont un accès en lecture seule.
- **Typage Explicite** : Utilisation intensive des annotations de type.
- **Documentation OpenAPI** : Documentation automatique via `drf-spectacular`.

## 🛠️ Stack Technique

- **Langage** : Python 3.14
- **Framework** : Django 6.0 + Django REST Framework
- **Auth** : SimpleJWT (JWT)
- **Base de données** : SQLite (Dev) / PostgreSQL (Prod ready)
- **Gestionnaire de paquets** : `uv`

## 🚀 Installation & Lancement

### Prérequis
- [uv](https://github.com/astral-sh/uv) installé sur votre machine.

### Installation
```bash
# Synchroniser l'environnement et installer les dépendances
uv sync
```

### Lancement du serveur
```bash
npm run server
# ou
uv run python manage.py runserver
```

### Qualité du code
```bash
# Linting (Ruff & Mypy)
npm run lint

# Formatage
npm run format
```

## 📖 Documentation API

Une fois le serveur lancé, accédez à la documentation interactive :
- **Swagger UI** : `/api/docs/swagger/`
- **Redoc** : `/api/docs/redoc/`
- **Schema JSON/YAML** : `/api/schema/`

## 🔐 Administration

Le panel d'administration est enrichi pour faciliter la gestion des projets et des binaires :
- Accès via `/admin/`.
- Gestion granulaire des rôles (`ADMIN` vs `MEMBER`) par projet.
- Visualisation des releases et artifacts groupés par application.
