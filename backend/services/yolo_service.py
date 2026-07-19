from ultralytics import YOLO
import cv2
import os
import time

DEBUG = False


def debug_print(*args):
    if DEBUG:
        print(*args)

model = YOLO("yolov8n.pt")
print("YOLO model loaded successfully")

VEHICLE_CLASSES = {
    "car",
    "bus",
    "truck",
    "motorcycle"
}

# In-memory cache for YOLO vehicle counts. Repeated requests for the same video
# within 5 seconds return the previous result immediately without reopening the
# video file or running YOLO again.
YOLO_COUNT_CACHE = {}
CACHE_TTL_SECONDS = 5


def run_yolo_nth_frame(video_path, n=10):

    debug_print("VIDEO =", video_path)

    cache_key = video_path
    now = time.time()
    cached_entry = YOLO_COUNT_CACHE.get(cache_key)

    if cached_entry is not None:
        elapsed = now - cached_entry["timestamp"]
        if elapsed < CACHE_TTL_SECONDS:
            debug_print("USING CACHED YOLO COUNT FOR", video_path)
            return cached_entry["count"]

    video_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "yolo-test",
        video_path
    )

    debug_print("FULL PATH =", video_file)

    cap = cv2.VideoCapture(video_file)

    debug_print("OPENED =", cap.isOpened())

    frame_number = 0
    counts = []

    debug_print("START YOLO")

    while True:

        try:
            ret, frame = cap.read()
            
        except Exception as e:
            print("FRAME READ ERROR =", e)
            break

        if frame is not None:
            frame = cv2.resize(frame, (640, 360))

        if not ret:
            debug_print("VIDEO END")
            break

        frame_number += 1

        if frame_number > 10:
            debug_print("EARLY STOP")
            break


        if frame_number % 100 == 0:
            debug_print("FRAME =", frame_number)

        if frame_number % n != 0:
            continue

        debug_print("RUNNING YOLO ON", frame_number)

        results = model(frame, verbose=False)

        debug_print("YOLO DONE", frame_number)

        vehicle_count = 0

        for result in results:
            for box in result.boxes:

                cls_id = int(box.cls[0])
                class_name = model.names[cls_id]

                if class_name in VEHICLE_CLASSES:
                    vehicle_count += 1

        counts.append(vehicle_count)

    cap.release()

    debug_print("END YOLO")
    debug_print("COUNTS =", counts)

    if not counts:
        result = None
    else:
        result = round(sum(counts) / len(counts))

    # Store the computed vehicle count for this video so later calls can reuse it
    # while the cache remains valid.
    YOLO_COUNT_CACHE[cache_key] = {
        "count": result,
        "timestamp": time.time(),
    }

    return result