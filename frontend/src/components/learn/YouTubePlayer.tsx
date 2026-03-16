'use client';

import { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';

interface YouTubePlayerProps {
  videoId: string;
  startSeconds?: number;
  onProgress?: (seconds: number) => void;
  onComplete?: () => void;
}

export function YouTubePlayer({
  videoId,
  startSeconds = 0,
  onProgress,
  onComplete,
}: YouTubePlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      start: Math.floor(startSeconds),
    },
  };

  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    if (startSeconds > 0) {
      event.target.seekTo(startSeconds, true);
    }
  };

  const startProgressTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime?.();
        if (typeof currentTime === 'number') {
          onProgress?.(Math.floor(currentTime));
        }
      }
    }, 5000);
  };

  const stopProgressTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Save position on pause
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime?.();
      if (typeof currentTime === 'number') {
        onProgress?.(Math.floor(currentTime));
      }
    }
  };

  const onEnd = () => {
    stopProgressTracking();
    onComplete?.();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onReady}
        onPlay={startProgressTracking}
        onPause={stopProgressTracking}
        onEnd={onEnd}
        className="w-full h-full"
        iframeClassName="w-full h-full"
      />
    </div>
  );
}
