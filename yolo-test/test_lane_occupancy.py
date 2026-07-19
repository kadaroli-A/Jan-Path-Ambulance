import sys
import os

sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )
)

from backend.services.yolo_service import run_yolo_nth_frame

lane_counts = {
    "L1": run_yolo_nth_frame("j3_lane1.mp4", n=10),
    "L2": run_yolo_nth_frame("j3_lane2.mp4", n=10),
    "L3": run_yolo_nth_frame("j3_lane3.mp4", n=10),
}

print(lane_counts)