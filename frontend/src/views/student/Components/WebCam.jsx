import React, { useRef, useState, useEffect } from 'react';
import * as cocossd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card } from '@mui/material';
import { toast } from 'react-toastify';
import { uploadcareClient as client } from '../../../utils/uploadcareClient';

// How far (as a ratio of eye distance) the nose can drift from center
// before we consider the student's head turned away from the screen.
const LOOK_AWAY_THRESHOLD = 0.16;
// How long a condition must hold continuously before it counts as a real
// violation (filters out momentary flickers / quick glances).
const FACE_ISSUE_SUSTAIN_MS = 3000;

export default function Home({ cheatingLog, incrementViolation }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [lastDetectionTime, setLastDetectionTime] = useState({});
  const [screenshots, setScreenshots] = useState([]);

  // Refs (not state) since these update every tick and shouldn't trigger renders.
  const faceIssueStartRef = useRef(null);

  useEffect(() => {
    if (cheatingLog && cheatingLog.screenshots) {
      setScreenshots(cheatingLog.screenshots);
    }
  }, [cheatingLog]);

  const captureScreenshotAndUpload = async (type) => {
    const video = webcamRef.current?.video;

    if (
      !video ||
      video.readyState !== 4 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      console.warn('Video not ready for screenshot');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    const file = dataURLtoFile(dataUrl, `cheating_${Date.now()}.jpg`);

    try {
      const result = await client.uploadFile(file, { store: true });

      const screenshot = {
        url: result.cdnUrl,
        type: type,
        detectedAt: new Date(),
      };

      setScreenshots((prev) => [...prev, screenshot]);
      return screenshot;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      return null;
    }
  };

  const violationMessages = {
    noFace: 'Please face the screen',
    multipleFace: 'Multiple faces detected',
    cellPhone: 'Cell phone detected',
    tabSwitch: 'Tab inactivity detected',
  };

  const handleDetection = async (type) => {
    const now = Date.now();
    const lastTime = lastDetectionTime[type] || 0;

    if (now - lastTime >= 3000) {
      setLastDetectionTime((prev) => ({ ...prev, [type]: now }));

      const screenshot = await captureScreenshotAndUpload(type);
      incrementViolation(type, screenshot);

      // Non-blocking toast — doesn't require a click, doesn't interrupt
      // answering questions, and auto-dismisses on its own.
      toast.warning(violationMessages[type] || 'Warning recorded', {
        autoClose: 2500,
        pauseOnHover: false,
      });
    }
  };

  const loadModels = async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    ]);
  };

  const runDetectionLoop = async () => {
    try {
      const cocoNet = await cocossd.load();
      await loadModels();
      console.log('AI models loaded.');
      setInterval(() => {
        detect(cocoNet).catch((err) => console.error('Detection loop error:', err));
      }, 1000);
    } catch (error) {
      console.error('Error loading models:', error);
      toast.error('Failed to load AI models. Please refresh the page.');
    }
  };

  const isLookingAway = (landmarks) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();

    const avgX = (points) => points.reduce((sum, p) => sum + p.x, 0) / points.length;

    const leftEyeX = avgX(leftEye);
    const rightEyeX = avgX(rightEye);
    const noseX = avgX(nose);

    const eyeMidX = (leftEyeX + rightEyeX) / 2;
    const eyeDistance = Math.abs(rightEyeX - leftEyeX);

    if (eyeDistance === 0) return false;

    const offsetRatio = Math.abs(noseX - eyeMidX) / eyeDistance;
    return offsetRatio > LOOK_AWAY_THRESHOLD;
  };

  const detect = async (cocoNet) => {
    if (
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4 ||
      webcamRef.current.video.videoWidth === 0 ||
      webcamRef.current.video.videoHeight === 0
    ) {
      return;
    }

    const video = webcamRef.current.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    // --- coco-ssd: cell phone + multiple person detection only ---
    try {
      const objects = await cocoNet.detect(video);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      drawRect(objects, ctx);

      let personCount = 0;
      objects.forEach((element) => {
        if (element.class === 'cell phone') handleDetection('cellPhone');
        if (element.class === 'person') {
          personCount++;
          if (personCount > 1) handleDetection('multipleFace');
        }
      });
    } catch (error) {
      console.error('Error during object detection:', error);
    }

    // --- face-api: unified check — no face OR face turned away, both
    // treated as one "not facing the screen" condition, sustained for a
    // few seconds before it counts as a violation.
    try {
      const faceResult = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }),
        )
        .withFaceLandmarks(true);

      const notFacingScreen = !faceResult || isLookingAway(faceResult.landmarks);

      if (notFacingScreen) {
        if (faceIssueStartRef.current === null) {
          faceIssueStartRef.current = Date.now();
        } else if (Date.now() - faceIssueStartRef.current >= FACE_ISSUE_SUSTAIN_MS) {
          handleDetection('noFace');
          faceIssueStartRef.current = Date.now();
        }
      } else {
        faceIssueStartRef.current = null;
      }
    } catch (error) {
      console.error('Error during face detection:', error);
    }
  };

  useEffect(() => {
    runDetectionLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab-switch + cursor-left-page detection: browsers don't allow JS to
  // prevent either of these, but the Page Visibility API and mouseleave
  // events reliably tell us when they happen. Both feed the same
  // 'tabSwitch' counter, since either signals attention leaving the exam.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleDetection('tabSwitch');
      }
    };

    const handleMouseLeave = (event) => {
      // Only count the cursor genuinely leaving the browser viewport
      // (relatedTarget is null when moving outside the document entirely).
      if (!event.relatedTarget) {
        handleDetection('tabSwitch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <Card variant="outlined" sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          muted
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
          }}
        />
      </Card>
    </Box>
  );
}

function dataURLtoFile(dataUrl, fileName) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mime });
}
