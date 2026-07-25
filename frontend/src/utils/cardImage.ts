const STARTER_IMAGE_OVERRIDES: Record<string, string> = {
  starter_scout_1a: 'starter_scout_1.png',
  starter_scout_1b: 'starter_scout_1.png',
  starter_scout_1c: 'starter_scout_1.png',
  starter_scout_2a: 'starter_scout_2.png',
  starter_scout_2b: 'starter_scout_2.png',
  starter_mascot: 'starter_mascot.png',
};

const preloadedUrls = new Set<string>();

export function preloadCardImage(url: string): void {
  if (!url || preloadedUrls.has(url) || typeof window === 'undefined') return;
  preloadedUrls.add(url);
  const img = new Image();
  img.src = url;
}

export function preloadAllCardImages(): void {
  // Preload starter images and deck card images
  const starterKeys = ['starter_scout_1', 'starter_scout_2', 'starter_mascot'];
  const deckAKeys = [
    'a_jester', 'a_hermit', 'a_stable_boy', 'a_pig', 'a_talent', 'a_reporter',
    'a_rescue_pod', 'a_ai', 'a_shapeshifter', 'a_cow', 'a_makeup_artist',
    'a_gangster', 'a_moviestar', 'a_cat', 'a_merman', 'a_treasure', 'a_sailor',
    'a_parrot', 'a_butler', 'a_skeleton', 'a_spider', 'a_clown', 'a_juggler',
    'a_vendor', 'a_pony'
  ];
  const deckBKeys = [
    'b_knight', 'b_blacksmith', 'b_magician', 'b_horse', 'b_mascot', 'b_dog',
    'b_ufo', 'b_band', 'b_clone', 'b_alien', 'b_cowboy', 'b_comic', 'b_director',
    'b_lion', 'b_cook', 'b_navigator', 'b_lifeguard', 'b_shark', 'b_ghost',
    'b_teenager', 'b_necromancer', 'b_bat', 'b_mime', 'b_pyrotechnist',
    'b_fortune_teller', 'b_duck'
  ];
  const deckCKeys = [
    'c_bard', 'c_prince', 'c_dragon', 'c_champion', 'c_fanbus', 'c_hologram',
    'c_geek', 'c_slime', 'c_hero', 'c_trex', 'c_villain', 'c_siren', 'c_kraken',
    'c_submarine', 'c_vampire', 'c_pumpkin', 'c_werewolf', 'c_illusionist',
    'c_bumper_car', 'c_teddybear'
  ];

  const allKeys = [...starterKeys, ...deckAKeys, ...deckBKeys, ...deckCKeys, 'default'];
  for (const key of allKeys) {
    preloadCardImage(`/images/cards/${key}.webp`);
    preloadCardImage(`/images/cards/${key}.png`);
  }
}

export function getCardImagePath(cardId: string): string {
  const baseId = stripInstanceSuffix(cardId);
  let fileName: string;

  if (STARTER_IMAGE_OVERRIDES[baseId]) {
    fileName = STARTER_IMAGE_OVERRIDES[baseId];
  } else {
    fileName = `${baseId}.png`;
  }

  const webpFileName = fileName.replace(/\.png$/, '.webp');
  return `/images/cards/${webpFileName}`;
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