jest.mock('@tensorflow-models/coco-ssd', () => ({ load: jest.fn() }));
jest.mock('@vladmandic/face-api', () => ({
  nets: {
    tinyFaceDetector: { isLoaded: false, loadFromUri: jest.fn() },
    faceLandmark68TinyNet: { isLoaded: false, loadFromUri: jest.fn(), detectLandmarks: jest.fn() },
  },
  TinyFaceDetectorOptions: jest.fn(),
  detectSingleFace: jest.fn(),
}));

let service;
let coco;
let face;
let net;
beforeEach(() => {
  jest.resetModules();
  coco = require('@tensorflow-models/coco-ssd');
  face = require('@vladmandic/face-api');
  net = { detect: jest.fn().mockResolvedValue([]), dispose: jest.fn() };
  coco.load.mockResolvedValue(net);
  face.detectSingleFace.mockReturnValue({ withFaceLandmarks: jest.fn().mockResolvedValue(null) });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: jest.fn() });
  service = require('./proctoringModels');
});
afterEach(() => jest.restoreAllMocks());

test('camera check and exam share a single model load and warm-up', async () => {
  const cameraCheck = service.prepareProctoringModels();
  const exam = service.prepareProctoringModels();
  expect(cameraCheck).toBe(exam);
  const models = await exam;
  expect(await service.prepareProctoringModels()).toBe(models);
  expect(coco.load).toHaveBeenCalledTimes(1);
  expect(net.detect).toHaveBeenCalledTimes(1);
  expect(face.nets.tinyFaceDetector.loadFromUri).toHaveBeenCalledTimes(1);
  expect(face.nets.faceLandmark68TinyNet.detectLandmarks).toHaveBeenCalledTimes(1);
  expect(service.getProctoringSnapshot().status).toBe('ready');
  expect(net.dispose).not.toHaveBeenCalled();
});

test('readiness waits for landmark inference, not merely downloaded weights', async () => {
  let finish;
  const started = new Promise((resolve) => {
    face.nets.faceLandmark68TinyNet.detectLandmarks.mockImplementation(() => {
      resolve();
      return new Promise((done) => {
        finish = done;
      });
    });
  });
  const preparing = service.prepareProctoringModels();
  await started;
  expect(service.getProctoringSnapshot().status).toBe('loading');
  finish();
  await preparing;
  expect(service.getProctoringSnapshot().status).toBe('ready');
});

test('failed preparation disposes the partial object model and permits a retry', async () => {
  face.nets.tinyFaceDetector.loadFromUri.mockRejectedValueOnce(new Error('Network failure'));
  await expect(service.prepareProctoringModels()).rejects.toThrow('Network failure');
  expect(net.dispose).toHaveBeenCalledTimes(1);
  expect(service.getProctoringSnapshot().status).toBe('error');
  await service.prepareProctoringModels();
  expect(coco.load).toHaveBeenCalledTimes(2);
  expect(service.getProctoringSnapshot().status).toBe('ready');
});
