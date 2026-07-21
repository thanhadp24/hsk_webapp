"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requestAudioFocus, resolveAudioUrl, setDetachedAudio } from "@/lib/audio-control";
import { cn } from "@/lib/utils";

type AudioButtonProps = {
  className?: string;
  label?: string;
  lang?: string;
  pitch?: number;
  rate?: number;
  text?: string | null;
  url?: string | null;
};

const DEFAULT_LANG = "zh-CN";
const DEFAULT_RATE = 0.8;
function playAudioUrl(url: string) {
  requestAudioFocus("audio-button");
  const audio = new Audio(resolveAudioUrl(url));
  setDetachedAudio(audio);
  audio.addEventListener("ended", () => setDetachedAudio(null), { once: true });
  audio.play().catch(() => toast.error("Không phát được audio."));
}

function findChineseVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const normalizedLang = lang.toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalizedLang) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("cmn")) ||
    voices[0]
  );
}

export function AudioButton({ className, label, lang = DEFAULT_LANG, pitch = 1, rate = DEFAULT_RATE, text, url }: AudioButtonProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const speechText = text?.trim();

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  return (
    <Button
      aria-label={label || "Nghe phát âm"}
      className={cn(speaking && "border-primary bg-[var(--primary-soft)] text-primary", className)}
      disabled={!speechText && !url}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (url) {
          playAudioUrl(url);
          return;
        }

        if (speechText && typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
          requestAudioFocus("speech");

          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.lang = lang;
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.voice = findChineseVoice(voices, lang) || null;
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = (speechEvent) => {
            setSpeaking(false);
            if (speechEvent.error === "canceled" || speechEvent.error === "interrupted") {
              return;
            }
            toast.error("Không đọc được bằng Web Speech API.");
          };

          setSpeaking(true);
          window.speechSynthesis.speak(utterance);
          return;
        }

        toast.error("Trình duyệt chưa hỗ trợ Web Speech API.");
      }}
      size="icon"
      title={label || "Nghe phát âm"}
      type="button"
      variant="outline"
    >
      <Volume2 className="size-4" />
    </Button>
  );
}
