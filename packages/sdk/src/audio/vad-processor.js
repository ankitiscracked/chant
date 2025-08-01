/**
 * AudioWorklet processor for Voice Activity Detection
 * Uses simple volume-based (RMS) detection for voice activity
 */
class VADProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration from main thread
    const { threshold = 0.01, silenceDuration = 1500 } = options?.processorOptions || {};
    
    this.threshold = threshold;
    this.silenceDuration = silenceDuration;
    
    // State tracking
    this.isVoiceActive = false;
    this.lastVoiceTime = 0;
    this.currentTime = 0;
    
    // Performance tracking
    this.frameCount = 0;
    this.sampleRate = sampleRate || 44100;
    
    console.log('VADProcessor initialized:', { threshold, silenceDuration, sampleRate: this.sampleRate });
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
    this.currentTime = (this.frameCount * samples.length / this.sampleRate) * 1000; // Convert to milliseconds

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
        this.sendMessage('voice_start', {
          timestamp: this.currentTime,
          rms: rms,
          threshold: this.threshold
        });
      }
      this.lastVoiceTime = this.currentTime;
    } else {
      // No voice detected
      if (this.isVoiceActive) {
        const silenceDuration = this.currentTime - this.lastVoiceTime;
        
        if (silenceDuration > this.silenceDuration) {
          this.isVoiceActive = false;
          this.sendMessage('voice_end', {
            timestamp: this.currentTime,
            silenceDuration: silenceDuration,
            rms: rms
          });
        }
      }
    }
  }

  /**
   * Send message to main thread
   * @param {string} type - Message type
   * @param {object} data - Additional data
   */
  sendMessage(type, data = {}) {
    this.port.postMessage({
      type,
      ...data
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
registerProcessor('vad-processor', VADProcessor);