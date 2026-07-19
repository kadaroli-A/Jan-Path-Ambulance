# JAN-PATH Backend

AI-Assisted Emergency Vehicle Traffic Intelligence System

## Features
- FastAPI Backend
- Ambulance Route Simulation
- Lane Selection Logic
- YOLO Vehicle Detection
- Traffic Signal Priority
- Multilingual Voice Advisory

## Installation

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn backend.main:app --reload
```

## API

- /ambulance/update
- /priority-junction/{ambulance_id}
- /audio/advisory.mp3
