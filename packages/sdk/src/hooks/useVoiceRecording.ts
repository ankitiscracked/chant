import { useState, useRef, useCallback, useEffect } from "react";
import { useAudioSession } from "./useAudioSession";
import { useVoiceActivityDetection } from "./useVoiceActivityDetection";
import { useAudioProcessing } from "./useAudioProcessing";
import type { VADConfig } from '../types';

const VAD_CONFIG: VADConfig = {
  threshold: 20,
  silenceDuration: 1500, // ms of silence before stopping
};

const MAX_RECORDING_TIME = 30000; // max 30s per chunk

export function useVoiceRecording() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);
  const currentChunkRef = useRef<{ stopRecording: () => void } | null>(null);
  const isProcessingRef = useRef(false);

  // Initialize audio session
  const { stream, analyser, isReady } = useAudioSession(enabled);
  
  // Initialize VAD
  const { startVAD, stopVAD } = useVoiceActivityDetection(analyser, VAD_CONFIG, enabledRef);
  
  // Initialize audio processing
  const { transcript, processAudioChunk } = useAudioProcessing();

  // Keep enabledRef in sync with enabled state
  enabledRef.current = enabled;

  const createRecordingChunk = useCallback((
    stream: MediaStream,
    analyser: AnalyserNode,
    onChunkComplete: () => void
  ) => {
    const audioChunks: Blob[] = [];
    console.log("stream", stream);
    const mediaRecorder = new MediaRecorder(stream);
    let maxTimeoutId: NodeJS.Timeout | null = null;
    let vadCleanup: (() => void) | null = null;

    const stopRecording = () => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      if (vadCleanup) {
        vadCleanup();
      }
    };

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
      console.log("audio chunks", audioChunks);
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks);
        await processAudioChunk(audioBlob);
        onChunkComplete(); // Notify that this chunk is done
      }
    };

    // Setup voice activity detection using shared analyser
    vadCleanup = startVAD(stopRecording);

    // Max recording time fallback
    maxTimeoutId = setTimeout(stopRecording, MAX_RECORDING_TIME);

    mediaRecorder.start();
    return { stopRecording };
  }, [startVAD, processAudioChunk]);

  const startNextChunk = useCallback(() => {
    if (
      !stream ||
      !stream.active ||
      !analyser ||
      !enabledRef.current ||
      isProcessingRef.current
    )
      return;

    isProcessingRef.current = true;

    const onChunkComplete = () => {
      isProcessingRef.current = false;
      if (enabledRef.current) {
        setTimeout(startNextChunk, 200);
      }
    };

    currentChunkRef.current = createRecordingChunk(
      stream,
      analyser,
      onChunkComplete
    );
  }, [stream, analyser, createRecordingChunk]);

  // Start recording when audio session is ready
  useEffect(() => {
    if (enabled && isReady) {
      try {
        startNextChunk();
      } catch (error) {
        console.error("Failed to start listening:", error);
        setEnabled(false);
      }
    }
  }, [enabled, isReady, startNextChunk]);

  const start = useCallback(() => {
    setEnabled(true);
  }, []);

  const stop = useCallback(() => {
    // Cleanup current chunk
    if (currentChunkRef.current) {
      currentChunkRef.current.stopRecording();
    }
    stopVAD();
    isProcessingRef.current = false;
    setEnabled(false);
  }, [stopVAD]);

  return {
    enabled,
    transcript,
    isRecording: enabled,
    start,
    stop
  };
}