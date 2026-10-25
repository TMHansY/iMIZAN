import React, { useRef, useEffect, useState } from 'react';
import {
  prepareProctoringModels,
  FACE_DETECTOR_OPTIONS,
  yieldToBrowser,
} from '../../../utils/proctoringModels';
import { startDetectionLoop } from '../../../utils/detectionLoop';
import Webcam from 'react-webcam';
import useTabInactivity from '../../../hooks/useTabInactivity';
import { drawRect } from './utilities';
import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { uploadcareClient as client } from '../../../utils/uploadcareClient';

// How far (as a ratio of eye distance) the nose can drift from center
// before we consider the student's head turned away from the screen.
const LOOK_AWAY_THRESHOLD = 0.16;
// How long a condition must hold continuously before it counts as a real
// violation (filters out momentary flickers / quick glances).
const FACE_ISSUE_SUSTAIN_MS = 3000;

export default function Home({
  cheatingLog,
  incrementViolation,
  updateViolation,
  onCameraAccessLost,
}) {
  const webcamRef = useRef(null);
  const activeRef = useRef(true);
  const canvasRef = useRef(null);
  const callbacks = useRef({ incrementViolation, onCameraAccessLost });
  callbacks.current = { incrementViolation, onCameraAccessLost };
  const lastDetectionTime = useRef({});
  const faceIssueStartRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('checking');
  const [mediaStream, setMediaStream] = useState(null);
  const cameraLossReported = useRef(false);

  useEffect(() => {
    const tracks = mediaStream?.getVideoTracks?.() || [];
    const handleTrackEnded = () => {
      if (!activeRef.current || cameraLossReported.current) return;
      cameraLossReported.current = true;
      setCameraStatus('lost');
      callbacks.current.onCameraAccessLost?.();
    };

    tracks.forEach((track) => track.addEventListener('ended', handleTrackEnded));
    return () => tracks.forEach((track) => track.removeEventListener('ended', handleTrackEnded));
  }, [mediaStream]);

  const captureScreenshotAndUpload = async (type, detectedAt = new Date()) => {
    try {
      const video = webcamRef.current?.video;

      if (!video || video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
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

      const result = await client.uploadFile(file, { store: true });

      const screenshot = {
        url: result.cdnUrl,
        type: type,
        detectedAt,
      };

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
    const lastTime = lastDetectionTime.current[type] || 0;

    if (now - lastTime >= 3000) {
      lastDetectionTime.current[type] = now;

      const screenshot = await captureScreenshotAndUpload(type);
      if (!activeRef.current) return;
      callbacks.current.incrementViolation(type, screenshot);

      // Non-blocking toast — doesn't require a click, doesn't interrupt
      // answering questions, and auto-dismisses on its own.
      toast.warning(violationMessages[type] || 'Warning recorded', {
        autoClose: 2500,
        pauseOnHover: false,
      });
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

  const detect = async ({ cocoNet, faceapi }, isActive) => {
    if (
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4 ||
      webcamRef.current.video.videoWidth === 0 ||
      webcamRef.current.video.videoHeight === 0
    ) {
      setCameraStatus('checking');
      return;
    }

    const video = webcamRef.current.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;
    if (!canvasRef.current || !isActive()) return;
    if (canvasRef.current.width !== videoWidth) canvasRef.current.width = videoWidth;
    if (canvasRef.current.height !== videoHeight) canvasRef.current.height = videoHeight;

    // --- coco-ssd: cell phone + multiple person detection only ---
    try {
      const objects = await cocoNet.detect(video);
      if (!isActive() || !canvasRef.current) return;
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

    // Allow input and rendering between the object and face passes.
    await yieldToBrowser();
    if (!isActive()) return;

    // --- face-api: unified check — no face OR face turned away, both
    // treated as one "not facing the screen" condition, sustained for a
    // few seconds before it counts as a violation.
    try {
      const faceResult = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions(FACE_DETECTOR_OPTIONS))
        .withFaceLandmarks(true);
      if (!isActive()) return;

      const notFacingScreen = !faceResult || isLookingAway(faceResult.landmarks);
      setCameraStatus(notFacingScreen ? 'needs-attention' : 'active');

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
      setCameraStatus('checking');
      console.error('Error during face detection:', error);
    }
  };

  useEffect(() => {
    activeRef.current = true;
    let cancelled = false;
    let stop;
    prepareProctoringModels()
      .then((models) => {
        if (cancelled) return;
        stop = startDetectionLoop(
          (isActive) => detect(models, isActive),
          (error) => console.error('Detection loop error:', error),
        );
      })
      .catch(() => {
        if (!cancelled)
          toast.error('Camera monitoring could not start. Please return to the camera check.');
      });
    return () => {
      cancelled = true;
      activeRef.current = false;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useTabInactivity({
    cheatingLog,
    incrementViolation: (type, screenshot) => {
      incrementViolation(type, screenshot);
      toast.warning(violationMessages.tabSwitch, { autoClose: 2500, pauseOnHover: false });
    },
    updateViolation,
    capture: captureScreenshotAndUpload,
  });

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 300 },
        height: 180,
        mx: { xs: 0, sm: 'auto' },
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          px: 1,
          py: 0.75,
          bgcolor: 'rgba(0, 0, 0, 0.58)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Box>
          <Typography variant="caption" fontWeight={700} display="block" color="common.white">
            Camera monitoring
          </Typography>
          <Typography
            variant="caption"
            color={cameraStatus === 'needs-attention' ? 'warning.light' : 'grey.200'}
            sx={{ display: 'block', maxWidth: 190, lineHeight: 1.25 }}
          >
            {cameraStatus === 'needs-attention'
              ? 'Camera view obstructed — adjust your position.'
              : 'Keep your face visible throughout the exam.'}
          </Typography>
        </Box>
        <Chip
          size="small"
          color={
            cameraStatus === 'active'
              ? 'success'
              : cameraStatus === 'needs-attention'
              ? 'warning'
              : cameraStatus === 'lost'
              ? 'error'
              : 'default'
          }
          label={
            cameraStatus === 'active'
              ? 'Active'
              : cameraStatus === 'needs-attention'
              ? 'Adjust view'
              : cameraStatus === 'lost'
              ? 'Access lost'
              : 'Checking'
          }
          sx={{ height: 24, '& .MuiChip-label': { px: 0.75 } }}
        />
      </Stack>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          bgcolor: 'common.black',
        }}
      >
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
          onUserMedia={(stream) => {
            cameraLossReported.current = false;
            setMediaStream(stream);
            setCameraStatus('checking');
          }}
          onUserMediaError={() => {
            if (cameraLossReported.current) return;
            cameraLossReported.current = true;
            setCameraStatus('lost');
            callbacks.current.onCameraAccessLost?.();
          }}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
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
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Card>
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
