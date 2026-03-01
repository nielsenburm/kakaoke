<p align="center">
  <img src="kakaoke.png" alt="KAKAoke Logo" width="280" />
</p>

<h1 align="center">KAKAoke</h1>

<p align="center">
  A karaoke web app for UltraStar song libraries
</p>

---

## About

KAKAoke lets you browse, search, and sing along to your local UltraStar song collection right in the browser. It parses UltraStar `.txt` files and their associated assets (audio, cover art, backgrounds) to deliver synchronized lyrics playback with pitch-accuracy scoring.

### Features

- **Song Library** — Browse, search, and filter your UltraStar song collection
- **Song Details** — View metadata, cover art, and background images
- **Synced Playback** — Play audio with lyrics synchronized to UltraStar timing data
- **Pitch Scoring** — Score your singing based on pitch accuracy
- **Flexible Sources** — Designed to support local files now and remote UltraStar servers later

## Tech Stack

| Layer    | Stack                          | Directory    |
|----------|--------------------------------|--------------|
| Frontend | React, TypeScript, Vite        | `frontend/`  |
| Backend  | Java, Spring Boot, Maven       | `backend/`   |

## Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Java** (JDK 17+)
- **Maven** (3.9+)
- A collection of UltraStar song files

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at [http://localhost:5173](http://localhost:5173).

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Songs

Place your UltraStar song folders into the `songs/` directory at the project root. Each song folder should contain at minimum an UltraStar `.txt` file and an audio file.

```
songs/
  Artist - Song Title/
    Artist - Song Title.txt   # UltraStar file
    Artist - Song Title.mp3   # Audio
    cover.jpg                 # Cover art (optional)
    background.jpg            # Background (optional)
```

## Project Structure

```
KAKAoke/
├── frontend/          # React + TypeScript app
├── backend/           # Java Spring Boot API
├── songs/             # Local UltraStar song library
├── openapi.yaml       # API specification
└── INSTRUCTIONS.md    # Full project description
```

## License

All rights reserved.
