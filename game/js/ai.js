// ai.js — the Cinder Magistrate, Ember Court's AI rival.
// Readable and counterable: it says what it intends, then plays face-up.
// Heuristic: finish the player when it can, shield when hurt, otherwise spend
// its energy on the best damage it can afford, saving a Spark to keep drawing.

import { HOUSES } from './cards.js';

// Energy the rival gets on its turn mirrors the player's growth curve.
export function rivalEnergyForTurn(turn) {
  return Math.min(2 + (turn - 1), 6);
}

// Score one card in the rival's hand. Higher is better to play now.
export function scoreCardForRival(state, card, energy) {
  if (card.cost > energy) return -1000;
  let score = 0;
  const playerShield = state.player.shield;
  const playerEmber = state.player.ember;
  if (card.house === 'flame' || card.house === 'coal') {
    let dmg = card.power;
    if (card.house === 'flame' && state.rivalFlameThisTurn === 1) dmg += 2; // Twin Flame
    if (card.house === 'coal') score += dmg * 2; // pierces: full value vs shield
    else score += Math.max(dmg - playerShield, 0) * 2 + Math.min(dmg, playerShield) * 0.5;
    if (dmg >= playerEmber) score += 100; // lethal
    if (card.house === 'coal' && playerShield >= 4) score += 6; // break a big shield
  } else if (card.house === 'ash') {
    // Shield matters most when the Magistrate is hurt.
    score += card.power * (state.rival.ember <= 8 ? 2.5 : 1.2);
    if (card.id === 'soot-shroud') score += 3;
  } else if (card.house === 'spark') {
    score += 4 + card.power; // draw + refund keeps the engine going
    if (card.id === 'lightning-court') score += 6;
  }
  // Prefer cheap cards early so it can play more than one.
  score -= card.cost * 0.5;
  return score;
}

// Pick the rival's next card, or null when it should stop.
export function chooseRivalCard(state, energy) {
  let best = null;
  let bestScore = 0;
  for (const card of state.rival.hand) {
    const score = scoreCardForRival(state, card, energy);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

// One readable line of intent before the card flips face-up.
export function rivalIntentText(state, card) {
  const house = HOUSES[card.house];
  if (card.house === 'flame') return `The Magistrate stokes the ${house.name}… a burn is coming.`;
  if (card.house === 'ash') return `The Magistrate gathers ${house.name}… a wall is rising.`;
  if (card.house === 'coal') return `The Magistrate hefts ${house.name}… a piercing blow is coming.`;
  return `The Magistrate sparks ${house.name}… something clever is brewing.`;
}

