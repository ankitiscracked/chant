import { useState, useRef, useCallback, useEffect } from "react";
import { useAudioSession } from "./useAudioSession";
import { useVoiceActivityDetection } from "./useVoiceActivityDetection";
import { useAudioProcessing } from "./useAudioProcessing";
import type { VADOptions } from "../types";

const VAD_CONFIG: VADOptions = {
  threshold: 0.1,
  silenceDuration: 1500, // ms of silence before stopping
  useWorklet: true, // Enable AudioWorklet by default
};

const MAX_RECORDING_TIME = 30000; // max 30s per segment (fallback)

export interface VoiceRecordingOptions {
  useWorklet?: boolean;
  vadConfig?: Partial<VADOptions>;
}

export function useVoiceRecording(options?: VoiceRecordingOptions) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);
  const currentRecorderRef = useRef<{ stopRecording: () => void } | null>(null);
  const isProcessingRef = useRef(false);

  // Merge user options with defaults
  const vadConfig: VADOptions = {
    ...VAD_CONFIG,
    ...options?.vadConfig,
    useWorklet: options?.useWorklet ?? VAD_CONFIG.useWorklet,
  };

  // Initialize audio session
  const { stream, audioContext, source, isReady } = useAudioSession(enabled);

  // Initialize VAD with AudioWorklet support
  const { startVAD, stopVAD, getCapabilities, currentStrategy } =
    useVoiceActivityDetection(vadConfig, enabledRef);

  // Initialize audio processing
  const { transcript, processAudioChunk } = useAudioProcessing();

  // Keep enabledRef in sync with enabled state
  enabledRef.current = enabled;

  // Forward declaration for startContinuousRecording
  const startContinuousRecordingRef = useRef<(() => void) | null>(null);

  // Handle processing completion
  const onRecordingComplete = useCallback(() => {
    isProcessingRef.current = false;
    // Restart recording if still enabled
    if (enabledRef.current && startContinuousRecordingRef.current) {
      setTimeout(() => {
        if (enabledRef.current) {
          try {
            startContinuousRecordingRef.current?.();
          } catch (error) {
            console.error("Failed to restart recording:", error);
            // Stop recording on repeated failures
            setEnabled(false);
          }
        }
      }, 100); // Small delay to prevent rapid restarts
    }
  }, []);

  // Modify processAudioChunk to trigger continuation
  const processAudioChunkWithContinuation = useCallback(
    async (audioBlob: Blob) => {
      await processAudioChunk(audioBlob);
      onRecordingComplete();
    },
    [processAudioChunk, onRecordingComplete]
  );

  /**
   * Create segment-based recording using AudioWorklet
   */
  const createSmartRecording = useCallback(() => {
    if (!stream || !isReady || !audioContext || !source) return null;

    // Check if stream is still active
    if (!stream.active) {
      console.warn("MediaStream is no longer active");
      return null;
    }

    // Check if AudioContext is in valid state
    if (audioContext.state === 'closed') {
      console.warn("AudioContext is closed");
      return null;
    }

    const audioChunks: Blob[] = [];
    console.log("Creating smart recording with strategy:", currentStrategy);
    const mediaRecorder = new MediaRecorder(stream);
    let maxTimeoutId: NodeJS.Timeout | null = null;
    let vadCleanup: (() => void) | Promise<(() => void) | null> | null = null;
    let isRecordingActive = false;

    const stopRecording = () => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
      isRecordingActive = false;
    };

    const startRecording = () => {
      if (mediaRecorder.state === "inactive" && !isRecordingActive && stream.active) {
        audioChunks.length = 0; // Clear previous chunks
        try {
          mediaRecorder.start();
          isRecordingActive = true;
          console.log("Recording started");
        } catch (error) {
          console.error("Failed to start MediaRecorder:", error);
          isRecordingActive = false;
        }
      }
    };

    // Handle data and completion
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log("Recording stopped, processing segment");
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        await processAudioChunkWithContinuation(audioBlob);
      } else {
        // No audio data, still trigger completion
        onRecordingComplete();
      }
      isRecordingActive = false;
    };

    // Setup VAD using AudioWorklet for segment-based recording
    console.log("Using AudioWorklet segment-based recording");

    vadCleanup = startVAD(
      stopRecording, // Called when voice ends (natural segments)
      audioContext,
      source
    );

    // Start initial recording - AudioWorklet will control when to stop/start
    startRecording();

    // Fallback timeout for segments
    maxTimeoutId = setTimeout(stopRecording, MAX_RECORDING_TIME);

    return {
      stopRecording: () => {
        stopRecording();
        if (vadCleanup) {
          Promise.resolve(vadCleanup).then((cleanup) => {
            if (cleanup && typeof cleanup === "function") {
              cleanup();
            }
          });
        }
      },
    };
  }, [
    stream,
    isReady,
    vadConfig,
    audioContext,
    source,
    startVAD,
    processAudioChunk,
  ]);

  /**
   * Start continuous recording using AudioWorklet segments
   */
  const startContinuousRecording = useCallback(() => {
    if (!isReady || !enabledRef.current || isProcessingRef.current || !stream?.active || !audioContext || audioContext.state === 'closed') {
      console.log("Cannot start recording:", {
        isReady,
        enabled: enabledRef.current,
        isProcessing: isProcessingRef.current,
        streamActive: stream?.active,
        audioContextState: audioContext?.state,
      });
      return;
    }

    console.log(
      "Starting continuous recording with AudioWorklet:",
      currentStrategy
    );

    // AudioWorklet: Single recording session, VAD controls natural segments
    isProcessingRef.current = true;
    currentRecorderRef.current = createSmartRecording();

    // AudioWorklet handles segments automatically
    // Processing state is managed by the MediaRecorder onstop event
  }, [
    isReady,
    enabledRef,
    isProcessingRef,
    currentStrategy,
    createSmartRecording,
  ]);

  // Set the ref to the actual function
  startContinuousRecordingRef.current = startContinuousRecording;

  // Start recording when audio session is ready
  useEffect(() => {
    if (enabled && isReady) {
      try {
        console.log("Audio session ready, starting recording");
        startContinuousRecording();
      } catch (error) {
        console.error("Failed to start listening:", error);
        setEnabled(false);
      }
    }
  }, [enabled, isReady, startContinuousRecording]);

  const start = useCallback(() => {
    setEnabled(true);
  }, []);

  const stop = useCallback(() => {
    console.log("Stopping voice recording");

    // Cleanup current recording
    if (currentRecorderRef.current) {
      currentRecorderRef.current.stopRecording();
      currentRecorderRef.current = null;
    }

    // Stop VAD
    stopVAD();

    // Reset processing state
    isProcessingRef.current = false;

    // Disable recording
    setEnabled(false);
  }, [stopVAD]);

  return {
    enabled,
    transcript,
    isRecording: enabled,
    start,
    stop,
    capabilities: getCapabilities(),
    currentStrategy,
  };
}
