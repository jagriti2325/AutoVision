import os
import sys
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import cv2
import numpy as np

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths (absolute)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
car_detector = YOLO(os.path.abspath(os.path.join(BASE_DIR, '../../yolov8n.pt')))
swift_model = YOLO(os.path.abspath(os.path.join(BASE_DIR, '../../best.pt')))
dzire_model = YOLO(os.path.abspath(os.path.join(BASE_DIR, '../../bestdzire.pt')))

@app.post("/detect")
async def detect_car(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        debug = {}
        if frame is None:
            debug["nparr_shape"] = nparr.shape
            debug["nparr_type"] = str(nparr.dtype)
            return JSONResponse({"error": "Invalid image/frame received.", "debug": debug}, status_code=400)

        debug["frame_shape"] = frame.shape
        debug["frame_type"] = str(frame.dtype)

        car_found = False
        swift_found = False
        dzire_found = False
        swift_conf = 0.0
        dzire_conf = 0.0
        car_conf = 0.0

        # Step 1: detect cars only
        results = car_detector(frame, conf=0.5)
        debug["car_detector"] = str(results)
        if results[0].boxes is not None:
            for box in results[0].boxes:
                cls = int(box.cls)
                # COCO class 2 = car
                if cls != 2:
                    continue
                car_found = True
                conf = float(box.conf)
                if conf > car_conf:
                    car_conf = conf
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                car_crop = frame[y1:y2, x1:x2]

                # Step 2: check if car is Swift
                swift_results = swift_model(car_crop, conf=0.7)
                debug["swift_results"] = str(swift_results)
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
                debug["dzire_results"] = str(dzire_results)
                if dzire_results[0].boxes is not None:
                    for dbox in dzire_results[0].boxes:
                        did = int(dbox.cls)
                        dname = dzire_model.names[did]
                        dconf = float(dbox.conf)
                        if dname.lower() == "dzire":
                            dzire_found = True
                            if dconf > dzire_conf:
                                dzire_conf = dconf

        # Step 3: decision logic (strict for Dzire)
        if dzire_found:
            access = "denied"
            message = "ACCESS DENIED (Dzire)"
            confidence = dzire_conf
            label = "Dzire"
        elif swift_found:
            access = "granted"
            message = "ACCESS GRANTED (Swift)"
            confidence = swift_conf
            label = "Swift"
        elif car_found:
            access = "denied"
            message = "ACCESS DENIED (Car)"
            confidence = car_conf
            label = "Car"
        else:
            access = "no_car"
            message = "NO CAR DETECTED"
            confidence = 0.0
            label = "no_car"

        return JSONResponse({
            "access": access,
            "message": message,
            "swift": swift_found,
            "dzire": dzire_found,
            "car": car_found,
            "confidence": confidence,
            "label": label,
            "debug": debug
        })
    except Exception as e:
        import traceback
        print(f"Detection error: {e}")
        traceback.print_exc()
        return JSONResponse({"error": f"Detection error: {str(e)}"}, status_code=500)

@app.get("/")
def root():
    return {"message": "AutoVision Car Access Detection API"}
