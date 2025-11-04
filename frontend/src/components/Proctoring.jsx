// src/components/Proctoring.js
import React, { useEffect, useRef } from "react";
import * as faceDetection from "@mediapipe/face_detection";
import * as cam from "@mediapipe/camera_utils";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import '@tensorflow/tfjs';

const Proctoring = ({ onMaxWarnings }) => {
  const objectDetectorRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const warningCountRef = useRef(0);
  const WARNING_THRESHOLD = 5;
  const MAX_WARNINGS = 6;

  useEffect(() => {
    const videoElement = document.getElementById("webcam");
    const canvasElement = document.getElementById("output");
    const canvasCtx = canvasElement.getContext("2d");

    // Initialize face detector with improved settings
    const detector = new faceDetection.FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    detector.setOptions({
      model: "short",
      minDetectionConfidence: 0.7, // Increased confidence threshold
    });

    // Initialize COCO-SSD model for object detection
    const loadObjectDetector = async () => {
      try {
        objectDetectorRef.current = await cocoSsd.load();
        console.log("Object detection model loaded");
      } catch (err) {
        console.error("Error loading object detection model:", err);
      }
    };
    loadObjectDetector();

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

      // Draw face detection boxes
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

      // Run object detection for mobile phones
      if (objectDetectorRef.current) {
        objectDetectorRef.current.detect(videoElement).then(predictions => {
          predictions.forEach(prediction => {
            if (prediction.class === 'cell phone' && prediction.score > 0.6) {
              // Draw red box around detected phone
              canvasCtx.strokeStyle = '#FF0000';
              canvasCtx.lineWidth = 2;
              canvasCtx.strokeRect(
                prediction.bbox[0],
                prediction.bbox[1],
                prediction.bbox[2],
                prediction.bbox[3]
              );
              
              // Report mobile phone detection
              reportEvent("Mobile phone detected");
            }
          });
        }).catch(err => {
          console.error("Object detection error:", err);
        });
      }
    });

    const camera = new cam.Camera(videoElement, {
      onFrame: async () => {
        await detector.send({ image: videoElement });
      },
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
  const [warningSeverity, setWarningSeverity] = React.useState("low"); // low, medium, high

  const reportEvent = async (type) => {
    console.warn(type);
    
    // Set warning severity based on type
    let severity = "low";
    if (type.includes("Multiple faces") || type.includes("Mobile phone")) {
      severity = "high";
    } else if (type.includes("No face")) {
      severity = "medium";
    }

    // Increment warning count for severe violations
    if (severity === "high" || severity === "medium") {
      warningCountRef.current += 1;
      console.warn(`Warning count: ${warningCountRef.current}/${MAX_WARNINGS}`);
      
      // At 5 warnings, show final warning alert
      if (warningCountRef.current === WARNING_THRESHOLD) {
        alert("⚠️ FINAL WARNING: You have reached 5 warnings. The next violation will automatically submit your test.");
      }
      
      // Auto-submit at 6 warnings without additional alert
      if (warningCountRef.current >= MAX_WARNINGS) {
        console.warn("Maximum warnings reached!");
        onMaxWarnings?.();
      }
    }

    setWarning(type);
    setWarningSeverity(severity);
    setWarningVisible(true);
    
    // Hide warning after 5 seconds for high severity, 3 for others
    setTimeout(() => {
      setWarningVisible(false);
    }, severity === "high" ? 5000 : 3000);

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
    <div className="fixed top-4 right-4 z-50 w-64">
      <div className="relative">
        <video id="webcam" autoPlay playsInline width="320" height="240" className="w-full h-auto rounded-lg shadow-lg"></video>
        <canvas id="output" width="320" height="240" className="absolute top-0 left-0 w-full h-full rounded-lg"></canvas>
      </div>
      {warningVisible && (
        <div className={`px-3 py-1 rounded mt-2 flex items-center text-sm w-full ${
          warningSeverity === "high" 
            ? "bg-red-100 border border-red-400 text-red-700" 
            : warningSeverity === "medium"
            ? "bg-yellow-100 border border-yellow-400 text-yellow-700"
            : "bg-blue-100 border border-blue-400 text-blue-700"
        }`}>
          <span className="mr-2">{
            warningSeverity === "high" ? "🚫" : 
            warningSeverity === "medium" ? "⚠️" : "ℹ️"
          }</span>
          {warning}
        </div>
      )}
      <div className="flex justify-between w-full mt-2 bg-black bg-opacity-50 rounded-b-lg px-2 py-1">
        <p className="text-white text-xs">🧠 AI Proctoring</p>
        <div className="flex items-center">
          <p className={`text-white text-xs mr-2 ${warningCountRef.current >= WARNING_THRESHOLD ? 'animate-pulse text-red-400' : ''}`}>
            ⚠️ {warningCountRef.current}/{MAX_WARNINGS}
          </p>
          <p className="text-white text-xs">📱 Detection</p>
        </div>
      </div>
    </div>
  );
};

export default Proctoring;
