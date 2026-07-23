// Sonoplastia ZÊNITE — sons sintetizados, sem arquivos.
type TipoSom =
  | "tap"          // navegação, botão genérico
  | "toggleOn"     // marcar hábito/série como feito
  | "toggleOff"    // desmarcar
  | "sucesso"      // salvou algo com êxito
  | "celebracao"   // treino concluído / todos os hábitos do dia
  | "recorde"      // novo PR de carga
  | "enviar"       // enviar mensagem
  | "receber"      // mensagem recebida
  | "erro"         // falha
  | "abrir"        // abrir modal/card
  | "fechar"       // fechar modal/card
  | "timerTick"    // contagem regressiva
  | "timerEnd";    // fim do descanso

let ctx: AudioContext | null = null;
let habilitado = true;

// Notas da pentatônica maior de C — nada soa desafinado entre si
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392 };

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Toca uma nota com envelope suave (sem estalo)
function nota(freq: number, inicio: number, duracao: number, volume: number, tipo: OscillatorType = "sine") {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, c.currentTime + inicio);
  // attack rápido + decay exponencial = som "gostoso", sem clique
  gain.gain.setValueAtTime(0.0001, c.currentTime + inicio);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + inicio + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + inicio + duracao);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + inicio);
  osc.stop(c.currentTime + inicio + duracao + 0.02);
}

// Glide entre duas frequências (som de "swipe")
function glide(de: number, para: number, duracao: number, volume: number) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(de, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(para, c.currentTime + duracao);
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duracao);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duracao + 0.02);
}

export function tocar(tipo: TipoSom) {
  if (!habilitado) return;
  try {
    switch (tipo) {
      case "tap":        nota(N.A5, 0, 0.04, 0.10, "sine"); break;
      case "toggleOn":   nota(N.E5, 0, 0.05, 0.14); nota(N.G5, 0.05, 0.08, 0.14); break;
      case "toggleOff":  nota(N.G5, 0, 0.05, 0.10); nota(N.D5, 0.05, 0.08, 0.10); break;
      case "sucesso":    nota(N.C5, 0, 0.06, 0.14); nota(N.E5, 0.06, 0.06, 0.14); nota(N.G5, 0.12, 0.12, 0.14); break;
      case "celebracao": nota(N.C5, 0, 0.08, 0.16); nota(N.E5, 0.08, 0.08, 0.16); nota(N.G5, 0.16, 0.08, 0.16); nota(N.C6, 0.24, 0.25, 0.18); break;
      case "recorde":    nota(N.G5, 0, 0.07, 0.16); nota(N.C6, 0.07, 0.07, 0.18); nota(N.E6, 0.14, 0.30, 0.20); break;
      case "enviar":     glide(600, 1000, 0.07, 0.10); break;
      case "receber":    nota(N.D5, 0, 0.05, 0.10); nota(N.A5, 0.07, 0.10, 0.10); break;
      case "erro":       nota(N.G4, 0, 0.10, 0.12, "triangle"); nota(320, 0.10, 0.14, 0.12, "triangle"); break;
      case "abrir":      glide(500, 800, 0.06, 0.08); break;
      case "fechar":     glide(800, 500, 0.06, 0.08); break;
      case "timerTick":  nota(N.E6, 0, 0.04, 0.08); break;
      case "timerEnd":   nota(N.G5, 0, 0.10, 0.15); nota(N.C6, 0.10, 0.10, 0.15); nota(N.E6, 0.20, 0.30, 0.18); break;
    }
  } catch { /* som nunca pode quebrar a UI */ }
}

export function setSomHabilitado(v: boolean) {
  habilitado = v;
  try { localStorage.setItem("zenite_som", v ? "1" : "0"); } catch {}
}

export function getSomHabilitado(): boolean {
  try { return localStorage.getItem("zenite_som") !== "0"; } catch { return true; }
}

// chamar uma vez no boot do app
export function initSom() {
  habilitado = getSomHabilitado();
}
