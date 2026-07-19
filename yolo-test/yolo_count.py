import cv2
from ultralytics import YOLO

model = YOLO("yolov8n.pt")

cap = cv2.VideoCapture("traffic.mp4")

vehicle_classes = [
    "car",
    "bus",
    "truck",
    "motorcycle"
]

cv2.namedWindow(
    "JAN-PATH YOLO TEST",
    cv2.WINDOW_NORMAL
)

cv2.resizeWindow(
    "JAN-PATH YOLO TEST",
    1280,
    720
)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame, verbose=False)

    vehicle_count = 0

    for result in results:

        for box in result.boxes:

            cls_id = int(box.cls[0])

            class_name = model.names[cls_id]

            if class_name in vehicle_classes:

                vehicle_count += 1

                x1, y1, x2, y2 = map(
                    int,
                    box.xyxy[0]
                )

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    class_name,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2
                )

    cv2.putText(
        frame,
        f"Vehicles: {vehicle_count}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),
        3
    )

    display_frame = cv2.resize(
    frame,
    (1280, 720)
    )

    cv2.imshow(
        "JAN-PATH YOLO TEST",
        display_frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()