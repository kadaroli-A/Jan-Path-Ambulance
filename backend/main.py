from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from backend.services.yolo_service import run_yolo_nth_frame
from backend.services.incident_report import (
    initialize_report,
    record_junction_activation,
    record_lane_selection,
    record_high_urgency,
    finalize_report,
    get_report,
    reset_report
)
from backend.services.tts_service import generate_multilingual_tts
from fastapi.responses import FileResponse
from datetime import datetime
import time
import json
import math
import random
import os
import threading

DEBUG = False


def debug_print(*args):
    if DEBUG:
        print(*args)

print("Application startup")

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(title="Jan-Path API")

# =========================================================
# CORS FIX
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# CONFIG
# =========================================================

YOLO_ENABLED=True
debug_print("GLOBAL YOLO =", YOLO_ENABLED)

CONGESTION_THRESHOLD = 7

# =========================================================
# LOAD JUNCTIONS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "../data/junctions.json")

with open(DATA_PATH, "r") as f:
    JUNCTIONS = json.load(f)

# =========================================================
# MODELS
# =========================================================

class AmbulanceState(BaseModel):
    ambulance_id: str
    emergency_mode: bool
    latitude: float
    longitude: float
    speed_kmph: float
    route: List[str]

# =========================================================
# MEMORY STORE
# =========================================================

AMBULANCE_STORE = {}
AMBULANCE_LOCK = threading.Lock()

def simulate_ambulance():
    while True:

        if "AMB001" not in AMBULANCE_STORE:
            time.sleep(5)
            continue

        ambulance = AMBULANCE_STORE["AMB001"]

        debug_print("ROUTE =", ambulance.route)
        debug_print("ROUTE LENGTH =", len(ambulance.route))

        # Journey completed
        if len(ambulance.route) == 0:
            time.sleep(5)
            continue

        # Current target is ALWAYS the first junction
        target_junction = next(
            j for j in JUNCTIONS
            if j["junction_id"] == ambulance.route[0]
        )

        # Move towards current target
        ambulance.latitude += (
            target_junction["latitude"] - ambulance.latitude
        ) * 0.05

        ambulance.longitude += (
            target_junction["longitude"] - ambulance.longitude
        ) * 0.05

        debug_print(
            "SIM POS:",
            ambulance.latitude,
            ambulance.longitude
        )

        distance = get_distance_km(
            ambulance.latitude,
            ambulance.longitude,
            target_junction["latitude"],
            target_junction["longitude"]
        )

        debug_print(
            f"MOVING -> {target_junction['junction_id']} | "
            f"DISTANCE = {distance:.3f} km"
        )

        # Reached current target
        if distance < 0.02:
            # Snap position and pop route atomically so APIs see updated route
            with AMBULANCE_LOCK:
                ambulance.latitude = target_junction["latitude"]
                ambulance.longitude = target_junction["longitude"]
                # Remove the reached junction from the route
                if ambulance.route:
                    ambulance.route.pop(0)

            debug_print(f"REACHED {target_junction['junction_id']}")

            # ==============================
            # Incident Report
            # ==============================

            eta = calculate_eta(
                distance,
                ambulance.speed_kmph
            )

            direction = "right"

            # Compute direction only if another junction exists
            if len(ambulance.route) > 0:
                next_junction = next(
                    j for j in JUNCTIONS
                    if j["junction_id"] == ambulance.route[0]
                )

                direction = get_route_direction(
                    target_junction,
                    next_junction
                )

            valid_lanes = filter_lanes_by_direction(
                target_junction,
                direction
            )

            lane_occupancy = {}

            for lane in target_junction["lanes"]:
                lane_occupancy[lane["lane_id"]] = get_lane_occupancy(lane)

            valid_lane_counts = {
                lane["lane_id"]: lane_occupancy[lane["lane_id"]]
                for lane in valid_lanes
            }

            if valid_lane_counts:
                selected_lane = min(
                    valid_lane_counts.items(),
                    key=lambda x: (x[1], x[0])
                )[0]
            else:
                selected_lane = default_direction_lane(valid_lanes)

            urgency = "NORMAL"

            if valid_lane_counts and all(
                x >= CONGESTION_THRESHOLD
                for x in valid_lane_counts.values()
            ):
                urgency = "HIGH"

            record_junction_activation(
                ambulance.ambulance_id,
                target_junction["junction_id"],
                eta
            )

            record_lane_selection(
                ambulance.ambulance_id,
                selected_lane
            )

            if urgency == "HIGH":
                record_high_urgency(
                    ambulance.ambulance_id,
                    target_junction["junction_id"]
                )

            debug_print("NEW ROUTE:", ambulance.route)

            if len(ambulance.route) == 0:
                finalize_report(
                    ambulance.ambulance_id
                )

        time.sleep(1)
# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    
    return {"message": "Jan-Path backend running"}

# =========================================================
# UPDATE AMBULANCE
# =========================================================

@app.post("/ambulance/update")
def update_ambulance(state: AmbulanceState):
    if not state.emergency_mode:
        return {"status": "ignored — emergency mode OFF"}

    # Initialize report only once per emergency
    if get_report(state.ambulance_id) is None:
        initialize_report(state.ambulance_id)

    # Store ambulance state atomically
    with AMBULANCE_LOCK:
        AMBULANCE_STORE[state.ambulance_id] = state

    debug_print("UPDATED ROUTE:", state.route)
    debug_print("STORE KEYS:", AMBULANCE_STORE.keys())
    debug_print(
        "POST POS:",
        state.latitude,
        state.longitude
    )


    return {
        "status": "updated",
        "ambulance_id": state.ambulance_id
    }


# =========================================================
# GET AMBULANCE
# =========================================================

@app.get("/ambulance/{ambulance_id}")
def get_ambulance(ambulance_id: str):

    if ambulance_id not in AMBULANCE_STORE:
        return {"error": "not found"}

    return AMBULANCE_STORE[ambulance_id]

# =========================================================
# DIRECTION DETECTION
# =========================================================

def get_direction(ambulance, junction):

    dx = junction["longitude"] - ambulance.longitude
    dy = junction["latitude"] - ambulance.latitude

    if abs(dx) > abs(dy):
        return "right" if dx > 0 else "left"

    return "straight"

def get_route_direction(current_junction, next_junction):

    dx = next_junction["longitude"] - current_junction["longitude"]
    dy = next_junction["latitude"] - current_junction["latitude"]

    debug_print(
        f"ROUTE: {current_junction['junction_id']} -> {next_junction['junction_id']}"
    )
    debug_print(f"DX = {dx}")
    debug_print(f"DY = {dy}")

    if abs(dx) > abs(dy):
        direction = "right" if dx > 0 else "left"
    else:
        direction = "straight"

    debug_print(f"DIRECTION = {direction}")

    return direction

# =========================================================
# FILTER LANES
# =========================================================

def filter_lanes_by_direction(junction, direction):

    return [
        lane
        for lane in junction["lanes"]
        if direction in lane["direction"]
    ]

# =========================================================
# MOCK YOLO
# =========================================================

def mock_occupancy(lane):
    return random.randint(0, 10)


def get_lane_occupancy(lane):

    debug_print("YOLO ENABLED =", YOLO_ENABLED)
    debug_print("VIDEO =", lane["video"])
    debug_print("BEFORE YOLO")

    if YOLO_ENABLED:

        count = run_yolo_nth_frame(
            lane["video"],
            n=10
        )

        debug_print("AFTER YOLO")       
        debug_print("COUNT =", count)

        return count

    count = mock_occupancy(lane)

    debug_print("MOCK COUNT =", count)

    return count
    
    debug_print("CURRENT JUNCTION:", junction["junction_id"])
    debug_print("ROUTE:", ambulance.route)
    debug_print("FINAL DIRECTION:", direction)

# =========================================================
# DEFAULT LANE
# =========================================================

def default_direction_lane(valid_lanes):

    if not valid_lanes:
        return None

    return valid_lanes[0]["lane_id"]

# =========================================================
# BEST LANE
# =========================================================

def select_best_lane(valid_lanes):

    if not valid_lanes:
        return None, {}, "HIGH"

    lane_occupancy = {}

    for lane in valid_lanes:
        lane_occupancy[lane["lane_id"]] = get_lane_occupancy(lane)

    valid_counts = {
        k: v
        for k, v in lane_occupancy.items()
        if v is not None
    }

    if valid_counts:
        selected_lane = min(
            valid_counts.items(),
            key=lambda x: (x[1], x[0])
        )[0]
    else:
        selected_lane = default_direction_lane(valid_lanes)

    urgency = "NORMAL"

    if valid_counts and all(
        o > CONGESTION_THRESHOLD
        for o in valid_counts.values()
    ):
        urgency = "HIGH"

    return selected_lane, lane_occupancy, urgency

# =========================================================
# SIGNAL ACTION
# =========================================================

def decide_signal_action(selected_lane, urgency):

    if selected_lane is None:
        return "NO_ACTION"

    if urgency == "HIGH":
        return f"FORCE_GREEN_{selected_lane}"

    return f"PRIORITY_GREEN_{selected_lane}"

# =========================================================
# ADVISORY
# =========================================================

def generate_advisory(selected_lane, eta, urgency):

    if selected_lane is None:
        return {
            "tamil": "வழி கிடைக்கவில்லை.",
            "english": "No clear lane available.",
            "hindi": "कोई स्पष्ट लेन उपलब्ध नहीं है।"
        }

    lane_map_ta = {
        "L1": "இடது வழித்தடத்தில் உள்ள வாகனங்கள்",
        "L2": "நடுப்பாதையில் உள்ள வாகனங்கள்",
        "L3": "வலது வழித்தடத்தில் உள்ள வாகனங்கள்",
        "L4": "திருப்பும் பாதையில் உள்ள வாகனங்கள்"
    }

    lane_map_en = {
        "L1": "Vehicles in the left lane",
        "L2": "Vehicles in the middle lane",
        "L3": "Vehicles in the right lane",
        "L4": "Vehicles in the turning lane"
    }

    lane_map_hi = {
        "L1": "बाईं लेन के वाहन",
        "L2": "मध्य लेन के वाहन",
        "L3": "दाईं लेन के वाहन",
        "L4": "मुड़ने वाली लेन के वाहन"
    }

    lane_ta = lane_map_ta.get(selected_lane, "அனைத்து வாகனங்களும்")
    lane_en = lane_map_en.get(selected_lane, "All vehicles")
    lane_hi = lane_map_hi.get(selected_lane, "सभी वाहन")

    if urgency == "HIGH":

        tamil = (
            f"கவனம்! அவசர ஆம்புலன்ஸ் இன்னும் {eta} வினாடிகளில் "
            f"இந்த சந்திப்பை அடையும். "
            f"{lane_ta} பாதுகாப்பாக ஓரமாக நகர்ந்து "
            f"ஆம்புலன்ஸுக்கு உடனடியாக வழி விடுங்கள்."
        )

        english = (
            f"Attention! Emergency ambulance will reach the junction in "
            f"{eta} seconds. {lane_en}, please move safely aside and "
            f"give way immediately."
        )

        hindi = (
            f"सावधान! एम्बुलेंस {eta} सेकंड में इस चौराहे पर पहुंचेगी। "
            f"{lane_hi}, कृपया सुरक्षित रूप से किनारे होकर "
            f"एम्बुलेंस को तुरंत रास्ता दें।"
        )

    else:

        tamil = (
            f"கவனம்! அவசர ஆம்புலன்ஸ் இன்னும் {eta} வினாடிகளில் "
            f"இந்த சந்திப்பை அடையும். "
            f"{lane_ta} தயவுசெய்து பாதுகாப்பாக "
            f"ஓரமாக நகர்ந்து வழி விடுங்கள்."
        )

        english = (
            f"Attention! Emergency ambulance will reach the junction in "
            f"{eta} seconds. {lane_en}, please move aside safely."
        )

        hindi = (
            f"सावधान! एम्बुलेंस {eta} सेकंड में इस चौराहे पर पहुंचेगी। "
            f"{lane_hi}, कृपया सुरक्षित रूप से रास्ता दें।"
        )

    return {
        "tamil": tamil,
        "english": english,
        "hindi": hindi
    }
# =========================================================
# DISTANCE
# =========================================================

def get_distance_km(lat1, lon1, lat2, lon2):

    R = 6371

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(math.radians(lat1)) *
        math.cos(math.radians(lat2)) *
        math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c



# =========================================================

# ETA
# =========================================================

def get_traffic_multiplier():

    hour = datetime.now().hour

    if 8 <= hour <= 10 or 17 <= hour <= 19:
        return 1.5

    elif 12 <= hour <= 14:
        return 1.3

    return 1.2


def calculate_eta(distance_km, speed_kmph):

    if speed_kmph <= 0:
        return float("inf")

    eta = (distance_km / speed_kmph) * 3600

    

    debug_print("DISTANCE =", distance_km)
    debug_print("SPEED =", speed_kmph)
    debug_print("ETA =", eta)

    eta *= get_traffic_multiplier()

    debug_print("FINAL ETA =", round(eta))
    debug_print("----------------------")
    return round(eta)



# =========================================================
# CORE LOGIC
# =========================================================

def get_priority_junction(ambulance):

    best_result = None
    best_eta = float("inf")

    route_ids = ambulance.route

    debug_print("ROUTE =", route_ids)
    debug_print("ROUTE TYPE =", type(route_ids))
    debug_print("ROUTE LENGTH =", len(route_ids))

    if not route_ids:
        print("ERROR: No route found")
        return {
            "status": "no_route",
            "junction": None
        }

    # Always target first active junction
    target_junction_id = route_ids[0]

    for junction in JUNCTIONS:

        if junction["junction_id"] != target_junction_id:
            continue

        debug_print("CHECKING:", junction["junction_id"])

        distance = get_distance_km(
            ambulance.latitude,
            ambulance.longitude,
            junction["latitude"],
            junction["longitude"]
        )

        debug_print(
            f"DISTANCE TO {junction['junction_id']} = "
            f"{round(distance, 3)} km"
        )

        # Skip already crossed junction
        if distance < 0.02:

            if len(route_ids) == 1:
                distance = 0.02
            else:
                debug_print("JUNCTION ALREADY CROSSED")
                continue

        eta = calculate_eta(
            distance,
            ambulance.speed_kmph
        )

        current_index = route_ids.index(
            junction["junction_id"]
        )

        if current_index < len(route_ids) - 1:

            next_junction_id = route_ids[
                current_index + 1
            ]

            next_junction = next(
                j for j in JUNCTIONS
                if j["junction_id"] == next_junction_id
            )

            direction = get_route_direction(
                junction,
                next_junction
            )

            debug_print("\n====================")
            debug_print("CURRENT:", junction["junction_id"])
            debug_print("NEXT:", next_junction["junction_id"])
            debug_print("DIRECTION:", direction)
            debug_print("====================\n")

        else:

            if current_index > 0:

                previous_junction_id = route_ids[
                    current_index - 1
                ]

                previous_junction = next(
                    j for j in JUNCTIONS
                    if j["junction_id"] == previous_junction_id
                )

                direction = get_route_direction(
                    previous_junction,
                    junction
                )

            else:
                direction = "right"

        


        # =====================================================
        # ALL LANES
        # =====================================================
        all_lanes = junction["lanes"]

        # =====================================================
        # VALID LANES
        # =====================================================

        valid_lanes = filter_lanes_by_direction(
            junction,
            direction
        )

        # =====================================================
        # OCCUPANCY FOR ALL LANES
        # =====================================================

        lane_occupancy = {}

        for lane in all_lanes:

             try:

                 lane_occupancy[lane["lane_id"]] = (

                     get_lane_occupancy(lane)
              )

             except Exception as e:

                 print("YOLO ERROR =", e)

                 lane_occupancy[lane["lane_id"]] = 0

        # =====================================================
        # SELECT BEST VALID LANE
        # =====================================================

        valid_lane_counts = {}

        for lane in valid_lanes:

            lane_id = lane["lane_id"]

            valid_lane_counts[lane_id] = (
                lane_occupancy[lane_id]
            )

        if valid_lane_counts:

            selected_lane = min(
                valid_lane_counts.items(),
                key=lambda x: (x[1], x[0])
            )[0]

        else:
            selected_lane = default_direction_lane(
                valid_lanes
            )

        # =====================================================
        # URGENCY
        # =====================================================

        urgency = "NORMAL"


        debug_print("LANE COUNTS =", valid_lane_counts)
        debug_print("LANE OCCUPANCY =", lane_occupancy)
        debug_print("VALID LANE COUNTS =", valid_lane_counts)

        if valid_lane_counts and all(
            o is not None and o >= CONGESTION_THRESHOLD
            for o in valid_lane_counts.values()
        ):
            urgency = "HIGH"

        # =====================================================
        # SIGNAL ACTION
        # =====================================================

        signal_action = decide_signal_action(
            selected_lane,
            urgency
        )

        # =====================================================
        # ADVISORY
        # =====================================================

        advisory = generate_advisory(
            selected_lane,
            eta,
            urgency
        )

        try:
            generate_multilingual_tts(advisory)
        except Exception as e:
            print("=" * 60)
            print("TTS SKIPPED")
            print(e)
            print("=" * 60)

        debug_print("JUNCTION:", junction["junction_id"])
        debug_print("ETA:", eta)
        debug_print("DIRECTION:", direction)
        debug_print("VALID:", [x["lane_id"] for x in valid_lanes])
        debug_print("SELECTED:", selected_lane)
        debug_print("-------------------")
        
        current_result = {

            "junction_id": junction["junction_id"],

            "location": junction["location"],

            "eta": int(eta),

            "ambulance_lat": ambulance.latitude,

            "ambulance_lon": ambulance.longitude,

            "direction": direction,

            "valid_lanes": valid_lanes,

            "lane_occupancy": lane_occupancy,

            "selected_lane": selected_lane,

            "urgency": urgency,

            "signal_action": signal_action,

            "advisory": advisory
        }

        # =====================================================
        # INCIDENT REPORT
        # =====================================================


        # =====================================================
        # NEAREST JUNCTION
        # =====================================================

        if eta < best_eta:

            best_eta = eta

            best_result = current_result

            debug_print(
                "CURRENT BEST:",
                best_result["junction_id"]
            )

    

    return best_result


# =========================================================
# PRIORITY JUNCTION API
# =========================================================

@app.get("/priority-junction/{ambulance_id}")
def priority_junction(ambulance_id: str):

    # Copy ambulance state under lock to avoid race with simulator popping route
    with AMBULANCE_LOCK:
        if ambulance_id not in AMBULANCE_STORE:
            return {"error": "ambulance not found"}

        stored = AMBULANCE_STORE[ambulance_id]
        class _AmbCopy:
            pass

        amb = _AmbCopy()
        amb.ambulance_id = stored.ambulance_id
        amb.latitude = stored.latitude
        amb.longitude = stored.longitude
        amb.speed_kmph = stored.speed_kmph
        amb.route = list(stored.route)

    debug_print(
        "API POS:",
        amb.latitude,
        amb.longitude
    )
    debug_print("ROUTE =", amb.route)
    debug_print("ROUTE LENGTH =", len(amb.route))
    result = get_priority_junction(amb)

    debug_print("\nFINAL RESULT")
    debug_print(result)
    debug_print("==============")

    if not result:
        return {
            "status": "no junction found"
        }

    return result


# =========================================================
# INCIDENT REPORT
# =========================================================

@app.get("/incident-report/{ambulance_id}")
def incident_report(ambulance_id: str):

    report = get_report(ambulance_id)

    if report is None:
        return {
            "error": "report not found"
        }

    return report


@app.get("/audio/advisory.mp3")
def get_advisory_audio():
    return FileResponse(
        "backend/audio/advisory.mp3",
        media_type="audio/mpeg"
    )


@app.get("/audio/advisory_tamil.mp3")
def get_advisory_tamil_audio():
    return FileResponse(
        "backend/audio/advisory_tamil.mp3",
        media_type="audio/mpeg"
    )


@app.get("/audio/advisory_english.mp3")
def get_advisory_english_audio():
    return FileResponse(
        "backend/audio/advisory_english.mp3",
        media_type="audio/mpeg"
    )


@app.get("/audio/advisory_hindi.mp3")
def get_advisory_hindi_audio():
    return FileResponse(
        "backend/audio/advisory_hindi.mp3",
        media_type="audio/mpeg"
    )
# =========================================================
# START SIMULATOR
# =========================================================

print("Server started")

threading.Thread(
    target=simulate_ambulance,
    daemon=True
).start()