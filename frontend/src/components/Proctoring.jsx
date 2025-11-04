// src/components/Proctoring.js
import React, { useEffect } from "react";
import * as faceDetection from "@mediapipe/face_detection";
import * as cam from "@mediapipe/camera_utils";

const Proctoring = () => {
  useEffect(() => {
    const videoElement = document.getElementById("webcam");
    const canvasElement = document.getElementById("output");
    const canvasCtx = canvasElement.getContext("2d");

    const detector = new faceDetection.FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    detector.setOptions({
      model: "short",
      minDetectionConfidence: 0.6,
    });

    let lastReportTime = 0;
    const REPORT_INTERVAL = 3000; // Report every 3 seconds to avoid spam

    detector.onResults((results) => {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      const faces = results.detections.length;
      const currentTime = Date.now();

      // Only report if enough time has passed since last report
      if (currentTime - lastReportTime >= REPORT_INTERVAL) {
        if (faces === 0) {
          reportEvent("No face detected");
          lastReportTime = currentTime;
        } else if (faces > 1) {
          reportEvent("Multiple faces detected");
          lastReportTime = currentTime;
        }
      }

      // Draw detection boxes
      if (faces > 0) {
        results.detections.forEach(detection => {
          const bbox = detection.boundingBox;
          canvasCtx.strokeStyle = faces > 1 ? '#FF0000' : '#00FF00';
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeRect(
            bbox.xCenter * canvasElement.width - (bbox.width * canvasElement.width) / 2,
            bbox.yCenter * canvasElement.height - (bbox.height * canvasElement.height) / 2,
            bbox.width * canvasElement.width,
            bbox.height * canvasElement.height
          );
        });
      }
    });

    const camera = new cam.Camera(videoElement, {
      onFrame: async () => await detector.send({ image: videoElement }),
      width: 640,
      height: 480
    });
    camera.start();

    // Device info + events
    detectDevice();
    setupEventListeners();

    return () => {
      camera.stop();
      window.removeEventListener("visibilitychange", tabChange);
    };
  }, []);

  const [warning, setWarning] = React.useState("");
  const [warningVisible, setWarningVisible] = React.useState(false);

  const reportEvent = async (type) => {
    console.warn(type);
    setWarning(type);
    setWarningVisible(true);
    
    // Hide warning after 3 seconds
    setTimeout(() => {
      setWarningVisible(false);
    }, 3000);

    await fetch("http://localhost:5000/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: type, time: new Date() }),
    });
  };

  const detectDevice = () => {
    const ua = navigator.userAgent;
    const mobile = /Mobi|Android/i.test(ua);
    const info = {
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || "Unknown",
      memory: navigator.deviceMemory || "Unknown",
      screen: `${window.screen.width}x${window.screen.height}`,
      mobile,
    };
    reportEvent(`Device Info: ${JSON.stringify(info)}`);
  };

  const tabChange = () => {
    if (document.hidden) reportEvent("Tab switched or minimized");
  };

  const setupEventListeners = () => {
    // Tab switch
    document.addEventListener("visibilitychange", tabChange);

    // Copy / Paste
    document.addEventListener("copy", () => reportEvent("Copy detected"));
    document.addEventListener("paste", () => reportEvent("Paste detected"));

    // Screen resize
    window.addEventListener("resize", () => reportEvent("Screen resized"));
  };

  return (
    <div className="flex flex-col items-center w-full">
      <video id="webcam" autoPlay playsInline width="320" height="240" className="w-full h-auto"></video>
      <canvas id="output" width="320" height="240" className="w-full h-auto"></canvas>
      {warningVisible && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-1 rounded mt-2 flex items-center text-sm w-full">
          <span className="mr-2">⚠️</span>
          {warning}
        </div>
      )}
      <p className="text-gray-700 mt-2 text-sm">🧠 AI Proctoring Active...</p>
    </div>
  );
};

export default Proctoring;
