/* Petit Mind portfolio enhancements: accessible minigames, endings album, and optional cloud saves. */
(() => {
  const originalPaintPixelPet = paintPixelPet;
  paintPixelPet = function (canvas, species, age, job) {
    canvas.width = 48;
    canvas.height = 56;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(4, 3);
    ctx.scale(1.65, 1.65);
    originalPaintPixelPet(canvas, species, age, job);
    ctx.restore();
  };

  petChoices.splice(0, petChoices.length,
    ['🐣', '병아리'], ['🐱', '고양이'], ['🐶', '강아지'], ['🐹', '햄스터'], ['👦', '남자'], ['👧', '여자']);
  if (!state.species) setupPet();
  document.querySelector('.profile > span')?.remove();

  function rewardThreeCorrectAnswers() {
    state.energy = Math.min(100, state.energy + 5);
    saveV2();
    pmRefreshHud();
    toast('세 문제를 모두 맞혔어요! 컨디션이 5 회복됐어요.');
  }
  window.pmRewardThreeCorrectAnswers = rewardThreeCorrectAnswers;

  const priorStartGame = startGame;
  startGame = function (id) {
    if (id === 'values') {
      const activity = activities.find(x => x.id === id);
      const entries = gameStory[id] || [];
      const entry = entries[Math.floor(Math.random() * entries.length)];
      if (!entry) return priorStartGame(id);
      openModal(activity, '정답을 고르기보다, 내가 중요하게 생각하는 것을 살펴봐요.');
      const area = document.getElementById('gameArea');
      const choices = [entry[1], ...entries.map(x => x[1]).filter(x => x !== entry[1])].slice(0, 3).sort(() => Math.random() - .5);
      area.innerHTML = '<p>' + entry[0] + '</p><div class="game-buttons">' + choices.map((x, i) => '<button class="choice" data-i="' + i + '">' + x + '</button>').join('') + '</div>';
      area.querySelectorAll('button').forEach(b => b.onclick = () => {
        finish(activity, true);
        document.getElementById('result').textContent = '선택에 정답은 없어요. 그 이유를 생각해 보면 나를 더 잘 알 수 있어요.';
      });
      return;
    }
    if (id === 'breathe') {
      const activity = activities.find(x => x.id === id);
      openModal(activity, '초록빛이 켜지면 버튼을 눌러 천천히 숨을 내쉬어요.');
      const area = document.getElementById('gameArea');
      area.innerHTML = '<div class="breath-scene" id="breathScene"><div class="breath-orb" id="breathOrb">🌬️</div><p id="breathPrompt">편안한 자세로 기다려요…</p><button class="choice" id="breathBtn" disabled>초록빛에 맞춰 내쉬기</button></div>';
      const scene = document.getElementById('breathScene'), button = document.getElementById('breathBtn'), prompt = document.getElementById('breathPrompt');
      let ready = false;
      setTimeout(() => { ready = true; scene.classList.add('breathing-ready'); prompt.textContent = '지금, 천천히 내쉬어요'; button.disabled = false; }, 1800 + Math.random() * 1800);
      button.onclick = () => { finish(activity, ready, ready ? { virtue: 2 } : {}); prompt.textContent = ready ? '호흡을 잘 가다듬었어요.' : '괜찮아요. 다음에는 초록빛을 보고 눌러요.'; };
      return;
    }
    if (id === 'soundmemory') {
      const activity = activities.find(x => x.id === id);
      if (state.energy < 7) { toast('컨디션이 부족해요. 쉬어 주세요.'); return; }
      openModal(activity, '소리 순서를 들은 뒤 같은 순서로 음을 눌러 보세요.');
      const area = document.getElementById('gameArea');
      area.innerHTML = '<p id="soundPrompt">소리를 잘 들어 보세요…</p><div class="tone-buttons">' + ['도', '미', '솔', '라'].map((x, i) => '<button class="choice tone" data-tone="' + i + '">' + x + '</button>').join('') + '</div><button class="choice" id="replayTone">🔊 다시 듣기</button>';
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { document.getElementById('soundPrompt').textContent = '이 브라우저에서는 소리를 재생할 수 없어요. 기억 순서 게임으로 진행해요.'; return priorStartGame('memory'); }
      const ctx = new AC(), freqs = [261.63, 329.63, 392, 440], sequence = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4));
      let index = 0, playing = false;
      const play = async (tone, delay = 0) => { await ctx.resume(); setTimeout(() => { const osc = ctx.createOscillator(), gain = ctx.createGain(), volume = window.pmBgmSettings?.volume ?? .45; osc.frequency.value = freqs[tone]; osc.type = 'sine'; gain.gain.setValueAtTime(.001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(Math.max(.0001,.18*volume), ctx.currentTime + .025); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .32); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .34); }, delay); };
      const showSequence = () => { if (playing) return; playing = true; document.getElementById('soundPrompt').textContent = '귀 기울여 들어요'; sequence.forEach((tone, i) => play(tone, i * 520)); setTimeout(() => { playing = false; document.getElementById('soundPrompt').textContent = '이제 같은 순서로 음을 눌러요'; }, sequence.length * 520 + 360); };
      document.getElementById('replayTone').onclick = showSequence;
      area.querySelectorAll('.tone').forEach(button => button.onclick = () => {
        if (playing) return;
        const tone = Number(button.dataset.tone); play(tone);
        if (tone !== sequence[index]) { document.getElementById('soundPrompt').textContent = '순서가 달라도 괜찮아요. 듣고 기억하는 연습을 했어요.'; finish(activity, false); return; }
        button.classList.add('tone-hit'); setTimeout(() => button.classList.remove('tone-hit'), 220);
        if (++index === sequence.length) { document.getElementById('soundPrompt').textContent = '세 소리 순서를 모두 기억했어요!'; finish(activity, true); rewardThreeCorrectAnswers(); }
      });
      showSequence();
      return;
    }
    priorStartGame(id);
  };

  // Repeat digits are allowed in sequence memory: the same key may be pressed again.
  const htmlPath = document.documentElement;
  const baseCareerFit = careerFit;
  careerFit = function (job) {
    const profile = job[2];
    const fit = baseCareerFit(job);
    const values = Object.values(state.stats || {});
    const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    const breadth = Object.entries(profile).reduce((score, [key, level]) => score + Math.max(0, 100 - Math.abs((state.stats[key] || 0) - targets[level])), 0) / Math.max(1, Object.keys(profile).length);
    const balance = Math.max(0, 100 - values.reduce((sum, n) => sum + Math.abs(n - mean), 0) / Math.max(1, values.length));
    return fit * .55 + breadth * .25 + balance * .20;
  };

  function readEndings() { try { return JSON.parse(localStorage.getItem('petitMindEndings') || '[]'); } catch { return []; } }
  const baseShowEnding = pmShowEnding;
  pmShowEnding = function (job) {
    const key = state.ending?.job || job?.[0] || '꿈을 이룬 쁘띠';
    baseShowEnding(job);
    const endings = readEndings();
    endings.push({ name: state.name, species: state.species, job: key, costume: state.ending?.costume || '', age: state.age, days: state.days, stats: { ...state.stats }, createdAt: new Date().toISOString() });
    localStorage.setItem('petitMindEndings', JSON.stringify(endings));
    window.pmSyncEndings?.();
  };

  const album = document.createElement('section');
  album.id = 'endingAlbum'; album.className = 'diary-overlay';
  album.innerHTML = '<div class="diary-book album-book"><div class="diary-head"><h2>쁘띠 엔딩 앨범</h2><button class="diary-close" id="albumClose">닫기 ✕</button></div><div id="albumPage"></div><div class="diary-nav"><button class="diary-nav-btn" id="albumPrev">◀ 이전</button><span id="albumCount"></span><button class="diary-nav-btn" id="albumNext">다음 ▶</button></div></div>';
  document.body.append(album);
  const albumButton = document.createElement('button'); albumButton.id = 'albumOpen'; albumButton.className = 'iconbtn'; albumButton.textContent = '🖼 엔딩 앨범'; document.querySelector('.top').append(albumButton);
  let albumIndex = 0;
  function renderAlbum() {
    const items = readEndings(), target = document.getElementById('albumPage'); target.replaceChildren();
    if (!items.length) { target.innerHTML = '<div class="album-empty">아직 모은 엔딩이 없어요. 쁘띠의 첫 번째 미래를 만들어 보세요!</div>'; document.getElementById('albumCount').textContent = '0 / 0'; }
    else { albumIndex = Math.min(albumIndex, items.length - 1); const item = items[albumIndex]; const card = document.createElement('article'); card.className = 'album-card'; const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 56; canvas.className = 'album-pet'; const heading = document.createElement('h3'); heading.textContent = item.name + ' · ' + item.job; const copy = document.createElement('p'); copy.textContent = item.age + '세에 만난 미래 · ' + item.days + '일 동안 함께한 기록'; const scores = document.createElement('p'); scores.className = 'album-stats'; scores.textContent = '지능 ' + item.stats.int + ' · 인성 ' + item.stats.virtue + ' · 사회성 ' + item.stats.social + ' · 건강 ' + item.stats.body; card.append(canvas, heading, copy, scores); target.append(card); paintPixelPet(canvas, item.species, item.age, item.job); document.getElementById('albumCount').textContent = (albumIndex + 1) + ' / ' + items.length; }
    document.getElementById('albumPrev').disabled = albumIndex <= 0; document.getElementById('albumNext').disabled = albumIndex >= readEndings().length - 1;
  }
  albumButton.onclick = () => { albumIndex = Math.max(0, readEndings().length - 1); renderAlbum(); album.classList.add('show'); window.pmLoadEndings?.().then(renderAlbum); };
  document.getElementById('albumClose').onclick = () => album.classList.remove('show');
  document.getElementById('albumPrev').onclick = () => { albumIndex = Math.max(0, albumIndex - 1); renderAlbum(); };
  document.getElementById('albumNext').onclick = () => { albumIndex = Math.min(readEndings().length - 1, albumIndex + 1); renderAlbum(); };
  album.onclick = e => { if (e.target === album) album.classList.remove('show'); };

  document.head.insertAdjacentHTML('beforeend', `<style>
    :root{--ink:#26364d;--paper:#17243a;--card:#263751;--green:#86c7b4;--mint:#a8d9d0;--yellow:#f3d17b;--coral:#dd8d83;--blue:#91b9c2;--line:#7897af;--shadow:0 5px 0 #111a2a}
    .meters .meter:nth-child(1) .fill{background:#91b9c2}.meters .meter:nth-child(2) .fill{background:#dd8d83}.meters .meter:nth-child(3) .fill{background:#a8d9d0}.meters .meter:nth-child(4) .fill{background:#f3d17b}
    .pet-pick.selected{background:#496581;color:#fff0bd;border-color:#f1d27c}.pet-pick,.pet-pick span{color:#17243a}.pet-pick:hover,.pet-pick.selected,.pet-pick:hover span,.pet-pick.selected span{color:#fff0bd}
    .breath-scene{width:100%;padding:18px;border:3px solid #91b2bb;background:#39526b;transition:background .45s,color .45s}.breath-orb{font-size:40px;transition:transform 1s}.breathing-ready{background:#4d9871!important;color:#fff8d5!important;box-shadow:inset 0 0 0 5px #c3e28b}.breathing-ready .breath-orb{transform:scale(1.2)}.tone-buttons{display:flex;justify-content:center;gap:8px;margin:14px}.tone-hit{background:#86c7b4!important;color:#17243a!important}.album-book{max-width:650px}.album-card{text-align:center;padding:18px;border:2px solid #bd9474;background:#fff9e8;color:#283149}.album-card h3{color:#9b4e5b}.album-pet{display:block;width:120px;height:140px;margin:auto;image-rendering:pixelated}.album-stats{font-size:12px;line-height:1.8}.album-empty{padding:50px 18px;text-align:center;background:#fff9e8;color:#54637a}.diary-nav-btn:disabled{opacity:.45}
  </style>`);

  // Optional Supabase cloud persistence. LocalStorage remains the offline fallback.
  let cloud = null, cloudUserId = null, syncTimer = null;
  const cfg = window.PETIT_SUPABASE || {};
  if (cfg.url && cfg.anonKey && window.supabase?.createClient) {
    cloud = window.supabase.createClient(cfg.url, cfg.anonKey);
    (async () => {
      try {
        let { data: { session } } = await cloud.auth.getSession();
        if (!session) ({ data: { session } } = await cloud.auth.signInAnonymously());
        cloudUserId = session?.user?.id || null;
        if (!cloudUserId) return;
        const { data } = await cloud.from('petit_saves').select('state').eq('owner_id', cloudUserId).maybeSingle();
        if (data?.state && !state.species) { state = data.state; saveV2(); drawV2(); pmRefreshHud(); }
        window.pmLoadEndings = async () => { const { data: rows } = await cloud.from('petit_endings').select('ending').eq('owner_id', cloudUserId).order('created_at'); if (rows?.length) { const merged = [...readEndings(), ...rows.map(x => x.ending)]; const unique = [...new Map(merged.map(x => [x.id || JSON.stringify(x), x])).values()]; localStorage.setItem('petitMindEndings', JSON.stringify(unique)); } };
        window.pmSyncEndings = async () => { for (const ending of readEndings()) await cloud.from('petit_endings').upsert({ id: ending.id || (ending.id = (crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }))), owner_id: cloudUserId, ending }, { onConflict: 'id' }); };
        await window.pmLoadEndings();
        await window.pmSyncEndings();
      } catch (error) { console.warn('Cloud save unavailable; local save is active.', error); }
    })();
  }
  const baseSave = saveV2;
  saveV2 = function () {
    baseSave();
    if (!cloud || !cloudUserId) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try { await cloud.from('petit_saves').upsert({ owner_id: cloudUserId, state, updated_at: new Date().toISOString() }, { onConflict: 'owner_id' }); }
      catch (error) { console.warn('Cloud save failed; local save is safe.', error); }
    }, 400);
  };
  const clearCloudSave = async () => { if (cloud && cloudUserId) await cloud.from('petit_saves').delete().eq('owner_id', cloudUserId); };
  const resetGame = pmResetAll;
  pmResetAll = function () { resetGame(); clearCloudSave(); };
  const startAnother = pmResetForNextChild;
  pmResetForNextChild = function () { startAnother(); clearCloudSave(); };
})();

/* Procedural, original background music that follows the current game screen. */
(() => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  let audio = null, master = null, timer = null, step = 0, active = '', desiredScreen = 'main', unlocked = false;
  let enabled = localStorage.getItem('petitMindBgmEnabled') !== 'false';
  let volume = Math.min(1,Math.max(0,Number(localStorage.getItem('petitMindBgmVolume') ?? .75)));
  const presets = {
    main: { bpm: 82, wave: 'triangle', scale: [0,3,5,7,10,12,15,17], root: 261.63 },
    diary: { bpm: 66, wave: 'sine', scale: [0,2,5,7,9,12,14,17], root: 220 },
    ending: { bpm: 74, wave: 'triangle', scale: [0,4,5,7,11,12,16,17], root: 246.94 }
  };
  function getAudio() {
    if (!audio) { audio = new AudioCtx(); master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination); }
    return audio;
  }
  function hash(text) { let n=2166136261; for (const c of text) n=Math.imul(n^c.charCodeAt(0),16777619); return n>>>0; }
  function makePreset(key) {
    if (presets[key]) return presets[key];
    const seed=hash(key), roots=[196,220,246.94,261.63,293.66,329.63], scales=[[0,2,3,7,9,12,14,15],[0,2,4,7,9,12,14,16],[0,3,5,7,10,12,15,17],[0,2,5,7,9,12,14,17]];
    return { bpm:62+(seed%43), wave:['sine','triangle','sine','triangle'][seed%4], root:roots[(seed>>>5)%roots.length], scale:scales[(seed>>>9)%scales.length], seed };
  }
  function stopMusic() {
    active=''; if (timer) { clearInterval(timer); timer=null; }
    if (audio && master) { const now=audio.currentTime; master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(0,now,.07); }
  }
  function playNote(preset, index, key) {
    if (!audio || !master || audio.state!=='running' || !enabled) return;
    const p=preset, salt=p.seed||0, pattern=[0,2,4,3,5,4,2,1,0,3,5,6,4,2,1,3];
    let degree=(pattern[index%pattern.length]+((salt>>>((index%4)*3))&1))%p.scale.length;
    if (key==='diary') degree=(degree+2)%p.scale.length;
    const frequency=p.root*Math.pow(2,p.scale[degree]/12)*(index%8===4?.5:1);
    const osc=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime;
    osc.type=p.wave; osc.frequency.setValueAtTime(frequency,now);
    gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(.14,now+.045); gain.gain.exponentialRampToValueAtTime(.0001,now+.48);
    osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now+.45);
    if(index%4===0){const bass=audio.createOscillator(),pad=audio.createGain(),low=p.root*.5; bass.type='sine';bass.frequency.setValueAtTime(low,now);pad.gain.setValueAtTime(.0001,now);pad.gain.exponentialRampToValueAtTime(.055,now+.08);pad.gain.exponentialRampToValueAtTime(.0001,now+1.1);bass.connect(pad);pad.connect(master);bass.start(now);bass.stop(now+1.12)}
  }
  function setBgm(screen) {
    desiredScreen=screen||'silent';
    if (!enabled || !unlocked) { stopMusic(); return; }
    if (screen==='silent' || !screen) { stopMusic(); return; }
    if (screen===active && timer) { const now=audio.currentTime; master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime((screen.startsWith('game:')?.9:1)*volume,now,.08); return; }
    stopMusic(); const p=makePreset(screen); active=screen; step=0;
    const ctx=getAudio();
    const now=ctx.currentTime; master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime((screen.startsWith('game:')?.9:1)*volume,now,.13);
    const beat=60000/p.bpm;
    const firstNote=()=>{if(active===screen&&enabled&&unlocked)playNote(p,step++,screen)};
    if(ctx.state==='running')firstNote();else ctx.resume().then(firstNote).catch(()=>{});
    timer=setInterval(()=>playNote(p,step++,screen),beat);
  }
  function unlockBgm() {
    if (!enabled) return;
    unlocked=true; const ctx=getAudio();
    if(ctx.state==='suspended')ctx.resume().then(()=>setBgm(desiredScreen)).catch(()=>{});else setBgm(desiredScreen);
  }
  window.pmBgmSettings={get enabled(){return enabled},get volume(){return volume},setEnabled(value){enabled=!!value;localStorage.setItem('petitMindBgmEnabled',String(enabled));if(enabled){unlocked=true;setBgm(active||'main')}else stopMusic();return enabled},setVolume(value){volume=Math.min(1,Math.max(0,Number(value)||0));localStorage.setItem('petitMindBgmVolume',String(volume));if(active&&enabled&&unlocked)setBgm(active);return volume}};
  document.addEventListener('pointerdown',unlockBgm,{capture:true});
  document.addEventListener('keydown',unlockBgm,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&unlocked)unlockBgm()});
  const overlay=document.getElementById('overlay');
  document.addEventListener('click',event=>{
    const activity=event.target.closest?.('.activity[data-game]');
    if (!activity) return;
    const id=activity.dataset.game; overlay.dataset.game=id;
    if (state.energy>=7) setBgm(id==='soundmemory'?'silent':`game:${id}`);
  },true);
  const diaryObserver=new MutationObserver(()=>{
    const diaryOpen=[...document.querySelectorAll('.diary-overlay')].some(el=>el.classList.contains('show'));
    const gameOpen=overlay.classList.contains('show');
    if (diaryOpen) setBgm('diary');
    else if (gameOpen) {
      const game=overlay.dataset.game||'';
      setBgm(game==='soundmemory'?'silent':game==='career'?'ending':`game:${game||'menu'}`);
    } else setBgm('main');
  });
  diaryObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  const careerObserver=new MutationObserver(()=>{ if (overlay.classList.contains('show') && /직업|미래 직업/.test(document.getElementById('gameTitle').textContent)) { overlay.dataset.game='career'; setBgm('ending'); } });
  careerObserver.observe(document.getElementById('gameTitle'),{childList:true,characterData:true,subtree:true});
  const settingsButton=document.getElementById('rename'); if(settingsButton){settingsButton.textContent='⚙ 설정';settingsButton.setAttribute('aria-label','설정');}
  window.addEventListener('pagehide',stopMusic);
})();

/* Final interaction layer: profile selection, ordered unlocks and playable skill games. */
(() => {
  const profileStoreKey = 'petitMindProfilesV1';
  window.pmMouseSensitivity = Math.min(2.5,Math.max(.25,Number(localStorage.getItem('petitMindMouseSensitivity') || 1)));
  const readProfiles = () => { try { return JSON.parse(localStorage.getItem(profileStoreKey) || '{}'); } catch { return {}; } };
  let profiles = readProfiles(), activeProfile = null, activePlayerName = '', profileCloud = null, profileCloudUser = null, profileCloudMode = 'legacy', profileCloudTimer = null;
  saveV2 = function () {
    state.lastTick=Date.now();
    if (activeProfile) {
      const snapshot=JSON.parse(JSON.stringify(state));delete snapshot.__pmProfiles;
      profiles[activeProfile] = { playerName: activePlayerName, state:snapshot, updatedAt: Date.now() };
      localStorage.setItem(profileStoreKey, JSON.stringify(profiles));
      localStorage.setItem('petitMindSave',JSON.stringify(snapshot));
      if(profileCloud&&profileCloudUser){clearTimeout(profileCloudTimer);profileCloudTimer=setTimeout(async()=>{
        const updated_at=new Date().toISOString();let response;
        if(profileCloudMode==='profile') response=await profileCloud.from('petit_saves').upsert({owner_id:profileCloudUser,profile_id:activeProfile,state:snapshot,updated_at},{onConflict:'owner_id,profile_id'});
        else {
          const cloudProfiles=Object.fromEntries(Object.entries(profiles).map(([id,item])=>[id,{playerName:item.playerName,state:item.state,updatedAt:item.updatedAt}]));
          response=await profileCloud.from('petit_saves').upsert({owner_id:profileCloudUser,state:{...snapshot,__pmProfiles:cloudProfiles},updated_at},{onConflict:'owner_id'});
        }
        if(response?.error)console.info('Cloud profile save failed.',response.error);
      },350)}
    } else localStorage.setItem('petitMindSave',JSON.stringify(state));
  };
  const profileScreen = document.getElementById('titleScreen');
  if (profileScreen) {
    const legacy = (() => { try { return JSON.parse(localStorage.getItem('petitMindSave') || 'null'); } catch { return null; } })();
    profileScreen.querySelector('.title-box').innerHTML = '<canvas class="title-pet" width="24" height="28"></canvas><div class="title-mark">PETIT MIND<br>쁘띠의 성장일기</div><div class="title-caption">사용자 아이디와 이름을 입력하면 이전 이야기를 이어갈 수 있어요.</div><form id="profileForm" class="profile-form"><label>사용자 아이디<input id="playerId" maxlength="32" autocomplete="username" required placeholder="예: petit123"></label><label>사용자 이름<input id="playerName" maxlength="20" autocomplete="name" required placeholder="이름"></label><button class="title-btn" type="submit">▶ 시작하기</button></form><div class="title-hint">같은 브라우저에서 동일한 아이디로 이어하기</div>';
    paintPixelPet(profileScreen.querySelector('canvas'), '🐣', 0, null);
    profileScreen.querySelector('#profileForm').addEventListener('submit', async e => {
      e.preventDefault();
      const id = profileScreen.querySelector('#playerId').value.trim().toLocaleLowerCase();
      const player = profileScreen.querySelector('#playerName').value.trim();
      if (!id || !player) return;
      activeProfile = id; activePlayerName = player;
      profiles = readProfiles();
      const saved = profiles[id];
      if (saved?.state) state = saved.state;
      else if (legacy?.species && !Object.keys(profiles).length) state = legacy;
      else state = { name:'',species:null,kind:null,age:0,days:0,gameHours:0,lastTick:Date.now(),energy:50,stats:{int:0,virtue:0,social:0,body:0},logs:[],ending:null,unlockedGames:['patience'],unlockedThroughAge:0,lowCareHours:0,highCareHours:0,recommendationCount:0,lastReference:{} };
      state.playerId = id; state.playerName = player;
      localStorage.setItem('petitMindActiveProfile', id);
      try {
        const cfg = window.PETIT_SUPABASE || {};
        if (cfg.url && cfg.anonKey && window.supabase?.createClient) {
          const client = window.supabase.createClient(cfg.url, cfg.anonKey);
          let { data: { session } } = await client.auth.getSession();
          if (!session) ({ data: { session } } = await client.auth.signInAnonymously());
          const owner = session?.user?.id;
          if (owner) {
            profileCloud = client; profileCloudUser = owner;
            let remote=null;
            const byProfile=await client.from('petit_saves').select('state,updated_at').eq('owner_id',owner).eq('profile_id',id).maybeSingle();
            if(!byProfile.error){profileCloudMode='profile';remote=byProfile.data}
            else {
              profileCloudMode='legacy';
              const oldRow=await client.from('petit_saves').select('state,updated_at').eq('owner_id',owner).maybeSingle();
              if(oldRow.error)console.info('Cloud save table is unavailable; keeping local progress.',oldRow.error);else remote=oldRow.data;
            }
            if(remote?.state){
              const cloudMap=remote.state.__pmProfiles||{};
              for(const [cloudId,item] of Object.entries(cloudMap))if(!profiles[cloudId])profiles[cloudId]=item;
              const cloudProfile=cloudMap[id];
              let remoteState=cloudProfile?.state||null, remoteName=cloudProfile?.playerName||'';
              if(!remoteState&&remote.state.playerId===id){remoteState=remote.state;remoteName=remote.state.playerName||''}
              if(!remoteState&&!Object.keys(cloudMap).length&&!Object.keys(profiles).length&&remote.state.species){remoteState=remote.state;remoteName=remote.state.playerName||''}
              if(remoteState&&(!saved||Date.parse(remote.updated_at||0)>(saved.updatedAt||0))){state=remoteState;if(remoteName)state.playerName=remoteName}
            }
          }
        }
      } catch (error) { console.info('Cloud profile unavailable; using this browser save.', error); }
      const recordedName = saved?.playerName || state.playerName;
      if (recordedName && recordedName !== player) { toast('이 아이디에 저장된 이름과 일치하지 않아요.'); return; }
      state.playerId = id; state.playerName = player;
      profileScreen.remove();
      saveV2(); drawV2(); pmRefreshHud();
      if (!state.species) { pmAllowCancelSetup = false; setupPet(); }
    });
    const lastId = localStorage.getItem('petitMindActiveProfile');
    if (lastId && profiles[lastId]) { profileScreen.querySelector('#playerId').value = lastId; profileScreen.querySelector('#playerName').value = profiles[lastId].playerName || ''; }
  }

  // Restore the correct profile before subsequent saves, without deleting profile history on a new pet.
  pmResetForNextChild = function () {
    if(window.restTimer){clearInterval(window.restTimer);window.restTimer=null}
    pmAllowCancelSetup=false;window.careerModalOpen=false;
    document.getElementById('endingScreen')?.classList.remove('show');document.getElementById('deathScreen')?.classList.remove('show');document.getElementById('overlay').classList.remove('show');document.querySelector('.app').style.display='';
    state={name:'',species:null,kind:null,age:0,days:0,gameHours:0,lastTick:Date.now(),energy:50,stats:{int:0,virtue:0,social:0,body:0},logs:[],ending:null,unlockedGames:['patience'],unlockedThroughAge:0,lowCareHours:0,highCareHours:0,recommendationCount:0,lastReference:{},activityPlays:0,playsToday:0,activityUses:{},lastGameRuns:0,careerReady:false,occupation:null,unemployed:false,diaryMemo:'',playerId:activeProfile,playerName:activePlayerName};
    setupPet();
  };
  const priorSetupScreen = setupPet;
  setupPet = function () {
    priorSetupScreen();
    const cancel = document.getElementById('setupCancel');
    if (!pmAllowCancelSetup) cancel?.remove();
    const start = document.getElementById('closeGame'), priorClick = start.onclick;
    start.onclick = function (...args) { priorClick?.apply(this, args); if (state.species) document.getElementById('setupCancel')?.remove(); };
  };
  const resetButton = document.getElementById('reset');
  if (resetButton) resetButton.onclick = () => {
    if (!confirm('현재 쁘띠의 성장 기록을 초기화하고 새 쁘띠를 선택할까요? 사용자 아이디와 이름, 다른 아이디의 기록은 보존됩니다.')) return;
    pmAllowCancelSetup = true;
    state = { name:'',species:null,kind:null,age:0,days:0,gameHours:0,lastTick:Date.now(),energy:50,stats:{int:0,virtue:0,social:0,body:0},logs:[],ending:null,unlockedGames:['patience'],unlockedThroughAge:0,lowCareHours:0,highCareHours:0,recommendationCount:0,lastReference:{},activityPlays:0,playsToday:0,activityUses:{},lastGameRuns:0,careerReady:false,occupation:null,unemployed:false,diaryMemo:'',playerId:activeProfile,playerName:activePlayerName};
    saveV2(); document.querySelector('.app').style.display=''; document.getElementById('overlay').classList.remove('show'); document.getElementById('endingScreen')?.classList.remove('show'); document.getElementById('deathScreen')?.classList.remove('show'); setupPet();
  };

  const storyPacks = {
    mediate:[
      ['두 친구가 같은 공을 쓰고 싶어 해요.',['각자 원하는 시간을 말하고 순서를 정하자','한 친구에게 양보하라고 해','공을 숨겨서 다툼을 끝내']],
      ['모둠 발표 역할을 두고 의견이 갈렸어요.',['각자 잘하고 싶은 역할을 말한 뒤 나눠 보자','목소리가 큰 친구가 정하게 하자','발표를 취소하자']],
      ['친구가 농담을 듣고 속상해 보여요.',['어떤 점이 속상했는지 먼저 들어보자','예민하다고 말해','다른 친구에게 대신 해결해 달라 하자']],
      ['놀이 규칙을 서로 다르게 기억해요.',['각자 기억을 듣고 모두 동의할 규칙을 다시 정하자','내 기억이 맞다고 우겨','놀이를 그만두자']],
      ['단체 채팅에서 오해가 커지고 있어요.',['당사자에게 차분히 확인하고 말할 기회를 주자','모두에게 한쪽 편을 들라고 하자','대화를 캡처해 놀리자']],
      ['친구 둘이 함께 앉을 자리를 양보하지 않아요.',['서로 이유를 듣고 가능한 자리를 같이 찾아보자','한 명을 억지로 밀어내','모른 척 지나가자']]
    ],
    norms:[
      ['도서관에서 통화가 걸려 왔어요.',['밖으로 나가 조용히 통화한다','큰 소리로 바로 받는다','책상 위에 스피커폰을 켠다']],
      ['버스에 어르신이 서 계세요.',['괜찮으신지 여쭙고 자리를 안내한다','아무 말 없이 가방을 자리에 둔다','큰 소리로 자리를 비키라고 한다']],
      ['친구 집에 초대받았어요.',['인사하고 신발과 방문 예절을 확인한다','허락 없이 방을 뒤진다','음식만 먹고 인사 없이 간다']],
      ['급식 줄에 늦게 도착했어요.',['뒤에 차례대로 선다','친구 앞에 끼어든다','다른 줄을 밀어 바꾼다']],
      ['영화관에서 장면이 조용해졌어요.',['휴대전화 소리를 끄고 조용히 본다','큰 소리로 이야기를 한다','앞좌석을 발로 찬다']],
      ['공원에서 반려견이 다른 사람에게 다가가요.',['목줄을 잡고 상대가 괜찮은지 확인한다','반려견을 혼자 두고 간다','상대가 알아서 피하라 한다']]
    ],
    reframe:[
      ['발표에서 말을 조금 더듬었어요.',['다음에 더 편하게 말할 방법을 연습해 볼 수 있어','나는 항상 실패해','다시는 발표하지 않을래']],
      ['친구가 약속을 갑자기 취소했어요.',['무슨 일이 있었는지 확인하고 다른 날을 정해 보자','나를 싫어한다고 단정하자','친구에게 똑같이 복수하자']],
      ['시험 점수가 기대보다 낮았어요.',['어려웠던 부분을 찾아 다음 계획에 반영하자','나는 아무것도 못한다고 생각하자','시험지를 버리고 잊자']],
      ['그림 공모전에서 상을 받지 못했어요.',['내가 좋아하는 표현과 배운 점을 살펴보자','재능이 없다고 결론 내리자','다른 참가자를 탓하자']],
      ['운동 경기에서 실수했어요.',['팀과 다시 맞춰볼 연습을 정하자','팀이 진 건 전부 내 탓이라며 포기하자','팀원을 비난하자']],
      ['새 모임에서 먼저 말을 걸지 못했어요.',['다음에는 인사 한마디부터 시도해 보자','모두가 나를 싫어한다고 단정하자','다시는 모임에 가지 말자']]
    ],
    discovery:[
      ['종이비행기가 오른쪽으로만 휘어요.',['접는 날개 각도를 조금씩 바꿔 비교한다','더 세게 던지기만 반복한다','관찰 없이 종이를 버린다']],
      ['씨앗 두 개가 다른 속도로 자라요.',['물과 빛 조건을 기록해 비교한다','하나만 보고 결론 낸다','매일 화분을 바꾼다']],
      ['탑이 한쪽으로 자꾸 쓰러져요.',['밑면 넓이와 블록 위치를 바꿔 시험한다','더 높은 곳에 빨리 쌓는다','친구 탓을 한다']],
      ['종이 다리가 가운데서 내려앉아요.',['접는 모양을 달리해 무게를 다시 시험한다','종이를 더 구겨 던진다','시험을 멈춘다']],
      ['퍼즐의 마지막 조각이 맞지 않아요.',['색과 모서리 특징을 나눠 살펴본다','아무 곳에나 세게 누른다','정답을 바로 포기한다']],
      ['물에 뜨는 재료와 가라앉는 재료가 있어요.',['재료별 결과를 표로 적어 공통점을 찾아본다','한 번 본 결과로 모두 판단한다','기록을 지운다']]
    ],
    crisis:[
      ['복도에서 연기 냄새가 나요.',['안전한 곳으로 이동해 어른과 119에 알린다','연기를 따라가 원인을 찾는다','엘리베이터를 탄다']],
      ['친구가 넘어져 크게 아파해요.',['주변 어른을 부르고 움직이지 않게 돕는다','혼자 일으켜 세운다','사진부터 찍는다']],
      ['낯선 사람이 집 주소를 물어요.',['대답하지 않고 안전한 어른에게 알린다','주소를 자세히 알려준다','혼자 따라간다']],
      ['비상벨이 울리고 대피 안내가 나와요.',['안내를 따라 침착하게 대피한다','짐을 챙기러 되돌아간다','사람을 밀치며 뛴다']],
      ['길에서 다친 동물을 발견했어요.',['차도에서 떨어져 어른이나 구조기관에 알린다','맨손으로 급히 안아 든다','위험한 차도로 들어간다']],
      ['친구가 물에 빠져 도움을 요청해요.',['물에 뛰어들지 말고 어른과 구조대에 즉시 알린다','혼자 물에 뛰어든다','멀리서 구경한다']]
    ]
  };
  for (const [id, scenarios] of Object.entries(storyPacks)) gameStory[id] = scenarios.map(([q, options], i) => [q, options[0], options, i]);
  const originalStart = startGame;
  const openActivity = id => { const a = activities.find(x => x.id === id); if (!a || state.energy < 7) { if (a) toast('컨디션이 부족해요. 쉬어 주세요.'); return null; } openModal(a, ''); document.getElementById('closeGame').textContent='계속하기'; return a; };
  const finishChoice = (a, ok, text) => { finish(a, ok); document.getElementById('result').textContent = text; };
  function pixelFace(area, emotion) {
    const face = document.createElement('div'); face.className='pixel-face'; face.setAttribute('aria-label','픽셀 표정');
    const eyes = emotion === 'sad' ? '╲  ╱' : emotion === 'angry' ? '⌜  ⌝' : '●  ●';
    face.innerHTML=`<span class="face-hair">▟ ▄ ▄ ▙</span><b>${eyes}</b><i>${emotion==='happy'?'◡':emotion==='sad'?'︵':emotion==='surprised'?'○':'▰'}</i>`; area.append(face);
  }
  startGame = function (id) {
    const a = activities.find(x => x.id === id); if (!a) return originalStart(id);
    if (id === 'confidence') {
      const q = [['식물은 햇빛을 이용해 자랄 수 있어요.','맞다'],['모든 새는 날 수 있어요.','아니다'],['얼음은 물이 얼어 만들어져요.','맞다'],['물고기는 아가미로 숨을 쉬어요.','맞다'],['달은 스스로 빛을 내요.','아니다'],['모든 포유류는 알을 낳아요.','아니다'],['지구는 태양 주위를 돌아요.','맞다'],['거미는 곤충이에요.','아니다'],['소리는 진공에서 잘 전달돼요.','아니다'],['소금은 물에 녹을 수 있어요.','맞다'],['박쥐는 포유류예요.','맞다'],['번개가 친 뒤 천둥 소리가 들릴 수 있어요.','맞다']][Math.random()*12|0];
      const game=openActivity(id); if(!game)return; const area=document.getElementById('gameArea'); area.innerHTML=`<p>${q[0]}</p><div class="game-buttons"><button class="choice" data-v="맞다">맞다</button><button class="choice" data-v="아니다">아니다</button></div>`; area.querySelectorAll('button').forEach(b=>b.onclick=()=>finishChoice(game,b.dataset.v===q[1],b.dataset.v===q[1]?'생각을 확인했어요!':'답을 돌아보며 새로운 사실을 익혔어요.')); return;
    }
    if (storyPacks[id]) {
      const game=openActivity(id); if(!game)return; const scenes=storyPacks[id], entry=scenes[Math.random()*scenes.length|0], opts=entry[1].map((v,i)=>({v,i})).sort(()=>Math.random()-.5), area=document.getElementById('gameArea'); area.innerHTML=`<p>${entry[0]}</p><div class="game-buttons">${opts.map(x=>`<button class="choice" data-i="${x.i}">${x.v}</button>`).join('')}</div>`; area.querySelectorAll('button').forEach(b=>b.onclick=()=>finishChoice(game,+b.dataset.i===0,+b.dataset.i===0?'상대와 상황을 살피는 선택이에요.':'다른 관점도 생각해 보고 다시 시도해요.')); return;
    }
    if (id === 'balance') {
      const game=openActivity(id); if(!game)return; const area=document.getElementById('gameArea'); area.innerHTML='<p>← → 또는 마우스로 판을 기울여 공을 가운데에 3초 유지해요.</p><canvas id="balanceCanvas" width="420" height="210"></canvas><p id="balanceStatus">중앙에 공을 모아 보세요</p>';
      const c=area.querySelector('canvas'),ctx=c.getContext('2d'),status=area.querySelector('#balanceStatus'); let x=210,y=80,vx=0,vy=0,tilt=0,centered=0,last=performance.now(),done=false;
      const end=ok=>{if(done)return;done=true;finishChoice(game,ok,ok?'균형을 유지했어요!':'공이 판 밖으로 나갔어요. 다음에 다시 도전해요.')}; c.onpointermove=e=>{const r=c.getBoundingClientRect(),sensitivity=window.pmMouseSensitivity||1;tilt=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2*sensitivity))}; window.addEventListener('keydown',function key(e){if(done)return;if(['ArrowLeft','a','A'].includes(e.key))tilt=-1;if(['ArrowRight','d','D'].includes(e.key))tilt=1}); const frame=now=>{if(done)return;let dt=Math.min(.04,(now-last)/1000);last=now;vx+=tilt*130*dt;vx*=.985;vy+=45*dt; x+=vx*dt;y+=vy*dt;if(y>150){vy=-vy*.8;y=150}if(y<55){y=55;vy=Math.abs(vy)}centered=Math.abs(x-210)<24?centered+dt:0;ctx.clearRect(0,0,420,210);ctx.fillStyle='#324764';ctx.fillRect(35,60,350,110);ctx.strokeStyle='#f3d17b';ctx.lineWidth=4;ctx.strokeRect(35,60,350,110);ctx.fillStyle='#9bca91';ctx.fillRect(190,65,40,100);ctx.fillStyle='#ffd46f';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();status.textContent=centered>=3?'중앙을 지켰어요!':`가운데까지 ${Math.max(0,3-centered).toFixed(1)}초`;if(centered>=3)end(true);else if(x<40||x>380)end(false);else requestAnimationFrame(frame)};requestAnimationFrame(frame);return;
    }
    if (id === 'reaction') {
      const game=openActivity(id); if(!game)return; const area=document.getElementById('gameArea'); area.innerHTML='<p id="reactionText">검정/빨강일 때는 기다려요. 초록색이 되면 바로 클릭!</p><button id="reactionPad" class="reaction-pad">기다려요</button><p id="reactionCount">초록 신호를 놓치지 마세요</p>'; const pad=area.querySelector('#reactionPad'),label=area.querySelector('#reactionCount');let pulse=0,done=false,timer;const schedule=()=>{pad.classList.remove('green');pad.textContent=pulse%2?'🔴 기다려요':'⚫ 기다려요';timer=setTimeout(()=>{if(done)return;pulse++;pad.classList.add('green');pad.textContent='🟢 지금!';label.textContent='초록색일 때 클릭!';timer=setTimeout(()=>{pad.classList.remove('green');pad.textContent='놓쳤어요 · 다시 기다려요';label.textContent='3~5초 뒤 다시 초록색이 와요';if(pulse>=3){done=true;finishChoice(game,false,'신호를 놓쳤어요. 반응 연습을 완료했어요.')}else schedule()},320)} ,2200+Math.random()*2800)};pad.onclick=()=>{if(done)return;if(pad.classList.contains('green')){done=true;clearTimeout(timer);finishChoice(game,true,'초록 신호에 빠르게 반응했어요!')}else{label.textContent='아직 기다릴 때예요. 초록색 신호를 기다려요.'}};schedule();return;
    }
    if (id === 'sports') {
      const game=openActivity(id);if(!game)return;const area=document.getElementById('gameArea');area.innerHTML='<p>빈 동료를 클릭하거나 방향키로 골라 패스해요!</p><canvas id="soccerCanvas" width="420" height="270"></canvas><p id="passStatus">빈 동료에게 패스하기</p>';const c=area.querySelector('canvas'),ctx=c.getContext('2d');let target=Math.random()<.5?1:2,done=false;const players=[{x:210,y:205},{x:110,y:105},{x:310,y:105},{x:210,y:70}];const draw=()=>{ctx.fillStyle='#4b8b62';ctx.fillRect(0,0,420,270);ctx.strokeStyle='#d6efc9';ctx.lineWidth=3;ctx.strokeRect(10,10,400,250);ctx.strokeRect(150,10,120,35);ctx.fillStyle='#e8e4d3';ctx.fillRect(180,0,60,14);players.forEach((p,i)=>{ctx.fillStyle=i===0?'#e8d36e':i===3?'#d86c68':'#75c6d4';ctx.fillRect(p.x-9,p.y-12,18,24);ctx.fillStyle='#f0cba0';ctx.fillRect(p.x-6,p.y-22,12,10);ctx.fillStyle='#fff';ctx.fillRect(p.x-5,p.y+12,4,8);ctx.fillRect(p.x+2,p.y+12,4,8)});ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(210,180,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9d27a';ctx.fillRect(players[target].x-20,players[target].y-32,40,3)};draw();const pass=idx=>{if(done)return;done=true;ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(210,180);ctx.lineTo(players[idx].x,players[idx].y);ctx.stroke();area.querySelector('#passStatus').textContent=idx===target?'빈 동료에게 정확히 패스했어요!':'수비가 막았어요. 공간을 살펴봐요.';finishChoice(game,idx===target,idx===target?'팀 동료와 패스를 연결했어요!':'패스 경로를 다시 살펴봐요.')};c.onclick=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*420/r.width,y=(e.clientY-r.top)*270/r.height;let idx=players.slice(1).map((p,i)=>({i:i+1,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(idx&&idx.d<40)pass(idx.i)};window.addEventListener('keydown',e=>{if(['ArrowLeft','1'].includes(e.key))pass(1);if(['ArrowRight','2'].includes(e.key))pass(2);if(e.key==='ArrowUp')pass(3)});return;
    }
    if (id === 'face') {
      const game=openActivity(id);if(!game)return;const area=document.getElementById('gameArea'),emotions=['기쁨','슬픔','놀람','화남'],keys=['happy','sad','surprised','angry'],n=Math.random()*2|0;let answer;
      if(n===0){const scenarios=[['친구가 선물을 받고 눈을 반짝이며 웃어요.','기쁨'],['친구가 조용히 고개를 숙이고 눈물이 맺혔어요.','슬픔'],['갑자기 큰 풍선이 터져 눈이 커졌어요.','놀람'],['차례를 빼앗겨 눈썹을 찌푸리고 있어요.','화남']];const q=scenarios[Math.random()*scenarios.length|0];answer=q[1];area.innerHTML=`<p>${q[0]}</p>`}
      else{const i=Math.random()*4|0;answer=emotions[i];pixelFace(area,keys[i]);area.insertAdjacentHTML('beforeend','<p>픽셀 얼굴의 표정은 어떤 감정일까요?</p>')}
      const opts=[...emotions].sort(()=>Math.random()-.5);area.insertAdjacentHTML('beforeend','<div class="game-buttons">'+opts.map(x=>`<button class="choice">${x}</button>`).join('')+'</div>');area.querySelectorAll('button').forEach(b=>b.onclick=()=>finishChoice(game,b.textContent===answer,b.textContent===answer?'표정과 상황을 잘 살폈어요.':'표정은 여러 단서와 함께 살펴볼 수 있어요.'));return;
    }
    if (id === 'rhythm') {
      const game=openActivity(id);if(!game)return;const area=document.getElementById('gameArea'),dirs=['←','→','↑','↓'],expected=dirs[Math.random()*4|0];area.innerHTML=`<div class="rhythm-prompt">${expected}</div><p id="rhythmTimer">3.0초 안에 같은 방향을 눌러요</p><div class="game-buttons">${dirs.map(d=>`<button class="choice rhythm-key" data-d="${d}">${d}</button>`).join('')}</div>`;let left=3,done=false;const time=area.querySelector('#rhythmTimer'),t=setInterval(()=>{left-=.1;time.textContent=`${Math.max(0,left).toFixed(1)}초`;if(left<=0&&!done){done=true;clearInterval(t);time.textContent='시간 초과 · 실패했어요';time.classList.add('rhythm-fail');finishChoice(game,false,'3초 안에 선택하지 못했어요. 다음 리듬을 준비해요.')}},100);area.querySelectorAll('.rhythm-key').forEach(b=>b.onclick=()=>{if(done)return;done=true;clearInterval(t);finishChoice(game,b.dataset.d===expected,b.dataset.d===expected?'박자에 맞춰 움직였어요!':'방향이 달랐어요. 다음 리듬을 준비해요.')});return;
    }
    if (id === 'memory') {
      const old=originalStart; old(id); const area=document.getElementById('gameArea'); area.querySelectorAll('.choice').forEach(b=>{const click=b.onclick;b.onclick=function(...args){b.classList.add('memory-hit');return click?.apply(this,args)}}); return;
    }
    originalStart(id);
  };

  // Keep the list in unlock order and surface career choices under the growth diary at adulthood.
  const baseDraw=drawV2;
  drawV2=function(){baseDraw();const list=document.getElementById('activities');if(list&&state.unlockedGames){const ordered=state.unlockedGames.map(id=>list.querySelector(`[data-game="${id}"]`)).filter(Boolean);ordered.forEach(el=>list.append(el))}renderCareerSection()};
  function renderCareerSection(){let timeline=document.getElementById('timeline');if(!timeline)return;let box=document.getElementById('careerChoices');if(!box){box=document.createElement('div');box.id='careerChoices';timeline.after(box)}if(state.age<20||state.ending||state.dead){box.replaceChildren();return}const all=recommended(),list=all.slice(0,Math.max(2,all.length-1)),heading=document.createElement('h4');heading.textContent='스무 살의 직업 선택';const hint=document.createElement('p');hint.textContent='성장 기록과 다양한 능력의 조합을 바탕으로 제안해요. 원하는 미래를 직접 골라 보세요.';box.replaceChildren(heading,hint);const row=document.createElement('div');row.className='career-row';for(const item of list){const btn=document.createElement('button');btn.className='job-pick';btn.innerHTML=`<b>${item.job[1]} ${item.job[0]}</b><small>성장 기록에 어울리는 선택지</small>`;btn.onclick=()=>finishCareer(item.job);row.append(btn)}const unemployed=document.createElement('button');unemployed.className='job-pick';unemployed.innerHTML='<b>🧍 백수로 지내기</b><small>직업을 정하지 않고 지내요</small>';unemployed.onclick=()=>{state.occupation='백수';state.unemployed=true;saveV2();drawV2();toast('백수 상태로 지내기로 했어요.')};row.append(unemployed);box.append(row)}

  const baseCareerEnd=pmShowEnding;
  pmShowEnding=function(job){baseCareerEnd(job);const page=document.getElementById('endingScreen');if(!page)return;const actions=page.querySelector('.ending-actions');actions.innerHTML='<button id="raiseAnother" class="title-btn">처음부터 키우기</button><button id="finishGame" class="title-btn secondary">끝내기</button>';page.querySelector('#raiseAnother').onclick=pmResetForNextChild;page.querySelector('#finishGame').onclick=()=>{page.querySelector('.ending-copy').textContent+=' 함께해줘서 고마워요!';page.querySelector('.ending-actions').innerHTML='<span class="title-hint">이 이야기를 마쳤어요. 브라우저 창을 닫아도 됩니다.</span>'}};

  document.head.insertAdjacentHTML('beforeend',`<style>
  .profile-form{max-width:360px;margin:20px auto 0;display:grid;gap:12px;text-align:left}.profile-form label{font-size:12px;color:#d9e5de}.profile-form input{display:block;width:100%;margin-top:5px;padding:10px;border:2px solid #f1d27c;background:#fff1c9;color:#202d43}.profile-form .title-btn{width:100%;margin-top:5px}.careerChoices,#careerChoices{margin-top:14px;padding:12px;border:2px solid #7897af;background:#17243a;color:#f6edcf}.careerChoices h4,#careerChoices h4{margin:0 0 6px;color:#ffdc7b}.career-row{display:grid;gap:7px;margin-top:10px}.career-row .job-pick{background:#344e70;color:#fff2c6;border:2px solid #f0d27e;padding:9px;text-align:left}.career-row .job-pick small{display:block;margin-top:3px;color:#d1dddc}.pixel-face{width:90px;height:94px;margin:6px auto 14px;background:#e9bd8a;border:6px solid #59425a;box-shadow:inset 0 -15px #d99882;display:flex;flex-direction:column;align-items:center;justify-content:space-around;color:#2b3048;font:18px monospace;image-rendering:pixelated}.pixel-face .face-hair{position:absolute;transform:translateY(-38px);font-size:17px;color:#5c3f42}.pixel-face i{font-style:normal;font-size:22px}.memory-hit{background:#77b885!important;color:#14243a!important;transform:translateY(2px);box-shadow:inset 0 0 0 3px #d2f09c!important}.reaction-pad{width:190px;height:110px;border:5px solid #ecd17d;background:#222;color:#fff;font-size:22px;cursor:pointer}.reaction-pad.green{background:#1abc69;color:#092b1c;box-shadow:0 0 0 7px #b8f394,0 0 28px #32ff80}.rhythm-prompt{font-size:58px;color:#ffdc7b;text-shadow:4px 4px #253750}.rhythm-fail{color:#ff9a91;font-weight:bold}.modal-foot #closeGame{margin-left:auto}.modal-foot #setupCancel{margin-right:auto}
  </style>`);

  // Save id/name and current pet independently; changing the pet resets only its active progress.
  if (activeProfile && state) { state.playerId=activeProfile; state.playerName=activePlayerName; }
  window.pmUpdateSettingsProfile = function (profileId, playerName, petName, species) {
    const id=String(profileId||'').trim().toLocaleLowerCase(), user=String(playerName||'').trim(), name=String(petName||'').trim().slice(0,12);
    if(!id||!user||!name||!petChoices.some(x=>x[0]===species)) return {ok:false,message:'아이디, 이름, 쁘띠 이름과 스킨을 모두 입력해 주세요.'};
    if(id!==activeProfile&&profiles[id]) return {ok:false,message:'이미 사용 중인 아이디예요. 다른 아이디를 입력해 주세요.'};
    activeProfile=id;activePlayerName=user;state.playerId=id;state.playerName=user;state.name=name;state.species=species;state.kind=petChoices.find(x=>x[0]===species)?.[1]||'쁘띠';
    saveV2();drawV2();refreshPixelScene();pmRefreshHud();
    return {ok:true};
  };
})();

(() => {
  const settings=document.createElement('section');settings.id='settingsScreen';settings.className='settings-overlay';
  settings.innerHTML='<div class="settings-card"><div class="settings-header"><h2>게임 설정</h2><button type="button" class="diary-close" id="settingsClose">닫기 ✕</button></div><form id="settingsForm"><label class="setting-range">소리 크기 <output id="volumeValue"></output><input id="volumeSetting" type="range" min="0" max="100" step="1"></label><label class="setting-toggle"><span>BGM</span><input id="bgmSetting" type="checkbox"><b>BGM 켜짐</b></label><label class="setting-range">마우스 감도 <output id="sensitivityValue"></output><input id="sensitivitySetting" type="range" min="25" max="250" step="5"></label><hr><label>사용자 아이디<input id="settingPlayerId" maxlength="32" required></label><label>사용자 이름<input id="settingPlayerName" maxlength="20" required></label><label>쁘띠 이름<input id="settingPetName" maxlength="12" required></label><label>쁘띠 스킨<select id="settingSpecies"></select></label><div class="settings-actions"><button type="button" class="diary-close" id="settingsCancel">취소</button><button class="title-btn" type="submit">변경 저장</button></div></form></div>';
  document.body.append(settings);
  const speciesSelect=settings.querySelector('#settingSpecies');
  speciesSelect.innerHTML=petChoices.map(([icon,label])=>`<option value="${icon}">${icon} ${label}</option>`).join('');
  const inputs={volume:settings.querySelector('#volumeSetting'),volumeText:settings.querySelector('#volumeValue'),bgm:settings.querySelector('#bgmSetting'),sensitivity:settings.querySelector('#sensitivitySetting'),sensitivityText:settings.querySelector('#sensitivityValue')};
  let snapshot=null;
  const updateValues=()=>{inputs.volumeText.value=inputs.volume.value+'%';inputs.sensitivityText.value=(Number(inputs.sensitivity.value)/100).toFixed(2)+'×';settings.querySelector('.setting-toggle b').textContent=inputs.bgm.checked?'BGM 켜짐':'BGM 꺼짐'};
  function open(){
    const audio=window.pmBgmSettings;
    snapshot={volume:audio?.volume??Number(localStorage.getItem('petitMindBgmVolume')||.45),enabled:audio?.enabled??localStorage.getItem('petitMindBgmEnabled')!=='false',sensitivity:window.pmMouseSensitivity||1};
    inputs.volume.value=Math.round(snapshot.volume*100);inputs.bgm.checked=snapshot.enabled;inputs.sensitivity.value=Math.round(snapshot.sensitivity*100);
    settings.querySelector('#settingPlayerId').value=state.playerId||localStorage.getItem('petitMindActiveProfile')||'';
    settings.querySelector('#settingPlayerName').value=state.playerName||'';settings.querySelector('#settingPetName').value=state.name||'';speciesSelect.value=state.species||petChoices[0][0];updateValues();settings.classList.add('show');
  }
  function close(restore){if(restore&&snapshot){window.pmBgmSettings?.setVolume(snapshot.volume);window.pmBgmSettings?.setEnabled(snapshot.enabled);localStorage.setItem('petitMindBgmVolume',String(snapshot.volume));localStorage.setItem('petitMindBgmEnabled',String(snapshot.enabled));window.pmMouseSensitivity=snapshot.sensitivity;localStorage.setItem('petitMindMouseSensitivity',String(snapshot.sensitivity))}settings.classList.remove('show')}
  inputs.volume.oninput=()=>{updateValues();const v=Number(inputs.volume.value)/100;localStorage.setItem('petitMindBgmVolume',String(v));window.pmBgmSettings?.setVolume(v)};
  inputs.bgm.onchange=()=>{updateValues();localStorage.setItem('petitMindBgmEnabled',String(inputs.bgm.checked));window.pmBgmSettings?.setEnabled(inputs.bgm.checked)};
  inputs.sensitivity.oninput=()=>{window.pmMouseSensitivity=Number(inputs.sensitivity.value)/100;localStorage.setItem('petitMindMouseSensitivity',String(window.pmMouseSensitivity));updateValues()};
  settings.querySelector('#settingsClose').onclick=()=>close(true);settings.querySelector('#settingsCancel').onclick=()=>close(true);settings.onclick=e=>{if(e.target===settings)close(true)};
  settings.querySelector('#settingsForm').onsubmit=e=>{e.preventDefault();const result=window.pmUpdateSettingsProfile(settings.querySelector('#settingPlayerId').value,settings.querySelector('#settingPlayerName').value,settings.querySelector('#settingPetName').value,speciesSelect.value);if(!result.ok){toast(result.message);return}localStorage.setItem('petitMindActiveProfile',String(settings.querySelector('#settingPlayerId').value).trim().toLocaleLowerCase());close(false);toast('설정을 저장했어요.')};
  document.getElementById('rename')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);
  document.head.insertAdjacentHTML('beforeend','<style>.settings-overlay{position:fixed;inset:0;z-index:100;display:none;place-items:center;padding:18px;background:#080d1be8;color:#ffedc5}.settings-overlay.show{display:grid}.settings-card{width:min(560px,100%);max-height:92vh;overflow:auto;padding:22px;border:5px solid #f0d27e;box-shadow:7px 7px #080d18,0 0 0 4px #465e7d;background:linear-gradient(#293c5b,#18253d)}.settings-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.settings-header h2{margin:0;font:13px \'Press Start 2P\',Consolas,monospace;color:#ffdc75;line-height:1.8}.settings-card form{display:grid;gap:12px}.settings-card form>label{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;font-size:13px;color:#e3e8d8}.settings-card input:not([type=range]):not([type=checkbox]),.settings-card select{grid-column:1/-1;width:100%;padding:9px;border:2px solid #91b2bb;background:#fff2ce;color:#26364d}.settings-card input[type=range]{grid-column:1/-1;width:100%;accent-color:#e6c568}.settings-card output{color:#ffdc75}.setting-toggle{display:flex!important;align-items:center;gap:10px}.setting-toggle span{margin-right:auto}.setting-toggle input{width:18px;height:18px;accent-color:#86c7b4}.settings-card hr{width:100%;border:0;border-top:2px dashed #7897af;margin:4px 0}.settings-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}.settings-actions .title-btn{padding:10px 14px}@media(max-width:520px){.settings-card{padding:16px}.settings-header h2{font-size:10px}}</style>');
})();
