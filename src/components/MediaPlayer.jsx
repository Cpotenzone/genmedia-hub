import React, { useState, useRef } from "react";
import { X, Play, Pause, Maximize, Download } from "lucide-react";

function ImageLightbox({ src, alt, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-fadeIn" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Close lightbox">
        <X className="w-6 h-6" />
      </button>
      <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export default function MediaPlayer({ mediaType, mediaUrl, base64Data, mimeType, alt }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const src = base64Data ? `data:${mimeType};base64,${base64Data}` : mediaUrl;

  if (!src) return null;

  // Image
  if (mediaType?.startsWith("image")) {
    return (
      <>
        <div className="relative cursor-pointer group" onClick={() => setLightboxOpen(true)}>
          <img src={src} alt={alt || "Generated image"} className="w-full rounded-xl object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition flex items-center justify-center">
            <Maximize className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition" />
          </div>
        </div>
        {lightboxOpen && <ImageLightbox src={src} alt={alt} onClose={() => setLightboxOpen(false)} />}
      </>
    );
  }

  // Audio
  if (mediaType?.startsWith("audio")) {
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
      setPlaying(!playing);
    };
    return (
      <div className="bg-[#1E293B] rounded-xl p-4 flex items-center gap-3">
        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white hover:bg-[#2563EB] transition shrink-0" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} className="flex-1 h-8" controls style={{ filter: "invert(1) hue-rotate(180deg)", width: "100%" }} />
      </div>
    );
  }

  // Video
  if (mediaType?.startsWith("video")) {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
        <video ref={videoRef} src={src} controls className="w-full h-full object-contain" playsInline />
      </div>
    );
  }

  return null;
}
