---
title: Qwarts Weather Dashboard
emoji: ⛅
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---


---
Cara push code di codespacesnya
env -u GITHUB_TOKEN -u GH_TOKEN gh auth setup-git
env -u GITHUB_TOKEN -u GH_TOKEN git push -u upstream main
---

# Qwarts Weather Dashboard

Full-stack Weather Dashboard built with FastAPI and React Vite.

## Fitur

- Cuaca saat ini, prakiraan per jam untuk 24 jam, dan prakiraan harian.
- Simpan kota favorit di browser untuk akses cepat.
- Bagikan kondisi cuaca melalui tautan yang membuka kota terkait.
- Cari kota dengan autocomplete; Enter memakai hasil lokasi yang cocok. Bisa juga gunakan lokasi GPS.
- Ganti satuan suhu Celsius/Fahrenheit; pilihan disimpan di browser.
- Animasi latar cute dapat dinyalakan atau dimatikan melalui tombol di bagian atas dashboard.
- Animasi latar menyesuaikan kondisi: cerah, berawan, hujan, badai, salju, hujan es, dan kabut, termasuk tampilan malam.
- Animasi latar dirender dengan Three.js dan mengikuti preferensi reduced motion perangkat.

Data cuaca dan pencarian kota disediakan oleh [WeatherAPI](https://www.weatherapi.com/). Paket gratis WeatherAPI menyediakan prakiraan hingga 3 hari.

## Konfigurasi WeatherAPI

Jalankan `cp .env.example .env`, lalu isi `WEATHERAPI_KEY` di `.env` dengan API key Anda. Jangan commit file `.env` atau API key ke repository.

Untuk Hugging Face Spaces, tambahkan `WEATHERAPI_KEY` melalui **Settings → Variables and secrets → New secret**. File `.env` lokal tidak ikut ter-deploy.

## Build dan jalankan dengan Docker

Dari direktori root repository:

```bash
docker build -t qwarts-weather .
docker stop qwarts-weather
docker rm qwarts-weather
docker run -d --name qwarts-weather --env-file .env -p 7860:7860 qwarts-weather
```

Container menyajikan frontend dan API bersama-sama pada port `7860`. Buka atau teruskan port tersebut di Codespaces.
