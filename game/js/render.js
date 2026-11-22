// render.js — draws Ember Court's table into the DOM and animates it.
// Cards slide in on the deal, played cards flip into the middle, damage
// numbers float up and ember particles burst. No game logic lives here.

import { HOUSES } from './cards.js';

const $ = (sel) => document.querySelector(sel);

function cardStat(card) {
  if (card.house === 'ash') return { label: 'SHIELD', value: card.power };
  if (card.house === 'flame' || card.house === 'coal') return { label: 'DMG', value: card.power };
  if (card.id === 'sparkle') return { label: 'DRAW', value: 1 };
  if (card.id === 'bright-idea' || card.id === 'storm-cell') return { label: 'DRAW', value: 2 };
  return { label: 'DMG', value: card.power };
}

export function buildCardElement(card, index, opts = {}) {
  const house = HOUSES[card.house];
  const stat = cardStat(card);
  const el = document.createElement('div');
  el.className = `card house-${card.house}`;
  if (opts.faceDown) el.classList.add('face-down');
  if (opts.playable) el.classList.add('playable');
  if (opts.unaffordable) el.classList.add('unaffordable');
  if (opts.dealt) {
    el.classList.add('dealt');
    el.style.animationDelay = `${(index || 0) * 70}ms`;
  }
  el.dataset.index = String(index);
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute(
    'aria-label',
    `${card.name}, ${house.name}, cost ${card.cost}, ${stat.label} ${stat.value}. ${card.text}`,
  );
  el.innerHTML =
    `<span class="cost" title="Energy cost">${card.cost}</span>` +
    `<span class="house-mark" title="${house.name}">${house.shape}</span>` +
    `<span class="card-name">${card.name}</span>` +
    `<span class="power">${stat.value}</span>` +
    `<span class="power-label">${stat.label}</span>` +
    `<span class="card-text">${card.text}</span>` +
    `<span class="house-name">${house.name}</span>`;
  return el;
}

export function buildCardBackElement(index) {
  const el = document.createElement('div');
  el.className = 'card card-back dealt';
  el.style.animationDelay = `${index * 70}ms`;
  el.innerHTML = '<span class="back-mark">▲</span><span class="back-name">EMBER COURT</span>';
  return el;
}

export function renderLife(state) {
  $('#player-ember').textContent = String(state.player.ember);
  $('#rival-ember').textContent = String(state.rival.ember);
  const pShield = $('#player-shield');
  const rShield = $('#rival-shield');
  pShield.textContent = state.player.shield > 0 ? `● Shield ${state.player.shield}` : '';
  rShield.textContent = state.rival.shield > 0 ? `● Shield ${state.rival.shield}` : '';
  $('#player-ember').parentElement.classList.toggle('low', state.player.ember <= 5);
  $('#rival-ember').parentElement.classList.toggle('low', state.rival.ember <= 5);
}

export function renderEnergy(state) {
  const pips = $('#energy-pips');
  pips.innerHTML = '';
  for (let i = 0; i < state.energyMax; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip' + (i < state.energy ? ' lit' : '');
    pip.textContent = '●';
    pips.appendChild(pip);
  }
  const label = document.createElement('span');
  label.className = 'energy-label';
  label.textContent = `Energy ${state.energy}/${state.energyMax}`;
  pips.appendChild(label);
}

export function renderHands(state, opts = {}) {
  const playerHand = $('#player-hand');
  playerHand.innerHTML = '';
  state.player.hand.forEach((card, i) => {
    const affordable = state.phase === 'play' && !opts.locked && card.cost <= state.energy;
    playerHand.appendChild(
      buildCardElement(card, i, {
        playable: affordable,
        unaffordable: state.phase === 'play' && !opts.locked && card.cost > state.energy,
        dealt: opts.dealt,
      }),
    );
  });
  const rivalHand = $('#rival-hand');
  rivalHand.innerHTML = '';
  state.rival.hand.forEach((_, i) => rivalHand.appendChild(buildCardBackElement(i)));
  const count = document.createElement('span');
  count.className = 'hand-count';
  count.textContent = `${state.rival.hand.length} cards`;
  rivalHand.appendChild(count);
}

export function renderTopbar(state) {
  $('#turn-info').textContent = state.phase === 'title' ? 'Ready to duel' : `Turn ${state.turn}`;
  $('#score-info').textContent =
    `Damage dealt ${state.player.damageDealt} · Cards played ${state.player.cardsPlayed} · ` +
    `Deck ${state.player.deck.length}`;
}

export function renderLog(state) {
  const log = $('#log');
  log.innerHTML = '';
  const tail = state.log.slice(-6);
  for (const line of tail) {
    const div = document.createElement('div');
    div.className = 'log-line';
    div.textContent = line;
    log.appendChild(div);
  }
  log.scrollTop = log.scrollHeight;
}

export function renderPlayed(state) {
  const area = $('#played-area');
  area.innerHTML = '';
  const ev = state.lastPlay;
  if (!ev) {
    const hint = document.createElement('div');
    hint.className = 'played-hint';
    hint.textContent = state.phase === 'play' ? 'Play a card — click it or press 1–5.' : '';
    area.appendChild(hint);
    return;
  }
  const who = document.createElement('div');
  who.className = 'played-who';
  who.textContent = ev.by === 'player' ? 'You played' : 'The Magistrate played';
  area.appendChild(who);
  const card = buildCardElement(ev.card, 0, {});
  card.classList.add('played-card');
  area.appendChild(card);
  if (ev.notes.length) {
    const note = document.createElement('div');
    note.className = 'played-note';
    note.textContent = ev.notes.join(' · ');
    area.appendChild(note);
  }
}

export function renderIntent(state) {
  const el = $('#ai-intent');
  el.textContent = state.aiThinking ? state.aiIntent : '';
  el.classList.toggle('thinking', state.aiThinking);
}

export function spawnDamageNumber(targetId, text, kind) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const floater = document.createElement('span');
  floater.className = `floater ${kind}`;
  floater.textContent = text;
  const rect = target.getBoundingClientRect();
  const layer = $('#fx-layer');
  const layerRect = layer.getBoundingClientRect();
  floater.style.left = `${rect.left - layerRect.left + rect.width / 2}px`;
  floater.style.top = `${rect.top - layerRect.top}px`;
  layer.appendChild(floater);
  window.setTimeout(() => floater.remove(), 1400);
}

export function spawnEmberParticles(targetId, count, color) {
  const target = document.getElementById(targetId);
  const layer = $('#fx-layer');
  if (!target || !layer) return;
  const rect = target.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'ember-particle';
    p.style.background = color;
    p.style.left = `${rect.left - layerRect.left + Math.random() * rect.width}px`;
    p.style.top = `${rect.top - layerRect.top + Math.random() * rect.height * 0.4}px`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    p.style.setProperty('--dy', `${-40 - Math.random() * 90}px`);
    layer.appendChild(p);
    window.setTimeout(() => p.remove(), 1100);
  }
}

export function renderAll(state, opts = {}) {
  renderTopbar(state);
  renderLife(state);
  renderEnergy(state);
  renderHands(state, opts);
  renderLog(state);
  renderPlayed(state);
  renderIntent(state);
  const endBtn = $('#end-turn-btn');
  endBtn.disabled = state.phase !== 'play' || opts.locked;
  $('#screen-title').classList.toggle('hidden', state.phase !== 'title');
  const end = $('#screen-end');
  if (state.phase === 'won' || state.phase === 'lost') {
    end.classList.remove('hidden');
    $('#end-title').textContent = state.phase === 'won' ? 'YOU TAKE THE COURT' : 'THE COURT KEEPS YOU OUT';
    $('#end-title').className = state.phase === 'won' ? 'end-title win' : 'end-title lose';
    $('#end-sub').textContent =
      state.phase === 'won'
        ? 'The Cinder Magistrate burns out. Your embers rule Ember Court.'
        : 'Your embers fade to ash. The Cinder Magistrate keeps the throne.';
    $('#end-stats').textContent =
      `Turns ${state.turn} · Damage dealt ${state.player.damageDealt} · ` +
      `Cards played ${state.player.cardsPlayed} · Rival ember left ${state.rival.ember}`;
  } else {
    end.classList.add('hidden');
  }
  const status = $('#status');
  if (state.phase === 'won') status.textContent = 'You win. The Cinder Magistrate burns out.';
  else if (state.phase === 'lost') status.textContent = 'You lose. Your embers fade.';
  else if (state.phase === 'play') status.textContent = `Turn ${state.turn}. Your energy ${state.energy} of ${state.energyMax}.`;
  else status.textContent = 'Ember Court title screen. Press Enter to start the duel.';
}
