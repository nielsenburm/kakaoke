# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KAKAoke is a karaoke web app that works with UltraStar song files. It browses a local song library (UltraStar `.txt` files + audio/cover/background assets) and plays songs with synchronized lyrics. A remote UltraStar-compatible server can be added as a secondary data source later.

## Tech Stack

- **Frontend:** React + TypeScript (in `frontend/`)
- **Backend:** Java + Spring + Maven (in `backend/`)

## Architecture Principles

- Frontend-first design: build the UI/UX first, then build the backend to serve exactly what the frontend needs.
- Data source abstraction: the architecture should support swapping/adding data sources (local files now, remote server later) without rewriting the frontend.
- UltraStar files are messy in practice — expect encoding quirks, missing assets, and unexpected tags. Handle imperfect data gracefully.

## Core Features

- **Library:** browse, search, and filter songs
- **Song view:** display metadata and assets (cover/background)
- **Playback:** play audio with synchronized lyrics based on UltraStar timing data
- **Scoring:** pitch-accuracy-based scoring of player singing

## Project Status

Greenfield project. See `INSTRUCTIONS.md` for the full project description.
Follow the The UltraStar File Format (v1) (see `The UltraStar File Format (v1).md`)
