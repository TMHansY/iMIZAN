import React, { useRef, useState, useEffect } from 'react';
import * as cocossd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card } from '@mui/material';
import swal from 'sweetalert';
import { UploadClient } from '@uploadcare/upload-client';

const client = new UploadClient({
  publicKey: 'ad3316af84d6a1176983',
  baseCDN: 'https://5u5k52y8w7.ucarecd.net',
});

// How far (as a ratio of eye distance) the nose can drift from center
// before we consider the student's head turned away from the screen.
const LOOK_AWAY_THRESHOLD = 0.16;
// How long the head must stay turned away, continuously, before it counts
// as a real "looking away" violation (filters out quick glances).
const LOOK_AWAY_SUSTAIN_MS = 3000;

export default function Home({ cheatingLog, incrementViolation }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [lastDetectionTime, setLastDetectionTime] = useState({});
  const [screenshots, setScreenshots] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Tracks how long the head has been continuously turned away.
  // A ref (not state) since it's updated every tick and shouldn't trigger renders.
  const lookAwayStartRef = useRef(null);

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

  const handleDetection = async (type) => {
    const now = Date.now();
    const lastTime = lastDetectionTime[type] || 0;

    if (now - lastTime >= 3000) {
      setLastDetectionTime((prev) => ({ ...prev, [type]: now }));

      const screenshot = await captureScreenshotAndUpload(type);
      incrementViolation(type, screenshot);

      switch (type) {
        case 'noFace':
          swal('Face Not Visible', 'Warning Recorded', 'warning');
          break;
        case 'multipleFace':
          swal('Multiple Faces Detected', 'Warning Recorded', 'warning');
          break;
        case 'cellPhone':
          swal('Cell Phone Detected', 'Warning Recorded', 'warning');
          break;
        case 'lookingAway':
          swal('Please Face the Screen', 'Warning Recorded', 'warning');
          break;
        default:
          break;
      }
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
      setModelsLoaded(true);
      console.log('AI models loaded.');
      setInterval(() => detect(cocoNet), 1000);
    } catch (error) {
      console.error('Error loading models:', error);
      swal('Error', 'Failed to load AI models. Please refresh the page.', 'error');
    }
  };

  // Checks whether the head is turned away from center using landmark positions.
  // Returns true if turned beyond the threshold, false if roughly facing forward.
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
      webcamRef.current.video.readyState !== 4
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

    // --- face-api.js: real face presence + looking-away detection ---
    try {
      const faceResult = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }),
        )
        .withFaceLandmarks(true);

      if (!faceResult) {
        handleDetection('noFace');
        lookAwayStartRef.current = null;
      } else {
        const turnedAway = isLookingAway(faceResult.landmarks);

        if (turnedAway) {
          if (lookAwayStartRef.current === null) {
            lookAwayStartRef.current = Date.now();
          } else if (Date.now() - lookAwayStartRef.current >= LOOK_AWAY_SUSTAIN_MS) {
            handleDetection('lookingAway');
            // Reset so it takes another full sustained period before re-logging
            lookAwayStartRef.current = Date.now();
          }
        } else {
          lookAwayStartRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error during face detection:', error);
    }
  };

  useEffect(() => {
    runDetectionLoop();
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
