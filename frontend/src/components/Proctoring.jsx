import React, { useEffect, useRef } from "react";
import * as faceDetection from "@mediapipe/face_detection";
import * as cam from "@mediapipe/camera_utils";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const Proctoring = ({ onMaxWarnings, maxWarnings = 6 }) => {
  const objectDetectorRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const warningCountRef = useRef(0);
  const [currentMaxWarnings, setCurrentMaxWarnings] = React.useState(maxWarnings);

  React.useEffect(() => {
    setCurrentMaxWarnings(maxWarnings);
  }, [maxWarnings]);

  const WARNING_THRESHOLD = Math.max(1, currentMaxWarnings - 1);
  const MAX_WARNINGS = currentMaxWarnings;

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
      minDetectionConfidence: 0.7,
    });

    const loadObjectDetector = async () => {
      objectDetectorRef.current = await cocoSsd.load();
    };
    loadObjectDetector();

    let lastReportTime = 0;
    const REPORT_INTERVAL = 3000;

    detector.onResults((results) => {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      const faces = results.detections.length;
      const now = Date.now();

      if (now - lastReportTime >= REPORT_INTERVAL) {
        if (faces === 0) {
          reportEvent("No face detected");
          lastReportTime = now;
        } else if (faces > 1) {
          reportEvent("Multiple faces detected");
          lastReportTime = now;
        }
      }

      results.detections.forEach((detection) => {
        const b = detection.boundingBox;
        canvasCtx.strokeStyle = faces > 1 ? "#FF0000" : "#00FF00";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(
          b.xCenter * canvasElement.width -
            (b.width * canvasElement.width) / 2,
          b.yCenter * canvasElement.height -
            (b.height * canvasElement.height) / 2,
          b.width * canvasElement.width,
          b.height * canvasElement.height
        );
      });

      if (objectDetectorRef.current) {
        objectDetectorRef.current.detect(videoElement).then((predictions) => {
          predictions.forEach((p) => {
            if (p.class === "cell phone" && p.score > 0.6) {
              canvasCtx.strokeStyle = "#FF0000";
              canvasCtx.lineWidth = 2;
              canvasCtx.strokeRect(p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]);
              reportEvent("Mobile phone detected");
            }
          });
        });
      }
    });

    const camera = new cam.Camera(videoElement, {
      onFrame: async () => {
        await detector.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    detectDevice();
    setupEventListeners();

    return () => {
      camera.stop();
      document.removeEventListener("visibilitychange", tabChange);
    };
  }, []);

  const [warning, setWarning] = React.useState("");
  const [warningVisible, setWarningVisible] = React.useState(false);
  const [warningSeverity, setWarningSeverity] = React.useState("low");

  const reportEvent = async (type) => {
    const warnings = JSON.parse(
      sessionStorage.getItem("testWarnings") || "[]"
    );
    warnings.push({ timestamp: new Date().toISOString(), event: type });
    sessionStorage.setItem("testWarnings", JSON.stringify(warnings));

    let severity = "low";
    if (type.includes("Multiple faces") || type.includes("Mobile phone")) {
      severity = "high";
    } else if (type.includes("No face")) {
      severity = "medium";
    }

    if (severity === "high" || severity === "medium") {
      warningCountRef.current += 1;

      // ✅ ALERT ON EVERY WARNING
      alert(
        `⚠️ Proctoring Warning (${warningCountRef.current}/${MAX_WARNINGS})\n\n${type}`
      );

      if (warningCountRef.current === WARNING_THRESHOLD) {
        alert(
          "🚨 FINAL WARNING: Next violation will automatically submit your test."
        );
      }

      if (warningCountRef.current >= MAX_WARNINGS) {
        onMaxWarnings?.();
      }
    }

    setWarning(type);
    setWarningSeverity(severity);
    setWarningVisible(true);

    setTimeout(() => setWarningVisible(false), 3000);

    await fetch("http://localhost:5000/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: type, time: new Date() }),
    });
  };

  const detectDevice = () => {
    const info = {
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || "Unknown",
      memory: navigator.deviceMemory || "Unknown",
      screen: `${window.screen.width}x${window.screen.height}`,
    };
    reportEvent(`Device Info: ${JSON.stringify(info)}`);
  };

  const tabChange = () => {
    if (document.hidden) reportEvent("Tab switched or minimized");
  };

  const setupEventListeners = () => {
    document.addEventListener("visibilitychange", tabChange);
    document.addEventListener("copy", () => reportEvent("Copy detected"));
    document.addEventListener("paste", () => reportEvent("Paste detected"));
    window.addEventListener("resize", () => reportEvent("Screen resized"));
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-40">
      <div className="relative">
        <video
          id="webcam"
          autoPlay
          playsInline
          width="160"
          height="90"
          className="w-full h-auto rounded-lg shadow-lg"
        ></video>
        <canvas
          id="output"
          width="160"
          height="90"
          className="absolute top-0 left-0 w-full h-full rounded-lg"
        ></canvas>
      </div>

      {warningVisible && (
        <div className="px-3 py-1 rounded mt-2 text-sm bg-yellow-100 border border-yellow-400 text-yellow-700">
          ⚠️ {warning}
        </div>
      )}

      <div className="flex justify-between w-full mt-2 bg-black bg-opacity-50 rounded-b-lg px-2 py-1">
        <p className="text-white text-xs">🧠 AI Proctoring</p>
        <p className="text-white text-xs">
          ⚠️ {warningCountRef.current}/{MAX_WARNINGS}
        </p>
      </div>
    </div>
  );
};

export default Proctoring;
