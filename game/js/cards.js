// cards.js — the Ember Court card pool: four houses, told apart by colour AND shape.
// Flame (red, triangle) burns. Ash (grey, circle) shields. Coal (dark, diamond) pierces.
// Spark (gold, star) draws and refunds energy. Every card is an original Ember Court card.

export const HOUSES = {
  flame: { name: 'Flame', color: '#e5484d', dark: '#7f1d1d', shape: '▲', glow: '#ff6b4a' },
  ash: { name: 'Ash', color: '#9ca3af', dark: '#374151', shape: '●', glow: '#d1d5db' },
  coal: { name: 'Coal', color: '#8b5cf6', dark: '#312e51', shape: '◆', glow: '#a78bfa' },
  spark: { name: 'Spark', color: '#f59e0b', dark: '#78350f', shape: '★', glow: '#fbbf24' },
};

// Combo rules, printed on the cards that use them:
//   Twin Flame — the 2nd Flame card you play in a turn deals +2 damage.
//   Ash shield — shield carries over to your next turn instead of fading.
//   Spark refund — a Spark card refunds 1 energy when played.
//   Coal pierce — Coal damage ignores the target's shield.
export const CARDS = [
  // Flame — direct damage
  { id: 'ember-lick', name: 'Ember Lick', house: 'flame', cost: 1, power: 2, text: 'Deal 2 damage.' },
  { id: 'cinder-dart', name: 'Cinder Dart', house: 'flame', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'flame-tongue', name: 'Flame Tongue', house: 'flame', cost: 2, power: 4, text: 'Deal 4 damage.' },
  { id: 'pyre-burst', name: 'Pyre Burst', house: 'flame', cost: 2, power: 5, text: 'Deal 5 damage.' },
  { id: 'wildfire', name: 'Wildfire', house: 'flame', cost: 3, power: 6, text: 'Deal 6 damage.' },
  { id: 'inferno-crown', name: 'Inferno Crown', house: 'flame', cost: 3, power: 7, text: 'Deal 7 damage. Twin Flame: +2 if 2nd Flame this turn.' },
  // Ash — shield that carries to the next turn
  { id: 'ashen-veil', name: 'Ashen Veil', house: 'ash', cost: 1, power: 3, text: 'Gain 3 shield. Shield carries to next turn.' },
  { id: 'grey-mantle', name: 'Grey Mantle', house: 'ash', cost: 1, power: 4, text: 'Gain 4 shield. Shield carries to next turn.' },
  { id: 'cinder-wall', name: 'Cinder Wall', house: 'ash', cost: 2, power: 6, text: 'Gain 6 shield. Shield carries to next turn.' },
  { id: 'soot-shroud', name: 'Soot Shroud', house: 'ash', cost: 2, power: 5, text: 'Gain 5 shield. Draw 1 card.' },
  { id: 'ashfall', name: 'Ashfall', house: 'ash', cost: 1, power: 2, text: 'Gain 2 shield. Deal 1 damage.' },
  { id: 'emberguard', name: 'Emberguard', house: 'ash', cost: 3, power: 8, text: 'Gain 8 shield. Shield carries to next turn.' },
  // Coal — heavy hits that pierce shields
  { id: 'deep-mine', name: 'Deep Mine', house: 'coal', cost: 1, power: 2, text: 'Deal 2 damage. Pierces shield.' },
  { id: 'coal-fist', name: 'Coal Fist', house: 'coal', cost: 2, power: 4, text: 'Deal 4 damage. Pierces shield.' },
  { id: 'seam-breaker', name: 'Seam Breaker', house: 'coal', cost: 2, power: 5, text: 'Deal 5 damage. Pierces shield.' },
  { id: 'furnace-slam', name: 'Furnace Slam', house: 'coal', cost: 2, power: 3, text: 'Deal 3 damage. Pierces shield. Draw 1 card.' },
  { id: 'black-anvil', name: 'Black Anvil', house: 'coal', cost: 3, power: 6, text: 'Deal 6 damage. Pierces shield.' },
  { id: 'obsidian-edge', name: 'Obsidian Edge', house: 'coal', cost: 3, power: 7, text: 'Deal 7 damage. Pierces shield.' },
  // Spark — draw and energy tricks, refunds 1 energy when played
  { id: 'sparkle', name: 'Sparkle', house: 'spark', cost: 0, power: 1, text: 'Draw 1 card. Refunds 1 energy.' },
  { id: 'static-snap', name: 'Static Snap', house: 'spark', cost: 1, power: 2, text: 'Deal 2 damage. Draw 1 card. Refunds 1 energy.' },
  { id: 'bright-idea', name: 'Bright Idea', house: 'spark', cost: 1, power: 2, text: 'Draw 2 cards. Refunds 1 energy.' },
  { id: 'golden-arc', name: 'Golden Arc', house: 'spark', cost: 2, power: 3, text: 'Deal 3 damage. Refunds 1 energy.' },
  { id: 'storm-cell', name: 'Storm Cell', house: 'spark', cost: 2, power: 2, text: 'Draw 2 cards. Refunds 1 energy.' },
  { id: 'lightning-court', name: 'Lightning Court', house: 'spark', cost: 3, power: 5, text: 'Deal 5 damage. Refunds 2 energy.' },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

export function houseOf(card) {
  return HOUSES[card.house];
}

// A fresh 24-card deck (one copy of every card), shuffled with the given rng.
export function buildDeck(rng) {
  const deck = CARDS.map((c) => ({ ...c, uid: c.id }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
