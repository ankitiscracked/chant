import { useState } from "react";
import { useVoiceEngine } from "../context/VoiceEngineContext";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(reader.result?.toString().split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useAudioProcessing() {
  const voiceEngine = useVoiceEngine();
  const [transcript, setTranscript] = useState("");

  const processAudioChunk = async (audioBlob: Blob) => {
    console.log("processing audio chunk");
    if (audioBlob.size === 0) return;

    const audioBase64 = await blobToBase64(audioBlob);
    try {
      await voiceEngine.handleAudio(audioBase64);
    } catch (error) {
      console.error("Transcription failed:", error);
      setTranscript("Error: Could not transcribe audio");
      setTimeout(() => setTranscript(""), 2000);
    }
  };

  return {
    transcript,
    processAudioChunk,
  };
}
