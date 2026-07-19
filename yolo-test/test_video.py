import cv2

cap = cv2.VideoCapture("traffic.mp4")

if not cap.isOpened():
    print("Video not opened")
else:
    print("Video opened successfully")

cap.release()
