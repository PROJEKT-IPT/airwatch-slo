# AirWatch SLO

Spletna analitična platforma za regionalno spremljanje kakovosti zraka nad Slovenijo na podlagi satelitskih podatkov Copernicus (Sentinel-5P).

## O projektu

AirWatch SLO pretvarja kompleksne satelitske podatke v razumljive, primerljive in uporabne informacije za raziskovalce, javne ustanove ter izobraževalne organizacije. Sistem omogoča pregled aktualnega stanja, zgodovinskih trendov, primerjavo regij in izvoz podatkov.

### Ključne funkcionalnosti

- 🗺️ Regionalni prikaz kakovosti zraka za Slovenijo
- 📊 Zgodovinski trendi po regijah
- 🔍 Primerjava regij in kazalnikov
- 📥 Izvoz podatkov v CSV
- 🎯 Fokus na NO2 (nitrogen dioxide) v MVP fazi

## Hitri zagon

### Predpogoji

- Docker in Docker Compose
- Brezplačni račun na [Copernicus Data Space](https://dataspace.copernicus.eu/)

### Namestitev

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/PROJEKT-IPT/airwatch-slo.git
cd airwatch-slo

# 2. Ustvari .env datoteko in ji dodaj potrebne konfiguracije
cp .env .env

# 3. Zaženi aplikacijo
docker-compose up -d
```

### Dostop

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

## Razvoj

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tehnični sklad

- **Backend**: Python 3.11, FastAPI, PostgreSQL + PostGIS
- **Frontend**: React 18, Vite
- **Infrastruktura**: Docker, Docker Compose