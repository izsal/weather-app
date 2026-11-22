---
title: Qwarts Weather Dashboard
emoji: ⛅
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Qwarts Weather Dashboard

Full-stack Weather Dashboard built with FastAPI and React Vite.

## Fitur

- Cuaca saat ini, prakiraan per jam untuk 24 jam, dan prakiraan harian.
- Simpan kota favorit di browser untuk akses cepat.
- Bagikan kondisi cuaca melalui tautan yang membuka kota terkait.
- Cari kota dengan autocomplete atau gunakan lokasi GPS.

Data cuaca disediakan oleh [Open-Meteo](https://open-meteo.com/).

## Build dan jalankan dengan Docker

Dari direktori root repository:

```bash
docker build -t qwarts-weather .
docker stop qwarts-weather
docker rm qwarts-weather
docker run -d --name qwarts-weather -p 7860:7860 qwarts-weather
```

Container menyajikan frontend dan API bersama-sama pada port `7860`. Buka atau teruskan port tersebut di Codespaces.
