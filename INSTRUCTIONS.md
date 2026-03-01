# Karaoke Web App (UltraStar) — Project Description

## Purpose
Build a small, clean karaoke web app that can work with UltraStar song files. The app should be designed so that it can start with a local song library (UltraStar `.txt` files + assets like audio/cover/background), and later optionally connect to a remote UltraStar-compatible server as an additional data source.

## High-level goals
- Keep scope small and implementation straightforward.
- Support the UltraStar format well enough to browse songs and play them with synchronized lyrics.
- Design the UI/UX first (frontend-first), then build the backend to match the UI needs.
- Keep the architecture flexible so a second data source (server) can be added later without rewriting everything.

## Core capabilities (conceptual)
- Library: browse/search/filter songs.
- Song view: show metadata and assets (cover/background if available).
- Playback: play the audio and show synchronized lyrics based on UltraStar timing.
- Import/source: initially from a local library; later optionally from a server.
- Scoring the player's singing based on pitch accuracy

## Non-goals (for the first iteration)
- Scoring, pitch detection, microphone input.
- User accounts / social features.
- Complex moderation or upload workflows.

## Tech constraints
- Frontend: React + TypeScript.
- Backend (later): Java + Spring + Maven.
- Prefer simple, maintainable solutions over cleverness.

## Notes on UltraStar reality
UltraStar files and libraries can be inconsistent (encoding quirks, missing assets, unexpected tags). The system should be resilient and handle imperfect song data gracefully.

## Deliverables
- A frontend app that defines the user flows and UI.
- A backend service (second step) that supplies exactly the data the frontend needs, based on local UltraStar files first, with an optional path for a server-based source later.