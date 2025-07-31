import { useRef, useEffect } from "react";

export function useAudioSession(enabled: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const initializeAudioSession = async () => {
      try {
        // Create single AudioContext and analyser for entire session
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 2048;
      } catch (error) {
        console.error("Failed to initialize audio session:", error);
        throw error;
      }
    };

    initializeAudioSession();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      // Reset refs
      streamRef.current = null;
      audioContextRef.current = null;
      analyserRef.current = null;
    };
  }, [enabled]);

  return {
    stream: streamRef.current,
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
    isReady: streamRef.current && audioContextRef.current && analyserRef.current
  };
}