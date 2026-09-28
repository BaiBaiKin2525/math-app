// むしの おへやの かんたん ひょうじ（2D）。3D が つかえない ふるい タブレット よう。
// pet3d.js の createInsectRoom と おなじ つかいかた（setCase / setPets / select / dispose）。

const FLAT_ICONS = {
  ant: '🐜', dango: '🪨', kanabun: '🪲', kokuwa: '🪲', nokogiri: '🪲', kabuto: '🪲', miyama: '🪲', ookuwa: '🪲',
};
const FLAT_DECOR = { perch: '🌿', slide: '🛝', swing: '🎠', house: '🍄' };

function createFlatRoom(container, { onSelect, reason }) {
  const root = document.createElement('div');
  root.className = 'flat-room';
  root.innerHTML = `
    <div class="flat-air"><div class="flat-decor"></div></div>
    <div class="flat-soil"></div>
    <div class="flat-reason">かんたん ひょうじ（3D が つかえない タブレット）${reason ? `<small>${reason}</small>` : ''}</div>`;
  container.appendChild(root);
  const air = root.querySelector('.flat-air');
  const soil = root.querySelector('.flat-soil');
  const items = new Map();
  let selected = null;

  // あるく むしは ときどき ちがう ばしょへ うごく
  const move = (el) => {
    el.style.left = `${5 + Math.random() * 85}%`;
    el.style.top = `${25 + Math.random() * 60}%`;
    el.classList.toggle('flip', Math.random() < 0.5);
  };
  const timer = setInterval(() => {
    for (const el of items.values()) if (el.dataset.walk === '1' && Math.random() < 0.6) move(el);
  }, 2500);

  function setCase(_dims, decor = []) {
    root.querySelector('.flat-decor').innerHTML = decor.map((d) => `<span>${FLAT_DECOR[d.type] || ''}</span>`).join('');
  }

  function setPets(list) {
    for (const el of items.values()) el.remove();
    items.clear();
    for (const p of list) {
      const el = document.createElement('button');
      el.className = `flat-bug ${p.stage}${p.sleeping ? ' sleeping' : ''}${p.weak ? ' weak' : ''}`;
      el.style.fontSize = `${Math.round(18 + p.lengthCm * 5)}px`;
      el.textContent = p.stage === 'larva' ? '🐛' : p.stage === 'pupa' ? '🥜' : FLAT_ICONS[p.species] || '🐞';
      el.addEventListener('click', () => {
        select(p.id);
        onSelect(p.id);
      });
      const under = p.stage !== 'adult' || p.sleeping;
      el.dataset.walk = under ? '0' : '1';
      if (under) {
        el.style.left = `${5 + Math.random() * 85}%`;
        el.style.top = `${20 + Math.random() * 55}%`;
        soil.appendChild(el);
      } else {
        move(el);
        air.appendChild(el);
      }
      items.set(p.id, el);
    }
    select(selected);
  }

  function select(id) {
    selected = id;
    for (const [k, el] of items) el.classList.toggle('selected', k === id);
  }

  function dispose() {
    clearInterval(timer);
    root.remove();
  }

  return { setCase, setPets, select, dispose };
}
