"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requestAudioFocus, resolveAudioUrl, STOP_AUDIO_EVENT, stopDetachedAudio } from "@/lib/audio-control";
import { cn } from "@/lib/utils";

type AudioPlayerProps = {
  className?: string;
  label?: string;
  url: string;
};

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AudioPlayer({ className, label = "Audio", url }: AudioPlayerProps) {
  const sourceId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const resolvedUrl = useMemo(() => resolveAudioUrl(url), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const element = audio;

    function syncTime() {
      setCurrentTime(element.currentTime);
    }

    function syncDuration() {
      setDuration(element.duration && Number.isFinite(element.duration) ? element.duration : 0);
    }

    function handleEnded() {
      setIsPlaying(false);
      element.currentTime = 0;
      setCurrentTime(0);
    }

    function handleExternalStop(event: Event) {
      const detail = (event as CustomEvent<{ sourceId?: string }>).detail;
      if (detail?.sourceId === sourceId) {
        return;
      }
      element.pause();
      setIsPlaying(false);
    }

    element.addEventListener("timeupdate", syncTime);
    element.addEventListener("loadedmetadata", syncDuration);
    element.addEventListener("durationchange", syncDuration);
    element.addEventListener("ended", handleEnded);
    window.addEventListener(STOP_AUDIO_EVENT, handleExternalStop);

    return () => {
      element.pause();
      element.removeEventListener("timeupdate", syncTime);
      element.removeEventListener("loadedmetadata", syncDuration);
      element.removeEventListener("durationchange", syncDuration);
      element.removeEventListener("ended", handleEnded);
      window.removeEventListener(STOP_AUDIO_EVENT, handleExternalStop);
    };
  }, [sourceId, resolvedUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    stopDetachedAudio();
    requestAudioFocus(sourceId);
    audio.play().then(() => setIsPlaying(true)).catch(() => toast.error("Không phát được audio."));
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !duration) {
      return;
    }
    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div className={cn("flex w-full flex-col gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm", className)}>
      <audio preload="metadata" ref={audioRef} src={resolvedUrl} />
      <div className="flex flex-wrap items-center gap-3">
        <Button aria-label={isPlaying ? "Tạm dừng" : "Phát"} onClick={togglePlayback} size="icon-sm" type="button" variant="ghost">
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <span className="min-w-0 shrink-0 font-medium text-muted-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </span>
        <input
          aria-label="Tua audio"
          className="h-1 min-w-32 flex-[1_1_12rem] cursor-pointer accent-primary"
          max={duration || 0}
          min={0}
          onChange={(event) => seek(Number(event.target.value))}
          step="0.1"
          type="range"
          value={Math.min(currentTime, duration || 0)}
        />
        <div className="hidden items-center gap-2 md:flex">
          {volume === 0 ? <VolumeX className="size-4 text-muted-foreground" /> : <Volume2 className="size-4 text-muted-foreground" />}
          <input
            aria-label="Âm lượng"
            className="h-1 w-20 cursor-pointer accent-primary"
            max={1}
            min={0}
            onChange={(event) => setVolume(Number(event.target.value))}
            step="0.05"
            type="range"
            value={volume}
          />
        </div>
        <select
          aria-label="Tốc độ phát"
          className="h-8 rounded-lg border border-border bg-white px-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          onChange={(event) => setPlaybackRate(Number(event.target.value))}
          value={playbackRate}
        >
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
        </select>
      </div>
      <div className="flex items-center gap-3 md:hidden">
        {volume === 0 ? <VolumeX className="size-4 text-muted-foreground" /> : <Volume2 className="size-4 text-muted-foreground" />}
        <input
          aria-label="Âm lượng"
          className="h-1 flex-1 cursor-pointer accent-primary"
          max={1}
          min={0}
          onChange={(event) => setVolume(Number(event.target.value))}
          step="0.05"
          type="range"
          value={volume}
        />
      </div>
    </div>
  );
}
