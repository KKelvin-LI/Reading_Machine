/** Small, shared sound bank. Browsers unlock audio on the first user gesture. */
const files = { close: 'close-mouse-click.mp3', unlock: 'soap-bubble.mp3' } as const;
type Sound = keyof typeof files;
let context: AudioContext | undefined;
const buffers = new Map<Sound, Promise<AudioBuffer>>();
const playing = new Map<Sound, AudioBufferSourceNode>();

export function mountSounds() {
  if (context) return;
  try {
    context = new AudioContext();
    const audio = context;
    for (const name of Object.keys(files) as Sound[]) {
      const buffer = fetch(import.meta.env.BASE_URL + 'audio/' + files[name])
        .then(response => { if (!response.ok) throw new Error('Sound unavailable'); return response.arrayBuffer(); })
        .then(bytes => audio.decodeAudioData(bytes));
      buffers.set(name, buffer);
      void buffer.catch(() => {}); // Audio must never interrupt reading.
    }
    const unlock = () => { if (audio.state === 'suspended') void audio.resume().catch(() => {}); };
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
  } catch { /* Reading still works when audio is unavailable. */ }
}

export function playSound(name: Sound) {
  const audio = context, buffer = buffers.get(name);
  if (!audio || !buffer || document.hidden) return;
  const requested = performance.now();
  void (async () => {
    try {
      if (audio.state === 'suspended') await audio.resume();
      const decoded = await buffer;
      // Do not play delayed effects after a slow download or background-tab resume.
      if (audio.state !== 'running' || document.hidden || performance.now() - requested > 400) return;
      playing.get(name)?.stop();
      const source = audio.createBufferSource(), gain = audio.createGain();
      source.buffer = decoded; gain.gain.value = name === 'close' ? 0.45 : 0.4;
      source.connect(gain); gain.connect(audio.destination); playing.set(name, source);
      source.onended = () => { source.disconnect(); gain.disconnect(); if (playing.get(name) === source) playing.delete(name); };
      source.start();
    } catch { /* Missing or blocked sound is non-fatal. */ }
  })();
}
