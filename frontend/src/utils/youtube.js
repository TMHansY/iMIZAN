const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeEmbedUrl(value) {
  if (!value || typeof value !== 'string') return null;

  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId;

    if (host === 'youtu.be') {
      [videoId] = url.pathname.split('/').filter(Boolean);
    } else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
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
}
