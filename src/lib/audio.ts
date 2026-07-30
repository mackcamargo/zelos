export function playMeditationChime() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  compressor.threshold.setValueAtTime(-12, ctx.currentTime);
  compressor.knee.setValueAtTime(20, ctx.currentTime);
  compressor.ratio.setValueAtTime(12, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.15, ctx.currentTime);
  compressor.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 2); // Slide down

  // Volume triplicado (0.5 * 3 = 1.5 -> clamped para 0.95 seguro com compressor)
  gain.gain.setValueAtTime(0.95, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);

  osc.connect(gain);
  gain.connect(compressor);

  osc.start();
  osc.stop(ctx.currentTime + 3);
}

