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
      const play = async (tone, delay = 0) => { await ctx.resume(); setTimeout(() => { const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.value = freqs[tone]; osc.type = 'sine'; gain.gain.setValueAtTime(.001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.18, ctx.currentTime + .025); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .32); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .34); }, delay); };
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
