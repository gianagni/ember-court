// main.js — bootstrap, input and the AI turn driver for Ember Court.
// Reads ?shot=title|table|win|loss&seed=N for deterministic screenshot states.
// Keyboard: 1-5 play a hand card, Enter/Space ends the turn, Enter starts/restarts.

import { createGame, startDuel, playCard, beginPlayerTurn, endPlayerTurn, presetState, drawUpTo, MAX_HAND } from './game.js';
import { chooseRivalCard, rivalIntentText, rivalEnergyForTurn } from './ai.js';
import { renderAll, spawnDamageNumber, spawnEmberParticles } from './render.js';
import {
  unlockAudio, soundPlayCard, soundDamage, soundShield, soundDraw,
  soundEndTurn, soundWin, soundLose, soundClick, setMuted, isMuted,
} from './audio.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '7') || 7;

let state = shot ? presetState(shot, seed) : createGame((Math.random() * 1e9) | 0);
let locked = false; // true while the Magistrate takes its turn

function applyPlayEvent(ev) {
  if (!ev) return;
  const targetId = ev.by === 'player' ? 'rival-panel' : 'player-panel';
  if (ev.damage > 0) {
    soundDamage();
    spawnDamageNumber(targetId, `-${ev.damage}`, 'damage');
    spawnEmberParticles(targetId, 14, ev.card.house === 'coal' ? '#a78bfa' : '#ff6b4a');
  } else if (ev.shieldGain > 0) {
    soundShield();
    spawnDamageNumber(ev.by === 'player' ? 'player-panel' : 'rival-panel', `+${ev.shieldGain} shield`, 'shield');
  } else {
    soundPlayCard();
  }
  if (ev.drew > 0) soundDraw();
}

function afterPlay() {
  renderAll(state, { locked });
  if (state.phase === 'won') soundWin();
  if (state.phase === 'lost') soundLose();
}

function onPlayerCard(index) {
  if (locked || state.phase !== 'play') return;
  const ev = playCard(state, 'player', index);
  if (!ev) return;
  applyPlayEvent(ev);
  afterPlay();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// The Magistrate's turn: think aloud, flip its cards face-up one by one,
// then hand the table back to the player.
async function runRivalTurn() {
  locked = true;
  state.aiThinking = true;
  drawUpTo(state.rival, MAX_HAND, state.rng);
  let energy = rivalEnergyForTurn(state.turn);
  state.rivalFlameThisTurn = 0;
  renderAll(state, { locked });
  await sleep(700);
  for (let plays = 0; plays < 3; plays++) {
    if (state.phase !== 'play') break;
    const card = chooseRivalCard(state, energy);
    if (!card) break;
    state.aiIntent = rivalIntentText(state, card);
    renderAll(state, { locked });
    await sleep(850);
    const idx = state.rival.hand.indexOf(card);
    if (idx === -1) break;
    energy -= card.cost;
    const ev = playCard(state, 'rival', idx);
    state.aiThinking = false;
    state.aiIntent = '';
    if (ev) applyPlayEvent(ev);
    renderAll(state, { locked });
    await sleep(750);
    if (state.phase !== 'play') break;
    state.aiThinking = true;
  }
  state.aiThinking = false;
  state.aiIntent = '';
  if (state.phase === 'play') {
    beginPlayerTurn(state);
    state.log.push('Your turn. Play your cards.');
  }
  locked = false;
  afterPlay();
}

async function onEndTurn() {
  if (locked || state.phase !== 'play') return;
  soundEndTurn();
  endPlayerTurn(state);
  renderAll(state, { locked: true });
  await runRivalTurn();
}

function startDuelFromTitle() {
  unlockAudio();
  soundClick();
  state = createGame((Math.random() * 1e9) | 0);
  startDuel(state);
  renderAll(state, { dealt: true });
}

function wireInput() {
  document.getElementById('player-hand').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    unlockAudio();
    onPlayerCard(Number(card.dataset.index));
  });
  document.getElementById('player-hand').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    unlockAudio();
    onPlayerCard(Number(card.dataset.index));
  });
  document.getElementById('end-turn-btn').addEventListener('click', () => {
    unlockAudio();
    void onEndTurn();
  });
  document.getElementById('start-btn').addEventListener('click', startDuelFromTitle);
  document.getElementById('again-btn').addEventListener('click', startDuelFromTitle);
  document.getElementById('mute-btn').addEventListener('click', () => {
    setMuted(!isMuted());
    document.getElementById('mute-btn').textContent = isMuted() ? 'Sound: off' : 'Sound: on';
  });
  document.addEventListener('keydown', (e) => {
    if (state.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      startDuelFromTitle();
      return;
    }
    if ((state.phase === 'won' || state.phase === 'lost') && e.key === 'Enter') {
      e.preventDefault();
      startDuelFromTitle();
      return;
    }
    if (state.phase !== 'play' || locked) return;
    if (e.key >= '1' && e.key <= '5') {
      unlockAudio();
      onPlayerCard(Number(e.key) - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      unlockAudio();
      void onEndTurn();
    }
  });
  document.addEventListener('pointerdown', unlockAudio, { once: true });
}

wireInput();
renderAll(state, { dealt: Boolean(shot) });
