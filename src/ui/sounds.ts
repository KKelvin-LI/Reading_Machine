/** Small, shared sound bank. Browsers unlock audio on the first user gesture. */
const files = { close: 'close-mouse-click.mp3', bubble: 'soap-bubble.mp3', hover: 'message-pop.mp3', squishy: 'squishy-click-v2.m4a', lick: 'comic-lick.mp3', retract: 'tape-retract.mp3', paper: 'paper-flutter-fast.mp3', windowUp: 'window-up.mp3', windowDown: 'window-down.mp3', pen: 'pen-click.mp3', scroll: 'scroll-tick.mp3', balloonPop: 'balloon-pop.mp3', wind: 'pi-wind.mp3', ouch: 'ouch-vocal.mp3', spin: 'cartoon-spin.mp3', chapterUnlock: 'chapter-unlock.mp3', correct: 'checker-correct.mp3', wrong: 'checker-wrong.mp3', chew: 'cereal-chewing.mp3', win: 'winning-chimes.mp3' } as const;
type Sound = keyof typeof files;
let context: AudioContext | undefined;
let mounted = false;
let interacted = false;
const buffers = new Map<Sound, Promise<AudioBuffer>>();
const playing = new Map<Sound, AudioBufferSourceNode>();
const pending = new Map<Sound, symbol>();

function resumeAudio(audio: AudioContext) {
  // Safari can report interrupted after tab switches or an audio interruption.
  return audio.state !== 'running' && audio.state !== 'closed'
    ? audio.resume() : Promise.resolve();
}

function trimSquish(audio: AudioContext, decoded: AudioBuffer) {
  // Remove recording lead-in/tail so the first audible press meets the dent.
  let first = decoded.length, last = 0;
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const samples = decoded.getChannelData(c);
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > .015) { first = Math.min(first, i); last = Math.max(last, i); }
    }
  }
  if (first >= last) return decoded;
  first = Math.max(0, first - Math.round(decoded.sampleRate * .005));
  last = Math.min(decoded.length, last + Math.round(decoded.sampleRate * .04));
  const trimmed = audio.createBuffer(decoded.numberOfChannels, last - first, decoded.sampleRate);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    trimmed.copyToChannel(decoded.getChannelData(c).subarray(first, last), c);
  }
  return trimmed;
}

function loadBuffer(name: Sound, audio: AudioContext): Promise<AudioBuffer> {
  const cached = buffers.get(name);
  if (cached) return cached;

  async function download(cache: RequestCache) {
    const response = await fetch(import.meta.env.BASE_URL + 'audio/' + files[name], { cache });
    if (!response.ok) throw new Error('Sound unavailable: ' + response.status);
    const decoded = await audio.decodeAudioData(await response.arrayBuffer());
    return name === 'squishy' ? trimSquish(audio, decoded) : decoded;
  }

  // Concurrent requests share the download. A failed retry leaves the next press free to try again.
  const loading = download('default').catch(() => download('reload'));
  buffers.set(name, loading);
  void loading.catch(() => { if (buffers.get(name) === loading) buffers.delete(name); });
  return loading;
}

function initialize() {
  if (context && context.state !== 'closed') return context;
  try {
    const AudioConstructor = window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioConstructor) return;
    const audio = new AudioConstructor();
    if (context) {
      pausePiWind();
      pending.clear();
      playing.clear();
      buffers.clear();
    }
    context = audio;
    lastScrollTick = -Infinity;
    // Warm frequent short cues. Larger sounds, including the wind loop, load when needed.
    for (const name of ['bubble', 'squishy', 'hover', 'scroll'] as const) loadBuffer(name, audio);
    return audio;
  } catch { /* A trusted gesture can retry if the browser blocked creation. */ }
}

export function mountSounds() {
  if (mounted) return;
  mounted = true;
  const unlock = (event: Event) => {
    if (!event.isTrusted) return;
    interacted = true;
    const audio = initialize();
    if (audio) void resumeAudio(audio).catch(() => {});
    if (windWanted) void resumePiWind();
  };
  for (const event of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    document.addEventListener(event, unlock, { capture: true, passive: true });
  }
  initialize();
}

export function playSound(name: Sound, durationSeconds?: number) {
  const audio = context;
  if (!audio || document.hidden || (audio.state !== 'running' && (!interacted || name === 'hover'))) return;
  const token = Symbol();
  pending.set(name, token);
  if (name === 'squishy') pending.delete('hover');
  if (name === 'windowUp') pending.delete('windowDown');
  if (name === 'windowDown') pending.delete('windowUp');
  const requested = performance.now();
  void (async () => {
    try {
      // Resume synchronously during the gesture, while the requested file loads in parallel.
      const [, decoded] = await Promise.all([resumeAudio(audio), loadBuffer(name, audio)]);
      if (audio !== context || audio.state !== 'running' || document.hidden || pending.get(name) !== token) return;
      if (name === 'hover' && performance.now() - requested > 400) return;
      playing.get(name)?.stop();
      if (name === 'squishy') playing.get('hover')?.stop();
      const source = audio.createBufferSource(), gain = audio.createGain();
      source.buffer = decoded; gain.gain.value = { close: 0.45, bubble: 0.4, hover: 0.35, squishy: 0.4875, lick: 0.45, retract: 0.55, paper: 0.42, windowUp: 1.8, windowDown: 1.8, pen: 0.825, scroll: 0.45, balloonPop: 0.65, wind: 0.405, ouch: 0.65, spin: 0.55, chapterUnlock: 0.65, correct: 0.5, wrong: 0.45, chew: 0.55, win: 0.5 }[name];
      if(name==='windowUp'||name==='windowDown'){
        playing.get(name==='windowUp'?'windowDown':'windowUp')?.stop();
        if(durationSeconds)source.playbackRate.value=decoded.duration/durationSeconds;
      }
      if(name==='paper'&&durationSeconds)source.playbackRate.value=decoded.duration/durationSeconds;
      if(name==='retract'&&durationSeconds)source.playbackRate.value=decoded.duration/Math.max(.18,durationSeconds);
      if(name==='squishy')source.playbackRate.value=decoded.duration/(durationSeconds??0.65);
      source.connect(gain); gain.connect(audio.destination); playing.set(name, source);
      source.onended = () => { source.disconnect(); gain.disconnect(); if (playing.get(name) === source) playing.delete(name); };
      source.start();
    } catch { /* Missing or blocked sound is non-fatal. */ }
    finally { if (pending.get(name) === token) pending.delete(name); }
  })();
}

// Keep individual notches distinct even during extremely fast fling gestures.
let lastScrollTick=-Infinity;
export function playScrollTicks(count:number){
 const audio=context;
 if(!audio||audio.state!=='running'||document.hidden||count<1)return;
 const requested=performance.now();
 void loadBuffer('scroll',audio).then(decoded=>{
  if(audio.state!=='running'||document.hidden||performance.now()-requested>80)return;
  const now=audio.currentTime;
  if(now-lastScrollTick<Math.max(.075,decoded.duration))return;
  lastScrollTick=now;
  // Coalesce excess crossings; never queue a burst after the gesture has stopped.
  const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=decoded;
  gain.gain.value=.45;source.connect(gain);gain.connect(audio.destination);
  source.onended=()=>{source.disconnect();gain.disconnect();};
  source.start(now);
 }).catch(()=>{});
}

// PI ambience is cancellable even while its audio file is still decoding.
let windWanted = false;
let pendingWind: symbol | undefined;
let windSource: AudioBufferSourceNode | undefined;

function pausePiWind() {
  pendingWind = undefined;
  windSource?.stop();
  windSource = undefined;
}

export function stopPiWind() {
  windWanted = false;
  pausePiWind();
}

export function startPiWind() {
  windWanted = true;
  void resumePiWind();
}

async function resumePiWind() {
  const audio = context;
  if (!audio || document.hidden || !windWanted || windSource || pendingWind) return;
  if (audio.state !== 'running' && !interacted) return;
  const token = pendingWind = Symbol();
  try {
    const [, decoded] = await Promise.all([resumeAudio(audio), loadBuffer('wind', audio)]);
    if (pendingWind !== token || document.hidden || audio.state !== 'running') return;
    const source = audio.createBufferSource(), gain = audio.createGain();
    source.buffer = decoded;
    source.loop = true;
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.linearRampToValueAtTime(.405, audio.currentTime + .25);
    source.connect(gain);
    gain.connect(audio.destination);
    source.onended = () => {
      source.disconnect(); gain.disconnect();
      if (windSource === source) windSource = undefined;
    };
    source.start();
    windSource = source;
  } catch { /* Retry on the next gesture while the balloon is visible. */ }
  finally { if (pendingWind === token) pendingWind = undefined; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pending.clear();
    pausePiWind();
  } else if (windWanted) {
    void resumePiWind();
  }
});
