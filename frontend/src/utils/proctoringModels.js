export const FACE_DETECTOR_OPTIONS = { inputSize: 416, scoreThreshold: 0.3 };
export const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

let preparation;
let snapshot = { status: 'idle', message: 'Preparing camera monitoring…', models: null };
const listeners = new Set();
const publish = (update) => {
  snapshot = { ...snapshot, ...update };
  listeners.forEach((listener) => listener());
};

export const getProctoringSnapshot = () => snapshot;
export const subscribeToProctoring = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// One preparation per page lifetime, shared by the camera check and exam page.
// Rejected attempts can be retried; successfully loaded models stay in memory.
export function prepareProctoringModels() {
  if (preparation) return preparation;
  preparation = (async () => {
    let cocoNet;
    try {
      publish({ status: 'loading', message: 'Loading camera monitoring…' });
      await yieldToBrowser();
      const [cocossd, faceapi] = await Promise.all([
        import('@tensorflow-models/coco-ssd'),
        import('@vladmandic/face-api'),
      ]);
      publish({ message: 'Downloading detection models…' });
      // Load sequentially so large model initialisations do not compete for the UI thread.
      cocoNet = await cocossd.load();
      await yieldToBrowser();
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      }
      await yieldToBrowser();
      if (!faceapi.nets.faceLandmark68TinyNet.isLoaded) {
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
      }
      publish({ message: 'Warming up camera monitoring…' });
      await yieldToBrowser();
      const frame = document.createElement('canvas');
      frame.width = 640;
      frame.height = 480;
      frame.getContext('2d').fillRect(0, 0, frame.width, frame.height);
      // Exercise the same inference paths before reserving a new timed attempt.
      await cocoNet.detect(frame);
      await yieldToBrowser();
      await faceapi
        .detectSingleFace(frame, new faceapi.TinyFaceDetectorOptions(FACE_DETECTOR_OPTIONS))
        .withFaceLandmarks(true);
      await yieldToBrowser();
      // A blank warm-up frame has no face, so also warm the landmark network explicitly.
      await faceapi.nets.faceLandmark68TinyNet.detectLandmarks(frame);
      const models = { cocoNet, faceapi };
      publish({ status: 'ready', message: 'Camera monitoring is ready.', models });
      return models;
    } catch (error) {
      cocoNet?.dispose();
      publish({
        status: 'error',
        message: 'Camera monitoring could not load. Check your connection and try again.',
        models: null,
      });
      throw error;
    }
  })().catch((error) => {
    preparation = null;
    throw error;
  });
  return preparation;
}
