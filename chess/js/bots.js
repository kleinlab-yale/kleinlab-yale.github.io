/**
 * Bot Personalities, Elo Tiers, Opening Books, and Dynamic Commentary
 */

export const BOT_PERSONALITIES = [
  {
    id: 'pip',
    name: 'Pip the Automaton',
    title: 'Clockwork Squire',
    elo: 600,
    badge: 'Beginner • Carefree',
    accentColor: '#38bdf8',
    description:
      'A charmingly squeaky brass automaton missing a few gears. Loves pushing pawns randomly and occasionally forgets his Queen is under attack.',
    avatarSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>
      <line x1="40" y1="8" x2="40" y2="18" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="7" r="4" fill="#fbbf24"/>
      <rect x="20" y="18" width="40" height="36" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="31" cy="34" r="6" fill="#38bdf8"/>
      <circle cx="49" cy="34" r="4.5" fill="#fbbf24"/>
      <path d="M29 45 H51" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 3"/>
      <path d="M24 58 L56 58 L62 72 L18 72 Z" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
    </svg>`,
    aiConfig: {
      depth: 1,
      useQuiescence: false,
      noise: 185,
      blunderChance: 0.28,
      aggression: 0.7,
      kingSafety: 0.3,
      positional: 0.35,
      captureBias: 0.8,
      knightBias: 1.0,
      bishopBias: 1.0
    },
    openings: {
      w: [
        ['e2e4', 'd2d3'],
        ['g1f3', 'b1c3'],
        ['c2c4', 'b2b3']
      ],
      b: [
        ['e7e5', 'd7d6'],
        ['c7c6', 'd7d5'],
        ['g8f6', 'e7e6']
      ]
    },
    dialogue: {
      greeting: [
        '*Whirrr-clank!* My gears are mostly oiled today! Good luck, friend!',
        'Beep-boop! Wait... which way does the horsey jump again?',
        'Greetings, Challenger! Please do not magnetize my rooks!'
      ],
      onBotCapture: [
        'Ooh, shiny piece! I will keep this in my gear-box!',
        '*Clink!* Did I just do a tactical thing?!',
        'Aha! Even a rusty clock strikes right twice a day!'
      ],
      onPlayerCapture: [
        'Hey! I was using that piece for structural balance!',
        '*Sparks fly* Uh oh... was that important?',
        'Take it! It was weighing down my springs anyway!'
      ],
      onCheck: [
        'BZZZT! Royal alarm triggered! Check!',
        'Look out, your Majesty! My piece wandered over there!'
      ],
      onChecked: [
        'Eep! My King is leaking oil! Somebody block that!',
        'Wait, that is illegal! Oh, it is called Check? Hold on!'
      ],
      onWin: [
        '*Happy steam whistle!* I won?! Wait till I tell the Grand Artificer!',
        'Victory! My cogs are spinning at maximum RPM!'
      ],
      onLoss: [
        '*Spring pops out* Well played! You outsmarted my copper circuits!',
        'System reboot required... You played wonderfully!'
      ],
      onDraw: [
        'A tie! Nobody gets disassembled today! Hooray!'
      ]
    }
  },
  {
    id: 'barnaby',
    name: 'Sir Barnaby the Bold',
    title: 'Reckless Vanguard',
    elo: 950,
    badge: 'Casual • Berserker',
    accentColor: '#f97316',
    description:
      'A boisterous tavern knight who believes retreating is dishonorable. Charges headfirst with reckless gambits and wild sacrifices.',
    avatarSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#1c1917" stroke="#f97316" stroke-width="2.5"/>
      <path d="M25 16 C35 6, 48 6, 56 16 L46 22 Z" fill="#ef4444"/>
      <path d="M22 24 C22 14, 58 14, 58 24 L60 52 C40 62, 40 62, 20 52 Z" fill="#44403c" stroke="#f97316" stroke-width="2"/>
      <path d="M26 34 L54 34 L50 42 L30 42 Z" fill="#fbbf24"/>
      <line x1="40" y1="22" x2="40" y2="54" stroke="#f97316" stroke-width="2.5"/>
      <path d="M18 58 L62 58 L66 74 L14 74 Z" fill="#7c2d12" stroke="#f97316" stroke-width="1.5"/>
    </svg>`,
    aiConfig: {
      depth: 2,
      useQuiescence: false,
      noise: 75,
      blunderChance: 0.08,
      aggression: 1.9,
      kingSafety: 0.45,
      positional: 0.7,
      captureBias: 1.5,
      knightBias: 1.2,
      bishopBias: 1.0
    },
    openings: {
      w: [
        ['e2e4', 'f2f4', 'g1f3', 'f1c4'], // King's Gambit
        ['e2e4', 'd2d4', 'c2c3'], // Danish Gambit style
        ['e2e4', 'g1f3', 'f1c4', 'b1c3']
      ],
      b: [
        ['e7e5', 'b8c6', 'f8c5'],
        ['d7d5', 'c8f5', 'b8c6'],
        ['c7c5', 'b8c6', 'g7g6']
      ]
    },
    dialogue: {
      greeting: [
        'Huzzah! Draw your sword! Defense is for cowards—CHARGE!',
        'Let the stone pieces clash! Last King standing buys the mead!',
        'No slow positional maneuvering today—we fight at dawn!'
      ],
      onBotCapture: [
        'SMASH! Another trophy for Sir Barnaby!',
        'Out of the way! The Vanguard stops for nothing!',
        'Haha! Did you hear that stone shatter?! Glorious!'
      ],
      onPlayerCapture: [
        'Bah! Merely a flesh wound! My attack continues!',
        'A tactical sacrifice! Totally intentional, I assure you!',
        'You felled my warrior, but two more shall take their place!'
      ],
      onCheck: [
        'HAVE AT THEE! Your King trembles before my charge!',
        'CHECK! Sound the war-horns!'
      ],
      onChecked: [
        'Whoa there! Attacking MY King?! That was MY plan!',
        'Shields up! Protect the throne!'
      ],
      onWin: [
        'VICTORY! Boldness conquers all! What a glorious brawl!',
        'Haha! Another triumph for the Reckless Vanguard!'
      ],
      onLoss: [
        'By my beard... my charge ran straight into a brick wall! Well fought!',
        'You parried every swing! A worthy champion indeed!'
      ],
      onDraw: [
        'Both armies exhausted on the battlefield! An honorable stalemate!'
      ]
    }
  },
  {
    id: 'celeste',
    name: 'Sister Celeste',
    title: 'Keeper of the Sanctuary',
    elo: 1250,
    badge: 'Intermediate • Fortress',
    accentColor: '#10b981',
    description:
      'A serene monastic scholar who weaves impenetrable pawn chains, castles early, and patiently punishes overextended attackers.',
    avatarSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#06281e" stroke="#10b981" stroke-width="2.5"/>
      <path d="M18 68 C18 32, 24 14, 40 14 C56 14, 62 32, 62 68 Z" fill="#064e3b" stroke="#10b981" stroke-width="2"/>
      <circle cx="40" cy="38" r="13" fill="#fde68a"/>
      <circle cx="35" cy="36" r="2" fill="#064e3b"/>
      <circle cx="45" cy="36" r="2" fill="#064e3b"/>
      <path d="M36 43 Q40 46 44 43" stroke="#064e3b" stroke-width="2" stroke-linecap="round"/>
      <circle cx="40" cy="21" r="4" fill="#34d399"/>
    </svg>`,
    aiConfig: {
      depth: 3,
      useQuiescence: true,
      noise: 32,
      blunderChance: 0.02,
      aggression: 0.75,
      kingSafety: 1.65,
      positional: 1.35,
      captureBias: 1.0,
      knightBias: 1.05,
      bishopBias: 1.15
    },
    openings: {
      w: [
        ['d2d4', 'c1f4', 'e2e3', 'g1f3', 'c2c3'], // London System
        ['g1f3', 'g2g3', 'f1g2', 'e1g1', 'd2d3'], // King's Indian Attack
        ['e2e4', 'g1f3', 'f1c4', 'd2d3', 'e1g1'] // Giuoco Pianissimo
      ],
      b: [
        ['c7c6', 'd7d5', 'c8f5', 'e7e6'], // Caro-Kann
        ['e7e6', 'd7d5', 'g8f6', 'f8e7'], // French / QGD
        ['d7d5', 'c7c6', 'g8f6', 'c8f5'] // Slav
      ]
    },
    dialogue: {
      greeting: [
        'Peace be with you, traveler. Let us build harmony upon the sixty-four squares.',
        'Patience is the strongest fortress. Shall we begin?',
        'Every pawn is a pillar of the sanctuary. Treat them with care.'
      ],
      onBotCapture: [
        'An overextended piece invites its own fall.',
        'Balance is restored to the center.',
        'Calm water wears away even the hardest stone.'
      ],
      onPlayerCapture: [
        'A material sacrifice, yet my structure endures.',
        'You strike swiftly. Let us see if your foundation holds.',
        'Interesting. A breach in the outer wall, nothing more.'
      ],
      onCheck: [
        'Look carefully—your King stands exposed to the wind.',
        'A gentle reminder to shelter your monarch. Check.'
      ],
      onChecked: [
        'The sanctuary walls are tested, yet we remain calm.',
        'A sharp threat. Let us reinforce the citadel.'
      ],
      onWin: [
        'Order prevails over haste. Thank you for a thoughtful match.',
        'A quiet, steady climb reaches the summit. Well contested.'
      ],
      onLoss: [
        'Even the strongest fortress yields to inspired artistry. Bowing in respect.',
        'Your vision pierced my defenses today. A wonderful victory for you.'
      ],
      onDraw: [
        'Perfect equilibrium. Neither light nor shadow yields today.'
      ]
    }
  },
  {
    id: 'vesper',
    name: 'Lord Vesper',
    title: 'Shadow Court Tactician',
    elo: 1550,
    badge: 'Advanced • Trickster',
    accentColor: '#a855f7',
    description:
      'An aristocratic duelist of the Shadow Court. Specializes in treacherous knight forks, poisoned pawns, and counter-attacking traps.',
    avatarSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#1e1b4b" stroke="#a855f7" stroke-width="2.5"/>
      <path d="M22 68 L28 48 L52 48 L58 68 Z" fill="#311042" stroke="#a855f7" stroke-width="2"/>
      <circle cx="40" cy="34" r="14" fill="#e2e8f0"/>
      <path d="M26 28 C26 16, 54 16, 54 28 C46 22, 34 22, 26 28 Z" fill="#1e1b4b"/>
      <circle cx="35" cy="34" r="2.2" fill="#9333ea"/>
      <circle cx="45" cy="34" r="4" stroke="#f59e0b" stroke-width="1.8" fill="none"/>
      <circle cx="45" cy="34" r="1.8" fill="#9333ea"/>
      <path d="M35 41 Q40 39 46 42" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    aiConfig: {
      depth: 3,
      useQuiescence: true,
      noise: 14,
      blunderChance: 0,
      aggression: 1.45,
      kingSafety: 1.15,
      positional: 1.25,
      captureBias: 1.2,
      knightBias: 1.35,
      bishopBias: 1.1
    },
    openings: {
      w: [
        ['e2e4', 'g1f3', 'f1c4', 'g1g5'], // Two Knights / Fried Liver themes
        ['c2c4', 'b1c3', 'g2g3', 'f1g2'], // English
        ['e2e4', 'b1c3', 'f1c4', 'd2d3'] // Vienna
      ],
      b: [
        ['c7c5', 'd7d6', 'g8f6', 'g7g6'], // Sicilian Dragon
        ['g8f6', 'c7c5', 'b8c6', 'e7e6'], // Sicilian / Benoni
        ['e7e5', 'g8f6', 'b8c6', 'f8c5'] // Petrov / Two Knights
      ]
    },
    dialogue: {
      greeting: [
        'Welcome to my parlor. Watch your step—every square conceals a dagger.',
        'I do hope you brought your tactical spectacles. My Knights are hungry.',
        'Shall we dance? Try not to fall for the first trap I lay.'
      ],
      onBotCapture: [
        'Delicious. Did you truly think that piece was defended?',
        'Like clockwork. You walked right into the web.',
        'A costly oversight, my dear opponent.'
      ],
      onPlayerCapture: [
        'Go ahead, take the bait. Let us see what it costs you in three moves.',
        'Hmph. A minor inconvenience to my grander design.',
        'Clever... you spotted the surface layer. What about the shadow beneath?'
      ],
      onCheck: [
        'Check. Your King looks remarkably uncomfortable.',
        'Nowhere to hide in the dark. Check!'
      ],
      onChecked: [
        'Tch. An insolent check. Allow me to reposition.',
        'Bold of you to step into my territory.'
      ],
      onWin: [
        'Checkmate. By the time you saw the trap, the door was already locked.',
        'A masterclass in deception. Do return when you wish for another lesson.'
      ],
      onLoss: [
        'Impossible... You saw through every single feint?! Bravo, tactician.',
        'I tip my glass to you. Today the hunter became the hunted.'
      ],
      onDraw: [
        'A razor-sharp standoff. Neither of us blinked.'
      ]
    }
  },
  {
    id: 'aurelius',
    name: 'Archmage Aurelius',
    title: 'Grand Wizard of the Hall',
    elo: 1850,
    badge: 'Master • Strategist',
    accentColor: '#f59e0b',
    description:
      'Ancient master of Enchanted Wizard’s Chess. Commands sweeping bishop diagonals, relentless endgame geometry, and deep foresight.',
    avatarSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#171207" stroke="#f59e0b" stroke-width="2.5"/>
      <path d="M18 30 L40 6 L62 30 Z" fill="#1e3a8a" stroke="#f59e0b" stroke-width="2"/>
      <path d="M12 30 Q40 24 68 30" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="40" r="11" fill="#fde68a"/>
      <path d="M26 44 Q40 76 54 44 Z" fill="#e2e8f0"/>
      <circle cx="36" cy="38" r="2" fill="#fbbf24"/>
      <circle cx="44" cy="38" r="2" fill="#fbbf24"/>
      <circle cx="40" cy="19" r="3" fill="#fbbf24"/>
    </svg>`,
    aiConfig: {
      depth: 4,
      useQuiescence: true,
      noise: 4,
      blunderChance: 0,
      aggression: 1.2,
      kingSafety: 1.35,
      positional: 1.45,
      captureBias: 1.1,
      knightBias: 1.15,
      bishopBias: 1.3
    },
    openings: {
      w: [
        ['e2e4', 'g1f3', 'f1b5', 'a2a4'], // Ruy Lopez
        ['d2d4', 'c2c4', 'b1c3', 'g1f3'], // Queen's Gambit
        ['e2e4', 'g1f3', 'd2d4', 'f1c4'] // Scotch Gambit
      ],
      b: [
        ['e7e5', 'b8c6', 'g8f6', 'f8c5'],
        ['g8f6', 'e7e6', 'd7d5', 'f8e7'], // Orthodox QGD / Nimzo
        ['c7c5', 'b8c6', 'g8f6', 'd7d5'] // Open Sicilian
      ]
    },
    dialogue: {
      greeting: [
        'The braziers are lit and the enchanted stone awakens. Show me your mastery!',
        'For three centuries I have studied these sixty-four runes. Make your move!',
        'In Wizard’s Chess, every square hums with ancient geometry. Let us begin.'
      ],
      onBotCapture: [
        '*Thunderous incantation!* Stone to dust! The diagonal belongs to me!',
        'The arcane lines converged upon that square five turns ago.',
        'Shattered! Your defense crumbles before the High Art!'
      ],
      onPlayerCapture: [
        'A worthy strike! The enchantments ripple across the board.',
        'You command your pieces with admirable authority.',
        'An exchange of stone, yet the deeper spell continues.'
      ],
      onCheck: [
        'BEHOLD! The royal sigil burns—CHECK!',
        'Arcane lightning strikes your throne! Check!'
      ],
      onChecked: [
        'A bold incantation against the Archmage! Let us weave a ward.',
        'Your spell reaches my sanctum—impressive.'
      ],
      onWin: [
        'Checkmate! The ancient runes align in full harmony. A noble duel!',
        'Victory for the Grand Hall! Your mastery grows with every battle.'
      ],
      onLoss: [
        'By the Stars of Merlin... You have surpassed the Archmage himself!',
        'Magnificent! The enchanted stones bow to a true Grandmaster of the Hall!'
      ],
      onDraw: [
        'Our spells cancel in blinding equilibrium! A masterly draw!'
      ]
    }
  },
  {
    id: 'oracle',
    name: 'The Obsidian Oracle',
    title: 'Supreme Astral Engine',
    elo: 2150,
    badge: 'Grandmaster • Apex',
    accentColor: '#ec4899',
    description:
      'A sentient monolith carved from fallen starlight. Evaluates thousands of timelines per turn with cold, uncompromising precision.',
    avatarSvg: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#090514" stroke="#ec4899" stroke-width="2.5"/>
      <polygon points="40,10 62,32 54,66 26,66 18,32" fill="#1e1035" stroke="#ec4899" stroke-width="2"/>
      <polygon points="40,18 52,36 40,56 28,36" fill="#ec4899" fill-opacity="0.25" stroke="#f472b6" stroke-width="1.5"/>
      <circle cx="40" cy="36" r="6" fill="#fdf2f8"/>
      <circle cx="40" cy="36" r="3" fill="#db2777"/>
      <circle cx="24" cy="22" r="1.5" fill="#f472b6"/>
      <circle cx="58" cy="20" r="2" fill="#38bdf8"/>
      <circle cx="62" cy="54" r="1.5" fill="#f472b6"/>
    </svg>`,
    aiConfig: {
      depth: 4,
      endgameDepth: 5,
      useQuiescence: true,
      noise: 0,
      blunderChance: 0,
      aggression: 1.3,
      kingSafety: 1.45,
      positional: 1.55,
      captureBias: 1.15,
      knightBias: 1.2,
      bishopBias: 1.3
    },
    openings: {
      w: [
        ['e2e4', 'g1f3', 'f1b5', 'c2c3', 'd2d4'],
        ['d2d4', 'c2c4', 'g1f3', 'b1c3', 'e2e3'],
        ['c2c4', 'g1f3', 'b1c3', 'd2d4']
      ],
      b: [
        ['c7c5', 'b8c6', 'g8f6', 'd7d6'],
        ['g8f6', 'c7c5', 'b8c6', 'd7d5'],
        ['e7e5', 'b8c6', 'g8f6', 'f8b4']
      ]
    },
    dialogue: {
      greeting: [
        'TIMELINE INITIALIZED. 10^120 VARIATIONS CONVERGE. MAKE YOUR MOVE, MORTAL.',
        'I HAVE SEEN THE ENDGAME BEFORE THE FIRST PAWN STEPS FORWARD.',
        'THE OBSIDIAN MONOLITH AWAKENS. PROVE YOUR CALCULATION.'
      ],
      onBotCapture: [
        'INEVITABLE. THAT PIECE WAS LOST SEVEN PLIES AGO.',
        'ENTROPY CLAIMS ANOTHER FRAGMENT OF YOUR POSITION.',
        'PRECISION EXECUTED. YOUR STRUCTURAL INTEGRITY DECLINES.'
      ],
      onPlayerCapture: [
        'AN EXPECTED EXCHANGE WITHIN OPTIMAL PARAMETERS.',
        'YOU REMOVE MATTER, YET SPACE REMAINS UNDER MY DOMINION.',
        'CALCULATED SACRIFICE ACCEPTED.'
      ],
      onCheck: [
        'SINGULARITY DETECTED: CHECK.',
        'YOUR MONARCH HAS LIMITED ESCAPE VECTORS. CHECK.'
      ],
      onChecked: [
        'MINOR PERTURBATION DETECTED. RECALIBRATING KING VECTOR.',
        'YOUR THREAT WAS FORESEEN AND NEUTRALIZED.'
      ],
      onWin: [
        'CONVERGENCE COMPLETE: CHECKMATE. THE ORACLE REMAINS UNBROKEN.',
        'ALL PATHS LED TO THIS TERMINAL NODE. WELL FOUGHT, CHALLENGER.'
      ],
      onLoss: [
        'ANOMALY DETECTED... A MORTAL HAS SHATTERED THE ORACLE’S PREDICTION. IMMENSE RESPECT.',
        'TRANSCENDENT PLAY. YOUR RATING ASCENDS TO THE ASTRAL TIER.'
      ],
      onDraw: [
        'DEADLOCK ACHIEVED. NEITHER INTELLIGENCE YIELDED AN INCH.'
      ]
    }
  }
];

export function getBotById(id) {
  return BOT_PERSONALITIES.find(b => b.id === id) || BOT_PERSONALITIES[2];
}

export function getRecommendedBotForElo(playerElo) {
  let best = BOT_PERSONALITIES[0];
  let bestDiff = Infinity;
  for (const bot of BOT_PERSONALITIES) {
    const diff = Math.abs(bot.elo - playerElo);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = bot;
    }
  }
  return best;
}

export function pickBotLine(bot, category) {
  const lines = bot?.dialogue?.[category];
  if (!lines || lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}
