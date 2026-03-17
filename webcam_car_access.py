import cv2
from ultralytics import YOLO

# Model 1: reliable car detector
car_detector = YOLO("yolov8n.pt")

# Model 2: your Swift classifier
swift_model = YOLO("best.pt")
# Model 3: your Dzire classifier
dzire_model = YOLO("bestdzire.pt")

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()
    if not ret:
        break

    car_found = False
    swift_found = False
    dzire_found = False
    swift_conf = 0.0
    dzire_conf = 0.0

    # Step 1: detect cars only
    results = car_detector(frame, conf=0.5)

    if results[0].boxes is not None:

        for box in results[0].boxes:

            cls = int(box.cls)

            # COCO class 2 = car
            if cls != 2:
                continue

            car_found = True

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            car_crop = frame[y1:y2, x1:x2]

            # Step 2: check if car is Swift
            swift_results = swift_model(car_crop, conf=0.7)
            if swift_results[0].boxes is not None:
                for sbox in swift_results[0].boxes:
                    cid = int(sbox.cls)
                    cname = swift_model.names[cid]
                    sconf = float(sbox.conf)
                    if cname.lower() == "swift":
                        swift_found = True
                        if sconf > swift_conf:
                            swift_conf = sconf

            # Step 2b: check if car is Dzire
            dzire_results = dzire_model(car_crop, conf=0.7)
            if dzire_results[0].boxes is not None:
                for dbox in dzire_results[0].boxes:
                    did = int(dbox.cls)
                    dname = dzire_model.names[did]
                    dconf = float(dbox.conf)
                    if dname.lower() == "dzire":
                        dzire_found = True
                        if dconf > dzire_conf:
                            dzire_conf = dconf

            # draw car box
            cv2.rectangle(frame,(x1,y1),(x2,y2),(255,255,0),2)

    # Step 3: decision logic (strict for Dzire)

    if dzire_found:
        text = f"ACCESS DENIED (Dzire, Conf: {dzire_conf:.2f})"
        color = (0,0,255)
    elif swift_found:
        text = f"ACCESS GRANTED (Swift, Conf: {swift_conf:.2f})"
        color = (0,255,0)
    elif car_found:
        # Show car detection confidence if available
        car_conf = 0.0
        if results[0].boxes is not None:
            for box in results[0].boxes:
                cls = int(box.cls)
                if cls == 2:
                    conf = float(box.conf)
                    if conf > car_conf:
                        car_conf = conf
        text = f"ACCESS DENIED (Car, Conf: {car_conf:.2f})"
        color = (0,0,255)
    else:
        text = "NO CAR DETECTED"
        color = (255,255,255)

    cv2.putText(frame, text, (40,60),
                cv2.FONT_HERSHEY_SIMPLEX,
                1, color, 3)

    cv2.imshow("Car Gate System", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()