import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

const TABS = [
  { name: "Home" },
  { name: "Detection" },
  { name: "About" },
];

export default function App() {
  const [tab, setTab] = useState("Home");
  const [access, setAccess] = useState(null);
  const [message, setMessage] = useState("");
  const [swift, setSwift] = useState(false);
  const [dzire, setDzire] = useState(false);
  const [car, setCar] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastDetection, setLastDetection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [debug, setDebug] = useState(null);
  const videoRef = useRef();
  const canvasRef = useRef();
  const intervalRef = useRef(null);

  // Webcam access effect
  useEffect(() => {
    if (tab === "Detection" && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.error("Webcam access denied or not available", err);
        });
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [tab]);

  // Live detection effect (one-shot per click)
  useEffect(() => {
    if (live) {
      handleDetect();
      setLive(false); // Stop live after one detection
    }
    // eslint-disable-next-line
  }, [live]);

  // Capture image from webcam and send to backend
  const handleDetect = async () => {
    setLoading(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setLoading(false);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");
      try {
        const res = await axios.post("http://localhost:8000/detect", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Only update result if a car is detected or error
        if (res.data.access === "granted" || res.data.access === "denied") {
          setAccess(res.data.access);
          setMessage(res.data.message);
          setSwift(res.data.swift);
          setDzire(res.data.dzire);
          setCar(res.data.car);
          setConfidence(res.data.confidence);
          setDebug(res.data.debug || null);
          setLastDetection({
            time: new Date().toLocaleTimeString(),
            message: res.data.message,
            label: res.data.label,
            confidence: res.data.confidence,
          });
        }
        // If no car, do not clear previous detection
      } catch (e) {
        setAccess("error");
        setMessage("Detection error");
        setDebug(e.response?.data?.debug || null);
        setLastDetection(null);
      }
      setLoading(false);
    }, "image/jpeg");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-2 px-2 bg-gradient-to-br from-[#e0e7ef] via-[#f5f7fa] to-[#dbeafe]">
      <header className="w-full max-w-5xl flex flex-col items-center mb-0 mt-0">
        <div className="flex items-center gap-4 mb-2 justify-center">
          <span className="w-16 h-16 flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="32" width="80" height="32" rx="16" fill="#2563eb"/>
              <ellipse cx="24" cy="72" rx="12" ry="8" fill="#1e293b"/>
              <ellipse cx="72" cy="72" rx="12" ry="8" fill="#1e293b"/>
              <rect x="24" y="40" width="48" height="16" rx="8" fill="#f1f5f9"/>
              <rect x="36" y="44" width="24" height="8" rx="4" fill="#2563eb"/>
              <rect x="40" y="48" width="16" height="4" rx="2" fill="#1e293b"/>
              <circle cx="24" cy="72" r="6" fill="#f1f5f9"/>
              <circle cx="72" cy="72" r="6" fill="#f1f5f9"/>
              <rect x="8" y="32" width="80" height="8" rx="4" fill="#3b82f6"/>
            </svg>
          </span>
          <span className="text-3xl font-extrabold text-blue-900 tracking-tight drop-shadow">AutoVision</span>
        </div>
        <div className="text-blue-700 font-semibold text-lg tracking-wide mb-1">AI-powered Car Access Control</div>
        <nav className="flex gap-4 mt-1">
          {TABS.map((t) => (
            <button
              key={t.name}
              className={`px-5 py-2 rounded-full font-semibold shadow transition-all duration-200 ${tab === t.name ? "bg-blue-700 text-white scale-105" : "bg-white/80 text-blue-700 hover:bg-blue-200"}`}
              onClick={() => setTab(t.name)}
            >
              {t.name}
            </button>
          ))}
        </nav>
      </header>
      <main className="w-full max-w-7xl bg-white/90 rounded-2xl shadow-xl p-4 min-h-[180px] flex flex-col items-center border border-blue-100">
        {tab === "Home" && (
          <div className="flex flex-row animate-fade-in px-2 font-poppins w-full gap-8">
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="text-4xl font-extrabold mb-6 text-blue-800 drop-shadow-lg tracking-wide font-poppins">
                Welcome to <span className="text-blue-900">AutoVision</span>
              </h1>
              <p className="text-xl text-gray-700 mb-4 font-medium text-center max-w-2xl font-poppins">
                AutoVision is a next-generation AI-powered car access control system for secure environments, parking lots, and smart gates.
              </p>
              <div className="mt-8 text-lg text-blue-500 w-full flex justify-center">
                <ul className="list-disc list-inside text-left max-w-2xl font-poppins text-lg">
                  <li><span className="font-bold text-blue-700">Live Webcam Detection:</span> Real-time car detection using your device's camera.</li>
                  <li><span className="font-bold text-blue-700">Swift Car Access:</span> Only Swift cars are granted access automatically.</li>
                  <li><span className="font-bold text-blue-700">Enhanced Security:</span> All other cars are denied for strict control.</li>
                  <li><span className="font-bold text-blue-700">Detection History:</span> Save and review detection results with confidence levels.</li>
                  <li><span className="font-bold text-blue-700">Professional UI/UX:</span> Modern, responsive design for easy use.</li>
                  <li><span className="font-bold text-blue-700">Built with:</span> FastAPI, React, Tailwind CSS, and YOLOv8.</li>
                </ul>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 rounded-2xl shadow-lg p-8">
              <div className="mt-4 text-base text-gray-700 w-full flex flex-col items-center">
                <p className="font-semibold text-lg mb-2 font-poppins">AutoVision is ideal for:</p>
                <ul className="list-disc list-inside text-left max-w-xl font-poppins text-lg">
                  <li>Residential and commercial parking management</li>
                  <li>Smart gate automation</li>
                  <li>Secure facility access control</li>
                  <li>Fleet and logistics monitoring</li>
                </ul>
              </div>
              <div className="mt-10 text-base text-gray-500 font-poppins text-center">To get started, go to the Detection tab and enable your webcam.</div>
            </div>
          </div>
        )}
        {tab === "Detection" && (
          <div className="flex flex-col items-center w-full animate-fade-in px-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="rounded-3xl border-2 border-blue-200 shadow-2xl mb-8 w-full max-w-2xl bg-[#f1f5f9]"
              width={720}
              height={480}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="flex gap-8 mt-4">
              <button
                onClick={() => setLive((v) => !v)}
                className={`px-7 py-2 rounded-full shadow-lg font-semibold text-lg transition ${live ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-600 text-white hover:bg-green-700"}`}
              >
                {live ? "Stop Live" : "Start Live Detection"}
              </button>
              <button
                onClick={() => {
                  if (lastDetection) {
                    setHistory((prev) => [lastDetection, ...prev.slice(0, 9)]);
                    setAccess(null);
                    setMessage("");
                    setSwift(false);
                    setDzire(false);
                    setCar(false);
                    setConfidence(null);
                    setLastDetection(null);
                  } else {
                    // No detection, add 'No car detected' to history and clear any result
                    setHistory((prev) => [{
                      time: new Date().toLocaleTimeString(),
                      message: "NO CAR DETECTED",
                      label: "no_car",
                      confidence: 0
                    }, ...prev.slice(0, 9)]);
                    setAccess(null);
                    setMessage("");
                    setSwift(false);
                    setDzire(false);
                    setCar(false);
                    setConfidence(null);
                    setLastDetection(null);
                  }
                }}
                className="px-7 py-2 rounded-full shadow-lg font-semibold text-lg transition bg-blue-500 text-white hover:bg-blue-700"
              >
                Capture
              </button>
            </div>
            <div className="mt-8 w-full flex flex-col items-center">
              <div className={`text-2xl font-bold tracking-wide ${access === "granted" ? "text-green-600 animate-pulse" : access === "denied" ? "text-red-600 animate-shake" : ""}`}>
                {/* Always show result if access is granted/denied */}
                {(access === "granted" || access === "denied") && (
                  <>
                    {message}
                    {typeof confidence === "number" && confidence > 0 ? (
                      <span className="ml-2 text-base font-normal text-blue-700">(Conf: {Math.round(confidence * 100)}%)</span>
                    ) : (
                      <span className="ml-2 text-base font-normal text-blue-700">(Conf: N/A)</span>
                    )}
                  </>
                )}
                {access === "denied" && car && !dzire && !swift && (
                  <>
                    {typeof confidence === "number" && confidence > 0 ? (
                      <span className="ml-2 text-base font-normal text-blue-700">(Conf: {Math.round(confidence * 100)}%)</span>
                    ) : (
                      <span className="ml-2 text-base font-normal text-blue-700">(Conf: N/A)</span>
                    )}
                  </>
                )}
              </div>
              <div className="mt-2 text-gray-700 text-lg">
                {car && <span>🚗 Car detected. </span>}
                {swift && <span>✅ Swift detected. </span>}
                {dzire && <span>🚫 Dzire detected. </span>}
              </div>
              {access === "error" && (
                <div className="mt-4 w-full bg-red-100 text-red-700 rounded p-2 text-xs overflow-x-auto">
                  <div className="font-bold mb-1">Debug Info:</div>
                  <pre>{debug ? JSON.stringify(debug, null, 2) : "No debug info from backend. Check backend logs."}</pre>
                </div>
              )}
            </div>
            <div className="mt-12 w-full">
              <h3 className="text-lg font-bold text-blue-700 mb-2">Detection History</h3>
              <div className="bg-[#f1f5f9] rounded-xl p-3 max-h-48 overflow-y-auto text-sm shadow-inner">
                {history.length === 0 && <div className="text-gray-400">No detection yet. Click 'Capture' to save a detection.</div>}
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between border-b border-gray-200 py-1 last:border-b-0">
                    <span>{h.time}</span>
                    <span>{h.message}</span>
                    <span>{h.label && h.label !== "no_car" && h.label !== "error" ? `(${h.label})` : ""}</span>
                    <span>{typeof h.confidence === "number" && h.confidence > 0 ? `Conf: ${Math.round(h.confidence * 100)}%` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "About" && (
          <div className="flex flex-row animate-fade-in px-2 w-full gap-8">
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold mb-2 text-blue-800">About AutoVision</h2>
              <p className="text-gray-700 mb-2 text-center">AutoVision is a comprehensive platform for automated car access control, built for reliability, scalability, and ease of use.</p>
              <div className="mt-8 text-lg text-blue-700 w-full flex justify-center">
                <ul className="list-disc list-inside text-left max-w-2xl">
                  <li><span className="font-bold">Backend:</span> FastAPI (Python) with YOLOv8 for high-accuracy car detection</li>
                  <li><span className="font-bold">Frontend:</span> React and Tailwind CSS for a seamless, modern user experience</li>
                  <li><span className="font-bold">Live Monitoring:</span> Real-time webcam integration for instant detection</li>
                  <li><span className="font-bold">Detection History:</span> Save and review results with confidence scores</li>
                  <li><span className="font-bold">Security:</span> Only authorized Swift cars are granted access</li>
                  <li><span className="font-bold">Applications:</span> Parking, gates, logistics, and facility management</li>
                </ul>
              </div>
              <div className="mt-10 text-base text-gray-500 text-center">For more information, custom solutions, or integration support, contact the developer or visit our documentation.</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-blue-700 mb-4">Our Vision</h3>
              <p className="text-gray-600 mb-4 text-center">Empowering secure, automated access for modern facilities with cutting-edge AI technology.</p>
              <div className="mt-4 text-base text-blue-800 font-poppins text-center">
                <span className="inline-block bg-blue-200 rounded-full px-4 py-2 font-semibold">Innovation | Security | Reliability</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
