const IMAGE_SERIES = ['virus', 'ai', 'hw', 'nr'] as const;
const IMAGES_PER_SERIES = 20;

const ALL_CARD_IMAGES: string[] = [];
for (const series of IMAGE_SERIES) {
  for (let i = 1; i <= IMAGES_PER_SERIES; i++) {
    ALL_CARD_IMAGES.push(`${series}_${String(i).padStart(3, '0')}.png`);
  }
}

const STARTER_IMAGE_OVERRIDES: Record<string, string> = {
  starter_scout_1a: 'nr_001.png',
  starter_scout_1b: 'nr_002.png',
  starter_scout_1c: 'nr_003.png',
  starter_scout_2a: 'nr_004.png',
  starter_scout_2b: 'nr_005.png',
  starter_mascot: 'nr_006.png',
};

const EXPLICIT_IMAGE_MAP: Record<string, string> = {
  a_jester: 'virus_001.png',
  a_hermit: 'virus_002.png',
  a_stable_boy: 'virus_003.png',
  a_pig: 'virus_004.png',
  a_talent: 'virus_005.png',
  a_reporter: 'virus_006.png',
  a_rescue_pod: 'virus_007.png',
  a_ai: 'virus_008.png',
  a_shapeshifter: 'virus_009.png',
  a_cow: 'virus_010.png',
  a_makeup_artist: 'virus_011.png',
  a_gangster: 'virus_012.png',
  a_moviestar: 'virus_013.png',
  a_cat: 'virus_014.png',
  a_merman: 'virus_015.png',
  a_treasure: 'virus_016.png',
  a_sailor: 'virus_017.png',
  a_parrot: 'virus_018.png',
  a_butler: 'virus_019.png',
  a_skeleton: 'virus_020.png',
  a_spider: 'ai_001.png',
  a_clown: 'ai_002.png',
  a_juggler: 'ai_003.png',
  a_vendor: 'ai_004.png',
  a_pony: 'ai_005.png',
  b_knight: 'ai_006.png',
  b_blacksmith: 'ai_007.png',
  b_magician: 'ai_008.png',
  b_horse: 'ai_009.png',
  b_mascot: 'ai_010.png',
  b_dog: 'ai_011.png',
  b_ufo: 'ai_012.png',
  b_band: 'ai_013.png',
  b_clone: 'ai_014.png',
  b_alien: 'ai_015.png',
  b_cowboy: 'ai_016.png',
  b_comic: 'ai_017.png',
  b_director: 'ai_018.png',
  b_lion: 'ai_019.png',
  b_cook: 'ai_020.png',
  b_navigator: 'hw_001.png',
  b_lifeguard: 'hw_002.png',
  b_shark: 'hw_003.png',
  b_ghost: 'hw_004.png',
  b_teenager: 'hw_005.png',
  b_necromancer: 'hw_006.png',
  b_bat: 'hw_007.png',
  b_mime: 'hw_008.png',
  b_pyrotechnist: 'hw_009.png',
  b_fortune_teller: 'hw_010.png',
  b_duck: 'hw_011.png',
  c_bard: 'hw_012.png',
  c_prince: 'hw_013.png',
  c_dragon: 'hw_014.png',
  c_champion: 'hw_015.png',
  c_fanbus: 'hw_016.png',
  c_hologram: 'hw_017.png',
  c_geek: 'hw_018.png',
  c_slime: 'hw_019.png',
  c_hero: 'hw_020.png',
  c_trex: 'nr_007.png',
  c_villain: 'nr_008.png',
  c_siren: 'nr_009.png',
  c_kraken: 'nr_010.png',
  c_submarine: 'nr_011.png',
  c_vampire: 'nr_012.png',
  c_pumpkin: 'nr_013.png',
  c_werewolf: 'nr_014.png',
  c_illusionist: 'nr_015.png',
  c_bumper_car: 'nr_016.png',
  c_teddybear: 'nr_017.png',
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getCardImagePath(cardId: string): string {
  const baseId = stripInstanceSuffix(cardId);

  if (STARTER_IMAGE_OVERRIDES[baseId]) {
    return `/images/cards/${STARTER_IMAGE_OVERRIDES[baseId]}`;
  }

  if (EXPLICIT_IMAGE_MAP[baseId]) {
    return `/images/cards/${EXPLICIT_IMAGE_MAP[baseId]}`;
  }

  const idx = hashString(baseId) % ALL_CARD_IMAGES.length;
  return `/images/cards/${ALL_CARD_IMAGES[idx]}`;
}

export function stripInstanceSuffix(cardId: string): string {
  const match = cardId.match(/^(.*)_\d+$/);
  if (match) {
    const prefix = match[1];
    if (prefix.startsWith('a_') || prefix.startsWith('b_') || prefix.startsWith('c_') || prefix.startsWith('starter_')) {
      return prefix;
    }
  }
  return cardId;
}

export { ALL_CARD_IMAGES };