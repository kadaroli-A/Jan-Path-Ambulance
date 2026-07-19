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

count = run_yolo_nth_frame(
    "traffic.mp4",
    n=10
)

print("Occupancy:", count)