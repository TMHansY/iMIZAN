import asyncHandler from 'express-async-handler';
import Question from '../models/quesModel.js';
import Exam from '../models/examModel.js';
import isExamOwner from '../utils/checkExamOwnership.js';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const getYouTubeEmbedUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId;

    if (host === 'youtu.be') {
      [videoId] = url.pathname.split('/').filter(Boolean);
    } else if (
      ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)
    ) {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v');
      else {
        const [, type, id] = url.pathname.split('/');
        if (['embed', 'shorts', 'live'].includes(type)) videoId = id;
      }
    }

    return videoId && YOUTUBE_ID.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
};

const getQuestionsByExamId = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  if (!examId) {
    return res.status(400).json({ error: 'examId is missing or invalid' });
  }

  const questions = await Question.find({ examId });

  res.status(200).json(questions);
});

const createQuestion = asyncHandler(async (req, res) => {
  const { question, options, examId, imageUrl, videoUrl } = req.body;

  if (!examId) {
    return res.status(400).json({ error: 'examId is missing or invalid' });
  }

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error('You are not authorized to add questions to this exam');
  }

  const embeddedVideoUrl = getYouTubeEmbedUrl(videoUrl);
  if (videoUrl && !embeddedVideoUrl) {
    res.status(400);
    throw new Error('Enter a valid YouTube video link.');
  }

  const newQuestion = new Question({
    question,
    options,
    examId,
    imageUrl: imageUrl || null,
    videoUrl: embeddedVideoUrl,
  });

  const createdQuestion = await newQuestion.save();

  if (createdQuestion) {
    res.status(201).json(createdQuestion);
  } else {
    res.status(400);
    throw new Error('Invalid Question Data');
  }
});

export { getQuestionsByExamId, createQuestion };
