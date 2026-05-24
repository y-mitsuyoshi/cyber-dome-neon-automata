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
  | 'roll';

export type BGMThemeType = 'title' | 'shop' | 'battle' | 'none';

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  
  private isMuted: boolean = false;
  private currentBgm: BGMThemeType = 'none';
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmTickCount: number = 0;
  
  // Keep track of active oscillators for smooth BGM drone crossfades
  private activeDrones: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;

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
    }
  }

  // Stop currently scheduled procedural BGM loop
  public stopBGM() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    
    // Stop all active ambient drone oscillators
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
      }, 200);
    }
    
    this.currentBgm = 'none';
  }

  // Play a procedurally generated looped cyberpunk theme
  public async playBGM(theme: BGMThemeType) {
    if (this.currentBgm === theme) return;
    
    const active = await this.resumeIfNeeded();
    if (!active || !this.ctx || !this.bgmGain) return;

    this.stopBGM();
    this.currentBgm = theme;
    this.bgmTickCount = 0;

    const now = this.ctx.currentTime;

    switch (theme) {
      case 'title': {
        // Procedural Title BGM: Atmospheric deep space cyberpunk pad drone
        if (this.droneGain) {
          this.droneGain.gain.setValueAtTime(0, now);
          this.droneGain.gain.linearRampToValueAtTime(0.5, now + 2.0); // 2s fade in
        }

        const createDrone = (freq: number) => {
          if (!this.ctx || !this.droneGain) return;
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          
          // Lowpass filter for smooth analog warmth
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(140, this.ctx.currentTime);

          osc.connect(filter);
          filter.connect(this.droneGain);
          
          osc.start();
          this.activeDrones.push(osc);
        };

        // Deep 55Hz (A1) and detuned 55.3Hz, and 110Hz (A2) drone
        createDrone(55);
        createDrone(55.3);
        createDrone(110);

        // Periodically schedule sparkling, slow holographic chimes
        const scheduleChimes = () => {
          if (this.currentBgm !== 'title' || !this.ctx || !this.bgmGain) return;
          
          const chimeNow = this.ctx.currentTime;
          const frequencies = [440, 550, 660, 880, 1100]; // A minor pentatonic sparkling chimes
          const freq = frequencies[Math.floor(Math.random() * frequencies.length)];

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const delay = this.ctx.createDelay();
          const delayGain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, chimeNow);

          gain.gain.setValueAtTime(0, chimeNow);
          gain.gain.linearRampToValueAtTime(0.08, chimeNow + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, chimeNow + 1.5);

          // Digital delay loop for spatial reverb effect
          delay.delayTime.setValueAtTime(0.3, chimeNow);
          delayGain.gain.setValueAtTime(0.45, chimeNow);

          osc.connect(gain);
          gain.connect(this.bgmGain);

          // Delay feedback connection
          gain.connect(delay);
          delay.connect(delayGain);
          delayGain.connect(this.bgmGain);
          delayGain.connect(delay); // feedback

          osc.start(chimeNow);
          osc.stop(chimeNow + 2.0);
        };

        // Sparkle chimes every 2.5 seconds
        this.bgmIntervalId = setInterval(scheduleChimes, 2500);
        break;
      }

      case 'shop': {
        // Procedural Shop BGM: Cyber-lounge chill rhythmic ambient track
        // Warm periodic chords + slow sub bass
        const shopTempo = 250; // 60 BPM (ticks every 250ms)
        const chordProgression = [
          [130.81, 164.81, 196.00], // C major (C3, E3, G3)
          [146.83, 174.61, 220.00], // D minor (D3, F3, A3)
          [164.81, 196.00, 246.94], // E minor (E3, G3, B3)
          [139.00, 174.61, 207.65], // F major (F3, A3, C3)
        ];

        const tickShop = () => {
          if (!this.ctx || !this.bgmGain) return;
          const tickNow = this.ctx.currentTime;
          const measure = Math.floor(this.bgmTickCount / 16) % chordProgression.length;
          const beatInMeasure = this.bgmTickCount % 16;

          // 1. Play warm pad chord at the start of every 4 measures
          if (beatInMeasure === 0) {
            const chord = chordProgression[measure];
            chord.forEach((freq) => {
              if (!this.ctx || !this.bgmGain) return;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              const filter = this.ctx.createBiquadFilter();

              osc.type = 'triangle';
              osc.frequency.setValueAtTime(freq, tickNow);

              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(250, tickNow);
              filter.frequency.linearRampToValueAtTime(600, tickNow + 1.5);
              filter.frequency.exponentialRampToValueAtTime(150, tickNow + 3.8);

              gain.gain.setValueAtTime(0, tickNow);
              gain.gain.linearRampToValueAtTime(0.12, tickNow + 0.5);
              gain.gain.exponentialRampToValueAtTime(0.001, tickNow + 3.9);

              osc.connect(filter);
              filter.connect(gain);
              gain.connect(this.bgmGain);

              osc.start(tickNow);
              osc.stop(tickNow + 4.0);
            });
          }

          // 2. Play warm sine bass notes on beats 0, 4, 8, 12
          if (beatInMeasure % 4 === 0) {
            const baseFreq = chordProgression[measure][0] / 2; // Bass (Sub) octave
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, tickNow);

            gain.gain.setValueAtTime(0.24, tickNow);
            gain.gain.exponentialRampToValueAtTime(0.01, tickNow + 0.85);

            osc.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(tickNow);
            osc.stop(tickNow + 1.0);
          }

          // 3. Ambient crystal droplet melodies on odd beats (semi-randomized)
          if (beatInMeasure % 2 === 1 && Math.random() < 0.35) {
            const chord = chordProgression[measure];
            const baseFreq = chord[Math.floor(Math.random() * chord.length)] * 2; // Melodic octave

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, tickNow);

            gain.gain.setValueAtTime(0, tickNow);
            gain.gain.linearRampToValueAtTime(0.06, tickNow + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, tickNow + 0.6);

            osc.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(tickNow);
            osc.stop(tickNow + 0.7);
          }

          this.bgmTickCount++;
        };

        this.bgmIntervalId = setInterval(tickShop, shopTempo);
        break;
      }

      case 'battle': {
        // Procedural Battle BGM: Fast-paced dark-synth driving cyberpunk track (115 BPM)
        const battleTempo = 130; // 115 BPM (ticks every 130ms)
        const bassPattern = [
          55, 55, 65.41, 65.41, 55, 55, 73.42, 73.42, // A1 -> C2 -> A1 -> D2
          55, 55, 65.41, 65.41, 48.99, 48.99, 48.99, 48.99, // A1 -> C2 -> G1 -> G1
        ];

        const tickBattle = () => {
          if (!this.ctx || !this.bgmGain) return;
          const tickNow = this.ctx.currentTime;
          const step = this.bgmTickCount % bassPattern.length;

          // 1. Cyber Kick Drum on step 0, 4, 8, 12
          if (step % 4 === 0) {
            const kOsc = this.ctx.createOscillator();
            const kGain = this.ctx.createGain();

            kOsc.type = 'sine';
            kOsc.frequency.setValueAtTime(160, tickNow);
            kOsc.frequency.exponentialRampToValueAtTime(45, tickNow + 0.09);

            kGain.gain.setValueAtTime(0.55, tickNow);
            kGain.gain.exponentialRampToValueAtTime(0.001, tickNow + 0.11);

            kOsc.connect(kGain);
            kGain.connect(this.bgmGain);

            kOsc.start(tickNow);
            kOsc.stop(tickNow + 0.12);
          }

          // 2. Synthesized Snare/Clap on step 4, 12 (filtered noise blast)
          if (step === 4 || step === 12) {
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
            }

            const sNoise = this.ctx.createBufferSource();
            sNoise.buffer = buffer;

            const sFilter = this.ctx.createBiquadFilter();
            sFilter.type = 'bandpass';
            sFilter.frequency.setValueAtTime(1000, tickNow);

            const sGain = this.ctx.createGain();
            sGain.gain.setValueAtTime(0.26, tickNow);
            sGain.gain.exponentialRampToValueAtTime(0.001, tickNow + 0.08);

            sNoise.connect(sFilter);
            sFilter.connect(sGain);
            sGain.connect(this.bgmGain);

            sNoise.start(tickNow);
            sNoise.stop(tickNow + 0.09);
          }

          // 3. Driving driving 16th sawtooth Bassline on every step
          const bassFreq = bassPattern[step];
          const bOsc = this.ctx.createOscillator();
          const bGain = this.ctx.createGain();
          const bFilter = this.ctx.createBiquadFilter();

          bOsc.type = 'sawtooth';
          bOsc.frequency.setValueAtTime(bassFreq, tickNow);

          bFilter.type = 'lowpass';
          bFilter.frequency.setValueAtTime(280, tickNow);
          bFilter.Q.setValueAtTime(3, tickNow);

          // Rhythmic bass bounce
          bGain.gain.setValueAtTime(0.18, tickNow);
          bGain.gain.exponentialRampToValueAtTime(0.001, tickNow + 0.12);

          bOsc.connect(bFilter);
          bFilter.connect(bGain);
          bGain.connect(this.bgmGain);

          bOsc.start(tickNow);
          bOsc.stop(tickNow + 0.13);

          // 4. Randomized cyber-hacker sound bites or notes occasionally
          if (step % 2 === 1 && Math.random() < 0.22) {
            const leadOsc = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();
            const leadFilter = this.ctx.createBiquadFilter();
            // Fast pentatonic blips
            const scale = [220, 261.63, 293.66, 329.63, 392.00, 440.00];
            const leadFreq = scale[Math.floor(Math.random() * scale.length)] * 2;

            leadOsc.type = 'square';
            leadOsc.frequency.setValueAtTime(leadFreq, tickNow);

            leadFilter.type = 'bandpass';
            leadFilter.frequency.setValueAtTime(1500, tickNow);

            leadGain.gain.setValueAtTime(0.04, tickNow);
            leadGain.gain.exponentialRampToValueAtTime(0.001, tickNow + 0.1);

            leadOsc.connect(leadFilter);
            leadFilter.connect(leadGain);
            leadGain.connect(this.bgmGain);

            leadOsc.start(tickNow);
            leadOsc.stop(tickNow + 0.11);
          }

          this.bgmTickCount++;
        };

        this.bgmIntervalId = setInterval(tickBattle, battleTempo);
        break;
      }
    }
  }
}

export const audioService = new ProceduralAudioEngine();
