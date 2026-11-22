// game.js — the rules and state machine of Ember Court.
// Pure logic: no DOM, no timers. The state it owns is plain data, so a seeded
// state can be rebuilt exactly for screenshots and tests.

import { buildDeck, cardById } from './cards.js';

export const MAX_EMBER = 20; // life total for each side
export const MAX_HAND = 5;
export const MAX_ENERGY = 6;

export function createRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSide(rng) {
  return {
    ember: MAX_EMBER,
    shield: 0,
    deck: buildDeck(rng),
    hand: [],
    discard: [],
    damageDealt: 0,
    cardsPlayed: 0,
  };
}

export function createGame(seed) {
  const rng = createRng(seed);
  const state = {
    seed,
    rng,
    phase: 'title', // title | play | won | lost
    turn: 0,
    energyMax: 2,
    energy: 2,
    player: newSide(rng),
    rival: newSide(rng),
    flamePlayedThisTurn: 0,
    rivalFlameThisTurn: 0,
    log: [],
    lastPlay: null, // { by: 'player' | 'rival', card, damage, shield, note }
    aiThinking: false,
    aiIntent: '',
    winner: null,
  };
  return state;
}

export function drawUpTo(side, n, rng) {
  while (side.hand.length < n) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = side.discard;
      side.discard = [];
      for (let i = side.deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [side.deck[i], side.deck[j]] = [side.deck[j], side.deck[i]];
      }
    }
    side.hand.push(side.deck.pop());
  }
}

export function startDuel(state) {
  state.phase = 'play';
  state.turn = 1;
  state.energyMax = 2;
  state.energy = 2;
  state.log = ['The duel begins. The Cinder Magistrate waits across the table.'];
  drawUpTo(state.player, MAX_HAND, state.rng);
  drawUpTo(state.rival, MAX_HAND, state.rng);
  state.log.push('You draw 5 cards. Your embers burn at 2 energy.');
}

// Apply one card. Returns an event describing what happened, or null if illegal.
export function playCard(state, sideName, handIndex) {
  if (state.phase !== 'play') return null;
  const side = state[sideName];
  const foe = sideName === 'player' ? state.rival : state.player;
  const card = side.hand[handIndex];
  if (!card) return null;
  if (sideName === 'player' && card.cost > state.energy) return null;

  side.hand.splice(handIndex, 1);
  side.discard.push(card);
  side.cardsPlayed += 1;

  let damage = 0;
  let shieldGain = 0;
  let drew = 0;
  let refund = 0;
  const notes = [];

  if (card.house === 'flame') {
    damage = card.power;
    const key = sideName === 'player' ? 'flamePlayedThisTurn' : 'rivalFlameThisTurn';
    state[key] = (state[key] || 0) + 1;
    if (state[key] === 2) {
      damage += 2;
      notes.push('Twin Flame! +2 damage');
    }
  } else if (card.house === 'ash') {
    shieldGain = card.power;
    notes.push('Shield carries to next turn');
  } else if (card.house === 'coal') {
    damage = card.power;
    notes.push('Pierces shield');
  } else if (card.house === 'spark') {
    refund = card.id === 'lightning-court' ? 2 : 1;
    if (card.id === 'sparkle' || card.id === 'bright-idea' || card.id === 'storm-cell' || card.id === 'static-snap') {
      drew = card.id === 'bright-idea' || card.id === 'storm-cell' ? 2 : 1;
    }
    if (card.id === 'static-snap' || card.id === 'golden-arc' || card.id === 'lightning-court') {
      damage = card.power;
    }
    notes.push(`Refunds ${refund} energy`);
  }

  // Card-specific extras (Ashfall deals 1, Furnace Slam and Soot Shroud draw 1).
  if (card.id === 'ashfall') damage = 1;
  if (card.id === 'soot-shroud' || card.id === 'furnace-slam') drew = 1;

  if (sideName === 'player') {
    state.energy -= card.cost;
    state.energy = Math.min(state.energy + refund, MAX_ENERGY);
  }

  if (shieldGain > 0) side.shield += shieldGain;

  let dealt = 0;
  if (damage > 0) {
    if (card.house === 'coal') {
      dealt = damage; // pierces: shield untouched
    } else if (foe.shield > 0) {
      const absorbed = Math.min(foe.shield, damage);
      foe.shield -= absorbed;
      dealt = damage - absorbed;
      if (absorbed > 0) notes.push(`${absorbed} absorbed by shield`);
    } else {
      dealt = damage;
    }
    foe.ember -= dealt;
    side.damageDealt += dealt;
  }

  if (drew > 0) {
    const before = side.hand.length;
    drawUpTo(side, before + drew, state.rng);
  }

  const event = {
    by: sideName,
    card,
    damage: dealt,
    shieldGain,
    drew,
    refund,
    notes,
    foeEmber: foe.ember,
    foeShield: foe.shield,
  };
  state.lastPlay = event;
  const who = sideName === 'player' ? 'You play' : 'The Magistrate plays';
  const bits = [];
  if (dealt > 0) bits.push(`deals ${dealt} damage`);
  if (shieldGain > 0) bits.push(`gains ${shieldGain} shield`);
  if (drew > 0) bits.push(`draws ${drew}`);
  state.log.push(`${who} ${card.name} — ${bits.join(', ') || 'a quiet card'}.`);
  if (notes.length) state.log.push(`  ${notes.join('. ')}.`);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);

  checkEnd(state);
  return event;
}

export function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.rival.ember <= 0) {
    state.rival.ember = 0;
    state.phase = 'won';
    state.winner = 'player';
    state.log.push('The Cinder Magistrate burns out. You take the Ember Court!');
  } else if (state.player.ember <= 0) {
    state.player.ember = 0;
    state.phase = 'lost';
    state.winner = 'rival';
    state.log.push('Your embers fade. The Cinder Magistrate keeps the Court.');
  }
}

export function beginPlayerTurn(state) {
  state.turn += 1;
  state.energyMax = Math.min(2 + (state.turn - 1), MAX_ENERGY);
  state.energy = state.energyMax;
  state.flamePlayedThisTurn = 0;
  state.rivalFlameThisTurn = 0;
  drawUpTo(state.player, MAX_HAND, state.rng);
  state.log.push(`Turn ${state.turn} — your embers rise to ${state.energyMax} energy. Draw to 5.`);
}

export function endPlayerTurn(state) {
  state.log.push('You end your turn.');
}

// Deterministic preset states for screenshots (?shot=...&seed=).
export function presetState(shot, seed) {
  const state = createGame(seed);
  startDuel(state);
  if (shot === 'title') {
    state.phase = 'title';
    return state;
  }
  if (shot === 'table') {
    // A mid-duel table: both sides hurt, shields up, a Flame just played.
    state.turn = 4;
    state.energyMax = 5;
    state.energy = 3;
    state.player.ember = 14;
    state.player.shield = 4;
    state.rival.ember = 11;
    state.rival.shield = 2;
    state.player.damageDealt = 9;
    state.rival.damageDealt = 6;
    state.player.cardsPlayed = 3;
    state.rival.cardsPlayed = 4;
    // Fixed readable hands for the screenshot: every house on show.
    state.player.hand = ['flame-tongue', 'pyre-burst', 'ashen-veil', 'golden-arc', 'cinder-wall'].map((id) => ({
      ...cardById(id),
      uid: id,
    }));
    state.rival.hand = ['ember-lick', 'cinder-wall', 'black-anvil', 'bright-idea', 'coal-fist'].map((id) => ({
      ...cardById(id),
      uid: id,
    }));
    state.lastPlay = {
      by: 'player',
      card: { ...cardById('flame-tongue'), uid: 'flame-tongue' },
      damage: 4,
      shieldGain: 0,
      drew: 0,
      refund: 0,
      notes: [],
      foeEmber: 11,
      foeShield: 2,
    };
    state.log = [
      'The duel begins. The Cinder Magistrate waits across the table.',
      'You play Flame Tongue — deals 4 damage.',
      'The Magistrate plays Cinder Wall — gains 6 shield.',
      '  Shield carries to next turn.',
      'You play Ashen Veil — gains 3 shield.',
      'The Magistrate plays Pyre Burst — deals 5 damage.',
      '  3 absorbed by shield.',
      'Turn 4 — your embers rise to 5 energy. Draw to 5.',
    ];
    return state;
  }
  if (shot === 'win') {
    state.phase = 'won';
    state.winner = 'player';
    state.turn = 7;
    state.player.ember = 9;
    state.player.shield = 2;
    state.rival.ember = 0;
    state.player.damageDealt = 20;
    state.rival.damageDealt = 11;
    state.player.cardsPlayed = 6;
    state.rival.cardsPlayed = 5;
    state.log = [
      'You play Inferno Crown — deals 7 damage.',
      '  Twin Flame! +2 damage.',
      'The Cinder Magistrate burns out. You take the Ember Court!',
    ];
    return state;
  }
  if (shot === 'loss') {
    state.phase = 'lost';
    state.winner = 'rival';
    state.turn = 6;
    state.player.ember = 0;
    state.rival.ember = 12;
    state.rival.shield = 3;
    state.player.damageDealt = 8;
    state.rival.damageDealt = 20;
    state.player.cardsPlayed = 4;
    state.rival.cardsPlayed = 6;
    state.log = [
      'The Magistrate plays Obsidian Edge — deals 7 damage.',
      '  Pierces shield.',
      'Your embers fade. The Cinder Magistrate keeps the Court.',
    ];
    return state;
  }
  return state;
}
