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

## Demo Assets

The traffic videos used for YOLO testing are not included in this repository because of their large size.

Place the required MP4 files inside the `yolo-test/` directory before running the occupancy detection scripts.
