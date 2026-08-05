// @ts-nocheck
const screenOrder = ['screen-title', 'screen-setup', 'screen-startcity', 'screen-intro', 'screen-transport1', 'screen-detour', 'screen-detour-result', 'screen-transport2', 'screen-roadblock-intro', 'screen-roadblock-result', 'screen-checkpoint', 'screen-pitstop'];
const subMap = { 'screen-slurp': 'screen-detour', 'screen-rhythm': 'screen-detour', 'screen-stack': 'screen-detour', 'screen-simon': 'screen-detour', 'screen-match': 'screen-detour', 'screen-gamble': 'screen-detour', 'screen-language': 'screen-detour', 'screen-code': 'screen-detour', 'screen-rps': 'screen-roadblock-intro', 'screen-confer': 'screen-roadblock-intro', 'screen-arcade': 'screen-roadblock-intro', 'screen-transport-sub': 'screen-transport1', 'screen-busseats': 'screen-transport1', 'screen-seating': 'screen-pitstop', 'screen-buckle': 'screen-pitstop', 'screen-inflight': 'screen-pitstop', 'screen-entertainment': 'screen-pitstop', 'screen-entertainment-catalog': 'screen-pitstop', 'screen-flightservice': 'screen-pitstop', 'screen-yield': 'screen-checkpoint', 'screen-transport3': 'screen-checkpoint', 'screen-checkpoint-arrival': 'screen-checkpoint', 'screen-pitstop-arrival': 'screen-pitstop' };
let performance = { detour: 0, roadblock: 0, fastForward: 0 };
let pendingRoadblockWho = 'you';
let budget = 7000;
let clockMinutes = 6 * 60 + 15; // 06:15 JST on arrival
let legStartClock = 0;
let energy = 100;
let incomingYieldApplied = false;
let incomingYieldChecked = false;
let yieldUsedByTeams = new Set();
const PLAYER_YIELD_KEY = '__PLAYER_TEAM__';
let routeAlreadyAtMarker = false;
let activeTaskContext = null;
let timeForfeitThisLeg = false;
let pendingForfeitTask = null;
let pendingForfeitPenalty = null;
let lastForfeitResult = null;
const TOKYO_LEG = {
    legNumber: 1, countryTag: 'TOKYO', inflightMeals: ['Ekiben Bento Box', 'Curry Rice Bowl'], localDrink: 'Iced Green Tea', localFood: "a late bowl of tonkotsu ramen and a plate of grilled yakitori from a smoky alley stall in Omoide Yokocho", countryFull: 'Tokyo, Japan', cityName: 'Tokyo', currencySymbol: '¥',
    flag: '🇯🇵', airportName: 'Haneda Airport', airportBanner: { shape: 'airport-terminal', palette: 'dawn', art: 'haneda' },
    arrivalClock: 6 * 60 + 15, tzLabel: 'JST (GMT+9)',
    dest1: { emoji: '🍣', place: 'Tsukiji Outer Market', correctTrainIndex: 2, banner: { shape: 'market-stalls', palette: 'dawn', art: 'tokyo-tsukiji' } },
    dest2: { emoji: '🕹️', place: 'Akihabara Arcade', correctTrainIndex: 0, banner: { shape: 'urban-cluster', palette: 'neon', art: 'tokyo-akihabara' } },
    pitStop: { emoji: '🗼', place: 'Tokyo Tower', noTrain: true, banner: { shape: 'lattice-tower', palette: 'dusk', art: 'tokyo-tower' } },
    yieldSpot: { emoji: '🚦', place: 'Shibuya Crossing', banner: { shape: 'urban-cluster', palette: 'night', art: 'tokyo-shibuya' } },
    themes: {
        reaction: { emoji: '🍜', title: 'Slurp It', desc: "7 rounds with less time each round. Tap only the right food — everything else is a decoy.", taskEmoji: '🍜', actionNoun: 'the Bowl', correctEmojis: ['🍜', '🍲'], decoyEmojis: ['🍣', '🍙', '🍡', '🍵'],
            winLine: "kept a straight face through the cursed bowl, eyes watering, hands shaking slightly, but never once let on which one it was — a small, ridiculous act of dignity nobody in that ramen stall will remember by tomorrow.",
            loseLine: "tapped out halfway through the second bowl, coughing, reaching for water that did nothing, and there is footage — footage that will absolutely resurface at the worst possible moment." },
        balance: { emoji: '🍱', title: 'Stack It', desc: 'Keep the tower balanced for a full 14 seconds. It gets worse the longer you hold it.', taskEmoji: '🍱',
            winLine: "The tower held, nine tiers of lacquered bento boxes standing perfectly still on a table that was very obviously not level, and a nearby toddler applauded like it was the greatest thing he'd ever seen — which, honestly, fair.",
            loseLine: "The tower did not survive. It came down in slow motion, box by box, in front of a small and now very entertained crowd, and neither did your dignity.",
            roadblockWinLine: "held that tower steady for the full fourteen seconds alone, while a small crowd gathered to actually watch.",
            roadblockLoseLine: "watched the tower come down solo, box by box, with no teammate around to share the blame this time." },
        memory: { emoji: '🔔', title: 'Copy the Chant', desc: "Watch the temple bell pattern, then repeat it back exactly. One wrong note and the attempt ends there.", taskEmoji: '🔔',
            winLine: "repeated the bell pattern back note for note, all four rounds, while the monk gave the smallest possible nod of approval.",
            loseLine: "botched the pattern partway through and got a very patient, very disappointed look in return." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '🈴', title: 'Cram Session', desc: "8 Japanese words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '🈴',
            winLine: "matched every word from memory without a single wasted drag — actual retention, apparently, is possible under pressure.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔐', title: 'Crack the Locker', desc: "Guess the 4-peg code on a coin locker. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔐',
            winLine: "cracked the locker code without needing to call anyone over, which felt like a genuine life achievement.",
            loseLine: "eventually cracked it after enough wrong guesses that a station attendant came over just to watch." },
    },
    languageLabel: 'Japanese',
    languageWords: [
        { en: 'Hello', word: 'Konnichiwa' },
        { en: 'Thank You', word: 'Arigatou' },
        { en: 'Water', word: 'Mizu' },
        { en: 'Food', word: 'Tabemono' },
        { en: 'Money', word: 'Okane' },
        { en: 'Help', word: 'Tasukete' },
        { en: 'Bathroom', word: 'Toire' },
        { en: 'Train', word: 'Densha' },
        { en: 'Yes', word: 'Hai' },
        { en: 'No', word: 'Iie' },
        { en: 'Good', word: 'Ii' },
        { en: 'Bad', word: 'Warui' },
        { en: 'Big', word: 'Ookii' },
        { en: 'Small', word: 'Chiisai' },
        { en: 'Friend', word: 'Tomodachi' },
        { en: 'Today', word: 'Kyou' },
    ],
    roadblockThemes: {
        arcade: { emoji: '🕹️', taskEmoji: '🎯',
            desc: "Beat the high score on a decades-old pachinko-adjacent arcade cabinet tucked in the back of a Shinjuku game center, while the shop owner heckles you in rapid-fire Japanese the entire time. Nobody knows the actual rules of this machine. That's the point.",
            winLine: "somehow out-mashed a cabinet that's been rigged since the Clinton administration, buttons rattling, the shop owner cheering by the end despite himself.",
            loseLine: "got completely demolished by a 40-year-old arcade cabinet in front of a small, unbothered crowd of regulars. It's fine. This is fine." },
        language: { emoji: '🈴', taskEmoji: '🈴',
            desc: "Memorize eight Japanese words in four seconds flat, alone, then match every one from memory while the shopkeeper watches, visibly unimpressed.",
            winLine: "matched every word from memory without missing a beat, which is more Japanese than either of you will ever admit to actually knowing.",
            loseLine: "needed a rough handful of tries to get there, but eventually matched all eight — vocabulary retention was not the highlight of the day." },
    },
    startBudget: 9200,
    trainLines: ['Yamanote Line', 'Chuo Rapid Line', 'Ginza Subway Line'],
    sightingSpots: ['Shibuya Crossing', 'Tsukiji Outer Market', 'Akihabara', 'a crowded 7-Eleven', 'the Yamanote Line platform'],
};
const MOROCCO_LEG = {
    legNumber: 2, countryTag: 'MARRAKESH', inflightMeals: ['Chicken Tagine Plate', 'Vegetable Couscous'], localDrink: 'Mint Tea', localFood: "a slow-cooked lamb tagine with preserved lemon, torn bread, and glass after glass of sweet mint tea", countryFull: 'Marrakesh, Morocco', cityName: 'Marrakesh', currencySymbol: 'DH',
    flag: '🇲🇦', airportName: 'Marrakesh Menara Airport', airportBanner: { shape: 'airport-terminal', palette: 'desert', art: 'marrakesh' },
    arrivalClock: 14 * 60 + 30, tzLabel: 'WEST (GMT+1)',
    dest1: { emoji: '🏮', place: 'Jemaa el-Fnaa Night Market', correctTrainIndex: 1, noTrain: true, banner: { shape: 'market-stalls', palette: 'night', art: 'marrakesh-jemaa' } },
    dest2: { emoji: '🐫', place: 'Ben Youssef Camel Track', correctTrainIndex: 0, noTrain: true, banner: { shape: 'dunes', palette: 'desert', art: 'marrakesh-camel-track' } },
    pitStop: { emoji: '🕌', place: 'Koutoubia Mosque', noTrain: true, banner: { shape: 'dome-minaret', palette: 'dusk', art: 'marrakesh-koutoubia' } },
    yieldSpot: { emoji: '🏰', place: 'Bahia Palace', banner: { shape: 'arched-palace', palette: 'dawn', art: 'marrakesh-bahia' } },
    themes: {
        reaction: { emoji: '🧶', title: 'Haggle It', desc: "7 rounds with less time each round. Tap only the right goods — everything else is a decoy.", taskEmoji: '🧶', actionNoun: 'the Deal', correctEmojis: ['🧶', '🧣'], decoyEmojis: ['🏺', '🕯️', '📿', '🧴'],
            winLine: "talked the vendor down to a real, honest discount, shook his hand on it like the deal actually mattered, and walked away with rare footage of a haggling win nobody back home is going to believe.",
            loseLine: "got out-haggled from start to finish by a man who has been doing this since before either of you was born, and paid full price smiling the entire time like it was somehow a victory." },
        balance: { emoji: '🏺', title: 'Balance It', desc: 'Carry stacked water jugs across the square for a full 14 seconds. It gets worse the longer you hold it.', taskEmoji: '🏺',
            winLine: "crossed the entire square without spilling a single drop, stacked jugs balanced perfectly overhead, somehow managing to look almost graceful doing it.",
            loseLine: "went down like a fountain in the middle of the square, water everywhere, jugs shattered, and a small crowd of very unimpressed locals watching the whole thing happen.",
            roadblockWinLine: "crossed the entire square alone without spilling a drop, stacked jugs balanced overhead in front of a small, genuinely impressed crowd.",
            roadblockLoseLine: "went down like a fountain in the middle of the square, solo, water everywhere, with nobody around to share the blame this time." },
        memory: { emoji: '🥁', title: 'Copy the Rhythm', desc: "Watch the drummer's pattern in the square, then tap it back exactly. One wrong beat and the attempt ends there.", taskEmoji: '🥁',
            winLine: "nailed the drum pattern back perfectly across all four rounds, and the drummer actually smiled.",
            loseLine: "fumbled the rhythm partway through in front of a small, unimpressed crowd." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '📇', title: 'Cram Session', desc: "8 French words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '📇',
            winLine: "matched every word from memory without a single wasted drag, which is more French than either of you can actually speak.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔒', title: 'Crack the Lockbox', desc: "Guess the 4-peg code on a merchant's lockbox. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔒',
            winLine: "cracked the lockbox clean, and the merchant looked almost offended by how easy you made it look.",
            loseLine: "got there eventually, after enough wrong guesses that the merchant stopped pretending not to watch." },
    },
    languageLabel: 'French',
    languageWords: [
        { en: 'Hello', word: 'Bonjour' },
        { en: 'Thank You', word: 'Merci' },
        { en: 'Water', word: 'Eau' },
        { en: 'Food', word: 'Nourriture' },
        { en: 'Money', word: 'Argent' },
        { en: 'Help', word: 'Aidez-moi' },
        { en: 'Bathroom', word: 'Toilettes' },
        { en: 'Market', word: 'Marché' },
        { en: 'Yes', word: 'Oui' },
        { en: 'No', word: 'Non' },
        { en: 'Good', word: 'Bon' },
        { en: 'Bad', word: 'Mauvais' },
        { en: 'Big', word: 'Grand' },
        { en: 'Small', word: 'Petit' },
        { en: 'Friend', word: 'Ami' },
        { en: 'Today', word: "Aujourd'hui" },
    ],
    roadblockThemes: {
        arcade: { emoji: '🐫', taskEmoji: '🐫',
            desc: "Race a camel through the narrow market alleys of the souk without knocking over a single stall — spice pyramids, rug displays, and a very unimpressed camel handler all standing directly in the way.",
            winLine: "steered that camel through the entire souk like an absolute local, weaving between stalls without so much as brushing a single spice pyramid.",
            loseLine: "took out three fruit stands, a rug display, and most of a stranger's dignity in about eleven seconds. The camel remains completely unbothered by any of it." },
        language: { emoji: '📇', taskEmoji: '📇',
            desc: "Memorize eight French words in four seconds flat, alone, then match every one from memory while a vendor watches, visibly unimpressed.",
            winLine: "matched every word from memory without missing a beat, which is more French than either of you will ever admit to actually knowing.",
            loseLine: "needed a rough handful of tries to get there, but eventually matched all eight — vocabulary retention was not the highlight of the day." },
    },
    startBudget: 460,
    trainLines: ['ONCF Al Boraq Line', 'Marrakech Regional Line', 'Atlas Foothills Line'],
    sightingSpots: ['Jemaa el-Fnaa', 'the spice souk', 'Ben Youssef Madrasa', 'a crowded rug stall', 'the camel track'],
};
const SINGAPORE_LEG = {
    legNumber: 3, countryTag: 'SINGAPORE', inflightMeals: ['Hainanese Chicken Rice', 'Laksa Cup'], localDrink: 'Teh Tarik', localFood: "Hainanese chicken rice, a plate of char kway teow, and an ice-cold sugarcane juice at a hawker centre", countryFull: 'Singapore', cityName: 'Singapore', currencySymbol: 'S$',
    flag: '🇸🇬', airportName: 'Changi Airport', airportBanner: { shape: 'airport-terminal', palette: 'monsoon', art: 'changi' },
    arrivalClock: 11 * 60 + 0, tzLabel: 'SGT (GMT+8)',
    dest1: { emoji: '🦁', place: 'Chinatown Complex Market', correctTrainIndex: 0, banner: { shape: 'market-stalls', palette: 'dusk', art: 'singapore-chinatown' } },
    dest2: { emoji: '🎡', place: 'Gardens by the Bay', correctTrainIndex: 1, banner: { shape: 'supertrees', palette: 'neon', art: 'singapore-gardens-bay' } },
    pitStop: { emoji: '🏨', place: 'Marina Bay Sands', correctTrainIndex: 1, banner: { shape: 'mbs-towers', palette: 'dusk', art: 'singapore-mbs' } },
    yieldSpot: { emoji: '🦁', place: 'Merlion Park', banner: { shape: 'fountain', palette: 'dawn', art: 'singapore-merlion' } },
    themes: {
        reaction: { emoji: '🦀', title: 'Chilli Crab Dash', desc: "7 rounds with less time each round. Tap only the right dish — everything else is a decoy.", taskEmoji: '🦀', actionNoun: 'the Plate', correctEmojis: ['🦀', '🍤'], decoyEmojis: ['🍜', '🍚', '🥟', '🍡'],
            winLine: "demolished five plates of chilli crab without a single wrong grab, hands stained red, completely unbothered.",
            loseLine: "grabbed the wrong plate more than once and ended up with sauce everywhere and very little dignity." },
        balance: { emoji: '🥡', title: 'Tray Hustle', desc: 'Carry a stack of hawker trays across a packed food court for a full 14 seconds. It gets worse the longer you hold it.', taskEmoji: '🥡',
            winLine: "The tray stack held, six plates deep, weaving through a lunchtime crowd without dropping a single satay stick.",
            loseLine: "The tray stack didn't survive. It came down in the middle of the food court, in front of an unimpressed auntie who had clearly seen this before.",
            roadblockWinLine: "carried that tray stack solo through the entire food court without dropping a thing, weaving through the lunch rush like a local.",
            roadblockLoseLine: "watched the whole stack come down alone in the middle of the food court, no partner to share the blame with." },
        memory: { emoji: '🥁', title: 'Copy the Beat', desc: "Watch the lion dance drum pattern, then tap it back exactly. One wrong beat and you retry.", taskEmoji: '🥁',
            winLine: "matched the lion dance drum pattern across all four rounds, drawing a small crowd of actual approval.",
            loseLine: "needed a rough handful of retries, but eventually matched the drum pattern across all four rounds." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '🈴', title: 'Cram Session', desc: "8 Malay words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '🈴',
            winLine: "matched every word from memory without a single wasted drag — actual retention, apparently, is possible under pressure.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔐', title: 'Crack the Locker', desc: "Guess the 4-peg code on a hawker centre locker. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔐',
            winLine: "cracked the locker code clean, no wasted guesses, no drama.",
            loseLine: "got there in the end, after enough wrong tries to draw a small queue behind you." },
    },
    languageLabel: 'Malay',
    languageWords: [
        { en: 'Hello', word: 'Helo' },
        { en: 'Thank You', word: 'Terima Kasih' },
        { en: 'Water', word: 'Air' },
        { en: 'Food', word: 'Makanan' },
        { en: 'Money', word: 'Wang' },
        { en: 'Help', word: 'Tolong' },
        { en: 'Bathroom', word: 'Tandas' },
        { en: 'Market', word: 'Pasar' },
        { en: 'Yes', word: 'Ya' },
        { en: 'No', word: 'Tidak' },
        { en: 'Good', word: 'Baik' },
        { en: 'Bad', word: 'Teruk' },
        { en: 'Big', word: 'Besar' },
        { en: 'Small', word: 'Kecil' },
        { en: 'Friend', word: 'Kawan' },
        { en: 'Today', word: 'Hari Ini' },
    ],
    roadblockThemes: {
        arcade: { emoji: '🦁', taskEmoji: '🎯',
            desc: "Beat the high score on a claw machine outside a Chinatown arcade while a small crowd of kids watches and silently judges every miss.",
            winLine: "somehow cleaned out that claw machine cold, to genuine applause from a group of eight-year-olds.",
            loseLine: "fed that claw machine coin after coin and walked away with absolutely nothing to show for it." },
    },
    startBudget: 115,
    trainLines: ['North East Line', 'Circle Line', 'East-West Line'],
    sightingSpots: ['Merlion Park', 'Chinatown Complex Market', 'Gardens by the Bay', 'a hawker centre queue', 'the MRT platform'],
};
const BANGKOK_LEG = {
    legNumber: 4, countryTag: 'BANGKOK', inflightMeals: ['Pad Thai Box', 'Green Curry Rice'], localDrink: 'Thai Iced Tea', localFood: "pad kee mao and som tam from a street cart, followed by mango sticky rice that neither of you shares properly", countryFull: 'Bangkok, Thailand', cityName: 'Bangkok', currencySymbol: '฿',
    flag: '🇹🇭', airportName: 'Suvarnabhumi Airport', airportBanner: { shape: 'airport-terminal', palette: 'dusk', art: 'suvarnabhumi' },
    arrivalClock: 9 * 60 + 30, tzLabel: 'ICT (GMT+7)',
    dest1: { emoji: '🛕', place: 'Wat Arun (Temple of Dawn)', correctTrainIndex: 2, noTrain: true, banner: { shape: 'prang', palette: 'dawn', art: 'bangkok-wat-arun' } },
    dest2: { emoji: '🛶', place: 'Chatuchak Weekend Market', correctTrainIndex: 0, banner: { shape: 'market-stalls', palette: 'monsoon', art: 'bangkok-chatuchak' } },
    pitStop: { emoji: '🏯', place: 'Grand Palace', correctTrainIndex: 2, banner: { shape: 'temple-tiered', palette: 'dusk', art: 'bangkok-grand-palace' } },
    yieldSpot: { emoji: '🛕', place: 'Wat Pho', banner: { shape: 'temple-tiered', palette: 'monsoon', art: 'bangkok-wat-pho' } },
    themes: {
        reaction: { emoji: '🌶️', title: 'Street Food Gauntlet', desc: "7 rounds with less time each round. Tap only the right dish — everything else is a decoy.", taskEmoji: '🌶️', actionNoun: 'the Plate', correctEmojis: ['🌶️', '🍲'], decoyEmojis: ['🍣', '🥟', '🍡', '🧋'],
            winLine: "powered through five plates of street food without grabbing a single wrong one, mouth on fire, dignity intact.",
            loseLine: "grabbed the wrong plate more than once and ended up coughing through pure ghost pepper regret." },
        balance: { emoji: '🛶', title: 'Long-Tail Balance', desc: 'Balance on a long-tail boat dock for a full 14 seconds while the wake keeps rocking it. It gets worse the longer you hold it.', taskEmoji: '🛶',
            winLine: "The dock held steady under you for the full stretch, boat wake and all, without so much as a stumble.",
            loseLine: "The dock did not cooperate. You went in the river, fully clothed, to the great amusement of everyone nearby.",
            roadblockWinLine: "held that dock balance alone for the full stretch, boat wake and all, without a single stumble.",
            roadblockLoseLine: "went into the river solo, fully clothed, with nobody around to share the humiliation this time." },
        memory: { emoji: '🔔', title: 'Copy the Temple Bells', desc: "Watch the temple bell pattern, then tap it back exactly. One wrong note and you retry.", taskEmoji: '🔔',
            winLine: "matched the temple bell pattern across all four rounds without a single monk raising an eyebrow.",
            loseLine: "needed a rough handful of retries, but eventually matched the bell pattern across all four rounds." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '📇', title: 'Cram Session', desc: "8 Thai words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '📇',
            winLine: "matched every word from memory without a single wasted drag — actual retention, apparently, is possible under pressure.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔒', title: 'Crack the Donation Box', desc: "Guess the 4-peg code on a temple donation box lock. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔒',
            winLine: "cracked the code clean, no wasted guesses, no drama.",
            loseLine: "got there eventually, after enough wrong tries to draw a small, patient crowd." },
    },
    languageLabel: 'Thai',
    languageWords: [
        { en: 'Hello', word: 'Sawasdee' },
        { en: 'Thank You', word: 'Khob Khun' },
        { en: 'Water', word: 'Nam' },
        { en: 'Food', word: 'Aahaan' },
        { en: 'Money', word: 'Ngern' },
        { en: 'Help', word: 'Chuay Duay' },
        { en: 'Bathroom', word: 'Hong Nam' },
        { en: 'Market', word: 'Talat' },
        { en: 'Yes', word: 'Chai' },
        { en: 'No', word: 'Mai Chai' },
        { en: 'Good', word: 'Dee' },
        { en: 'Bad', word: 'Mai Dee' },
        { en: 'Big', word: 'Yai' },
        { en: 'Small', word: 'Lek' },
        { en: 'Friend', word: 'Puean' },
        { en: 'Today', word: 'Wan Nee' },
    ],
    roadblockThemes: {
        arcade: { emoji: '🛕', taskEmoji: '🎯',
            desc: "Beat the high score on an ancient claw machine outside a Chatuchak stall while the vendor heckles you in rapid Thai the entire time.",
            winLine: "somehow cleaned out that claw machine, to genuine shock from the vendor.",
            loseLine: "fed that claw machine baht after baht and walked away with nothing to show for it." },
    },
    startBudget: 1450,
    trainLines: ['BTS Sukhumvit Line', 'BTS Silom Line', 'MRT Blue Line'],
    sightingSpots: ['Wat Arun', 'Chatuchak Weekend Market', 'a floating market canal', 'the BTS Skytrain platform', 'a tuk-tuk stand'],
};
const BEIJING_LEG = {
    legNumber: 5, countryTag: 'BEIJING', inflightMeals: ['Dumpling Plate', 'Beef Noodle Soup'], localDrink: 'Jasmine Tea', localFood: "Peking duck carved at the table, cucumber and hoisin in thin pancakes, and a bowl of hand-pulled noodles", countryFull: 'Beijing, China', cityName: 'Beijing', currencySymbol: 'CN¥',
    flag: '🇨🇳', airportName: 'Beijing Capital International Airport', airportBanner: { shape: 'airport-terminal', palette: 'monsoon', art: 'beijing' },
    arrivalClock: 10 * 60 + 45, tzLabel: 'CST (GMT+8)',
    dest1: { emoji: '🏯', place: 'Temple of Heaven', correctTrainIndex: 2, banner: { shape: 'round-tiered', palette: 'dawn', art: 'beijing-temple-heaven' } },
    dest2: { emoji: '🧱', place: 'Badaling Great Wall', correctTrainIndex: 1, banner: { shape: 'great-wall', palette: 'monsoon', art: 'beijing-great-wall' } },
    pitStop: { emoji: '🏛️', place: 'Forbidden City', correctTrainIndex: 0, banner: { shape: 'gate-hall', palette: 'dusk', art: 'beijing-forbidden-city' } },
    yieldSpot: { emoji: '🚩', place: 'Tiananmen Square', banner: { shape: 'plaza-monument', palette: 'night', art: 'beijing-tiananmen' } },
    themes: {
        reaction: { emoji: '🥟', title: 'Dumpling Dash', desc: "7 rounds with less time each round. Tap only the right dish — everything else is a decoy.", taskEmoji: '🥟', actionNoun: 'the Dumpling', correctEmojis: ['🥟', '🥠'], decoyEmojis: ['🍣', '🌮', '🍕', '🥐'],
            winLine: "downed five dumplings without grabbing a single wrong one, chopsticks steady, dignity intact.",
            loseLine: "grabbed the wrong dumpling more than once and ended up with soup down your sleeve." },
        balance: { emoji: '🚲', title: 'Rickshaw Balance', desc: 'Balance a stack of goods on a cargo bike for a full 14 seconds through a hutong alley. It gets worse the longer you hold it.', taskEmoji: '🚲',
            winLine: "The stack held all the way down the hutong alley, cobblestones and all, without a single wobble.",
            loseLine: "The stack didn't survive the cobblestones. It came down in the middle of the alley, to the quiet amusement of a passing local.",
            roadblockWinLine: "held that cargo stack steady alone through the entire hutong alley, cobblestones and all.",
            roadblockLoseLine: "watched the whole stack come down solo in the middle of the alley, nobody around to share the blame." },
        memory: { emoji: '🥁', title: 'Copy the Drum', desc: "Watch the lion dance drum pattern, then tap it back exactly. One wrong beat and you retry.", taskEmoji: '🥁',
            winLine: "matched the drum pattern across all four rounds without missing a single beat.",
            loseLine: "needed a rough handful of retries, but eventually matched the drum pattern across all four rounds." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '📇', title: 'Cram Session', desc: "8 Mandarin words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '📇',
            winLine: "matched every word from memory without a single wasted drag — actual retention, apparently, is possible under pressure.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔐', title: 'Crack the Mailbox', desc: "Guess the 4-peg code on an old apartment mailbox lock. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔐',
            winLine: "cracked the mailbox code clean on the first real attempt that counted.",
            loseLine: "got there eventually, after enough wrong guesses that a neighbor leaned out to watch." },
    },
    languageLabel: 'Mandarin (Pinyin)',
    languageWords: [
        { en: 'Hello', word: 'Ni Hao' },
        { en: 'Thank You', word: 'Xie Xie' },
        { en: 'Water', word: 'Shui' },
        { en: 'Food', word: 'Shiwu' },
        { en: 'Money', word: 'Qian' },
        { en: 'Help', word: 'Bangzhu' },
        { en: 'Bathroom', word: 'Cesuo' },
        { en: 'Market', word: 'Shichang' },
        { en: 'Yes', word: 'Shi' },
        { en: 'No', word: 'Bu' },
        { en: 'Good', word: 'Hao' },
        { en: 'Bad', word: 'Bu Hao' },
        { en: 'Big', word: 'Da' },
        { en: 'Small', word: 'Xiao' },
        { en: 'Friend', word: 'Pengyou' },
        { en: 'Today', word: 'Jintian' },
    ],
    roadblockThemes: {
        arcade: { emoji: '🧱', taskEmoji: '🎯',
            desc: "Beat the high score on an arcade cabinet tucked into a Wangfujing games hall while a small crowd of teenagers watches and silently judges every miss.",
            winLine: "somehow cleaned out that cabinet cold, to genuine respect from a group of teenagers.",
            loseLine: "fed that cabinet coin after coin and walked away with nothing to show for it." },
    },
    startBudget: 420,
    trainLines: ['Line 1', 'Line 2', 'Line 8'],
    sightingSpots: ['Temple of Heaven', 'Tiananmen Square', 'the Great Wall entrance', 'a hutong alley', 'the Beijing Subway platform'],
};
const ROME_LEG = {
    legNumber: 6, countryTag: 'ROME', inflightMeals: ['Prosciutto Panino', 'Pasta al Pomodoro Cup'], localDrink: 'Espresso', localFood: "cacio e pepe eaten far too fast, supplì from a corner friggitoria, and an espresso standing at the bar", countryFull: 'Rome, Italy', cityName: 'Rome', currencySymbol: '€',
    flag: '🇮🇹', airportName: 'Leonardo da Vinci–Fiumicino Airport', airportBanner: { shape: 'airport-terminal', palette: 'dawn', art: 'fiumicino' },
    arrivalClock: 8 * 60 + 15, tzLabel: 'CET (GMT+1)',
    dest1: { emoji: '🏛️', place: 'The Colosseum', correctTrainIndex: 1, banner: { shape: 'amphitheatre', palette: 'dusk', art: 'rome-colosseum' } },
    dest2: { emoji: '⛲', place: 'Trevi Fountain', correctTrainIndex: 0, banner: { shape: 'fountain', palette: 'night', art: 'rome-trevi' } },
    pitStop: { emoji: '🏟️', place: 'Pantheon', correctTrainIndex: 0, banner: { shape: 'classical-dome', palette: 'marble', art: 'rome-pantheon' } },
    yieldSpot: { emoji: '🪜', place: 'Spanish Steps', banner: { shape: 'grand-stairs', palette: 'dawn', art: 'rome-spanish-steps' } },
    themes: {
        reaction: { emoji: '🍝', title: 'Pasta Dash', desc: "7 rounds with less time each round. Tap only the right dish — everything else is a decoy.", taskEmoji: '🍝', actionNoun: 'the Bowl', correctEmojis: ['🍝', '🍕'], decoyEmojis: ['🍣', '🌮', '🍜', '🥟'],
            winLine: "powered through five bowls of pasta without grabbing a single wrong one, sauce everywhere, dignity somehow intact.",
            loseLine: "grabbed the wrong bowl more than once and ended up wearing more marinara than you ate." },
        balance: { emoji: '🍕', title: 'Vespa Balance', desc: 'Balance a stack of pizza boxes on a Vespa for a full 14 seconds through cobblestone streets. It gets worse the longer you hold it.', taskEmoji: '🍕',
            winLine: "The stack held all the way down the cobblestones, weaving through traffic without a single box sliding off.",
            loseLine: "The stack didn't survive the cobblestones. Pizza boxes went everywhere, to the quiet horror of a nearby waiter.",
            roadblockWinLine: "held that pizza stack steady alone through the entire cobblestone stretch, without a single box sliding off.",
            roadblockLoseLine: "watched the whole stack go everywhere solo, nobody around to share the humiliation this time." },
        memory: { emoji: '🔔', title: 'Copy the Bells', desc: "Watch the church bell pattern, then tap it back exactly. One wrong note and you retry.", taskEmoji: '🔔',
            winLine: "matched the church bell pattern across all four rounds without missing a single note.",
            loseLine: "needed a rough handful of retries, but eventually matched the bell pattern across all four rounds." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '📇', title: 'Cram Session', desc: "8 Italian words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '📇',
            winLine: "matched every word from memory without a single wasted drag — actual retention, apparently, is possible under pressure.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔒', title: 'Crack the Safe', desc: "Guess the 4-peg code on a vintage safe in a trattoria backroom. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔒',
            winLine: "cracked the old safe clean, and the owner looked genuinely betrayed by how easy it was.",
            loseLine: "got there eventually, after enough wrong guesses that the owner started narrating your mistakes." },
    },
    languageLabel: 'Italian',
    languageWords: [
        { en: 'Hello', word: 'Ciao' },
        { en: 'Thank You', word: 'Grazie' },
        { en: 'Water', word: 'Acqua' },
        { en: 'Food', word: 'Cibo' },
        { en: 'Money', word: 'Soldi' },
        { en: 'Help', word: 'Aiuto' },
        { en: 'Bathroom', word: 'Bagno' },
        { en: 'Market', word: 'Mercato' },
        { en: 'Yes', word: 'Si' },
        { en: 'No', word: 'No' },
        { en: 'Good', word: 'Buono' },
        { en: 'Bad', word: 'Cattivo' },
        { en: 'Big', word: 'Grande' },
        { en: 'Small', word: 'Piccolo' },
        { en: 'Friend', word: 'Amico' },
        { en: 'Today', word: 'Oggi' },
    ],
    roadblockThemes: {
        arcade: { emoji: '⛲', taskEmoji: '🎯',
            desc: "Beat the high score on an arcade cabinet tucked into a Trastevere games bar while a small crowd of locals watches and silently judges every miss.",
            winLine: "somehow cleaned out that cabinet cold, to genuine applause from the regulars.",
            loseLine: "fed that cabinet coin after coin and walked away with nothing to show for it." },
    },
    startBudget: 95,
    trainLines: ['Metro Line A', 'Metro Line B', 'Metro Line C'],
    sightingSpots: ['The Colosseum', 'Trevi Fountain', 'the Spanish Steps', 'a crowded piazza', 'the Metro platform'],
};
const KUALA_LUMPUR_LEG = {
    legNumber: 7, countryTag: 'KUALA LUMPUR', inflightMeals: ['Nasi Lemak Box', 'Chicken Satay Skewers'], localDrink: 'Kopi O', localFood: "nasi lemak with extra sambal, satay off the grill, and teh tarik pulled theatrically at the mamak stall", countryFull: 'Kuala Lumpur, Malaysia', cityName: 'Kuala Lumpur', currencySymbol: 'RM',
    flag: '🇲🇾', airportName: 'Kuala Lumpur International Airport', airportBanner: { shape: 'airport-terminal', palette: 'monsoon', art: 'kualaLumpur' },
    arrivalClock: 13 * 60 + 20, tzLabel: 'MYT (GMT+8)',
    dest1: { emoji: '🏙️', place: 'Petronas Twin Towers', correctTrainIndex: 0, banner: { shape: 'twin-towers', palette: 'neon', art: 'kl-petronas' } },
    dest2: { emoji: '🐒', place: 'Batu Caves', correctTrainIndex: 1, banner: { shape: 'cave-stairs', palette: 'verdant', art: 'kl-batu-caves' } },
    pitStop: { emoji: '🏙️', place: 'Merdeka Square', correctTrainIndex: 0, banner: { shape: 'plaza-monument', palette: 'dusk', art: 'kl-merdeka' } },
    yieldSpot: { emoji: '🛍️', place: 'Central Market', banner: { shape: 'market-stalls', palette: 'dawn', art: 'kl-central-market' } },
    themes: {
        reaction: { emoji: '🍜', title: 'Laksa Dash', desc: "7 rounds with less time each round. Tap only the right dish — everything else is a decoy.", taskEmoji: '🍜', actionNoun: 'the Bowl', correctEmojis: ['🍜', '🌶️'], decoyEmojis: ['🍣', '🍕', '🌮', '🥐'],
            winLine: "powered through five bowls of laksa without grabbing a single wrong one, broth everywhere, dignity somehow intact.",
            loseLine: "grabbed the wrong bowl more than once and ended up with chili broth in places chili broth should never be." },
        balance: { emoji: '🛺', title: 'Trishaw Balance', desc: 'Balance a stack of goods on a trishaw for a full 14 seconds through a busy market street. It gets worse the longer you hold it.', taskEmoji: '🛺',
            winLine: "The stack held all the way through the market street, weaving through the crowd without a single item sliding off.",
            loseLine: "The stack didn't survive the market crowd. Everything went everywhere, to the quiet amusement of a nearby vendor.",
            roadblockWinLine: "held that stack steady alone through the entire market street, without a single item sliding off.",
            roadblockLoseLine: "watched the whole stack go everywhere solo, nobody around to share the humiliation this time." },
        memory: { emoji: '🥁', title: 'Copy the Beat', desc: "Watch the traditional drum pattern, then tap it back exactly. One wrong beat and you retry.", taskEmoji: '🥁',
            winLine: "matched the drum pattern across all four rounds without missing a single beat.",
            loseLine: "needed a rough handful of retries, but eventually matched the drum pattern across all four rounds." },
        gamble: { emoji: '🧩', title: 'Make the Total', desc: "Complete five growing card-sum puzzles. Each round adds another shown card; choose one missing card to hit a random target exactly. Each round starts at 100 points and drops by 1 point every real-life second.", taskEmoji: '🧩',
            winLine: "managed all five playing-card rounds with sharp timing, landing close to 21 without wasting a move.",
            loseLine: "finished all five rounds, but a few totals landed well short of—or just beyond—the target." },
        language: { emoji: '📇', title: 'Cram Session', desc: "8 Malay words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.", taskEmoji: '📇',
            winLine: "matched every word from memory without a single wasted drag — actual retention, apparently, is possible under pressure.",
            loseLine: "fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there." },
        code: { emoji: '🔐', title: 'Crack the Cash Box', desc: "Guess the 4-peg code on a night market cash box. Unlimited tries, but every wrong guess costs time.", taskEmoji: '🔐',
            winLine: "cracked the cash box clean, no wasted guesses, no drama.",
            loseLine: "got there eventually, after enough wrong tries to draw a small, amused crowd." },
    },
    languageLabel: 'Malay',
    languageWords: [
        { en: 'Bus', word: 'Bas' },
        { en: 'Train', word: 'Keretapi' },
        { en: 'Ticket', word: 'Tiket' },
        { en: 'Friend', word: 'Kawan' },
        { en: 'Hot', word: 'Panas' },
        { en: 'Cold', word: 'Sejuk' },
        { en: 'Big', word: 'Besar' },
        { en: 'Small', word: 'Kecil' },
        { en: 'Yes', word: 'Ya' },
        { en: 'No', word: 'Tidak' },
        { en: 'Water', word: 'Air' },
        { en: 'Food', word: 'Makanan' },
        { en: 'Money', word: 'Wang' },
        { en: 'Help', word: 'Tolong' },
        { en: 'Today', word: 'Hari Ini' },
        { en: 'Good', word: 'Baik' },
    ],
    roadblockThemes: {
        arcade: { emoji: '🐒', taskEmoji: '🎯',
            desc: "Beat the high score on an arcade cabinet tucked into a Bukit Bintang games hall while a small crowd of locals watches and silently judges every miss.",
            winLine: "somehow cleaned out that cabinet cold, to genuine respect from the regulars.",
            loseLine: "fed that cabinet coin after coin and walked away with nothing to show for it." },
    },
    startBudget: 185,
    trainLines: ['LRT Kelana Jaya Line', 'KTM Komuter Seremban Line', 'MRT Kajang Line'],
    sightingSpots: ['Petronas Twin Towers', 'Batu Caves', 'Central Market', 'a hawker stall queue', 'the LRT platform'],
};
/* ============================================================================
   LANDMARK BANNERS

   Every landmark and airport shows a hand-built SVG silhouette banner. These are
   vector, not photographs: the whole library costs a few KB rather than the ~22 MB
   embedded photos would, it works offline, and there's no third-party image
   licensing to worry about. A location just names a shape and a palette.

   Stage is 400x104 with the ground line at y=100. Shapes are drawn in the
   silhouette colour; var(--cut) punches openings back to the sky tone.
   ============================================================================ */
const BANNER_PALETTES = {
    dusk: { sky: ['#1B2A4A', '#5B3E6B'], orb: '#F2B807', orbY: 38, sil: '#080D18', haze: '#2A2140' },
    dawn: { sky: ['#2A3550', '#D08A5C'], orb: '#FFDCA8', orbY: 44, sil: '#0A1018', haze: '#7A5240' },
    night: { sky: ['#070C18', '#1B2A4A'], orb: '#E8E4D8', orbY: 30, sil: '#04070E', haze: '#101A2E', stars: true },
    desert: { sky: ['#3E2C1A', '#D2933F'], orb: '#FFE9B0', orbY: 46, sil: '#120C08', haze: '#8A5F30' },
    monsoon: { sky: ['#1E2C36', '#55737A'], orb: '#CFE0E0', orbY: 34, sil: '#080F14', haze: '#33505A' },
    neon: { sky: ['#120E28', '#4A1D5E'], orb: '#FF5FA8', orbY: 32, sil: '#06040F', haze: '#2B1247', stars: true },
    verdant: { sky: ['#16281F', '#4E7A48'], orb: '#E9F0C0', orbY: 36, sil: '#060E09', haze: '#2C4A2E' },
    marble: { sky: ['#3A4258', '#B9A98C'], orb: '#FFF3D6', orbY: 42, sil: '#141018', haze: '#6E6350' },
};
const BANNER_SHAPES = {
    'lattice-tower': `
      <path d="M172,100 L192,42 L194,24 L197,6 L203,6 L206,24 L208,42 L228,100 L217,100 L203,56 L197,56 L183,100 Z"/>
      <rect x="189" y="52" width="22" height="4"/><rect x="184" y="70" width="32" height="4"/>`,
    'twin-towers': `
      <path d="M166,100 L168,44 L174,38 L177,14 L180,38 L186,44 L188,100 Z"/>
      <path d="M212,100 L214,44 L220,38 L223,14 L226,38 L232,44 L234,100 Z"/>
      <rect x="188" y="60" width="24" height="5"/><rect x="196" y="72" width="8" height="28"/>`,
    'dome-minaret': `
      <path d="M186,100 L186,34 L190,26 L210,26 L214,34 L214,100 Z"/>
      <path d="M190,26 Q200,10 210,26 Z"/><rect x="198" y="4" width="4" height="8"/>
      <path d="M140,100 L140,78 Q162,58 184,78 L184,100 Z"/>
      <path d="M216,100 L216,84 Q234,68 252,84 L252,100 Z"/>`,
    'temple-tiered': `
      <path d="M148,92 Q200,66 252,92 L245,92 Q200,72 155,92 Z"/><rect x="170" y="92" width="60" height="8"/>
      <path d="M158,76 Q200,54 242,76 L236,76 Q200,60 164,76 Z"/><rect x="180" y="76" width="40" height="8"/>
      <path d="M170,60 Q200,42 230,60 L225,60 Q200,48 175,60 Z"/><rect x="190" y="60" width="20" height="8"/>
      <path d="M197,42 L200,18 L203,42 Z"/>`,
    'classical-dome': `
      <path d="M176,58 Q200,26 224,58 Z"/><rect x="194" y="18" width="4" height="8"/>
      <path d="M162,58 L200,38 L238,58 Z"/>
      <rect x="168" y="58" width="7" height="40"/><rect x="182" y="58" width="7" height="40"/>
      <rect x="196" y="58" width="7" height="40"/><rect x="210" y="58" width="7" height="40"/>
      <rect x="224" y="58" width="7" height="40"/><rect x="160" y="96" width="80" height="6"/>`,
    'gate-hall': `
      <path d="M140,70 Q200,52 260,70 L252,70 Q200,58 148,70 Z"/><rect x="158" y="70" width="84" height="6"/>
      <path d="M152,56 Q200,40 248,56 L241,56 Q200,46 159,56 Z"/><rect x="166" y="76" width="68" height="24"/>
      <path d="M188,100 L188,84 Q200,74 212,84 L212,100 Z" fill="var(--cut)"/>
      <rect x="170" y="82" width="10" height="10" fill="var(--cut)"/><rect x="220" y="82" width="10" height="10" fill="var(--cut)"/>`,
    'urban-cluster': `
      <rect x="150" y="62" width="20" height="38"/><rect x="174" y="44" width="16" height="56"/>
      <rect x="194" y="28" width="18" height="72"/><rect x="216" y="52" width="14" height="48"/>
      <rect x="234" y="68" width="18" height="32"/><rect x="200" y="14" width="3" height="14"/>
      <g fill="var(--cut)" opacity="0.5"><rect x="178" y="50" width="8" height="4"/><rect x="198" y="36" width="10" height="4"/>
      <rect x="219" y="60" width="8" height="4"/><rect x="154" y="70" width="12" height="4"/>
      <rect x="238" y="76" width="10" height="4"/><rect x="178" y="62" width="8" height="4"/></g>`,
    'arch-bridge': `
      <path d="M132,100 Q200,38 268,100 L258,100 Q200,50 142,100 Z"/><rect x="128" y="72" width="144" height="5"/>
      <g stroke-width="2"><line x1="160" y1="60" x2="160" y2="74"/><line x1="180" y1="50" x2="180" y2="74"/>
      <line x1="220" y1="50" x2="220" y2="74"/><line x1="240" y1="60" x2="240" y2="74"/></g>
      <rect x="150" y="77" width="6" height="23"/><rect x="244" y="77" width="6" height="23"/>`,
    'clock-tower': `
      <path d="M182,100 L182,40 L186,32 L214,32 L218,40 L218,100 Z"/>
      <circle cx="200" cy="52" r="9" fill="var(--cut)"/>
      <path d="M186,32 L200,10 L214,32 Z"/><rect x="198" y="2" width="4" height="8"/>
      <rect x="150" y="78" width="32" height="22"/><rect x="218" y="82" width="30" height="18"/>`,
    'ferris-wheel': `
      <circle cx="200" cy="54" r="34" fill="none" stroke-width="3"/>
      <circle cx="200" cy="54" r="24" fill="none" stroke-width="1.5"/>
      <g stroke-width="1.5"><line x1="200" y1="20" x2="200" y2="88"/><line x1="166" y1="54" x2="234" y2="54"/>
      <line x1="176" y1="30" x2="224" y2="78"/><line x1="224" y1="30" x2="176" y2="78"/></g>
      <circle cx="200" cy="54" r="5"/>
      <path d="M186,100 L198,58 L202,58 L214,100 Z"/><rect x="176" y="96" width="48" height="5"/>`,
    'market-stalls': `
      <rect x="112" y="74" width="4" height="26"/><rect x="178" y="74" width="4" height="26"/>
      <path d="M106,74 Q147,56 188,74 Z"/>
      <rect x="196" y="78" width="4" height="22"/><rect x="252" y="78" width="4" height="22"/>
      <path d="M190,78 Q224,62 258,78 Z"/>
      <rect x="266" y="82" width="4" height="18"/><rect x="312" y="82" width="4" height="18"/>
      <path d="M260,82 Q291,68 322,82 Z"/>
      <circle cx="132" cy="92" r="5"/><circle cx="144" cy="95" r="4"/><circle cx="156" cy="92" r="5"/>
      <rect x="206" y="88" width="14" height="12"/><rect x="224" y="91" width="12" height="9"/>`,
    'airport-terminal': `
      <path d="M72,100 L72,82 Q94,62 128,61 L276,61 Q304,63 326,82 L326,100 Z"/>
      <path d="M72,82 Q112,55 168,55 L274,55 Q304,58 326,82 L316,82 Q292,67 264,66 L132,66 Q101,67 82,82 Z"/>
      <path d="M90,82 L310,82 L310,100 L90,100 Z"/>
      <g fill="var(--cut)" opacity=".72">
        <path d="M98,72 H130 L124,80 H92 Z"/><path d="M138,68 H172 V80 H133 Z"/>
        <path d="M181,68 H215 V80 H181 Z"/><path d="M224,68 H258 L265,80 H224 Z"/>
        <path d="M269,70 H292 L306,80 H274 Z"/>
        <rect x="103" y="87" width="18" height="7" rx="2"/><rect x="128" y="87" width="18" height="7" rx="2"/>
        <rect x="153" y="87" width="18" height="7" rx="2"/><rect x="178" y="87" width="18" height="7" rx="2"/>
        <rect x="203" y="87" width="18" height="7" rx="2"/><rect x="228" y="87" width="18" height="7" rx="2"/>
        <rect x="253" y="87" width="18" height="7" rx="2"/><rect x="278" y="87" width="18" height="7" rx="2"/>
      </g>
      <rect x="276" y="31" width="12" height="51" rx="2"/><path d="M269,32 H295 L291,22 H273 Z"/>
      <rect x="280" y="10" width="4" height="13"/><circle cx="282" cy="8" r="3"/>
      <path d="M91,43 L126,48 L140,35 L147,36 L142,49 L179,52 L183,56 L143,59 L150,72 L143,72 L128,60 L91,64 L99,54 Z"/>
      <rect x="60" y="96" width="286" height="4"/><circle cx="77" cy="92" r="2"/><circle cx="87" cy="92" r="2"/><circle cx="318" cy="92" r="2"/><circle cx="328" cy="92" r="2"/>`,
    'dunes': `
      <path d="M40,100 Q110,74 176,90 Q230,102 262,86 Q306,64 366,100 Z"/>
      <path d="M182,88 q3,-9 11,-9 q3,-8 9,-1 q4,-8 10,-1 q7,1 7,8 l-1,3 l-3,0 l-1,9 l-3,-9 l-6,0 l-1,9 l-3,-9 l-6,0 l-1,9 l-3,-9 l-4,0 l-1,9 l-3,-9 z"/>
      <path d="M219,79 q7,-3 8,-10 l4,0 q1,6 -3,11 z"/>`,
    'arched-palace': `
      <rect x="124" y="52" width="152" height="7"/>
      <g><rect x="126" y="45" width="8" height="7"/><rect x="144" y="45" width="8" height="7"/><rect x="162" y="45" width="8" height="7"/>
      <rect x="180" y="45" width="8" height="7"/><rect x="198" y="45" width="8" height="7"/><rect x="216" y="45" width="8" height="7"/>
      <rect x="234" y="45" width="8" height="7"/><rect x="252" y="45" width="8" height="7"/><rect x="266" y="45" width="8" height="7"/></g>
      <rect x="130" y="59" width="10" height="41"/><rect x="164" y="59" width="10" height="41"/>
      <rect x="198" y="59" width="10" height="41"/><rect x="232" y="59" width="10" height="41"/><rect x="264" y="59" width="10" height="41"/>
      <path d="M140,59 L164,59 L164,72 Q152,58 140,72 Z"/><path d="M174,59 L198,59 L198,72 Q186,58 174,72 Z"/>
      <path d="M208,59 L232,59 L232,72 Q220,58 208,72 Z"/><path d="M242,59 L264,59 L264,72 Q253,58 242,72 Z"/>`,
    'supertrees': `
      <path d="M157,100 L159,50 L163,50 L165,100 Z"/><ellipse cx="161" cy="50" rx="17" ry="5"/>
      <path d="M197,100 L199,34 L203,34 L205,100 Z"/><ellipse cx="201" cy="34" rx="20" ry="6"/>
      <path d="M237,100 L239,56 L243,56 L245,100 Z"/><ellipse cx="241" cy="56" rx="15" ry="5"/>
      <g stroke-width="1.6" fill="none"><path d="M161,50 L201,42"/><path d="M201,42 L241,52"/></g>
      <g stroke-width="1.2" fill="none"><path d="M161,54 L161,74"/><path d="M201,40 L201,64"/><path d="M241,60 L241,78"/></g>`,
    'mbs-towers': `
      <path d="M156,100 L160,50 L172,50 L176,100 Z"/><path d="M192,100 L196,46 L208,46 L212,100 Z"/>
      <path d="M228,100 L232,50 L244,50 L248,100 Z"/>
      <path d="M146,46 Q202,30 258,46 L258,40 Q202,24 146,40 Z"/>
      <g fill="var(--cut)" opacity="0.35"><rect x="162" y="60" width="8" height="4"/><rect x="198" y="56" width="8" height="4"/>
      <rect x="234" y="60" width="8" height="4"/><rect x="162" y="74" width="8" height="4"/><rect x="198" y="70" width="8" height="4"/>
      <rect x="234" y="74" width="8" height="4"/></g>`,
    'fountain': `
      <path d="M138,100 L146,86 L254,86 L262,100 Z"/><rect x="184" y="66" width="32" height="20"/>
      <path d="M190,66 q10,-20 20,0 z"/><circle cx="200" cy="42" r="6"/>
      <g fill="none" stroke-width="2"><path d="M200,36 q12,12 16,30"/><path d="M200,36 q-12,12 -16,30"/></g>
      <rect x="160" y="80" width="80" height="6"/>`,
    'prang': `
      <path d="M182,100 L186,72 L190,50 L196,28 L200,8 L204,28 L210,50 L214,72 L218,100 Z"/>
      <g fill="none" stroke-width="1.5"><path d="M187,70 L213,70"/><path d="M190,56 L210,56"/><path d="M194,42 L206,42"/></g>
      <path d="M154,100 L158,76 L162,58 L166,76 L170,100 Z"/><path d="M230,100 L234,76 L238,58 L242,76 L246,100 Z"/>
      <rect x="146,0" y="0" width="0" height="0"/><rect x="146" y="94" width="108" height="6"/>`,
    'round-tiered': `
      <rect x="168" y="88" width="64" height="12"/><ellipse cx="200" cy="88" rx="56" ry="8"/>
      <path d="M152,88 Q200,66 248,88 Z"/><ellipse cx="200" cy="72" rx="43" ry="6"/>
      <path d="M162,72 Q200,52 238,72 Z"/><ellipse cx="200" cy="56" rx="31" ry="5"/>
      <path d="M174,56 Q200,38 226,56 Z"/><circle cx="200" cy="33" r="5"/><rect x="198" y="22" width="4" height="8"/>`,
    'great-wall': `
      <path d="M46,100 L64,74 L104,64 L148,80 L200,56 L252,76 L296,62 L340,100 L318,100 L292,74 L252,88 L200,68 L150,92 L108,76 L70,86 L60,100 Z"/>
      <rect x="136" y="58" width="24" height="26"/><rect x="242" y="54" width="24" height="26"/>
      <g><rect x="136" y="52" width="6" height="6"/><rect x="147" y="52" width="6" height="6"/><rect x="158" y="52" width="4" height="6"/>
      <rect x="242" y="48" width="6" height="6"/><rect x="253" y="48" width="6" height="6"/><rect x="264" y="48" width="4" height="6"/></g>`,
    'plaza-monument': `
      <rect x="198" y="14" width="3" height="76"/><path d="M201,16 L228,23 L201,30 Z"/>
      <rect x="176" y="74" width="48" height="26"/><path d="M182,74 L200,56 L218,74 Z"/>
      <rect x="102" y="82" width="58" height="18"/><rect x="240" y="80" width="60" height="20"/>
      <g fill="var(--cut)" opacity="0.4"><rect x="110" y="88" width="8" height="5"/><rect x="124" y="88" width="8" height="5"/>
      <rect x="138" y="88" width="8" height="5"/><rect x="250" y="86" width="8" height="5"/><rect x="264" y="86" width="8" height="5"/>
      <rect x="278" y="86" width="8" height="5"/></g>`,
    'amphitheatre': `
      <path d="M118,100 L118,50 Q200,24 282,50 L282,72 L262,72 L262,58 Q200,38 138,58 L138,100 Z"/>
      <rect x="118" y="88" width="164" height="12"/>
      <g fill="var(--cut)"><path d="M146,62 q7,-9 14,0 l0,12 l-14,0 z"/><path d="M170,56 q7,-9 14,0 l0,12 l-14,0 z"/>
      <path d="M194,53 q7,-9 14,0 l0,12 l-14,0 z"/><path d="M218,56 q7,-9 14,0 l0,12 l-14,0 z"/>
      <path d="M242,62 q7,-9 14,0 l0,12 l-14,0 z"/>
      <path d="M146,80 q7,-8 14,0 l0,8 l-14,0 z"/><path d="M170,78 q7,-8 14,0 l0,10 l-14,0 z"/>
      <path d="M194,77 q7,-8 14,0 l0,11 l-14,0 z"/><path d="M218,78 q7,-8 14,0 l0,10 l-14,0 z"/>
      <path d="M242,80 q7,-8 14,0 l0,8 l-14,0 z"/></g>`,
    'cave-stairs': `
      <path d="M112,100 Q168,28 244,100 Z"/>
      <path d="M186,100 q0,-32 15,-32 q15,0 15,32 z" fill="var(--cut)"/>
      <g><rect x="176" y="96" width="42" height="3"/><rect x="178" y="91" width="38" height="3"/><rect x="180" y="86" width="34" height="3"/>
      <rect x="182" y="81" width="30" height="3"/><rect x="184" y="76" width="26" height="3"/><rect x="186" y="71" width="22" height="3"/></g>
      <path d="M136,100 L136,62 q7,-12 14,0 L150,100 Z"/><circle cx="143" cy="56" r="6"/>`,
    'grand-stairs': `
      <g><rect x="146" y="86" width="108" height="4"/><rect x="140" y="90" width="120" height="4"/>
      <rect x="134" y="94" width="132" height="3"/><rect x="128" y="97" width="144" height="3"/>
      <rect x="152" y="82" width="96" height="4"/><rect x="158" y="78" width="84" height="4"/>
      <rect x="164" y="74" width="72" height="4"/></g>
      <rect x="172" y="52" width="56" height="22"/>
      <path d="M170,52 L200,36 L230,52 Z"/>
      <rect x="164" y="42" width="9" height="32"/><rect x="227" y="42" width="9" height="32"/>
      <path d="M164,42 L168.5,32 L173,42 Z"/><path d="M227,42 L231.5,32 L236,42 Z"/>`,
};
function bannerStars(seed) {
    let s = seed || 7, out = '';
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 26; i++) {
        out += `<circle cx="${(rnd() * 400).toFixed(1)}" cy="${(rnd() * 58).toFixed(1)}" r="${(rnd() * 0.9 + 0.3).toFixed(2)}" fill="#fff" opacity="${(rnd() * 0.5 + 0.25).toFixed(2)}"/>`;
    }
    return out;
}
let bannerUid = 0;
const AIRPORT_ART = {
    haneda: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-59f60894842c9020.webp',
    marrakesh: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-dd73ea939a39ca66.webp',
    changi: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-efbaf39c68d11d62.webp',
    suvarnabhumi: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-59849f57f36c6801.webp',
    beijing: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-b48b140e3d4798ac.webp',
    fiumicino: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-c0eccf26b2beb374.webp',
    kualaLumpur: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-7ed1aeee225b2bf4.webp',
    'mexico-city-airport': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-d40c82ea0e6ad5ff.webp',
    'rio-galeao': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-5bf775b47196f0ab.webp',
    'capetown-airport': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-080817b0675076c5.webp',
    'jaipur-airport': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-5cb7e1adda2c7ee9.webp',
    'sydney-airport': 'https://incredible-race-sydney-assets-l6mdewlj0-edds-projects-7eb05871.vercel.app/sydney-airport.webp'
};
const LOCATION_ART = {
    'tokyo-tsukiji': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-82456ca7b46527a1.webp', 'tokyo-akihabara': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-113eb204517fb677.webp', 'tokyo-shibuya': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-3dd57ab0db515d06.webp', 'tokyo-tower': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-13d70c3acb4bdf89.webp', 'tokyo-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-cc1b707028f414c2.webp',
    'marrakesh-jemaa': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-50129cf2b9678de5.webp', 'marrakesh-camel-track': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-f544656aa9f7fe88.webp', 'marrakesh-koutoubia': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-39500b4144474b6b.webp', 'marrakesh-bahia': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-abcff036d0411218.webp', 'marrakesh-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-9414e605c38582cd.webp',
    'singapore-chinatown': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-bec6f150ae04a312.webp', 'singapore-gardens-bay': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-8e0496ecab53bcc1.webp', 'singapore-mbs': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-8a4ae35b225484a2.webp', 'singapore-merlion': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-18221ab8e2186759.webp', 'singapore-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-f6214aac8e69b7fd.webp',
    'bangkok-wat-arun': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-a177241ab9fd7bd2.webp', 'bangkok-chatuchak': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-fb6ab87af1c749a3.webp', 'bangkok-grand-palace': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-15ce6c039b396158.webp', 'bangkok-wat-pho': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-49eadf7a51e9f83d.webp', 'bangkok-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-27c35e360eca8ed8.webp',
    'beijing-temple-heaven': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-ff0cf9586d2522e6.webp', 'beijing-great-wall': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-bb0142f6fccf83a7.webp', 'beijing-forbidden-city': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-e74c9c436d1d588a.webp', 'beijing-tiananmen': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-3b96918ed9186e5f.webp', 'beijing-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-11aba86c18bcfaed.webp',
    'rome-colosseum': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-064b9576c0fa5810.webp', 'rome-trevi': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-7a816f48697ae289.webp', 'rome-pantheon': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-0da509fff4cf8713.webp', 'rome-spanish-steps': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-4b3aacf4b45a7e4b.webp', 'rome-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-31e1e44cbf9d8dfd.webp',
    'kl-petronas': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-bcf39a383f1c2e8a.webp', 'kl-batu-caves': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-234a4f853647a904.webp', 'kl-merdeka': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-3e67c0cfc443d4ed.webp', 'kl-central-market': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-2be4e70e7663d08f.webp', 'kl-race-control': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-680ebae8f056f40c.webp',
    'start-lax': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-84ddb1a673badef3.webp', 'start-jfk': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-9f69df3a58fc404a.webp', 'start-ohare': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-7b5d16a3e739325e.webp', 'start-toronto': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-8a30c00df9beb298.webp', 'start-mexico-city': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-b661b90011b944b1.webp', 'start-heathrow': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-c44f90c2eb9cf64b.webp', 'start-miami': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-f9d8b872dc8ad941.webp', 'start-vancouver': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-cab60bfb2976b41c.webp',
    generic: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-cc1b707028f414c2.webp',
    'mexico-zocalo': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-84dda7a2ea7772c5.webp',
    'mexico-xochimilco': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-6fb42ab2f378a0a0.webp',
    'mexico-coyoacan': 'assets/generated/mexico-coyoacan-build60b.png',
    'mexico-chapultepec': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-1742cb2d4447ce50.webp',
    'rio-selaron': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-d48f95528983c188.webp',
    'rio-sugarloaf': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-060aaece382f330c.webp',
    'rio-christ': 'assets/generated/rio-christ-build59.png',
    'rio-lapa': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-9c46563b4c544261.webp',
    'capetown-bokaap': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-a3d96c74627ae52f.webp',
    'capetown-table-mountain': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-4955a17a9a6dfcf9.webp',
    'capetown-signal-hill': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-fd7c0a8a76e702f8.webp',
    'capetown-waterfront': 'data:image/webp;base64,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…65376 tokens truncated…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',
    'jaipur-hawa-mahal': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-9fe98dafc6a6c452.webp',
    'jaipur-johari-bazaar': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-94f2d00e0eda5033.webp',
    'jaipur-amber-fort': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-38e643f51896f1bc.webp',
    'jaipur-jal-mahal': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-8ca1f56ac8f24cfe.webp',
    'sydney-circular-quay': 'https://incredible-race-sydney-assets-ffpdhx5x1-edds-projects-7eb05871.vercel.app/sydney-circular-quay.webp',
    'sydney-bondi': 'assets/generated/sydney-bondi-build61.png',
    'sydney-harbour-bridge': 'https://incredible-race-sydney-assets-aqsn9s67q-edds-projects-7eb05871.vercel.app/sydney-harbour-bridge.webp',
    'sydney-opera-house': 'https://incredible-race-sydney-assets-n9a8op6pv-edds-projects-7eb05871.vercel.app/sydney-opera-house.webp'
};
LOCATION_ART['capetown-waterfront'] = 'assets/generated/capetown-waterfront-build59.png';
function renderBannerSVG(spec, name, sub) {
    if (!spec)
        return '';
    const p = BANNER_PALETTES[spec.palette] || BANNER_PALETTES.dusk;
    const id = 'bnr' + (bannerUid++);
    const isAirport = spec.shape === 'airport-terminal';
    const isCheckpoint = !isAirport && /checkpoint|pit stop/i.test(sub || '');
    const artClass = isAirport ? ' airport-art' : (isCheckpoint ? ' checkpoint-art' : '');
    const kindTag = isAirport ? (sub || 'Airport') : (isCheckpoint ? (sub || 'Checkpoint') : '');
    const captionSub = kindTag && sub && kindTag.toLowerCase() === sub.toLowerCase() ? '' : sub;
    const bannerPhoto = spec.art ? (AIRPORT_ART[spec.art] || LOCATION_ART[spec.art] || LOCATION_ART.generic) : LOCATION_ART.generic;
    return `<div class="landmark-banner location-photo-art"><img class="airport-banner-photo" src="${bannerPhoto}" alt="" style="object-position:${escapeHTML(spec.position || 'center center')}"><div class="airport-banner-shade"></div>${kindTag ? `<div class="banner-kind-tag">${escapeHTML(kindTag)}</div>` : ''}${name ? `<div class="landmark-cap"><span class="lb-name">${escapeHTML(name)}</span>${captionSub ? `<span class="lb-sub">${escapeHTML(captionSub)}</span>` : ''}</div>` : ''}</div>`;
    /* Legacy vector renderer retained below as unreachable source only; all live banners return raster artwork above. */
    const runwayDetails = isAirport ? `
      <path d="M0 103 L160 84 L240 84 L400 103 Z" fill="${p.sil}" opacity=".26"/>
      <path d="M35 102 L169 87 M365 102 L231 87" stroke="#EAF6FF" stroke-width="1" opacity=".3"/>
      <g fill="#DDF4FF" opacity=".8"><circle cx="72" cy="98" r="1.3"/><circle cx="102" cy="94" r="1.1"/><circle cx="132" cy="90" r=".9"/><circle cx="328" cy="98" r="1.3"/><circle cx="298" cy="94" r="1.1"/><circle cx="268" cy="90" r=".9"/></g>` : '';
    const checkpointDetails = isCheckpoint ? `
      <path d="M8 95 C98 77 168 91 246 75 C292 66 336 67 392 54" fill="none" stroke="#F2B807" stroke-width="1.4" stroke-dasharray="4 5" opacity=".55"/>
      <g transform="translate(348 34)" filter="url(#${id}s)"><path d="M0 0 V31" stroke="#F5F0E6" stroke-width="2"/><path d="M2 2 H27 L20 10 L27 18 H2 Z" fill="#E11D3C"/><path d="M2 2 H10 V18 H2 Z" fill="#F5F0E6" opacity=".9"/></g>` : '';
    return `<div class="landmark-banner${artClass}">
      <svg viewBox="0 0 400 104" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${name || ''}"
           style="--cut:${p.haze}">
        <defs>
          <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="104">
            <stop offset="0%" stop-color="${p.sky[0]}"/><stop offset="100%" stop-color="${p.sky[1]}"/>
          </linearGradient>
          <radialGradient id="${id}h" gradientUnits="userSpaceOnUse" cx="200" cy="104" r="260">
            <stop offset="0%" stop-color="${p.haze}" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="${p.haze}" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="${id}shine" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="104"><stop stop-color="#fff" stop-opacity=".18"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
          <filter id="${id}s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#000" flood-opacity=".55"/></filter>
        </defs>
        <rect width="400" height="104" fill="url(#${id})"/>
        ${p.stars ? bannerStars(spec.shape.length * 97 + spec.palette.length) : ''}
        <circle cx="308" cy="${p.orbY}" r="13" fill="${p.orb}" opacity="0.9"/>
        <circle cx="308" cy="${p.orbY}" r="24" fill="${p.orb}" opacity="0.13"/>
        <path d="M-20 58 Q62 32 140 55 T300 49 T430 57 V78 H-20 Z" fill="#fff" opacity=".035"/>
        <path d="M-20 70 Q76 49 158 68 T326 61 T430 67 V86 H-20 Z" fill="${p.haze}" opacity=".24"/>
        <rect y="52" width="400" height="52" fill="url(#${id}h)"/>
        ${runwayDetails}${checkpointDetails}
        <g fill="${p.sil}" stroke="${p.sil}" opacity=".18" transform="translate(0 5) scale(1 .96)">${BANNER_SHAPES[spec.shape]}</g>
        <g fill="${p.sil}" stroke="${p.sil}" filter="url(#${id}s)">${BANNER_SHAPES[spec.shape]}</g>
        <rect y="95" width="400" height="9" fill="${p.sil}"/>
        <rect width="400" height="104" fill="url(#${id}shine)" pointer-events="none"/>
      </svg>
      ${kindTag ? `<div class="banner-kind-tag">${kindTag}</div>` : ''}
      ${name ? `<div class="landmark-cap"><span class="lb-name">${name}</span>${captionSub ? `<span class="lb-sub">${captionSub}</span>` : ''}</div>` : ''}
    </div>`;
}
// Shows the persistent banner strip at the top of the device for a given location.
let currentLandmarkLocation = null;
let currentLandmarkSub = '';
let previousLandmarkLocation = null;
let previousLandmarkSub = '';
let lastCompletedTravelMode = null;
function setLandmarkBanner(loc, sub) {
    const slot = document.getElementById('landmarkBanner');
    if (!slot)
        return;
    if (!loc || !loc.banner) {
        clearLandmarkBanner();
        return;
    }
    if (currentLandmarkLocation) {
        previousLandmarkLocation = currentLandmarkLocation;
        previousLandmarkSub = currentLandmarkSub || '';
    }
    currentLandmarkLocation = loc;
    currentLandmarkSub = sub || '';
    slot.innerHTML = renderBannerSVG(loc.banner, loc.place, sub);
    slot.style.display = 'block';
    document.querySelector('.device').classList.add('has-banner');
}
function clearLandmarkBanner() {
    const slot = document.getElementById('landmarkBanner');
    if (slot) {
        slot.innerHTML = '';
        slot.style.display = 'none';
    }
    currentLandmarkLocation = null;
    currentLandmarkSub = '';
    const dev = document.querySelector('.device');
    if (dev)
        dev.classList.remove('has-banner');
}
// The current leg's airport, shaped like a location so it can share the same code path.
function airportLocation() {
    return { place: currentLegData.airportName, banner: currentLegData.airportBanner };
}
// Cinematic encounter art, generated to match the banner and character assets.
// The images stay embedded so the downloaded game remains fully self-contained.
const CARTOON_EVENT_ART = {
    lost_tourist: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-c7f88cb6a55fb80f.webp',
    street_vendor: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-bb855dc30074ea4a.webp',
    broken_shoe: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-f9f1ab579c75814b.webp',
    wrong_turn: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-b9e02ec6f7818198.webp',
    street_performer: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-24224c62514f1fad.webp',
    lost_wallet: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-cebdbcc46d4fc428.webp',
    street_race: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-d0cc6c2de2604a6e.webp',
    construction_detour: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-8b5aa18e843dee31.webp',
    tuktuk_offer: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-98336a66d7db5e17.webp',
    camel_tout: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-c8a6e4615147b13c.webp',
    kopitiam_uncle: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-43fb5f7d6be672cb.webp',
    temple_donation: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-7d616c129375a96b.webp',
    platform_busker: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-30b904312b89d5d5.webp'
};
const TRAIN_STRANGER_ART = {
    aiko: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-c7c48cf028da1c83.webp',
    karim: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-5dbbab13aead5191.webp',
    mei: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-5c022bcb88812d1c.webp',
    luca: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-8aa5c7c5dd66e627.webp'
};
const COMIC_UI_ART = {
    airportAgent: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-1dc6ac2c68ef650b.webp',
    raceHost: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-1ec1a11e91cfca75.webp',
};
/* Generated, compressed and embedded so the downloaded HTML remains fully offline. */
const GENERATED_ART = {
    raceHost: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-85c6fca407127a36.webp',
    airportAgentPriya: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-4158c59318cf2096.webp',
    cuisine: {
        japan: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-fa190f0bafa4090d.webp',
        morocco: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-742363cf4e94248d.webp',
        singapore: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-e6c313538a9be2c9.webp',
        thailand: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-40e4655b8e15397f.webp',
        china: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-b17ebeb7253bef54.webp',
        italy: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-4cafe5904a309f8f.webp',
        malaysia: 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-e2fc30069c1b6128.webp'
    }
};
function renderEventArtwork(event) {
    const art = CARTOON_EVENT_ART[event.id] || CARTOON_EVENT_ART.lost_tourist;
    const loc = currentLandmarkLocation || airportLocation();
    const paletteName = (loc && loc.banner && loc.banner.palette) || 'dusk';
    const p = BANNER_PALETTES[paletteName] || BANNER_PALETTES.dusk;
    const title = escapeHTML(event.title || 'Random encounter');
    return `<div class="encounter-art" style="--event-accent:${p.orb}" role="img" aria-label="Illustration for ${title}">
      <img src="${art}" alt="" draggable="false">
      <div class="encounter-live-tag">Live Encounter</div>
    </div>`;
}
/* ============================================================================
   CITY SCHEMA + LEG BUILDER

   Adding a city used to mean hand-writing a ~63-line leg object, most of which
   was boilerplate prose that follows a fixed formula. A CITY record instead holds
   only researched FACTS plus a few flavour nouns (~20 lines); buildLeg() expands
   it into the exact same runtime shape the game already consumes, filling any
   prose the city didn't supply from the templates below.

   Every generated string can be overridden per-city via `overrides`, so a city
   with genuinely good bespoke writing keeps it — templates are the default,
   not a ceiling. The original core legs are left as literal objects on purpose:
   their prose is all custom, so converting them would gain nothing and risk
   changing text that already works.
   ============================================================================ */
// The canonical vocabulary every city is translated against, in order.
const CANON_WORDS = ['Hello', 'Thank You', 'Water', 'Food', 'Money', 'Help', 'Bathroom', 'Market',
    'Yes', 'No', 'Good', 'Bad', 'Big', 'Small', 'Friend', 'Today'];
function buildThemes(c) {
    const f = c.flavor || {};
    const dish = f.dish || 'the local speciality';
    const container = f.container || 'a locker';
    const stack = f.stack || 'crates';
    const soundName = f.sound || 'the street rhythm';
    const stall = f.stall || 'a market stall';
    return {
        reaction: {
            emoji: f.reactionEmoji || '🍜', title: f.reactionTitle || 'Grab It', taskEmoji: f.reactionEmoji || '🍜',
            actionNoun: f.reactionNoun || 'the Order',
            desc: `7 rounds with less time each round. Tap only the right ${f.reactionCategory || 'item'} — everything else is a decoy.`,
            correctEmojis: c.correctEmojis || ['🍜', '🍲'], decoyEmojis: c.decoyEmojis || ['🍣', '🍕', '🌮', '🥐'],
            winLine: `moved fast and clean through every round, picking out ${dish} without once grabbing the wrong thing.`,
            loseLine: `grabbed wrong more than once, and the stall owner noticed every single time.`
        },
        balance: {
            emoji: f.balanceEmoji || '📦', title: f.balanceTitle || 'Stack It', taskEmoji: f.balanceEmoji || '📦',
            desc: 'Keep the tower balanced for a full 14 seconds. It gets worse the longer you hold it.',
            winLine: `The stack of ${stack} held steady for the full fourteen seconds, against reasonable expectations.`,
            loseLine: `The stack of ${stack} came down in slow motion, in front of a small and very entertained crowd.`,
            roadblockWinLine: `held that stack of ${stack} steady for the full fourteen seconds alone.`,
            roadblockLoseLine: `watched the whole stack come down solo, with nobody around to share the blame.`
        },
        memory: {
            emoji: f.memoryEmoji || '🔔', title: f.memoryTitle || 'Copy the Pattern', taskEmoji: f.memoryEmoji || '🔔',
            desc: `Watch ${soundName}, then repeat it back exactly. Wrong taps only cost time.`,
            winLine: `repeated the pattern back note for note, all four rounds, without a single fumble.`,
            loseLine: `stumbled through a few wrong notes before finally getting the pattern right.`
        },
        gamble: {
            emoji: '🧩', title: 'Make the Total', taskEmoji: '🧩',
            desc: `${stall}. Complete five growing card-sum puzzles by choosing one missing card that hits a random target exactly. Every round starts at 100 points and drops by 1 point per real-life second.`,
            winLine: `hit all five random totals cleanly without wasting a choice.`,
            loseLine: `finished all five growing sum puzzles, though a few wrong card choices added time.`
        },
        language: {
            emoji: f.languageEmoji || '🗣️', title: 'Cram Session', taskEmoji: f.languageEmoji || '🗣️',
            desc: `8 ${c.language} words, 4 seconds to memorize, then match them all from memory. Every wrong drag costs time, not the attempt.`,
            winLine: `matched every word from memory without a single wasted drag.`,
            loseLine: `fumbled through a string of mismatches before finally landing all eight — retention was not the strong suit today, but you got there.`
        },
        code: {
            emoji: f.codeEmoji || '🔐', title: f.codeTitle || 'Crack the Code', taskEmoji: f.codeEmoji || '🔐',
            desc: `Guess the 4-peg code on ${container}. Unlimited tries, but every wrong guess costs time.`,
            winLine: `cracked the code clean, no wasted guesses, no drama.`,
            loseLine: `got there eventually, after enough wrong tries to draw a small, amused crowd.`
        },
    };
}
function buildRoadblockThemes(c) {
    const f = c.flavor || {};
    return {
        arcade: {
            emoji: f.arcadeEmoji || '🕹️', taskEmoji: '🎯',
            desc: f.arcadeDesc || `Beat the high score on ${f.arcade || 'a battered old arcade cabinet'}, while the owner heckles you the entire time.`,
            winLine: `somehow out-mashed a machine that has been rigged for decades, buttons rattling the whole way.`,
            loseLine: `got completely demolished by an ancient arcade cabinet in front of a small, unbothered crowd of regulars.`
        },
        language: {
            emoji: f.languageEmoji || '🗣️', taskEmoji: f.languageEmoji || '🗣️',
            desc: `Memorize eight ${c.language} words in four seconds flat, alone, then match every one from memory while the shopkeeper watches, visibly unimpressed.`,
            winLine: `matched every word from memory without missing a beat.`,
            loseLine: `needed a rough handful of tries to get there, but eventually matched all eight.`
        },
    };
}
// Deep-merges a city's optional `overrides` over the generated prose.
function applyOverrides(base, ov) {
    if (!ov)
        return base;
    Object.keys(ov).forEach(k => {
        if (ov[k] && typeof ov[k] === 'object' && !Array.isArray(ov[k]) && base[k]) {
            applyOverrides(base[k], ov[k]);
        }
        else {
            base[k] = ov[k];
        }
    });
    return base;
}
function buildLeg(c) {
    const loc = (o) => {
        const out = { emoji: o.emoji, place: o.place };
        if (o.banner)
            out.banner = o.banner;
        if (o.noTrain)
            out.noTrain = true;
        else if (typeof o.train === 'number')
            out.correctTrainIndex = o.train;
        return out;
    };
    const leg = {
        legNumber: 1,
        countryTag: c.tag, cityName: c.city, countryFull: c.country,
        currencySymbol: c.currency, flag: c.flag, airportName: c.airport,
        arrivalClock: c.arrival, tzLabel: c.tz, airportBanner: c.airportBanner,
        dest1: loc(c.dest1), dest2: loc(c.dest2), pitStop: loc(c.pitStop), yieldSpot: loc(c.yieldSpot),
        themes: buildThemes(c),
        roadblockThemes: buildRoadblockThemes(c),
        languageLabel: c.language,
        languageWords: c.languageWords || CANON_WORDS.map((en, i) => ({ en, word: c.translations[i] })),
        localFood: c.food, inflightMeals: c.meals, localDrink: c.drink,
        startBudget: c.budget, trainLines: c.trainLines, sightingSpots: c.spots,
    };
    applyOverrides(leg, c.overrides);
    return leg;
}
/* Validates a leg object and reports problems to the console instead of failing
   silently at runtime — the main defence against data typos as the city list grows. */
function validateLeg(leg) {
    const errs = [];
    const need = ['countryTag', 'cityName', 'countryFull', 'currencySymbol', 'flag', 'airportName',
        'tzLabel', 'languageLabel', 'localFood', 'localDrink', 'startBudget'];
    need.forEach(k => { if (!leg[k])
        errs.push(`missing ${k}`); });
    if (typeof leg.arrivalClock !== 'number')
        errs.push('arrivalClock must be a number');
    if (!Array.isArray(leg.trainLines) || leg.trainLines.length !== 3)
        errs.push('trainLines must have exactly 3 entries');
    if (!Array.isArray(leg.sightingSpots) || leg.sightingSpots.length < 3)
        errs.push('needs at least 3 sightingSpots');
    if (!Array.isArray(leg.inflightMeals) || leg.inflightMeals.length !== 2)
        errs.push('inflightMeals must have exactly 2 entries');
    if (!Array.isArray(leg.languageWords) || leg.languageWords.length < 8)
        errs.push('needs at least 8 languageWords');
    (leg.languageWords || []).forEach((w, i) => { if (!w.en || !w.word)
        errs.push(`languageWords[${i}] incomplete`); });
    ['dest1', 'dest2', 'pitStop', 'yieldSpot'].forEach(k => {
        const d = leg[k];
        if (!d) {
            errs.push(`missing ${k}`);
            return;
        }
        if (!d.place || !d.emoji)
            errs.push(`${k} needs both emoji and place`);
        if (k !== 'yieldSpot' && !d.noTrain) {
            if (typeof d.correctTrainIndex !== 'number')
                errs.push(`${k} needs correctTrainIndex or noTrain:true`);
            else if (d.correctTrainIndex < 0 || d.correctTrainIndex >= (leg.trainLines || []).length)
                errs.push(`${k}.correctTrainIndex out of range`);
        }
    });
    ['reaction', 'balance', 'memory', 'gamble', 'language', 'code'].forEach(t => {
        const th = (leg.themes || {})[t];
        if (!th) {
            errs.push(`missing theme: ${t}`);
            return;
        }
        ['emoji', 'title', 'desc', 'taskEmoji', 'winLine', 'loseLine'].forEach(k => {
            if (!th[k])
                errs.push(`themes.${t}.${k} missing`);
        });
    });
    if (!(leg.roadblockThemes || {}).arcade)
        errs.push('missing roadblockThemes.arcade');
    const checkBanner = (b, where) => {
        if (!b) {
            errs.push(`${where} has no banner`);
            return;
        }
        if (!BANNER_SHAPES[b.shape])
            errs.push(`${where}.banner: unknown shape "${b.shape}"`);
        if (!BANNER_PALETTES[b.palette])
            errs.push(`${where}.banner: unknown palette "${b.palette}"`);
    };
    ['dest1', 'dest2', 'pitStop', 'yieldSpot'].forEach(k => { if (leg[k])
        checkBanner(leg[k].banner, k); });
    checkBanner(leg.airportBanner, 'airport');
    if (errs.length)
        console.warn(`[leg data] ${leg.countryTag || '(unnamed)'}:\n  - ` + errs.join('\n  - '));
    return errs;
}
// New cities go here as compact records — see buildLeg() above for the schema.
const NEW_CITIES = [
    {
        tag: 'MEXICO CITY', city: 'Mexico City', country: 'Mexico City, Mexico', currency: 'MX$', flag: '🇲🇽',
        airport: 'Mexico City International Airport', airportBanner: { shape: 'airport-terminal', palette: 'dawn', art: 'mexico-city-airport', position: 'center 56%' },
        arrival: 9 * 60 + 40, tz: 'CST (GMT-6)',
        dest1: { emoji: '🏛️', place: 'Zócalo', train: 1, banner: { shape: 'plaza-monument', palette: 'dawn', art: 'mexico-zocalo', position: 'center 52%' } },
        dest2: { emoji: '🛶', place: 'Xochimilco Canals', noTrain: true, banner: { shape: 'arch-bridge', palette: 'verdant', art: 'mexico-xochimilco', position: 'center 58%' } },
        pitStop: { emoji: '🌮', place: 'Mercado de Coyoacán', train: 0, banner: { shape: 'market-stalls', palette: 'dusk', art: 'mexico-coyoacan', position: 'center 58%' } },
        yieldSpot: { emoji: '🏰', place: 'Chapultepec Castle', banner: { shape: 'arched-palace', palette: 'dawn', art: 'mexico-chapultepec', position: 'center 44%' } },
        language: 'Spanish',
        translations: ['Hola', 'Gracias', 'Agua', 'Comida', 'Dinero', 'Ayuda', 'Baño', 'Mercado', 'Sí', 'No', 'Bueno', 'Malo', 'Grande', 'Pequeño', 'Amigo', 'Hoy'],
        food: 'tacos al pastor shaved straight off the trompo, esquites in a cup, and an icy agua fresca between train rides',
        meals: ['Torta Box', 'Chicken Mole Rice'], drink: 'Horchata', budget: 3500,
        trainLines: ['Metro Line 1', 'Metro Line 2', 'Metro Line 3'],
        spots: ['Zócalo', 'Xochimilco', 'Mercado de Coyoacán', 'Chapultepec Park', 'the Metro platform'],
        correctEmojis: ['🌮', '🥙'], decoyEmojis: ['🍣', '🍕', '🥐', '🌭'],
        flavor: {
            dish: 'tacos al pastor', container: 'a locked market cash box', stack: 'produce crates', sound: 'a mariachi trumpet phrase played in the plaza', stall: 'A market trader calls the total and waits for your answer',
            reactionEmoji: '🌮', reactionTitle: 'Taco Grab', reactionCategory: 'plate', balanceEmoji: '🧺', balanceTitle: 'Crate Balance',
            memoryEmoji: '🎺', memoryTitle: 'Copy the Mariachi', languageEmoji: '📇', codeEmoji: '🔐',
            arcade: 'a retro machine in a Centro games shop',
            arcadeDesc: 'Beat the high score on a retro arcade cabinet tucked inside a Centro Histórico games shop while a tiny crowd watches every mistake.'
        }
    },
    {
        tag: 'RIO DE JANEIRO', city: 'Rio de Janeiro', country: 'Rio de Janeiro, Brazil', currency: 'R$', flag: '🇧🇷',
        airport: 'Rio de Janeiro–Galeão International Airport', airportBanner: { shape: 'airport-terminal', palette: 'dawn', art: 'rio-galeao', position: 'center 60%' },
        arrival: 16 * 60 + 10, tz: 'BRT (GMT-3)',
        dest1: { emoji: '🪜', place: 'Escadaria Selarón', train: 1, banner: { shape: 'grand-stairs', palette: 'neon', art: 'rio-selaron', position: 'center 56%' } },
        dest2: { emoji: '⛰️', place: 'Sugarloaf Mountain Cable Car', noTrain: true, banner: { shape: 'dunes', palette: 'dawn', art: 'rio-sugarloaf', position: 'center 48%' } },
        pitStop: { emoji: '🗿', place: 'Christ the Redeemer', noTrain: true, banner: { shape: 'plaza-monument', palette: 'dusk', art: 'rio-christ', position: 'center 48%' } },
        yieldSpot: { emoji: '🌉', place: 'Arcos da Lapa', banner: { shape: 'arch-bridge', palette: 'night', art: 'rio-lapa', position: 'center 58%' } },
        language: 'Portuguese',
        translations: ['Olá', 'Obrigado', 'Água', 'Comida', 'Dinheiro', 'Ajuda', 'Banheiro', 'Mercado', 'Sim', 'Não', 'Bom', 'Mau', 'Grande', 'Pequeno', 'Amigo', 'Hoje'],
        food: 'pão de queijo, grilled espetinho, and an açaí cup eaten too quickly between taxi rides',
        meals: ['Pão de Queijo Box', 'Feijoada Rice Bowl'], drink: 'Guaraná', budget: 900,
        trainLines: ['Metro Line 1', 'Metro Line 2', 'SuperVia Santa Cruz Line'],
        spots: ['Escadaria Selarón', 'Sugarloaf Mountain', 'Arcos da Lapa', 'a beach kiosk queue', 'the Metro platform'],
        correctEmojis: ['🍢', '🥩'], decoyEmojis: ['🍣', '🍕', '🌮', '🥐'],
        flavor: {
            dish: 'espetinho', container: 'a locked beach kiosk safe', stack: 'beach coolers', sound: 'a samba drum pattern from the bloco', stall: 'The street vendor sets out the number cards on a plastic table',
            reactionEmoji: '🍢', reactionTitle: 'Skewer Dash', reactionCategory: 'skewer', balanceEmoji: '🧊', balanceTitle: 'Cooler Balance',
            memoryEmoji: '🥁', memoryTitle: 'Copy the Samba', languageEmoji: '📇', codeEmoji: '🔐',
            arcade: 'a battered machine in a Lapa bar arcade',
            arcadeDesc: 'Beat the high score on a battered old cabinet tucked inside a Lapa bar arcade while the regulars judge every miss over tiny coffees.'
        }
    },
    {
        tag: 'CAPE TOWN', city: 'Cape Town', country: 'Cape Town, South Africa', currency: 'R', flag: '🇿🇦',
        airport: 'Cape Town International Airport', airportBanner: { shape: 'airport-terminal', palette: 'monsoon', art: 'capetown-airport', position: 'center 54%' },
        arrival: 12 * 60 + 25, tz: 'SAST (GMT+2)',
        dest1: { emoji: '🏘️', place: 'Bo-Kaap', noTrain: true, banner: { shape: 'urban-cluster', palette: 'dawn', art: 'capetown-bokaap', position: 'center 54%' } },
        dest2: { emoji: '🏔️', place: 'Table Mountain Aerial Cableway', noTrain: true, banner: { shape: 'dunes', palette: 'verdant', art: 'capetown-table-mountain', position: 'center 48%' } },
        pitStop: { emoji: '🌄', place: 'Signal Hill', noTrain: true, banner: { shape: 'dunes', palette: 'dusk', art: 'capetown-signal-hill', position: 'center 50%' } },
        yieldSpot: { emoji: '🎡', place: 'V&A Waterfront', banner: { shape: 'urban-cluster', palette: 'dawn', art: 'capetown-waterfront', position: 'center 55%' } },
        language: 'Afrikaans',
        translations: ['Hallo', 'Dankie', 'Water', 'Kos', 'Geld', 'Help', 'Badkamer', 'Mark', 'Ja', 'Nee', 'Goed', 'Sleg', 'Groot', 'Klein', 'Vriend', 'Vandag'],
        food: 'a Gatsby sandwich split two ways, hot koesisters, and an ice-cold ginger beer at the waterfront',
        meals: ['Bobotie Rice Bowl', 'Chicken Gatsby Roll'], drink: 'Rooibos Iced Tea', budget: 1800,
        trainLines: ['Metrorail Southern Line', 'Metrorail Central Line', 'MyCiTi Civic Route'],
        spots: ['Bo-Kaap', 'Table Mountain', 'Signal Hill', 'the V&A Waterfront', 'the station platform'],
        correctEmojis: ['🥪', '🍞'], decoyEmojis: ['🍣', '🍕', '🌮', '🥐'],
        flavor: {
            dish: 'a Gatsby sandwich', container: 'a locked harbour tool chest', stack: 'fish crates', sound: 'a Cape ghoema drum rhythm', stall: 'A Greenmarket trader fans out the number cards and waits',
            reactionEmoji: '🥪', reactionTitle: 'Gatsby Grab', reactionCategory: 'roll', balanceEmoji: '🐟', balanceTitle: 'Crate Carry',
            memoryEmoji: '🥁', memoryTitle: 'Copy the Ghoema', languageEmoji: '📇', codeEmoji: '🔐',
            arcade: 'an old machine tucked into a waterfront games room',
            arcadeDesc: 'Beat the high score on an old arcade machine tucked into a waterfront games room while tourists and locals both stop to watch.'
        }
    },
    {
        tag: 'JAIPUR', city: 'Jaipur', country: 'Jaipur, India', currency: '₹', flag: '🇮🇳',
        airport: 'Jaipur International Airport', airportBanner: { shape: 'airport-terminal', palette: 'desert', art: 'jaipur-airport', position: 'center 58%' },
        arrival: 11 * 60 + 45, tz: 'IST (GMT+5:30)',
        dest1: { emoji: '🪟', place: 'Hawa Mahal', noTrain: true, banner: { shape: 'arched-palace', palette: 'dawn', art: 'jaipur-hawa-mahal', position: 'center 62%' } },
        dest2: { emoji: '🛍️', place: 'Johari Bazaar', noTrain: true, banner: { shape: 'market-stalls', palette: 'dusk', art: 'jaipur-johari-bazaar', position: 'center 56%' } },
        pitStop: { emoji: '🏰', place: 'Amber Fort', noTrain: true, banner: { shape: 'arched-palace', palette: 'desert', art: 'jaipur-amber-fort', position: 'center 47%' } },
        yieldSpot: { emoji: '🏯', place: 'Jal Mahal', banner: { shape: 'classical-dome', palette: 'dawn', art: 'jaipur-jal-mahal', position: 'center 52%' } },
        language: 'Hindi',
        translations: ['Namaste', 'Dhanyavaad', 'Paani', 'Khana', 'Paisa', 'Madad', 'Shauchalaya', 'Bazaar', 'Haan', 'Nahin', 'Achha', 'Bura', 'Bada', 'Chhota', 'Dost', 'Aaj'],
        food: 'pyaaz kachori, a thali with dal baati churma, and a clay cup of chilled lassi',
        meals: ['Pyaaz Kachori Box', 'Dal Baati Plate'], drink: 'Sweet Lassi', budget: 12000,
        trainLines: ['Pink Line Metro', 'Chandpole Route', 'Badi Chaupar Route'],
        spots: ['Hawa Mahal', 'Johari Bazaar', 'Amber Fort', 'a lassi stall queue', 'the metro platform'],
        correctEmojis: ['🥟', '🫓'], decoyEmojis: ['🍣', '🍕', '🌮', '🥐'],
        flavor: {
            dish: 'pyaaz kachori', container: "a jeweller's locked box", stack: 'brass pots', sound: 'a dholak rhythm from the courtyard', stall: 'The bazaar shopkeeper waits while you finish the number cards',
            reactionEmoji: '🥟', reactionTitle: 'Kachori Grab', reactionCategory: 'snack', balanceEmoji: '🏺', balanceTitle: 'Pot Balance',
            memoryEmoji: '🥁', memoryTitle: 'Copy the Dhol', languageEmoji: '📇', codeEmoji: '🔐',
            arcade: 'an aging game cabinet inside a market arcade',
            arcadeDesc: 'Beat the high score on an aging game cabinet tucked into a Pink City market arcade while curious shoppers crowd the doorway.'
        }
    },
    {
        tag: 'SYDNEY', city: 'Sydney', country: 'Sydney, Australia', currency: 'A$', flag: '🇦🇺',
        airport: 'Sydney Kingsford Smith Airport', airportBanner: { shape: 'airport-terminal', palette: 'dawn', art: 'sydney-airport', position: 'center 58%' },
        arrival: 8 * 60 + 20, tz: 'AEST (GMT+10)',
        dest1: { emoji: '⛴️', place: 'Circular Quay', train: 0, banner: { shape: 'arch-bridge', palette: 'dawn', art: 'sydney-circular-quay', position: 'center 58%' } },
        dest2: { emoji: '🏖️', place: 'Bondi Beach', noTrain: true, banner: { shape: 'amphitheatre', palette: 'dawn', art: 'sydney-bondi', position: 'center 52%' } },
        pitStop: { emoji: '🌉', place: 'Sydney Harbour Bridge', noTrain: true, banner: { shape: 'arch-bridge', palette: 'dusk', art: 'sydney-harbour-bridge', position: '75% 48%' } },
        yieldSpot: { emoji: '🎼', place: 'Sydney Opera House', banner: { shape: 'classical-dome', palette: 'dawn', art: 'sydney-opera-house', position: 'center 52%' } },
        language: 'Australian slang',
        translations: ["How ya goin'?", 'Cheers', 'Wetting your whistle', 'Tucker', 'Dosh', 'Give us a hand', 'Loo', 'Servo', 'Too right', 'Yeah nah', 'Ripper', 'Dodgy', 'Massive', 'Teeny', 'Cobber', 'Arvo'],
        languageWords: [
            { en: 'Hello', word: "How ya goin'?" },
            { en: 'Thank You', word: 'Cheers' },
            { en: 'Water', word: 'Wetting your whistle' },
            { en: 'Food', word: 'Tucker' },
            { en: 'Money', word: 'Dosh' },
            { en: 'Help', word: 'Give us a hand' },
            { en: 'Bathroom', word: 'Loo' },
            { en: 'Market', word: 'Servo' },
            { en: 'Yes', word: 'Too right' },
            { en: 'No', word: 'Yeah nah' },
            { en: 'Good', word: 'Ripper' },
            { en: 'Bad', word: 'Dodgy' },
            { en: 'Big', word: 'Massive' },
            { en: 'Small', word: 'Teeny' },
            { en: 'Friend', word: 'Cobber' },
            { en: 'Today', word: 'Arvo' }
        ],
        food: 'a meat pie with tomato sauce, hot chips by the harbour, and an iced flat white grabbed on the run',
        meals: ['Meat Pie Box', 'Chicken Schnitty Roll'], drink: 'Flat White', budget: 210,
        trainLines: ['T1 North Shore Line', 'T2 Inner West Line', 'T4 Eastern Suburbs Line'],
        spots: ['Circular Quay', 'Bondi Beach', 'Sydney Opera House', 'a ferry queue', 'the train platform'],
        correctEmojis: ['🥧', '🍟'], decoyEmojis: ['🍣', '🍕', '🌮', '🥐'],
        flavor: {
            dish: 'meat pies', container: 'a locked surf club locker', stack: 'lifesaving rescue boards', sound: 'a clap-and-stomp pattern from the quay buskers', stall: 'A harbour kiosk worker slides the number cards across the counter',
            reactionEmoji: '🥧', reactionTitle: 'Pie Grab', reactionCategory: 'pie', balanceEmoji: '🏄', balanceTitle: 'Board Balance',
            memoryEmoji: '👏', memoryTitle: 'Copy the Buskers', languageEmoji: '📇', codeEmoji: '🔐',
            arcade: 'a battered machine inside a beachside amusement hall',
            arcadeDesc: 'Set a new high score on a battered Bondi arcade cabinet inside a noisy beachside amusement hall.'
        }
    }
];
const ALL_LEGS = [TOKYO_LEG, MOROCCO_LEG, SINGAPORE_LEG, BANGKOK_LEG, BEIJING_LEG, ROME_LEG, KUALA_LUMPUR_LEG].concat(NEW_CITIES.map(buildLeg));
const RACE_LEG_LIMIT = 10;
const MAX_LEGS_PER_RACE = Math.min(RACE_LEG_LIMIT, ALL_LEGS.length);
ALL_LEGS.forEach(validateLeg);
let LEG_SEQUENCE = [...ALL_LEGS];
const LANDMARK_ROLE_KEYS = ['dest1', 'dest2', 'yieldSpot', 'pitStop'];
function shuffledCopy(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
function raceLocationCopy(location) {
    const copy = { ...location, banner: location.banner ? { ...location.banner } : location.banner };
    return copy;
}
function buildRaceLeg(baseLeg, savedRoles, randomizeRoles) {
    const canonicalLocations = LANDMARK_ROLE_KEYS.map(key => raceLocationCopy(baseLeg[key]));
    let assigned = null;
    if (savedRoles) {
        const byPlace = new Map(canonicalLocations.map(location => [location.place, location]));
        const restored = LANDMARK_ROLE_KEYS.map(key => byPlace.get(savedRoles[key]));
        if (restored.every(Boolean) && new Set(restored.map(location => location.place)).size === LANDMARK_ROLE_KEYS.length)
            assigned = restored;
    }
    if (!assigned)
        assigned = randomizeRoles ? shuffledCopy(canonicalLocations) : canonicalLocations;
    const leg = { ...baseLeg };
    LANDMARK_ROLE_KEYS.forEach((key, index) => { leg[key] = assigned[index]; });
    return leg;
}
function landmarkRoleSnapshot(leg) {
    const snapshot = { tag: leg.countryTag };
    LANDMARK_ROLE_KEYS.forEach(key => { snapshot[key] = leg[key].place; });
    return snapshot;
}
function pickLegSequence() {
    LEG_SEQUENCE = shuffledCopy(ALL_LEGS).slice(0, MAX_LEGS_PER_RACE).map(leg => buildRaceLeg(leg, null, true));
    LEG_SEQUENCE.forEach((leg, i) => { leg.legNumber = i + 1; });
}
pickLegSequence();
function selectedRaceCountryCount() {
    return new Set(LEG_SEQUENCE.map(leg => {
        const parts = String(leg.countryFull || leg.countryTag || '').split(',');
        return parts[parts.length - 1].trim().toUpperCase();
    }).filter(Boolean)).size;
}
function numberWordUpper(n) {
    const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];
    return words[n] || String(n);
}
function syncRaceCountCopy() {
    const countryCount = selectedRaceCountryCount();
    const titleCount = document.getElementById('titleCountryCount');
    const titleSummary = document.getElementById('titleRaceSummary');
    const introTotal = document.getElementById('introLegOfTotal');
    if (titleCount)
        titleCount.textContent = countryCount;
    if (titleSummary)
        titleSummary.textContent = `Race across ${countryCount} countries, outthink eleven rival teams, and reach the final mat first.`;
    if (introTotal && currentLegData)
        introTotal.textContent = `Leg ${currentLegData.legNumber} of ${LEG_SEQUENCE.length}`;
}
let currentLegData = LEG_SEQUENCE[0];
const TASK_EVENT_ART = { "reaction": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-8ee2f761460ec163.webp", "rhythm": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-a4a699f2dc2c360a.webp", "balance": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-4379b985d104f9fe.webp", "memory": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-1abedf39e9f9309d.webp", "gamble": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-b756dd7a788c90cc.webp", "language": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-60a5198877a6ece1.webp", "code": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-558fd7463804bb05.webp", "arcade": "https://eddmooresalt.github.io/incredible-race/assets/generated/art-014cf29adbf25cd7.webp" };
const FAST_FORWARD_ART = 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-a3bb90b4949e3e4f.webp';
/* ---------- DETOUR MINIGAME POOL (randomized per new game, not per country) ---------- */
const RHYTHM_THEME = { emoji: '🎵', title: 'Beat the Route', desc: 'Hit the four lanes as the notes cross the gold line. Keep your combo and miss as few beats as possible.', taskEmoji: '🎵', winLine: 'locked onto the beat and cleared the rhythm course with a strong combo.', loseLine: 'finished the rhythm course, but the missed notes added costly time.' };
const CULTURAL_MATCH_SETS = {
    TOKYO: [['⛩️', 'Torii'], ['🍣', 'Sushi'], ['🗻', 'Mount Fuji'], ['🚅', 'Shinkansen'], ['🏮', 'Lantern'], ['👘', 'Kimono'], ['🍵', 'Matcha'], ['🌸', 'Sakura'], ['🍜', 'Ramen'], ['💴', 'Yen'], ['🐟', 'Koi'], ['🎋', 'Tanabata']],
    MARRAKESH: [['🍲', 'Tagine'], ['🍵', 'Mint Tea'], ['🐪', 'Camel'], ['🏮', 'Lantern'], ['🧶', 'Carpet'], ['🌶️', 'Spices'], ['🌴', 'Palm'], ['🏠', 'Riad'], ['👞', 'Babouche'], ['🍚', 'Couscous'], ['🔷', 'Zellige'], ['🛍️', 'Souk']],
    SINGAPORE: [['🦁', 'Merlion'], ['🍚', 'Chicken Rice'], ['🚇', 'MRT'], ['🌳', 'Supertree'], ['🥥', 'Kaya'], ['☕', 'Kopi'], ['🌶️', 'Chilli Crab'], ['🏙️', 'Marina Bay'], ['🛶', 'Bumboat'], ['🌺', 'Orchid'], ['🍜', 'Laksa'], ['🦦', 'Otter']],
    BANGKOK: [['🛕', 'Wat Arun'], ['🛺', 'Tuk-tuk'], ['🥭', 'Mango'], ['🐘', 'Elephant'], ['🍜', 'Pad Thai'], ['🌶️', 'Som Tam'], ['🪷', 'Lotus'], ['🚤', 'Long-tail Boat'], ['🙏', 'Wai'], ['🧺', 'Floating Market'], ['🥊', 'Muay Thai'], ['🍵', 'Thai Tea']],
    BEIJING: [['🏯', 'Forbidden City'], ['🧱', 'Great Wall'], ['🦆', 'Peking Duck'], ['🐼', 'Panda'], ['🏮', 'Lantern'], ['🥟', 'Dumpling'], ['🚲', 'Bicycle'], ['🫖', 'Tea Pot'], ['🐉', 'Dragon'], ['🎐', 'Kite'], ['🧧', 'Red Packet'], ['🥢', 'Chopsticks']],
    ROME: [['🏟️', 'Colosseum'], ['🍝', 'Pasta'], ['🍕', 'Pizza'], ['⛲', 'Trevi Fountain'], ['🛵', 'Vespa'], ['☕', 'Espresso'], ['🍨', 'Gelato'], ['🏛️', 'Pantheon'], ['🍅', 'Tomato'], ['🧀', 'Pecorino'], ['🏺', 'Amphora'], ['🌿', 'Laurel']],
    'KUALA LUMPUR': [['🏙️', 'Petronas'], ['🍚', 'Nasi Lemak'], ['🍢', 'Satay'], ['☕', 'Teh Tarik'], ['🛕', 'Batu Caves'], ['🛍️', 'Central Market'], ['🥥', 'Coconut'], ['🚆', 'LRT'], ['🌺', 'Hibiscus'], ['🍜', 'Curry Mee'], ['🏮', 'Night Market'], ['🐒', 'Macaque']],
    'MEXICO CITY': [['🌮', 'Taco'], ['🏛️', 'Zócalo'], ['💀', 'Calavera'], ['🌵', 'Cactus'], ['🎺', 'Mariachi'], ['🛶', 'Trajinera'], ['🥑', 'Avocado'], ['🌽', 'Maize'], ['🎨', 'Mural'], ['🦅', 'Eagle'], ['🫔', 'Tamale'], ['🏰', 'Chapultepec']],
    'RIO DE JANEIRO': [['🗿', 'Christ Statue'], ['⛰️', 'Sugarloaf'], ['🏖️', 'Copacabana'], ['⚽', 'Football'], ['🥁', 'Samba'], ['🚡', 'Cable Car'], ['🍓', 'Açaí'], ['🍢', 'Espetinho'], ['🩴', 'Flip-flops'], ['🌴', 'Palm'], ['🎭', 'Carnival'], ['🏄', 'Surf']],
    'CAPE TOWN': [['🏔️', 'Table Mountain'], ['🐧', 'Penguin'], ['🌊', 'Atlantic'], ['🥪', 'Gatsby'], ['🍵', 'Rooibos'], ['🎨', 'Bo-Kaap'], ['🚡', 'Cableway'], ['🍇', 'Vineyard'], ['🦭', 'Seal'], ['🌼', 'Protea'], ['⚓', 'Waterfront'], ['🥁', 'Ghoema']],
    JAIPUR: [['🪟', 'Hawa Mahal'], ['🏰', 'Amber Fort'], ['🏺', 'Brass Pot'], ['🥟', 'Kachori'], ['🥛', 'Lassi'], ['🐘', 'Elephant'], ['💎', 'Gemstone'], ['🧵', 'Block Print'], ['🪷', 'Lotus'], ['🥁', 'Dholak'], ['🌶️', 'Spices'], ['🕌', 'Jal Mahal']],
    SYDNEY: [['🎼', 'Opera House'], ['🌉', 'Harbour Bridge'], ['🏖️', 'Bondi'], ['🥧', 'Meat Pie'], ['🏄', 'Surfboard'], ['⛴️', 'Ferry'], ['🐨', 'Koala'], ['🦘', 'Kangaroo'], ['☕', 'Flat White'], ['🛟', 'Lifesaver'], ['🐚', 'Seashell'], ['🌊', 'Harbour']],
};
function culturalMatchTheme() {
    const city = currentLegData.cityName;
    return { emoji: '🃏', title: `Match ${city}`, desc: `Flip two cards at a time and match all twelve ${city} cultural pairs. Every wrong pair adds four race minutes, so memory mistakes can directly cost places.`, taskEmoji: '🃏', winLine: `matched all twelve ${city} pairs with a clean read of the board.`, loseLine: `eventually cleared all twelve ${city} pairs, but the wrong flips fed costly minutes into the race clock.` };
}
function getTaskTheme(type) {
    if (type === 'rhythm')
        return RHYTHM_THEME;
    if (type === 'match')
        return culturalMatchTheme();
    return currentLegData.themes[type];
}
function taskArtworkFor(type, fallback) {
    return TASK_EVENT_ART[type] || (type === 'match' ? TASK_EVENT_ART.memory : TASK_EVENT_ART[fallback || 'reaction']);
}
/* Race-wide task scheduler: unseen mechanics are prioritised early, and the
   immediately previous mechanic is excluded. The Roadblock also excludes both
   Detour choices, so the chosen Detour can never repeat at the next task. */
const DETOUR_POOL = ['reaction', 'rhythm', 'balance', 'memory', 'match', 'gamble', 'language', 'code'];
const ROADBLOCK_POOL = ['arcade', 'reaction', 'rhythm', 'balance', 'memory', 'match', 'gamble', 'language', 'code'];
let experiencedTaskTypes = new Set();
let taskPlayHistory = [];
let lastCompletedTaskType = null;
let detourCompletedType = null;
let detourTypeA, detourTypeB, roadblockType;
function shuffled(items) { return [...items].sort(() => Math.random() - .5); }
function chooseScheduledTask(pool, exclusions, preferUnseen = true) {
    const excluded = new Set((exclusions || []).filter(Boolean));
    let available = pool.filter(type => !excluded.has(type));
    if (!available.length)
        available = pool.filter(type => type !== lastCompletedTaskType);
    if (!available.length)
        available = [...pool];
    if (preferUnseen) {
        const unseen = available.filter(type => !experiencedTaskTypes.has(type));
        if (unseen.length)
            available = unseen;
    }
    return shuffled(available)[0];
}
function pickDetourTypes() {
    const baseExclusions = [lastCompletedTaskType];
    const unseen = DETOUR_POOL.filter(t => !experiencedTaskTypes.has(t) && !baseExclusions.includes(t));
    // When exactly one unseen mechanic remains, reserve it for the compulsory
    // Roadblock instead of risking that the player skips it as a Detour option.
    if (unseen.length === 1) {
        detourTypeA = chooseScheduledTask(DETOUR_POOL, [...baseExclusions, unseen[0]], false);
        detourTypeB = chooseScheduledTask(DETOUR_POOL, [...baseExclusions, unseen[0], detourTypeA], false);
    }
    else {
        detourTypeA = chooseScheduledTask(DETOUR_POOL, baseExclusions, true);
        detourTypeB = chooseScheduledTask(DETOUR_POOL, [...baseExclusions, detourTypeA], true);
    }
}
function pickRoadblockType() {
    roadblockType = chooseScheduledTask(ROADBLOCK_POOL, [lastCompletedTaskType, detourTypeA, detourTypeB], true);
}
function recordTaskExperience(type) {
    if (!type)
        return;
    experiencedTaskTypes.add(type);
    taskPlayHistory.push(type);
    lastCompletedTaskType = type;
}
pickDetourTypes();
pickRoadblockType();
function applyLegTheme() {
    document.getElementById('legTagText').innerHTML = `LEG ${String(currentLegData.legNumber).padStart(2, '0')} &middot; ${currentLegData.countryTag}`;
    document.getElementById('currencySymbol').textContent = currentLegData.currencySymbol;
    const themeA = getTaskTheme(detourTypeA);
    const themeB = getTaskTheme(detourTypeB);
    const detourHeadline = document.getElementById('detourHeadline');
    detourHeadline.innerHTML = `${themeA.title} <em>or</em> ${themeB.title}`;
    detourHeadline.classList.toggle('long-detour-headline', `${themeA.title} or ${themeB.title}`.length > 24);
    document.getElementById('detourAArt').src = taskArtworkFor(detourTypeA, 'reaction');
    const detourATitle = document.getElementById('detourATitle');
    detourATitle.textContent = themeA.title;
    detourATitle.classList.toggle('long-task-title', themeA.title.length >= 12);
    document.getElementById('detourADesc').textContent = themeA.desc;
    document.getElementById('detourBArt').src = taskArtworkFor(detourTypeB, 'balance');
    const detourBTitle = document.getElementById('detourBTitle');
    detourBTitle.textContent = themeB.title;
    detourBTitle.classList.toggle('long-task-title', themeB.title.length >= 12);
    document.getElementById('detourBDesc').textContent = themeB.desc;
    // Keep every mechanic screen's labels in sync regardless of whether it's active this playthrough
    document.getElementById('stackEmoji').textContent = currentLegData.themes.balance.emoji;
    document.getElementById('slurpEyebrowLabel').textContent = currentLegData.themes.reaction.title;
    document.getElementById('stackEyebrowLabel').textContent = currentLegData.themes.balance.title;
    document.getElementById('simonEyebrowLabel').textContent = currentLegData.themes.memory.title;
    document.getElementById('gambleEyebrowLabel').textContent = currentLegData.themes.gamble.title;
    if (!roadblockType || [detourTypeA, detourTypeB].includes(roadblockType))
        pickRoadblockType();
    const roadblockTheme = getRoadblockTheme(roadblockType);
    document.getElementById('roadblockArt').src = taskArtworkFor(roadblockType, 'arcade');
    const roadblockTitle = document.getElementById('roadblockTitle');
    roadblockTitle.textContent = roadblockTheme.title;
    roadblockTitle.classList.toggle('long-task-title', roadblockTheme.title.length >= 12);
    document.getElementById('roadblockDesc').textContent = roadblockTheme.desc;
}
function startDetourGame(slot) {
    activeTaskContext = 'detour';
    const type = slot === 'A' ? detourTypeA : detourTypeB;
    if (type === 'reaction')
        startSlurp();
    else if (type === 'rhythm')
        startRhythm('detour');
    else if (type === 'balance')
        startStack();
    else if (type === 'memory')
        startSimon();
    else if (type === 'match')
        startCulturalMatch('detour');
    else if (type === 'gamble')
        startGamble();
    else if (type === 'language')
        startLanguageGame('detour');
    else if (type === 'code')
        startCode('detour');
}
let rivalTimes = [];
let rivalSyncPlayerElapsed = 0;
let isFirstAtCheckpoint = false;
let partnerName = '';
let partnerRelationship = 'Randomly Paired';
let partnerGender = 'male';
let partnerTone = 'tan';
let partnerCostume = 'flight';
let playerGender = 'male';
let playerTone = 'medium';
let playerCostume = 'racer';
let partnerAvatar = 'custom';
const AI_AVATAR_ART = { "racer": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-ef46f65506e35be9.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-9ebc4cdd98206b90.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-af3c33bb79724549.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-cb37b42761d23146.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-bb3c197769e2cbba.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-eaf5ed2196babdb4.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-3b998ba209f0d0b5.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-fb6b5ea0f7823ecc.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-a1df11c853c27fa6.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-167fcd9e577a6ced.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-46a4a4afdce12d90.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-3da42203f59c0048.webp"], "street": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-13cf64c5dd4d7c59.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-45d73293ed852068.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-c53790f3e360e0e6.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-7e07efb0971eea20.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-c66a4986f08d98cb.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-70f8e6d6a184ce0d.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-d361fc1e8d0d8932.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-9c164eafb3312910.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-bc477693daf52827.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-7a2ff3239cee5273.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-232a6957cffbbfb8.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-5d9082c1b24f22e0.webp"], "athletic": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-d1033f704ceb0f40.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-f97dc7033ba9170d.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-3ed47e8cf9712648.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-e42da1a0469cd8bf.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-903b468e52d8aceb.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-2496ffcaa329ba22.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-36973fa3bb6aeab2.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-2932ee83fb52432a.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-12a1122ba0286374.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-755c80d9e8247211.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-d041aaa9cec92bd1.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-b0d5d3c699762d96.webp"], "explorer": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-93be0ffbdc29f957.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-234c7a78db24b167.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-19e4ec39a6714a8b.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-13f436106062af7b.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-538469096b627bb4.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-76da7c1ca13e8d90.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-30111bdee3b86987.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-a8e1760c2f07124e.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-f141d984fa4fa2da.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-a2a8a160ee2eac8d.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-217163985f807e5c.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-7061d31fd3d83c88.webp"], "flight": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-c5b6c66d12e0cc03.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-2bfea77a0d159605.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-12457fc2a8849f49.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-41c81603c96cc88f.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-7546f69bd584590f.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-882b7753c5e96d92.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-d26cc84af80b90e5.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-e90457d13ad8b8f4.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-9488074cfe3733a5.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-c64c3f7a068be53b.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-feaf07a075bc25a6.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-5a7c6af6caac9635.webp"], "smart": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-6af2dde70f4abfa1.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-adda80f8ee67ac0a.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-477427bc945beac6.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-caaa9819bde94ee8.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-81c670058a33fe35.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-7bfc28164fe53513.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-fcdccaf1aea9ffd9.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-0984fc0ed7cedadd.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-c4d13cd482b88ef5.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-0a93331e3f875977.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-76c9a26aff416573.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-93b7969c5bd6f2f1.webp"], "rain": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-62bfe7d9fb344fd2.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-35ffeecad7cf6a03.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-aa2212de3ffbf8d5.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-422c906682baa5aa.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-0b4bbf23383dde81.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-07030df605cd1f82.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-17bdc6fbf7a2ce03.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-44382937f11bb19e.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-18b2204f7060fa9b.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-02c5bfe9785316c9.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-81f3149fcff144a4.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-08b6e43c8f739f1e.webp"], "winter": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-0099d9348f3965bf.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-d814f444cf9a0bdb.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-de4dee534e4f8404.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-b412ab8de747d87d.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-0dc3a4b2028445d1.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-2d516f2d46fb0984.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-111e93771567f514.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-915af65e3be1108a.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-ef948169086f4a4f.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-29e053fc40be2c75.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-f3bea6c38a444de4.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-03b67b1d860b95b9.webp"], "festival": ["https://eddmooresalt.github.io/incredible-race/assets/generated/art-b389b3b6682d6501.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-6f5e631907e1061c.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-81c87d94af13a6bb.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-4388fb59f4bbb678.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-57ea26f5d310461c.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-1892b1e008e87a32.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-1ea634e9502dd3e6.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-45c335b848ea8b3f.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-020cb84fe050e44d.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-a75ad83fc2c21223.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-4b0f36d0d6fd0c99.webp", "https://eddmooresalt.github.io/incredible-race/assets/generated/art-02b1a965496636bd.webp"] };
const AVATAR_GENDER_ROW = { male: 0, female: 1, nonbinary: 2 };
const AVATAR_TONE_COL = { light: 0, medium: 1, tan: 2, deep: 3 };
function renderRacerAvatar(gender, tone, costume) {
    const collection = AI_AVATAR_ART[costume] || AI_AVATAR_ART.racer;
    const row = AVATAR_GENDER_ROW[gender] ?? 0;
    const col = AVATAR_TONE_COL[tone] ?? 1;
    const src = collection[row * 4 + col] || collection[0];
    return `<img class="racer-avatar-photo" src="${src}" alt="Custom AI-generated racer portrait">`;
}
function partnerFirstName() {
    const trimmed = (partnerName || '').trim();
    return trimmed ? trimmed.split(' ')[0] : 'Partner';
}
function cleanPartnerName(value) {
    return String(value ?? '').replace(/[<>]/g, '').trim().replace(/\s+/g, ' ').slice(0, 24);
}
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
}
function genderAvatar() { return 'custom'; }
function updateSetupPreview() {
    const values = {
        playerGender: document.getElementById('playerGenderSelect').value,
        playerTone: document.getElementById('playerToneSelect').value,
        playerCostume: document.getElementById('playerCostumeSelect').value,
        partnerGender: document.getElementById('partnerGenderSelect').value,
        partnerTone: document.getElementById('partnerToneSelect').value,
        partnerCostume: document.getElementById('partnerCostumeSelect').value,
    };
    document.getElementById('playerAvatarPreview').innerHTML = renderRacerAvatar(values.playerGender, values.playerTone, values.playerCostume);
    document.getElementById('setupAvatarPreview').innerHTML = renderRacerAvatar(values.partnerGender, values.partnerTone, values.partnerCostume);
}
function syncPartnerUI() {
    const firstName = partnerFirstName();
    const partnerCopy = {
        partnerNameIntro: partnerName || 'your partner',
        partnerNameConfer: firstName,
        partnerNameConferBtn: firstName,
        rpsPartnerName: firstName,
        bucklePartnerName: firstName,
    };
    Object.entries(partnerCopy).forEach(([id, text]) => {
        const node = document.getElementById(id);
        if (node)
            node.textContent = text;
    });
    const partnerMarkup = renderRacerAvatar(partnerGender, partnerTone, partnerCostume);
    ['partnerAvatarIntro', 'partnerAvatarConfer', 'rpsPartnerAvatar'].forEach(id => {
        const node = document.getElementById(id);
        if (node)
            node.innerHTML = partnerMarkup;
    });
    const playerNode = document.getElementById('playerAvatarIntro');
    if (playerNode)
        playerNode.innerHTML = renderRacerAvatar(playerGender, playerTone, playerCostume);
}
function confirmPartner() {
    const input = document.getElementById('partnerNameInput');
    const error = document.getElementById('partnerNameError');
    const nameInput = cleanPartnerName(input.value);
    if (!nameInput) {
        input.classList.add('invalid');
        input.setAttribute('aria-invalid', 'true');
        error.classList.add('visible');
        input.focus();
        return;
    }
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    error.classList.remove('visible');
    partnerName = nameInput;
    input.value = partnerName;
    partnerRelationship = document.getElementById('partnerRelationshipSelect').value;
    partnerGender = document.getElementById('partnerGenderSelect').value;
    partnerTone = document.getElementById('partnerToneSelect').value;
    partnerCostume = document.getElementById('partnerCostumeSelect').value;
    playerGender = document.getElementById('playerGenderSelect').value;
    playerTone = document.getElementById('playerToneSelect').value;
    playerCostume = document.getElementById('playerCostumeSelect').value;
    partnerAvatar = 'custom';
    syncPartnerUI();
    beginGame();
}
const startCities = ['Los Angeles, USA', 'New York City, USA', 'Chicago, USA', 'Toronto, Canada', 'Mexico City, Mexico', 'London, UK', 'Miami, USA', 'Vancouver, Canada'];
let chosenStartCity = startCities[0];
const START_CITY_AIRPORTS = {
    'Los Angeles, USA': 'Los Angeles International Airport',
    'New York City, USA': 'John F. Kennedy International Airport',
    'Chicago, USA': "O'Hare International Airport",
    'Toronto, Canada': 'Toronto Pearson International Airport',
    'Mexico City, Mexico': 'Mexico City International Airport',
    'London, UK': 'London Heathrow Airport',
    'Miami, USA': 'Miami International Airport',
    'Vancouver, Canada': 'Vancouver International Airport',
};
const START_CITY_ART_KEYS = {
    'Los Angeles, USA': 'start-lax', 'New York City, USA': 'start-jfk', 'Chicago, USA': 'start-ohare', 'Toronto, Canada': 'start-toronto',
    'Mexico City, Mexico': 'start-mexico-city', 'London, UK': 'start-heathrow', 'Miami, USA': 'start-miami', 'Vancouver, Canada': 'start-vancouver',
};
const START_CITY_COORDS = {
    'Los Angeles, USA': [33.9416, -118.4085], 'New York City, USA': [40.6413, -73.7781],
    'Chicago, USA': [41.9742, -87.9073], 'Toronto, Canada': [43.6777, -79.6248],
    'Mexico City, Mexico': [19.4363, -99.0721], 'London, UK': [51.4700, -0.4543],
    'Miami, USA': [25.7959, -80.2870], 'Vancouver, Canada': [49.1967, -123.1815],
};
const RACE_CITY_COORDS = {
    TOKYO: [35.5494, 139.7798], MARRAKESH: [31.6069, -8.0363], SINGAPORE: [1.3644, 103.9915],
    BANGKOK: [13.6900, 100.7501], BEIJING: [40.0799, 116.6031], ROME: [41.8003, 12.2389],
    'KUALA LUMPUR': [2.7456, 101.7072], 'MEXICO CITY': [19.4363, -99.0721],
    'RIO DE JANEIRO': [-22.8099, -43.2506], 'CAPE TOWN': [-33.9690, 18.5972],
    JAIPUR: [26.8242, 75.8122], SYDNEY: [-33.9399, 151.1753],
};
function greatCircleDistanceKm(from, to) {
    const radians = Math.PI / 180;
    const latitudeDistance = (to[0] - from[0]) * radians;
    const longitudeDistance = (to[1] - from[1]) * radians;
    const haversine = Math.sin(latitudeDistance / 2) ** 2
        + Math.cos(from[0] * radians) * Math.cos(to[0] * radians) * Math.sin(longitudeDistance / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
function realisticBlockMinutes(from, to) {
    if (!from || !to)
        return 180;
    const distanceKm = greatCircleDistanceKm(from, to);
    let minutes;
    if (distanceKm <= 500)
        minutes = 50 + (distanceKm / 720) * 60;
    else if (distanceKm <= 2000)
        minutes = 55 + (distanceKm / 780) * 60;
    else
        minutes = 70 + (distanceKm / 880) * 60;
    const rounding = distanceKm <= 500 ? 5 : 15;
    return Math.max(60, Math.min(1260, Math.round(minutes / rounding) * rounding));
}
function estimatedFirstFlightMinutes() {
    return realisticBlockMinutes(START_CITY_COORDS[chosenStartCity], RACE_CITY_COORDS[currentLegData.countryTag]);
}
function estimatedIntercityFlightMinutes(fromLeg, toLeg) {
    return realisticBlockMinutes(RACE_CITY_COORDS[fromLeg?.countryTag], RACE_CITY_COORDS[toLeg?.countryTag]);
}
function timezoneOffsetMinutes(leg) {
    const match = String(leg?.tzLabel || '').match(/GMT\s*([+-])(\d{1,2})(?::(\d{2}))?/i);
    if (!match)
        return 0;
    const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
    return match[1] === '-' ? -minutes : minutes;
}
function paintStartingAirportBanner() {
    const airportName = START_CITY_AIRPORTS[chosenStartCity] || `${chosenStartCity} Airport`;
    const art = START_CITY_ART_KEYS[chosenStartCity] || 'start-lax';
    document.getElementById('startAirportBanner').innerHTML = renderBannerSVG({ shape: 'airport-terminal', art }, airportName, 'Starting Airport');
}
let activeFlightOrigin = 'Departure Airport';
let activeFlightDestination = 'Arrival Airport';
function nextLegData() {
    return currentLegData.legNumber < LEG_SEQUENCE.length ? LEG_SEQUENCE[currentLegData.legNumber] : null;
}
function setActiveFlightRoute(origin, destination) {
    activeFlightOrigin = origin || 'Departure Airport';
    activeFlightDestination = destination || 'Arrival Airport';
    syncFlightRouteBanners();
}
function flightBannerMarkup() {
    return `<div class="plane-route-copy"><div class="plane-route-kicker">Now Flying</div><div class="plane-route-text">Flight from ${escapeHTML(activeFlightOrigin)} to ${escapeHTML(activeFlightDestination)}</div><div class="plane-route-status">In flight</div></div>`;
}
function syncFlightRouteBanners() {
    if (activeFlightDestination === 'Arrival Airport') {
        const destinationLeg = nextLegData();
        if (destinationLeg) {
            activeFlightOrigin = currentLegData.airportName;
            activeFlightDestination = destinationLeg.airportName;
        }
    }
    document.querySelectorAll('.flight-route-banner-slot').forEach(slot => { slot.innerHTML = flightBannerMarkup(); });
}
function beginGame() {
    const destinationCity = String(currentLegData.cityName || '').trim().toUpperCase();
    const viableStartCities = startCities.filter(city => city.split(',')[0].trim().toUpperCase() !== destinationCity);
    chosenStartCity = viableStartCities[Math.floor(Math.random() * viableStartCities.length)] || startCities[0];
    document.getElementById('startCityName').textContent = chosenStartCity;
    paintStartingAirportBanner();
    showScreen('screen-startcity');
}
function showLegArrival() {
    setLandmarkBanner(airportLocation(), 'Arrivals');
    document.getElementById('introLegOfTotal').textContent = `Leg ${currentLegData.legNumber} of ${LEG_SEQUENCE.length}`;
    document.getElementById('introCityName').textContent = currentLegData.cityName;
    document.getElementById('introCityBtn').textContent = currentLegData.cityName;
    document.getElementById('introAirportName').textContent = currentLegData.airportName;
    document.getElementById('introAirportBriefName').textContent = currentLegData.airportName;
    document.getElementById('introArrivalCode').textContent = currentLegData.countryTag;
    document.getElementById('introArrivalFlag').textContent = currentLegData.flag;
    document.getElementById('introPartnerTag').textContent = partnerFirstName();
    document.getElementById('introFieldCount').textContent = fieldSize();
    syncPartnerUI();
    showScreen('screen-intro');
}
function beginFlight() {
    setActiveFlightRoute(START_CITY_AIRPORTS[chosenStartCity] || `${chosenStartCity} Airport`, currentLegData.airportName);
    energy = Math.min(energy, scaledTravelEnergyCap(46));
    updateEnergyHud();
    const flightMinutes = estimatedFirstFlightMinutes();
    const arrivalClock = currentLegData.arrivalClock;
    clockMinutes = arrivalClock - flightMinutes;
    updateStatusBar();
    showFlightDepartureCountdown(() => {
        startClockFastForward(
            flightMinutes,
            `First Flight to ${currentLegData.cityName}`,
            `${chosenStartCity} falls away behind you as the race crosses time zones toward ${currentLegData.countryFull}.`,
            () => {
                clockMinutes = arrivalClock;
                legStartClock = clockMinutes;
                budget = currentLegData.startBudget;
                updateStatusBar();
                showLegArrival();
            }
        );
    });
}
function showStartingAirportDepartureClue() {
    // The sealed approach scene is painted from routeInfoCurrentLocation(), so it
    // still shows the airport the racers are physically leaving. Once opened, the
    // clue must switch to the airport named on the paper—not reuse the departure art.
    pendingRouteInfoBanner = currentLegData.airportBanner;
    showRouteInfo('✈️', currentLegData.airportName, `Fly to ${currentLegData.countryFull}`, beginFlight, 'Route Info', currentLegData.airportName);
}
function showScreen(id) {
    const target = document.getElementById(id);
    if (!target) {
        console.warn('showScreen: no such screen id:', id);
        return;
    } // fail safe rather than blanking the game
    const seatSelectionMode = id === 'screen-seating' || id === 'screen-busseats';
    document.documentElement.classList.toggle('seat-selection-mode', seatSelectionMode);
    document.body.classList.toggle('seat-selection-mode', seatSelectionMode);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    target.classList.add('active');
    target.scrollTop = 0;
    if (!seatSelectionMode)
        window.scrollTo(0, 0);
    mountAttemptForfeit(target, id);
    if (/^screen-(seating|buckle|inflight|entertainment|entertainment-catalog|flightservice)$/.test(id))
        syncFlightRouteBanners();
    let idx = screenOrder.indexOf(subMap[id] || id);
    for (let i = 0; i < 12; i++)
        document.getElementById('dot-' + i).classList.toggle('on', i <= idx);
    if (['screen-title', 'screen-setup', 'screen-startcity', 'screen-seating', 'screen-buckle', 'screen-inflight', 'screen-entertainment', 'screen-entertainment-catalog', 'screen-flightservice'].includes(id))
        clearLandmarkBanner();
    if (SAFE_SAVE_SCREENS.includes(id))
        saveGameState(id);
}
const TASK_ATTEMPT_SCREENS = new Set(['screen-slurp', 'screen-rhythm', 'screen-stack', 'screen-simon', 'screen-match', 'screen-gamble', 'screen-language', 'screen-code', 'screen-arcade']);
function mountAttemptForfeit(target, id) {
    document.querySelectorAll('.attempt-forfeit-zone').forEach(el => el.remove());
    if (!TASK_ATTEMPT_SCREENS.has(id) || !activeTaskContext)
        return;
    const zone = document.createElement('div');
    zone.className = 'attempt-forfeit-zone';
    const taskLabel = activeTaskContext === 'roadblock' ? 'Roadblock' : 'Detour';
    const btn = document.createElement('button');
    btn.className = 'btn btn-danger-outline';
    btn.textContent = `Forfeit This ${taskLabel}`;
    btn.onclick = () => openTaskForfeit(activeTaskContext);
    const note = document.createElement('p');
    note.textContent = 'Available throughout the attempt · choose +2 hours or surrender all remaining funds.';
    zone.append(btn, note);
    target.appendChild(zone);
}
/* ---------- SAVE / RESUME (best-effort; falls back silently if storage is unavailable) ---------- */
const SAVE_KEY = 'incredibleRaceSave_v1';
const ADMIN_SESSION_KEY = 'incredibleRaceAdminSession';
const ADMIN_SAVE_BACKUP_KEY = 'incredibleRaceAdminSaveBackup';
let adminModeActive = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
const SAFE_SAVE_SCREENS = ['screen-startcity', 'screen-intro', 'screen-transport1', 'screen-detour', 'screen-transport2', 'screen-roadblock-intro', 'screen-checkpoint-arrival', 'screen-checkpoint', 'screen-pitstop-arrival', 'screen-pitstop', 'screen-yield'];
function saveGameState(screenId) {
    if (adminModeActive)
        return;
    try {
        const state = {
            screen: screenId,
            legTags: LEG_SEQUENCE.map(l => l.countryTag),
            landmarkRoles: LEG_SEQUENCE.map(landmarkRoleSnapshot),
            legNumber: currentLegData.legNumber,
            budget, clockMinutes, legStartClock, energy, incomingYieldApplied, incomingYieldChecked,
            yieldUsedByTeams: [...yieldUsedByTeams],
            performance: { ...performance },
            partnerName, partnerGender, partnerTone, partnerCostume, partnerRelationship, partnerAvatar,
            playerGender, playerTone, playerCostume,
            survivingNames: survivingRivals ? survivingRivals.map(t => t.name) : null,
            detourTypeA, detourTypeB, roadblockType,
            experiencedTaskTypes: [...experiencedTaskTypes], taskPlayHistory: [...taskPlayHistory], lastCompletedTaskType, detourCompletedType,
            chosenStartCity, yieldedTeamName,
            rivalTimes: rivalTimes ? [...rivalTimes] : [],
            rivalSyncPlayerElapsed,
            playerElapsed,
            usedRaceEventIds: [...usedRaceEventIds],
            timeForfeitThisLeg,
            lastForfeitResult,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }
    catch (e) { /* storage unavailable — game just won't offer Continue */ }
}
function loadGameState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch (e) {
        return null;
    }
}
function clearGameState() {
    try {
        localStorage.removeItem(SAVE_KEY);
    }
    catch (e) { }
}
function resumeGame() {
    const state = loadGameState();
    if (!state)
        return;
    const savedRolesByTag = new Map((state.landmarkRoles || []).map(roles => [roles.tag, roles]));
    LEG_SEQUENCE = state.legTags.map(tag => {
        const canonicalLeg = ALL_LEGS.find(leg => leg.countryTag === tag);
        return buildRaceLeg(canonicalLeg, savedRolesByTag.get(tag), false);
    });
    LEG_SEQUENCE.forEach((l, i) => l.legNumber = i + 1);
    currentLegData = LEG_SEQUENCE[state.legNumber - 1];
    budget = state.budget;
    clockMinutes = state.clockMinutes;
    legStartClock = state.legStartClock;
    energy = Number.isFinite(state.energy) ? state.energy : 100;
    incomingYieldApplied = !!state.incomingYieldApplied;
    incomingYieldChecked = !!state.incomingYieldChecked;
    yieldUsedByTeams = new Set(state.yieldUsedByTeams || []);
    performance = state.performance;
    partnerName = cleanPartnerName(state.partnerName) || 'Partner';
    partnerGender = state.partnerGender || 'male';
    partnerTone = state.partnerTone || 'tan';
    partnerCostume = state.partnerCostume || 'flight';
    playerGender = state.playerGender || 'male';
    playerTone = state.playerTone || 'medium';
    playerCostume = state.playerCostume || 'racer';
    partnerRelationship = state.partnerRelationship || 'Randomly Paired';
    partnerAvatar = 'custom';
    survivingRivals = state.survivingNames ? rivalTeams.filter(t => state.survivingNames.includes(t.name)) : null;
    detourTypeA = state.detourTypeA;
    detourTypeB = state.detourTypeB;
    roadblockType = state.roadblockType;
    experiencedTaskTypes = new Set(state.experiencedTaskTypes || []);
    taskPlayHistory = state.taskPlayHistory || [];
    lastCompletedTaskType = state.lastCompletedTaskType || taskPlayHistory[taskPlayHistory.length - 1] || null;
    detourCompletedType = state.detourCompletedType || null;
    chosenStartCity = state.chosenStartCity;
    yieldedTeamName = state.yieldedTeamName;
    rivalTimes = state.rivalTimes || [];
    rivalSyncPlayerElapsed = Number.isFinite(state.rivalSyncPlayerElapsed) ? state.rivalSyncPlayerElapsed : (state.playerElapsed || 0);
    playerElapsed = state.playerElapsed || 0;
    usedRaceEventIds = state.usedRaceEventIds || [];
    timeForfeitThisLeg = !!state.timeForfeitThisLeg;
    lastForfeitResult = state.lastForfeitResult || null;
    applyLegTheme();
    syncPartnerUI();
    updateStatusBar();
    updateLastSeenTicker();
    // Several screens generate their content dynamically and can't just be shown blind —
    // regenerate the right content instead of leaving them as an empty shell.
    if (state.screen === 'screen-detour-result' && lastForfeitResult && lastForfeitResult.task === 'detour') {
        showForfeitResult('detour', lastForfeitResult.penalty);
    }
    else if (state.screen === 'screen-roadblock-result' && lastForfeitResult && lastForfeitResult.task === 'roadblock') {
        showForfeitResult('roadblock', lastForfeitResult.penalty);
    }
    else if (state.screen === 'screen-pitstop') {
        buildPitStop();
    }
    else if (state.screen === 'screen-checkpoint-arrival') {
        showCheckpointArrival();
    }
    else if (state.screen === 'screen-pitstop-arrival') {
        showPitStopArrival();
    }
    else if (state.screen === 'screen-checkpoint') {
        arriveAtCheckpoint();
    }
    else if (state.screen === 'screen-yield') {
        goToYield();
    }
    else if (state.screen === 'screen-transport1') {
        showTransport('screen-transport1', 'transport1', currentLegData.dest1.place, 'screen-detour');
    }
    else if (state.screen === 'screen-transport2') {
        showTransport('screen-transport2', 'transport2', currentLegData.dest2.place, 'screen-roadblock-intro');
    }
    else if (state.screen === 'screen-detour') {
        setLandmarkBanner(currentLegData.dest1, 'Detour');
        showScreen('screen-detour');
    }
    else if (state.screen === 'screen-roadblock-intro') {
        setLandmarkBanner(currentLegData.dest2, 'Roadblock');
        showScreen('screen-roadblock-intro');
    }
    else if (state.screen === 'screen-startcity') {
        document.getElementById('startCityName').textContent = chosenStartCity;
        paintStartingAirportBanner();
        showScreen('screen-startcity');
    }
    else if (state.screen === 'screen-intro') {
        showLegArrival();
    }
    else {
        showScreen(state.screen);
    }
}
function startNewRace() {
    clearGameState();
    energy = 100;
    incomingYieldApplied = false;
    incomingYieldChecked = false;
    timeForfeitThisLeg = false;
    lastForfeitResult = null;
    partnerName = '';
    playerGender = 'male';
    playerTone = 'medium';
    playerCostume = 'racer';
    partnerGender = 'male';
    partnerTone = 'tan';
    partnerCostume = 'flight';
    const nameInput = document.getElementById('partnerNameInput');
    nameInput.value = '';
    nameInput.classList.remove('invalid');
    nameInput.removeAttribute('aria-invalid');
    document.getElementById('partnerNameError').classList.remove('visible');
    document.getElementById('playerGenderSelect').value = playerGender;
    document.getElementById('playerToneSelect').value = playerTone;
    document.getElementById('playerCostumeSelect').value = playerCostume;
    document.getElementById('partnerGenderSelect').value = partnerGender;
    document.getElementById('partnerToneSelect').value = partnerTone;
    document.getElementById('partnerCostumeSelect').value = partnerCostume;
    updateSetupPreview();
    showScreen('screen-setup');
}
function checkForSavedGame() {
    const state = loadGameState();
    if (state && state.screen && state.screen !== 'screen-title') {
        document.getElementById('continueRaceBtn').style.display = 'block';
    }
}
/* ---------- TYPEWRITER TEXT REVEAL ---------- */
const TYPE_SELECTOR = '.eyebrow, h1.headline, .host-line, .card-title, .card p, .result-banner .big, .result-banner .sub, .route-place, .route-country, .route-label, .score-line';
/* ---------- UNIFIED PENDING-CALLBACK STORE ----------
   Every "show an overlay, wait for a tap, run exactly one continuation" flow in this
   game used to keep its own separate pending-variable + guard, hand-copied per screen.
   That duplication is exactly what let double-tap bugs slip through inconsistently —
   some copies got a guard, some didn't, one forgot to clear its value at all. This
   single atomic store replaces all of them: setPending() stashes a callback under a
   key, consumePending() reads AND clears it in one step, so a second call for the same
   key (double-tap, stray re-entry, whatever) always finds nothing and safely no-ops. */
const __pending = {};
function setPending(key, fn) { __pending[key] = fn; }
function consumePending(key) {
    const fn = __pending[key];
    __pending[key] = null;
    return fn;
}
let typeTokenCounter = 0;
function typeHTML(el, html, speed, onDone) {
    const myToken = ++typeTokenCounter;
    el.__typeToken = myToken;
    let i = 0;
    function tick() {
        if (el.__typeToken !== myToken)
            return; // a newer animation superseded this one — stop appending
        if (i >= html.length) {
            if (onDone)
                onDone();
            return;
        }
        el.__typingInProgress = true;
        if (html[i] === '<') {
            const close = html.indexOf('>', i);
            if (close === -1) {
                el.innerHTML += html.substring(i);
                i = html.length;
                el.__typingInProgress = false;
                if (onDone)
                    onDone();
                return;
            }
            el.innerHTML += html.substring(i, close + 1);
            i = close + 1;
            el.__typingInProgress = false;
            tick();
        }
        else if (html[i] === '&') {
            const semi = html.indexOf(';', i);
            if (semi !== -1 && semi - i <= 10) {
                el.innerHTML += html.substring(i, semi + 1);
                i = semi + 1;
                el.__typingInProgress = false;
                setTimeout(tick, speed);
            }
            else {
                el.innerHTML += html[i];
                i++;
                el.__typingInProgress = false;
                setTimeout(tick, speed);
            }
        }
        else {
            el.innerHTML += html[i];
            i++;
            el.__typingInProgress = false;
            setTimeout(tick, speed);
        }
    }
    tick();
}
/* Sets an element's text AND refreshes its typewriter cache in one step. Any element whose
   content changes at runtime must go through this (or have __fullHTML cleared), otherwise
   animateTextIn would replay the previously cached string instead of the new one. */
function setAnimatedText(el, text) {
    if (typeof el === 'string')
        el = document.getElementById(el);
    if (!el)
        return;
    el.textContent = text;
    el.__fullHTML = el.innerHTML;
}
function setAnimatedHTML(el, html) {
    if (typeof el === 'string')
        el = document.getElementById(el);
    if (!el)
        return;
    el.innerHTML = html;
    el.__fullHTML = html;
}
/* Structural safeguard: rather than requiring ~40 scattered call sites to remember to keep
   the typewriter cache in sync, intercept textContent/innerHTML assignment on Elements and
   invalidate the cache automatically. This means any direct `el.textContent = x` anywhere in
   the codebase — existing or future — can never leave a stale cached string behind. */
(function installCacheInvalidation() {
    const proto = Element.prototype;
    ['textContent', 'innerHTML'].forEach(prop => {
        // textContent lives on Node.prototype; innerHTML on Element.prototype
        const target = (prop === 'textContent') ? Node.prototype : Element.prototype;
        const desc = Object.getOwnPropertyDescriptor(target, prop);
        if (!desc || !desc.set || !desc.configurable)
            return;
        Object.defineProperty(target, prop, {
            configurable: true,
            enumerable: desc.enumerable,
            get: desc.get,
            set: function (value) {
                if (this.__typingInProgress !== true) {
                    this.__fullHTML = undefined;
                    this.__typeToken = ++typeTokenCounter;
                }
                desc.set.call(this, value);
            }
        });
    });
})();
function animateTextIn(container) {
    if (!container)
        return;
    const els = container.querySelectorAll(TYPE_SELECTOR);
    els.forEach((el, idx) => {
        // Cache the element's ORIGINAL markup the first time we ever animate it, and always
        // retype from that cache. Without this, an animation that gets interrupted (e.g. the
        // overlay closes mid-typing, or a hidden section is re-animated and then torn down)
        // leaves a truncated string in the DOM — which the next animateTextIn would then treat
        // as the full source text, permanently shortening it a little more each time.
        if (el.__fullHTML === undefined)
            el.__fullHTML = el.innerHTML;
        const full = el.__fullHTML;
        if (/\sid=/.test(full))
            return; // has a live-bound child element — skip to avoid breaking references
        el.__typingInProgress = true;
        el.innerHTML = '';
        el.__typingInProgress = false;
        el.__typeToken = ++typeTokenCounter; // invalidate any in-flight animation for this element immediately
        setTimeout(() => typeHTML(el, full, 26), idx * 160);
    });
}
/* ---------- CLOCK + BUDGET ---------- */
function formatClock(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function advanceClock(mins) { clockMinutes += mins; updateStatusBar(); }
function updateStatusBar() {
    document.getElementById('clockDisplay').textContent = formatClock(clockMinutes) + ' ' + String(currentLegData.tzLabel).split(' ')[0];
    document.getElementById('budgetAmount').textContent = budget.toLocaleString();
    updateEnergyHud();
}
function updateEnergyHud() {
    energy = Math.max(0, Math.min(100, Math.round(energy)));
    const indicator = document.getElementById('energyIndicator');
    const value = document.getElementById('energyValue');
    if (indicator)
        indicator.style.left = `${energy}%`;
    if (value)
        value.textContent = `${energy}`;
}
function changeEnergy(delta) {
    energy = Math.max(0, Math.min(100, energy + delta));
    updateEnergyHud();
}
const ENERGY_COST_SCALE = 0.5;
const ENERGY_REALTIME_TICK_MS = 20000;
function scaledEnergyCost(cost) { return Math.max(0, Math.round(cost * ENERGY_COST_SCALE)); }
function scaledTravelEnergyCap(cap) { return Math.round(100 - ((100 - cap) * ENERGY_COST_SCALE)); }
function energyTimerPaused() {
    const active = document.querySelector('.screen.active');
    const restingScreens = new Set(['screen-title', 'screen-setup', 'screen-seating', 'screen-buckle', 'screen-inflight', 'screen-entertainment', 'screen-entertainment-catalog', 'screen-flightservice', 'screen-pitstop']);
    if (!active || restingScreens.has(active.id))
        return true;
    const travel = document.getElementById('travelNarrationOverlay');
    if (travel && travel.style.display === 'flex' && activeTravelMode !== 'walk')
        return true;
    for (const id of ['flightNarrationOverlay', 'flightDepartureOverlay', 'fastForwardOverlay', 'incomingYieldOverlay']) {
        const el = document.getElementById(id);
        if (el && el.style.display === 'flex')
            return true;
    }
    return false;
}
setInterval(() => {
    if (!energyTimerPaused() && energy > 0)
        changeEnergy(-1);
}, ENERGY_REALTIME_TICK_MS);
function energyPlacementPenalty() {
    if (energy >= 60)
        return 0;
    return Math.round((60 - energy) * 0.75);
}
function effectiveElapsed() {
    const fastForwardCredit = performance.fastForward > 0 ? 30 : 0;
    return Math.max(0, (clockMinutes - legStartClock) + energyPlacementPenalty() - fastForwardCredit);
}
/* ---------- ROUTE INFO OVERLAY ---------- */
let pendingRouteInfoDisplay = null;
let pendingRouteInfoBanner = null; // set just before showRouteInfo by whoever knows the location
let pendingClueBoxMode = 'route';
let pendingTaskClueLocation = null;
let routeApproachTimer = null;
let routeApproachFinishTimer = null;
function routeInfoCurrentLocation() {
    if (currentLandmarkLocation && currentLandmarkLocation.banner)
        return currentLandmarkLocation;
    return {
        place: chosenStartCity ? `${chosenStartCity} Departure` : 'Departure Terminal',
        banner: { shape: 'airport-terminal', palette: 'night', art: START_CITY_ART_KEYS[chosenStartCity] || 'start-lax' }
    };
}
function startClueBoxApproach() {
    clearInterval(routeApproachTimer);
    clearTimeout(routeApproachFinishTimer);
    const scene = document.getElementById('routeApproachScene');
    const badge = document.getElementById('routeDistanceBadge');
    const status = document.getElementById('routeApproachStatus');
    const button = document.getElementById('routeOpenClueBtn');
    const duration = 2350;
    const started = Date.now();
    scene.classList.remove('approaching');
    void scene.offsetWidth;
    scene.classList.add('approaching');
    badge.textContent = '80 m away';
    status.textContent = 'Running to the clue box…';
    status.classList.remove('ready');
    button.style.display = 'none';
    button.disabled = true;
    routeApproachTimer = setInterval(() => {
        const progress = Math.min(1, (Date.now() - started) / duration);
        badge.textContent = progress >= 1 ? 'Clue box reached' : `${Math.max(1, Math.ceil(80 * (1 - progress)))} m away`;
    }, 70);
    routeApproachFinishTimer = setTimeout(() => {
        clearInterval(routeApproachTimer);
        badge.textContent = 'Clue box reached';
        status.textContent = 'Clue box reached — open the clue drawer.';
        status.classList.add('ready');
        button.disabled = false;
        button.style.display = 'flex';
    }, duration);
}
function showRouteInfo(emoji, place, country, callback, label, bannerName) {
    // Guard against a double-fire (e.g. a rapid double-tap re-triggering the same transition) —
    // without this, two concurrent typewriter passes on the same element could interleave or
    // truncate each other, since the second pass would capture a mid-typing partial string as
    // if it were the full text.
    if (document.getElementById('routeInfoOverlay').style.display === 'flex')
        return;
    routeAlreadyAtMarker = false;
    const currentLoc = routeInfoCurrentLocation();
    pendingRouteInfoDisplay = { emoji, place, country, banner: pendingRouteInfoBanner, bannerName: bannerName || place, label: label || '', currentLoc };
    pendingRouteInfoBanner = null;
    pendingClueBoxMode = 'route';
    setPending('routeInfo', callback);
    showClueBoxApproach(currentLoc, label || 'Route Info');
}
function showClueBoxApproach(currentLoc, label) {
    currentLoc = currentLoc && currentLoc.banner ? currentLoc : routeInfoCurrentLocation();
    document.getElementById('routeInfoLabel').textContent = label || 'Route Info';
    document.getElementById('routeInfoOverlay').classList.add('sealed-mode');
    document.getElementById('routeSealedSection').style.display = 'flex';
    document.getElementById('routeApproachSection').style.display = 'flex';
    document.getElementById('routeRevealSection').style.display = 'none';
    document.querySelector('#routeApproachSection .route-step-kicker').textContent = 'Reach the Clue Box';
    document.querySelector('#routeRevealSection .route-step-kicker').textContent = 'Read the Clue';
    document.getElementById('routeCurrentBannerSlot').innerHTML = renderBannerSVG(currentLoc.banner, '', '');
    document.getElementById('routeApproachLocationTag').textContent = currentLoc.place;
    document.getElementById('routeInfoOverlay').style.display = 'flex';
    const openButton = document.getElementById('routeOpenClueBtn');
    openButton.style.display = 'none';
    openButton.disabled = true;
    const scene = document.getElementById('routeApproachScene');
    scene.classList.toggle('airport-ground', currentLoc.banner && currentLoc.banner.shape === 'airport-terminal');
    scene.classList.remove('approaching');
    document.getElementById('routeDistanceBadge').textContent = '80 m away';
    document.getElementById('routeApproachStatus').textContent = 'Running to the clue box…';
    document.getElementById('routeApproachStatus').classList.remove('ready');
    requestAnimationFrame(() => requestAnimationFrame(startClueBoxApproach));
}
/* What the team has just reached, kept vague until the clue box is opened. */
function continueFromCompletedTask(next) {
    routeAlreadyAtMarker = true;
    next();
}
function openRouteClueBox() {
    const display = pendingRouteInfoDisplay;
    if (!display)
        return; // nothing pending — ignore
    clearInterval(routeApproachTimer);
    clearTimeout(routeApproachFinishTimer);
    document.getElementById('routeOpenClueBtn').disabled = true;
    pendingRouteInfoDisplay = null;
    const revealLabel = display.label || 'Route Info';
    showTaskAlert(revealLabel, () => {
        document.getElementById('routeInfoOverlay').classList.remove('sealed-mode');
        document.getElementById('routeSealedSection').style.display = 'none';
        document.getElementById('routeRevealSection').style.display = 'flex';
        const routePlaceEl = document.getElementById('routePlace');
        routePlaceEl.textContent = display.place;
        routePlaceEl.dataset.length = display.place.length > 30 ? 'xlong' : display.place.length > 20 ? 'long' : 'short';
        document.getElementById('routeCountry').textContent = display.country;
        const rbSlot = document.getElementById('routeBannerSlot');
        rbSlot.innerHTML = display.banner ? renderBannerSVG(display.banner, display.bannerName || display.place, display.label) : '';
        document.getElementById('routeInfoOverlay').style.display = 'flex';
    });
}
function openPendingClueBox() {
    if (pendingClueBoxMode === 'task')
        openTaskClueBoxAfterApproach();
    else
        openRouteClueBox();
}
function continueRouteInfo() {
    const cb = consumePending('routeInfo');
    if (!cb)
        return;
    document.getElementById('routeInfoOverlay').style.display = 'none';
    document.getElementById('routeInfoOverlay').classList.remove('sealed-mode');
    cb();
}
let pendingTaskClueLabel = '';
function showTaskClue(label, location, callback) {
    if (document.getElementById('routeInfoOverlay').style.display === 'flex')
        return;
    pendingTaskClueLabel = label;
    pendingTaskClueLocation = location || routeInfoCurrentLocation();
    pendingClueBoxMode = 'task';
    setPending('taskClue', callback);
    showClueBoxApproach(pendingTaskClueLocation, label);
}
function openTaskClueBoxAfterApproach() {
    clearInterval(routeApproachTimer);
    clearTimeout(routeApproachFinishTimer);
    document.getElementById('routeOpenClueBtn').disabled = true;
    document.getElementById('routeInfoOverlay').style.display = 'none';
    document.getElementById('routeInfoOverlay').classList.remove('sealed-mode');
    const overlay = document.getElementById('taskClueOverlay');
    const banner = document.getElementById('taskClueBanner');
    const location = pendingTaskClueLocation;
    banner.innerHTML = location && location.banner ? renderBannerSVG(location.banner, location.place, 'Checkpoint Reached') : '';
    document.getElementById('taskClueSealed').style.display = 'none';
    document.getElementById('taskClueRevealed').style.display = 'none';
    document.getElementById('taskClueWord').style.display = 'none';
    overlay.style.display = 'flex';
    openTaskClueBox();
}
function openTaskClueBox() {
    const revealLabel = pendingTaskClueLabel || 'Race Clue';
    showTaskAlert(revealLabel, () => {
        const overlay = document.getElementById('taskClueOverlay');
        overlay.classList.remove('sealed-mode');
        document.getElementById('taskClueSealed').style.display = 'none';
        document.getElementById('taskClueRevealed').style.display = 'flex';
        const word = document.getElementById('taskClueWord');
        word.textContent = revealLabel;
        word.style.display = 'block';
        document.getElementById('taskClueContinue').textContent = revealLabel === 'Yield' ? 'Open the Yield Board' : `Begin ${revealLabel}`;
    });
}
function continueTaskClue() {
    document.getElementById('taskClueOverlay').style.display = 'none';
    const cb = consumePending('taskClue');
    pendingTaskClueLabel = '';
    pendingTaskClueLocation = null;
    pendingClueBoxMode = 'route';
    if (cb)
        cb();
}
function goToRoute1() {
    // The touchdown screen already established that the team is inside this airport.
    // Go straight to retrieving the outbound city clue instead of "arriving" again.
    routeAlreadyAtMarker = true;
    showRaceEvent(() => {
        pendingRouteInfoBanner = currentLegData.dest1.banner;
        showRouteInfo(currentLegData.dest1.emoji, currentLegData.dest1.place, currentLegData.countryFull, () => showTransport('screen-transport1', 'transport1', currentLegData.dest1.place, 'screen-detour'));
    });
}
function goToRoute2() {
    showRaceEvent(() => {
        pendingRouteInfoBanner = currentLegData.dest2.banner;
        showRouteInfo(currentLegData.dest2.emoji, currentLegData.dest2.place, currentLegData.countryFull, () => showTransport('screen-transport2', 'transport2', currentLegData.dest2.place, 'screen-roadblock-intro'));
    });
}
/* ---------- CLUE-OPEN TAKEOVER ----------
   One randomly selected tearing sound takes over the screen, followed by the
   actual clue type. The sound word never appears inside the task page itself. */
let taskAlertToken = 0;
const CLUE_TEAR_WORDS = ['RIP!', 'TEAR!', 'SHHK!'];
function showTaskAlert(label, callback) {
    const overlay = document.getElementById('taskAlertOverlay');
    const sfxEl = document.getElementById('taskAlertSfx');
    const labelEl = document.getElementById('taskAlertLabel');
    const token = ++taskAlertToken;
    const finalLabel = String(label || 'Race Clue').toUpperCase();
    const tearWord = CLUE_TEAR_WORDS[Math.floor(Math.random() * CLUE_TEAR_WORDS.length)];
    overlay.style.display = 'flex';
    overlay.classList.remove('closing');
    sfxEl.textContent = tearWord;
    labelEl.textContent = finalLabel;
    sfxEl.className = 'clue-takeover-word clue-sfx-word';
    labelEl.className = 'clue-takeover-word clue-label-word';
    // Paint the reset state first, then bring the tear word in cleanly.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token !== taskAlertToken)
            return;
        sfxEl.classList.add('show');
    }));
    // True crossfade: both words overlap briefly, so there is never a blank blink.
    setTimeout(() => {
        if (token !== taskAlertToken)
            return;
        sfxEl.classList.remove('show');
        sfxEl.classList.add('exit');
        labelEl.classList.add('show');
    }, 720);
    // Build the clue behind the still-opaque takeover after the label has held clearly.
    setTimeout(() => {
        if (token !== taskAlertToken)
            return;
        callback();
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (token !== taskAlertToken)
                return;
            overlay.classList.add('closing');
        }));
    }, 1940);
    setTimeout(() => {
        if (token !== taskAlertToken)
            return;
        overlay.style.display = 'none';
        overlay.classList.remove('closing');
        sfxEl.className = 'clue-takeover-word clue-sfx-word';
        labelEl.className = 'clue-takeover-word clue-label-word';
    }, 2440);
}
/* ---------- TRANSPORT ---------- */
// Per-country fares grounded in real-world costs (local currency, roughly 2x a single fare
// to represent two people travelling together). Car is deliberately expensive but attainable.
const FARE_TABLES = {
    'TOKYO': { bus: 440, train: 400, taxi: 3200, car: 9000, budget: 9200 },
    'MARRAKESH': { bus: 8, train: 0, taxi: 70, car: 450, budget: 460 },
    'SINGAPORE': { bus: 3, train: 4, taxi: 26, car: 110, budget: 115 },
    'BANGKOK': { bus: 32, train: 88, taxi: 220, car: 1400, budget: 1450 },
    'BEIJING': { bus: 8, train: 12, taxi: 60, car: 400, budget: 420 },
    'ROME': { bus: 3, train: 3, taxi: 30, car: 90, budget: 95 },
    'KUALA LUMPUR': { bus: 6, train: 6, taxi: 35, car: 180, budget: 185 },
    'MEXICO CITY': { bus: 14, train: 12, taxi: 180, car: 3200, budget: 3500 },
    'RIO DE JANEIRO': { bus: 12, train: 16, taxi: 70, car: 850, budget: 900 },
    'CAPE TOWN': { bus: 40, train: 30, taxi: 180, car: 1700, budget: 1800 },
    'JAIPUR': { bus: 40, train: 50, taxi: 500, car: 11000, budget: 12000 },
    'SYDNEY': { bus: 8, train: 10, taxi: 45, car: 190, budget: 210 },
};
function fareFor(key) {
    const t = FARE_TABLES[currentLegData.countryTag];
    return t ? t[key] : 0;
}
const RIDE_HAIL_APPS = {
    'TOKYO': 'Uber', 'MARRAKESH': 'inDrive', 'SINGAPORE': 'Grab', 'BANGKOK': 'Grab',
    'BEIJING': 'DiDi', 'ROME': 'Uber', 'KUALA LUMPUR': 'Grab',
    'MEXICO CITY': 'DiDi', 'RIO DE JANEIRO': '99', 'CAPE TOWN': 'Uber',
    'JAIPUR': 'Ola', 'SYDNEY': 'Uber'
};
function currentRideHailApp() { return RIDE_HAIL_APPS[currentLegData.countryTag] || 'Ride-Hail'; }
// Verified landmark-level rail access. Race roles rotate; geography does not.
// No entry means rail does not reach the checkpoint closely enough to be sold
// as a direct train option in the game.
const LANDMARK_RAIL = {
    'Haneda Airport': ['Keikyu Airport Line — Haneda Airport terminals', 'Tokyo Monorail — Haneda Airport terminals'],
    'Changi Airport': ['East-West Line airport branch — Changi Airport Station'],
    'Suvarnabhumi Airport': ['Airport Rail Link — Suvarnabhumi Station'],
    'Beijing Capital International Airport': ['Capital Airport Express — Terminals 2/3'],
    'Leonardo da Vinci–Fiumicino Airport': ['Leonardo Express — Fiumicino Aeroporto Station', 'FL1 regional rail — Fiumicino Aeroporto Station'],
    'Kuala Lumpur International Airport': ['KLIA Ekspres — KLIA terminals', 'KLIA Transit — KLIA terminals'],
    'Mexico City International Airport': ['Mexico City Metro Line 5 — Terminal Aérea Station'],
    'Sydney Kingsford Smith Airport': ['Sydney Trains T8 Airport & South Line — International/Domestic Airport stations'],
    'Tsukiji Outer Market': ['Tokyo Metro Hibiya Line — Tsukiji Station'],
    'Akihabara Arcade': ['Tokyo Metro Hibiya Line — Akihabara Station', 'JR Yamanote Line — Akihabara Station'],
    'Tokyo Tower': ['Tokyo Metro Hibiya Line — Kamiyacho Station', 'Toei Oedo Line — Akabanebashi Station'],
    'Shibuya Crossing': ['Tokyo Metro Ginza Line — Shibuya Station', 'JR Yamanote Line — Shibuya Station'],
    'Chinatown Complex Market': ['North East Line — Chinatown Station', 'Downtown Line — Chinatown Station'],
    'Gardens by the Bay': ['Thomson-East Coast Line — Gardens by the Bay Station'],
    'Marina Bay Sands': ['Downtown Line — Bayfront Station', 'Circle Line — Bayfront Station'],
    'Merlion Park': ['East-West Line — Raffles Place Station', 'North-South Line — Raffles Place Station'],
    'Wat Arun (Temple of Dawn)': ['MRT Blue Line — Itsaraphap Station'],
    'Chatuchak Weekend Market': ['MRT Blue Line — Kamphaeng Phet Station', 'BTS Sukhumvit Line — Mo Chit Station'],
    'Grand Palace': ['MRT Blue Line — Sanam Chai Station'],
    'Wat Pho': ['MRT Blue Line — Sanam Chai Station'],
    'Temple of Heaven': ['Beijing Subway Line 5 — Tiantandongmen Station', 'Beijing Subway Line 8 — Tianqiao Station'],
    'Badaling Great Wall': ['Beijing Suburban Railway S2 — Badaling Station', 'Beijing–Zhangjiakou high-speed rail — Badaling Great Wall Station'],
    'Forbidden City': ['Beijing Subway Line 8 — Jinyu Hutong Station'],
    'Tiananmen Square': ['Beijing Subway Line 2 — Qianmen Station'],
    'The Colosseum': ['Rome Metro Line B — Colosseo Station'],
    'Trevi Fountain': ['Rome Metro Line A — Barberini–Fontana di Trevi Station'],
    'Spanish Steps': ['Rome Metro Line A — Spagna Station'],
    'Petronas Twin Towers': ['LRT Kelana Jaya Line — KLCC Station'],
    'Batu Caves': ['KTM Komuter Batu Caves–Pulau Sebang Line — Batu Caves Station'],
    'Merdeka Square': ['LRT Kelana Jaya Line — Masjid Jamek Station'],
    'Central Market': ['LRT Kelana Jaya Line — Pasar Seni Station', 'MRT Kajang Line — Pasar Seni Station'],
    'Zócalo': ['Mexico City Metro Line 2 — Zócalo/Tenochtitlan Station'],
    'Xochimilco Canals': ['Tren Ligero — Xochimilco Station'],
    'Mercado de Coyoacán': ['Mexico City Metro Line 3 — Viveros/Derechos Humanos Station'],
    'Chapultepec Castle': ['Mexico City Metro Line 1 — Chapultepec Station'],
    'Escadaria Selarón': ['MetrôRio Lines 1/2 — Glória Station'],
    'Arcos da Lapa': ['MetrôRio Lines 1/2 — Cinelândia Station'],
    'Hawa Mahal': ['Jaipur Metro Pink Line — Badi Chaupar Station'],
    'Johari Bazaar': ['Jaipur Metro Pink Line — Badi Chaupar Station'],
    'Circular Quay': ['Sydney Trains T2/T3/T8 — Circular Quay Station'],
    'Sydney Harbour Bridge': ['Sydney Trains T1 North Shore Line — Milsons Point Station'],
    'Sydney Opera House': ['Sydney Trains T2/T3/T8 — Circular Quay Station']
};
function railServicesFor(location) {
    return [...(LANDMARK_RAIL[String(location && location.place || '')] || [])];
}
function buildTransportModes() {
    return [
        { key: 'bus', label: 'Bus', emoji: '🚌', cost: fareFor('bus'), time: 70, score: 8 },
        { key: 'train', label: 'Train', emoji: '🚆', cost: fareFor('train'), time: 40, score: 16 },
        { key: 'ridehail', label: currentRideHailApp(), emoji: '🚘', cost: fareFor('taxi'), time: 20, score: 26 },
        { key: 'car', label: 'Rent a Car', emoji: '🚗', cost: fareFor('car'), time: 15, score: 32 },
    ];
}
const WALK = { key: 'walk', label: 'Walk', emoji: '🚶', cost: 0, time: 150, score: 2 };
const TRAIN_STRANGERS = [
    { id: 'aiko', name: 'Aiko', pronoun: 'She', copy: 'A calm commuter with a folded system map and the unhurried confidence of someone who uses this station every day.' },
    { id: 'karim', name: 'Karim', pronoun: 'He', copy: 'A friendly commuter already pointing people toward platforms as though he has unofficially taken charge of the station.' },
    { id: 'mei', name: 'Mei', pronoun: 'She', copy: 'A cheerful local carrying a market tote who seems completely certain she knows the quickest connection.' },
    { id: 'luca', name: 'Luca', pronoun: 'He', copy: 'A thoughtful commuter comparing the route diagram with the departure board before giving anyone an answer.' },
];
let activeTrainAdvice = null;
let activeTravelOrigin = '';
let activeTravelDestination = '';
let pendingBusJourney = null;
let selectedBusRow = null;
let selectedBusExitSide = 'front';
const CAR_CHOICES = [
    { name: 'Suzuki Swift', tier: 'Value', speed: 'Slowest', costFactor: .5, timeFactor: 1.45, speedWidth: 34 },
    { name: 'Toyota Corolla', tier: 'Standard', speed: 'Medium', costFactor: .7, timeFactor: 1, speedWidth: 66 },
    { name: 'BMW 3 Series', tier: 'Performance', speed: 'Fastest', costFactor: .9, timeFactor: .72, speedWidth: 100 },
];
function minutesOfDay() { return ((clockMinutes % 1440) + 1440) % 1440; }
function busServiceState() {
    const m = minutesOfDay();
    return {
        local: m >= 6 * 60 && m < 22 * 60,
        express: m >= 10 * 60 && m < 19 * 60,
        night: m >= 21 * 60 || m < 5 * 60,
    };
}
function availableBusCount() { return Object.values(busServiceState()).filter(Boolean).length; }
function busCostRange() {
    const base = fareFor('bus');
    return [Math.max(0, Math.round(base * .4)), Math.max(0, Math.round(base * 1.7))];
}
function carCostRange() {
    const base = fareFor('car');
    return [Math.max(0, Math.round(base * CAR_CHOICES[0].costFactor)), carRentalCost(base, CAR_CHOICES[CAR_CHOICES.length - 1])];
}
function carRentalCost(base, car) {
    return Math.max(0, Math.min(Math.round(base * car.costFactor), currentLegData.startBudget));
}
function pickRandomModes(noTrain) {
    const transportModes = buildTransportModes();
    const availableIdxs = noTrain ? [0, 2, 3] : [0, 1, 2, 3]; // 1 = train
    const maxCount = Math.min(availableIdxs.length, 3);
    const count = Math.min(maxCount, 2 + Math.floor(Math.random() * 2)); // 2 or 3, capped by what's available
    let idxs;
    if (!noTrain) {
        const others = availableIdxs.filter(i => i !== 1).sort(() => Math.random() - 0.5).slice(0, Math.max(1, count - 1));
        idxs = [1, ...others].sort((a, b) => a - b); // rail is a dependable option whenever this checkpoint supports it
    }
    else {
        idxs = [...availableIdxs].sort(() => Math.random() - 0.5).slice(0, count).sort((a, b) => a - b);
    }
    let modes = idxs.map(i => transportModes[i]);
    // Walking is always offered so saving money by walking is a real strategy,
    // not just an emergency fallback when nothing else is affordable.
    modes.push(WALK);
    return modes;
}
let isFinalStretchTransport = false;
let activeTransportContext = null;
function showTransport(screenId, prefix, destLabel, nextScreenId) {
    activeTransportContext = { screenId, prefix, destLabel, nextScreenId };
    document.getElementById(prefix + 'Dest').textContent = destLabel;
    const destKey = prefix === 'transport1' ? 'dest1'
        : prefix === 'transport2' ? 'dest2'
            : destLabel === currentLegData.yieldSpot.place ? 'yieldSpot'
                : 'pitStop';
    isFinalStretchTransport = destLabel === currentLegData.pitStop.place;
    activeTravelOrigin = (currentLandmarkLocation && currentLandmarkLocation.place) || currentLegData.cityName;
    activeTravelDestination = destLabel;
    // The player has NOT arrived yet. Rather than showing the destination at all (even
    // labelled), the banner is hidden during transport selection entirely, and only
    // reappears once resolveTravelContinuation() confirms actual arrival.
    clearLandmarkBanner();
    const noTrain = railServicesFor({ place: destLabel }).length === 0;
    const area = document.getElementById(prefix + 'Options');
    area.classList.add('transport-options');
    area.innerHTML = '';
    pickRandomModes(noTrain).forEach(m => {
        let displayedPrice = `${currentLegData.currencySymbol}${m.cost.toLocaleString()}`;
        let availability = '';
        let minimumCost = m.cost;
        if (m.key === 'bus') {
            const range = busCostRange();
            minimumCost = range[0];
            displayedPrice = `${currentLegData.currencySymbol}${range[0].toLocaleString()}–${currentLegData.currencySymbol}${range[1].toLocaleString()}`;
            availability = `${availableBusCount()} service${availableBusCount() === 1 ? '' : 's'} running now`;
        }
        else if (m.key === 'car') {
            const range = carCostRange();
            minimumCost = range[0];
            displayedPrice = `${currentLegData.currencySymbol}${range[0].toLocaleString()}–${currentLegData.currencySymbol}${range[1].toLocaleString()}`;
            availability = '3 vehicle classes';
        }
        const disabled = budget < minimumCost || (m.key === 'bus' && availableBusCount() === 0);
        const el = document.createElement('div');
        el.className = 'card choice-card transport-choice-card' + (disabled ? ' disabled' : '');
        const disabledReason = m.key === 'bus' && availableBusCount() === 0 ? 'No service at this time' : 'Not enough cash';
        el.innerHTML = `<div class="transport-icon-tile">${m.emoji}</div><div class="transport-card-copy"><div class="transport-card-title">${m.label}</div><div class="transport-card-meta">${displayedPrice} &middot; ~${m.time} min</div>${availability ? `<div class="transport-availability">${availability}</div>` : ''}${disabled ? `<div class="transport-unavailable">${disabledReason}</div>` : ''}</div><div class="transport-card-chevron">›</div>`;
        if (!disabled)
            el.onclick = () => {
                if (m.key === 'bus')
                    showBusLines(m, destLabel, nextScreenId);
                else if (m.key === 'train')
                    showTrainLines(m, destLabel, nextScreenId, destKey);
                else if (m.key === 'car')
                    showCarChoices(m, destLabel, nextScreenId);
                else if (m.key === 'ridehail')
                    showRideHailPickup(m, nextScreenId, destLabel);
                else
                    selectTransport(m, nextScreenId, destLabel);
            };
        area.appendChild(el);
    });
    showScreen(screenId);
}
let rideHailPickupTimer = null;
let lastPickupMapVariantIndex = -1;
const PICKUP_MAP_VARIANTS = [
    {
        playerLeft: '88.35%', playerTop: '81.15%',
        svg: `
        <rect width="360" height="260" fill="#E9EFE8"/>
        <path d="M286-14c-18 45-13 82 4 112 13 23 11 49-6 76-12 19-13 47-2 100h92V-14z" fill="#A9DDF0"/>
        <path d="M282-8c-14 42-9 78 8 108 11 20 9 43-7 69-13 21-15 49-5 93" fill="none" stroke="#79C6E1" stroke-width="3"/>
        <path d="M7 166c30-22 62-27 88-11 19 12 28 31 25 61-33 17-74 23-117 10z" fill="#B9DDAE"/>
        <path d="M16 178c23-13 50-14 73-3M27 199c20-9 45-8 69 2" fill="none" stroke="#8FC583" stroke-width="2" opacity=".75"/>
        <rect x="203" y="12" width="62" height="43" rx="9" fill="#C7E4B5"/>
        <g fill="#D5DDD7" stroke="#C8D1CB" stroke-width="1">
          <rect x="18" y="72" width="26" height="21" rx="3"/><rect x="52" y="75" width="35" height="25" rx="3"/><rect x="100" y="18" width="31" height="20" rx="3"/><rect x="141" y="17" width="38" height="27" rx="3"/>
          <rect x="121" y="67" width="27" height="18" rx="3"/><rect x="163" y="62" width="35" height="26" rx="3"/><rect x="215" y="72" width="25" height="21" rx="3"/><rect x="247" y="77" width="23" height="18" rx="3"/>
          <rect x="131" y="147" width="33" height="24" rx="3"/><rect x="173" y="153" width="28" height="23" rx="3"/><rect x="235" y="153" width="30" height="26" rx="3"/>
          <rect x="130" y="211" width="32" height="25" rx="3"/><rect x="174" y="205" width="38" height="27" rx="3"/><rect x="236" y="218" width="28" height="22" rx="3"/>
        </g>
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M-15 119C57 104 105 111 145 137s82 28 151 5" stroke="#FFFFFF" stroke-width="14"/>
          <path d="M-15 119C57 104 105 111 145 137s82 28 151 5" stroke="#CFD8D9" stroke-width="8"/>
          <path d="M101-15c-3 55 8 101 38 135 23 26 21 85 11 155" stroke="#FFFFFF" stroke-width="13"/>
          <path d="M101-15c-3 55 8 101 38 135 23 26 21 85 11 155" stroke="#D4DBDC" stroke-width="7"/>
          <path d="M211-12c-14 55-11 100 18 133 24 27 42 69 45 151" stroke="#FFFFFF" stroke-width="12"/>
          <path d="M211-12c-14 55-11 100 18 133 24 27 42 69 45 151" stroke="#D4DBDC" stroke-width="6"/>
          <path d="M-12 49C53 45 111 53 163 83s96 28 139 6" stroke="#FFFFFF" stroke-width="9"/>
          <path d="M-12 49C53 45 111 53 163 83s96 28 139 6" stroke="#D8DEDF" stroke-width="4"/>
          <path d="M35 42H82V105H165V150H227V211H318" stroke="#FFFFFF" stroke-width="17"/>
          <path d="M35 42H82V105H165V150H227V211H318" stroke="#BCC9CD" stroke-width="11"/>
          <path id="pickupRoutePath" d="M35 42H82V105H165V150H227V211H318" stroke="#2878FF" stroke-width="6"/>
        </g>
        <g fill="#FFFFFF" stroke="#98A8AC" stroke-width="1.2">
          <circle cx="102" cy="116" r="3"/><circle cx="160" cy="128" r="3"/><circle cx="217" cy="151" r="3"/><circle cx="258" cy="198" r="3"/>
        </g>`
    },
    {
        playerLeft: '84%', playerTop: '77%',
        svg: `
        <rect width="360" height="260" fill="#EEF2EA"/>
        <path d="M-30 220c54-17 95-16 123 1 34 22 58 16 103-12 50-31 96-38 175-28v79H-30z" fill="#D5E9BE"/>
        <path d="M286-25c-12 27-17 55-13 84 4 30 17 57 41 90 15 20 21 50 23 111h56V-25z" fill="#B6E1F0"/>
        <path d="M279-18c-9 26-11 52-6 77 7 36 22 66 42 91 16 20 23 47 27 92" fill="none" stroke="#7ACAE6" stroke-width="3"/>
        <g fill="#D7DEDA" stroke="#C9D1CD" stroke-width="1">
          <rect x="22" y="34" width="33" height="24" rx="4"/><rect x="68" y="26" width="39" height="28" rx="4"/><rect x="123" y="38" width="31" height="22" rx="4"/>
          <rect x="39" y="90" width="29" height="21" rx="4"/><rect x="83" y="94" width="44" height="26" rx="4"/><rect x="138" y="98" width="34" height="24" rx="4"/><rect x="186" y="87" width="37" height="28" rx="4"/>
          <rect x="112" y="153" width="35" height="28" rx="4"/><rect x="159" y="161" width="29" height="22" rx="4"/><rect x="205" y="164" width="37" height="28" rx="4"/>
          <rect x="260" y="32" width="40" height="26" rx="4"/><rect x="273" y="84" width="28" height="23" rx="4"/><rect x="259" y="137" width="35" height="25" rx="4"/>
        </g>
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M-16 68C38 86 97 92 145 86s96-4 168 21" stroke="#FFFFFF" stroke-width="14"/>
          <path d="M-16 68C38 86 97 92 145 86s96-4 168 21" stroke="#D1DADB" stroke-width="8"/>
          <path d="M44-15C67 31 92 64 117 92s48 66 64 152" stroke="#FFFFFF" stroke-width="12"/>
          <path d="M44-15C67 31 92 64 117 92s48 66 64 152" stroke="#D4DBDC" stroke-width="6"/>
          <path d="M146-15c-1 45 17 81 44 108 24 24 59 45 120 67" stroke="#FFFFFF" stroke-width="11"/>
          <path d="M146-15c-1 45 17 81 44 108 24 24 59 45 120 67" stroke="#D6DEDF" stroke-width="5"/>
          <path d="M32 214C72 213 92 195 113 166s43-49 74-54c36-6 63 6 86 28 12 12 18 28 24 59" stroke="#FFFFFF" stroke-width="17"/>
          <path d="M32 214C72 213 92 195 113 166s43-49 74-54c36-6 63 6 86 28 12 12 18 28 24 59" stroke="#C0CCD0" stroke-width="11"/>
          <path id="pickupRoutePath" d="M32 214C72 213 92 195 113 166s43-49 74-54c36-6 63 6 86 28 12 12 18 28 24 59" stroke="#2878FF" stroke-width="6"/>
        </g>
        <g fill="#FFFFFF" stroke="#97A7AB" stroke-width="1.2">
          <circle cx="87" cy="197" r="3"/><circle cx="121" cy="153" r="3"/><circle cx="180" cy="113" r="3"/><circle cx="240" cy="132" r="3"/>
        </g>`
    },
    {
        playerLeft: '81%', playerTop: '20%',
        svg: `
        <rect width="360" height="260" fill="#ECF0E8"/>
        <path d="M-5 192c31-21 62-27 89-18 25 9 40 28 45 69H-5z" fill="#CFE3BC"/>
        <rect x="18" y="16" width="85" height="46" rx="12" fill="#BCE3F3"/>
        <path d="M26 39h67M39 24v30M64 24v30M87 24v30" stroke="#82CCE6" stroke-width="3" stroke-linecap="round" opacity=".8"/>
        <g fill="#D7DEDA" stroke="#C8D0CC" stroke-width="1">
          <rect x="119" y="22" width="36" height="24" rx="4"/><rect x="169" y="27" width="47" height="31" rx="4"/><rect x="230" y="19" width="39" height="27" rx="4"/><rect x="282" y="26" width="34" height="22" rx="4"/>
          <rect x="49" y="91" width="34" height="23" rx="4"/><rect x="96" y="88" width="44" height="29" rx="4"/><rect x="155" y="88" width="38" height="28" rx="4"/><rect x="210" y="95" width="42" height="24" rx="4"/>
          <rect x="261" y="86" width="29" height="22" rx="4"/><rect x="296" y="93" width="33" height="26" rx="4"/>
          <rect x="189" y="155" width="29" height="23" rx="4"/><rect x="229" y="145" width="37" height="29" rx="4"/><rect x="279" y="156" width="35" height="25" rx="4"/><rect x="168" y="204" width="37" height="27" rx="4"/>
        </g>
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M-15 126C60 124 123 125 186 125s111 0 191 5" stroke="#FFFFFF" stroke-width="15"/>
          <path d="M-15 126C60 124 123 125 186 125s111 0 191 5" stroke="#CDD6D8" stroke-width="9"/>
          <path d="M110-15c2 68 5 123 9 164 3 34 0 69-9 111" stroke="#FFFFFF" stroke-width="13"/>
          <path d="M110-15c2 68 5 123 9 164 3 34 0 69-9 111" stroke="#D4DCDD" stroke-width="7"/>
          <path d="M238-15c-1 43-2 82-2 118 0 31 23 59 70 84" stroke="#FFFFFF" stroke-width="11"/>
          <path d="M238-15c-1 43-2 82-2 118 0 31 23 59 70 84" stroke="#D7DEDF" stroke-width="5"/>
          <path d="M38 225H118V167H183V126H256V53H292" stroke="#FFFFFF" stroke-width="17"/>
          <path d="M38 225H118V167H183V126H256V53H292" stroke="#C1CDD0" stroke-width="11"/>
          <path id="pickupRoutePath" d="M38 225H118V167H183V126H256V53H292" stroke="#2878FF" stroke-width="6"/>
        </g>
        <g fill="#FFFFFF" stroke="#97A7AB" stroke-width="1.2">
          <circle cx="116" cy="169" r="3"/><circle cx="181" cy="126" r="3"/><circle cx="254" cy="54" r="3"/>
        </g>`
    },
    {
        playerLeft: '16%', playerTop: '24%',
        svg: `
        <rect width="360" height="260" fill="#EEF1E9"/>
        <path d="M263 182c13-22 39-40 71-48 21-5 42-4 63 2v124H205c11-20 32-47 58-78z" fill="#B7DEF0"/>
        <path d="M272 195c15-24 38-40 63-45 19-3 35-2 52 3" fill="none" stroke="#80C8E4" stroke-width="3"/>
        <path d="M-5 38c32-10 58-8 83 8 31 19 48 50 58 102-24 12-55 14-91 5-22-5-39-19-50-39z" fill="#D7E9C3"/>
        <g fill="#D7DEDA" stroke="#C8D0CC" stroke-width="1">
          <rect x="132" y="18" width="34" height="23" rx="4"/><rect x="181" y="23" width="41" height="28" rx="4"/><rect x="237" y="22" width="33" height="24" rx="4"/>
          <rect x="142" y="76" width="28" height="22" rx="4"/><rect x="183" y="78" width="39" height="27" rx="4"/><rect x="236" y="78" width="31" height="22" rx="4"/><rect x="281" y="71" width="36" height="28" rx="4"/>
          <rect x="83" y="145" width="33" height="26" rx="4"/><rect x="129" y="147" width="39" height="29" rx="4"/><rect x="184" y="147" width="30" height="24" rx="4"/><rect x="224" y="153" width="43" height="27" rx="4"/>
          <rect x="59" y="202" width="41" height="30" rx="4"/><rect x="113" y="202" width="34" height="25" rx="4"/><rect x="160" y="205" width="37" height="28" rx="4"/>
        </g>
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M26 34C73 60 119 75 167 79c66 5 117-4 184-29" stroke="#FFFFFF" stroke-width="13"/>
          <path d="M26 34C73 60 119 75 167 79c66 5 117-4 184-29" stroke="#D3DADC" stroke-width="7"/>
          <path d="M67-16c11 48 18 89 21 122 4 38 20 73 50 103 18 18 48 32 85 41" stroke="#FFFFFF" stroke-width="11"/>
          <path d="M67-16c11 48 18 89 21 122 4 38 20 73 50 103 18 18 48 32 85 41" stroke="#D5DDDE" stroke-width="5"/>
          <path d="M15 203C40 184 61 166 76 150c18-20 28-48 32-84 5-40 22-69 55-85" stroke="#FFFFFF" stroke-width="16"/>
          <path d="M15 203C40 184 61 166 76 150c18-20 28-48 32-84 5-40 22-69 55-85" stroke="#C1CCD0" stroke-width="10"/>
          <path id="pickupRoutePath" d="M15 203C40 184 61 166 76 150c18-20 28-48 32-84 5-40 22-69 55-85" stroke="#2878FF" stroke-width="6"/>
        </g>
        <g fill="#FFFFFF" stroke="#97A7AB" stroke-width="1.2">
          <circle cx="54" cy="172" r="3"/><circle cx="86" cy="135" r="3"/><circle cx="106" cy="83" r="3"/>
        </g>`
    },
    {
        playerLeft: '83%', playerTop: '48%',
        svg: `
        <rect width="360" height="260" fill="#EDF1E8"/>
        <ellipse cx="247" cy="128" rx="52" ry="40" fill="#C7E5B2"/>
        <ellipse cx="247" cy="128" rx="24" ry="18" fill="#B1D79B"/>
        <path d="M-15 241c35-14 76-18 112-11 30 6 51 18 75 30H-15z" fill="#D9E8C6"/>
        <path d="M6 18c21-9 47-9 72 0 29 10 57 35 88 86H11C3 80 0 55 6 18z" fill="#B5E0F1"/>
        <path d="M27 39c17-3 33-2 48 3 20 7 40 24 61 56" fill="none" stroke="#85CCE6" stroke-width="3"/>
        <g fill="#D7DEDA" stroke="#C8D0CC" stroke-width="1">
          <rect x="115" y="23" width="32" height="21" rx="4"/><rect x="158" y="24" width="45" height="30" rx="4"/><rect x="216" y="27" width="31" height="21" rx="4"/><rect x="259" y="22" width="39" height="28" rx="4"/>
          <rect x="292" y="28" width="31" height="22" rx="4"/><rect x="124" y="184" width="39" height="28" rx="4"/><rect x="175" y="191" width="33" height="23" rx="4"/>
          <rect x="269" y="185" width="37" height="26" rx="4"/><rect x="79" y="136" width="33" height="24" rx="4"/><rect x="39" y="175" width="34" height="25" rx="4"/>
        </g>
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M-15 64C47 69 94 73 127 78c34 6 80 11 143 14 40 2 78 11 105 30" stroke="#FFFFFF" stroke-width="13"/>
          <path d="M-15 64C47 69 94 73 127 78c34 6 80 11 143 14 40 2 78 11 105 30" stroke="#D3DADC" stroke-width="7"/>
          <path d="M112-16c2 34 5 68 7 101 2 28 20 55 55 80 29 21 68 39 129 58" stroke="#FFFFFF" stroke-width="12"/>
          <path d="M112-16c2 34 5 68 7 101 2 28 20 55 55 80 29 21 68 39 129 58" stroke="#D6DDE0" stroke-width="6"/>
          <path d="M34 214h64v-48h94v-48h106" stroke="#FFFFFF" stroke-width="17"/>
          <path d="M34 214h64v-48h94v-48h106" stroke="#C1CDD1" stroke-width="11"/>
          <path id="pickupRoutePath" d="M34 214h64v-48h94v-48h106" stroke="#2878FF" stroke-width="6"/>
        </g>
        <g fill="#FFFFFF" stroke="#97A7AB" stroke-width="1.2">
          <circle cx="98" cy="166" r="3"/><circle cx="191" cy="166" r="3"/>
        </g>`
    }
];
function applyPickupMapVariant() {
    const svg = document.getElementById('pickupMapArt');
    const playerPin = document.querySelector('.pickup-player');
    if (!svg || !playerPin || !PICKUP_MAP_VARIANTS.length)
        return;
    let index = Math.floor(Math.random() * PICKUP_MAP_VARIANTS.length);
    if (PICKUP_MAP_VARIANTS.length > 1 && index === lastPickupMapVariantIndex) {
        index = (index + 1 + Math.floor(Math.random() * (PICKUP_MAP_VARIANTS.length - 1))) % PICKUP_MAP_VARIANTS.length;
    }
    lastPickupMapVariantIndex = index;
    const variant = PICKUP_MAP_VARIANTS[index];
    svg.innerHTML = variant.svg;
    playerPin.style.left = variant.playerLeft;
    playerPin.style.top = variant.playerTop;
}
function returnToTransportOptions() {
    clearInterval(rideHailPickupTimer);
    document.getElementById('rideHailPickupOverlay').style.display = 'none';
    pendingBusJourney = null;
    activeTrainAdvice = null;
    if (activeTransportContext) {
        const c = activeTransportContext;
        showTransport(c.screenId, c.prefix, c.destLabel, c.nextScreenId);
    }
}
function positionPickupCar(progress) {
    const car = document.getElementById('pickupCar');
    const path = document.getElementById('pickupRoutePath');
    const svg = document.getElementById('pickupMapArt');
    const clamped = Math.max(0, Math.min(1, progress));
    if (!car || !path || !svg || typeof path.getTotalLength !== 'function') {
        if (car) {
            car.style.left = `${9.7 + clamped * 78.7}%`;
            car.style.top = `${16.2 + clamped * 65}%`;
        }
        return;
    }
    const length = path.getTotalLength();
    const point = path.getPointAtLength(length * clamped);
    const next = path.getPointAtLength(Math.min(length, length * clamped + 2));
    const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
    const vb = svg.viewBox.baseVal;
    car.style.left = `${((point.x - vb.x) / vb.width) * 100}%`;
    car.style.top = `${((point.y - vb.y) / vb.height) * 100}%`;
    car.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
}
function showRideHailPickup(mode, nextScreenId, destLabel) {
    clearInterval(rideHailPickupTimer);
    const overlay = document.getElementById('rideHailPickupOverlay');
    const etaEl = document.getElementById('pickupEta');
    const pickupMinutes = 8 + Math.floor(Math.random() * 8);
    let tick = 0;
    const totalTicks = pickupMinutes;
    const pickupName = (currentLandmarkLocation && currentLandmarkLocation.place) || activeTravelOrigin || currentLegData.cityName;
    document.getElementById('pickupAppName').textContent = currentRideHailApp();
    document.getElementById('pickupMapCity').textContent = `${currentLegData.cityName} · live pickup`;
    document.getElementById('pickupMapDestination').textContent = pickupName;
    document.getElementById('pickupStatus').textContent = `Your ${currentRideHailApp()} driver is following the live route to your pickup point.`;
    etaEl.textContent = `${pickupMinutes} min`;
    applyPickupMapVariant();
    const car = document.getElementById('pickupCar');
    car.classList.add('resetting');
    positionPickupCar(0);
    overlay.style.display = 'flex';
    void car.offsetWidth;
    requestAnimationFrame(() => car.classList.remove('resetting'));
    rideHailPickupTimer = setInterval(() => {
        tick++;
        const remaining = Math.max(0, pickupMinutes - tick);
        const progress = tick / totalTicks;
        etaEl.textContent = remaining ? `${remaining} min` : '0 min';
        positionPickupCar(progress);
        if (remaining === 0) {
            clearInterval(rideHailPickupTimer);
            advanceClock(pickupMinutes);
            document.getElementById('pickupStatus').textContent = 'Driver arrived. Loading up now…';
            setTimeout(() => {
                overlay.style.display = 'none';
                selectTransport(mode, nextScreenId, destLabel);
            }, 850);
        }
    }, 500);
}
function selectTransport(mode, nextScreenId, destLabel) {
    budget -= mode.cost;
    advanceClock(mode.time);
    updateStatusBar();
    startTravelNarration(buildNarrationText(mode.key, mode.brand || null, destLabel, null), mode.emoji, nextScreenId, false, null, mode.key);
}
/* ---------- BUS SUB-CHOICE (different lines, faster costs more) ---------- */
function showBusLines(baseMode, destLabel, nextScreenId) {
    document.getElementById('trainStrangerPanel').style.display = 'none';
    document.getElementById('trainLinesDivider').style.display = 'none';
    activeTrainAdvice = null;
    const running = busServiceState();
    const expressSeats = running.express && Math.random() < .20;
    const lines = [
        { key: 'local', name: 'Local Bus', emoji: '🚌', hours: '06:00–22:00', cost: Math.round(baseMode.cost * .65), time: Math.round(baseMode.time * 1.4), open: running.local },
        { key: 'express', name: 'Express Bus', emoji: '🚍', hours: '10:00–19:00', cost: Math.round(baseMode.cost * 1.7), time: Math.round(baseMode.time * .7), open: running.express && expressSeats, serviceOpen: running.express, express: true },
        { key: 'night', name: 'Night Bus', emoji: '🌙', hours: '21:00–05:00', cost: Math.round(baseMode.cost * .4), time: Math.round(baseMode.time * 1.9), open: running.night },
    ];
    document.getElementById('subChoiceEyebrow').textContent = 'Choose Your Bus';
    document.getElementById('subChoiceHeadline').innerHTML = 'Same Stop, <em>Different Speeds</em>';
    document.getElementById('subChoiceHostLine').textContent = `It is ${formatClock(clockMinutes)}. Service hours use the live race clock; choose an available line, then select a pair of seats.`;
    const area = document.getElementById('subChoiceOptions');
    area.classList.add('transport-options');
    area.innerHTML = '';
    lines.forEach(l => {
        const disabled = budget < l.cost || !l.open;
        const el = document.createElement('div');
        el.className = 'card choice-card transport-choice-card' + (disabled ? ' disabled' : '');
        const stateText = !l.serviceOpen && l.express ? 'Closed' : (l.express && !l.open ? 'No last pair today' : (!l.open ? 'Closed' : 'Boarding'));
        el.innerHTML = `<div class="transport-icon-tile">${l.emoji}</div><div class="transport-card-copy"><div class="transport-card-title">${l.name}</div><div class="transport-card-meta">${currentLegData.currencySymbol}${l.cost.toLocaleString()} &middot; ~${l.time} min</div><div class="transport-availability">${l.hours} &middot; ${stateText}</div>${budget < l.cost ? '<div class="transport-unavailable">Not enough cash</div>' : ''}</div><div class="transport-card-chevron">›</div>`;
        if (!disabled)
            el.onclick = () => showBusSeatSelection(l, destLabel, nextScreenId);
        area.appendChild(el);
    });
    showScreen('screen-transport-sub');
}
function showBusSeatSelection(line, destLabel, nextScreenId) {
    pendingBusJourney = { line, destLabel, nextScreenId };
    selectedBusRow = null;
    document.getElementById('busSeatRouteText').textContent = `Riding from ${activeTravelOrigin} to ${destLabel}`;
    document.getElementById('busSeatHostLine').textContent = line.express
        ? 'Only one pair remains on this express bus. Its position is luck of the draw.'
        : 'Choose any open pair. Rows closer to the exit can save time when the doors open.';
    const grid = document.getElementById('busSeatGrid');
    grid.innerHTML = '';
    const rowCount = 14;
    selectedBusExitSide = Math.random() < .5 ? 'front' : 'back';
    const door = document.getElementById('busExitDoor');
    door.className = `bus-exit-door ${selectedBusExitSide}`;
    document.getElementById('busSeatLegend').textContent = `${selectedBusExitSide === 'front' ? 'Front' : 'Rear'} side exit marked · nearer rows are better · occupied pairs cannot be selected`;
    const soleExpressRow = 1 + Math.floor(Math.random() * rowCount);
    const regularOpenRows = new Set(Array.from({ length: rowCount }, (_, i) => i + 1).filter(() => Math.random() > .65));
    while (!line.express && regularOpenRows.size < 3)
        regularOpenRows.add(1 + Math.floor(Math.random() * rowCount));
    for (let row = 1; row <= rowCount; row++) {
        const open = line.express ? row === soleExpressRow : regularOpenRows.has(row);
        const pair = document.createElement('button');
        pair.type = 'button';
        pair.className = `bus-seat-pair${open ? '' : ' occupied'}`;
        pair.disabled = !open;
        pair.innerHTML = `<span class="bus-seat-row">Row ${row}</span><span class="bus-seat-icons">${open ? '💺 💺' : '● ●'}</span>`;
        if (open)
            pair.onclick = () => {
                grid.querySelectorAll('.bus-seat-pair').forEach(x => x.classList.remove('selected'));
                pair.classList.add('selected');
                selectedBusRow = row;
                document.getElementById('busSeatConfirmBtn').style.display = 'block';
            };
        grid.appendChild(pair);
    }
    document.getElementById('busSeatConfirmBtn').style.display = 'none';
    showScreen('screen-busseats');
}
function confirmBusSeat() {
    if (!pendingBusJourney || !selectedBusRow)
        return;
    const { line, destLabel, nextScreenId } = pendingBusJourney;
    const distance = selectedBusExitSide === 'front' ? selectedBusRow - 1 : 14 - selectedBusRow;
    const exitSaving = Math.max(0, Math.round((13 - distance) * .7));
    budget -= line.cost;
    advanceClock(Math.max(10, line.time - exitSaving));
    updateStatusBar();
    pendingBusJourney = null;
    startTravelNarration(buildNarrationText('bus', line.name, destLabel, null), '🚌', nextScreenId, false, null, 'bus');
}
function showCarChoices(baseMode, destLabel, nextScreenId) {
    document.getElementById('trainStrangerPanel').style.display = 'none';
    document.getElementById('trainLinesDivider').style.display = 'none';
    document.getElementById('subChoiceEyebrow').textContent = 'Choose Your Rental';
    document.getElementById('subChoiceHeadline').innerHTML = 'Three Cars, <em>Three Speeds</em>';
    document.getElementById('subChoiceHostLine').textContent = 'A better-performing car costs more but cuts travel time. Fuel is included in the displayed race price.';
    const area = document.getElementById('subChoiceOptions');
    area.classList.add('transport-options');
    area.innerHTML = '';
    CAR_CHOICES.forEach(car => {
        const cost = carRentalCost(baseMode.cost, car);
        const time = Math.max(8, Math.round(baseMode.time * car.timeFactor));
        const disabled = budget < cost;
        const el = document.createElement('div');
        el.className = `card choice-card car-choice${disabled ? ' disabled' : ''}`;
        el.innerHTML = `<div class="hero-emoji" style="font-size:54px">🚗</div><div><div class="car-tier">${car.tier} · ${car.speed}</div><div class="card-title">${car.name}</div><p>${currentLegData.currencySymbol}${cost.toLocaleString()} · ~${time} min</p></div><div class="car-speed-bar"><div class="car-speed-fill" style="width:${car.speedWidth}%"></div></div>`;
        if (!disabled)
            el.onclick = () => selectTransport({ key: 'car', label: car.name, brand: car.name, emoji: '🚗', cost, time }, nextScreenId, destLabel);
        area.appendChild(el);
    });
    showScreen('screen-transport-sub');
}
/* ---------- TRAIN SUB-CHOICE (one factually-correct line, wrong ones cost time) ---------- */
function showVerifiedTrainLines(baseMode, destLabel, nextScreenId, destKey) {
    const names = railServicesFor({ place: destLabel });
    if (!names.length) {
        showTransport(activeTransportContext.screenId, activeTransportContext.prefix, destLabel, nextScreenId);
        return;
    }
    activeTrainAdvice = null;
    document.getElementById('subChoiceEyebrow').textContent = 'Verified Rail Access';
    document.getElementById('subChoiceHeadline').innerHTML = names.length > 1 ? 'Choose a <em>Real Route</em>' : 'Take the <em>Verified Route</em>';
    document.getElementById('subChoiceHostLine').textContent = `These services reach the station used for ${destLabel}. No invented direct line or wrong-line penalty.`;
    document.getElementById('trainStrangerPanel').style.display = 'none';
    document.getElementById('trainLinesDivider').style.display = 'none';
    const area = document.getElementById('subChoiceOptions');
    area.innerHTML = '';
    names.forEach(name => {
        const el = document.createElement('div');
        el.className = 'card choice-card transport-choice-card';
        el.innerHTML = `<div class="transport-icon-tile">🚆</div><div class="transport-card-copy"><div class="transport-card-title">${escapeHTML(name)}</div><div class="transport-card-meta">${currentLegData.currencySymbol}${baseMode.cost.toLocaleString()} ticket · ~${baseMode.time} min</div></div><div class="transport-card-chevron">›</div>`;
        el.onclick = () => {
            if (budget < baseMode.cost)
                return;
            budget -= baseMode.cost;
            advanceClock(baseMode.time);
            updateStatusBar();
            const narration = `You take the ${name}, a verified rail service for ${destLabel}, then complete the final approach from the station.`;
            startTravelNarration(narration, '🚆', nextScreenId, false, null, 'train');
        };
        area.appendChild(el);
    });
    showScreen('screen-transport-sub');
}
function showTrainLines(baseMode, destLabel, nextScreenId, destKey) {
    return showVerifiedTrainLines(baseMode, destLabel, nextScreenId, destKey);
    const names = currentLegData.trainLines;
    const configuredIdx = currentLegData[destKey] && currentLegData[destKey].correctTrainIndex;
    const correctIdx = Number.isInteger(configuredIdx) ? configuredIdx : Math.floor(Math.random() * names.length);
    const correctName = names[correctIdx];
    const stranger = TRAIN_STRANGERS[Math.floor(Math.random() * TRAIN_STRANGERS.length)];
    activeTrainAdvice = { stranger, names: [...names], correctIdx, correctName, asked: false, advisedIdx: null, tip: 0, ticketCost: baseMode.cost };
    document.getElementById('subChoiceEyebrow').textContent = 'Choose Your Line';
    document.getElementById('subChoiceHeadline').innerHTML = 'Choose a <em>Verified Route</em>';
    document.getElementById('subChoiceHostLine').textContent = `Tickets cost ${currentLegData.currencySymbol}${baseMode.cost.toLocaleString()}. Only one line goes straight to ${destLabel}. Ask a local—or trust yourself.`;
    const panel = document.getElementById('trainStrangerPanel');
    document.getElementById('trainStrangerPhoto').src = TRAIN_STRANGER_ART[stranger.id];
    document.getElementById('trainStrangerName').textContent = stranger.name;
    document.getElementById('trainStrangerCopy').textContent = stranger.copy;
    const slider = document.getElementById('trainTipSlider');
    slider.min = 0;
    slider.max = Math.max(0, budget - baseMode.cost);
    slider.value = 0;
    slider.disabled = false;
    document.getElementById('trainAskBtn').disabled = false;
    document.getElementById('trainAskBtn').textContent = 'Ask Which Train to Take';
    document.getElementById('trainAdviceBubble').style.display = 'none';
    document.getElementById('trainAdviceBubble').innerHTML = '';
    document.getElementById('trainTipMaxLabel').textContent = `Max after ticket: ${currentLegData.currencySymbol}${Math.max(0, budget - baseMode.cost).toLocaleString()}`;
    updateTrainTipDisplay();
    panel.style.display = 'block';
    document.getElementById('trainLinesDivider').style.display = 'block';
    const area = document.getElementById('subChoiceOptions');
    area.innerHTML = '';
    names.forEach((name, i) => {
        const isCorrect = i === correctIdx;
        const el = document.createElement('div');
        el.className = 'card choice-card transport-choice-card';
        el.innerHTML = `<div class="transport-icon-tile">🚆</div><div class="transport-card-copy"><div class="transport-card-title">${name}</div><div class="transport-card-meta">${currentLegData.currencySymbol}${baseMode.cost.toLocaleString()} ticket &middot; ~${baseMode.time} min</div></div><div class="transport-card-chevron">›</div>`;
        el.onclick = () => {
            if (budget < baseMode.cost)
                return;
            budget -= baseMode.cost;
            const time = isCorrect ? baseMode.time : baseMode.time + 35;
            advanceClock(time);
            updateStatusBar();
            let narration = buildNarrationText('train', name, destLabel, isCorrect ? null : 'wrongLine', correctName);
            if (activeTrainAdvice && activeTrainAdvice.asked) {
                const followed = i === activeTrainAdvice.advisedIdx;
                narration += followed
                    ? (isCorrect
                        ? ` ${activeTrainAdvice.stranger.name}'s directions were right, and the tip bought you exactly the reassurance you needed.`
                        : ` Unfortunately, ${activeTrainAdvice.stranger.name}'s confident directions were wrong this time—the risk of trusting a stranger has just become very real.`)
                    : ` You ignored ${activeTrainAdvice.stranger.name}'s recommendation and committed to your own choice instead.`;
            }
            activeTrainAdvice = null;
            startTravelNarration(narration, '🚆', nextScreenId, !isCorrect, null, 'train');
        };
        area.appendChild(el);
    });
    showScreen('screen-transport-sub');
}
function updateTrainTipDisplay() {
    const slider = document.getElementById('trainTipSlider');
    const amount = Math.max(0, Math.min(Number(slider.max) || 0, Number(slider.value) || 0));
    document.getElementById('trainTipAmount').textContent = `${currentLegData.currencySymbol}${amount.toLocaleString()}`;
}
function askTrainStranger() {
    if (!activeTrainAdvice || activeTrainAdvice.asked)
        return;
    const slider = document.getElementById('trainTipSlider');
    const maxTip = Math.max(0, Number(slider.max) || 0);
    const tip = Math.max(0, Math.min(maxTip, Number(slider.value) || 0));
    const tipRatio = maxTip > 0 ? tip / maxTip : 0;
    const reliability = 0.80 + (0.16 * Math.sqrt(tipRatio)); // usually right; never guaranteed
    const adviceIsCorrect = Math.random() < reliability;
    let advisedIdx = activeTrainAdvice.correctIdx;
    if (!adviceIsCorrect) {
        const wrong = activeTrainAdvice.names.map((_, i) => i).filter(i => i !== activeTrainAdvice.correctIdx);
        advisedIdx = wrong[Math.floor(Math.random() * wrong.length)];
    }
    budget = Math.max(0, budget - tip);
    updateStatusBar();
    activeTrainAdvice.asked = true;
    activeTrainAdvice.advisedIdx = advisedIdx;
    activeTrainAdvice.tip = tip;
    const stranger = activeTrainAdvice.stranger;
    const recommended = activeTrainAdvice.names[advisedIdx];
    const tipLine = tip === 0
        ? 'You offer no tip. The answer still comes, after one last glance at the map.'
        : `You hand over ${currentLegData.currencySymbol}${tip.toLocaleString()}. ${stranger.pronoun} studies the board more carefully before answering.`;
    const bubble = document.getElementById('trainAdviceBubble');
    bubble.innerHTML = `${escapeHTML(tipLine)}<br><br><b>“Take the ${escapeHTML(recommended)}. That should get you there.”</b><span class="train-advice-caution">Local advice is usually useful—not verified. The final choice is yours.</span>`;
    bubble.style.display = 'block';
    slider.disabled = true;
    document.getElementById('trainAskBtn').disabled = true;
    document.getElementById('trainAskBtn').textContent = tip === 0 ? 'Advice Received · No Tip' : 'Advice Received · Tip Paid';
}
/* ---------- TRAVEL NARRATION (forced 5 seconds, no skip) ---------- */
function buildNarrationText(modeKey, lineName, destLabel, note, correctName) {
    let text;
    if (modeKey === 'ridehail') {
        text = `Your ${currentRideHailApp()} ride clears the busiest streets and keeps making steady progress toward ${destLabel}.`;
    }
    else if (modeKey === 'car') {
        text = `You steer the ${lineName || 'rental car'} through unfamiliar streets while ${partnerFirstName()} tracks the route, and ${destLabel} comes into view.`;
    }
    else if (modeKey === 'walk') {
        text = `You continue on foot toward ${destLabel}, saving money but spending far more time and energy.`;
    }
    else if (modeKey === 'bus') {
        text = `The ${lineName} pulls away and carries you across the city toward ${destLabel}.`;
    }
    else if (modeKey === 'train') {
        if (note === 'wrongLine') {
            text = `The route changes at the next interchange before continuing toward ${destLabel}.`;
        }
        else {
            text = `The ${lineName} is correct and carries you straight toward ${destLabel}.`;
        }
    }
    else {
        text = `You make your way toward ${destLabel}.`;
    }
    // Final stretch to the Pit Stop landmark — sometimes turn it into a literal footrace with a rival team.
    // Purely narrative flavor; the actual standings are still decided by the real elapsed-time comparison.
    if (isFinalStretchTransport && Math.random() < 0.45) {
        const pool = ensureSurvivingRivals();
        if (pool.length > 0) {
            const rival = pool[Math.floor(Math.random() * pool.length)];
            const youWin = Math.random() < 0.5;
            text += youWin
                ? ` ${rival.name} charges beside you, but your team edges ahead at the marker.`
                : ` ${rival.name} charges beside you and reaches the marker half a step first.`;
        }
    }
    return text;
}
/* ---------- TRAVEL NARRATION (reads fully, then Continue) ---------- */
let activeTravelMode = null;
function resolveTravelContinuation(nextScreenId) {
    return () => {
        // Travel is finished, so the banner can now claim arrival at that location.
        if (nextScreenId === 'screen-detour') {
            setLandmarkBanner(currentLegData.dest1, 'Detour');
            // Resolve the random event before the racers begin their clue-box approach.
            showRaceEvent(() => showTaskClue('Detour', currentLegData.dest1, () => showScreen('screen-detour')));
        }
        else if (nextScreenId === 'screen-roadblock-intro') {
            setLandmarkBanner(currentLegData.dest2, 'Roadblock');
            showTaskClue('Roadblock', currentLegData.dest2, () => showScreen('screen-roadblock-intro'));
        }
        else {
            showScreen(nextScreenId);
        }
    };
}
function startTravelNarration(text, emoji, nextScreenId, isWrongLine, directCallback, modeKey) {
    if (document.getElementById('travelNarrationOverlay').style.display === 'flex')
        return; // already showing
    document.documentElement.classList.remove('seat-selection-mode');
    document.body.classList.remove('seat-selection-mode');
    window.scrollTo(0, 0);
    // Only set a continuation if one was actually supplied. A caller may have pre-set the
    // 'travel' pending itself (e.g. goToPitStopTransport sets arriveAtCheckpoint before
    // showTransport); overwriting it here with resolveTravelContinuation(null) would send
    // showScreen(null) and crash. This preserves the priority the old two-variable design had.
    if (directCallback)
        setPending('travel', directCallback);
    else if (nextScreenId)
        setPending('travel', resolveTravelContinuation(nextScreenId));
    activeTravelMode = modeKey || null;
    const vehicleEl = document.getElementById('travelEmoji');
    vehicleEl.textContent = emoji;
    vehicleEl.classList.toggle('flip', emoji !== '✈️'); // ground vehicles face travel direction; planes stay as-is
    const interior = document.getElementById('travelInteriorBanner');
    const emojiScene = document.getElementById('travelEmojiScene');
    const showInterior = ['train', 'bus', 'car', 'ridehail'].includes(modeKey);
    emojiScene.classList.toggle('walk-art', modeKey === 'walk');
    interior.style.display = showInterior ? 'block' : 'none';
    emojiScene.style.display = showInterior ? 'none' : 'block';
    if (showInterior) {
        interior.className = `vehicle-interior-banner ${modeKey}`;
        interior.innerHTML = `<div class="vehicle-route-copy"><div class="vehicle-route-kicker">${modeKey === 'train' ? 'Rail Journey' : modeKey === 'bus' ? 'Bus Journey' : 'Road Journey'}</div><div class="vehicle-route-text">Riding from ${escapeHTML(activeTravelOrigin)} to ${escapeHTML(activeTravelDestination)}</div></div>`;
    }
    document.getElementById('travelWarningBadge').style.display = isWrongLine ? 'block' : 'none';
    document.getElementById('travelContinueBtn').style.display = 'none';
    const textEl = document.getElementById('travelNarrationText');
    textEl.innerHTML = '';
    document.getElementById('travelNarrationOverlay').style.display = 'flex';
    typeHTML(textEl, text, 22, () => {
        document.getElementById('travelContinueBtn').style.display = 'block';
    });
}
function continueTravel() {
    document.getElementById('travelNarrationOverlay').style.display = 'none';
    lastCompletedTravelMode = activeTravelMode || lastCompletedTravelMode;
    activeTravelMode = null;
    const cb = consumePending('travel');
    if (cb)
        cb();
}
function showRideHailToAirport(callback) {
    const startCityScreen = document.getElementById('screen-startcity');
    const leavingStartingCity = !!startCityScreen && startCityScreen.classList.contains('active');
    const airportName = leavingStartingCity
        ? (START_CITY_AIRPORTS[chosenStartCity] || `${chosenStartCity} Airport`)
        : currentLegData.airportName;
    activeTravelOrigin = leavingStartingCity
        ? chosenStartCity
        : ((currentLandmarkLocation && currentLandmarkLocation.place) || currentLegData.cityName);
    activeTravelDestination = airportName;
    // Every selectable starting city currently supports Uber. Once the race has landed,
    // use the country-specific service (Grab, DiDi, inDrive, etc.) for that leg.
    const app = leavingStartingCity ? 'Uber' : currentRideHailApp();
    const lines = [
        `Your ${app} ride moves through early traffic toward ${airportName}, with the city gradually giving way to terminal signs.`,
        `You load the bags into your ${app} car and follow the airport route toward ${airportName}.`,
        `The ${app} driver knows the airport route and keeps you moving toward ${airportName}.`,
    ];
    startTravelNarration(lines[Math.floor(Math.random() * lines.length)], '🚘', null, false, callback, 'ridehail');
}
function showAirportArrival(callback) {
    routeAlreadyAtMarker = true;
    revealAirportArrival(callback);
}
function revealAirportArrival(callback) {
    setLandmarkBanner(airportLocation(), 'Departures');
    const destinationLeg = nextLegData();
    if (!destinationLeg) {
        callback();
        return;
    }
    setActiveFlightRoute(currentLegData.airportName, destinationLeg.airportName);
    pendingRouteInfoBanner = destinationLeg.airportBanner;
    showFlightDeparturesBoard(callback);
}
/* ---------- RANDOM RACE EVENT (replaces cosmetic partner banter — has real gameplay effect) ---------- */
/* Each event carries its OWN three actions, written in-world. Players respond to the
   situation, not to a visible cost menu — the time and money consequence is revealed
   only after they commit. `funds` is a multiple of the leg's base event stake
   (negative = spend, positive = earn) and `mins` is clock change (negative = time saved).
   Economies deliberately differ between events: some offer two ways to spend, some two
   ways to earn, and some choices that can go either way. */
const RACE_EVENTS = [
    { id: 'lost_tourist', locations: 'any', title: 'A Lost Tourist', icon: '🗺️',
        scenario: "A frazzled tourist grabs your arm, completely turned around, pleading for directions.",
        detail: "The crowd keeps splitting around the three of you while a departure board flickers overhead, and every second you spend deciding gives the other teams more room to disappear.",
        actions: [
            { label: "Walk them there yourself", funds: 0.9, mins: 14,
                outcome: "You take the detour and deliver them to their door. They press folded notes into your hand and refuse to take them back." },
            { label: "Point vaguely and keep moving", funds: 0, mins: 0,
                outcome: "You gesture at roughly the right horizon and carry on. They are no better off, and neither are you." },
            { label: "Hire a guide for both of you", funds: -1, mins: -11,
                outcome: "You flag down a local guide who sorts them out and walks you to the next junction in the process. Money well spent." }
        ] },
    { id: 'street_vendor', locations: 'any', title: 'The Street Vendor', icon: '🛒',
        scenario: "A vendor has wedged his cart across the narrow lane and will not budge until you try today's special.",
        detail: "Steam rolls off the trays, customers are packed shoulder to shoulder, and the only obvious way forward runs straight through his tiny patch of pavement.",
        actions: [
            { label: "Buy something to get past", funds: -0.7, mins: -6,
                outcome: "You buy the smallest thing on the cart. He hauls it aside instantly and even points out the quicker way round." },
            { label: "Squeeze past the cart", funds: 0, mins: 4,
                outcome: "You wriggle through the gap, catch a hip on the cart, and lose a few seconds to an unimpressed lecture." },
            { label: "Haggle his stubborn customer down", funds: 1.1, mins: 16,
                outcome: "You talk a hesitant customer into the bulk price. The vendor closes the sale and cuts you in without being asked." }
        ] },
    { id: 'broken_shoe', locations: 'any', title: 'A Broken Strap', icon: '👟',
        scenario: "Your shoe strap snaps mid-stride, right in the thick of the crowd.",
        detail: "You stumble to the edge of the walkway as people stream past, testing the loose sole while your partner watches the clock and scans for anything resembling a repair shop.",
        actions: [
            { label: "Pay a street cobbler", funds: -0.8, mins: -4,
                outcome: "A cobbler stitches it in under a minute, and it holds better than it did new." },
            { label: "Knot it and carry on", funds: 0, mins: 7,
                outcome: "A double knot gets you moving, though you spend the next stretch walking like the shoe might betray you again." },
            { label: "Let him test his new glue on it", funds: 1, mins: 15,
                outcome: "He is trialling an adhesive and wants a foot to prove it on. You wait, he pays you for the privilege, and the shoe is immortal now." }
        ] },
    { id: 'wrong_turn', locations: 'any', title: 'Wrong Turn', icon: '🔀',
        scenario: "The alley you took narrows, bends, and empties into somewhere that is very clearly not on your route.",
        detail: "The noise of the main road has vanished behind the buildings, your map no longer matches the junctions, and neither of you can agree which turn caused the problem.",
        actions: [
            { label: "Pay a scooter rider to lead you", funds: -1.1, mins: -15,
                outcome: "He waves you after him, cuts three corners you would never have found, and drops you exactly where you needed to be." },
            { label: "Retrace your steps carefully", funds: 0, mins: 9,
                outcome: "You walk it back junction by junction. Slow, unglamorous, but you get there without spending a thing." },
            { label: "Follow the noise round the corner", funds: 1.2, mins: 12,
                outcome: "The noise is a commercial shoot. They pay you both on the spot for one authentic pass through the background." }
        ] },
    { id: 'street_performer', locations: 'any', title: 'The Street Performer', icon: '🎭',
        scenario: "A performer plants himself in your path and announces to the gathering crowd that he has found his volunteer.",
        detail: "Phones rise around you, the circle closes, and the performer is already arranging props as though your participation was settled long before you arrived.",
        actions: [
            { label: "Pay him to pick someone else", funds: -0.6, mins: -3,
                outcome: "Money changes hands, his gaze slides to the tourist behind you, and the crowd parts for you immediately." },
            { label: "Slip out through the crowd", funds: 0, mins: 5,
                outcome: "You duck behind a knot of onlookers and out the far side, losing only the time it takes to be booed." },
            { label: "Play along with the trick", funds: 1, mins: 13,
                outcome: "You are a spectacularly bad assistant, which turns out to be the act. Coins rain into the hat and he splits them with you." }
        ] },
    { id: 'lost_wallet', locations: 'any', title: 'A Dropped Wallet', icon: '👛',
        scenario: "The man ahead of you drops his wallet on the pavement and walks on without noticing.",
        detail: "He is already being swallowed by the crowd, a crossing signal is counting down, and the wallet sits between hundreds of hurried feet with nobody else stopping.",
        actions: [
            { label: "Sprint after him", funds: 1.4, mins: 11,
                outcome: "You catch him at the crossing. He is so relieved he presses a reward on you and will not hear a word against it." },
            { label: "Hand it to the nearest shopkeeper", funds: 0, mins: 3,
                outcome: "You leave it with the shop on the corner and let them deal with it. Barely costs you a step." },
            { label: "Pay a kid to run it over", funds: -0.5, mins: -2,
                outcome: "A kid pockets your tip, grabs the wallet, and races it back to its owner. You keep moving without losing time." }
        ] },
    { id: 'street_race', locations: 'any', title: 'Kids Racing', icon: '🏃',
        scenario: "A pack of local kids fall in beside you, daring you to race them to the end of the block.",
        detail: "They match your pace effortlessly, turning the pavement into an improvised starting line while nearby shopkeepers pause to see whether you will accept the challenge.",
        actions: [
            { label: "Buy them off with coins", funds: -0.4, mins: -2,
                outcome: "Coins distributed, the blockade dissolves, and they cheer you down the road like you have won something." },
            { label: "Laugh and keep walking", funds: 0, mins: 0,
                outcome: "They lose interest within twenty metres and go to bother someone else. No harm, no cost." },
            { label: "Actually race them", funds: 0.7, mins: 12,
                outcome: "You lose comprehensively to a nine-year-old. They are so delighted they award you their pooled sweet money as a consolation prize." }
        ] },
    { id: 'construction_detour', locations: 'any', title: 'Construction Detour', icon: '🚧',
        scenario: "A crew has the road shut with almost no warning and a lot of tape.",
        detail: "The official diversion points several blocks away, machinery blocks the direct path, and rival-team voices can be heard somewhere on the far side of the barriers.",
        actions: [
            { label: "Tip a worker for the shortcut", funds: -1.2, mins: -16,
                outcome: "He lifts the tape, walks you through the site and out a gate on the far side. You skip the entire diversion." },
            { label: "Follow the marked diversion", funds: 0, mins: 8,
                outcome: "The official route is long, well signposted and entirely free. You take every metre of it." },
            { label: "Help them shift the barriers", funds: 0.9, mins: 15,
                outcome: "You spend a while hauling barriers and get paid cash from the foreman's pocket for the trouble." }
        ] },
    { id: 'tuktuk_offer', locations: ['BANGKOK'], title: 'The Tuk-Tuk Offer', icon: '🛺',
        scenario: "A tuk-tuk swerves in beside you, engine popping, driver promising a shortcut nobody else knows.",
        detail: "Traffic is thickening at the intersection, the meterless offer is disappearing beneath the engine noise, and you have only a moment to decide whether his route is actually useful.",
        actions: [
            { label: "Take the shortcut", funds: -1, mins: -14,
                outcome: "The shortcut is real. The driver threads through a sequence of legal side streets and drops you beside the correct junction well ahead of schedule." },
            { label: "Wave him off", funds: 0, mins: 0,
                outcome: "He shrugs and guns it after a more promising fare. You keep walking." },
            { label: "Give HIM directions instead", funds: 0.8, mins: 9,
                outcome: "It turns out he is the lost one. You sort out his route, and he presses a fold of baht on you before roaring off." }
        ] },
    { id: 'camel_tout', locations: ['MARRAKESH'], title: 'The Camel Tout', icon: '🐫',
        scenario: "A tout manoeuvres his camel directly into your path and begins listing its many virtues.",
        detail: "The animal settles across nearly the entire lane, market traffic stacks up behind you, and the sales pitch grows more elaborate every time you try to edge around it.",
        actions: [
            { label: "Pay him to move it", funds: -0.7, mins: -5,
                outcome: "The camel is relocated with surprising speed, and he points you down a lane that cuts a corner off your route." },
            { label: "Walk around the camel", funds: 0, mins: 4,
                outcome: "You go the long way round both camel and tout. Costs nothing but a little dignity and a little time." },
            { label: "Pose for his photo board", funds: 1.1, mins: 16,
                outcome: "You spend a while modelling for the display board he shows tourists. He pays in cash and mint tea." }
        ] },
    { id: 'kopitiam_uncle', locations: ['SINGAPORE', 'KUALA LUMPUR'], title: 'The Kopitiam Uncle', icon: '☕',
        scenario: "An uncle at the kopitiam waves you over and will not accept that you are in any kind of hurry.",
        detail: "He has already pulled out two stools, the lunch crowd is filling every gap around the tables, and your next turn is visible just beyond the open-air seating area.",
        actions: [
            { label: "Take a kopi to go", funds: -0.5, mins: -6,
                outcome: "One kopi, drunk far too fast, and a genuinely useful tip about which side of the road the bus actually stops on." },
            { label: "Smile and keep going", funds: 0, mins: 2,
                outcome: "You decline three times before you get away. He is not offended, merely disappointed in you." },
            { label: "Help carry his delivery", funds: 0.9, mins: 14,
                outcome: "You haul crates of condensed milk to the back, and he settles up in cash plus a kopi you did not have time for." }
        ] },
    { id: 'temple_donation', locations: ['BANGKOK', 'SINGAPORE'], title: 'The Donation Box', icon: '🙏',
        scenario: "An elderly monk catches your eye and tilts his head toward the donation box by the gate.",
        detail: "The main path bends around the outer wall while a quieter side gate sits nearby, and the flow of visitors makes it impossible to stop without choosing what to do next.",
        actions: [
            { label: "Make a donation", funds: -0.6, mins: -4,
                outcome: "You give what you can. He blesses the journey briskly and opens the side gate that saves you the walk around." },
            { label: "Bow and move on", funds: 0, mins: 2,
                outcome: "You bow, he nods, and that is the whole transaction. Nothing gained, nothing lost." },
            { label: "Help arrange the offerings", funds: 0.8, mins: 15,
                outcome: "You spend a while laying out offerings, and a grateful worshipper insists on paying you for your time." }
        ] },
    { id: 'platform_busker', locations: ['TOKYO', 'BEIJING', 'ROME'], title: 'The Busker', icon: '🎸',
        scenario: "A busker is mid-song on the platform, hat out, and has clearly decided you look interested.",
        detail: "Commuters bunch around the performance, your exit sign is partly hidden behind the crowd, and an approaching train adds a fresh wave of people to the platform.",
        actions: [
            { label: "Drop coins in the hat", funds: -0.4, mins: -3,
                outcome: "He nods you through mid-verse and jerks his chin at the platform exit you had not spotted." },
            { label: "Listen a moment, then go", funds: 0, mins: 3,
                outcome: "You give him a verse of your attention and nothing else, then slip away as the chorus comes round." },
            { label: "Sing the chorus with him", funds: 1, mins: 11,
                outcome: "Your harmony is a crime against music. The crowd finds this delightful and throws money at YOU." }
        ] },
];
let usedRaceEventIds = [];
let activeRaceEvent = null;
// Returns an unused event valid for this location, or null. Never repeats within a season:
// if nothing unused is left, the caller skips the event entirely rather than showing a repeat.
function pickRaceEvent() {
    const matches = e => (e.locations === 'any' || e.locations.includes(currentLegData.countryTag));
    const pool = RACE_EVENTS.filter(e => matches(e) && !usedRaceEventIds.includes(e.id));
    if (pool.length === 0)
        return null;
    const event = pool[Math.floor(Math.random() * pool.length)];
    usedRaceEventIds.push(event.id);
    return event;
}
function raceEventScenarioNarration(event) {
    return event.scenario;
}
function raceEventOutcomeNarration(act) {
    return act.outcome;
}
function showRaceEvent(onContinue) {
    if (document.getElementById('raceEventOverlay').style.display === 'flex')
        return; // already showing
    const location = currentLandmarkLocation;
    if (!location || (location.banner && location.banner.shape === 'airport-terminal')) {
        if (onContinue)
            onContinue();
        return;
    }
    const event = pickRaceEvent();
    if (!event) {
        if (onContinue)
            onContinue();
        return;
    } // season exhausted here — skip, never repeat
    activeRaceEvent = event;
    setPending('raceEvent', onContinue);
    // Each action declares its own economy. `funds` is a multiple of the leg's base stake
    // (negative = spend, positive = earn); `mins` is clock change (negative = time saved).
    const stake = Math.max(1, Math.round(currentLegData.startBudget * 0.08));
    const eventLoc = currentLandmarkLocation || airportLocation();
    document.getElementById('raceEventLocationBanner').innerHTML = eventLoc && eventLoc.banner
        ? renderBannerSVG(eventLoc.banner, eventLoc.place, currentLandmarkSub || 'Current Location')
        : '';
    document.getElementById('raceEventArtwork').innerHTML = renderEventArtwork(event);
    document.getElementById('raceEventTitle').textContent = event.title;
    document.getElementById('raceEventScenario').textContent = raceEventScenarioNarration(event);
    document.getElementById('raceEventOutcomeSection').style.display = 'none';
    document.getElementById('raceEventContinueBtn').style.display = 'none';
    const wrap = document.getElementById('raceEventOptions');
    wrap.innerHTML = '';
    wrap.style.display = 'flex';
    event.actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline';
        btn.textContent = act.label; // deliberately no numbers — the cost is revealed after choosing
        btn.onclick = () => resolveRaceEventOption(act, stake);
        wrap.appendChild(btn);
    });
    document.getElementById('raceEventOverlay').style.display = 'flex';
}
function resolveRaceEventOption(act, stake) {
    const sym = currentLegData.currencySymbol;
    let fundsDelta = Math.round((act.funds || 0) * stake);
    if (fundsDelta < 0)
        fundsDelta = -Math.min(budget, -fundsDelta); // never below zero
    const mins = act.mins || 0;
    budget = Math.max(0, budget + fundsDelta);
    advanceClock(mins);
    updateStatusBar();
    const bits = [];
    if (fundsDelta > 0)
        bits.push(`+${sym}${fundsDelta} funds`);
    else if (fundsDelta < 0)
        bits.push(`\u2212${sym}${Math.abs(fundsDelta)} funds`);
    if (mins > 0)
        bits.push(`Delayed ${mins} min`);
    else if (mins < 0)
        bits.push(`Saved ${Math.abs(mins)} min`);
    if (!bits.length)
        bits.push('No change');
    document.getElementById('raceEventOptions').style.display = 'none';
    document.getElementById('raceEventOutcomeText').textContent = raceEventOutcomeNarration(act);
    document.getElementById('raceEventEffectText').textContent = bits.join(' \u00B7 ');
    document.getElementById('raceEventOutcomeSection').style.display = 'block';
    document.getElementById('raceEventContinueBtn').style.display = 'block';
}
function continueRaceEvent() {
    document.getElementById('raceEventOverlay').style.display = 'none';
    activeRaceEvent = null;
    const cb = consumePending('raceEvent');
    if (cb)
        cb();
}
/* ---------- REACTION DASH (multi-target, seven rounds of rising difficulty) ---------- */
let slurpRound = 0, slurpHits = 0, slurpMisses = 0, slurpTimerInt;
let slurpContext = 'detour';
function startSlurp(context) {
    slurpContext = context || 'detour';
    slurpRound = 0;
    slurpHits = 0;
    slurpMisses = 0;
    document.getElementById('slurpHits').textContent = '0';
    document.getElementById('slurpMissesDisplay').textContent = '0';
    const theme = currentLegData.themes.reaction;
    document.getElementById('slurpBriefCorrect').textContent = theme.correctEmojis.join('  ');
    document.getElementById('slurpBriefDecoy').textContent = theme.decoyEmojis.join('  ');
    showScreen('screen-slurp');
    nextSlurpRound();
}
function nextSlurpRound() {
    slurpRound++;
    document.getElementById('slurpRound').textContent = slurpRound;
    const theme = currentLegData.themes.reaction;
    const area = document.getElementById('slurpArea');
    area.innerHTML = '';
    const positions = [];
    function pickPosition() {
        let x, y, tries = 0;
        do {
            x = 12 + Math.random() * 76;
            y = 12 + Math.random() * 76;
            tries++;
        } while (positions.some(p => Math.abs(p.x - x) < 14 && Math.abs(p.y - y) < 14) && tries < 55);
        positions.push({ x, y });
        return { x, y };
    }
    const items = [];
    const correctCount = 3 + Math.floor((slurpRound - 1) / 2);
    const decoyCount = 4 + slurpRound;
    for (let i = 0; i < correctCount; i++)
        items.push({ emoji: theme.correctEmojis[Math.floor(Math.random() * theme.correctEmojis.length)], correct: true });
    for (let i = 0; i < decoyCount; i++)
        items.push({ emoji: theme.decoyEmojis[Math.floor(Math.random() * theme.decoyEmojis.length)], correct: false });
    items.sort(() => Math.random() - 0.5);
    items.forEach(item => {
        const pos = pickPosition();
        const el = document.createElement('div');
        el.className = 'target';
        el.style.fontSize = slurpRound > 4 ? '31px' : '35px';
        el.textContent = item.emoji;
        el.style.left = pos.x + '%';
        el.style.top = pos.y + '%';
        el.onclick = () => {
            if (item.correct) {
                slurpHits++;
                document.getElementById('slurpHits').textContent = slurpHits;
            }
            else {
                slurpMisses++;
                document.getElementById('slurpMissesDisplay').textContent = slurpMisses;
            }
            el.remove();
        };
        area.appendChild(el);
    });
    let t = 100;
    const bar = document.getElementById('slurpTimer');
    bar.style.width = '100%';
    clearInterval(slurpTimerInt);
    const durationMs = 4300 - (slurpRound - 1) * 400;
    slurpTimerInt = setInterval(() => {
        t -= 100 / (durationMs / 60);
        bar.style.width = Math.max(t, 0) + '%';
        if (t <= 0) {
            clearInterval(slurpTimerInt);
            area.innerHTML = '';
            advanceSlurp();
        }
    }, 60);
}
function advanceSlurp() {
    if (!document.getElementById('screen-slurp').classList.contains('active'))
        return;
    if (slurpRound < 7) {
        setTimeout(nextSlurpRound, 300);
    }
    else {
        const net = Math.max(0, slurpHits - slurpMisses);
        const score = Math.min(100, Math.round((net / 30) * 100));
        const timeSpent = Math.round(38 - (Math.min(net, 30) / 30) * 27);
        resolveMinigame('reaction', slurpHits, score, timeSpent, slurpContext);
    }
}
/* ---------- RHYTHM RUN (four-lane timing task) ---------- */
const RHYTHM_NOTE_COUNT = 28;
const RHYTHM_TRAVEL_MS = 2700;
const RHYTHM_TARGET_PROGRESS = .84;
let rhythmContext = 'detour', rhythmNotes = [], rhythmSpawned = 0, rhythmPoints = 0, rhythmCombo = 0, rhythmMissCount = 0;
let rhythmSpawnTimer = null, rhythmRaf = null, rhythmFinished = false;
function clearRhythmRun() {
    clearInterval(rhythmSpawnTimer);
    cancelAnimationFrame(rhythmRaf);
    rhythmNotes.forEach(n => { if (n.el && n.el.parentNode)
        n.el.remove(); });
    rhythmNotes = [];
}
function startRhythm(context) {
    clearRhythmRun();
    rhythmContext = context || 'detour';
    rhythmSpawned = 0;
    rhythmPoints = 0;
    rhythmCombo = 0;
    rhythmMissCount = 0;
    rhythmFinished = false;
    ['rhythmScore', 'rhythmCombo', 'rhythmMisses'].forEach(id => document.getElementById(id).textContent = '0');
    document.getElementById('rhythmFeedback').textContent = 'Get Ready';
    showScreen('screen-rhythm');
    setTimeout(() => {
        if (rhythmFinished)
            return;
        document.getElementById('rhythmFeedback').textContent = 'Fit the Arrow in the Gold Target';
        spawnRhythmNote();
        rhythmSpawnTimer = setInterval(spawnRhythmNote, 540);
        rhythmRaf = requestAnimationFrame(updateRhythmNotes);
    }, 650);
}
function spawnRhythmNote() {
    if (rhythmFinished || rhythmSpawned >= RHYTHM_NOTE_COUNT) {
        clearInterval(rhythmSpawnTimer);
        return;
    }
    const lane = Math.floor(Math.random() * 4);
    const arrows = ['←', '↓', '↑', '→'];
    const el = document.createElement('div');
    el.className = 'rhythm-note';
    el.dataset.lane = String(lane);
    el.textContent = arrows[lane];
    document.getElementById('rhythmLanes').children[lane].appendChild(el);
    rhythmNotes.push({ lane, el, spawnedAt: Date.now(), resolved: false, progress: 0 });
    rhythmSpawned++;
}
function updateRhythmNotes(now) {
    if (rhythmFinished)
        return;
    rhythmNotes.forEach(note => {
        if (note.resolved)
            return;
        note.progress = (Date.now() - note.spawnedAt) / RHYTHM_TRAVEL_MS;
        const travelDistance = document.getElementById('rhythmStage').clientHeight + 10;
        note.el.style.top = `${-46 + note.progress * travelDistance}px`;
        if (note.progress > 1.02)
            registerRhythmMiss(note);
    });
    const unresolved = rhythmNotes.some(n => !n.resolved);
    if (rhythmSpawned >= RHYTHM_NOTE_COUNT && !unresolved)
        finishRhythmRun();
    else
        rhythmRaf = requestAnimationFrame(updateRhythmNotes);
}
function tapRhythmLane(lane) {
    if (rhythmFinished)
        return;
    const candidates = rhythmNotes.filter(n => !n.resolved && n.lane === lane).sort((a, b) => Math.abs(a.progress - RHYTHM_TARGET_PROGRESS) - Math.abs(b.progress - RHYTHM_TARGET_PROGRESS));
    const note = candidates[0];
    if (!note || Math.abs(note.progress - RHYTHM_TARGET_PROGRESS) > .20) {
        rhythmCombo = 0;
        rhythmMissCount++;
        setRhythmFeedback('Bad', 'bad');
    }
    else {
        const distance = Math.abs(note.progress - RHYTHM_TARGET_PROGRESS);
        const points = distance < .055 ? 100 : distance < .10 ? 85 : distance < .155 ? 60 : 30;
        rhythmPoints += points;
        rhythmCombo++;
        note.resolved = true;
        note.el.remove();
        const timing = note.progress < RHYTHM_TARGET_PROGRESS ? 'Early' : 'Late';
        if (points === 100) {
            setRhythmFeedback('Perfect · Arrow Aligned', 'perfect');
            const stage = document.getElementById('rhythmStage');
            stage.classList.remove('perfect-hit');
            void stage.offsetWidth;
            stage.classList.add('perfect-hit');
        }
        else if (points === 85)
            setRhythmFeedback(`${timing} · Great`, 'great');
        else if (points === 60)
            setRhythmFeedback(`${timing} · Good`, 'good');
        else
            setRhythmFeedback(`${timing} · Too Far`, 'bad');
    }
    updateRhythmReadout();
}
function registerRhythmMiss(note) {
    note.resolved = true;
    note.el.remove();
    rhythmMissCount++;
    rhythmCombo = 0;
    setRhythmFeedback('Miss', 'miss');
    updateRhythmReadout();
}
function setRhythmFeedback(text, grade) {
    const el = document.getElementById('rhythmFeedback');
    el.textContent = text;
    el.className = `rhythm-feedback ${grade || ''}`;
}
function updateRhythmReadout() {
    document.getElementById('rhythmScore').textContent = rhythmPoints;
    document.getElementById('rhythmCombo').textContent = rhythmCombo;
    document.getElementById('rhythmMisses').textContent = rhythmMissCount;
}
function finishRhythmRun() {
    if (rhythmFinished)
        return;
    rhythmFinished = true;
    clearInterval(rhythmSpawnTimer);
    cancelAnimationFrame(rhythmRaf);
    const score = Math.max(20, Math.round(rhythmPoints / (RHYTHM_NOTE_COUNT * 100) * 100));
    const timeCost = Math.min(36, 10 + rhythmMissCount);
    setTimeout(() => resolveMinigame('rhythm', rhythmMissCount, score, timeCost, rhythmContext), 450);
}
/* ---------- BALANCE MINIGAME (continuous physics) ----------
   Position is a normalised offset in [-1, 1]; the walls at |pos| = 1 are the visible red
   edges, and the gold zone is |pos| <= STACK_PERFECT_ZONE, matching the CSS exactly.

   Each frame:
     instability  — an inverted-pendulum term proportional to pos, so the further you
                    lean the harder it pulls. This is what makes it a balancing act
                    rather than noise-fighting.
     noise        — a smoothed random force (carries over frame to frame) so gusts push
                    gradually instead of teleporting the marker.
     player       — holding a side applies a markedly stronger counterforce than the
                    noise can generate, so reacting well always beats bad luck.
     damping      — bleeds velocity so inputs feel weighty but controllable.
   Difficulty ramps across the 14 seconds by scaling instability and noise. */
const STACK_TARGET = 14;
const STACK_PERFECT_ZONE = 0.28; // must match .tilt-zone width in CSS
const STACK_WARN_AT = 0.55, STACK_DANGER_AT = 0.80;
let stackContext = 'detour', holdDir = 0;
let stackPos = 0, stackVel = 0, stackNoise = 0, stackHeld = 0, stackPerfect = 0;
let stackRaf = null, stackLastT = 0, stackControlsBound = false;
function bindStackControls() {
    // Bound exactly once for the life of the page, so replaying the minigame can never
    // accumulate duplicate handlers. Pointer events cover mouse and touch together.
    if (stackControlsBound)
        return;
    const left = document.getElementById('holdLeft'), right = document.getElementById('holdRight');
    if (!left || !right)
        return;
    const press = (dir) => (e) => { e.preventDefault(); holdDir = dir; };
    const release = (dir) => () => { if (holdDir === dir)
        holdDir = 0; };
    left.addEventListener('pointerdown', press(-1));
    right.addEventListener('pointerdown', press(1));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => {
        left.addEventListener(ev, release(-1));
        right.addEventListener(ev, release(1));
    });
    stackControlsBound = true;
}
function startStack(context) {
    stackContext = context || 'detour';
    stackPos = 0;
    stackVel = 0;
    stackNoise = 0;
    stackHeld = 0;
    stackPerfect = 0;
    holdDir = 0;
    document.getElementById('stackTime').textContent = '0.0s';
    document.getElementById('stackPerfect').textContent = '0.0s';
    document.getElementById('balanceStatus').textContent = 'Steady';
    const warn = document.getElementById('stackWarn');
    warn.className = 'stack-warn';
    warn.innerHTML = '&nbsp;';
    showScreen('screen-stack');
    bindStackControls();
    renderStack();
    cancelAnimationFrame(stackRaf);
    stackLastT = 0;
    stackRaf = requestAnimationFrame(stepStack);
}
// Extracted so tests exercise the real physics rather than a copy that can drift.
function stackPhysicsStep(dt) {
    const ramp = 1 + (stackHeld / STACK_TARGET) * 1.3; // gets harder as the clock runs
    const INSTABILITY = 3.8 * ramp;
    const NOISE_AMP = 2.4 * ramp;
    const PLAYER = 5.2; // deliberately > noise: skill beats luck
    const DAMPING = 2.6;
    // Smoothed random force — accumulates and decays rather than re-rolling each frame.
    stackNoise += (Math.random() * 2 - 1) * NOISE_AMP * dt * 6;
    stackNoise *= Math.exp(-2.2 * dt);
    const accel = (stackPos * INSTABILITY) // inverted-pendulum lean
        + stackNoise // gusts
        + (holdDir * -PLAYER) // player counterforce
        - (stackVel * DAMPING); // damping
    stackVel += accel * dt;
    stackPos += stackVel * dt;
    stackHeld += dt;
    if (Math.abs(stackPos) <= STACK_PERFECT_ZONE)
        stackPerfect += dt;
}
function stepStack(ts) {
    if (!stackLastT)
        stackLastT = ts;
    // Clamped so a stutter or a backgrounded tab can't jump the simulation.
    const dt = Math.min(0.05, (ts - stackLastT) / 1000);
    stackLastT = ts;
    stackPhysicsStep(dt);
    document.getElementById('stackTime').textContent = Math.min(stackHeld, STACK_TARGET).toFixed(1) + 's';
    document.getElementById('stackPerfect').textContent = stackPerfect.toFixed(1) + 's';
    renderStack();
    if (Math.abs(stackPos) >= 1) {
        finishStack(false);
        return;
    }
    if (stackHeld >= STACK_TARGET) {
        finishStack(true);
        return;
    }
    stackRaf = requestAnimationFrame(stepStack);
}
function renderStack() {
    const mag = Math.abs(stackPos);
    const marker = document.getElementById('tiltMarker');
    marker.style.left = (50 + stackPos * 50) + '%';
    marker.className = 'tilt-marker' + (mag >= STACK_DANGER_AT ? ' danger' : mag >= STACK_WARN_AT ? ' warn' : '');
    const warn = document.getElementById('stackWarn');
    if (mag >= STACK_DANGER_AT) {
        warn.className = 'stack-warn danger';
        warn.textContent = '⚠ About to go over!';
        document.getElementById('balanceStatus').textContent = 'Critical';
    }
    else if (mag >= STACK_WARN_AT) {
        warn.className = 'stack-warn warn';
        warn.textContent = 'Leaning hard — pull it back';
        document.getElementById('balanceStatus').textContent = 'Drifting';
    }
    else {
        warn.className = 'stack-warn';
        warn.innerHTML = '&nbsp;';
        document.getElementById('balanceStatus').textContent = mag <= STACK_PERFECT_ZONE ? 'Perfect' : 'Steady';
    }
    // The object itself wobbles harder the closer it gets to going over.
    const emoji = document.getElementById('stackEmoji');
    if (emoji) {
        const tilt = stackPos * 26;
        const wobble = mag > STACK_WARN_AT ? Math.sin(stackHeld * 38) * (mag - STACK_WARN_AT) * 26 : 0;
        emoji.style.transform = `rotate(${(tilt + wobble).toFixed(2)}deg)`;
    }
}
function finishStack(survived) {
    cancelAnimationFrame(stackRaf);
    holdDir = 0;
    const emoji = document.getElementById('stackEmoji');
    if (emoji)
        emoji.style.transform = '';
    const perfectRatio = stackPerfect / STACK_TARGET;
    if (!survived)
        balanceOutcome = 'struggle'; // Collapsed
    else if (perfectRatio >= 0.82)
        balanceOutcome = 'excellent'; // Perfect Balance
    else
        balanceOutcome = 'completed'; // Task Complete
    const heldRatio = Math.min(1, stackHeld / STACK_TARGET);
    const score = survived
        ? Math.round(60 + perfectRatio * 40)
        : Math.round(heldRatio * 55);
    const timeCost = survived
        ? Math.round(16 - perfectRatio * 8)
        : Math.round(26 - heldRatio * 10);
    resolveMinigame('balance', Math.min(stackHeld, STACK_TARGET), score, timeCost, stackContext);
}
/* ---------- SIMON SAYS (memory — keep retrying until correct, wrong costs time) ---------- */
const SIMON_SYMBOLS = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '🟤', '⚫', '⚪'];
const SIMON_TOTAL_ROUNDS = 4;
let simonRound = 0, simonSequence = [], simonInputIndex = 0, simonMistakes = 0, simonAcceptingInput = false;
let simonContext = 'detour';
function startSimon(context) {
    simonContext = context || 'detour';
    simonRound = 0;
    simonMistakes = 0;
    buildSimonGrid();
    showScreen('screen-simon');
    nextSimonRound();
}
function buildSimonGrid() {
    const grid = document.getElementById('simonGrid');
    grid.innerHTML = '';
    SIMON_SYMBOLS.forEach((sym, i) => {
        const tile = document.createElement('div');
        tile.className = 'simon-tile';
        tile.textContent = sym;
        tile.onclick = () => handleSimonTap(i, tile);
        grid.appendChild(tile);
    });
}
function nextSimonRound() {
    simonRound++;
    document.getElementById('simonRoundDisplay').textContent = simonRound;
    const length = 3 + simonRound; // 4,5,6,7 — deliberately hard regardless of skill level
    simonSequence = [];
    for (let i = 0; i < length; i++)
        simonSequence.push(Math.floor(Math.random() * SIMON_SYMBOLS.length));
    renderSimonInputProgress();
    replaySimonRound();
}
function renderSimonInputProgress() {
    const progress = document.getElementById('simonInputProgress');
    progress.innerHTML = simonSequence.map((_, index) => `<i class="${index < simonInputIndex ? 'done' : ''}"></i>`).join('');
}
function replaySimonRound() {
    simonInputIndex = 0;
    simonAcceptingInput = false;
    document.getElementById('simonPhase').textContent = 'Memorise';
    document.getElementById('simonStatusLine').textContent = 'Watch closely...';
    renderSimonInputProgress();
    playSimonSequence(simonSequence.length);
}
function playSimonSequence(length) {
    const flashMs = Math.max(260, 620 - simonRound * 60);
    const gapMs = Math.max(150, 300 - simonRound * 30);
    const tiles = document.querySelectorAll('#simonGrid .simon-tile');
    let step = 0;
    function flashNext() {
        if (!document.getElementById('screen-simon').classList.contains('active'))
            return;
        if (step >= simonSequence.length) {
            simonAcceptingInput = true;
            document.getElementById('simonPhase').textContent = 'Your turn';
            document.getElementById('simonStatusLine').textContent = 'Your turn — repeat the sequence.';
            return;
        }
        const tile = tiles[simonSequence[step]];
        tile.classList.add('lit');
        setTimeout(() => {
            tile.classList.remove('lit');
            step++;
            setTimeout(flashNext, gapMs);
        }, flashMs);
    }
    setTimeout(flashNext, 500);
}
function handleSimonTap(i, tile) {
    if (!simonAcceptingInput)
        return;
    if (i === simonSequence[simonInputIndex]) {
        tile.classList.add('lit');
        setTimeout(() => tile.classList.remove('lit'), 150);
        simonInputIndex++;
        renderSimonInputProgress();
        if (simonInputIndex >= simonSequence.length) {
            simonAcceptingInput = false;
            document.getElementById('simonStatusLine').textContent = 'Correct!';
            if (simonRound < SIMON_TOTAL_ROUNDS) {
                setTimeout(nextSimonRound, 700);
            }
            else {
                finishSimon();
            }
        }
    }
    else {
        simonAcceptingInput = false;
        simonMistakes++;
        document.getElementById('simonMistakeCount').textContent = simonMistakes;
        advanceClock(6); // wrong attempt costs time but never ends the round
        tile.classList.add('wrong');
        document.getElementById('simonStatusLine').textContent = 'Wrong tile — watch the sequence again.';
        setTimeout(() => {
            tile.classList.remove('wrong');
            replaySimonRound();
        }, 900);
    }
}
function finishSimon() {
    const score = Math.max(40, 100 - simonMistakes * 8);
    const timeCost = Math.min(28, 8 + simonMistakes * 2);
    resolveMinigame('memory', simonMistakes, score, timeCost, simonContext);
}
/* ---------- CULTURAL MEMORY CARDS (24 cards / 12 pairs) ---------- */
let culturalMatchContext = 'detour', culturalCards = [], culturalOpen = [], culturalMatched = 0, culturalMismatches = 0, culturalMatchLocked = false;
function startCulturalMatch(context) {
    culturalMatchContext = context || 'detour';
    culturalMatched = 0;
    culturalMismatches = 0;
    culturalOpen = [];
    culturalMatchLocked = false;
    const pairs = CULTURAL_MATCH_SETS[currentLegData.countryTag] || CULTURAL_MATCH_SETS.TOKYO;
    culturalCards = shuffled(pairs.flatMap((entry, pairId) => [
        { pairId, emoji: entry[0], label: entry[1], instance: `${pairId}-a`, matched: false },
        { pairId, emoji: entry[0], label: entry[1], instance: `${pairId}-b`, matched: false },
    ]));
    document.getElementById('cultureMatchEyebrow').textContent = `${currentLegData.cityName} Memory`;
    document.getElementById('culturePairsMatched').textContent = '0';
    document.getElementById('cultureMismatchCount').textContent = '0';
    document.getElementById('culturePenaltyMinutes').textContent = '0';
    document.getElementById('cultureMatchStatus').textContent = `Find all twelve ${currentLegData.cityName} cultural pairs.`;
    const warn = document.getElementById('cultureRankWarning');
    warn.classList.remove('penalty');
    warn.textContent = 'Every wrong pair adds four minutes to your race clock and can cost places.';
    renderCulturalMatchGrid();
    showScreen('screen-match');
}
function renderCulturalMatchGrid() {
    const grid = document.getElementById('cultureMatchGrid');
    grid.innerHTML = '';
    culturalCards.forEach((card, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'culture-card';
        btn.dataset.index = index;
        btn.setAttribute('aria-label', `Face-down cultural card ${index + 1}`);
        btn.innerHTML = `<span class="culture-card-inner"><span class="culture-card-face culture-card-back"></span><span class="culture-card-face culture-card-front"><span><span class="culture-card-emoji">${card.emoji}</span><span class="culture-card-label">${escapeHTML(card.label)}</span></span></span></span>`;
        btn.onclick = () => flipCulturalCard(index, btn);
        grid.appendChild(btn);
    });
}
function flipCulturalCard(index, button) {
    if (culturalMatchLocked)
        return;
    const card = culturalCards[index];
    if (!card || card.matched || culturalOpen.includes(index) || culturalOpen.length >= 2)
        return;
    culturalOpen.push(index);
    button.classList.add('flipped');
    button.setAttribute('aria-label', `${card.label} card`);
    if (culturalOpen.length < 2)
        return;
    culturalMatchLocked = true;
    const [firstIndex, secondIndex] = culturalOpen;
    const first = culturalCards[firstIndex], second = culturalCards[secondIndex];
    const firstButton = document.querySelector(`.culture-card[data-index="${firstIndex}"]`);
    const secondButton = document.querySelector(`.culture-card[data-index="${secondIndex}"]`);
    if (first.pairId === second.pairId) {
        first.matched = second.matched = true;
        culturalMatched++;
        document.getElementById('culturePairsMatched').textContent = String(culturalMatched);
        document.getElementById('cultureMatchStatus').textContent = `${first.label} matched — ${12 - culturalMatched} pair${12 - culturalMatched === 1 ? '' : 's'} remaining.`;
        setTimeout(() => {
            firstButton.classList.add('matched');
            secondButton.classList.add('matched');
            firstButton.disabled = secondButton.disabled = true;
            culturalOpen = [];
            culturalMatchLocked = false;
            if (culturalMatched === 12)
                finishCulturalMatch();
        }, 320);
    }
    else {
        culturalMismatches++;
        advanceClock(4); // direct elapsed-time/ranking consequence
        document.getElementById('cultureMismatchCount').textContent = String(culturalMismatches);
        document.getElementById('culturePenaltyMinutes').textContent = String(culturalMismatches * 4);
        document.getElementById('cultureMatchStatus').textContent = `Wrong pair — four race minutes added. Remember both positions.`;
        const warn = document.getElementById('cultureRankWarning');
        warn.classList.remove('penalty');
        void warn.offsetWidth;
        warn.classList.add('penalty');
        warn.textContent = `+${culturalMismatches * 4} total race minutes from mismatches. These minutes feed directly into the final ranking.`;
        firstButton.classList.add('wrong');
        secondButton.classList.add('wrong');
        setTimeout(() => {
            firstButton.classList.remove('flipped', 'wrong');
            secondButton.classList.remove('flipped', 'wrong');
            firstButton.setAttribute('aria-label', `Face-down cultural card ${firstIndex + 1}`);
            secondButton.setAttribute('aria-label', `Face-down cultural card ${secondIndex + 1}`);
            culturalOpen = [];
            culturalMatchLocked = false;
        }, 950);
    }
}
function finishCulturalMatch() {
    document.getElementById('cultureMatchStatus').textContent = `All twelve ${currentLegData.cityName} pairs matched.`;
    const score = Math.max(35, 100 - culturalMismatches * 5);
    const baseTimeCost = 10; // mismatch penalties were already added live
    setTimeout(() => resolveMinigame('match', culturalMismatches, score, baseTimeCost, culturalMatchContext), 650);
}
/* ---------- MAKE THE TOTAL (FIVE GROWING CARD-SUM ROUNDS) ---------- */
let totalRound = 1, totalShownCards = [], totalChoices = [], totalTarget = 0, totalCorrectValue = 0, totalScores = [], totalRoughFinishes = 0, totalLocked = false, previousTotalTarget = null, totalRoundLiveScore = 100, totalRoundStartedAt = 0, totalScoreInterval = null;
let gambleContext = 'detour';
function startGamble(context) {
    gambleContext = context || 'detour';
    totalRound = 1;
    totalScores = [];
    totalRoughFinishes = 0;
    previousTotalTarget = null;
    document.getElementById('gambleEyebrowLabel').textContent = currentLegData.themes.gamble.title;
    showScreen('screen-gamble');
    startTotalRound();
}
const PLAYING_CARD_RANKS = [{ rank: '1', value: 1 }, { rank: '2', value: 2 }, { rank: '3', value: 3 }, { rank: '4', value: 4 }, { rank: '5', value: 5 }, { rank: '6', value: 6 }, { rank: '7', value: 7 }, { rank: '8', value: 8 }, { rank: '9', value: 9 }, { rank: '10', value: 10 }];
const PLAYING_CARD_SUITS = [{ symbol: '♠', red: false }, { symbol: '♥', red: true }, { symbol: '♦', red: true }, { symbol: '♣', red: false }];
function totalCard(value) {
    const rank = typeof value === 'number'
        ? PLAYING_CARD_RANKS.find(card => card.value === value)
        : PLAYING_CARD_RANKS[Math.floor(Math.random() * PLAYING_CARD_RANKS.length)];
    const suit = PLAYING_CARD_SUITS[Math.floor(Math.random() * PLAYING_CARD_SUITS.length)];
    return { ...rank, ...suit };
}
function shownTotal() { return totalShownCards.reduce((sum, card) => sum + card.value, 0); }
function stopTotalScoreTimer() {
    clearInterval(totalScoreInterval);
    totalScoreInterval = null;
}
function renderTotalLiveScore() {
    const scoreEl = document.getElementById('gambleRoundScore');
    if (!scoreEl)
        return;
    const previous = Number(scoreEl.textContent);
    scoreEl.textContent = totalRoundLiveScore;
    scoreEl.classList.toggle('low', totalRoundLiveScore <= 50 && totalRoundLiveScore > 20);
    scoreEl.classList.toggle('danger', totalRoundLiveScore <= 20);
    if (Number.isFinite(previous) && previous !== totalRoundLiveScore) {
        scoreEl.classList.remove('tick');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('tick');
    }
}
function updateTotalLiveScore() {
    if (totalLocked || !totalRoundStartedAt)
        return;
    const elapsedSeconds = Math.floor((Date.now() - totalRoundStartedAt) / 1000);
    const nextScore = Math.max(0, 100 - elapsedSeconds);
    if (nextScore !== totalRoundLiveScore) {
        totalRoundLiveScore = nextScore;
        renderTotalLiveScore();
    }
}
function startTotalScoreTimer() {
    stopTotalScoreTimer();
    totalRoundStartedAt = Date.now();
    totalRoundLiveScore = 100;
    renderTotalLiveScore();
    totalScoreInterval = setInterval(updateTotalLiveScore, 200);
}
function generateTotalPuzzle() {
    // Round N shows N fixed cards. The player's one choice becomes card N+1.
    // Generate the cards first, then use a separate correct card to create an always-solvable random target.
    let attempts = 0;
    do {
        totalShownCards = Array.from({ length: totalRound }, () => totalCard());
        totalCorrectValue = 1 + Math.floor(Math.random() * 10);
        totalTarget = shownTotal() + totalCorrectValue;
        attempts++;
    } while (previousTotalTarget === totalTarget && attempts < 30);
    previousTotalTarget = totalTarget;
    // Four distinct answer cards, exactly one of which reaches the target.
    const values = new Set([totalCorrectValue]);
    const nearby = [-4, -3, -2, -1, 1, 2, 3, 4].sort(() => Math.random() - .5);
    for (const offset of nearby) {
        if (values.size >= 4)
            break;
        const candidate = totalCorrectValue + offset;
        if (candidate >= 1 && candidate <= 10)
            values.add(candidate);
    }
    while (values.size < 4) {
        values.add(1 + Math.floor(Math.random() * 10));
    }
    totalChoices = [...values].sort(() => Math.random() - .5).map(value => totalCard(value));
}
function startTotalRound() {
    totalLocked = false;
    generateTotalPuzzle();
    document.getElementById('gambleRoundDisplay').textContent = totalRound;
    totalRoundLiveScore = 100;
    document.getElementById('gambleRoundScore').textContent = '100';
    document.getElementById('gambleRoundScore').classList.remove('low', 'danger', 'tick');
    document.getElementById('gambleAverageScore').textContent = totalScores.length
        ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
        : '—';
    document.getElementById('gambleFeedbackLine').innerHTML = '&nbsp;';
    renderTotalHand();
    const choices = document.getElementById('gambleChoices');
    choices.innerHTML = '';
    totalChoices.forEach(card => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline';
        button.setAttribute('aria-label', `${card.value}-point card`);
        button.innerHTML = `<span style="font-size:24px;color:${card.red ? '#e11d3c' : '#f5f0e6'}">${card.rank}${card.symbol}</span>`;
        button.onclick = () => chooseTotalCard(card);
        choices.appendChild(button);
    });
    startTotalScoreTimer();
}
function renderTotalHand(selectedCard = null) {
    const cards = selectedCard ? [...totalShownCards, selectedCard] : totalShownCards;
    const total = cards.reduce((sum, card) => sum + card.value, 0);
    document.getElementById('gambleCards').innerHTML = cards.map(card => `<div class="playing-card${card.red ? ' red' : ''}" aria-label="${card.rank} of ${card.symbol}"><div class="playing-card-corner">${card.rank}<br>${card.symbol}</div><div class="playing-card-suit">${card.symbol}</div><div class="playing-card-corner bottom">${card.rank}<br>${card.symbol}</div></div>`).join('');
    document.getElementById('gambleTarget').textContent = totalTarget;
    document.getElementById('gambleTipLine').textContent = selectedCard
        ? `${totalRound} shown card${totalRound === 1 ? '' : 's'} + your pick = ${totalRound + 1} cards total.`
        : `Round ${totalRound}: ${totalRound} shown card${totalRound === 1 ? '' : 's'} + your pick. Choose one card to reach ${totalTarget}.`;
}
function chooseTotalCard(card) {
    if (totalLocked)
        return;
    updateTotalLiveScore();
    totalLocked = true;
    stopTotalScoreTimer();
    renderTotalHand(card);
    const finalTotal = shownTotal() + card.value;
    const speedScore = totalRoundLiveScore;
    let points, feedback;
    if (finalTotal === totalTarget) {
        points = speedScore;
        feedback = `Exact target — ${finalTotal}. ${points} speed point${points === 1 ? '' : 's'}.`;
    }
    else {
        const accuracyPenalty = Math.min(60, Math.abs(totalTarget - finalTotal) * 20);
        points = Math.max(0, speedScore - accuracyPenalty);
        feedback = `That makes ${finalTotal}. You needed a ${totalCorrectValue}-point card. ${speedScore} speed points − ${accuracyPenalty} accuracy penalty = ${points}.`;
        totalRoughFinishes++;
    }
    totalScores.push(points);
    document.getElementById('gambleRoundScore').textContent = points;
    document.getElementById('gambleAverageScore').textContent = Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length);
    document.getElementById('gambleFeedbackLine').textContent = feedback;
    document.querySelectorAll('#gambleChoices button').forEach(button => button.disabled = true);
    setTimeout(() => {
        if (!document.getElementById('screen-gamble').classList.contains('active'))
            return;
        if (totalRound >= 5)
            finishGamble();
        else {
            totalRound++;
            startTotalRound();
        }
    }, 1150);
}
function finishGamble() {
    stopTotalScoreTimer();
    const score = Math.round(totalScores.reduce((a, b) => a + b, 0) / Math.max(1, totalScores.length));
    const timeCost = 10 + totalRoughFinishes * 6;
    resolveMinigame('gamble', totalRoughFinishes, score, timeCost, gambleContext);
}
/* ---------- CODE BREAKER (Mastermind-style — unlimited guesses cost time, never bust) ---------- */
const CODE_COLORS = ['1', '2', '3', '4', '5'];
const CODE_LENGTH = 4;
let codeContext = 'detour', codeSecret = [], codeGuess = [], codeGuesses = 0, codeLocked = false, codeFinishTimer = null;
function startCode(context) {
    codeContext = context || 'detour';
    codeGuesses = 0;
    codeLocked = false;
    clearTimeout(codeFinishTimer);
    codeSecret = [];
    for (let i = 0; i < CODE_LENGTH; i++)
        codeSecret.push(Math.floor(Math.random() * CODE_COLORS.length));
    codeGuess = new Array(CODE_LENGTH).fill(0);
    document.getElementById('codeEyebrowLabel').textContent = currentLegData.themes.code.title;
    document.getElementById('codeGuessCount').textContent = '0';
    document.getElementById('codeHistory').innerHTML = '';
    document.getElementById('codeHistoryEmpty').style.display = 'block';
    const codeSubmitButton = document.getElementById('codeSubmitBtn');
    codeSubmitButton.disabled = false;
    codeSubmitButton.style.display = 'flex';
    codeSubmitButton.style.visibility = 'visible';
    codeSubmitButton.style.opacity = '1';
    document.getElementById('codeStatusLine').textContent = 'Use the arrows to scroll each slot to a number, then submit your guess.';
    renderCodeSlots();
    showScreen('screen-code');
}
function renderCodeSlots() {
    const wrap = document.getElementById('codeSlots');
    wrap.innerHTML = '';
    codeGuess.forEach((val, i) => {
        const col = document.createElement('div');
        col.className = 'code-slot-col';
        const up = document.createElement('div');
        up.className = 'code-arrow';
        up.textContent = '▲';
        const digit = document.createElement('div');
        digit.className = 'code-slot';
        digit.textContent = CODE_COLORS[val];
        const down = document.createElement('div');
        down.className = 'code-arrow';
        down.textContent = '▼';
        up.onclick = () => {
            codeGuess[i] = (codeGuess[i] + 1) % CODE_COLORS.length;
            digit.textContent = CODE_COLORS[codeGuess[i]];
        };
        down.onclick = () => {
            codeGuess[i] = (codeGuess[i] - 1 + CODE_COLORS.length) % CODE_COLORS.length;
            digit.textContent = CODE_COLORS[codeGuess[i]];
        };
        col.appendChild(up);
        col.appendChild(digit);
        col.appendChild(down);
        wrap.appendChild(col);
    });
}
function submitCodeGuess() {
    if (codeLocked)
        return;
    codeGuesses++;
    document.getElementById('codeGuessCount').textContent = codeGuesses;
    const secretCopy = [...codeSecret];
    const guessCopy = [...codeGuess];
    let black = 0;
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (guessCopy[i] === secretCopy[i]) {
            black++;
            secretCopy[i] = null;
            guessCopy[i] = undefined;
        }
    }
    let white = 0;
    for (let i = 0; i < CODE_LENGTH; i++) {
        if (guessCopy[i] === undefined)
            continue;
        const idx = secretCopy.indexOf(guessCopy[i]);
        if (idx !== -1) {
            white++;
            secretCopy[idx] = null;
        }
    }
    const row = document.createElement('div');
    document.querySelectorAll('#codeHistory .code-history-row').forEach(el => el.classList.remove('latest'));
    row.className = 'code-history-row latest';
    const dead = CODE_LENGTH - black - white;
    const digits = codeGuess.map(v => `<span class="code-history-digit">${CODE_COLORS[v]}</span>`).join('');
    const pegs = `${'<span class="code-peg green" title="Correct number and position"></span>'.repeat(black)}${'<span class="code-peg yellow" title="Correct number, wrong position"></span>'.repeat(white)}${'<span class="code-peg white" title="Number not in code"></span>'.repeat(dead)}`;
    row.innerHTML = `<div class="code-attempt-number">#${codeGuesses}</div><div class="code-history-guess">${digits}</div><div class="code-feedback" aria-label="${black} green, ${white} yellow, ${dead} white">${pegs}</div>`;
    const history = document.getElementById('codeHistory');
    document.getElementById('codeHistoryEmpty').style.display = 'none';
    history.prepend(row);
    history.scrollTop = 0;
    if (black === CODE_LENGTH) {
        codeLocked = true;
        document.getElementById('codeSubmitBtn').disabled = true;
        document.getElementById('codeStatusLine').textContent = `Lockbox opened on attempt ${codeGuesses}. Your final result is recorded below.`;
        codeFinishTimer = setTimeout(() => finishCode(), 900);
    }
    else {
        advanceClock(4);
        updateStatusBar();
        document.getElementById('codeStatusLine').textContent = `Attempt ${codeGuesses}: ${black} green, ${white} yellow and ${dead} white. Adjust the digits and try again.`;
    }
}
function finishCode() {
    const score = Math.max(40, 100 - codeGuesses * 6);
    const timeCost = Math.min(30, 6 + codeGuesses * 2);
    resolveMinigame('code', codeGuesses, score, timeCost, codeContext);
}
/* ---------- LANGUAGE FLASHCARDS (memorize, then drag-match — hard mode: 8 pairs, 4s) ---------- */
let languageMatched = 0, languageMissed = 0, languageContext = 'detour', languageTimerId = null;
let languageResetCount = 0;
let activeLanguageWords = [];
function startLanguageGame(context) {
    languageContext = context;
    languageMatched = 0;
    languageMissed = 0;
    languageResetCount = 0;
    activeLanguageWords = [...currentLegData.languageWords].sort(() => Math.random() - 0.5).slice(0, 8);
    document.getElementById('languageMatchedCount').textContent = '0';
    document.getElementById('languageMissedCount').textContent = '0';
    document.getElementById('languageResetCount').textContent = '0';
    document.getElementById('languageEyebrowLabel').textContent = context === 'detour'
        ? currentLegData.themes.language.title
        : 'Cram Session';
    showLanguageMemorizePhase();
    showScreen('screen-language');
}
function showLanguageMemorizePhase() {
    clearTimeout(languageTimerId);
    languageTimerId = null;
    document.getElementById('languageStatusLine').textContent = 'Study these 8 ' + currentLegData.languageLabel + ' pairs. Take as long as you need, then confirm when you are ready.';
    document.getElementById('languageMemorizeList').style.display = 'flex';
    document.getElementById('languageMatchArea').style.display = 'none';
    const memList = document.getElementById('languageMemorizeList');
    memList.innerHTML = '';
    activeLanguageWords.forEach(w => {
        const row = document.createElement('div');
        row.className = 'lang-row';
        row.innerHTML = '<span>' + w.en + '</span><b>' + w.word + '</b>';
        memList.appendChild(row);
    });
    const readyWrap = document.createElement('div');
    readyWrap.className = 'language-ready-confirmation';
    readyWrap.style.cssText = 'display:flex;flex-direction:column;gap:7px;margin-top:8px;width:100%;';
    const readyButton = document.createElement('button');
    readyButton.type = 'button';
    readyButton.className = 'btn btn-primary';
    readyButton.textContent = 'I’m Ready — Start Matching →';
    readyButton.onclick = () => {
        readyButton.disabled = true;
        beginLanguageMatch();
    };
    const readyNote = document.createElement('div');
    readyNote.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:10px;line-height:1.45;text-align:center;color:rgba(245,240,230,.58);';
    readyNote.textContent = 'The matching game begins only after you confirm.';
    readyWrap.appendChild(readyButton);
    readyWrap.appendChild(readyNote);
    memList.appendChild(readyWrap);
}
function resetLanguageAttempt() {
    clearTimeout(languageTimerId);
    languageResetCount++;
    document.getElementById('languageResetCount').textContent = languageResetCount;
    languageMatched = 0;
    document.getElementById('languageMatchedCount').textContent = '0';
    advanceClock(10); // resetting costs time, but never ends the attempt
    showLanguageMemorizePhase();
}
function beginLanguageMatch() {
    clearTimeout(languageTimerId);
    languageTimerId = null;
    document.getElementById('languageMemorizeList').style.display = 'none';
    document.getElementById('languageMatchArea').style.display = 'block';
    document.getElementById('languageStatusLine').textContent = 'Drag each word to its English match.';
    const words = activeLanguageWords;
    const dropZoneWrap = document.getElementById('languageDropZones');
    const chipWrap = document.getElementById('languageChipPool');
    dropZoneWrap.innerHTML = '';
    chipWrap.innerHTML = '';
    words.forEach(w => {
        const zone = document.createElement('div');
        zone.className = 'lang-dropzone';
        zone.dataset.answer = w.word;
        zone.innerHTML = `<span>${w.en}</span><span class="lang-zone-fill"></span>`;
        dropZoneWrap.appendChild(zone);
    });
    const shuffledChips = [...words].sort(() => Math.random() - 0.5);
    shuffledChips.forEach(w => {
        const chip = document.createElement('div');
        chip.className = 'lang-chip';
        chip.textContent = w.word;
        chip.dataset.answer = w.word;
        attachChipDrag(chip);
        chipWrap.appendChild(chip);
    });
}
function attachChipDrag(chip) {
    chip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const startRect = chip.getBoundingClientRect();
        const offsetX = e.clientX - startRect.left;
        const offsetY = e.clientY - startRect.top;
        chip.setPointerCapture(e.pointerId);
        chip.classList.add('dragging');
        chip.style.width = startRect.width + 'px';
        chip.style.left = startRect.left + 'px';
        chip.style.top = startRect.top + 'px';
        function onMove(ev) {
            chip.style.left = (ev.clientX - offsetX) + 'px';
            chip.style.top = (ev.clientY - offsetY) + 'px';
        }
        function onUp(ev) {
            chip.removeEventListener('pointermove', onMove);
            chip.removeEventListener('pointerup', onUp);
            chip.classList.remove('dragging');
            chip.style.position = '';
            chip.style.left = '';
            chip.style.top = '';
            chip.style.width = '';
            let matchedZone = null;
            document.querySelectorAll('.lang-dropzone').forEach(z => {
                const r = z.getBoundingClientRect();
                if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    matchedZone = z;
                }
            });
            if (matchedZone && !matchedZone.classList.contains('filled')) {
                if (matchedZone.dataset.answer === chip.dataset.answer) {
                    matchedZone.classList.add('filled');
                    matchedZone.querySelector('.lang-zone-fill').textContent = chip.textContent;
                    chip.remove();
                    languageMatched++;
                    document.getElementById('languageMatchedCount').textContent = languageMatched;
                    if (languageMatched >= activeLanguageWords.length)
                        finishLanguageGame();
                }
                else {
                    languageMissed++;
                    document.getElementById('languageMissedCount').textContent = languageMissed;
                    matchedZone.classList.add('flash-wrong');
                    setTimeout(() => matchedZone.classList.remove('flash-wrong'), 400);
                }
            }
        }
        chip.addEventListener('pointermove', onMove);
        chip.addEventListener('pointerup', onUp);
    });
}
function finishLanguageGame() {
    const missed = languageMissed;
    const score = Math.max(40, 100 - missed * 5);
    const timeCost = Math.min(34, 12 + missed * 3);
    resolveMinigame('language', missed, score, timeCost, languageContext);
}
/* Result lines come in two styles: most are written to follow a subject
   ("read the deck like a pro..."), while balance lines carry their own
   ("The tower held..."). Capitalisation tells them apart, so overrides and
   future template text both work without any per-type special-casing. */
function attributeLine(line) {
    if (!line)
        return '';
    return /^[A-Z]/.test(line) ? line : `You and ${partnerFirstName()} ${line}`;
}
/* Always-completable tasks (memory / gamble / language / code) used to render as an
   unqualified gold success no matter how many mistakes it took. These grade the run into
   three tiers so a clean solve and a ten-mistake grind no longer look identical.
   `raw` is the mistake/guess count for these types — lower is better. */
const GRADE_THRESHOLDS = { rhythm: [0, 5], memory: [0, 2], match: [0, 4], gamble: [0, 1], language: [0, 2], code: [2, 5] };
let balanceOutcome = null; // set by finishStack — balance is graded by the physics run, not a count
function gradeAttempt(type, raw) {
    if (type === 'balance')
        return balanceOutcome;
    const t = GRADE_THRESHOLDS[type];
    if (!t)
        return null; // not an always-completable type
    if (raw <= t[0])
        return 'excellent';
    if (raw <= t[1])
        return 'completed';
    return 'struggle';
}
// Balance uses its own vocabulary for the three tiers.
const BALANCE_TAGS = { excellent: 'Perfect Balance', completed: 'Task Complete', struggle: 'Collapsed' };
function gradeTag(type, grade, style) {
    if (!grade)
        return style.tag;
    return type === 'balance' ? BALANCE_TAGS[grade] : GRADE_STYLE[grade].tag;
}
const GRADE_STYLE = {
    excellent: { cls: 'win', tag: 'Flawless' },
    completed: { cls: 'win', tag: 'Completed' },
    struggle: { cls: 'mid', tag: 'Costly struggle' },
};
const DETOUR_VISUAL_CODES = { reaction: 'TAP', rhythm: 'BPM', balance: 'HOLD', memory: 'SEQ', match: 'PAIR', gamble: 'SUM', language: 'LEX', code: 'CODE' };
const DETOUR_VISUAL_LABELS = { reaction: 'Reaction route', rhythm: 'Rhythm route', balance: 'Balance route', memory: 'Memory route', match: 'Matching route', gamble: 'Numbers route', language: 'Language route', code: 'Code route' };
function renderDetourResultCard(type, bigText, tag, styleClass) {
    const code = DETOUR_VISUAL_CODES[type] || 'DONE';
    const label = DETOUR_VISUAL_LABELS[type] || 'Detour route';
    return `<div class="result-banner detour-card ${styleClass}">`
        + `<div class="detour-visual"><div class="detour-route left"></div><div class="detour-route right"></div>`
        + `<div class="detour-route-badge"><span class="detour-route-code">${code}</span><span class="detour-route-label">${label}</span></div>`
        + `<div class="detour-choice-mark">Choice completed</div></div>`
        + `<div class="detour-banner-copy"><div class="big">${bigText}</div>${tag ? `<div class="sub">${tag}</div>` : ''}</div></div>`;
}
function finishDetour(type, raw) {
    const banner = document.getElementById('detourResultBanner');
    const host = document.getElementById('detourHostLine');
    const theme = getTaskTheme(type);
    const grade = gradeAttempt(type, raw);
    const good = grade ? (grade !== 'struggle') : performance.detour >= 60;
    let bigText;
    if (type === 'reaction')
        bigText = `${raw} Correct Taps`;
    else if (type === 'rhythm')
        bigText = raw === 0 ? 'Perfect Rhythm Run' : `${raw} Missed Beat${raw === 1 ? '' : 's'}`;
    else if (type === 'balance')
        bigText = `Held ${raw.toFixed(1)}s &middot; ${stackPerfect.toFixed(1)}s perfect`;
    else if (type === 'memory')
        bigText = raw === 0 ? `4/4 Rounds, No Mistakes` : `4/4 Rounds, ${raw} Mistakes`;
    else if (type === 'match')
        bigText = raw === 0 ? `12/12 Pairs, Perfect Memory` : `12/12 Pairs, ${raw} Wrong Match${raw === 1 ? '' : 'es'}`;
    else if (type === 'gamble')
        bigText = raw === 0 ? `5 Totals · ${Math.round(performance.detour)} Avg` : `5 Totals · ${Math.round(performance.detour)} Avg · ${raw} Mistake${raw === 1 ? '' : 's'}`;
    else if (type === 'language')
        bigText = raw === 0 ? `8/8, No Misses` : `8/8, ${raw} Missed`;
    else if (type === 'code')
        bigText = raw === 1 ? `Cracked in 1 Guess` : `Cracked in ${raw} Guesses`;
    const style = grade ? GRADE_STYLE[grade] : (good ? { cls: 'win' } : { cls: 'mid' });
    banner.innerHTML = renderDetourResultCard(type, bigText, gradeTag(type, grade, style), style.cls);
    host.textContent = attributeLine(good ? theme.winLine : theme.loseLine);
    previewProjectedRank('detourProjectedRankText');
    showScreen('screen-detour-result');
}
/* ---------- DETOUR / ROADBLOCK FORFEIT (TWO EXPLICIT CONFIRMATIONS) ---------- */
function openTaskForfeit(task) {
    pendingForfeitTask = task;
    pendingForfeitPenalty = null;
    document.getElementById('forfeitHeading').textContent = `Leave This ${task === 'detour' ? 'Detour' : 'Roadblock'}?`;
    document.getElementById('forfeitCopy').textContent = 'Forfeiting is permanent. First confirm that you want to continue, then choose a penalty and confirm that exact consequence once more.';
    document.getElementById('forfeitStageOne').style.display = 'block';
    document.getElementById('forfeitStageTwo').style.display = 'none';
    document.getElementById('forfeitStageThree').style.display = 'none';
    document.getElementById('taskForfeitOverlay').style.display = 'flex';
}
function closeForfeitOverlay() {
    document.getElementById('taskForfeitOverlay').style.display = 'none';
    pendingForfeitTask = null;
    pendingForfeitPenalty = null;
}
function confirmForfeitIntent() {
    if (!pendingForfeitTask)
        return;
    document.getElementById('forfeitStageOne').style.display = 'none';
    document.getElementById('forfeitStageTwo').style.display = 'block';
}
function returnToForfeitFirstConfirmation() {
    pendingForfeitPenalty = null;
    document.getElementById('forfeitStageTwo').style.display = 'none';
    document.getElementById('forfeitStageOne').style.display = 'block';
}
function chooseForfeitPenalty(penalty) {
    if (!pendingForfeitTask || !['time', 'funds'].includes(penalty))
        return;
    pendingForfeitPenalty = penalty;
    const finalTitle = document.getElementById('forfeitFinalTitle');
    const finalCopy = document.getElementById('forfeitFinalCopy');
    if (penalty === 'time') {
        finalTitle.textContent = 'Confirm +2 Hours';
        finalCopy.textContent = 'The clock advances 120 minutes and every remaining rival moves ahead of your team.';
    }
    else {
        finalTitle.textContent = 'Confirm Zero Funds';
        finalCopy.textContent = `Your full remaining balance of ${currentLegData.currencySymbol}${Math.round(budget).toLocaleString()} is surrendered.`;
    }
    document.getElementById('forfeitStageTwo').style.display = 'none';
    document.getElementById('forfeitStageThree').style.display = 'block';
}
function returnToForfeitPenaltyChoice() {
    pendingForfeitPenalty = null;
    document.getElementById('forfeitStageThree').style.display = 'none';
    document.getElementById('forfeitStageTwo').style.display = 'block';
}
function stopActiveMinigame() {
    clearInterval(slurpTimerInt);
    const slurpArea = document.getElementById('slurpArea');
    if (slurpArea)
        slurpArea.innerHTML = '';
    rhythmFinished = true;
    clearRhythmRun();
    cancelAnimationFrame(stackRaf);
    holdDir = 0;
    simonAcceptingInput = false;
    simonSequence = [];
    clearTimeout(languageTimerId);
    clearInterval(arcadeInt);
    clearInterval(arcadeSpawnInt);
    mazeActive = false;
    clearTimeout(codeFinishTimer);
    stopTotalScoreTimer();
    codeLocked = true;
}
function applyTaskForfeit() {
    if (!pendingForfeitTask || !pendingForfeitPenalty)
        return;
    const task = pendingForfeitTask;
    const penalty = pendingForfeitPenalty;
    stopActiveMinigame();
    activeTaskContext = null;
    if (penalty === 'time') {
        advanceClock(120);
        timeForfeitThisLeg = true;
    }
    else {
        budget = 0;
        updateStatusBar();
    }
    document.getElementById('taskForfeitOverlay').style.display = 'none';
    pendingForfeitTask = null;
    pendingForfeitPenalty = null;
    lastForfeitResult = { task, penalty };
    showForfeitResult(task, penalty);
    saveGameState(task === 'detour' ? 'screen-detour-result' : 'screen-roadblock-result');
}
function showForfeitResult(task, penalty) {
    setLandmarkBanner(task === 'detour' ? currentLegData.dest1 : currentLegData.dest2, task === 'detour' ? 'Detour' : 'Roadblock');
    const consequence = penalty === 'time'
        ? 'A two-hour penalty hits the race clock. Every rival has time to move ahead while your team waits.'
        : `Your ${currentLegData.currencySymbol} balance drops to zero. Free walking routes remain available, but every paid shortcut is now out of reach.`;
    const penaltyCode = penalty === 'time' ? '2H' : '$0';
    const forfeitCard = `<div class="forfeit-result-card"><div class="forfeit-result-kicker">Race control &middot; penalty confirmed</div><div class="forfeit-result-main"><div class="forfeit-result-icon"><b>${penaltyCode}</b><small>Penalty</small></div><div><b>${task === 'detour' ? 'Detour' : 'Roadblock'} forfeited</b><span>${penalty === 'time' ? '+120 minutes' : 'All funds surrendered'}</span></div></div></div>`;
    if (task === 'detour') {
        performance.detour = 0;
        document.getElementById('detourResultBanner').innerHTML = forfeitCard;
        document.getElementById('detourHostLine').textContent = consequence;
        previewProjectedRank('detourProjectedRankText');
        showScreen('screen-detour-result');
    }
    else {
        performance.roadblock = 0;
        document.getElementById('roadblockResultBanner').innerHTML = forfeitCard;
        document.getElementById('roadblockHostLine').textContent = consequence;
        previewProjectedRank('roadblockProjectedRankText');
        showScreen('screen-roadblock-result');
    }
}
/* ---------- ROADBLOCK: ROCK PAPER SCISSORS / DELIBERATE ---------- */
const RPS_THROWS = {
    rock: { label: 'Rock', emoji: '✊', beats: 'scissors' },
    paper: { label: 'Paper', emoji: '✋', beats: 'rock' },
    scissors: { label: 'Scissors', emoji: '✌️', beats: 'paper' },
};
let rpsRoundToken = 0;
let rpsRoundLocked = false;
let rpsResolvedWho = null;
let playerRoadblockConfidence = 60;
let partnerRoadblockConfidence = 60;
let lastConferDialogueIndex = -1;
const CONFER_DIALOGUES = [
    { player: 'I handled the last task. I can keep the momentum going.', partner: 'You can, but I feel sharp too. Let’s compare before we lock it in.' },
    { player: 'This looks like my kind of challenge. Are you comfortable sitting out?', partner: 'I am, unless my meter comes out stronger than yours.' },
    { player: 'Be honest—do you want this one, or should I take it?', partner: 'I want the team to move fastest. Let the confidence reading settle it.' },
    { player: 'I’m ready, but I don’t want us choosing on ego.', partner: 'Agreed. Stronger racer takes it; the other one supports.' },
    { player: 'We only get one decision here. I think I can do it.', partner: 'Then show me the meter. If yours is higher, it’s yours.' },
    { player: 'This Roadblock could change our position. How steady are you?', partner: 'Steady enough to volunteer, but not too proud to step aside.' },
];
function nextConferDialogue() {
    let index = Math.floor(Math.random() * CONFER_DIALOGUES.length);
    if (CONFER_DIALOGUES.length > 1 && index === lastConferDialogueIndex) {
        index = (index + 1 + Math.floor(Math.random() * (CONFER_DIALOGUES.length - 1))) % CONFER_DIALOGUES.length;
    }
    lastConferDialogueIndex = index;
    return CONFER_DIALOGUES[index];
}
function showConferScreen() {
    playerRoadblockConfidence = 42 + Math.floor(Math.random() * 53);
    partnerRoadblockConfidence = 42 + Math.floor(Math.random() * 53);
    document.getElementById('playerConfidenceValue').textContent = `${playerRoadblockConfidence} / 100`;
    document.getElementById('partnerConfidenceValue').textContent = `${partnerRoadblockConfidence} / 100`;
    document.getElementById('playerConfidenceArrow').style.left = `${playerRoadblockConfidence}%`;
    document.getElementById('partnerConfidenceArrow').style.left = `${partnerRoadblockConfidence}%`;
    const p = partnerFirstName();
    document.getElementById('conferSceneBanner').innerHTML = renderBannerSVG(currentLegData.dest2.banner, currentLegData.dest2.place, 'Roadblock Decision');
    document.getElementById('conferPlayerAvatar').innerHTML = renderRacerAvatar(playerGender, playerTone, playerCostume);
    document.getElementById('conferPartnerAvatar').innerHTML = renderRacerAvatar(partnerGender, partnerTone, partnerCostume);
    document.getElementById('conferPartnerSceneName').textContent = p;
    document.getElementById('conferPartnerBubbleName').textContent = p;
    const dialogue = nextConferDialogue();
    document.querySelector('#conferPlayerBubble span').textContent = dialogue.player;
    document.querySelector('#conferPartnerBubble span').textContent = dialogue.partner;
    document.getElementById('conferAdvice').textContent = partnerRoadblockConfidence > playerRoadblockConfidence
        ? `${p} looks more certain about this one. A strong attempt could move your team up.`
        : `Your meter is higher, but the final decision is still yours.`;
    showScreen('screen-confer');
}
function openRPS() {
    resetRPSRound();
    showScreen('screen-rps');
}
function resetRPSRound() {
    rpsRoundToken++;
    rpsRoundLocked = false;
    rpsResolvedWho = null;
    document.getElementById('rpsInstruction').textContent = 'Choose your throw. Your partner chooses secretly. Both choices appear together after the count.';
    const cue = document.getElementById('rpsCue');
    cue.className = 'rps-cue';
    cue.textContent = 'Choose Your Throw';
    document.getElementById('rpsCueWrap').style.display = 'flex';
    const reveal = document.getElementById('rpsReveal');
    reveal.classList.remove('show');
    document.getElementById('rpsPlayerCard').className = 'rps-result-card';
    document.getElementById('rpsPartnerCard').className = 'rps-result-card';
    const choices = document.getElementById('rpsChoices');
    choices.style.display = 'grid';
    choices.querySelectorAll('button').forEach(btn => btn.disabled = false);
    document.getElementById('rpsOutcome').classList.remove('show');
    document.getElementById('rpsOutcomeTitle').textContent = '';
    document.getElementById('rpsOutcomeCopy').textContent = '';
}
function playRPS(choice) {
    if (rpsRoundLocked || !RPS_THROWS[choice])
        return;
    rpsRoundLocked = true;
    const partnerChoice = Object.keys(RPS_THROWS)[Math.floor(Math.random() * 3)];
    const token = ++rpsRoundToken;
    const choices = document.getElementById('rpsChoices');
    choices.querySelectorAll('button').forEach(btn => btn.disabled = true);
    choices.style.display = 'none';
    document.getElementById('rpsInstruction').textContent = 'Both throws are locked. Watch the count; both choices appear together.';
    document.getElementById('rpsOutcome').classList.remove('show');
    document.getElementById('rpsReveal').classList.remove('show');
    document.getElementById('rpsCueWrap').style.display = 'flex';
    runRPSCue(0, choice, partnerChoice, token);
}
function runRPSCue(index, playerChoice, partnerChoice, token) {
    if (token !== rpsRoundToken)
        return;
    const words = ['Rock', 'Paper', 'Scissors'];
    if (index >= words.length) {
        setTimeout(() => revealRPSRound(playerChoice, partnerChoice, token), 120);
        return;
    }
    const cue = document.getElementById('rpsCue');
    cue.classList.remove('word');
    cue.textContent = words[index];
    void cue.offsetWidth;
    cue.classList.add('word');
    setTimeout(() => runRPSCue(index + 1, playerChoice, partnerChoice, token), 760);
}
function revealRPSRound(playerChoice, partnerChoice, token) {
    if (token !== rpsRoundToken)
        return;
    const playerThrow = RPS_THROWS[playerChoice];
    const partnerThrow = RPS_THROWS[partnerChoice];
    document.getElementById('rpsPlayerHand').textContent = playerThrow.emoji;
    document.getElementById('rpsPlayerChoice').textContent = playerThrow.label;
    document.getElementById('rpsPartnerHand').textContent = partnerThrow.emoji;
    document.getElementById('rpsPartnerChoice').textContent = partnerThrow.label;
    document.getElementById('rpsCueWrap').style.display = 'none';
    const reveal = document.getElementById('rpsReveal');
    reveal.classList.remove('show');
    void reveal.offsetWidth;
    reveal.classList.add('show');
    const playerCard = document.getElementById('rpsPlayerCard');
    const partnerCard = document.getElementById('rpsPartnerCard');
    const title = document.getElementById('rpsOutcomeTitle');
    const copy = document.getElementById('rpsOutcomeCopy');
    const continueBtn = document.getElementById('rpsContinueBtn');
    const pName = partnerFirstName();
    if (playerChoice === partnerChoice) {
        rpsResolvedWho = null;
        title.textContent = 'Tie — Throw Again';
        copy.textContent = `You and ${pName} reveal the same choice. Nobody gets out of the Roadblock that easily.`;
        continueBtn.textContent = 'Play Another Round';
    }
    else {
        const playerWins = playerThrow.beats === partnerChoice;
        rpsResolvedWho = playerWins ? 'partner' : 'you';
        playerCard.classList.add(playerWins ? 'winner' : 'loser');
        partnerCard.classList.add(playerWins ? 'loser' : 'winner');
        title.textContent = rpsResolvedWho === 'you' ? 'You Lose' : `${pName} Loses`;
        copy.textContent = rpsResolvedWho === 'you'
            ? 'Your throw loses. You are taking the Roadblock while your partner watches.'
            : `${pName}'s throw loses. The Roadblock belongs to your partner.`;
        continueBtn.textContent = rpsResolvedWho === 'you' ? 'I’ll Take the Roadblock' : `Send ${pName} to the Roadblock`;
    }
    document.getElementById('rpsOutcome').classList.add('show');
}
function continueRPSRoadblock() {
    if (!rpsRoundLocked)
        return;
    if (!rpsResolvedWho) {
        resetRPSRound();
        return;
    }
    const who = rpsResolvedWho;
    rpsRoundToken++;
    rpsResolvedWho = null;
    prepRoadblock(who);
}
function prepRoadblock(who) {
    activeTaskContext = 'roadblock';
    pendingRoadblockWho = who;
    if (who === 'you') {
        if (roadblockType === 'arcade') {
            document.getElementById('arcadeWho').textContent = 'You';
            startArcade();
        }
        else if (roadblockType === 'reaction')
            startSlurp('roadblock');
        else if (roadblockType === 'rhythm')
            startRhythm('roadblock');
        else if (roadblockType === 'balance')
            startStack('roadblock');
        else if (roadblockType === 'memory')
            startSimon('roadblock');
        else if (roadblockType === 'match')
            startCulturalMatch('roadblock');
        else if (roadblockType === 'gamble')
            startGamble('roadblock');
        else if (roadblockType === 'language')
            startLanguageGame('roadblock');
        else if (roadblockType === 'code')
            startCode('roadblock');
    }
    else {
        simulatePartnerRoadblock();
    }
}
function simulatePartnerRoadblock() {
    let score = partnerRoadblockConfidence + (Math.random() * 24 - 12);
    score = Math.max(0, Math.min(100, Math.round(score)));
    performance.roadblock = score;
    recordTaskExperience(roadblockType);
    const timeCost = Math.round(28 - (score / 100) * 20);
    advanceClock(timeCost);
    if (partnerRoadblockConfidence >= 78 && score >= 72) {
        playerElapsed = Math.max(0, effectiveElapsed() - 5);
        updateRankHud(Math.max(1, Number(document.getElementById('rankInlineValue').textContent) || 2) - 1);
    }
    finishRoadblock(roadblockType, null);
}
/* ---------- MINIGAME: NEON MAZE CHASE ---------- */
const MAZE_MAP = [
    '###########',
    '#P..#.....#',
    '#.#.#.###.#',
    '#.#...#...#',
    '#.###.#.#.#',
    '#.....#.#.#',
    '###.#...#.#',
    '#...#.###.#',
    '#.#.....#G#',
    '#.....#...#',
    '###########'
];
const MAZE_GOAL = 22;
const MAZE_FINISH = { r: 8, c: 9 };
let arcadeScore = 0, arcadeTimeLeft = 40.0, arcadeInt, arcadeSpawnInt;
let mazePlayer = { r: 1, c: 1 }, mazeStart = { r: 1, c: 1 }, mazePatrols = [], mazeDots = new Set();
let mazeHits = 0, mazeActive = false, mazeTouchStart = null, mazeRunnerAngle = 0;
function mazeKey(r, c) { return `${r},${c}`; }
function mazeOpen(r, c) { return !!MAZE_MAP[r] && MAZE_MAP[r][c] !== '#'; }
function startArcade() {
    clearInterval(arcadeInt);
    clearInterval(arcadeSpawnInt);
    arcadeScore = 0;
    arcadeTimeLeft = 40.0;
    mazeHits = 0;
    mazeActive = true;
    mazePlayer = { ...mazeStart };
    mazePatrols = [{ r: 8, c: 9, color: '#ff4a6d' }, { r: 9, c: 3, color: '#47d7ff' }];
    mazeDots = new Set();
    MAZE_MAP.forEach((row, r) => [...row].forEach((cell, c) => {
        if (cell !== '#' && cell !== 'P' && cell !== 'G')
            mazeDots.add(mazeKey(r, c));
    }));
    document.getElementById('arcadeScore').textContent = '0';
    document.getElementById('arcadeGoal').textContent = MAZE_GOAL;
    document.getElementById('arcadeTime').textContent = '40.0';
    document.getElementById('mazeHelp').textContent = `Collect ${MAZE_GOAL} dots, then reach the glowing flag. Swipe the maze or tap the arrow pad.`;
    const area = document.getElementById('arcadeArea');
    area.style.gridTemplateColumns = `repeat(${MAZE_MAP[0].length},1fr)`;
    area.style.gridTemplateRows = `repeat(${MAZE_MAP.length},1fr)`;
    area.ontouchstart = event => {
        const touch = event.changedTouches[0];
        mazeTouchStart = { x: touch.clientX, y: touch.clientY };
    };
    area.ontouchend = event => {
        if (!mazeTouchStart)
            return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - mazeTouchStart.x;
        const dy = touch.clientY - mazeTouchStart.y;
        mazeTouchStart = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18)
            return;
        if (Math.abs(dx) > Math.abs(dy))
            moveMazePlayer(0, dx > 0 ? 1 : -1);
        else
            moveMazePlayer(dy > 0 ? 1 : -1, 0);
    };
    showScreen('screen-arcade');
    renderMazeBoard();
    arcadeSpawnInt = setInterval(moveMazePatrols, 620);
    arcadeInt = setInterval(() => {
        if (!mazeActive)
            return;
        arcadeTimeLeft = Math.max(0, arcadeTimeLeft - .1);
        document.getElementById('arcadeTime').textContent = arcadeTimeLeft.toFixed(1);
        if (arcadeTimeLeft <= 0)
            finishMazeGame(false);
    }, 100);
}
function renderMazeBoard() {
    const area = document.getElementById('arcadeArea');
    area.innerHTML = '';
    MAZE_MAP.forEach((row, r) => [...row].forEach((cell, c) => {
        const tile = document.createElement('div');
        tile.className = `maze-cell${cell === '#' ? ' wall' : ''}`;
        if (cell !== '#' && mazeDots.has(mazeKey(r, c)))
            tile.innerHTML = '<i class="maze-dot"></i>';
        if (cell === 'G')
            tile.innerHTML = `<i class="maze-goal${arcadeScore >= MAZE_GOAL ? '' : ' locked'}" role="img" aria-label="Finish flag">🏁</i>`;
        if (mazePlayer.r === r && mazePlayer.c === c)
            tile.innerHTML = `<i class="maze-runner" style="--runner-angle:${mazeRunnerAngle}deg"></i>`;
        const patrol = mazePatrols.find(item => item.r === r && item.c === c);
        if (patrol)
            tile.innerHTML = `<i class="maze-patrol" style="--patrol:${patrol.color}"></i>`;
        area.appendChild(tile);
    }));
}
function moveMazePlayer(dr, dc) {
    if (!mazeActive)
        return;
    const next = { r: mazePlayer.r + dr, c: mazePlayer.c + dc };
    if (!mazeOpen(next.r, next.c))
        return;
    mazePlayer = next;
    mazeRunnerAngle = dc > 0 ? 0 : dc < 0 ? 180 : dr > 0 ? 90 : -90;
    const key = mazeKey(next.r, next.c);
    if (mazeDots.delete(key)) {
        arcadeScore++;
        document.getElementById('arcadeScore').textContent = arcadeScore;
    }
    checkMazeCollision();
    renderMazeBoard();
    if (next.r === MAZE_FINISH.r && next.c === MAZE_FINISH.c) {
        if (arcadeScore >= MAZE_GOAL) {
            finishMazeGame(true);
        }
        else {
            const remaining = MAZE_GOAL - arcadeScore;
            document.getElementById('mazeHelp').textContent = `The finish is locked — collect ${remaining} more dot${remaining === 1 ? '' : 's'}, then return to the flag.`;
        }
    }
}
function moveMazePatrols() {
    if (!mazeActive)
        return;
    mazePatrols.forEach((patrol, patrolIndex) => {
        const options = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => ({ r: patrol.r + dr, c: patrol.c + dc })).filter(pos => mazeOpen(pos.r, pos.c) && !mazePatrols.some((other, i) => i !== patrolIndex && other.r === pos.r && other.c === pos.c));
        options.sort((a, b) => (Math.abs(a.r - mazePlayer.r) + Math.abs(a.c - mazePlayer.c)) - (Math.abs(b.r - mazePlayer.r) + Math.abs(b.c - mazePlayer.c)));
        const next = Math.random() < .68 ? options[0] : options[Math.floor(Math.random() * options.length)];
        if (next) {
            patrol.r = next.r;
            patrol.c = next.c;
        }
    });
    checkMazeCollision();
    renderMazeBoard();
}
function checkMazeCollision() {
    if (!mazePatrols.some(patrol => patrol.r === mazePlayer.r && patrol.c === mazePlayer.c))
        return;
    mazeHits++;
    arcadeScore = Math.max(0, arcadeScore - 2);
    document.getElementById('arcadeScore').textContent = arcadeScore;
    mazePlayer = { ...mazeStart };
}
function finishMazeGame(completed) {
    if (!mazeActive)
        return;
    mazeActive = false;
    clearInterval(arcadeInt);
    clearInterval(arcadeSpawnInt);
    const completion = Math.min(1, arcadeScore / MAZE_GOAL);
    const speedBonus = completed ? Math.round((arcadeTimeLeft / 40) * 22) : 0;
    performance.roadblock = Math.max(20, Math.min(100, Math.round(completion * 82 + speedBonus - mazeHits * 6)));
    advanceClock(Math.round(26 - (performance.roadblock / 100) * 17));
    finishRoadblock('arcade', arcadeScore);
}
document.addEventListener('keydown', event => {
    if (!mazeActive)
        return;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!moves[event.key])
        return;
    event.preventDefault();
    moveMazePlayer(...moves[event.key]);
});
function getRoadblockTheme(type) {
    if (type !== 'arcade')
        return getTaskTheme(type);
    const base = currentLegData.roadblockThemes.arcade;
    return {
        ...base,
        title: 'Neon Maze Chase',
        taskEmoji: '🟡',
        desc: 'Navigate a glowing 2D maze, collect 22 route dots, then reach the finish flag while evading two moving patrols before the 40-second clock expires.',
        winLine: 'threaded the neon maze cleanly, swept up the route dots and stayed ahead of both patrols.',
        loseLine: 'made it through the neon maze, but the patrols forced several resets and left route dots scattered behind.'
    };
}
function roadblockWinLoseLine(type, theme, good) {
    // Some themes have a roadblock-specific override (their Detour line carries its own subject and can't be prefixed).
    if (good && theme.roadblockWinLine)
        return theme.roadblockWinLine;
    if (!good && theme.roadblockLoseLine)
        return theme.roadblockLoseLine;
    return good ? theme.winLine : theme.loseLine;
}
function resolveMinigame(type, raw, score, timeCost, context) {
    advanceClock(timeCost);
    changeEnergy(-(context === 'roadblock' ? scaledEnergyCost(14) : scaledEnergyCost(12)));
    recordTaskExperience(type);
    if (context === 'detour') {
        detourCompletedType = type;
        performance.detour = score;
        finishDetour(type, raw);
    }
    else {
        performance.roadblock = score;
        finishRoadblock(type, raw);
    }
}
const ROADBLOCK_VISUAL_CODES = { arcade: 'MAZE', reaction: 'TAP', rhythm: 'BPM', balance: 'HOLD', memory: 'SEQ', match: 'PAIR', gamble: 'SUM', language: 'LEX', code: 'CODE', forfeit: 'DNF' };
const ROADBLOCK_VISUAL_LABELS = { arcade: 'Neon maze chase', reaction: 'Reaction drill', rhythm: 'Rhythm pattern', balance: 'Balance hold', memory: 'Sequence memory', match: 'Cultural pairs', gamble: 'Growing card sums', language: 'Phrase match', code: 'Code crack', forfeit: 'Roadblock forfeited' };
function renderRoadblockResultCard(type, bigText, tag, good, forceFail) {
    const code = ROADBLOCK_VISUAL_CODES[type] || 'RB';
    const label = ROADBLOCK_VISUAL_LABELS[type] || 'Roadblock result';
    const fail = forceFail || !good;
    return `<div class="result-banner roadblock-card ${fail ? 'mid' : 'win'}">`
        + `<div class="roadblock-visual ${fail ? 'fail' : 'win'}"><div class="roadblock-visual-grid"></div><div class="roadblock-visual-rings"></div><div class="roadblock-visual-chip"><div class="roadblock-visual-code">${code}</div><div class="roadblock-visual-label">${label}</div></div></div>`
        + `<div class="roadblock-banner-copy"><div class="big">${bigText}</div>${tag ? `<div class="sub">${tag}</div>` : ''}</div></div>`;
}
function finishRoadblock(type, raw) {
    const banner = document.getElementById('roadblockResultBanner');
    const host = document.getElementById('roadblockHostLine');
    const theme = getRoadblockTheme(type);
    const who = pendingRoadblockWho === 'you' ? 'You' : partnerFirstName();
    const simulated = raw === null || raw === undefined;
    const grade = simulated ? null : gradeAttempt(type, raw);
    const good = grade ? (grade !== 'struggle') : performance.roadblock >= 60;
    let bigText;
    if (simulated) {
        bigText = good ? `${who} pulled it off` : `${who} struggled through it`;
    }
    else if (type === 'arcade') {
        bigText = `${who} collected ${raw} route dots`;
    }
    else if (type === 'reaction') {
        bigText = `${who}: ${raw} correct taps`;
    }
    else if (type === 'rhythm') {
        bigText = raw === 0 ? `${who}: perfect rhythm run` : `${who}: ${raw} missed beat${raw === 1 ? '' : 's'}`;
    }
    else if (type === 'balance') {
        bigText = `${who} held ${raw.toFixed(1)}s &middot; ${stackPerfect.toFixed(1)}s perfect`;
    }
    else if (type === 'memory') {
        bigText = raw === 0 ? `${who}: 4/4 rounds, no mistakes` : `${who}: 4/4 rounds, ${raw} mistakes`;
    }
    else if (type === 'match') {
        bigText = raw === 0 ? `${who}: 12/12 pairs, perfect memory` : `${who}: 12/12 pairs, ${raw} wrong match${raw === 1 ? '' : 'es'}`;
    }
    else if (type === 'gamble') {
        bigText = raw === 0 ? `${who}: 5 totals · ${Math.round(performance.roadblock)} avg` : `${who}: 5 totals · ${Math.round(performance.roadblock)} avg · ${raw} mistake${raw === 1 ? '' : 's'}`;
    }
    else if (type === 'language') {
        bigText = raw === 0 ? `${who} matched all 8` : `${who} matched all 8, ${raw} missed`;
    }
    else if (type === 'code') {
        bigText = raw === 1 ? `${who} cracked it in 1 guess` : `${who} cracked it in ${raw} guesses`;
    }
    const rbStyle = grade ? GRADE_STYLE[grade] : (good ? { cls: 'win' } : { cls: 'mid' });
    banner.innerHTML = renderRoadblockResultCard(type, bigText, gradeTag(type, grade, rbStyle), good, grade === 'struggle');
    host.textContent = `${who} ${roadblockWinLoseLine(type, theme, good)}`;
    previewProjectedRank('roadblockProjectedRankText');
    showScreen('screen-roadblock-result');
}
/* ---------- CHECKPOINT ARRIVAL (real calculation) ---------- */
const rivalTeams = [
    { name: 'Jake &amp; Tyler', status: 'Roommates', avatars: ['🧑🏻', '🧑🏼'], avatarProfiles: [['male', 'light', 'street'], ['male', 'medium', 'athletic']] },
    { name: 'Maria &amp; Sofia', status: 'Best Friends', avatars: ['👩🏽', '👩🏻'], avatarProfiles: [['female', 'tan', 'festival'], ['female', 'light', 'smart']] },
    { name: 'Harold &amp; Ruth', status: 'Married 40 Years', avatars: ['👴🏼', '👵🏻'], avatarProfiles: [['male', 'medium', 'explorer'], ['female', 'light', 'rain']] },
    { name: 'Aisha &amp; Zainab', status: 'Sisters', avatars: ['👩🏿', '👧🏾'], avatarProfiles: [['female', 'deep', 'racer'], ['female', 'tan', 'street']] },
    { name: 'Diane &amp; Connor', status: 'Mom &amp; Son', avatars: ['👩🏼', '👦🏻'], avatarProfiles: [['female', 'light', 'flight'], ['male', 'light', 'athletic']] },
    { name: 'David &amp; Priya', status: 'Coworkers', avatars: ['👨🏾', '👩🏽'], avatarProfiles: [['male', 'deep', 'smart'], ['female', 'tan', 'flight']] },
    { name: 'Alex &amp; Jordan', status: 'Dating', avatars: ['🧑🏻', '🧑🏽'], avatarProfiles: [['nonbinary', 'light', 'festival'], ['nonbinary', 'tan', 'street']] },
    { name: 'Noah &amp; Liam', status: 'Podcast Co-Hosts', avatars: ['👦🏼', '🧑🏻'], avatarProfiles: [['male', 'medium', 'winter'], ['male', 'light', 'smart']] },
    { name: 'Kevin &amp; Grace', status: 'Lifeguard Partners', avatars: ['🧑🏻', '👩🏻'], avatarProfiles: [['male', 'light', 'athletic'], ['female', 'medium', 'athletic']] },
    { name: 'Robert &amp; Linda', status: 'Divorced, Still Racing', avatars: ['👨🏻', '👩🏼'], avatarProfiles: [['male', 'light', 'rain'], ['female', 'light', 'winter']] },
    { name: 'Youssef &amp; Omar', status: 'Brothers', avatars: ['👨🏽', '🧑🏽'], avatarProfiles: [['male', 'tan', 'explorer'], ['male', 'deep', 'racer']] },
];
function renderPitStopRivalAvatars(team) {
    const profiles = Array.isArray(team?.avatarProfiles) ? team.avatarProfiles : [];
    return [0, 1].map(index => {
        const profile = profiles[index] || ['nonbinary', index ? 'tan' : 'medium', index ? 'street' : 'racer'];
        return renderRacerAvatar(profile[0], profile[1], profile[2]);
    });
}
const SIGHTING_ACTIONS = [
    'arguing with a vending machine',
    'asking a stranger for directions in entirely the wrong language',
    'sprinting back for a forgotten passport',
    'negotiating with a driver who clearly does not want the fare',
    'still holding the map upside down',
    'fighting with a phone that has no signal',
    'taking what is very obviously a wrong turn',
    'stopped for street food in the middle of a $100,000 race',
    'blaming each other for losing the tickets',
    'circling the same block for the third time',
];
// Declared here (above the init-time ticker call) because updateLastSeenTicker now reads
// the surviving field — declaring them later put them in the temporal dead zone at startup.
let survivingRivals = null; // initialized on first use from the full roster
let pitStopEliminatedForLeg = null; // guards against double-elimination if Pit Stop is re-rendered (e.g. on resume)
function updateLastSeenTicker() {
    const field = ensureSurvivingRivals();
    const track = document.getElementById('chyronTrack');
    if (!track)
        return;
    if (!field.length) {
        track.innerHTML = `<b>Final leg</b> — no other teams left out there &nbsp;//&nbsp;`;
        return;
    }
    const rival = field[Math.floor(Math.random() * field.length)];
    const fallbackSpot = (currentLegData.sightingSpots || ['somewhere nearby'])[Math.floor(Math.random() * Math.max(1, (currentLegData.sightingSpots || ['somewhere nearby']).length))];
    const anchor = previousLandmarkLocation || currentLandmarkLocation || airportLocation();
    const anchorPlace = anchor && anchor.place ? anchor.place : fallbackSpot;
    const anchorLabel = previousLandmarkSub || currentLandmarkSub || 'last stop';
    const minsAgo = 3 + Math.floor(Math.random() * 35);
    const modeMap = {
        train: 'train',
        bus: 'bus',
        ridehail: 'ride-hail',
        car: 'car',
        ferry: 'ferry',
        walk: 'route'
    };
    const vehicle = modeMap[lastCompletedTravelMode || ''] || '';
    const templates = [
        `${rival.name} — last seen leaving ${anchorPlace} after the ${anchorLabel.toLowerCase()}, ${minsAgo} min ago &nbsp;//&nbsp;`,
        `${rival.name} — spotted near ${anchorPlace}, still dealing with the ${anchorLabel.toLowerCase()} ${minsAgo} min ago &nbsp;//&nbsp;`,
        vehicle ? `${rival.name} — on the same ${vehicle} as you after ${anchorPlace}, ${minsAgo} min ago &nbsp;//&nbsp;` : '',
        vehicle ? `${rival.name} — boarded the same ${vehicle} out of ${anchorPlace} and stayed in sight for a while &nbsp;//&nbsp;` : '',
        `${rival.name} — seen at ${anchorPlace} asking for directions, ${minsAgo} min ago &nbsp;//&nbsp;`
    ].filter(Boolean);
    track.innerHTML = templates[Math.floor(Math.random() * templates.length)];
}
updateLastSeenTicker();
setInterval(updateLastSeenTicker, 13000);
let playerElapsed = 0;
let fastForwardWon = false;
/* ---------- PARTNER BANTER ---------- */
const partnerBanter = [
    { you: "Remind me why I picked you again?", partner: "Because the alternative was doing this alone, and you hate doing this alone." },
    { you: "We're doing better than I expected.", partner: "Don't jinx it. There is still a lot of race left." },
    { you: "That team just called us amateurs.", partner: "They're not wrong, but rude." },
    { you: "Do you regret partnering with me yet?", partner: "Ask me again after the next flight." },
    { you: "This budget is not going to last.", partner: "Then stop ordering ride-hails like we're made of money." },
    { you: "I could really go for actual sleep.", partner: "Sleep is for teams that aren't in last place." },
    { you: "Was that Roadblock as bad as it looked?", partner: "Worse. Don't make me relive it." },
    { you: "We're still talking to each other, that's good.", partner: "Ask me again at the Final 3." },
];
function renderBanterInto(containerId) {
    const el = document.getElementById(containerId);
    if (!el)
        return;
    const b = partnerBanter[Math.floor(Math.random() * partnerBanter.length)];
    el.innerHTML = `<div class="card"><div class="card-title">💬 Between Legs</div><p><b>You:</b> ${b.you}</p><p><b>${escapeHTML(partnerFirstName())}:</b> ${b.partner}</p></div>`;
}
function ensureSurvivingRivals() {
    if (survivingRivals === null)
        survivingRivals = [...rivalTeams];
    return survivingRivals;
}
function fieldSize() { return ensureSurvivingRivals().length + 1; }
function updateRankHud(rank, explicitField) {
    // Rank lives inline in the subbar so it can never sit on top of screen content.
    const val = document.getElementById('rankInlineValue');
    const fld = document.getElementById('rankInlineField');
    if (val)
        val.textContent = rank ? ordinal(rank) : '—';
    if (fld)
        fld.textContent = rank ? `/${explicitField || fieldSize()}` : '';
}
function computeProjectedRank() {
    const better = rivalTimes.filter(t => t < playerElapsed).length;
    return better + 1;
}
function updateProjectedRankDisplay() {
    const rank = computeProjectedRank();
    const projectedRankText = document.getElementById('projectedRankText');
    if (projectedRankText)
        projectedRankText.textContent = `Right now you're tracking for ${ordinal(rank)} place out of ${fieldSize()}.`;
    updateRankHud(rank);
}
function previewProjectedRank(textElId) {
    // Rough mid-leg estimate based on elapsed time so far — recalculated properly at the Checkpoint.
    if (timeForfeitThisLeg) {
        const rank = fieldSize();
        document.getElementById(textElId).textContent = `The two-hour forfeit has dropped you to ${ordinal(rank)} place out of ${fieldSize()}. Every rival is now ahead.`;
        updateRankHud(rank);
        return;
    }
    const rank = projectedRankFromPerformance();
    document.getElementById(textElId).textContent = `Right now you're tracking for ${ordinal(rank)} place out of ${fieldSize()}.`;
    updateRankHud(rank);
}

function rankingPerformanceAverage() {
    const detourScore = Number.isFinite(performance.detour) && performance.detour > 0 ? performance.detour : 60;
    const roadblockScore = Number.isFinite(performance.roadblock) && performance.roadblock > 0 ? performance.roadblock : 60;
    return (detourScore + roadblockScore) / 2;
}
function hasPerfectOverallPerformance() {
    return !timeForfeitThisLeg && performance.detour >= 99.5 && performance.roadblock >= 99.5;
}
function rankingSkillEdgeMinutes() {
    return Math.max(-8, Math.min(10, (rankingPerformanceAverage() - 60) * 0.25));
}
function rankingGraceMinutes() {
    return currentLegData.legNumber === 1 ? 6 : currentLegData.legNumber === 2 ? 2 : 0;
}
function projectedRankFromPerformance() {
    if (hasPerfectOverallPerformance())
        return 1;
    const rivalCount = ensureSurvivingRivals().length;
    const shift = rankingSkillEdgeMinutes() + rankingGraceMinutes();
    const aheadChance = Math.max(0, Math.min(1, (18 - shift) / 36));
    return Math.max(1, Math.min(rivalCount + 1, 1 + Math.round(rivalCount * aheadChance)));
}
function syncRivalClocksToPlayer() {
    if (!rivalTimes.length)
        return;
    // Sync only shared route-clock travel. The player's low-energy penalty stays
    // personal and must not be copied onto rival teams.
    const now = Math.max(0, clockMinutes - legStartClock);
    const sharedTravel = Math.max(0, now - rivalSyncPlayerElapsed);
    if (sharedTravel > 0)
        rivalTimes = rivalTimes.map(time => time + sharedTravel);
    rivalSyncPlayerElapsed = now;
}
/* ---------- AMBIENT ADVENTURE MUSIC (Web Audio, looped) ---------- */
let audioCtx = null, musicStarted = false, musicGain = null, musicOn = true;
let musicSchedulerId = null;
// Cinematic adventure progression: Am – F – C – G (classic epic/trailer feel).
// Each chord: sustained pad tones (strings-like), a low swelling bass note, and
// a sparse set of higher accent tones the melody can draw from, so the line
// varies each pass instead of looping identically.
const CHORDS = [
    { pad: [110.00, 130.81, 164.81], bass: 55.00, accents: [220.00, 261.63, 329.63, 392.00] }, // Am
    { pad: [87.31, 110.00, 130.81], bass: 43.65, accents: [174.61, 220.00, 261.63, 349.23] }, // F
    { pad: [130.81, 164.81, 196.00], bass: 65.41, accents: [261.63, 329.63, 392.00, 523.25] }, // C
    { pad: [98.00, 123.47, 146.83], bass: 49.00, accents: [196.00, 246.94, 293.66, 392.00] }, // G
];
const CHORD_SECONDS = 4.6;
function buildReverb(ctx) {
    const len = ctx.sampleRate * 2.2;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
        }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
}
function startMusic() {
    if (musicStarted)
        return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    catch (e) {
        return;
    }
    musicStarted = true;
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.22;
    const dry = audioCtx.createGain();
    dry.gain.value = 0.75;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.35;
    const reverb = buildReverb(audioCtx);
    musicGain.connect(dry);
    dry.connect(audioCtx.destination);
    musicGain.connect(reverb);
    reverb.connect(wet);
    wet.connect(audioCtx.destination);
    const padFilter = audioCtx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1100;
    padFilter.Q.value = 0.5;
    padFilter.connect(musicGain);
    let chordIdx = 0;
    function playChord() {
        if (!audioCtx || audioCtx.state === 'closed')
            return;
        const chord = CHORDS[chordIdx % CHORDS.length];
        const t = audioCtx.currentTime;
        const dur = CHORD_SECONDS;
        // String-like pad: three sustained, slightly detuned oscillators per chord tone.
        chord.pad.forEach((freq, i) => {
            [-4, 0, 4].forEach(detune => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = i === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.value = freq;
                osc.detune.value = detune;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.05, t + 0.9);
                g.gain.setValueAtTime(0.05, t + dur - 0.8);
                g.gain.linearRampToValueAtTime(0, t + dur);
                osc.connect(g);
                g.connect(padFilter);
                osc.start(t);
                osc.stop(t + dur + 0.1);
            });
        });
        // Swelling low bass/brass note underneath.
        const bass = audioCtx.createOscillator();
        const bg = audioCtx.createGain();
        bass.type = 'sine';
        bass.frequency.value = chord.bass;
        bg.gain.setValueAtTime(0, t);
        bg.gain.linearRampToValueAtTime(0.28, t + 1.4);
        bg.gain.linearRampToValueAtTime(0, t + dur);
        bass.connect(bg);
        bg.connect(musicGain);
        bass.start(t);
        bass.stop(t + dur + 0.1);
        // Sparse melodic accents, randomized timing/notes each pass so it never feels looped.
        const accentCount = 2 + Math.floor(Math.random() * 2);
        const usedSlots = [];
        for (let a = 0; a < accentCount; a++) {
            let slot;
            do {
                slot = Math.random() * (dur - 1.2) + 0.3;
            } while (usedSlots.some(s => Math.abs(s - slot) < 0.6));
            usedSlots.push(slot);
            const note = chord.accents[Math.floor(Math.random() * chord.accents.length)];
            const at = t + slot;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = note;
            g.gain.setValueAtTime(0, at);
            g.gain.linearRampToValueAtTime(0.16, at + 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, at + 1.1);
            osc.connect(g);
            g.connect(musicGain);
            osc.start(at);
            osc.stop(at + 1.2);
        }
        chordIdx++;
        musicSchedulerId = setTimeout(playChord, dur * 1000);
    }
    playChord();
}
function toggleMusic() {
    musicOn = !musicOn;
    if (musicGain)
        musicGain.gain.value = musicOn ? 0.22 : 0;
    const btn = document.getElementById('musicToggleBar');
    if (btn)
        btn.textContent = musicOn ? '🔊' : '🔇';
}
document.addEventListener('pointerdown', () => { startMusic(); }, { once: true });
let yieldedTeamName = null;
function goToYieldLandmark() {
    revealYieldLandmark();
}
function revealYieldLandmark() {
    pendingRouteInfoBanner = currentLegData.yieldSpot.banner;
    showRouteInfo(currentLegData.yieldSpot.emoji, currentLegData.yieldSpot.place, currentLegData.countryFull, () => {
        setPending('travel', () => {
            setLandmarkBanner(currentLegData.yieldSpot, 'Yield');
            showTaskClue('Yield', currentLegData.yieldSpot, () => maybeApplyIncomingYield(goToYield));
        });
        showTransport('screen-transport3', 'transport3', currentLegData.yieldSpot.place, null);
    });
}
let pendingIncomingYieldContinue = null;
let incomingYieldTimerFrame = null;
let incomingYieldTimerServed = false;
function incomingYieldChance() {
    const total = LEG_SEQUENCE.length;
    const leg = currentLegData.legNumber;
    if (leg >= total)
        return 0;
    return .05 + Math.min(1, (leg - 1) / Math.max(1, total - 2)) * .20;
}
function maybeApplyIncomingYield(next) {
    if (incomingYieldChecked) {
        next();
        return;
    }
    incomingYieldChecked = true;
    if (Math.random() >= incomingYieldChance()) {
        next();
        return;
    }
    const rivals = ensureSurvivingRivals().filter(team => !yieldUsedByTeams.has(team.name));
    if (!rivals.length) {
        next();
        return;
    }
    const team = rivals[Math.floor(Math.random() * rivals.length)];
    yieldUsedByTeams.add(team.name);
    incomingYieldApplied = true;
    pendingIncomingYieldContinue = next;
    incomingYieldTimerServed = false;
    cancelAnimationFrame(incomingYieldTimerFrame);
    document.getElementById('incomingYieldTimer').textContent = '01:00:00';
    document.getElementById('incomingYieldStartBtn').style.display = 'flex';
    document.getElementById('incomingYieldStartBtn').disabled = false;
    document.getElementById('incomingYieldContinueBtn').style.display = 'none';
    const cleanName = String(team ? team.name : 'Another team').replace(/&amp;/g, '&');
    document.getElementById('incomingYieldText').textContent = `${cleanName} placed your photo on the board. Serve the one-hour race-clock penalty before continuing.`;
    document.getElementById('incomingYieldOverlay').style.display = 'flex';
}
function startIncomingYieldTimer() {
    if (incomingYieldTimerServed)
        return;
    const startBtn = document.getElementById('incomingYieldStartBtn');
    startBtn.disabled = true;
    startBtn.textContent = 'Penalty Running…';
    const duration = 6500;
    const started = Date.now();
    const tick = now => {
        const progress = Math.min(1, (Date.now() - started) / duration);
        const remaining = Math.max(0, Math.ceil(3600 * (1 - progress)));
        document.getElementById('incomingYieldTimer').textContent = formatDigitalClockSeconds(remaining);
        if (progress < 1) {
            incomingYieldTimerFrame = requestAnimationFrame(tick);
        }
        else {
            advanceClock(60);
            incomingYieldTimerServed = true;
            startBtn.style.display = 'none';
            document.getElementById('incomingYieldContinueBtn').style.display = 'flex';
        }
    };
    incomingYieldTimerFrame = requestAnimationFrame(tick);
}
function continueIncomingYield() {
    if (!incomingYieldTimerServed)
        return;
    document.getElementById('incomingYieldOverlay').style.display = 'none';
    const next = pendingIncomingYieldContinue;
    pendingIncomingYieldContinue = null;
    if (next)
        next();
}
function goToYield() {
    document.getElementById('yieldSpotName').textContent = currentLegData.yieldSpot.place;
    setLandmarkBanner(currentLegData.yieldSpot, 'Yield');
    playerElapsed = effectiveElapsed();
    const rivals = ensureSurvivingRivals();
    rivalTimes = [];
    if (timeForfeitThisLeg) {
        // A time forfeit explicitly guarantees every surviving rival has moved ahead.
        rivals.forEach(() => rivalTimes.push(Math.max(1, playerElapsed - (8 + Math.random() * 42))));
    }
    else {
        const fieldShift = rankingGraceMinutes() + rankingSkillEdgeMinutes();
        rivals.forEach(() => rivalTimes.push(Math.max(15, playerElapsed + (-18 + Math.random() * 36) + fieldShift)));
        // Leg 1 is an onboarding leg: a competent run cannot be randomly dumped at
        // the very back of the field before the player has learned the race economy.
        if (currentLegData.legNumber === 1 && rankingPerformanceAverage() >= 60) {
            const minimumBehind = Math.min(4, rivals.length);
            const behindNow = rivalTimes.filter(time => time > playerElapsed).length;
            if (behindNow < minimumBehind) {
                const order = rivalTimes.map((time, index) => ({ time, index })).sort((a, b) => b.time - a.time);
                for (let i = behindNow; i < minimumBehind; i++)
                    rivalTimes[order[i].index] = playerElapsed + 4 + i * 2;
            }
        }
        if (hasPerfectOverallPerformance())
            rivalTimes = rivalTimes.map((time, index) => Math.max(time, playerElapsed + 10 + index * 0.35));
    }
    rivalSyncPlayerElapsed = Math.max(0, clockMinutes - legStartClock);
    // Serving an incoming Yield must have a visible race consequence: at least one
    // rival is ahead, so the player can be no better than second at this board.
    if (incomingYieldApplied && rivalTimes.length && rivalTimes.every(t => t >= playerElapsed)) {
        rivalTimes[0] = Math.max(1, playerElapsed - 6);
    }
    const behind = [];
    rivals.forEach((rt, i) => { if (rivalTimes[i] > playerElapsed)
        behind.push({ team: rt, idx: i }); });
    // Sync the persistent Rank HUD to this same real data — it was previously left showing
    // a stale estimate from previewProjectedRank(), an unrelated independent random draw.
    const actualRank = (rivals.length - behind.length) + 1;
    updateRankHud(actualRank);
    document.getElementById('yieldRankStat').textContent = ordinal(actualRank);
    document.getElementById('yieldEligibleStat').textContent = String(behind.length);
    const wrap = document.getElementById('yieldOptions');
    const hostLine = document.getElementById('yieldHostLine');
    wrap.innerHTML = '';
    document.getElementById('yieldPickerPanel').style.display = 'none';
    document.getElementById('yieldDecisionPanel').style.display = 'flex';
    document.getElementById('yieldSlowBtn').style.display = 'block';
    document.getElementById('yieldSlowBtn').innerHTML = '<span class="yield-btn-main">Slow Someone Down</span><span class="yield-btn-sub">Choose an eligible team behind you</span>';
    if (incomingYieldApplied) {
        hostLine.textContent = 'Because your team was Yielded at this board, you cannot Yield another team here. Continue racing.';
        document.getElementById('yieldSlowBtn').style.display = 'none';
        document.getElementById('yieldSkipBtn').innerHTML = '<span class="yield-btn-main">Continue</span><span class="yield-btn-sub">No Yield action available here</span>';
    }
    else if (yieldUsedByTeams.has(PLAYER_YIELD_KEY)) {
        hostLine.textContent = 'Your team has already used its one Yield for this race. Continue without slowing another team.';
        document.getElementById('yieldSlowBtn').style.display = 'none';
        document.getElementById('yieldSkipBtn').innerHTML = '<span class="yield-btn-main">Continue</span><span class="yield-btn-sub">No Yield action available here</span>';
    }
    else if (behind.length === 0) {
        hostLine.textContent = "No team is currently behind you, so there is nobody eligible to Yield.";
        document.getElementById('yieldSlowBtn').style.display = 'none';
        document.getElementById('yieldSkipBtn').innerHTML = '<span class="yield-btn-main">Continue</span><span class="yield-btn-sub">No Yield action available here</span>';
    }
    else {
        hostLine.textContent = 'Choose whether to slow an eligible rival by one hour or skip this Yield.';
        document.getElementById('yieldSkipBtn').innerHTML = '<span class="yield-btn-main">Skip</span><span class="yield-btn-sub">Keep moving without using the Yield</span>';
        behind.forEach(entry => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline';
            const rivalPortraits = renderPitStopRivalAvatars(entry.team);
            btn.innerHTML = `<span class="yield-team-btn-main"><span class="yield-team-avatars">${rivalPortraits}</span><span><span class="yield-team-btn-name">${entry.team.name}</span><span class="yield-team-btn-meta">Team behind you</span></span></span><span class="yield-team-btn-penalty">+1 hour</span>`;
            btn.onclick = () => applyYield(entry);
            wrap.appendChild(btn);
        });
    }
    showScreen('screen-yield');
}
function openYieldTeamPicker() {
    document.getElementById('yieldDecisionPanel').style.display = 'none';
    document.getElementById('yieldPickerPanel').style.display = 'block';
    document.getElementById('yieldHostLine').textContent = 'Select one team behind you. They will see that your team placed them on the board.';
}
function closeYieldTeamPicker() {
    document.getElementById('yieldPickerPanel').style.display = 'none';
    document.getElementById('yieldDecisionPanel').style.display = 'flex';
    document.getElementById('yieldHostLine').textContent = 'Choose whether to slow an eligible rival by one hour or skip this Yield.';
}
function applyYield(entry) {
    rivalTimes[entry.idx] += 60; // one hour penalty
    yieldUsedByTeams.add(PLAYER_YIELD_KEY);
    yieldedTeamName = entry.team.name;
    goToFastForwardTransport();
}
function skipYield() {
    yieldedTeamName = null;
    goToFastForwardTransport();
}
function fastForwardLocation() {
    const artByLeg = {
        TOKYO: 'tokyo-race-control', MARRAKESH: 'marrakesh-race-control', SINGAPORE: 'singapore-race-control', BANGKOK: 'bangkok-race-control',
        BEIJING: 'beijing-race-control', ROME: 'rome-race-control', 'KUALA LUMPUR': 'kl-race-control'
    };
    return {
        emoji: '🎫',
        place: `${currentLegData.cityName} Race Control Pavilion`,
        banner: { shape: 'urban-cluster', palette: 'night', art: artByLeg[currentLegData.countryTag] || 'tokyo-race-control' }
    };
}
function goToFastForwardTransport() {
    const marker = fastForwardLocation();
    pendingRouteInfoBanner = marker.banner;
    showRouteInfo(marker.emoji, marker.place, currentLegData.countryFull, () => {
        setPending('travel', () => {
            setLandmarkBanner(marker, 'Fast Forward');
            showTaskClue('Fast Forward', marker, arriveAtCheckpoint);
        });
        showTransport('screen-transport3', 'transport3', marker.place, null);
    });
}
function goToPitStopTransport() {
    pendingRouteInfoBanner = currentLegData.pitStop.banner;
    showRouteInfo(currentLegData.pitStop.emoji, currentLegData.pitStop.place, currentLegData.countryFull, () => {
        setPending('travel', showPitStopArrival);
        showTransport('screen-transport3', 'transport3', currentLegData.pitStop.place, null);
    });
}
/* Names exactly where the team has arrived before any rank or prize information,
   pulled from the current leg's pitStop rather than hardcoded. */
function showCheckpointArrival() {
    const stop = fastForwardLocation();
    setLandmarkBanner(stop, 'Fast Forward');
    document.getElementById('cpArrivalPlace').textContent = stop.place;
    // countryFull is already "City, Country" (and just "Singapore" for the city-state),
    // so use it as-is rather than recombining and producing "Singapore, Singapore".
    document.getElementById('cpArrivalWhere').textContent = currentLegData.countryFull;
    document.getElementById('cpArrivalLine').textContent = `You and ${partnerFirstName()} reach the separate Fast Forward board.`;
    showScreen('screen-checkpoint-arrival');
}
function arriveAtCheckpoint() {
    setLandmarkBanner(fastForwardLocation(), 'Fast Forward');
    // Refresh elapsed time and advance the field through the same shared journey.
    playerElapsed = effectiveElapsed();
    syncRivalClocksToPlayer();
    const fastestRival = Math.min(...rivalTimes);
    isFirstAtCheckpoint = playerElapsed <= fastestRival;
    const hostLine = document.getElementById('checkpointHostLine');
    const btn = document.getElementById('checkpointBtn');
    const stamp = document.getElementById('checkpointPassStatus');
    if (isFirstAtCheckpoint) {
        hostLine.textContent = "You are first at the Fast Forward board. There is a 30% chance this pass sends you directly toward the Pit Stop.";
        btn.textContent = "Attempt the Fast Forward";
        btn.onclick = rollFastForward;
        if (stamp)
            stamp.textContent = 'Board\nOpen';
    }
    else {
        hostLine.textContent = "Another team reached this separate Fast Forward board first. Continue on the standard route to the Pit Stop.";
        btn.textContent = "Continue to Pit Stop";
        btn.onclick = goToPitStopTransport;
        if (stamp)
            stamp.textContent = 'Missed\nIt';
    }
    updateProjectedRankDisplay();
    document.getElementById('checkpointBanter').innerHTML = '';
    showScreen('screen-checkpoint');
}
function rollFastForward() {
    fastForwardWon = Math.random() < 0.30;
    performance.fastForward = fastForwardWon ? 20 : 0;
    const hostLine = document.getElementById('checkpointHostLine');
    const btn = document.getElementById('checkpointBtn');
    const stamp = document.getElementById('checkpointPassStatus');
    if (fastForwardWon) {
        playerElapsed = effectiveElapsed();
        hostLine.textContent = "Fast Forward awarded. Your team gains a 30-minute race-clock advantage.";
        if (stamp)
            stamp.textContent = 'Won\nPass';
    }
    else {
        hostLine.textContent = "No Fast Forward this time. Continue on the standard route.";
        if (stamp)
            stamp.textContent = 'No\nPass';
    }
    updateProjectedRankDisplay();
    btn.textContent = "Continue to Pit Stop";
    btn.onclick = goToPitStopTransport;
}
/* Confirms arrival at the Pit Stop landmark before any standings are revealed. */
function showPitStopArrival() {
    const stop = currentLegData.pitStop;
    // Both the player and the field complete the shared checkpoint-to-Pit-Stop
    // journey. Sync that common travel before the player's final pace choice,
    // which remains a genuine opportunity to gain or lose places.
    syncRivalClocksToPlayer();
    setLandmarkBanner(stop, 'Pit Stop');
    document.getElementById('psArrivalPlace').textContent = stop.place;
    document.getElementById('psArrivalWhere').textContent = currentLegData.countryFull;
    document.getElementById('psArrivalLine').textContent =
        `The mat is ahead at ${stop.place}. Choose how hard to push through the final approach.`;
    const paces = [
        { key: 'sprint', icon: '⚡', name: 'Sprint', cost: 36, minutes: 1, copy: 'All-out push · heavy energy burn' },
        { key: 'run', icon: '🏃', name: 'Run', cost: 20, minutes: 3, copy: 'Hard pace · meaningful effort' },
        { key: 'walk', icon: '🚶', name: 'Walk', cost: 0, minutes: 7, copy: 'Recover your breath · safest option' }
    ];
    const wrap = document.getElementById('pitstopPaceOptions');
    wrap.innerHTML = '';
    paces.forEach(pace => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pace-choice';
        const energyCost = scaledEnergyCost(pace.cost);
        button.disabled = energy < energyCost;
        button.innerHTML = `<span class="pace-icon">${pace.icon}</span><span class="pace-text"><span class="pace-name">${pace.name}</span><span class="pace-copy">${pace.copy}</span></span><span class="pace-cost">${energyCost} ENERGY<br>+${pace.minutes} MIN</span>`;
        button.onclick = () => choosePitStopPace(pace);
        wrap.appendChild(button);
    });
    showScreen('screen-pitstop-arrival');
}
function choosePitStopPace(pace) {
    const energyCost = pace ? scaledEnergyCost(pace.cost) : 0;
    if (!pace || energy < energyCost)
        return;
    // Lock in every placement consequence earned before the final approach.
    // The displayed pace time is the only arrival-time cost here; otherwise the
    // sprint's large energy deduction can retroactively add up to 27 hidden minutes.
    const elapsedBeforePace = effectiveElapsed();
    changeEnergy(-energyCost);
    advanceClock(pace.minutes);
    playerElapsed = elapsedBeforePace + pace.minutes;
    buildPitStop();
}
function buildPitStop() {
    setLandmarkBanner(currentLegData.pitStop, 'Pit Stop');
    document.getElementById('pitstopHostBanner').innerHTML = renderBannerSVG(currentLegData.pitStop.banner, currentLegData.pitStop.place, 'Pit Stop');
    document.getElementById('pitstopHostImage').src = GENERATED_ART.raceHost;
    document.getElementById('pitstopLegNum').textContent = currentLegData.legNumber;
    // A flawless Detour plus flawless Roadblock is the strongest possible leg.
    // Honour it as an unconditional first-place finish even if later random field
    // variation or an energy penalty would otherwise move a rival ahead.
    if (hasPerfectOverallPerformance())
        rivalTimes = rivalTimes.map((time, index) => Math.max(time, playerElapsed + 1 + index * 0.25));
    const rivals = ensureSurvivingRivals();
    const teams = [{ name: 'You &amp; ' + escapeHTML(partnerName), status: escapeHTML(partnerRelationship), avatars: [renderRacerAvatar(playerGender, playerTone, playerCostume), renderRacerAvatar(partnerGender, partnerTone, partnerCostume)], time: playerElapsed, you: true }];
    rivals.forEach((rt, i) => {
        teams.push({ name: rt.name, status: rt.status, avatars: renderPitStopRivalAvatars(rt), time: rivalTimes[i], you: false, ref: rt });
    });
    teams.sort((a, b) => a.time - b.time);
    const list = document.getElementById('pitstopList');
    list.innerHTML = '';
    let playerEliminated = false;
    // Exactly one team goes home per leg, as long as more than one team remains.
    const eliminateLast = teams.length > 1;
    teams.forEach((t, i) => {
        const place = i + 1;
        const isEliminatedSlot = eliminateLast && place === teams.length;
        if (isEliminatedSlot && t.you)
            playerEliminated = true;
        const row = document.createElement('div');
        row.className = 'roster-row' + (t.you ? ' you' : '') + (isEliminatedSlot ? ' eliminated' : '');
        row.style.opacity = '0';
        const arrival = formatClock(legStartClock + Math.round(t.time));
        const yieldTag = (yieldedTeamName && t.name === yieldedTeamName) ? ' <span class="roster-tag">YIELDED</span>' : '';
        row.innerHTML = `<div class="avatar-pair">${t.avatars[0]}${t.avatars[1]}</div><div class="info"><div class="name">${t.name}${yieldTag}</div><div class="status">${t.status} &middot; in at ${arrival}</div></div><div class="place">${isEliminatedSlot ? 'OUT' : ordinal(place)}</div>`;
        list.appendChild(row);
    });
    // Actually remove the eliminated rival from the field so it shrinks next leg.
    // Guarded so re-rendering this same leg's Pit Stop (e.g. after a resume) never
    // double-applies the elimination against an already-reduced roster.
    const fieldSizeThisLeg = teams.length;
    if (eliminateLast && !playerEliminated && pitStopEliminatedForLeg !== currentLegData.legNumber) {
        const lastTeam = teams[teams.length - 1];
        if (lastTeam.ref) {
            const idx = survivingRivals.indexOf(lastTeam.ref);
            if (idx !== -1)
                survivingRivals.splice(idx, 1);
        }
    }
    pitStopEliminatedForLeg = currentLegData.legNumber;
    const playerPlace = teams.findIndex(t => t.you) + 1;
    updateRankHud(playerPlace, fieldSizeThisLeg);
    const call = document.getElementById('pitstopRankCall');
    document.getElementById('pitstopRankNumber').textContent = `${playerPlace}!`;
    call.classList.remove('reveal');
    void call.offsetWidth;
    setTimeout(() => call.classList.add('reveal'), 350);
    [...list.children].forEach((row, index) => setTimeout(() => {
        row.classList.add('rank-reveal');
        row.style.opacity = '1';
    }, 4500 + index * 420));
    document.getElementById('pitstopEliminationNote').style.display = playerEliminated ? 'block' : 'none';
    const pitstopContinueBtn = document.getElementById('pitstopContinueBtn');
    pitstopContinueBtn.style.display = playerEliminated ? 'none' : 'block';
    if (!playerEliminated && currentLegData.legNumber === LEG_SEQUENCE.length) {
        pitstopContinueBtn.textContent = 'Finish the Race →';
        pitstopContinueBtn.onclick = onFlightComplete;
    }
    else {
        pitstopContinueBtn.textContent = 'Continue Racing →';
        pitstopContinueBtn.onclick = startFastForwardTime;
    }
    document.getElementById('pitstopRestartBtn').style.display = playerEliminated ? 'block' : 'none';
    showScreen('screen-pitstop');
}
function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function restartProto() {
    clearGameState();
    performance = { detour: 0, roadblock: 0, fastForward: 0 };
    rivalTimes = [];
    rivalSyncPlayerElapsed = 0;
    experiencedTaskTypes = new Set();
    taskPlayHistory = [];
    lastCompletedTaskType = null;
    detourCompletedType = null;
    pickLegSequence();
    currentLegData = LEG_SEQUENCE[0];
    syncRaceCountCopy();
    budget = currentLegData.startBudget;
    clockMinutes = currentLegData.arrivalClock;
    fastForwardWon = false;
    survivingRivals = null;
    pitStopEliminatedForLeg = null;
    usedRaceEventIds = [];
    yieldedTeamName = null;
    energy = 100;
    incomingYieldApplied = false;
    incomingYieldChecked = false;
    yieldUsedByTeams = new Set();
    timeForfeitThisLeg = false;
    lastForfeitResult = null;
    detourCompletedType = null;
    updateRankHud(null);
    pickDetourTypes();
    pickRoadblockType();
    applyLegTheme();
    updateStatusBar();
    updateLastSeenTicker();
    showScreen('screen-title');
}
/* ---------- FAST-FORWARD TIME (forced, no skip) ---------- */
let ffAnimationId = null;
let cuisineIntervalId = null;
const PITSTOP_CUISINE_DISHES = {
    TOKYO: ['Tonkotsu ramen', 'Grilled yakitori', 'Green tea'],
    MARRAKESH: ['Lamb tagine', 'Torn Moroccan bread', 'Mint tea'],
    SINGAPORE: ['Hainanese chicken rice', 'Char kway teow', 'Sugarcane juice'],
    BANGKOK: ['Pad kee mao', 'Som tam', 'Mango sticky rice & Thai iced tea'],
    BEIJING: ['Peking duck & pancakes', 'Hand-pulled noodles', 'Jasmine tea'],
    ROME: ['Cacio e pepe', 'Golden supplì', 'Espresso'],
    'KUALA LUMPUR': ['Nasi lemak', 'Grilled satay', 'Teh tarik'],
    'MEXICO CITY': ['Tacos al pastor', 'Esquites', 'Agua fresca'],
    'RIO DE JANEIRO': ['Pão de queijo', 'Grilled espetinho', 'Açaí & guaraná'],
    'CAPE TOWN': ['Chicken Gatsby roll', 'Koesisters', 'Rooibos iced tea'],
    'JAIPUR': ['Pyaaz kachori', 'Dal baati churma', 'Sweet lassi'],
    'SYDNEY': ['Meat pie', 'Hot chips', 'Iced flat white']
};
function cuisineArtForCurrentLeg() {
    return PITSTOP_CUISINE_ART[currentLegData.countryTag] || GENERATED_ART.cuisine.japan;
}
const PITSTOP_CUISINE_ART = {
    TOKYO: GENERATED_ART.cuisine.japan,
    MARRAKESH: GENERATED_ART.cuisine.morocco,
    SINGAPORE: GENERATED_ART.cuisine.singapore,
    BANGKOK: GENERATED_ART.cuisine.thailand,
    BEIJING: GENERATED_ART.cuisine.china,
    ROME: GENERATED_ART.cuisine.italy,
    'KUALA LUMPUR': GENERATED_ART.cuisine.malaysia,
    'MEXICO CITY': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-c73b5d239cb91769.webp',
    'RIO DE JANEIRO': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-4281d80d8b14e76e.webp',
    'CAPE TOWN': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-70ac7d41a367c4eb.webp',
    'JAIPUR': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-2b02ff9f8ee1c639.webp',
    'SYDNEY': 'https://eddmooresalt.github.io/incredible-race/assets/generated/art-2efcc8a9b428e50a.webp'
};
function formatDigitalClockSeconds(totalSeconds) {
    totalSeconds = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function startFastForwardTime() {
    const food = currentLegData.localFood || 'whatever the nearest stall is still serving';
    startClockFastForward(720, 'Pit Stop Rest', `A local spread of ${food} is served before the team rests. Cash and energy are replenished for departure.`, showPitStopDepartureClue);
}
function showPitStopDepartureClue() {
    routeAlreadyAtMarker = true;
    pendingRouteInfoBanner = currentLegData.airportBanner;
    showRouteInfo('✈️', currentLegData.airportName, `${currentLegData.cityName} departures`, () => {
        setPending('travel', () => showAirportArrival(showFlightReadyDialog));
        showTransport('screen-transport3', 'transport3', currentLegData.airportName, null);
    }, 'Route Info');
}
function startClockFastForward(totalMin, label, subtext, onDone) {
    if (document.getElementById('fastForwardOverlay').style.display === 'flex')
        return; // already running
    setPending('fastForward', onDone);
    const startMin = clockMinutes;
    const isPitStopRest = label === 'Pit Stop Rest';
    const durationMs = isPitStopRest ? 15000 : 10000;
    document.getElementById('ffLabel').textContent = label;
    document.getElementById('ffHeroArt').src = FAST_FORWARD_ART;
    document.getElementById('ffSubtext').textContent = subtext;
    const ffProgressBar = document.getElementById('ffProgressBar');
    const ffProgressLabel = document.getElementById('ffProgressLabel');
    const advanceHours = Math.floor(totalMin / 60);
    const advanceMinutes = totalMin % 60;
    const advanceText = `${advanceHours ? `${advanceHours}h` : ''}${advanceHours && advanceMinutes ? ' ' : ''}${advanceMinutes ? `${advanceMinutes}m` : ''}`;
    ffProgressBar.style.width = '0%';
    ffProgressLabel.textContent = `Advancing ${advanceText}`;
    const ffFlightBanner = document.getElementById('ffFlightBanner');
    const isAirborne = /horizon|in the air|flight/i.test(`${label} ${subtext}`);
    document.querySelector('#fastForwardOverlay .ff-cinematic-hero').style.display = isAirborne ? 'none' : 'block';
    ffFlightBanner.style.display = isAirborne ? 'block' : 'none';
    const cuisineStage = document.getElementById('ffCuisineStage');
    clearInterval(cuisineIntervalId);
    cuisineStage.style.display = !isAirborne && /rest|food|spread|cuisine/i.test(`${label} ${subtext}`) ? 'flex' : 'none';
    if (cuisineStage.style.display === 'flex') {
        const dishes = PITSTOP_CUISINE_DISHES[currentLegData.countryTag] || [currentLegData.localFood];
        const cropPositions = ['24% center', '50% center', '78% center'];
        const cuisineSlideMs = 6800;
        let dishIndex = 0;
        const paintDish = () => {
            const index = dishIndex++ % dishes.length;
            const dish = dishes[index];
            const slide = document.getElementById('ffCuisineSlide');
            slide.classList.remove('playing');
            slide.innerHTML = `<img class="cuisine-photo" src="${cuisineArtForCurrentLeg()}" alt="Local food served during the pit stop rest" style="object-position:${cropPositions[index % cropPositions.length]}">`;
            void slide.offsetWidth;
            slide.classList.add('playing');
        };
        paintDish();
        cuisineIntervalId = setInterval(paintDish, cuisineSlideMs);
    }
    if (isAirborne)
        syncFlightRouteBanners();
    document.getElementById('ffClockZone').textContent = `${String(currentLegData.tzLabel).split(' ')[0]} · local race time`;
    document.getElementById('ffTearBtn').style.display = 'none';
    document.getElementById('fastForwardOverlay').style.display = 'flex';
    const timeEl = document.getElementById('ffClockTime');
    timeEl.textContent = formatDigitalClockSeconds(startMin * 60);
    cancelAnimationFrame(ffAnimationId);
    const startedAt = Date.now();
    const tickFastClock = () => {
        const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
        const acceleratedSeconds = startMin * 60 + totalMin * 60 * progress;
        timeEl.textContent = formatDigitalClockSeconds(acceleratedSeconds);
        ffProgressBar.style.width = `${Math.round(progress * 100)}%`;
        if (progress < 1) {
            ffAnimationId = requestAnimationFrame(tickFastClock);
        }
        else {
            clockMinutes = startMin + totalMin;
            clearInterval(cuisineIntervalId);
            if (label === 'Pit Stop Rest') {
                energy = 64;
                budget = currentLegData.startBudget;
            }
            ffProgressLabel.textContent = `${advanceText} elapsed`;
            updateStatusBar();
            document.getElementById('ffTearBtn').style.display = 'block';
        }
    };
    ffAnimationId = requestAnimationFrame(tickFastClock);
}
function continueFastForward() {
    const done = consumePending('fastForward');
    if (!done)
        return; // already consumed by an earlier trigger — ignore
    document.getElementById('fastForwardOverlay').style.display = 'none';
    clearInterval(cuisineIntervalId);
    done(); // no clue is revealed during this transition
}
/* ---------- FLIGHT READY CONFIRMATION ---------- */
const DEPARTURE_BOARD_FILLERS = [
    ['HELSINKI', 'AY', 25], ['DOHA', 'QR', 38], ['VANCOUVER', 'AC', 72],
    ['ISTANBUL', 'TK', 105], ['AUCKLAND', 'NZ', 165], ['SEOUL', 'KE', 215]
];
let pendingDepartureBoardCallback = null;
let departureBoardEarlyEligible = false;
let scheduledEarlyDeparture = 0;
let scheduledLaterDeparture = 0;
function flightLaterDepartureDelay() {
    const duration = estimatedIntercityFlightMinutes(currentLegData, nextLegData());
    return duration <= 120 ? 90 : (duration <= 300 ? 150 : 240);
}
function formatDepartureTime(minutes) {
    const normalized = ((Math.round(minutes / 5) * 5) % 1440 + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, '0')}${String(normalized % 60).padStart(2, '0')}`;
}
function departureAirportLabel() {
    return String(currentLegData.airportName || 'International Airport').replace(/International|Airport|Kingsford Smith|Capital/gi, '').trim().toUpperCase() || 'INTERNATIONAL';
}
function showFlightDeparturesBoard(callback) {
    const destinationLeg = nextLegData();
    if (!destinationLeg) {
        callback();
        return;
    }
    pendingDepartureBoardCallback = callback;
    departureBoardEarlyEligible = ['ridehail', 'car'].includes(lastCompletedTravelMode);
    const arrival = Math.ceil(clockMinutes / 5) * 5;
    scheduledEarlyDeparture = arrival + 50;
    scheduledLaterDeparture = scheduledEarlyDeparture + flightLaterDepartureDelay();
    const destination = String(destinationLeg.cityName || destinationLeg.countryFull).toUpperCase();
    const legIndex = Math.max(0, currentLegData.legNumber - 1);
    const targetNumber = 600 + ((legIndex + 1) * 17);
    const rows = [
        { time: scheduledEarlyDeparture, flight: `IR${targetNumber}`, destination, status: 'LAST SEATS', target: true },
        { time: scheduledLaterDeparture, flight: `IR${targetNumber + 4}`, destination, status: 'AVAILABLE', target: true, later: true },
        ...DEPARTURE_BOARD_FILLERS.map(([city, airline, offset], index) => ({
            time: arrival + offset,
            flight: `${airline}${210 + ((legIndex * 37 + index * 53) % 760)}`,
            destination: city,
            status: offset <= 38 ? 'BOARDING' : (offset <= 72 ? 'ON TIME' : 'SCHEDULED')
        }))
    ].sort((a, b) => a.time - b.time);
    document.getElementById('departuresAirportCode').textContent = departureAirportLabel();
    document.getElementById('departuresRows').innerHTML = rows.map(row => `<div class="departure-row${row.target ? ' target-flight' : ''}"><span>${formatDepartureTime(row.time)}</span><span>${escapeHTML(row.flight)}</span><span class="departure-destination">${escapeHTML(row.destination)}</span><span class="departure-status${row.later ? ' later' : ''}">${escapeHTML(row.status)}</span></div>`).join('');
    document.getElementById('departuresRouteTitle').textContent = `${formatDepartureTime(scheduledEarlyDeparture)} or ${formatDepartureTime(scheduledLaterDeparture)} to ${destinationLeg.cityName}`;
    const eligibility = document.getElementById('departuresEligibilityText');
    const button = document.getElementById('departuresContinueBtn');
    if (departureBoardEarlyEligible) {
        eligibility.innerHTML = `Your fast airport transfer gets you there in time to fight for the <b>${formatDepartureTime(scheduledEarlyDeparture)}</b> flight's final pair of seats. Lose the sprint and you take the <b>${formatDepartureTime(scheduledLaterDeparture)}</b>.`;
        button.textContent = 'Go to the Counter · Race for Early Seats →';
    }
    else {
        eligibility.innerHTML = `After arriving by ${lastCompletedTravelMode || 'ground transport'}, check-in for the <b>${formatDepartureTime(scheduledEarlyDeparture)}</b> has closed. Your team is confirmed on the <b>${formatDepartureTime(scheduledLaterDeparture)}</b> flight.`;
        button.textContent = `Take the ${formatDepartureTime(scheduledLaterDeparture)} Flight →`;
    }
    document.getElementById('flightDeparturesOverlay').style.display = 'flex';
}
function continueFromDepartureBoard() {
    document.getElementById('flightDeparturesOverlay').style.display = 'none';
    if (departureBoardEarlyEligible) {
        const callback = pendingDepartureBoardCallback;
        pendingDepartureBoardCallback = null;
        if (callback)
            callback();
        return;
    }
    pendingDepartureBoardCallback = null;
    watchedEntertainmentIndices.clear();
    chosenFlightType = 'late';
    earlyFlightWinnerName = null;
    pendingFlightTravelTime = estimatedIntercityFlightMinutes(currentLegData, nextLegData());
    advanceClock(flightLaterDepartureDelay());
    showSeatingPlan();
}
const COUNTER_AGENTS = [
    { name: 'Priya', art: 'female', line: "Two seats? Let me see what's actually left on tonight's departures." },
    { name: 'Kenji', art: 'male', line: "You're the fourth team through here in ten minutes. Everyone wants the same flight." },
    { name: 'Samuel', art: 'male', line: "I can put you on one of two flights. One of them leaves a lot sooner than the other." },
];
const QUEUE_LINES = [
    "You join the back of a queue that hasn't moved in eleven minutes.",
    "Two other teams are already at the counter, talking fast and pointing at a screen.",
    "The queue snakes around a stanchion twice. Somewhere ahead, someone is arguing about baggage weight.",
    "You shuffle forward one step at a time while the departures board quietly reshuffles above you.",
];
function showFlightReadyDialog() {
    const agent = COUNTER_AGENTS[Math.floor(Math.random() * COUNTER_AGENTS.length)];
    energy = Math.min(energy, scaledTravelEnergyCap(48));
    updateEnergyHud();
    document.getElementById('counterAgentAvatar').src = agent.art === 'female' ? GENERATED_ART.airportAgentPriya : COMIC_UI_ART.airportAgent;
    document.getElementById('counterAgentName').textContent = `${agent.name} at the counter`;
    document.getElementById('counterAgentLabel').textContent = agent.name;
    document.getElementById('counterAgentLine').textContent = agent.line;
    document.getElementById('counterQueueText').textContent = QUEUE_LINES[Math.floor(Math.random() * QUEUE_LINES.length)];
    document.getElementById('flightReadyOverlay').style.display = 'flex';
}
function confirmFlightReady() {
    document.getElementById('flightReadyOverlay').style.display = 'none';
    startFlightChoice();
}
/* ---------- FLIGHT CHOICE: TAP RACE AGAINST LIVE RIVALS ---------- */
let flightDecided = false;
let flightRaceActive = false;
let flightRaceEntries = [];
let flightRaceProgress = [];
let flightRaceInterval = null;
let flightCountdownTimers = [];
let earlyFlightWinnerName = null;
function clearFlightRaceTimers() {
    clearInterval(flightRaceInterval);
    flightCountdownTimers.forEach(clearTimeout);
    flightCountdownTimers = [];
}
function buildFlightRaceLanes() {
    const rivalPool = [...ensureSurvivingRivals()].sort(() => Math.random() - 0.5).slice(0, 3);
    flightRaceEntries = [
        { name: `You & ${partnerFirstName()}`, icon: '🏃', you: true, speed: 0 },
        ...rivalPool.map((team, i) => ({ name: String(team.name).replace(/&amp;/g, '&'), icon: team.avatars[i % team.avatars.length], you: false, team, speed: 1.75 + Math.random() * .7 }))
    ];
    flightRaceProgress = new Array(flightRaceEntries.length).fill(0);
    document.getElementById('flightRaceLanes').innerHTML = flightRaceEntries.map((entry, i) => `<div class="flight-race-lane${entry.you ? ' you' : ''}" id="flightRaceLane-${i}">
        <div class="flight-racer-name">${entry.you ? '★ ' : ''}${escapeHTML(entry.name)}</div>
        <div class="flight-lane-track"><div class="flight-racer" id="flightRacer-${i}">${entry.icon}</div></div>
      </div>`).join('');
    updateFlightRaceVisuals();
}
function updateFlightRaceVisuals() {
    flightRaceProgress.forEach((progress, i) => {
        const runner = document.getElementById(`flightRacer-${i}`);
        if (runner)
            runner.style.left = `${2 + Math.min(88, progress * .88)}%`;
    });
    const playerProgress = Math.min(100, flightRaceProgress[0] || 0);
    document.getElementById('flightPlayerMeter').style.width = `${playerProgress}%`;
    document.getElementById('flightTapPercent').textContent = `${Math.floor(playerProgress)}%`;
}
function startFlightChoice() {
    clearFlightRaceTimers();
    watchedEntertainmentIndices.clear();
    flightDecided = false;
    flightRaceActive = false;
    earlyFlightWinnerName = null;
    chosenFlightType = null;
    buildFlightRaceLanes();
    document.getElementById('flightChoiceOverlay').style.display = 'flex';
    document.getElementById('flightWarningText').style.display = 'block';
    document.getElementById('flightButtonsWrap').style.display = 'block';
    document.getElementById('flightRaceResult').style.display = 'none';
    document.getElementById('flightTapBtn').disabled = true;
    const countdown = document.getElementById('flightRaceCountdown');
    countdown.textContent = '5';
    flightCountdownTimers.push(setTimeout(() => countdown.textContent = '4', 700));
    flightCountdownTimers.push(setTimeout(() => countdown.textContent = '3', 1400));
    flightCountdownTimers.push(setTimeout(() => countdown.textContent = '2', 2100));
    flightCountdownTimers.push(setTimeout(() => countdown.textContent = '1', 2800));
    flightCountdownTimers.push(setTimeout(() => {
        countdown.textContent = 'GO!';
        flightRaceActive = true;
        document.getElementById('flightTapBtn').disabled = false;
        flightRaceInterval = setInterval(advanceFlightRivals, 90);
    }, 3500));
}
function advanceFlightRivals() {
    if (!flightRaceActive)
        return;
    for (let i = 1; i < flightRaceEntries.length; i++) {
        const surge = .78 + Math.random() * .48;
        flightRaceProgress[i] += flightRaceEntries[i].speed * surge;
    }
    updateFlightRaceVisuals();
    checkFlightRaceWinner();
}
function tapFlightRun() {
    if (!flightRaceActive || flightDecided)
        return;
    flightRaceProgress[0] += 4.05 + Math.random() * .75;
    updateFlightRaceVisuals();
    checkFlightRaceWinner();
}
function checkFlightRaceWinner() {
    if (!flightRaceActive)
        return;
    const finishers = flightRaceProgress.map((progress, i) => ({ progress, i })).filter(x => x.progress >= 100);
    if (!finishers.length)
        return;
    finishers.sort((a, b) => b.progress - a.progress);
    finishFlightRace(finishers[0].i);
}
let pendingFlightTravelTime = 0;
let chosenFlightType = null;
function finishFlightRace(winnerIndex) {
    if (flightDecided || winnerIndex < 0 || !flightRaceEntries[winnerIndex])
        return;
    flightDecided = true;
    flightRaceActive = false;
    clearFlightRaceTimers();
    flightRaceProgress[winnerIndex] = 100;
    updateFlightRaceVisuals();
    document.getElementById(`flightRaceLane-${winnerIndex}`).classList.add('winner');
    document.getElementById('flightTapBtn').disabled = true;
    document.getElementById('flightButtonsWrap').style.display = 'none';
    const playerWon = winnerIndex === 0;
    const winner = flightRaceEntries[winnerIndex];
    chosenFlightType = playerWon ? 'early' : 'late';
    const destinationLeg = nextLegData();
    pendingFlightTravelTime = estimatedIntercityFlightMinutes(currentLegData, destinationLeg);
    const laterDepartureDelay = flightLaterDepartureDelay();
    if (!playerWon)
        advanceClock(laterDepartureDelay);
    earlyFlightWinnerName = playerWon ? null : winner.team.name;
    document.getElementById('flightRaceCountdown').textContent = playerWon ? 'YOU WON!' : `${winner.name} WON`;
    document.getElementById('flightRaceResultTitle').textContent = playerWon ? 'Early Flight Secured' : 'Early Flight Taken';
    document.getElementById('flightRaceResultText').textContent = playerWon
        ? `Your team reaches the counter first and claims the early departure. Scheduled block time: ${formatRuntime(pendingFlightTravelTime)}.`
        : `${winner.name} reaches the counter first. Your departure moves ${formatRuntime(laterDepartureDelay)} later; the flight itself is ${formatRuntime(pendingFlightTravelTime)}.`;
    document.getElementById('flightRaceResult').style.display = 'block';
}
function continueFlightRace() {
    if (!flightDecided || !chosenFlightType)
        return;
    document.getElementById('flightChoiceOverlay').style.display = 'none';
    showSeatingPlan();
}
/* ---------- SEATING PLAN ---------- */
const PLANE_ROWS = 24;
let selectedSeatRow = null, selectedSeatSide = null, selectedSeatCost = 0;
function seatUpchargeFor(row) {
    // Every seat carries a fare; front rows cost more because they save exit time.
    const table = FARE_TABLES[currentLegData.countryTag];
    const base = table ? table.taxi : 0;
    if (row <= 3)
        return Math.round(base * 1.6);
    if (row <= 7)
        return Math.round(base * 0.9);
    if (row <= 13)
        return Math.round(base * 0.4);
    if (row <= 18)
        return Math.max(1, Math.round(base * 0.22));
    return Math.max(1, Math.round(base * 0.12));
}
function showSeatingPlan() {
    const occupied = {};
    const shuffledRivals = [...ensureSurvivingRivals()]
        .filter(team => team.name !== earlyFlightWinnerName)
        .sort(() => Math.random() - 0.5);
    let rivalIdx = 0;
    const hostLine = document.querySelector('#screen-seating .host-line');
    if (chosenFlightType === 'early') {
        // Early flight: nearly full. Fill every seat except one pair, deliberately in the back half.
        hostLine.textContent = "This flight is nearly full — the early departure meant less time to pick a seat. Every remaining pair still carries its listed airfare.";
        const allKeys = [];
        for (let r = 1; r <= PLANE_ROWS; r++) {
            allKeys.push(r + '-AB');
            allKeys.push(r + '-CD');
        }
        const backHalfKeys = allKeys.filter(k => parseInt(k.split('-')[0]) > PLANE_ROWS * 0.55);
        const remainingKey = backHalfKeys[Math.floor(Math.random() * backHalfKeys.length)];
        allKeys.forEach(key => {
            if (key === remainingKey)
                return;
            // The player won the only remaining pair; rival teams are not on this departure.
            occupied[key] = { commuter: true };
        });
    }
    else {
        // Late flight: plenty of room, real choice across the cabin.
        hostLine.textContent = "Front rows get you off the plane first — and off the plane first means time in your pocket. Some rows are already taken. That's not always the back ones.";
        // Premium front cabin (rows 1-3) is only available half the time.
        if (Math.random() < 0.5) {
            for (let r = 1; r <= 3; r++) {
                occupied[r + '-AB'] = { commuter: true };
                occupied[r + '-CD'] = { commuter: true };
            }
        }
        // Rival teams scattered through the cabin.
        const rivalPairs = Math.min(4, shuffledRivals.length);
        let placed = 0, guard = 0;
        while (placed < rivalPairs && guard < 300) {
            guard++;
            const row = 1 + Math.floor(Math.random() * PLANE_ROWS);
            const side = Math.random() < 0.5 ? 'AB' : 'CD';
            const key = row + '-' + side;
            if (!occupied[key]) {
                occupied[key] = shuffledRivals[rivalIdx++];
                placed++;
            }
        }
        // Ordinary commuters fill a realistic chunk of the plane.
        const commuterPairs = 16 + Math.floor(Math.random() * 10);
        let cPlaced = 0;
        guard = 0;
        while (cPlaced < commuterPairs && guard < 800) {
            guard++;
            const row = 1 + Math.floor(Math.random() * PLANE_ROWS);
            const side = Math.random() < 0.5 ? 'AB' : 'CD';
            const key = row + '-' + side;
            if (!occupied[key]) {
                occupied[key] = { commuter: true };
                cPlaced++;
            }
        }
        // Guarantee at least one selectable seat exists.
        const allKeys = [];
        for (let r = 1; r <= PLANE_ROWS; r++) {
            allKeys.push(r + '-AB');
            allKeys.push(r + '-CD');
        }
        if (allKeys.every(k => occupied[k]))
            delete occupied[PLANE_ROWS + '-CD'];
    }
    selectedSeatRow = null;
    selectedSeatSide = null;
    selectedSeatCost = 0;
    document.getElementById('seatConfirmBtn').style.display = 'none';
    renderSeatMap(occupied);
    showScreen('screen-seating');
}
function renderSeatMap(occupied) {
    const wrap = document.getElementById('seatMapWrap');
    wrap.innerHTML = '';
    for (let row = 1; row <= PLANE_ROWS; row++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'seat-row';
        const rowNum = document.createElement('div');
        rowNum.className = 'seat-row-num';
        rowNum.textContent = row;
        rowEl.appendChild(rowNum);
        ['AB', 'CD'].forEach(side => {
            const key = row + '-' + side;
            const taken = occupied[key];
            const pairEl = document.createElement('div');
            pairEl.className = 'seat-pair';
            if (taken && taken.commuter) {
                pairEl.classList.add('commuter');
                pairEl.innerHTML = `❌`;
            }
            else if (taken) {
                pairEl.classList.add('occupied');
                pairEl.innerHTML = `${taken.avatars[0]}${taken.avatars[1]}`;
            }
            else {
                const cost = seatUpchargeFor(row);
                pairEl.innerHTML = `<span>💺💺</span><span class="seat-cost">${currentLegData.currencySymbol}${cost.toLocaleString()}</span>`;
                const affordable = budget >= cost;
                if (!affordable) {
                    pairEl.classList.add('unaffordable');
                }
                else {
                    pairEl.onclick = () => selectSeat(row, side, cost, pairEl);
                }
            }
            rowEl.appendChild(pairEl);
            if (side === 'AB') {
                const aisle = document.createElement('div');
                aisle.className = 'seat-aisle';
                rowEl.appendChild(aisle);
            }
        });
        wrap.appendChild(rowEl);
    }
}
function selectSeat(row, side, cost, el) {
    document.querySelectorAll('.seat-pair.selected').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedSeatRow = row;
    selectedSeatSide = side;
    selectedSeatCost = cost;
    const btn = document.getElementById('seatConfirmBtn');
    btn.style.display = 'block';
    btn.textContent = `Take Row ${row} — ${currentLegData.currencySymbol}${cost.toLocaleString()} →`;
}
function confirmSeat() {
    budget -= selectedSeatCost;
    const bonus = Math.round((PLANE_ROWS - selectedSeatRow) / PLANE_ROWS * 45);
    advanceClock(-bonus);
    updateStatusBar();
    document.getElementById('bucklePartnerName').textContent = partnerFirstName();
    document.getElementById('buckleSeatText').textContent = `Row ${selectedSeatRow}${selectedSeatSide}, seats ${selectedSeatSide[0]}/${selectedSeatSide[1]}`;
    showScreen('screen-buckle');
}
/* ---------- FLIGHT NARRATION ---------- */
let departureTimers = [];
function showFlightDepartureCountdown(callback) {
    departureTimers.forEach(clearTimeout);
    departureTimers = [];
    setPending('flightDeparture', callback);
    syncFlightRouteBanners();
    const overlay = document.getElementById('flightDepartureOverlay');
    const count = document.getElementById('departureCount');
    const status = document.getElementById('departureStatus');
    const narration = document.getElementById('departureNarration');
    const fill = document.getElementById('departureTrackFill');
    count.textContent = '3';
    status.textContent = 'Doors Closed';
    narration.textContent = 'The cabin lights dim. The engines rise from a hum to a roar.';
    fill.style.width = '8%';
    overlay.style.display = 'flex';
    departureTimers.push(setTimeout(() => { count.textContent = '2'; status.textContent = 'Cabin Secured'; fill.style.width = '38%'; }, 700));
    departureTimers.push(setTimeout(() => { count.textContent = '1'; status.textContent = 'Rolling'; fill.style.width = '69%'; }, 1400));
    departureTimers.push(setTimeout(() => { count.textContent = 'TAKEOFF'; count.style.fontSize = '56px'; status.textContent = 'Airborne'; narration.textContent = 'The runway drops away and the race leaves the ground.'; fill.style.width = '100%'; }, 2100));
    departureTimers.push(setTimeout(() => {
        overlay.style.display = 'none';
        count.style.fontSize = '';
        const done = consumePending('flightDeparture');
        if (done)
            done();
    }, 3400));
}
function proceedToFlight() {
    inflightServiceCompleted = false;
    // Must track seatUpchargeFor()'s tiers, or a player can pay top price for row 5
    // and then be told they're at the very back.
    const rowQuality = selectedSeatRow <= 6 ? 'front' : (selectedSeatRow <= 16 ? 'middle' : 'back');
    let text;
    if (rowQuality === 'front') {
        text = `Boarding priority pays off in ways you won't appreciate until landing — you're off this plane fast at the other end, while the rest of economy is still fighting over the overhead bins.`;
    }
    else if (rowQuality === 'back') {
        text = `Row ${selectedSeatRow}, dead last off the plane. You'll be standing in the aisle for what feels like a geological era while everyone ahead of you calmly gathers their bags in slow motion.`;
    }
    else {
        text = `Middle of the plane, middle of the pack — not first off, not last, just quietly waiting your turn while the flight attendants make their fourth pass with the drink cart.`;
    }
    showFlightDepartureCountdown(() => {
        showFlightNarration(text, () => {
            showInFlightActivities();
        });
    });
}
/* ---------- IN-FLIGHT ACTIVITIES ---------- */
const INFLIGHT_ACTIVITIES = {
    nap: {
        title: 'Nap', icon: '<span class="nap-card-symbol" aria-hidden="true"><i></i><b>Z</b></span>', hint: 'Skip 1h 30m · +24 energy', saved: 90, energyGain: 24, cost: 0, scene: '', sceneClass: 'scene-nap',
        text: () => `You're out before the seatbelt sign even switches off. Somewhere over open water you surface briefly, register that ${partnerFirstName()} has also gone under, and drop straight back down. The hours vanish in one clean, unremarkable stretch.`
    },
    entertainment: {
        title: 'Watch', icon: '🎬', hint: 'Pick a runtime', cost: 0
    },
    chat: {
        title: 'Chat', icon: '💬', hint: 'Skip 45 min · +5 energy', saved: 45, energyGain: 5, cost: 0, scene: '', sceneClass: 'scene-chat',
        text: () => `You and ${partnerFirstName()} talk for hours — strategy first, then increasingly unhinged tangents about the other teams, then a genuinely heated debate about whether the Detour back in the last leg was rigged. You land knowing each other considerably better, and slightly more tired for it.`
    },
};
const INFLIGHT_CHAT_TOPICS = [
    ["Which team do you think is secretly the strongest?", "The quiet one. It is always the quiet one."],
    ["First meal after this leg — what are you ordering?", "Anything that does not arrive on a plastic tray."],
    ["Would you have chosen the other Detour?", "Ask me again after we see the results board."],
    ["If we win, where are we going without a clue envelope?", "Somewhere with room service and absolutely no running."],
    ["Do you think the camera caught that wrong turn?", "Every second of it. Probably from three angles."],
    ["Window seat next flight?", "Only if you promise not to wake me for clouds."],
    ["Who would survive longest without their backpack?", "Not us. Our snacks are in there."],
    ["Are we actually getting better at this?", "We are getting faster at pretending we have a plan."]
];
function flightChatSceneMarkup() {
    const topic = INFLIGHT_CHAT_TOPICS[Math.floor(Math.random() * INFLIGHT_CHAT_TOPICS.length)];
    const player = renderRacerAvatar(playerGender, playerTone, playerCostume);
    const partner = renderRacerAvatar(partnerGender, partnerTone, partnerCostume);
    return `<div class="inflight-chat-scene">
      <div class="inflight-chat-shade"></div>
      <div class="inflight-chat-racer player">${player}<span>You</span></div>
      <div class="inflight-chat-racer partner">${partner}<span>${escapeHTML(partnerFirstName())}</span></div>
      <div class="inflight-speech player-line">${escapeHTML(topic[0])}</div>
      <div class="inflight-speech partner-line">${escapeHTML(topic[1])}</div>
    </div>`;
}
function inFlightActivityMinutes(activity) {
    return activity.saved || 0;
}
function inFlightActivityEnergy(activity, minutes) {
    if (!activity.saved || !activity.energyGain)
        return activity.energyGain || 0;
    return Math.max(1, Math.round(activity.energyGain * (minutes / activity.saved)));
}
function showInFlightActivities() {
    const wrap = document.getElementById('inflightOptions');
    wrap.innerHTML = '';
    const hostLine = document.getElementById('inflightHostLine');
    if (hostLine)
        hostLine.innerHTML = `<b>${formatRuntime(pendingFlightTravelTime)}</b> remains in the air. Nap and chat as often as time allows; each programme can only be watched once.`;
    Object.keys(INFLIGHT_ACTIVITIES).forEach(key => {
        const act = INFLIGHT_ACTIVITIES[key];
        const btn = document.createElement('button');
        btn.className = 'flight-activity-card';
        const activityMinutes = key === 'entertainment' ? 0 : inFlightActivityMinutes(act);
        const activityEnergy = key === 'entertainment' ? 0 : inFlightActivityEnergy(act, activityMinutes);
        const available = key === 'entertainment' ? hasAvailableEntertainment() : pendingFlightTravelTime >= activityMinutes;
        const hint = available ? (key === 'entertainment' ? act.hint : `Spend ${formatRuntime(activityMinutes)} &middot; +${activityEnergy} energy`) : (key === 'entertainment' ? 'No unwatched programme fits' : `Needs ${formatRuntime(activityMinutes)}`);
        btn.innerHTML = `<span class="flight-activity-icon">${act.icon}</span><span class="flight-activity-name">${act.title}</span><span class="flight-activity-time">${hint}</span>`;
        btn.disabled = !available;
        btn.onclick = () => key === 'entertainment' ? showEntertainmentHub() : chooseInFlightActivity(key, 0);
        wrap.appendChild(btn);
    });
    const finishBtn = document.getElementById('inflightFinishBtn');
    if (finishBtn)
        finishBtn.textContent = `Finish Activities · ${formatRuntime(pendingFlightTravelTime)} remains`;
    showScreen('screen-inflight');
}
function chooseInFlightActivity(key, cost) {
    const act = INFLIGHT_ACTIVITIES[key];
    if (cost > 0) {
        budget -= cost;
        updateStatusBar();
    }
    const activityMinutes = inFlightActivityMinutes(act);
    if (activityMinutes > pendingFlightTravelTime)
        return;
    pendingFlightTravelTime = Math.max(0, pendingFlightTravelTime - activityMinutes);
    advanceClock(activityMinutes);
    changeEnergy(inFlightActivityEnergy(act, activityMinutes));
    showFlightNarration(act.text(), () => {
        completeInFlightAction();
    }, act.scene, act.sceneClass);
}
const ENTERTAINMENT_LIBRARY = [
    { kind: 'Movies', title: 'Cloudline', runtime: 102, posterPosition: '0% 0%', narration: 'Sunset burns across the clouds as a lone flight races a storm toward the horizon. The cabin around you disappears into the film.' },
    { kind: 'Movies', title: 'The Last Clue', runtime: 96, posterPosition: '50% 0%', narration: 'A rain-soaked compass, a sealed clue and one final trail pull you into a globe-spanning mystery.' },
    { kind: 'Movies', title: 'Midnight Expressway', runtime: 118, posterPosition: '100% 0%', narration: 'Neon lanes streak past as the getaway car cuts through a sleepless city. Even the engine note feels loud through the headphones.' },
    { kind: 'Shows', title: 'City Detectives', runtime: 48, posterPosition: '0% 50%', narration: 'Two detectives unfold a battered street map beneath the lamps and realise the city itself is the witness.' },
    { kind: 'Shows', title: 'Kitchen Sprint', runtime: 42, posterPosition: '50% 50%', narration: 'Pans flare, timers scream and two chefs race to plate a final dish before the clock hits zero.' },
    { kind: 'Shows', title: 'World After Dark', runtime: 52, posterPosition: '100% 50%', narration: 'The episode drifts between moonlit skylines and the hidden lives that begin when each city goes quiet.' },
    { kind: 'Channels', title: 'World News Live', runtime: 30, posterPosition: '0% 100%', narration: 'A wall of live feeds tracks breaking stories across the globe while the aircraft follows its own line across the map.' },
    { kind: 'Channels', title: 'Nature Channel', runtime: 45, posterPosition: '50% 100%', narration: 'A toucan watches over a rainforest waterfall as the documentary slips deep beneath the canopy.' },
    { kind: 'Channels', title: 'Travel 24', runtime: 60, posterPosition: '100% 100%', narration: 'Coastlines, mountain cities and aircraft-window sunsets roll together into an hour of pure wanderlust.' },
];
let selectedEntertainmentIndex = null;
let entertainmentCategory = 'Movies';
const watchedEntertainmentIndices = new Set();
let inflightServiceCompleted = false;
function hasAvailableEntertainment() {
    return ENTERTAINMENT_LIBRARY.some((item, index) => !watchedEntertainmentIndices.has(index) && item.runtime <= pendingFlightTravelTime);
}
function hasAvailableInFlightActivity() {
    return pendingFlightTravelTime >= INFLIGHT_ACTIVITIES.chat.saved || pendingFlightTravelTime >= INFLIGHT_ACTIVITIES.nap.saved || hasAvailableEntertainment();
}
function completeInFlightAction() {
    if (!inflightServiceCompleted) {
        showMealService(pendingFlightTravelTime);
        return;
    }
    if (hasAvailableInFlightActivity())
        showInFlightActivities();
    else
        finishInFlightActivities();
}
function finishInFlightActivities() {
    const remaining = Math.max(0, pendingFlightTravelTime);
    pendingFlightTravelTime = 0;
    if (remaining === 0) {
        onFlightComplete();
        return;
    }
    startClockFastForward(remaining, 'Somewhere Over the Horizon', 'The flight carries on, hour after hour.', onFlightComplete);
}
function showEntertainmentHub() {
    selectedEntertainmentIndex = null;
    const finish = document.getElementById('finishEntertainmentBtn');
    finish.textContent = `Back to Activities · ${formatRuntime(pendingFlightTravelTime)} remains`;
    showScreen('screen-entertainment');
}
function showEntertainmentLibrary(category) {
    entertainmentCategory = category || entertainmentCategory;
    selectedEntertainmentIndex = null;
    const tabs = document.getElementById('entertainmentTabs');
    tabs.innerHTML = ['Movies', 'Shows', 'Channels'].map(kind => `<button class="ent-tab${kind === entertainmentCategory ? ' active' : ''}" onclick="filterEntertainment('${kind}')">${kind}</button>`).join('');
    renderEntertainmentRail();
    document.getElementById('watchEntertainmentBtn').style.display = 'none';
    document.getElementById('finishEntertainmentBtn').textContent = `Back to Activities · ${formatRuntime(pendingFlightTravelTime)} remains`;
    showScreen('screen-entertainment-catalog');
}
function filterEntertainment(category) {
    entertainmentCategory = category;
    selectedEntertainmentIndex = null;
    document.querySelectorAll('.ent-tab').forEach(tab => tab.classList.toggle('active', tab.textContent === category));
    document.getElementById('watchEntertainmentBtn').style.display = 'none';
    renderEntertainmentRail();
}
function renderEntertainmentRail() {
    const rail = document.getElementById('entertainmentRail');
    rail.innerHTML = ENTERTAINMENT_LIBRARY.map((item, index) => ({ item, index })).filter(x => x.item.kind === entertainmentCategory).map(({ item, index }) => {
        const unavailable = watchedEntertainmentIndices.has(index) || item.runtime > pendingFlightTravelTime;
        const formatLabel = item.kind === 'Channels' ? 'Live channel' : item.kind.slice(0, -1);
        return `<button class="ent-card${unavailable ? ' watched' : ''}" data-index="${index}" ${unavailable ? 'disabled' : ''} onclick="selectEntertainment(${index})"><div class="ent-poster" style="--poster-position:${item.posterPosition}"><span>${formatLabel}</span></div><div class="ent-card-copy"><div class="ent-kind">${item.kind}</div><div class="ent-title">${item.title}</div><div class="ent-runtime">Runtime &middot; <b>${formatRuntime(item.runtime)}</b></div></div></button>`;
    }).join('');
    rail.scrollLeft = 0;
}
function formatRuntime(minutes) {
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}
function selectEntertainment(index) {
    selectedEntertainmentIndex = index;
    document.querySelectorAll('.ent-card').forEach(card => card.classList.toggle('selected', Number(card.dataset.index) === index));
    const item = ENTERTAINMENT_LIBRARY[index];
    const btn = document.getElementById('watchEntertainmentBtn');
    btn.textContent = `Watch ${item.title} · ${formatRuntime(item.runtime)} →`;
    btn.style.display = 'block';
}
function watchSelectedEntertainment() {
    if (selectedEntertainmentIndex === null)
        return;
    const item = ENTERTAINMENT_LIBRARY[selectedEntertainmentIndex];
    const remaining = Math.max(0, pendingFlightTravelTime - item.runtime);
    pendingFlightTravelTime = remaining;
    advanceClock(item.runtime);
    watchedEntertainmentIndices.add(selectedEntertainmentIndex);
    changeEnergy(8);
    showFlightNarration(`<b>${item.title}</b> &middot; ${item.narration}<br><br><span class="ent-watch-time">${formatRuntime(item.runtime)} passes in the air.</span>`, completeInFlightAction, '', 'scene-entertainment', item.posterPosition);
}
function finishEntertainment() { showInFlightActivities(); }
/* ---------- FLIGHT ATTENDANT SERVICE ---------- */
let pendingRemainingFlightTime = 0;
function emojiForMeal(name) {
    const map = [
        [/rice/i, '🍚'], [/bento/i, '🍱'], [/curry/i, '🍛'], [/noodle|soup|laksa|pad thai/i, '🍜'],
        [/tagine|couscous/i, '🍲'], [/dumpling/i, '🥟'], [/panino|sandwich/i, '🥪'], [/pasta/i, '🍝'],
        [/nasi lemak/i, '🍛'], [/satay/i, '🍢'],
    ];
    for (const [re, emoji] of map)
        if (re.test(name))
            return emoji;
    return '🍽️';
}
function emojiForDrink(name) {
    if (name === 'Sparkling Water')
        return '🫧';
    if (name === 'Orange Juice')
        return '🍊';
    if (name === 'Coffee')
        return '☕';
    if (name === 'Tea')
        return '🍵';
    if (/tea/i.test(name))
        return '🍵';
    if (/coffee|kopi/i.test(name))
        return '☕';
    return '🥤';
}
function renderServiceChoices(choices) {
    const wrap = document.getElementById('serviceOptions');
    wrap.innerHTML = '';
    const confirmBtn = document.getElementById('serviceConfirmBtn');
    confirmBtn.style.display = 'none';
    let selected = null;
    choices.forEach(choice => {
        const affordable = budget >= choice.cost;
        const row = document.createElement('button');
        row.className = 'card choice-card service-tile' + (affordable ? '' : ' disabled');
        row.innerHTML = `<span class="service-emoji">${choice.emoji}</span><span class="service-name">${choice.name}</span><span class="service-price">${choice.cost > 0 ? currentLegData.currencySymbol + choice.cost : 'Free'}</span>`;
        row.disabled = !affordable;
        if (affordable) {
            row.onclick = () => {
                document.querySelectorAll('#serviceOptions .choice-card').forEach(e => e.classList.remove('selected'));
                row.classList.add('selected');
                selected = choice;
                confirmBtn.style.display = 'block';
            };
        }
        wrap.appendChild(row);
    });
    return () => selected;
}
function showMealService(remaining) {
    pendingRemainingFlightTime = remaining;
    document.getElementById('serviceHeadline').innerHTML = 'Anything to <em>Eat?</em>';
    document.getElementById('serviceAttendantLine').textContent = `Your flight attendant rolls the cart alongside your row. "We've got two options tonight, or I can leave you be."`;
    const baseMeal = Math.max(1, Math.round(currentLegData.startBudget * 0.04));
    const mealA = currentLegData.inflightMeals[0], mealB = currentLegData.inflightMeals[1];
    const choices = [
        { name: mealA, cost: Math.round(baseMeal * 1.0), emoji: emojiForMeal(mealA), energyGain: 16 },
        { name: mealB, cost: Math.round(baseMeal * 1.35), emoji: emojiForMeal(mealB), energyGain: 20 },
        { name: "No thanks, I'm fine", cost: 0, emoji: '🙅', energyGain: 0 },
    ];
    const getSelected = renderServiceChoices(choices);
    document.getElementById('serviceConfirmBtn').onclick = () => {
        const choice = getSelected();
        if (!choice)
            return;
        budget -= choice.cost;
        changeEnergy(choice.energyGain || 0);
        updateStatusBar();
        showDrinkService();
    };
    showScreen('screen-flightservice');
}
function showDrinkService() {
    document.getElementById('serviceHeadline').innerHTML = 'Something to <em>Drink?</em>';
    document.getElementById('serviceAttendantLine').textContent = `"Sparkling water, orange juice, coffee, tea, or the local ${currentLegData.localDrink} — or nothing at all, entirely your call."`;
    const baseDrink = Math.max(1, Math.round(currentLegData.startBudget * 0.02));
    const choices = [
        { name: 'Sparkling Water', cost: Math.round(baseDrink * 0.9), emoji: '🫧', energyGain: 8 },
        { name: 'Orange Juice', cost: Math.round(baseDrink * 0.7), emoji: '🍊', energyGain: 10 },
        { name: 'Coffee', cost: Math.round(baseDrink * 0.8), emoji: '☕', energyGain: 12 },
        { name: 'Tea', cost: Math.round(baseDrink * 0.6), emoji: '🍵', energyGain: 9 },
        { name: currentLegData.localDrink, cost: Math.round(baseDrink * 1.0), emoji: emojiForDrink(currentLegData.localDrink), energyGain: 11 },
        { name: "No thanks, I'm fine", cost: 0, emoji: '🙅', energyGain: 0 },
    ];
    const getSelected = renderServiceChoices(choices);
    document.getElementById('serviceConfirmBtn').onclick = () => {
        const choice = getSelected();
        if (!choice)
            return;
        budget -= choice.cost;
        changeEnergy(choice.energyGain || 0);
        updateStatusBar();
        finishFlightService();
    };
    showScreen('screen-flightservice');
}
function finishFlightService() {
    inflightServiceCompleted = true;
    pendingFlightTravelTime = pendingRemainingFlightTime;
    if (hasAvailableInFlightActivity())
        showInFlightActivities();
    else
        finishInFlightActivities();
}
function showFlightNarration(text, callback, sceneEmoji, sceneClass, artworkPosition) {
    if (document.getElementById('flightNarrationOverlay').style.display === 'flex')
        return; // already showing
    setPending('flightNarration', callback);
    const textEl = document.getElementById('flightNarrationText');
    const sceneEl = document.getElementById('flightNarrationSceneEmoji');
    const sceneWrap = document.getElementById('flightSceneWrap');
    const artworkEl = document.getElementById('flightNarrationArtwork');
    const customNapScene = sceneClass === 'scene-nap';
    const customChatScene = sceneClass === 'scene-chat';
    const usedEmoji = artworkPosition || customNapScene || customChatScene ? '' : (sceneEmoji || '');
    sceneEl.className = 'route-emoji';
    if (sceneClass)
        sceneEl.classList.add(sceneClass);
    if (customNapScene) {
        sceneEl.innerHTML = '<div class="premium-cabin-nap"><img src="assets/generated/premium-cabin-nap-build59.png" alt="Two lie-flat premium cabin beds beneath moonlit aircraft windows"><div class="nap-scene-label"><small>Cabin lights dimmed</small><b>Resting above the clouds</b></div></div>';
        sceneEl.style.fontSize = '';
    }
    else if (customChatScene) {
        sceneEl.innerHTML = flightChatSceneMarkup();
        sceneEl.style.fontSize = '';
    }
    else {
        sceneEl.textContent = usedEmoji;
        sceneEl.style.fontSize = '90px';
    }
    sceneWrap.style.display = artworkPosition || usedEmoji || customNapScene || customChatScene ? 'block' : 'none';
    artworkEl.style.display = artworkPosition ? 'block' : 'none';
    artworkEl.style.setProperty('--poster-position', artworkPosition || '0% 0%');
    const cloudsEl = document.getElementById('flightCloudsDecor');
    cloudsEl.style.display = 'none';
    textEl.innerHTML = '';
    syncFlightRouteBanners();
    document.getElementById('flightNarrationContinueBtn').style.display = 'none';
    document.getElementById('flightNarrationOverlay').style.display = 'flex';
    typeHTML(textEl, text, 22, () => {
        document.getElementById('flightNarrationContinueBtn').style.display = 'block';
    });
}
function continueFlightNarration() {
    document.getElementById('flightNarrationOverlay').style.display = 'none';
    document.getElementById('flightSceneWrap').style.display = 'none';
    const cb = consumePending('flightNarration');
    if (cb)
        cb();
}
function onFlightComplete() {
    if (currentLegData.legNumber < LEG_SEQUENCE.length) {
        const next = nextLegData();
        const overlay = document.getElementById('touchdownOverlay');
        overlay.classList.remove('cash-phase');
        document.getElementById('touchdownPhase').textContent = 'Arrival Confirmed';
        document.getElementById('touchdownCopy').textContent = `Touchdown · ${next.cityName}`;
        overlay.style.display = 'flex';
        requestAnimationFrame(() => overlay.classList.add('show'));
        setTimeout(() => {
            try {
                startNextLeg();
                overlay.classList.add('cash-phase');
                document.getElementById('touchdownPhase').textContent = 'Race Funds Updated';
                document.getElementById('touchdownCopy').textContent = `Cash converted · ${currentLegData.currencySymbol}${budget.toLocaleString()}`;
            }
            catch (error) {
                console.error('[touchdown] next-leg transition failed', error);
                document.getElementById('touchdownPhase').textContent = 'Arrival Recovery';
                document.getElementById('touchdownCopy').textContent = `Welcome to ${next.cityName}`;
            }
            finally {
                setTimeout(() => { overlay.classList.remove('show'); setTimeout(() => { overlay.style.display = 'none'; overlay.classList.remove('cash-phase'); }, 760); }, 1100);
            }
        }, 1300);
    }
    else {
        showRouteInfo('🏆', 'Season Complete', `You've made it through all ${LEG_SEQUENCE.length} legs in this build`, () => restartProto());
    }
}
/* ---------- NEXT LEG STARTUP ---------- */
function startNextLeg() {
    const departureLeg = currentLegData;
    const arrivalLeg = LEG_SEQUENCE[currentLegData.legNumber];
    const arrivalLocalClock = clockMinutes + timezoneOffsetMinutes(arrivalLeg) - timezoneOffsetMinutes(departureLeg);
    currentLegData = arrivalLeg;
    performance = { detour: 0, roadblock: 0, fastForward: 0 };
    budget = currentLegData.startBudget;
    clockMinutes = arrivalLocalClock;
    legStartClock = clockMinutes;
    rivalTimes = [];
    rivalSyncPlayerElapsed = 0;
    energy = Math.max(20, energy - 12);
    incomingYieldApplied = false;
    incomingYieldChecked = false;
    timeForfeitThisLeg = false;
    lastForfeitResult = null;
    detourCompletedType = null;
    pickDetourTypes();
    pickRoadblockType();
    applyLegTheme();
    updateStatusBar();
    updateLastSeenTicker();
    showLegArrival();
}
updateStatusBar();
applyLegTheme();
syncRaceCountCopy();
checkForSavedGame();
/* ---------- CINEMATIC INTRO (plays once, word by word) ---------- */
const CINEMATIC_PHRASES = [
    { text: "TWELVE TEAMS.", time: 1000 },
    { text: "COUNTRIES LOCKED.", time: 1000 },
    { text: "$100,000.", time: 1100 },
    { text: "NO MAPS.", time: 800 },
    { text: "NO MERCY.", time: 900 },
    { text: "NO SECOND CHANCES.", time: 1200 },
    { text: "ONLY ONE TEAM WALKS AWAY.", time: 1400 },
    { text: "THIS IS...", time: 1000 },
    { text: "THE INCREDIBLE RACE.", time: 1900, big: true },
];
let cinematicIdx = 0, cinematicTimer = null;
function startCinematicIntro() {
    syncRaceCountCopy();
    if (CINEMATIC_PHRASES[1])
        CINEMATIC_PHRASES[1].text = `${numberWordUpper(selectedRaceCountryCount())} COUNTRIES.`;
    cinematicIdx = 0;
    document.getElementById('introCinematicOverlay').style.display = 'flex';
    playNextCinematicPhrase();
}
function playNextCinematicPhrase() {
    if (cinematicIdx >= CINEMATIC_PHRASES.length) {
        finishCinematicIntro();
        return;
    }
    const phrase = CINEMATIC_PHRASES[cinematicIdx];
    const el = document.getElementById('cinematicPhraseText');
    el.classList.remove('phrase-anim', 'big');
    void el.offsetWidth; // restart the CSS animation from scratch
    el.textContent = phrase.text;
    if (phrase.big)
        el.classList.add('big');
    el.classList.add('phrase-anim');
    cinematicIdx++;
    clearTimeout(cinematicTimer);
    cinematicTimer = setTimeout(playNextCinematicPhrase, phrase.time);
}
function skipCinematicIntro() {
    clearTimeout(cinematicTimer);
    finishCinematicIntro();
}
function finishCinematicIntro() {
    document.getElementById('introCinematicOverlay').style.display = 'none';
}
/* ---------- SESSION-ONLY ADMIN PLAYTEST ---------- */
const ADMIN_PIN_HASH = 'a26e5d5912c87a334c5ee5bf15793046ee47739f396023945be7195d35fd2495';
async function hashAdminPin(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function setAdminOverlay(id, open) {
    const el = document.getElementById(id);
    el.classList.toggle('open', open);
    el.setAttribute('aria-hidden', open ? 'false' : 'true');
}
function openAdminHub() { setAdminOverlay('adminPlaytestHub', true); }
function closeAdminHub() { setAdminOverlay('adminPlaytestHub', false); }
function adminScreenLabel(screen) {
    const headline = screen.querySelector('h1, .headline');
    const eyebrow = screen.querySelector('.eyebrow');
    return (headline ? headline.textContent : eyebrow ? eyebrow.textContent : screen.id.replace('screen-', '')).replace(/\s+/g, ' ').trim();
}
function jumpToAdminScreen(id) {
    closeAdminHub();
    activeTaskContext = 'admin';
    const starters = {
        'screen-slurp': () => startSlurp('admin'),
        'screen-rhythm': () => startRhythm('admin'),
        'screen-stack': () => startStack('admin'),
        'screen-simon': () => startSimon('admin'),
        'screen-match': () => startCulturalMatch('admin'),
        'screen-gamble': () => startGamble('admin'),
        'screen-language': () => startLanguageGame('admin'),
        'screen-code': () => startCode('admin'),
        'screen-arcade': () => startArcade()
    };
    if (starters[id]) starters[id]();
    else showScreen(id);
}
function buildAdminLinks() {
    const grid = document.getElementById('adminLinkGrid');
    grid.innerHTML = '';
    const groups = [
        { title: 'Race Setup', ids: ['screen-title', 'screen-setup', 'screen-startcity', 'screen-intro'] },
        { title: 'Travel & Flights', ids: ['screen-transport1', 'screen-transport2', 'screen-transport3', 'screen-transport-sub', 'screen-busseats', 'screen-seating', 'screen-buckle', 'screen-inflight', 'screen-entertainment', 'screen-entertainment-catalog', 'screen-flightservice'] },
        { title: 'Tasks & Challenges', ids: ['screen-detour', 'screen-slurp', 'screen-rhythm', 'screen-stack', 'screen-simon', 'screen-match', 'screen-gamble', 'screen-language', 'screen-code', 'screen-roadblock-intro', 'screen-rps', 'screen-confer', 'screen-arcade'] },
        { title: 'Results & Checkpoints', ids: ['screen-detour-result', 'screen-roadblock-result', 'screen-yield', 'screen-pitstop-arrival', 'screen-checkpoint-arrival', 'screen-checkpoint', 'screen-pitstop'] }
    ];
    const added = new Set();
    const appendGroup = (title, screens) => {
        if (!screens.length) return;
        const heading = document.createElement('div');
        heading.className = 'admin-group-title';
        heading.textContent = title;
        grid.appendChild(heading);
        screens.forEach(screen => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-jump';
            button.innerHTML = `${escapeHTML(adminScreenLabel(screen))}<span>${escapeHTML(screen.id.replace('screen-', '').replaceAll('-', ' '))}</span>`;
            button.addEventListener('click', () => jumpToAdminScreen(screen.id));
            grid.appendChild(button);
            added.add(screen.id);
        });
    };
    groups.forEach(group => appendGroup(group.title, group.ids.map(id => document.getElementById(id)).filter(Boolean)));
    appendGroup('Other Screens', Array.from(document.querySelectorAll('.screen[id^="screen-"]')).filter(screen => !added.has(screen.id)));
}
function enableAdminSession() {
    if (!adminModeActive) {
        const existingSave = localStorage.getItem(SAVE_KEY);
        sessionStorage.setItem(ADMIN_SAVE_BACKUP_KEY, existingSave === null ? '__NO_SAVE__' : existingSave);
    }
    adminModeActive = true;
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    document.body.classList.add('admin-session');
    setAdminOverlay('adminPinOverlay', false);
    buildAdminLinks();
    openAdminHub();
}
function exitAdminToMainGame() {
    const backup = sessionStorage.getItem(ADMIN_SAVE_BACKUP_KEY);
    if (backup === '__NO_SAVE__') localStorage.removeItem(SAVE_KEY);
    else if (backup !== null) localStorage.setItem(SAVE_KEY, backup);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SAVE_BACKUP_KEY);
    location.reload();
}
function initAdminPlaytest() {
    const pinOverlay = document.getElementById('adminPinOverlay');
    const pinInput = document.getElementById('adminPinInput');
    const pinError = document.getElementById('adminPinError');
    document.getElementById('adminAccessLink').addEventListener('click', () => {
        pinInput.value = '';
        pinError.textContent = '';
        setAdminOverlay('adminPinOverlay', true);
        setTimeout(() => pinInput.focus(), 0);
    });
    document.getElementById('adminPinCancel').addEventListener('click', () => setAdminOverlay('adminPinOverlay', false));
    document.getElementById('adminPinSubmit').addEventListener('click', async () => {
        if (await hashAdminPin(pinInput.value.trim()) === ADMIN_PIN_HASH) enableAdminSession();
        else {
            pinError.textContent = 'Incorrect PIN. Try again.';
            pinInput.select();
        }
    });
    pinInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') document.getElementById('adminPinSubmit').click();
    });
    pinOverlay.addEventListener('click', event => {
        if (event.target === pinOverlay) setAdminOverlay('adminPinOverlay', false);
    });
    document.getElementById('adminHubOpen').addEventListener('click', openAdminHub);
    document.getElementById('adminHubClose').addEventListener('click', closeAdminHub);
    document.getElementById('adminExitMain').addEventListener('click', exitAdminToMainGame);
    if (adminModeActive) {
        document.body.classList.add('admin-session');
        buildAdminLinks();
    }
}
initAdminPlaytest();
startCinematicIntro();
/* Legacy inline-handler bridge.
   The migrated app uses an ES module, while the preserved Build 35 markup still
   calls these functions from inline event attributes. Exposing only this audited
   list keeps all existing controls working without altering game behavior. */
const __legacyHandlerNames = ["applyTaskForfeit", "arriveAtCheckpoint", "askTrainStranger", "chooseForfeitPenalty", "closeForfeitOverlay", "closeYieldTeamPicker", "confirmBusSeat", "confirmFlightReady", "confirmForfeitIntent", "confirmPartner", "confirmSeat", "continueFastForward", "continueFlightNarration", "continueFlightRace", "continueFromCompletedTask", "continueFromDepartureBoard", "continueIncomingYield", "continueRPSRoadblock", "continueRaceEvent", "continueRouteInfo", "continueTaskClue", "continueTravel", "filterEntertainment", "finishEntertainment", "goToRoute1", "goToRoute2", "goToYieldLandmark", "moveMazePlayer", "openPendingClueBox", "openRPS", "openTaskClueBox", "openTaskForfeit", "openYieldTeamPicker", "playRPS", "prepRoadblock", "proceedToFlight", "resetLanguageAttempt", "restartProto", "resumeGame", "returnToForfeitFirstConfirmation", "returnToForfeitPenaltyChoice", "returnToTransportOptions", "rollFastForward", "selectEntertainment", "showConferScreen", "showEntertainmentHub", "showEntertainmentLibrary", "showInFlightActivities", "showStartingAirportDepartureClue", "skipCinematicIntro", "skipYield", "startDetourGame", "startFastForwardTime", "startIncomingYieldTimer", "startNewRace", "submitCodeGuess", "tapFlightRun", "tapRhythmLane", "toggleMusic", "updateSetupPreview", "updateTrainTipDisplay", "watchSelectedEntertainment"];
for (const __handlerName of __legacyHandlerNames) {
    try {
        const __handler = eval(__handlerName);
        if (typeof __handler === 'function')
            window[__handlerName] = __handler;
    }
    catch (error) {
        console.warn(`Unable to expose legacy handler: ${__handlerName}`, error);
    }
}
//# sourceMappingURL=game.js.map
