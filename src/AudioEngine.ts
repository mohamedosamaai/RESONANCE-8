/**
 * Simple procedural audio engine for tech atmospherics
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicActive = false;
  
  // Music nodes
  private padGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private shimmerGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;

  // Analysis
  private analyzer: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  private musicIntervals: number[] = [];
  private activeOscillators: OscillatorNode[] = [];
  
  // Peaceful C Major / F Lydian frequencies (Warm and comforting)
  private scaleFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // C4 to B4
  private bassFreqs = [65.41, 87.31, 98.00, 65.41]; // C2, F2, G2, C2
  private padFreqs = [
    [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3, E3, G3, B3)
    [87.31, 130.81, 174.61, 220.00],  // Fmaj7 (F2, C3, F3, A3)
    [98.00, 146.83, 196.00, 246.94],  // Gadd9 (G2, D3, G3, B3)
    [103.83, 155.56, 207.65, 261.63]  // Abmaj7 (warm modal interchange)
  ];
  
  private currentChord = 0;
  
  // Interaction states
  private mouseX = 0;
  private mouseY = 0;
  private mouseSpeed = 0;
  
  private currentTTSSequenceId = 0;
  private isPlayingTTS = false;
  private currentTTSSource: AudioBufferSourceNode | null = null;
  private ttsQuotaExhausted = false;
  
  private audioQueue: string[] = [];
  private isProcessingQueue = false;
  private nextTTSStartTime: number = 0;
  private queueSequenceId = 0;

  private aiInstance: any = null;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master out with compression
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Fade in later
    
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    
    // Setup Analysis
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 1024;
    this.analyzer.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.masterGain.connect(this.analyzer);
    
    // Setup Reverb (Impulse response synthesized)
    this.setupReverb();
    
    // Setup Delay
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.33; // ~180 BPM eighth note
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.4;
    this.delayNode.connect(delayFeedback);
    delayFeedback.connect(this.delayNode);
    if (this.reverbNode) this.delayNode.connect(this.reverbNode);

    // Instrument groups
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 8000;
    this.musicFilter.Q.value = 1.0;
    if (this.reverbNode) this.musicFilter.connect(this.reverbNode);
    else this.musicFilter.connect(this.masterGain);

    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.3;
    this.padGain.connect(this.musicFilter);

    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.5;
    this.bassGain.connect(this.musicFilter); // dry bass
    
    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = 0.2;
    this.arpGain.connect(this.delayNode);
    this.arpGain.connect(this.masterGain);

    this.shimmerGain = this.ctx.createGain();
    this.shimmerGain.gain.value = 0.15;
    if (this.reverbNode) this.shimmerGain.connect(this.reverbNode);
    this.shimmerGain.connect(this.delayNode);
  }

  async warmup() {
     // Pre-initialize audio context and AI SDK
     try {
        await this.init();
        if (!this.aiInstance) {
           // @ts-ignore
           const apiKey = process.env.GEMINI_API_KEY;
           if (apiKey) {
              const { GoogleGenAI } = await import("@google/genai");
              this.aiInstance = new GoogleGenAI({ apiKey });
           }
        }
     } catch (e) {
        console.warn("Audio/AI warmup failed", e);
     }
  }
  
  private setupReverb() {
    // We removed the scary synthesized convolver reverb entirely.
    // Clean delay network is enough for spatial width without metallic noise.
  }

  startMusic() {
    if (!this.ctx) return;
    if (this.musicActive) return;
    this.musicActive = true;
    
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    if (this.masterGain) {
       this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
       this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
       this.masterGain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 3);
    }
    
    this.currentChord = 0;
    
    // Chord progression loop
    this.musicIntervals.push(window.setInterval(() => {
        this.currentChord = (this.currentChord + 1) % this.padFreqs.length;
        this.playPadChord();
    }, 8000));
    
    // Initial pad
    this.playPadChord();
    
    // Occasional gentle bass pulse
    this.musicIntervals.push(window.setInterval(() => {
        if (Math.random() > 0.3) this.playBass();
    }, 6000));
  }
  
  stopMusic() {
    if (!this.musicActive || !this.ctx) return;
    this.musicActive = false;
    
    if (this.masterGain) {
       this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
       this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
       this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
    }
    
    this.musicIntervals.forEach(id => clearInterval(id));
    this.musicIntervals = [];
    
    setTimeout(() => {
       this.activeOscillators.forEach(osc => {
           try { osc.stop(); osc.disconnect(); } catch(e){}
       });
       this.activeOscillators = [];
    }, 2500);
  }
  
  toggleMusic(active: boolean) {
     if (active) this.startMusic();
     else this.stopMusic();
  }

  private playPadChord() {
     if (!this.ctx || !this.padGain) return;
     const freqs = this.padFreqs[this.currentChord];
     
     // Pad tone (warm)
     const filter = this.ctx.createBiquadFilter();
     filter.type = 'lowpass';
     // Cutoff based on mouseY
     filter.frequency.value = 400 + (1 - this.mouseY) * 1000;
     filter.connect(this.padGain);
     
     freqs.forEach(f => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        
        // slight detune for richness
        const detuneOsc = this.ctx!.createOscillator();
        detuneOsc.type = 'sine';
        detuneOsc.frequency.value = f * 1.005;
        
        osc.frequency.value = f;
        
        const env = this.ctx!.createGain();
        env.gain.setValueAtTime(0, this.ctx!.currentTime);
        env.gain.linearRampToValueAtTime(0.04, this.ctx!.currentTime + 2);
        env.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 8);
        
        osc.connect(env);
        detuneOsc.connect(env);
        env.connect(filter);
        
        osc.start();
        detuneOsc.start();
        osc.stop(this.ctx!.currentTime + 8);
        detuneOsc.stop(this.ctx!.currentTime + 8);
        
        this.activeOscillators.push(osc, detuneOsc);
     });
  }
  
  private playBass() {
     if (!this.ctx || !this.bassGain) return;
     const freq = this.bassFreqs[this.currentChord];
     
     const osc = this.ctx.createOscillator();
     osc.type = 'sine';
     osc.frequency.value = freq;
     
     const subOsc = this.ctx.createOscillator();
     subOsc.type = 'sine';
     subOsc.frequency.value = freq / 2;
     
     const env = this.ctx.createGain();
     env.gain.setValueAtTime(0, this.ctx.currentTime);
     env.gain.exponentialRampToValueAtTime(0.15, this.ctx.currentTime + 0.1);
     env.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);
     
     const filter = this.ctx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.setValueAtTime(150, this.ctx.currentTime);
     filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1);
     
     osc.connect(env);
     subOsc.connect(env);
     env.connect(filter);
     filter.connect(this.bassGain);
     
     osc.start(); subOsc.start();
     osc.stop(this.ctx.currentTime + 2); subOsc.stop(this.ctx.currentTime + 2);
     this.activeOscillators.push(osc, subOsc);
   }

  // --- External Interactions ---
  updateMouse(x: number, y: number, speed: number) {
      if (!Number.isFinite(x) || Number.isNaN(x)) x = 0;
      if (!Number.isFinite(y) || Number.isNaN(y)) y = 0;
      if (!Number.isFinite(speed) || Number.isNaN(speed)) speed = 0;

      this.mouseX = Math.max(0, Math.min(1, x));
      this.mouseY = Math.max(0, Math.min(1, y));
      this.mouseSpeed = Math.max(0, Math.min(1, speed));
      
      // Dynamic Pad Cutoff
      if (this.ctx && this.padGain) {
          // Add a subtle lowpass filter adjustment to the active pad
          // (Requires tracking the active filter, we do it in playPadChord)
      }
  }

  getAudioBands(): { bass: number, mid: number, treble: number, energy: number } {
    if (!this.analyzer || !this.dataArray) {
       return { bass: 0, mid: 0, treble: 0, energy: 0 };
    }
    
    this.analyzer.getByteFrequencyData(this.dataArray);
    
    let bass = 0, mid = 0, treble = 0, energy = 0;
    const len = this.dataArray.length;
    
    // Group ranges
    for (let i = 0; i < len; i++) {
        const val = this.dataArray[i] / 255.0;
        energy += val;
        if (i < 10) bass += val;
        else if (i < 100) mid += val;
        else treble += val;
    }
    
    return {
        bass: Math.min(1, bass / 10),
        mid: Math.min(1, mid / 90),
        treble: Math.min(1, treble / (len - 100)),
        energy: Math.min(1, energy / len)
    };
  }

  getFrequencyData() {
    if (!this.analyzer || !this.dataArray) return new Uint8Array(0);
    this.analyzer.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  // --- Microphone Support ---
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  async initMic() {
    if (this.micStream) return true;
    if (!this.ctx) await this.init();
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = this.ctx!.createMediaStreamSource(this.micStream);
      
      if (!this.analyzer) {
          this.analyzer = this.ctx!.createAnalyser();
          this.analyzer.fftSize = 256;
          this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
      }
      
      this.micSource.connect(this.analyzer);
      return true;
    } catch (e) {
      console.warn("Mic access denied or unavailable", e);
      return false;
    }
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  getVoiceIntensity() {
    if (!this.analyzer || !this.dataArray) return 0;
    this.analyzer.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / this.dataArray.length / 255;
  }

  triggerShock() {
      // Very soft, elegant resonant ping instead of heavy sub impact
      if (!this.ctx || !this.masterGain) return;
      
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      
      // Pick a random frequency from the current scale but higher octaves
      const baseFreq = this.scaleFreqs[Math.floor(Math.random() * this.scaleFreqs.length)];
      osc.frequency.setValueAtTime(baseFreq * 4, this.ctx.currentTime);
      
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5); // Random pan

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, this.ctx.currentTime);
      env.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 0.1);
      env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
      
      osc.connect(env);
      env.connect(panner);
      
      if (this.reverbNode) {
         panner.connect(this.reverbNode);
      } else {
         panner.connect(this.masterGain);
      }
      
      osc.start();
      osc.stop(this.ctx.currentTime + 3.5);
  }

  private lastMovementSound = 0;

  triggerMovementSound() {
     // A subtle wind-like sweep or granular feeling based on speed
     if (!this.ctx || !this.musicActive) return;
     if (this.ctx.currentTime - this.lastMovementSound < 0.15) return;
     this.lastMovementSound = this.ctx.currentTime;
     
     if (this.mouseSpeed < 0.1) return; // Only trigger if actually moving
     
     // Play a random note from the chord
     const freqs = this.padFreqs[this.currentChord];
     const freq = freqs[Math.floor(Math.random() * freqs.length)] * 2; // octave up
     
     const osc = this.ctx.createOscillator();
     osc.type = 'sine'; // glass-like pure tone
     osc.frequency.value = freq;
     
     const env = this.ctx.createGain();
     env.gain.setValueAtTime(0, this.ctx.currentTime);
     // volume based on speed - very soft
     const vol = Number.isFinite(this.mouseSpeed) ? Math.min(0.04, this.mouseSpeed * 0.05) : 0;
     env.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
     env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
     
     const panner = this.ctx.createStereoPanner();
     panner.pan.value = (this.mouseX - 0.5) * 2.0;

     osc.connect(env);
     env.connect(panner);
     
     if (this.delayNode) panner.connect(this.delayNode);
     if (this.reverbNode) panner.connect(this.reverbNode);
     else if (this.masterGain) panner.connect(this.masterGain);
     
     osc.start();
     osc.stop(this.ctx.currentTime + 2.0);
  }
  
  playAIChord(sentiment: string) {
     if (!this.ctx || !this.masterGain) return;
     
     let freqs: number[] = [];
     if (sentiment === 'welcoming' || sentiment === 'neutral') {
         freqs = [261.63, 329.63, 392.00]; // C Major
     } else if (sentiment === 'thinking') {
         freqs = [293.66, 349.23, 440.00]; // D minor (suspensive)
     } else {
         freqs = [196.00, 233.08, 293.66]; // G minor deep
     }

     const t = this.ctx.currentTime;
     freqs.forEach((freq, i) => {
         const osc = this.ctx!.createOscillator();
         osc.type = 'sine';
         osc.frequency.value = freq;
         
         const env = this.ctx!.createGain();
         env.gain.setValueAtTime(0, t);
         env.gain.linearRampToValueAtTime(0.05, t + 0.1 + (i * 0.05));
         env.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
         
         osc.connect(env);
         if (this.reverbNode) {
             env.connect(this.reverbNode);
         } else {
             env.connect(this.masterGain!);
         }
         osc.start(t);
         osc.stop(t + 2.5);
     });
  }
  
  setMasterVolume(val: number) {
     if (this.masterGain && this.ctx) {
        // Clamp to avoid loud bursts
        const safeVal = Math.max(0, Math.min(2, val));
        this.masterGain.gain.setTargetAtTime(safeVal, this.ctx.currentTime, 0.1);
     }
  }
  
  public hdVoiceEnabled = true;

  async speak(text: string) {
    if (!text || text.trim().length === 0) return;
    
    // Sanitize text: remove markdown and newlines
    let sanitizedText = text.replace(/[*#]/g, '').replace(/\n/g, ' ').trim();
    if (!sanitizedText) return;

    // Append a period if the text doesn't end with a punctuation mark, to prevent TTS from cutting off the final words
    if (!/[\.!\?؟؛,]$/.test(sanitizedText)) {
       sanitizedText += ".";
    }

    this.audioQueue.push(sanitizedText);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    const currentQueueSeq = this.queueSequenceId;

    let nextBufferPromise: Promise<AudioBuffer | null> | null = null;
    let nextText = this.audioQueue.shift();

    while (nextText) {
      if (currentQueueSeq !== this.queueSequenceId) {
          break; // Queue was cleared
      }
      
      const textToPlay = nextText;
      const isArabic = /[\u0600-\u06FF]/.test(textToPlay);

      this.isPlayingTTS = true;
      this.currentTTSSequenceId++;
      const sequenceId = this.currentTTSSequenceId;

      let playedHD = false;

      if (this.hdVoiceEnabled) {
        try {
            if (this.ttsQuotaExhausted) {
              throw new Error("TTS Quota exhausted");
            }

            let buffer: AudioBuffer | null = null;
            if (!nextBufferPromise) {
                buffer = await this.fetchTTSAudioBuffer(textToPlay, isArabic);
            } else {
                buffer = await nextBufferPromise;
                nextBufferPromise = null;
            }
            
            if (currentQueueSeq !== this.queueSequenceId) break;
            
            // Prefetch the next buffer while current is about to play
            nextText = this.audioQueue.shift();
            if (nextText && currentQueueSeq === this.queueSequenceId) {
                const nextIsArabic = /[\u0600-\u06FF]/.test(nextText);
                nextBufferPromise = this.fetchTTSAudioBuffer(nextText, nextIsArabic).catch((e) => {
                   console.warn("Prefetch failed:", e);
                   return null;
                });
            }

            if (buffer) {
              this.playAudioBufferSeamless(buffer, sequenceId);
              playedHD = true;
            }
        } catch (e) {
            console.warn("TTS fetch failed, using fallback:", e);
            nextText = this.audioQueue.shift();
        }
      } else {
         nextText = this.audioQueue.shift();
      }

      if (!playedHD && currentQueueSeq === this.queueSequenceId) {
          await this.speakBrowser(textToPlay, sequenceId);
      }
    }

    this.isProcessingQueue = false;
    // Check if there is still audio scheduled in the future, if not we are done playing
    if (!this.ctx || this.nextTTSStartTime <= this.ctx.currentTime) {
       this.isPlayingTTS = false;
    }
  }

  private async fetchTTSAudioBuffer(text: string, isArabic: boolean): Promise<AudioBuffer | null> {
    if (!this.ctx) await this.init();

    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                voice: isArabic ? {
                    languageCode: "ar-XA",
                    name: "ar-XA-Chirp3-HD-Zephyr"
                } : {
                    languageCode: "en-US",
                    name: "en-US-Chirp3-HD-Aoede"
                }
            })
        });

        if (!response.ok) {
            if (response.status === 429) this.ttsQuotaExhausted = true;
            try {
               const errorData = await response.json();
               console.error("TTS API Error:", errorData);
               if (errorData.error && errorData.error.message && errorData.error.message.includes("API key expired")) {
                   alert("Google TTS API Key is EXPIRED! Audio will fall back to robotic browser voice. Please renew GOOGLE_TTS_API_KEY in AI Studio Settings.");
               }
            } catch(e) {}
            return null;
        }

        const data = await response.json();
        if (!data.audioContent) return null;

        const binaryString = window.atob(data.audioContent);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return await this.ctx!.decodeAudioData(bytes.buffer);
    } catch (e) {
        console.warn("TTS Error:", e);
        return null;
    }
  }

  private playAudioBufferSeamless(buffer: AudioBuffer, sequenceId: number) {
      if (!this.ctx || !this.masterGain) return;
      if (sequenceId !== this.currentTTSSequenceId) return; // stale

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);
      if (this.analyzer) source.connect(this.analyzer);
      
      this.currentTTSSource = source; // Just keeps track of last source to stop it if needed
      this.activeTTSSources.add(source);
      
      const currentTime = this.ctx.currentTime;
      if (this.nextTTSStartTime < currentTime) {
          this.nextTTSStartTime = currentTime + 0.05; // tiny buffer
      }
      
      source.start(this.nextTTSStartTime);
      this.nextTTSStartTime += buffer.duration;
      
      // Cleanup when done
      source.onended = () => {
        source.disconnect();
        this.activeTTSSources.delete(source);
        if (this.currentTTSSource === source) {
           // We finished the track, and no new track is playing
           if (!this.isProcessingQueue) {
               this.isPlayingTTS = false;
           }
        }
      };
  }

  private playAudioBuffer(buffer: AudioBuffer, sequenceId: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ctx || !this.masterGain) {
          resolve();
          return;
      }
      
      this.cancelCurrentTTS();
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      // Connect to master gain and analyzer
      source.connect(this.masterGain);
      if (this.analyzer) source.connect(this.analyzer);
      
      this.currentTTSSource = source;
      
      source.onended = () => {
        if (this.currentTTSSource === source) {
          this.currentTTSSource = null;
        }
        resolve();
      };
      
      source.start(0);
    });
  }

  stop() {
    this.stopTTS();
  }

  stopTTS() {
    this.audioQueue = [];
    this.queueSequenceId++;
    this.isPlayingTTS = false;
    this.isProcessingQueue = false;
    this.cancelCurrentTTS();
    this.nextTTSStartTime = 0;
  }

  private activeTTSSources: Set<AudioBufferSourceNode> = new Set();
  private cancelCurrentTTS() {
    this.currentTTSSequenceId++;
    this.nextTTSStartTime = 0;
    this.activeTTSSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    this.activeTTSSources.clear();
    this.currentTTSSource = null;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private speakBrowser(text: string, sequenceId: number): Promise<void> {
     return new Promise((resolve) => {
         if (!('speechSynthesis' in window)) {
             resolve();
             return;
         }
         
         // Cancel previous speech to avoid overlapping
         window.speechSynthesis.cancel();

         // Small delay before starting new speech to let the cancellation settle
         setTimeout(() => {
            if (this.currentTTSSequenceId !== sequenceId) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            
            utterance.onend = () => {
                resolve();
            };
            utterance.onerror = () => {
                resolve();
            };
            
            // Get voices and set Arabic as priority if text is Arabic
            const voices = window.speechSynthesis.getVoices();
            const isArabic = /[\u0600-\u06FF]/.test(text);

            if (isArabic) {
                // Priority: Arabic (Female) -> Any Arabic -> Default
                const arVoice = voices.find(v => v.lang.startsWith('ar') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hoda') || v.name.toLowerCase().includes('laila'))) || 
                               voices.find(v => v.lang.startsWith('ar'));
                if (arVoice) utterance.voice = arVoice;
                utterance.lang = "ar-SA";
            } else {
                // Priority: English (Female/Soft) -> Any English -> Default
                const enVoice = voices.find(v => v.lang.startsWith('en-') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Google US English'))) || 
                               voices.find(v => v.lang.startsWith('en-'));
                if (enVoice) utterance.voice = enVoice;
                utterance.lang = "en-US";
            }

            utterance.pitch = 1.05; // Slightly higher for a more pleasant "AI" feel
            utterance.rate = 1.0;
            utterance.volume = 1.0;
            
            window.speechSynthesis.speak(utterance);
         }, 50);
     });
  }
  setFilter(freq: number) {
    if (this.musicFilter && this.ctx) {
      this.musicFilter.frequency.setTargetAtTime(
        Math.max(200, Math.min(freq, 20000)),
        this.ctx.currentTime,
        0.1
      );
    }
  }
}

export const audioEngine = new AudioEngine();
