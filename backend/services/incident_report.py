import time

# =========================================================
# INCIDENT REPORT STORAGE
# =========================================================

incident_reports = {}


# =========================================================
# INITIALIZE REPORT
# =========================================================

def initialize_report(ambulance_id):

    incident_reports[ambulance_id] = {
        "ambulance_id": ambulance_id,
        "junctions_activated": 0,
        "estimated_time_saved_sec": 0,
        "lane_selections": [],
        "high_urgency_events": 0,
        "start_time": time.time(),




        "last_junction": None,
        "last_lane": None,
        "last_urgency": None,
    }


# =========================================================
# RECORD JUNCTION ACTIVATION
# =========================================================

def record_junction_activation( ambulance_id, junction_id, eta ):

    if ambulance_id not in incident_reports:
        return

    report = incident_reports[ambulance_id]

    # Already recorded this junction
    if report["last_junction"] == junction_id:
        return

    report["last_junction"] = junction_id

    report["junctions_activated"] += 1
    report["estimated_time_saved_sec"] += round(eta)


# =========================================================
# =========================================================
# RECORD LANE SELECTION
# =========================================================

def record_lane_selection(
    ambulance_id,
    lane_id
):

    if ambulance_id not in incident_reports:
        return

    report = incident_reports[ambulance_id]

    # Already recorded this lane for current junction
    if report["last_lane"] == lane_id:
        return

    report["last_lane"] = lane_id

    report["lane_selections"].append(lane_id)


# =========================================================
# RECORD HIGH URGENCY
# =========================================================

def record_high_urgency(
    ambulance_id,
    junction_id
):

    if ambulance_id not in incident_reports:
        return

    report = incident_reports[ambulance_id]

    # Already counted HIGH urgency for this junction
    if (
        report["last_urgency"] == junction_id
    ):
        return

    report["last_urgency"] = junction_id

    report["high_urgency_events"] += 1


# =========================================================
# FINALIZE REPORT
# =========================================================

def finalize_report(ambulance_id):

    if ambulance_id not in incident_reports:
        return

    report = incident_reports[ambulance_id]

    duration = round(time.time() - report["start_time"])

    report["total_run_duration_sec"] = duration

    report["summary"] = (
        f"Emergency route cleared through "
        f"{report['junctions_activated']} junctions "
        f"in {duration} seconds."
    )


# =========================================================
# GET REPORT
# =========================================================

def get_report(ambulance_id):

    return incident_reports.get(ambulance_id)


# =========================================================
# RESET REPORT
# =========================================================

def reset_report(ambulance_id):

    if ambulance_id in incident_reports:
        del incident_reports[ambulance_id]