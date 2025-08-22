/**
 * AudioWorklet processor for Voice Activity Detection
 * Uses simple volume-based (RMS) detection for voice activity
 */
class VADProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    // Configuration from main thread
    const { threshold = 0.1, silenceDuration = 1500 } =
      options?.processorOptions || {};

    this.threshold = threshold;
    this.silenceDuration = silenceDuration;

    // State tracking
    this.isVoiceActive = false;
    this.lastVoiceTime = 0;
    this.currentTime = 0;

    // Audio buffering for WAV creation
    this.audioBuffer = [];

    // Performance tracking
    this.frameCount = 0;
    this.sampleRate = sampleRate || 44100;

    console.log("VADProcessor initialized:", {
      threshold,
      silenceDuration,
      sampleRate: this.sampleRate,
    });
  }

  /**
   * Process audio samples in real-time
   * Called ~344 times per second (44100 Hz / 128 samples per block)
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true; // Keep processor alive
    }

    const samples = input[0]; // Get mono channel samples
    this.frameCount++;
    this.currentTime =
      ((this.frameCount * samples.length) / this.sampleRate) * 1000; // Convert to milliseconds

    // Buffer audio samples when voice is active
    if (this.isVoiceActive) {
      // Copy samples to avoid reference issues
      const samplesCopy = new Float32Array(samples);
      this.audioBuffer.push(samplesCopy);
    }

    // Calculate RMS (Root Mean Square) for volume detection
    const rms = this.calculateRMS(samples);

    // Voice activity detection logic
    this.processVoiceActivity(rms);

    return true; // Keep processor alive
  }

  /**
   * Calculate RMS (Root Mean Square) value for volume detection
   * @param {Float32Array} samples - Audio samples
   * @returns {number} RMS value (0.0 to 1.0+)
   */
  calculateRMS(samples) {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    return Math.sqrt(sumSquares / samples.length);
  }

  /**
   * Process voice activity based on RMS value
   * @param {number} rms - Current RMS value
   */
  processVoiceActivity(rms) {
    const isVoiceDetected = rms > this.threshold;

    if (isVoiceDetected) {
      console.log("voice detected");
      // Voice detected
      if (!this.isVoiceActive) {
        this.isVoiceActive = true;
        this.audioBuffer = []; // Clear any previous buffer
        this.sendMessage("voice_start", {
          timestamp: this.currentTime,
          rms: rms,
          threshold: this.threshold,
        });
      }
      this.lastVoiceTime = this.currentTime;
    } else {
      // No voice detected
      if (this.isVoiceActive) {
        const silenceDuration = this.currentTime - this.lastVoiceTime;

        if (silenceDuration > this.silenceDuration) {
          this.isVoiceActive = false;

          // Create WAV file from buffered samples
          const wavData = this.createWavFromBuffer();

          this.sendMessage("voice_end", {
            timestamp: this.currentTime,
            silenceDuration: silenceDuration,
            rms: rms,
            audioBuffer: wavData, // Send WAV data instead of relying on MediaRecorder
          });
        }
      }
    }
  }

  /**
   * Create WAV file from buffered audio samples
   * @returns {ArrayBuffer} WAV file data
   */
  createWavFromBuffer() {
    if (this.audioBuffer.length === 0) {
      return null;
    }

    // Calculate total samples
    const totalSamples = this.audioBuffer.length * this.audioBuffer[0].length;

    // Create single Float32Array from all buffered chunks
    const combinedSamples = new Float32Array(totalSamples);
    let offset = 0;

    for (const chunk of this.audioBuffer) {
      combinedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to WAV format
    return this.encodeWAV(combinedSamples, this.sampleRate);
  }

  /**
   * Encode audio samples as WAV format
   * @param {Float32Array} samples - Audio samples
   * @param {number} sampleRate - Sample rate
   * @returns {ArrayBuffer} WAV file data
   */
  encodeWAV(samples, sampleRate) {
    const length = samples.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const writeUint32 = (offset, value) => {
      view.setUint32(offset, value, true);
    };

    const writeUint16 = (offset, value) => {
      view.setUint16(offset, value, true);
    };

    // RIFF header
    writeString(0, "RIFF");
    writeUint32(4, 36 + length * 2);
    writeString(8, "WAVE");

    // fmt chunk
    writeString(12, "fmt ");
    writeUint32(16, 16); // chunk size
    writeUint16(20, 1); // PCM format
    writeUint16(22, 1); // mono
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate * 2); // byte rate
    writeUint16(32, 2); // block align
    writeUint16(34, 16); // bits per sample

    // data chunk
    writeString(36, "data");
    writeUint32(40, length * 2);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Send message to main thread
   * @param {string} type - Message type
   * @param {object} data - Additional data
   */
  sendMessage(type, data = {}) {
    this.port.postMessage({
      type,
      ...data,
    });
  }

  /**
   * Handle messages from main thread
   * @param {MessageEvent} event - Message event
   */
  static get parameterDescriptors() {
    return [];
  }
}

// Register the processor
registerProcessor("vad-processor", VADProcessor);
