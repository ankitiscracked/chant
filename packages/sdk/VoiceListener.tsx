import { useEffect, useState } from "react";
import {
  handleTranscript,
  transcribeAudio,
  onExecutionStateChange,
  getExecutionState,
  type ExecutionState,
} from ".";

// Voice activity detection configuration
const VAD_CONFIG = {
  threshold: 20,
  silenceDuration: 1500, // ms of silence before stopping
  maxRecordingTime: 30000, // max 30s per chunk
};

export function VoiceListener() {
  const [enabled, setEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [executionState, setExecutionState] = useState<ExecutionState>(
    getExecutionState()
  );

  useEffect(() => {
    const unsubscribe = onExecutionStateChange(setExecutionState);
    return unsubscribe;
  }, []);

  // Audio processing logic
  const processAudioChunk = async (audioBlob: Blob) => {
    console.log("processing audio chunk");
    if (audioBlob.size === 0) return;

    const audioBase64 = await blobToBase64(audioBlob);
    try {
      const transcript = await transcribeAudio(audioBase64);
      if (transcript.trim()) {
        setTranscript(transcript);
        await handleTranscript(transcript);
        setTranscript("");
      }
    } catch (error) {
      console.error("Transcription failed:", error);
      setTranscript("Error: Could not transcribe audio");
      setTimeout(() => setTranscript(""), 2000);
    }
  };

  // Voice activity detection setup
  const setupVoiceActivityDetection = (
    analyser: AnalyserNode,
    onSilenceDetected: () => void
  ) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart = 0;
    let isSpeaking = false;
    let isActive = true;

    const checkAudioLevel = () => {
      if (!isActive || !enabled) return;

      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      if (average > VAD_CONFIG.threshold) {
        // Voice detected
        if (!isSpeaking) {
          isSpeaking = true;
        }
        silenceStart = Date.now();
      } else {
        // Silence detected
        if (
          isSpeaking &&
          Date.now() - silenceStart > VAD_CONFIG.silenceDuration
        ) {
          isSpeaking = false;
          onSilenceDetected();
          return;
        }
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();

    return () => {
      isActive = false;
    };
  };

  // Recording chunk management
  const createRecordingChunk = (
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
    vadCleanup = setupVoiceActivityDetection(analyser, stopRecording);

    // Max recording time fallback
    maxTimeoutId = setTimeout(stopRecording, VAD_CONFIG.maxRecordingTime);

    mediaRecorder.start();
    return { stopRecording };
  };

  // Main continuous listening logic
  useEffect(() => {
    if (!enabled) return;

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let currentChunk: { stopRecording: () => void } | null = null;
    let isProcessing = false;

    const startContinuousListening = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create single AudioContext and analyser for entire session
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 2048;

        setRecording(true);

        const startNextChunk = () => {
          if (
            !stream ||
            !stream.active ||
            !analyser ||
            !enabled ||
            isProcessing
          )
            return;

          isProcessing = true;

          const onChunkComplete = () => {
            isProcessing = false;
            if (enabled) {
              setTimeout(startNextChunk, 200);
            }
          };

          currentChunk = createRecordingChunk(
            stream,
            analyser,
            onChunkComplete
          );
        };

        startNextChunk();
      } catch (error) {
        console.error("Failed to start listening:", error);
        setRecording(false);
        setEnabled(false);
      }
    };

    startContinuousListening();

    return () => {
      if (currentChunk) {
        currentChunk.stopRecording();
      }
      if (audioContext) {
        audioContext.close();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      isProcessing = false;
    };
  }, [enabled]);

  const stopRecording = () => {
    setRecording(false);
    setEnabled(false);
  };

  return (
    <div className="fixed bottom-2.5 right-2.5">
      {!enabled ? (
        <div
          className="bg-yellow-400 p-2.5 rounded-lg cursor-pointer hover:bg-yellow-500 transition-colors"
          onClick={() => setEnabled(true)}
        >
          🎤 Click to activate
        </div>
      ) : (
        <div
          className={`
          ${
            executionState.status === "paused"
              ? "bg-orange-400"
              : "bg-yellow-400"
          } 
          p-2.5 rounded-lg relative
          ${executionState.status === "paused" ? "max-w-[200px] text-xs" : ""}
        `}
        >
          {recording && (
            <button
              onClick={stopRecording}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
            >
              Stop
            </button>
          )}
          {executionState.status === "paused" &&
          executionState.waitingForElement ? (
            <>
              ⏸️ Waiting for input
              <br />
              <strong>{executionState.waitingForElement.label}</strong>
              <br />
              <em>{executionState.waitingForElement.reason}</em>
              <br />
              <small>Say "continue" or "next" when ready</small>
            </>
          ) : executionState.status === "executing" ? (
            "⚡ Executing..."
          ) : recording ? (
            "🔴 Recording..."
          ) : (
            "Listening..."
          )}
          <br />
          <em>{transcript}</em>
        </div>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(reader.result?.toString().split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
