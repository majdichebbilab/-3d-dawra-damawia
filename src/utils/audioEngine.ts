// Procedural Web Audio API Heartbeat ("Lub-Dub") + Bilingual Web Speech Pronunciation

class CirculatoryAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted = false;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public unlock() {
    this.ensureContext();
  }

  public playHeartbeat(phase: 'lub' | 'dub', bpm: number) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const rateScale = Math.min(1.3, Math.max(0.85, bpm / 72));
    const duration = (phase === 'lub' ? 0.14 : 0.1) / rateScale;
    const startFreq = phase === 'lub' ? 68 : 88;
    const endFreq = phase === 'lub' ? 32 : 42;
    const peakGain = phase === 'lub' ? 0.42 : 0.3;

    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(startFreq * 0.65, now);
    subOsc.frequency.exponentialRampToValueAtTime(endFreq * 0.65, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);
    filter.Q.setValueAtTime(1.8, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + duration + 0.02);
    subOsc.stop(now + duration + 0.02);
  }

  public dispose() {
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.stopSpeech();
  }

  public isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public stopSpeech() {
    if (this.isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public speakBilingual(
    textAr: string,
    textFr: string,
    onStateChange?: (state: 'speaking-ar' | 'speaking-fr' | 'idle' | 'unsupported') => void,
  ) {
    if (!this.isSpeechSupported()) {
      onStateChange?.('unsupported');
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const voices = synth.getVoices();
    const arVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
    const frVoice = voices.find((v) => v.lang.toLowerCase().startsWith('fr'));

    const utterAr = new SpeechSynthesisUtterance(textAr);
    utterAr.lang = arVoice?.lang ?? 'ar-SA';
    if (arVoice) utterAr.voice = arVoice;
    utterAr.rate = 0.92;
    utterAr.pitch = 1.0;

    const utterFr = new SpeechSynthesisUtterance(textFr);
    utterFr.lang = frVoice?.lang ?? 'fr-FR';
    if (frVoice) utterFr.voice = frVoice;
    utterFr.rate = 0.92;
    utterFr.pitch = 1.0;

    let cancelled = false;

    utterAr.onstart = () => {
      if (!cancelled) onStateChange?.('speaking-ar');
    };
    utterAr.onend = () => {
      if (!cancelled) {
        synth.speak(utterFr);
      }
    };
    utterAr.onerror = () => {
      if (!cancelled) {
        synth.speak(utterFr);
      }
    };

    utterFr.onstart = () => {
      if (!cancelled) onStateChange?.('speaking-fr');
    };
    utterFr.onend = () => {
      cancelled = true;
      onStateChange?.('idle');
    };
    utterFr.onerror = () => {
      cancelled = true;
      onStateChange?.('idle');
    };

    onStateChange?.('speaking-ar');
    synth.speak(utterAr);
  }
}

export const audioEngine = new CirculatoryAudioEngine();
