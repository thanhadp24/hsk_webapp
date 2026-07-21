"use client";

const DEFAULT_API_URL = "http://localhost:8000/api/v1";
export const STOP_AUDIO_EVENT = "hsk:stop-audio";

let activeDetachedAudio: HTMLAudioElement | null = null;

function getApiOrigin() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "http://localhost:8000";
  }
}

export function resolveAudioUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${getApiOrigin()}${url}`;
  }
  return `${getApiOrigin()}/${url}`;
}

export function stopDetachedAudio() {
  if (!activeDetachedAudio) {
    return;
  }
  activeDetachedAudio.pause();
  activeDetachedAudio = null;
}

export function requestAudioFocus(sourceId?: string) {
  stopDetachedAudio();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STOP_AUDIO_EVENT, { detail: { sourceId } }));
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function stopAllAudio() {
  requestAudioFocus();
}

export function setDetachedAudio(audio: HTMLAudioElement | null) {
  activeDetachedAudio = audio;
}
