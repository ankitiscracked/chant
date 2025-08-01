import { useRef, useEffect, useState } from "react";

export function useAudioSession(enabled: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      return;
    }

    const initializeAudioSession = async () => {
      try {
        // Create AudioContext and source for AudioWorklet
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        
        // Create source node (needed for AudioWorklet)
        sourceRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
        
        console.log('Audio session initialized:', {
          sampleRate: audioContextRef.current.sampleRate
        });
        
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize audio session:", error);
        setIsReady(false);
        throw error;
      }
    };

    initializeAudioSession();

    return () => {
      // Cleanup in reverse order
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      // Reset refs and state
      streamRef.current = null;
      audioContextRef.current = null;
      sourceRef.current = null;
      setIsReady(false);
    };
  }, [enabled]);

  return {
    stream: streamRef.current,
    audioContext: audioContextRef.current,
    source: sourceRef.current,
    isReady
  };
}