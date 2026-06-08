// Cyber-Dome: Neon Automata - Procedural Cyber-Synth Audio Engine
// Built with pure Web Audio API for zero latency, zero asset size, and perfect cyberpunk fit.

export type SoundEffectType =
  | 'hover'
  | 'click'
  | 'purchase'
  | 'discard'
  | 'play'
  | 'clash'
  | 'victory'
  | 'defeat'
  | 'roll'
  | 'shuffle'
  | 'cardSelect'
  | 'fanfare'
  | 'coin';

export type BGMThemeType = 'title' | 'shop' | 'battle' | 'results' | 'none';

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  
  private isMuted: boolean = false;
  private currentBgm: BGMThemeType = 'none';
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  
  // Keep track of active oscillators for smooth BGM drone crossfades
  private activeDrones: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private activeLfos: OscillatorNode[] = [];

  // HTML5 Audio players for MP3 background tracks
  private bgmPlayers: Record<string, HTMLAudioElement> = {};
  private bgmGains: Record<string, GainNode> = {};

  constructor() {
    // Load mute state from localStorage
    const savedMute = localStorage.getItem('cyber_dome_mute');
    this.isMuted = savedMute === 'true';
  }

  // Ensure AudioContext is initialized (must be triggered by user interaction)
  public init() {
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      // Master volume node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);

      // Master compressor to glue the BGM and SE mixes together and prevent digital clipping
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, this.ctx.currentTime); // start compressing at -16dB
      compressor.knee.setValueAtTime(12, this.ctx.currentTime);      // soft knee curve
      compressor.ratio.setValueAtTime(4, this.ctx.currentTime);       // 4:1 compression ratio
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);  // 3ms attack time
      compressor.release.setValueAtTime(0.22, this.ctx.currentTime);  // 220ms release time

      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);

      // BGM volume node
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Relaxed BGM volume
      this.bgmGain.connect(this.masterGain);

      // SE volume node
      this.seGain = this.ctx.createGain();
      this.seGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.seGain.connect(this.masterGain);

      // Drone gain for title/ambient background pads
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.droneGain.connect(this.bgmGain);

      // Initialize HTML5 Audio elements for MP3 BGMs safely (non-blocking, test-safe)
      const bgmFiles: Record<string, string> = {
        title: '/sounds/Neural_Siege.mp3',
        shop: '/sounds/Beneath_the_Concrete_Slab.mp3',
        battle: '/sounds/Locked_Within_The_Iron.mp3',
        results: '/sounds/Final_Tally_In_Sector_Seven.mp3'
      };

      if (typeof window !== 'undefined' && (window.Audio || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) {
        for (const [theme, filePath] of Object.entries(bgmFiles)) {
          if (typeof Audio !== 'undefined' && typeof this.ctx.createMediaElementSource === 'function') {
            try {
              const audio = new Audio(filePath);
              audio.loop = true;
              audio.crossOrigin = 'anonymous';

              const trackGain = this.ctx.createGain();
              trackGain.gain.setValueAtTime(0, this.ctx.currentTime);
              trackGain.connect(this.bgmGain);

              const source = this.ctx.createMediaElementSource(audio);
              source.connect(trackGain);

              this.bgmPlayers[theme] = audio;
              this.bgmGains[theme] = trackGain;
            } catch (err) {
              console.error(`Failed to initialize BGM element for ${theme}:`, err);
            }
          }
        }
      }
    } catch (e) {
      console.error('Web Audio API not supported in this browser', e);
    }
  }

  // Resume context if suspended (browser security requirement)
  private async resumeIfNeeded(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return true;
  }

  // Toggle master mute
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('cyber_dome_mute', String(this.isMuted));

    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.8;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    
    // Play a tiny confirmation beep when unmuting
    if (!this.isMuted) {
      this.playSE('click');
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Play a procedurally synthesized sound effect
  public async playSE(type: SoundEffectType) {
    const active = await this.resumeIfNeeded();
    if (!active || !this.ctx || !this.seGain) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case 'hover': {
        // High-pitched brief cyber-click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.02);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

        osc.connect(gain);
        gain.connect(this.seGain);
        
        osc.start(now);
        osc.stop(now + 0.03);
        break;
      }

      case 'click': {
        // Clean digital beep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'purchase': {
        // Double-chirp retail chime
        const playChime = (delay: number, freq: number) => {
          if (!this.ctx || !this.seGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + delay);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + delay + 0.08);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);

          osc.connect(gain);
          gain.connect(this.seGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.15);
        };

        playChime(0, 523.25); // C5
        playChime(0.06, 659.25); // E5
        break;
      }

      case 'discard': {
        // High-tech glitch wipe noise
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(8, now);
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        noise.start(now);
        noise.stop(now + 0.16);

        // Glitch distortion element — square wave through waveshaper
        const glitchOsc = this.ctx.createOscillator();
        const glitchGain = this.ctx.createGain();
        const shaper = this.ctx.createWaveShaper();

        glitchOsc.type = 'square';
        glitchOsc.frequency.setValueAtTime(800, now);
        glitchOsc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

        // Simple hard-clip distortion curve
        const makeDistCurve = (amount: number) => {
          const samples = 256;
          const curve = new Float32Array(samples);
          for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
          }
          return curve;
        };
        shaper.curve = makeDistCurve(50);
        shaper.oversample = '2x';

        glitchGain.gain.setValueAtTime(0.15, now);
        glitchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        glitchOsc.connect(shaper);
        shaper.connect(glitchGain);
        glitchGain.connect(this.seGain);

        glitchOsc.start(now);
        glitchOsc.stop(now + 0.15);
        break;
      }

      case 'play': {
        // Cyber-laser swoop + low bass hit
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.22);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.25);

        // Sub bass impact
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(110, now);
        subOsc.frequency.linearRampToValueAtTime(40, now + 0.15);

        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        subOsc.connect(subGain);
        subGain.connect(this.seGain);

        subOsc.start(now);
        subOsc.stop(now + 0.2);
        break;
      }

      case 'clash': {
        // White noise burst for metal friction
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(5, now);
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(250, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        noise.start(now);
        noise.stop(now + 0.21);

        // Detuned metallic ringing tones
        const ringFrequencies = [240, 243, 395];
        ringFrequencies.forEach((freq) => {
          if (!this.ctx || !this.seGain) return;
          const rOsc = this.ctx.createOscillator();
          const rGain = this.ctx.createGain();

          rOsc.type = 'triangle';
          rOsc.frequency.setValueAtTime(freq, now);

          rGain.gain.setValueAtTime(0.18, now);
          rGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

          rOsc.connect(rGain);
          rGain.connect(this.seGain);

          rOsc.start(now);
          rOsc.stop(now + 0.2);
        });
        break;
      }

      case 'victory': {
        // Triumphant ascending synth arpeggio (C major pentatonic)
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          if (!this.ctx || !this.seGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const delay = i * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + delay);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.22, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.35);

          osc.connect(gain);
          gain.connect(this.seGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.4);
        });
        break;
      }

      case 'defeat': {
        // Sad descending pitch dive with lowpass filter
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(55, now + 0.85);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(80, now + 0.85);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.9);
        break;
      }

      case 'roll': {
        // Short rhythmic digital ticks (simulates shuffling / rolling)
        const ticks = 4;
        for (let i = 0; i < ticks; i++) {
          const delay = i * 0.06;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(450 - i * 50, now + delay);

          gain.gain.setValueAtTime(0.1, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.03);

          osc.connect(gain);
          gain.connect(this.seGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.04);
        }
        break;
      }

      case 'shuffle': {
        // Rapid card flicking sound — filtered noise with pitch sweep
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(4, now);
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        noise.start(now);
        noise.stop(now + 0.22);
        break;
      }

      case 'cardSelect': {
        // Quick, glassy high-pitched ping for selecting a card from hand
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.04);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      case 'coin': {
        // Bright coin-chime sparkle: two quick ascending tones
        const playCoinPing = (delay: number, freq: number) => {
          if (!this.ctx || !this.seGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + delay);
          osc.frequency.exponentialRampToValueAtTime(freq * 2.5, now + delay + 0.06);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

          osc.connect(gain);
          gain.connect(this.seGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.18);
        };

        playCoinPing(0, 880);
        playCoinPing(0.06, 1320);
        break;
      }

      case 'fanfare': {
        // Grand ascending brass-like fanfare (square wave with filter)
        const fanfareNotes = [392, 440, 523.25, 659.25, 783.99, 1046.5];
        fanfareNotes.forEach((freq, i) => {
          if (!this.ctx || !this.seGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();
          const delay = i * 0.1;

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + delay);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now + delay);
          filter.frequency.linearRampToValueAtTime(2000, now + delay + 0.3);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.seGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.5);
        });
        break;
      }
    }
  }

  // Stop currently playing BGM
  public stopBGM() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    
    // Stop all active ambient drone oscillators if any exist
    if (this.ctx && this.droneGain) {
      const now = this.ctx.currentTime;
      this.droneGain.gain.setTargetAtTime(0, now, 0.1);
      
      setTimeout(() => {
        this.activeDrones.forEach(osc => {
          try { osc.stop(); } catch {
            // Already stopped or inactive
          }
        });
        this.activeDrones = [];

        this.activeLfos.forEach(lfo => {
          try { lfo.stop(); } catch {
            // Already stopped
          }
        });
        this.activeLfos = [];
      }, 300);
    }

    // Handle HTML5 Audio BGM stopping with smooth fade-out
    if (this.currentBgm !== 'none') {
      const prevTheme = this.currentBgm;
      const player = this.bgmPlayers[prevTheme];
      const gainNode = this.bgmGains[prevTheme];
      
      if (player && gainNode && this.ctx) {
        const now = this.ctx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setTargetAtTime(0, now, 0.15);
        
        setTimeout(() => {
          if (this.currentBgm !== prevTheme) {
            try {
              player.pause();
            } catch (err) {
              console.error(`Failed to pause BGM theme: ${prevTheme}`, err);
            }
          }
        }, 500);
      }
    }
    
    this.currentBgm = 'none';
  }

  // Play a looped cyberpunk theme from MP3
  public async playBGM(theme: BGMThemeType) {
    if (this.currentBgm === theme) return;
    
    const active = await this.resumeIfNeeded();
    if (!active || !this.ctx || !this.bgmGain) return;

    this.stopBGM();
    this.currentBgm = theme;

    if (theme === 'none') return;

    const player = this.bgmPlayers[theme];
    const gainNode = this.bgmGains[theme];

    if (player && gainNode) {
      try {
        player.currentTime = 0;
        await player.play();
        
        const now = this.ctx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 1.0); // 1.0s fade in
      } catch (err) {
        console.error(`Failed to play BGM theme: ${theme}`, err);
      }
    }
  }
}

export const audioService = new ProceduralAudioEngine();
