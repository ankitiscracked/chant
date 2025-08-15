import { useEffect, useRef } from "react";
import {
  DEFAULT_WORKLET_VAD_CONFIG,
  VAD_PROCESSOR_URL,
  isAudioWorkletSupported,
} from "../audio";
import { voiceEngine } from "../utils";
import type { VADCapabilities, VADConfig, VADOptions } from "../types";

export function useVoiceActivityDetection(config?: VADConfig) {
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const loadedContextsRef = useRef<Set<AudioContext>>(new Set());
  const isSupported = isAudioWorkletSupported();

  /**
   * Load AudioWorklet module if not already loaded for this AudioContext
   */
  const loadWorkletModule = async (
    audioContext: AudioContext
  ): Promise<boolean> => {
    if (loadedContextsRef.current.has(audioContext)) return true;

    try {
      await audioContext.audioWorklet.addModule(VAD_PROCESSOR_URL);
      loadedContextsRef.current.add(audioContext);
      console.log("AudioWorklet VAD module loaded successfully");
      return true;
    } catch (error) {
      console.error("Failed to load AudioWorklet VAD module:", error);
      return false;
    }
  };

  /**
   * Start VAD using AudioWorklet
   */
  const startVAD = async (
    onSilenceDetected: (audioBuffer?: ArrayBuffer | null) => void,
    audioContext?: AudioContext,
    source?: MediaStreamAudioSourceNode
  ) => {
    if (!audioContext || !source) {
      throw new Error(
        "AudioWorklet is required but not supported or missing audio context/source"
      );
    }

    if (!isSupported) {
      console.warn("AudioWorklet not supported, cannot start worklet VAD");
      return;
    }

    console.log("audio worklet started");

    try {
      // Clean up any closed contexts first
      cleanupClosedContexts();

      // Ensure AudioContext is running
      if (audioContext.state === "suspended") {
        await audioContext.resume();
        console.log("AudioContext resumed");
      }

      // Load worklet module
      const moduleLoaded = await loadWorkletModule(audioContext);
      if (!moduleLoaded) return;

      // Create AudioWorklet node with configuration
      const workletNode = new AudioWorkletNode(audioContext, "vad-processor", {
        processorOptions: {
          threshold: config?.threshold ?? DEFAULT_WORKLET_VAD_CONFIG.threshold,
          silenceDuration:
            config?.silenceDuration ??
            DEFAULT_WORKLET_VAD_CONFIG.silenceDuration,
        },
      });

      // Set up message handling
      workletNode.port.onmessage = (event) => {
        console.log("audio worklet message received", event.data);
        const { type, timestamp, ...data } = event.data;

        switch (type) {
          case "voice_start":
            console.log("AudioWorklet: Voice detected", {
              timestamp,
              ...data,
            });
            voiceEngine.setSpeaking(true);
            break;
          case "voice_end":
            console.log("AudioWorklet: Voice ended", { timestamp, ...data });
            voiceEngine.setSpeaking(false);
            // Pass the audioBuffer from the VAD processor
            onSilenceDetected(data.audioBuffer);
            break;
          default:
            console.warn("Unknown AudioWorklet message type:", type);
        }
      };

      // Connect audio pipeline
      source.connect(workletNode);
      // Note: We don't connect workletNode to destination to avoid audio playback

      workletNodeRef.current = workletNode;
    } catch (error) {
      console.error("Failed to start AudioWorklet VAD:", error);
    }
  };

  const stopVAD = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    voiceEngine.setSpeaking(false);
  };

  /**
   * Clean up closed AudioContexts from the loaded contexts set
   */
  const cleanupClosedContexts = () => {
    const contextsToRemove: AudioContext[] = [];
    loadedContextsRef.current.forEach((context) => {
      if (context.state === 'closed') {
        contextsToRemove.push(context);
      }
    });
    contextsToRemove.forEach((context) => {
      loadedContextsRef.current.delete(context);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVAD();
      loadedContextsRef.current.clear();
    };
  }, []);

  return {
    startVAD,
    stopVAD,
  };
}
