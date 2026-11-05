/** Small, shared sound bank. Browsers unlock audio on the first user gesture. */
const files = { close: 'close-mouse-click.mp3', bubble: 'soap-bubble.mp3', hover: 'message-pop.mp3', squishy: 'squishy-click-v2.m4a', lick: 'comic-lick.mp3', retract: 'tape-retract.mp3', paper: 'paper-flutter-fast.mp3', windowUp: 'window-up.mp3', windowDown: 'window-down.mp3', pen: 'pen-click.mp3', scroll: 'scroll-tick.mp3', balloonPop: 'balloon-pop.mp3', wind: 'pi-wind.mp3', ouch: 'ouch-vocal.mp3', spin: 'cartoon-spin.mp3' } as const;
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
        .then(bytes => audio.decodeAudioData(bytes))
        .then(decoded => {
          if (name !== 'squishy') return decoded;
          // Remove recording lead-in/tail so the first audible press meets the dent.
          let first=decoded.length,last=0;
          for(let c=0;c<decoded.numberOfChannels;c++){
            const samples=decoded.getChannelData(c);
            for(let i=0;i<samples.length;i++)if(Math.abs(samples[i])>.015){first=Math.min(first,i);last=Math.max(last,i);}
          }
          if(first>=last)return decoded;
          first=Math.max(0,first-Math.round(decoded.sampleRate*.005));
          last=Math.min(decoded.length,last+Math.round(decoded.sampleRate*.04));
          const trimmed=audio.createBuffer(decoded.numberOfChannels,last-first,decoded.sampleRate);
          for(let c=0;c<decoded.numberOfChannels;c++)trimmed.copyToChannel(decoded.getChannelData(c).subarray(first,last),c);
          return trimmed;
        });
      buffers.set(name, buffer);
      void buffer.catch(() => {}); // Audio must never interrupt reading.
    }
    const unlock = () => { if (audio.state === 'suspended') void audio.resume().catch(() => {}); };
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
  } catch { /* Reading still works when audio is unavailable. */ }
}

export function playSound(name: Sound, durationSeconds?: number) {
  const audio = context, buffer = buffers.get(name);
  if (!audio || !buffer || document.hidden || (name === 'hover' && audio.state !== 'running')) return;
  const requested = performance.now();
  void (async () => {
    try {
      if (audio.state === 'suspended') await audio.resume();
      const decoded = await buffer;
      // Do not play delayed effects after a slow download or background-tab resume.
      if (audio.state !== 'running' || document.hidden || performance.now() - requested > 400) return;
      playing.get(name)?.stop();
      if (name === 'squishy') playing.get('hover')?.stop();
      const source = audio.createBufferSource(), gain = audio.createGain();
      source.buffer = decoded; gain.gain.value = { close: 0.45, bubble: 0.4, hover: 0.35, squishy: 0.4875, lick: 0.45, retract: 0.55, paper: 0.42, windowUp: 1.8, windowDown: 1.8, pen: 0.825, scroll: 0.45, balloonPop: 0.65, wind: 0.405, ouch: 0.65, spin: 0.55 }[name];
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
  })();
}

// Keep individual notches distinct even during extremely fast fling gestures.
let lastScrollTick=-Infinity;
export function playScrollTicks(count:number){
 const audio=context,buffer=buffers.get('scroll');
 if(!audio||!buffer||audio.state!=='running'||document.hidden||count<1)return;
 const requested=performance.now();
 void buffer.then(decoded=>{
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
let windGeneration=0,windWanted=false;
let windSource:AudioBufferSourceNode|undefined;
export function stopPiWind(){
 windWanted=false;windGeneration++;windSource?.stop();windSource=undefined;
}
export function startPiWind(){
 stopPiWind();windWanted=true;void resumePiWind();
}
async function resumePiWind(){
 const audio=context,buffer=buffers.get('wind'),token=++windGeneration;
 if(!audio||!buffer||document.hidden)return;
 try{
  if(audio.state==='suspended')await audio.resume();
  const decoded=await buffer;
  if(!windWanted||token!==windGeneration||document.hidden||audio.state!=='running')return;
  const source=audio.createBufferSource(),gain=audio.createGain();
  source.buffer=decoded;source.loop=true;gain.gain.setValueAtTime(0,audio.currentTime);
  gain.gain.linearRampToValueAtTime(.405,audio.currentTime+.25);
  source.connect(gain);gain.connect(audio.destination);windSource=source;
  source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
 }catch{/* Ambience must not interrupt PI. */}
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){windGeneration++;windSource?.stop();windSource=undefined;}
 else if(windWanted)void resumePiWind();
});
