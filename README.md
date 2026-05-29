# AirWatch SLO

Spletna aplikacija za prikaz regionalnih vrednosti dušikovega dioksida (NO₂) nad
Slovenijo na podlagi satelitskih podatkov Copernicus Sentinel-5P (TROPOMI).

AirWatch SLO prikazuje **zadnjo razpoložljivo obdelano** Sentinel-5P NO₂ meritev
po 12 slovenskih statističnih regijah. **Ni v realnem času** in **ni ulična
meritev** – vrednosti so regionalne satelitske ocene (piksel ~3,5 × 5,5 km).

```text
Sentinel-5P NO₂ produkt → Python data pipeline → PostgreSQL/PostGIS → FastAPI → React dashboard
```

## Tehnologije

Python · FastAPI · SQLAlchemy · Alembic · PostgreSQL/PostGIS · React + Vite ·
Docker Compose · Railway

## Hiter zagon (lokalno)

```bash
cp .env.example .env          # nastavi vrednosti; .env se ne commita
docker compose up --build
docker compose run --rm backend alembic upgrade head
```

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:8000> · health: `/health`

NO₂ meritve se vnesejo prek data pipeline-a – glej dokumentacijo spodaj.

## Dokumentacija

| Dokument | Vsebina |
|---|---|
| [docs/01_project_overview.md](docs/01_project_overview.md) | pregled projekta in cilji |
| [docs/02_architecture.md](docs/02_architecture.md) | arhitektura in komponente |
| [docs/03_data_pipeline.md](docs/03_data_pipeline.md) | obdelava podatkov |
| [docs/04_api_documentation.md](docs/04_api_documentation.md) | API endpointi |
| [docs/05_deployment_guide.md](docs/05_deployment_guide.md) | lokalni in Railway deploy |
| [docs/06_developer_handover.md](docs/06_developer_handover.md) | predaja razvijalcu |

Podrobni in zgodovinski zapisi so v [docs/archive/](docs/archive/).
Komponentni README-ji so v `backend/`, `frontend/`, `data_pipeline/` in `database/`.

