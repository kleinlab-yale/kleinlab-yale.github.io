(() => {
  "use strict";

  const SAVE_KEY = "idle-town-westport";
  const LEGACY_SAVE_KEYS = ["idle-town-westport-v7", "idle-town-westport-v6", "idle-town-westport-v5"];
  const MAX_OFFLINE_MS = 2 * 60 * 60 * 1000;
  const OFFLINE_EFFICIENCY = 0.35;
  const TICK_MS = 500;
  const BUILD_PHASE_SECONDS = [90, 150, 240];
  const BUILD_RUSH = { coins: { seconds: 60 }, materials: { seconds: 90, wood: 1, ore: 1 } };
  const MAX_BUILDING_LEVEL = 3;
  const SEASON_LENGTH_MS = 20 * 60 * 1000;
  const START_SEASON = "fall";
  const SEASONS = [
    { id: "spring", name: "Spring", detail: "Soft fields, berries, carrots, and wheat" },
    { id: "summer", name: "Summer", detail: "Fast harvests, berries, apples, and pumpkins" },
    { id: "fall", name: "Fall", detail: "Golden fields, pumpkins, apples, and wheat" },
    { id: "winter", name: "Winter", detail: "Animals keep producing; only winter wheat can be planted" },
  ];
  const LEVELS = [
    { name: "Sprout Village", xp: 0 },
    { name: "Maple Village", xp: 250 },
    { name: "Cedar Crossing", xp: 650 },
    { name: "Coleytown Commons", xp: 1200 },
    { name: "Golden Hill Town", xp: 2100 },
  ];

  const CROPS = [
    {
      id: "carrot",
      name: "Carrots",
      seedCost: 2,
      duration: 120,
      yield: 5,
      value: 3,
      level: 1,
      atlasRow: 0,
      artKey: "carrot",
      color: "#e68a45",
      seasons: ["spring", "summer", "fall"],
    },
    {
      id: "wheat",
      name: "Wheat",
      seedCost: 3,
      duration: 240,
      yield: 8,
      value: 4,
      level: 1,
      atlasRow: 1,
      artKey: "wheat",
      color: "#e7bd57",
      seasons: ["spring", "summer", "fall", "winter"],
    },
    {
      id: "strawberry",
      name: "Strawberries",
      seedCost: 4,
      duration: 300,
      yield: 6,
      value: 6,
      level: 2,
      atlasRow: 4,
      artKey: "strawberry",
      color: "#d43e47",
      seasons: ["spring", "summer"],
    },
    {
      id: "pumpkin",
      name: "Pumpkins",
      seedCost: 5,
      duration: 480,
      yield: 7,
      value: 9,
      level: 2,
      atlasRow: 2,
      artKey: "pumpkin",
      color: "#d9793f",
      seasons: ["summer", "fall"],
    },
    {
      id: "blueberry",
      name: "Blueberries",
      seedCost: 6,
      duration: 540,
      yield: 9,
      value: 10,
      level: 3,
      atlasRow: 5,
      artKey: "blueberry",
      color: "#576cb8",
      seasons: ["summer"],
    },
    {
      id: "apple",
      name: "Apples",
      seedCost: 7,
      duration: 720,
      yield: 10,
      value: 12,
      level: 3,
      atlasRow: 3,
      artKey: "apple",
      color: "#b94d4b",
      seasons: ["summer", "fall"],
    },
  ];

  const BUILDINGS = {
    school: {
      name: "Coleytown Schoolhouse",
      short: "Schoolhouse",
      atlasRow: 0,
      artKey: "school",
      baseCost: 90,
      materials: { wood: 4, ore: 2 },
      description: "A schoolhouse that grows from a historic one-room school into a larger civic school and, eventually, its modern form.",
      effect: (level) => `+${level} seed on every correct math answer`,
      unlock: () => true,
    },
    market: {
      name: "Main Street Market",
      short: "Main Street Market",
      atlasRow: 1,
      artKey: "market",
      baseCost: 120,
      materials: { wood: 5, ore: 2 },
      description: "A friendly place to trade the farm’s best. Each era improves the price paid when you choose to sell.",
      effect: (level) => `+${level * 8}% value on every market sale`,
      unlock: () => true,
    },
    bakery: {
      name: "Cedar Bakery",
      short: "Cedar Bakery",
      atlasRow: 2,
      artKey: "bakery",
      baseCost: 280,
      materials: { wood: 8, ore: 4 },
      description: "Turns local harvests into treats. Each level increases the value of everything you sell.",
      effect: (level) => `+${level * 12}% crop value`,
      unlock: (state) => getLevelInfo(state.xp).level >= 2,
    },
    library: {
      name: "Coleytown Library",
      short: "Town Library",
      atlasRow: 3,
      artKey: "library",
      baseCost: 360,
      materials: { wood: 10, ore: 6 },
      description: "A modest historical reading room that expands through time before becoming Westport’s modern civic library.",
      effect: (level) => `+${level} wood from Chinese practice`,
      unlock: (state) => state.buildings.school >= 2,
    },
  };

  const ANIMALS = {
    chickens: { name: "Chicken Coop", artKey: "chickens", atlasRow: 0, baseCost: 55, labels: ["Empty pen", "2 chicks", "3 hens", "6 hens + eggs"], feed: [{ carrot: 2 }, { wheat: 3 }, { wheat: 4, apple: 1 }], effect: (level) => `${level} egg batch${level === 1 ? "" : "es"} every 3 minutes` },
    cows: { name: "Cow Paddock", artKey: "cows", atlasRow: 1, baseCost: 130, labels: ["Empty paddock", "1 calf", "2 cows", "4 cows + milk"], feed: [{ wheat: 4 }, { wheat: 5, apple: 1 }, { wheat: 6, apple: 2 }], effect: (level) => `${level} milk ${level === 1 ? "delivery" : "deliveries"} every 5 minutes` },
  };

  const GOODS = [
    { id: "eggs", name: "Egg Baskets", value: 8, animal: "chickens" },
    { id: "milk", name: "Milk Jugs", value: 18, animal: "cows" },
  ];

  const COMPO_LEVELS = [
    { name: "Compo Sandbar", xp: 0 },
    { name: "Boardwalk Cove", xp: 220 },
    { name: "Sailboat Harbor", xp: 620 },
    { name: "Compo Club Coast", xp: 1180 },
  ];

  const BEACH_CATCHES = [
    { id: "seashell", name: "Beach Shells", baitCost: 2, duration: 240, yield: 5, value: 3, level: 1, artKey: "seashell", seasons: ["spring", "summer", "fall", "winter"] },
    { id: "kelp", name: "Kelp Bundles", baitCost: 3, duration: 360, yield: 6, value: 4, level: 1, artKey: "kelp", seasons: ["spring", "summer", "fall", "winter"] },
    { id: "crab", name: "Shore Crabs", baitCost: 4, duration: 480, yield: 4, value: 8, level: 1, artKey: "crab", seasons: ["spring", "summer", "fall"] },
    { id: "fish", name: "Bluefish", baitCost: 5, duration: 540, yield: 4, value: 11, level: 2, artKey: "fish", seasons: ["summer", "fall"], requiresBoat: 1 },
    { id: "deepfish", name: "Deep-water Fish", baitCost: 7, duration: 720, yield: 3, value: 18, level: 3, artKey: "deepfish", seasons: ["summer", "fall"], requiresBoat: 2 },
  ];

  const BEACH_BUILDINGS = {
    towncenter: {
      name: "Compo Town Center",
      short: "Town Center",
      artKey: "towncenter",
      baseCost: 90,
      materials: { wood: 3, ore: 2 },
      description: "The beach hub starts as a simple pavilion, then adds golf and tennis, and finally becomes a modern pool-and-club center.",
      effect: (level) => level >= 3 ? "Pool club, tennis, golf, and winter ice rink unlocked" : level >= 2 ? "Adds golf and tennis activity" : "Organizes beach projects and improves math-to-bait rewards",
      unlock: () => true,
    },
    beachmarket: {
      name: "Beach Market & Restaurant",
      short: "Beach Market",
      artKey: "beachmarket",
      baseCost: 120,
      materials: { wood: 5, ore: 2 },
      description: "A beach stand that grows into a restaurant where fish, crab, kelp, shells, and crafted necklaces can be sold for shell coins.",
      effect: (level) => `+${level * 8}% shell value on every beach sale`,
      unlock: () => true,
    },
    icecream: {
      name: "Compo Ice Cream Shop",
      short: "Ice Cream Shop",
      artKey: "icecream",
      baseCost: 230,
      materials: { wood: 7, ore: 3 },
      description: "A cheerful seaside ice cream shop replacing the River Town bakery. It improves beach sale value as crowds arrive.",
      effect: (level) => `+${level * 10}% beach sale value`,
      unlock: (compo) => getCompoLevelInfo(compo.xp).level >= 2,
    },
    boat: {
      name: "Compo Fishing Boat",
      short: "Fishing Boat",
      artKey: "boat",
      baseCost: 280,
      materials: { wood: 9, ore: 4 },
      description: "A small launch that evolves into a stronger boat. Higher levels improve fishing yield and open deep-water catches.",
      effect: (level) => level >= 2 ? "Deep water unlocks; every catch gains extra yield" : "Fishing yield improves",
      unlock: (compo) => compo.buildings.beachmarket >= 1,
    },
  };

  const BEACH_HABITATS = {
    beachhouse: {
      name: "Beach House Rentals",
      artKey: "beachhouse",
      baseCost: 65,
      labels: ["Empty sand lot", "Tiny cottage", "Beach house", "Rental row"],
      feed: [{ seashell: 4 }, { kelp: 4, seashell: 5 }, { crab: 2, kelp: 3 }],
      effect: (level) => `${level} rental card${level === 1 ? "" : "s"} every 4 minutes`,
    },
    apartment: {
      name: "Beach Apartments",
      artKey: "apartment",
      baseCost: 160,
      labels: ["Empty duneside lot", "Small beach flat", "Apartment house", "Modern beach apartments"],
      feed: [{ crab: 3, kelp: 3 }, { fish: 3, seashell: 6 }, { deepfish: 1, crab: 3 }],
      effect: (level) => `${level} guest pass${level === 1 ? "" : "es"} every 6 minutes`,
    },
  };

  const BEACH_GOODS = [
    { id: "necklaces", name: "Shell Necklaces", value: 36, cost: { seashell: 8 } },
    { id: "rentals", name: "Beach Rental Cards", value: 10, habitat: "beachhouse" },
    { id: "passes", name: "Guest Passes", value: 22, habitat: "apartment" },
  ];

  const WESTPORT_ROADMAP = [
    { name: "River Town", detail: "Build the farm, habitats, school, market, bakery, and library", status: "active" },
    { name: "Compo Coast", detail: "A separate seaside map with Compo Beach, dog park, tennis club, and YMCA", status: "future" },
    { name: "Downtown & Flag Bridge", detail: "Saugatuck River, shops, Starbucks, Brandy Melville, and Spotted Horse", status: "future" },
    { name: "Schools District", detail: "Coleytown Elementary & Middle, Staples, and Westport’s Academy of Dance", status: "future" },
    { name: "Modern Westport", detail: "Modern library, full downtown, arts, dining, and community", status: "future" },
  ];

  const CHINESE = [
    { hanzi: "苹果", pinyin: "píng guǒ", answer: "apple", distractors: ["school", "friend", "book"] },
    { hanzi: "学校", pinyin: "xué xiào", answer: "school", distractors: ["market", "garden", "family"] },
    { hanzi: "朋友", pinyin: "péng you", answer: "friend", distractors: ["teacher", "apple", "morning"] },
    { hanzi: "谢谢", pinyin: "xiè xie", answer: "thank you", distractors: ["goodbye", "hello", "please"] },
    { hanzi: "早上好", pinyin: "zǎo shang hǎo", answer: "good morning", distractors: ["good night", "how are you", "see you"] },
    { hanzi: "水", pinyin: "shuǐ", answer: "water", distractors: ["rice", "milk", "tea"] },
    { hanzi: "书", pinyin: "shū", answer: "book", distractors: ["desk", "pen", "school"] },
    { hanzi: "家", pinyin: "jiā", answer: "home", distractors: ["town", "farm", "store"] },
    { hanzi: "一、二、三", pinyin: "yī, èr, sān", answer: "one, two, three", distractors: ["three, two, one", "four, five, six", "red, blue, green"] },
    { hanzi: "我喜欢苹果", pinyin: "wǒ xǐ huan píng guǒ", answer: "I like apples", distractors: ["I have apples", "I sell apples", "I see apples"] },
  ];

  const COMPO_CHINESE = [
    { hanzi: "海", pinyin: "hǎi", answer: "sea", distractors: ["mountain", "library", "cow"] },
    { hanzi: "鱼", pinyin: "yú", answer: "fish", distractors: ["apple", "school", "book"] },
    { hanzi: "船", pinyin: "chuán", answer: "boat", distractors: ["market", "pencil", "field"] },
    { hanzi: "贝壳", pinyin: "bèi ké", answer: "shell", distractors: ["milk", "road", "teacher"] },
    { hanzi: "螃蟹", pinyin: "páng xiè", answer: "crab", distractors: ["chicken", "flower", "map"] },
    { hanzi: "水草", pinyin: "shuǐ cǎo", answer: "water plants", distractors: ["ice cream", "tennis", "bridge"] },
    { hanzi: "海滩", pinyin: "hǎi tān", answer: "beach", distractors: ["farm", "desk", "train"] },
    { hanzi: "游泳", pinyin: "yóu yǒng", answer: "swim", distractors: ["read", "plant", "write"] },
    { hanzi: "我看见船", pinyin: "wǒ kàn jiàn chuán", answer: "I see a boat", distractors: ["I eat an apple", "I build a school", "I milk a cow"] },
    { hanzi: "海边有鱼", pinyin: "hǎi biān yǒu yú", answer: "There are fish by the sea", distractors: ["The farm has pumpkins", "The book is red", "The market is closed"] },
  ];

  const SOCIAL_LESSONS = [
    {
      id: "map-tools", skill: "Geography", tier: 1,
      passage: "Maps use tools to organize geographic information. A compass rose shows direction, a scale compares map distance with real distance, and a legend explains symbols. Latitude lines run east–west while longitude lines run north–south.",
      questions: [
        { prompt: "Which map tool explains what symbols mean?", answer: "The legend", distractors: ["The compass rose", "The scale", "The title"] },
        { prompt: "What does a map scale help a reader estimate?", answer: "Real-world distance", distractors: ["Population age", "Election results", "Daily temperature"] },
        { prompt: "Which lines run east–west around Earth?", answer: "Latitude lines", distractors: ["Longitude lines", "Town borders", "Time zones only"] },
      ],
    },
    {
      id: "connecticut-land", skill: "Connecticut Geography", tier: 1,
      passage: "Connecticut has a shoreline on Long Island Sound, wooded hills, river valleys, and many smaller streams. The Connecticut River flows south through the center of the state. Landforms and waterways influence where people build homes, roads, farms, and businesses.",
      questions: [
        { prompt: "What body of water borders Connecticut’s southern shoreline?", answer: "Long Island Sound", distractors: ["Lake Erie", "Chesapeake Bay", "The Gulf of Mexico"] },
        { prompt: "How can waterways influence communities?", answer: "They affect settlement, travel, and work", distractors: ["They erase all town borders", "They prevent farming everywhere", "They determine every state law"] },
        { prompt: "Where does the Connecticut River flow through the state?", answer: "Through the central part of Connecticut", distractors: ["Only along the western border", "Only under Long Island Sound", "Across northern Maine"] },
      ],
    },
    {
      id: "indigenous-connecticut", skill: "Indigenous History", tier: 1,
      passage: "Indigenous peoples lived in the region now called Connecticut for thousands of years before European colonization. Nations including the Pequot, Mohegan, and Paugussett built communities with distinct governments and traditions. They used forests, rivers, and coastal waters for food, travel, trade, and materials.",
      questions: [
        { prompt: "Which statement best describes Indigenous Connecticut?", answer: "Several distinct nations lived in the region", distractors: ["Only one family lived in the region", "No communities existed near rivers", "Every nation had identical traditions"] },
        { prompt: "How did waterways support Indigenous communities?", answer: "They provided food, travel, and trade routes", distractors: ["They stopped all movement", "They replaced every forest resource", "They served only as town borders"] },
        { prompt: "Which is one Indigenous nation named in the passage?", answer: "Paugussett", distractors: ["Roman", "Viking", "Spartan"] },
      ],
    },
    {
      id: "river-settlement", skill: "Settlement", tier: 1,
      passage: "Many early towns developed near rivers and harbors. Waterways supplied drinking water, supported fishing, moved people and goods, and later powered mills. Communities also needed safe building land, nearby resources, and routes to other settlements.",
      questions: [
        { prompt: "Why did rivers attract early settlements?", answer: "They supplied water, travel, food, and power", distractors: ["They guaranteed perfect weather", "They removed the need for roads", "They made all land flat"] },
        { prompt: "What later used moving river water for power?", answer: "Mills", distractors: ["Satellites", "Airports", "Subways"] },
        { prompt: "Besides water, what did communities need?", answer: "Land, resources, and travel routes", distractors: ["A national capital", "A desert", "An ocean on every side"] },
      ],
    },
    {
      id: "town-government", skill: "Local Government", tier: 1,
      passage: "Local government handles community needs such as roads, parks, schools, fire protection, and libraries. At a town meeting, residents can learn about proposals, express views, and sometimes vote on local decisions. Local officials must follow state and federal laws.",
      questions: [
        { prompt: "Which service is commonly managed by local government?", answer: "Parks and local roads", distractors: ["Printing national money", "Commanding the armed forces", "Negotiating treaties"] },
        { prompt: "What can residents do at a town meeting?", answer: "Discuss and sometimes vote on local issues", distractors: ["Rewrite the U.S. Constitution alone", "Choose another country’s leader", "Cancel every state law"] },
        { prompt: "Must local officials follow higher levels of law?", answer: "Yes, they follow state and federal law", distractors: ["No, towns are independent countries", "Only during elections", "Only when building parks"] },
      ],
    },
    {
      id: "three-branches", skill: "Civics", tier: 1,
      passage: "The U.S. government has three branches. The legislative branch makes laws, the executive branch carries them out, and the judicial branch interprets them. Dividing responsibilities helps prevent one group from controlling every government power.",
      questions: [
        { prompt: "Which branch makes laws?", answer: "Legislative", distractors: ["Executive", "Judicial", "Municipal"] },
        { prompt: "Which branch interprets laws?", answer: "Judicial", distractors: ["Legislative", "Executive", "Commercial"] },
        { prompt: "Why are powers divided among branches?", answer: "To prevent one group from controlling everything", distractors: ["To eliminate elections", "To make laws secret", "To give towns their own currency"] },
      ],
    },
    {
      id: "citizenship", skill: "Citizenship", tier: 1,
      passage: "Citizens strengthen a democracy by learning about issues, voting when eligible, following laws, serving on juries when called, and helping their communities. People can also contact officials, attend meetings, and speak respectfully about public decisions. Rights come with responsibilities toward other people.",
      questions: [
        { prompt: "Which action shows responsible citizenship?", answer: "Learning about issues and participating", distractors: ["Ignoring every local decision", "Preventing others from speaking", "Refusing to follow any law"] },
        { prompt: "How can a person share a view with government?", answer: "Contact officials or attend a meeting", distractors: ["Change the law secretly", "Print a private ballot", "Close the courthouse"] },
        { prompt: "What relationship does the passage describe?", answer: "Rights come with responsibilities", distractors: ["Rights remove every duty", "Only officials have rights", "Responsibilities replace rights"] },
      ],
    },
    {
      id: "constitution", skill: "U.S. Government", tier: 1,
      passage: "The U.S. Constitution is the highest law of the nation. It describes the structure and powers of the federal government and begins with the words ‘We the People.’ Amendments can change or add to the Constitution.",
      questions: [
        { prompt: "Which document begins with ‘We the People’?", answer: "The U.S. Constitution", distractors: ["The Gettysburg Address", "A town budget", "The Declaration of Sentiments"] },
        { prompt: "What does the Constitution describe?", answer: "The structure and powers of the federal government", distractors: ["Only local school schedules", "The weather in each state", "Prices for farm crops"] },
        { prompt: "What can change or add to the Constitution?", answer: "Amendments", distractors: ["Map legends", "Town parks", "Weather reports"] },
      ],
    },
    {
      id: "bill-of-rights", skill: "Rights and Liberties", tier: 1,
      passage: "The first ten amendments to the Constitution are called the Bill of Rights. They protect liberties such as freedom of speech and religion and include protections for people accused of crimes. These freedoms still have legal limits when actions harm others or violate laws.",
      questions: [
        { prompt: "What is the Bill of Rights?", answer: "The first ten constitutional amendments", distractors: ["All laws passed each year", "A list of state capitals", "The first ten presidents"] },
        { prompt: "Which liberty is protected in the Bill of Rights?", answer: "Freedom of speech", distractors: ["Freedom to ignore every law", "Freedom to control elections", "Freedom to take property"] },
        { prompt: "Are constitutional freedoms completely unlimited?", answer: "No, laws can set limits that protect others", distractors: ["Yes, every action is protected", "Only children have limits", "Only towns can set limits"] },
      ],
    },
    {
      id: "sources", skill: "Historical Thinking", tier: 1,
      passage: "Historians use evidence to study the past. A primary source was created during the time being studied, such as a letter, tool, photograph, or diary. A secondary source is a later explanation that uses and interprets evidence from primary sources.",
      questions: [
        { prompt: "Which item is usually a primary source?", answer: "A diary written during the event", distractors: ["A modern textbook chapter", "A later documentary summary", "A current encyclopedia article"] },
        { prompt: "What does a secondary source do?", answer: "It explains the past using evidence", distractors: ["It must be created during the event", "It cannot mention primary sources", "It predicts future weather"] },
        { prompt: "Why do historians compare sources?", answer: "To evaluate evidence and viewpoints", distractors: ["To make every account identical", "To remove all dates", "To avoid asking questions"] },
      ],
    },
    {
      id: "needs-wants-trade", skill: "Economics", tier: 1,
      passage: "People have needs, such as food and shelter, and wants, such as optional goods or entertainment. Because resources are limited, families and communities make choices about how to use money, time, land, and materials. Trade lets people exchange goods and services they have for things they value.",
      questions: [
        { prompt: "Why must people make economic choices?", answer: "Resources are limited", distractors: ["Every good is free", "Time never matters", "Trade is forbidden"] },
        { prompt: "Which is generally a need?", answer: "Basic shelter", distractors: ["A second game console", "A collectible poster", "An optional concert ticket"] },
        { prompt: "What does trade allow?", answer: "Exchange of goods and services", distractors: ["Unlimited resources", "The end of all work", "One person to make every product"] },
      ],
    },
    {
      id: "community-change", skill: "Change Over Time", tier: 1,
      passage: "Communities change as population, transportation, technology, and local needs change. A farming area may later add shops, schools, roads, parks, and public services. Studying maps and photographs from different years helps reveal what changed and what remained.",
      questions: [
        { prompt: "What can cause a community to change?", answer: "Population, transportation, technology, and needs", distractors: ["Only the day of the week", "Only the town’s name", "Nothing; communities never change"] },
        { prompt: "What evidence can show change over time?", answer: "Maps and photographs from different years", distractors: ["One unlabeled drawing", "A future weather guess", "A single math equation"] },
        { prompt: "What might a farming area add as it grows?", answer: "Shops, schools, roads, and parks", distractors: ["A border around every field", "A new continent", "No public services"] },
      ],
    },
    {
      id: "checks-balances", skill: "Constitution", tier: 2,
      passage: "Checks and balances allow each federal branch to limit certain actions of the others. For example, a president may veto a bill, Congress may override a veto with enough votes, and courts may review whether laws follow the Constitution. The system requires branches to share power.",
      questions: [
        { prompt: "What is the purpose of checks and balances?", answer: "To keep one branch from gaining too much power", distractors: ["To eliminate courts", "To end elections", "To let one branch control all laws"] },
        { prompt: "What may a president do to a bill?", answer: "Veto it", distractors: ["Declare it a state", "Turn it into money", "Make it a court"] },
        { prompt: "What may courts review?", answer: "Whether laws follow the Constitution", distractors: ["Every family budget", "Local weather forecasts", "Prices in every store"] },
      ],
    },
    {
      id: "federalism", skill: "Federalism", tier: 2,
      passage: "Federalism divides power between the national government and state governments. The national government handles responsibilities such as national defense and relations with other countries. States manage many matters closer to residents, including much of education, transportation, and public safety.",
      questions: [
        { prompt: "What does federalism divide?", answer: "Power between national and state governments", distractors: ["Land between farms only", "Courts into political parties", "Money between private stores"] },
        { prompt: "Which is mainly a national responsibility?", answer: "National defense", distractors: ["A town playground", "A local library schedule", "A neighborhood sidewalk"] },
        { prompt: "Which area is often managed largely by states?", answer: "Education", distractors: ["Relations with foreign countries", "Declaring national war", "Printing national currency"] },
      ],
    },
    {
      id: "industrial-change", skill: "Economic History", tier: 2,
      passage: "During industrialization, machines and factories changed how many goods were produced. Connecticut’s rivers, skilled workers, roads, canals, and railroads helped manufacturing grow. Factory growth created jobs and products but also brought crowded cities, pollution, and difficult working conditions.",
      questions: [
        { prompt: "What changed production during industrialization?", answer: "Machines and factories", distractors: ["Only hand copying", "The end of transportation", "A ban on tools"] },
        { prompt: "What helped manufacturing grow?", answer: "Power, workers, and transportation networks", distractors: ["Fewer routes and no workers", "Only distant deserts", "The removal of every machine"] },
        { prompt: "Which was a challenge of factory growth?", answer: "Pollution and difficult working conditions", distractors: ["No goods were produced", "Every city became empty", "Transportation disappeared"] },
      ],
    },
    {
      id: "population-density", skill: "Human Geography", tier: 2,
      passage: "Population density describes how many people live within a certain area. A dense town center may support frequent buses, apartments, and nearby shops, while a less dense rural area may have farms and longer travel distances. Density affects planning but does not by itself describe people’s culture or quality of life.",
      questions: [
        { prompt: "What does population density measure?", answer: "People living in a given area", distractors: ["Average yearly rainfall", "Number of state laws", "Distance between rivers"] },
        { prompt: "What might a dense town center support?", answer: "Frequent transit and nearby shops", distractors: ["Only large farms", "No roads or services", "Long distances between every home"] },
        { prompt: "Does density alone describe a community’s culture?", answer: "No", distractors: ["Yes, completely", "Only in rural areas", "Only during elections"] },
      ],
    },
    {
      id: "supply-demand", skill: "Economics", tier: 2,
      passage: "Supply is the amount of a good producers are willing to sell, while demand is the amount consumers are willing to buy. If demand rises while supply stays limited, prices often rise. Competition and changes in production can also affect prices and choices.",
      questions: [
        { prompt: "What is demand?", answer: "The amount consumers are willing to buy", distractors: ["The amount of yearly rainfall", "The number of laws", "The distance goods travel"] },
        { prompt: "What often happens when demand rises but supply stays limited?", answer: "Prices rise", distractors: ["Prices always become zero", "Every producer closes", "Money stops being used"] },
        { prompt: "What else can affect prices?", answer: "Competition and production changes", distractors: ["Map directions only", "The three branches only", "Latitude alone"] },
      ],
    },
    {
      id: "conservation", skill: "Environment and Civics", tier: 2,
      passage: "Communities make choices about protecting water, open space, wildlife, and historic places. Conservation can include reducing pollution, preserving habitats, maintaining parks, and planning development carefully. Citizens, governments, businesses, and nonprofit groups may all take part.",
      questions: [
        { prompt: "Which action supports conservation?", answer: "Preserving habitats and reducing pollution", distractors: ["Removing every park", "Dumping waste into rivers", "Ignoring development plans"] },
        { prompt: "Who may participate in conservation?", answer: "Citizens, governments, businesses, and groups", distractors: ["Only national leaders", "Only children", "No community members"] },
        { prompt: "Why plan development carefully?", answer: "To balance growth with community resources", distractors: ["To prevent every new idea", "To eliminate local government", "To remove all historic places"] },
      ],
    },
    {
      id: "civic-evidence", skill: "Civic Reasoning", tier: 2,
      passage: "Good civic decisions use evidence from more than one source. Residents might compare budgets, maps, expert reports, public comments, and possible effects on different groups. A strong claim explains its reasoning and recognizes that another viewpoint may exist.",
      questions: [
        { prompt: "What should support a strong civic decision?", answer: "Evidence from multiple sources", distractors: ["One rumor", "The loudest voice only", "No information"] },
        { prompt: "Why compare effects on different groups?", answer: "A decision may affect people differently", distractors: ["Every group is identical", "Budgets never matter", "Maps contain opinions only"] },
        { prompt: "What does a strong claim explain?", answer: "Its evidence and reasoning", distractors: ["Why evidence is unnecessary", "How to avoid all viewpoints", "Only the speaker’s name"] },
      ],
    },
  ];

  const COMPO_SOCIAL_LESSONS = [
    {
      id: "compo-sound-geography", skill: "Coastal Geography", tier: 1,
      passage: "Compo Beach sits on Long Island Sound, a sheltered body of salt water between Connecticut and Long Island. The Sound connects to the Atlantic Ocean, but its protected shape makes the water calmer than an open ocean beach. Coastal communities use maps, tide charts, and landmarks to plan swimming, boating, fishing, and shoreline protection.",
      questions: [
        { prompt: "What body of water is connected to Compo Beach?", answer: "Long Island Sound", distractors: ["Lake Erie", "The Pacific Ocean", "The Mississippi River"] },
        { prompt: "Why is Long Island Sound often calmer than the open ocean?", answer: "It is sheltered by Long Island", distractors: ["It is a freshwater lake", "It has no tides", "It is underground"] },
        { prompt: "Which tool can help a coastal community plan safe water activities?", answer: "A tide chart", distractors: ["A grocery receipt", "A spelling list", "A desert map"] },
      ],
    },
    {
      id: "compo-tides-habitats", skill: "Human-Environment Interaction", tier: 1,
      passage: "Tides are the regular rise and fall of ocean water caused mainly by the moon's gravity. The intertidal zone is the shore area covered by water at high tide and exposed at low tide. Shells, seaweed, crabs, small fish, and birds can all be part of this changing habitat, so visitors should observe carefully and avoid damaging living things.",
      questions: [
        { prompt: "What causes much of the regular rise and fall of tides?", answer: "The moon's gravity", distractors: ["Streetlights", "School bells", "Library books"] },
        { prompt: "What is the intertidal zone?", answer: "Shore covered at high tide and exposed at low tide", distractors: ["A mountain forest", "A town hall room", "A highway tunnel"] },
        { prompt: "Why should visitors be careful in tide pools?", answer: "Living things may be part of the habitat", distractors: ["All shells are made of plastic", "No animals live near shore", "Tides stop at noon"] },
      ],
    },
    {
      id: "compo-local-economy", skill: "Local Economics", tier: 1,
      passage: "A beach economy can include fishing, shell crafts, restaurants, rentals, lessons, and recreation. Businesses earn money when visitors buy goods or services, but they also depend on clean water, safe paths, and community rules. A strong local economy balances earning income with protecting the shared place people came to enjoy.",
      questions: [
        { prompt: "Which activity could be part of a beach economy?", answer: "Renting beach equipment", distractors: ["Mining coal in a desert", "Growing apples in a library", "Launching rockets from a classroom"] },
        { prompt: "What do beach businesses depend on besides customers?", answer: "Clean water, safety, and community rules", distractors: ["No public paths", "Unlimited pollution", "Closed beaches every day"] },
        { prompt: "What does a balanced local economy protect?", answer: "The shared place people enjoy", distractors: ["Only one private basket", "Every tide from changing", "All maps from being used"] },
      ],
    },
    {
      id: "compo-boating-safety", skill: "Civics and Safety", tier: 2,
      passage: "Boating adds new opportunities, but it also adds responsibility. Safe boaters watch weather, understand markers, keep life jackets available, and respect swimming areas. Towns may set rules for docks, speed, and protected zones so that fishing, swimming, wildlife, and recreation can share the same water.",
      questions: [
        { prompt: "Which item should safe boaters keep available?", answer: "Life jackets", distractors: ["Farm seeds", "Library cards", "Snow shovels only"] },
        { prompt: "Why might a town set boating rules?", answer: "So different water uses can share space safely", distractors: ["To stop all recreation forever", "To make weather disappear", "To remove every marker"] },
        { prompt: "What should boaters watch before going out?", answer: "Weather", distractors: ["Only shoe size", "Only a spelling score", "Only crop prices"] },
      ],
    },
    {
      id: "compo-conservation", skill: "Environmental Civics", tier: 2,
      passage: "Coastal conservation protects water quality, dunes, plants, wildlife, and public access. People can help by carrying out trash, staying on paths, respecting posted habitat areas, and supporting projects that reduce runoff. Conservation is a civic choice because many people share the same beach and future visitors depend on today's decisions.",
      questions: [
        { prompt: "Which action supports coastal conservation?", answer: "Carry out trash and stay on paths", distractors: ["Leave litter in dunes", "Ignore habitat signs", "Pour waste into storm drains"] },
        { prompt: "Why is beach conservation a civic choice?", answer: "Many people share the same beach", distractors: ["Only one person owns every wave", "No future visitors exist", "Water quality never changes"] },
        { prompt: "What can runoff affect?", answer: "Water quality", distractors: ["The alphabet", "The moon's shape", "A pencil's color"] },
      ],
    },
    {
      id: "compo-community-planning", skill: "Change Over Time", tier: 2,
      passage: "Community places change as needs change. A simple beach pavilion might later add a restaurant, boats, sports courts, a pool, winter skating, and nearby homes. Planners compare costs, environmental effects, access, and public benefits before deciding how a shared place should grow.",
      questions: [
        { prompt: "What can cause a community beach area to change?", answer: "Changing community needs", distractors: ["Only the color of sand", "A ban on planning", "No public choices"] },
        { prompt: "What should planners compare before building?", answer: "Costs, effects, access, and public benefits", distractors: ["Only one person's favorite snack", "Only the tallest tree", "Only yesterday's tide"] },
        { prompt: "Which feature could show a beach area becoming more modern?", answer: "Sports courts or a pool", distractors: ["A hidden desert", "No safe paths", "A closed map"] },
      ],
    },
  ];

  const dom = {
    app: document.getElementById("app"),
    coinLabel: document.getElementById("coin-label"),
    coinCount: document.getElementById("coin-count"),
    seedLabel: document.getElementById("seed-label"),
    seedCount: document.getElementById("seed-count"),
    woodLabel: document.getElementById("wood-label"),
    woodCount: document.getElementById("wood-count"),
    oreLabel: document.getElementById("ore-label"),
    oreCount: document.getElementById("ore-count"),
    farmNavLabel: document.getElementById("farm-nav-label"),
    marketNavLabel: document.getElementById("market-nav-label"),
    goalsNavLabel: document.getElementById("goals-nav-label"),
    levelName: document.getElementById("level-name"),
    levelLabel: document.getElementById("level-label"),
    levelProgress: document.getElementById("level-progress"),
    worldArt: document.getElementById("world-art"),
    wildlifeLayer: document.getElementById("wildlife-layer"),
    worldCrops: document.getElementById("world-crops"),
    beachWorld: document.getElementById("beach-world"),
    layoutButton: document.getElementById("layout-button"),
    layoutHint: document.getElementById("layout-hint"),
    regionButtons: Array.from(document.querySelectorAll("[data-region]")),
    chickenLevelMap: document.getElementById("chicken-level-map"),
    cowLevelMap: document.getElementById("cow-level-map"),
    farmField: document.getElementById("farm-field"),
    farmRegionLabel: document.getElementById("farm-region-label"),
    farmTitle: document.getElementById("farm-title"),
    farmCopy: document.getElementById("farm-copy"),
    seedDrawer: document.getElementById("seed-drawer"),
    seedTitle: document.getElementById("seed-title"),
    seedList: document.getElementById("seed-list"),
    seedClose: document.getElementById("seed-close"),
    focusBoost: document.getElementById("focus-boost"),
    boostLabel: document.getElementById("boost-label"),
    lessonCard: document.querySelector(".lesson-card"),
    questionSkill: document.getElementById("question-skill"),
    questionReward: document.getElementById("question-reward"),
    lessonPassage: document.getElementById("lesson-passage"),
    lessonPassageText: document.getElementById("lesson-passage-text"),
    questionPrompt: document.getElementById("question-prompt"),
    questionHint: document.getElementById("question-hint"),
    answerGrid: document.getElementById("answer-grid"),
    lessonFeedback: document.getElementById("lesson-feedback"),
    whiteboardToggle: document.getElementById("whiteboard-toggle"),
    whiteboardPen: document.getElementById("whiteboard-pen"),
    whiteboardEraser: document.getElementById("whiteboard-eraser"),
    whiteboardClear: document.getElementById("whiteboard-clear"),
    workBoard: document.getElementById("work-board"),
    whiteboardCanvas: document.getElementById("whiteboard-canvas"),
    streakCount: document.getElementById("streak-count"),
    lessonProgressBar: document.getElementById("lesson-progress-bar"),
    lessonProgressLabel: document.getElementById("lesson-progress-label"),
    learnRegionLabel: document.getElementById("learn-region-label"),
    learnCopy: document.getElementById("learn-copy"),
    rewardCopy: document.getElementById("reward-copy"),
    rewardResourceList: document.getElementById("reward-resource-list"),
    learnReadyDot: document.getElementById("learn-ready-dot"),
    marketList: document.getElementById("market-list"),
    marketRegionLabel: document.getElementById("market-region-label"),
    marketTitle: document.getElementById("market-title"),
    marketCopy: document.getElementById("market-copy"),
    basketValue: document.getElementById("basket-value"),
    basketCopy: document.getElementById("basket-copy"),
    sellAll: document.getElementById("sell-all-button"),
    projectList: document.getElementById("project-list"),
    goalsRegionLabel: document.getElementById("goals-region-label"),
    goalsTitle: document.getElementById("goals-title"),
    goalsCopy: document.getElementById("goals-copy"),
    milestoneName: document.getElementById("milestone-name"),
    milestoneCopy: document.getElementById("milestone-copy"),
    milestoneProgress: document.getElementById("milestone-progress"),
    milestoneLabel: document.getElementById("milestone-label"),
    buildingModal: document.getElementById("building-modal"),
    buildingModalContent: document.getElementById("building-modal-content"),
    settingsModal: document.getElementById("settings-modal"),
    settingsButton: document.getElementById("settings-button"),
    musicToggle: document.getElementById("music-toggle"),
    sfxToggle: document.getElementById("sfx-toggle"),
    motionToggle: document.getElementById("motion-toggle"),
    resetButton: document.getElementById("reset-button"),
    music: document.getElementById("music-player"),
    welcomeModal: document.getElementById("welcome-modal"),
    startButton: document.getElementById("start-button"),
    toastRegion: document.getElementById("toast-region"),
  };

  let selectedPlot = null;
  let lastTick = Date.now();
  let audioContext = null;
  let pendingTimers = [];
  let layoutMode = false;
  let layoutDrag = null;
  let whiteboardDrawing = null;
  let whiteboardTool = "pen";
  let wildlifeTimer = null;
  const walkerTimers = new Map();
  const beachWalkerTimers = new Map();
  const WALK_PATH = [
    { x: 2, y: 33, links: [1] },
    { x: 4, y: 39, links: [0, 2] },
    { x: 3, y: 44, links: [1, 3] },
    { x: 8, y: 49, links: [2, 4] },
    { x: 18, y: 52, links: [3, 5] },
    { x: 30, y: 55, links: [4, 6, 14] },
    { x: 43, y: 55, links: [5, 7, 15] },
    { x: 52, y: 53, links: [6, 8] },
    { x: 59, y: 51, links: [7, 9] },
    { x: 66, y: 50, links: [8, 10] },
    { x: 74, y: 45, links: [9, 11] },
    { x: 80, y: 39, links: [10, 12] },
    { x: 82, y: 33, links: [11, 13] },
    { x: 88, y: 28, links: [12] },
    { x: 34, y: 47, links: [5, 15] },
    { x: 43, y: 44, links: [14, 6] },
  ];

  const BEACH_PATH = [
    { x: 7, y: 60, links: [1] },
    { x: 15, y: 58, links: [0, 2, 11] },
    { x: 24, y: 57, links: [1, 3, 12] },
    { x: 34, y: 56, links: [2, 4, 13] },
    { x: 44, y: 55, links: [3, 5, 14] },
    { x: 54, y: 53, links: [4, 6, 15] },
    { x: 64, y: 51, links: [5, 7, 16] },
    { x: 74, y: 49, links: [6, 8] },
    { x: 84, y: 47, links: [7] },
    { x: 20, y: 39, links: [10, 11] },
    { x: 33, y: 36, links: [9, 12] },
    { x: 15, y: 47, links: [1, 9] },
    { x: 28, y: 46, links: [2, 10, 13] },
    { x: 42, y: 44, links: [3, 12, 14] },
    { x: 54, y: 42, links: [4, 13, 15] },
    { x: 64, y: 40, links: [5, 14, 16] },
    { x: 75, y: 39, links: [6, 15] },
  ];

  function createCompoState() {
    return {
      shells: 25,
      bait: 3,
      wood: 0,
      ore: 0,
      xp: 0,
      inventory: { fish: 0, crab: 0, kelp: 0, seashell: 0, deepfish: 0 },
      goods: { necklaces: 0, rentals: 0, passes: 0 },
      productionProgress: { beachhouse: 0, apartment: 0 },
      spots: [null, { locked: true }, { locked: true }, { locked: true }],
      buildings: { towncenter: 0, beachmarket: 0, icecream: 0, boat: 0 },
      construction: {},
      habitats: { beachhouse: 0, apartment: 0 },
      habitatGrowth: {},
      layout: {
        spots: [{ x: 11, y: 66 }, { x: 27, y: 64 }, { x: 43, y: 62 }, { x: 59, y: 59 }],
        buildings: { towncenter: { x: 46, y: 27 }, beachmarket: { x: 62, y: 40 }, icecream: { x: 75, y: 50 }, boat: { x: 28, y: 47 } },
        habitats: { beachhouse: { x: 12, y: 36 }, apartment: { x: 32, y: 31 } },
      },
    };
  }

  function initialState() {
    const now = Date.now();
    dom.farmField.classList.remove("beach-field");
    return {
      version: 8,
      coins: 35,
      seeds: 3,
      wood: 0,
      ore: 0,
      xp: 0,
      inventory: { carrot: 0, wheat: 0, strawberry: 0, pumpkin: 0, blueberry: 0, apple: 0 },
      goods: { eggs: 0, milk: 0 },
      productionProgress: { chickens: 0, cows: 0 },
      plots: [
        null,
        { locked: true }, { locked: true }, { locked: true }, { locked: true }, { locked: true },
      ],
      buildings: { school: 0, market: 0, bakery: 0, library: 0 },
      construction: {},
      animals: { chickens: 0, cows: 0 },
      animalGrowth: {},
      districts: { compo: true },
      activeRegion: "coleytown",
      compo: createCompoState(),
      layout: {
        buildings: { school: { x: 42, y: 16 }, market: { x: 49, y: 48 }, bakery: { x: 68, y: 53 }, library: { x: 60, y: 18 } },
        animals: { chickens: { x: 8, y: 28 }, cows: { x: 23, y: 25 } },
        plots: [{ x: 7, y: 68 }, { x: 18, y: 69 }, { x: 29, y: 68 }, { x: 40, y: 69 }, { x: 13, y: 52 }, { x: 28, y: 51 }],
      },
      stats: { planted: 0, harvested: 0, sold: 0, earned: 0, answered: 0, correct: 0, chineseCorrect: 0, socialCorrect: 0 },
      subject: "math",
      recentSocial: [],
      recentCompoSocial: [],
      streak: 0,
      lessonStep: 0,
      boostUntil: 0,
      seasonAnchor: initialSeasonAnchor(now),
      lastSeen: now,
      welcomed: false,
      settings: { music: false, sfx: true, reduceMotion: false },
      question: null,
    };
  }

  let loadedSaveKey = SAVE_KEY;

  function readSavedState() {
    for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          loadedSaveKey = key;
          return saved;
        }
      } catch (error) {
        console.warn(`Idle Town could not read save slot ${key}`, error);
      }
    }
    return null;
  }

  function migrateConstruction(savedConstruction = {}) {
    const now = Date.now();
    return Object.fromEntries(Object.entries(savedConstruction).map(([id, build]) => {
      if (Number.isInteger(build?.phase)) {
        return [id, { ...build, phaseReadyAt: Number(build.phaseReadyAt) || now }];
      }
      // v5–v7 used one fully-paid timer. Preserve that purchase and let it
      // finish rather than asking the player to pay for migrated work again.
      return [id, { targetLevel: Number(build?.targetLevel) || 1, phase: 2, phaseReadyAt: Number(build?.completeAt) || now }];
    }));
  }

  function normalizeCompo(savedCompo = {}) {
    const fresh = createCompoState();
    const saved = savedCompo && typeof savedCompo === "object" ? savedCompo : {};
    const merged = {
      ...fresh,
      ...saved,
      shells: Number.isFinite(saved.shells) ? saved.shells : fresh.shells,
      bait: Number.isFinite(saved.bait) ? saved.bait : fresh.bait,
      wood: Number.isFinite(saved.wood) ? saved.wood : fresh.wood,
      ore: Number.isFinite(saved.ore) ? saved.ore : fresh.ore,
      xp: Number.isFinite(saved.xp) ? saved.xp : fresh.xp,
      inventory: { ...fresh.inventory, ...(saved.inventory || {}) },
      goods: { ...fresh.goods, ...(saved.goods || {}) },
      productionProgress: { ...fresh.productionProgress, ...(saved.productionProgress || {}) },
      spots: Array.isArray(saved.spots) ? saved.spots.slice(0, fresh.spots.length) : fresh.spots,
      buildings: { ...fresh.buildings, ...(saved.buildings || {}) },
      construction: migrateConstruction(saved.construction),
      habitats: { ...fresh.habitats, ...(saved.habitats || {}) },
      habitatGrowth: { ...fresh.habitatGrowth, ...(saved.habitatGrowth || {}) },
      layout: {
        spots: Array.isArray(saved.layout?.spots) ? saved.layout.spots : fresh.layout.spots,
        buildings: { ...fresh.layout.buildings, ...(saved.layout?.buildings || {}) },
        habitats: { ...fresh.layout.habitats, ...(saved.layout?.habitats || {}) },
      },
    };
    while (merged.spots.length < fresh.spots.length) merged.spots.push({ locked: true });
    merged.spots[0] = merged.spots[0]?.locked ? null : merged.spots[0];
    return merged;
  }

  function loadState() {
    const fresh = initialState();
    const saved = readSavedState();
    if (!saved) return fresh;
    try {
      const merged = {
        ...fresh,
        ...saved,
        version: fresh.version,
        inventory: { ...fresh.inventory, ...(saved.inventory || {}) },
        goods: { ...fresh.goods, ...(saved.goods || {}) },
        productionProgress: { ...fresh.productionProgress, ...(saved.productionProgress || {}) },
        buildings: { ...fresh.buildings, ...(saved.buildings || {}) },
        construction: migrateConstruction(saved.construction),
        animals: { ...fresh.animals, ...(saved.animals || {}) },
        animalGrowth: { ...fresh.animalGrowth, ...(saved.animalGrowth || {}) },
        districts: { ...fresh.districts, ...(saved.districts || {}), compo: true },
        compo: normalizeCompo(saved.compo),
        layout: {
          buildings: { ...fresh.layout.buildings, ...(saved.layout?.buildings || {}) },
          animals: { ...fresh.layout.animals, ...(saved.layout?.animals || {}) },
          plots: Array.isArray(saved.layout?.plots) ? saved.layout.plots : fresh.layout.plots,
        },
        stats: { ...fresh.stats, ...(saved.stats || {}) },
        settings: { ...fresh.settings, ...(saved.settings || {}) },
        plots: Array.isArray(saved.plots) ? saved.plots.slice(0, 6) : fresh.plots,
        recentSocial: Array.isArray(saved.recentSocial) ? saved.recentSocial.slice(-8) : fresh.recentSocial,
        recentCompoSocial: Array.isArray(saved.recentCompoSocial) ? saved.recentCompoSocial.slice(-8) : fresh.recentCompoSocial,
      };
      const savedMarketPosition = saved.layout?.buildings?.market;
      if (savedMarketPosition?.x === 54 && savedMarketPosition?.y === 53) {
        merged.layout.buildings.market = { x: 49, y: 48 };
      }
      while (merged.plots.length < 6) merged.plots.push(null);
      applyOfflineProgress(merged);
      return merged;
    } catch (error) {
      console.warn("Idle Town save could not be loaded", error);
      loadedSaveKey = SAVE_KEY;
      return fresh;
    }
  }

  const state = loadState();

  function saveState() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (error) { console.warn("Save failed", error); }
  }

  if (loadedSaveKey !== SAVE_KEY) saveState();

  function applyOfflineProgress(target) {
    const now = Date.now();
    const awayStarted = target.lastSeen || now;
    const actualElapsed = Math.max(0, now - awayStarted);
    if (actualElapsed < 5_000) return;
    const productionElapsed = Math.min(MAX_OFFLINE_MS, actualElapsed);
    const report = {
      elapsed: actualElapsed,
      productionElapsed,
      cropsReady: target.plots.filter((plot) => plot?.crop && plot.readyAt > awayStarted && plot.readyAt <= now).length,
      buildingsCompleted: [],
      stagesReady: [],
      animalsGrown: [],
      goods: { eggs: 0, milk: 0 },
      beachReady: 0,
      beachBuildingsCompleted: [],
      beachStagesReady: [],
      beachHabitatsGrown: [],
      beachGoods: { rentals: 0, passes: 0 },
    };
    const produced = accrueAnimalGoods(target, productionElapsed / 1000 * OFFLINE_EFFICIENCY);
    report.goods.eggs += produced.eggs;
    report.goods.milk += produced.milk;
    const compo = target.compo || (target.compo = createCompoState());
    report.beachReady = compo.spots.filter((spot) => spot?.catchId && spot.readyAt > awayStarted && spot.readyAt <= now).length;
    const beachProduced = accrueBeachGoods(compo, productionElapsed / 1000 * OFFLINE_EFFICIENCY);
    report.beachGoods.rentals += beachProduced.rentals;
    report.beachGoods.passes += beachProduced.passes;

    Object.entries(target.animalGrowth || {}).forEach(([id, growth]) => {
      if (growth.completeAt > now) return;
      const priorLevel = target.animals[id] || 0;
      const extraSeconds = Math.min(MAX_OFFLINE_MS, Math.max(0, now - growth.completeAt)) / 1000 * OFFLINE_EFFICIENCY;
      const addedLevel = Math.max(0, growth.targetLevel - priorLevel);
      const good = id === "chickens" ? "eggs" : "milk";
      const bonus = accrueAnimalGood(target, id, good, extraSeconds, addedLevel);
      report.goods[good] += bonus;
      target.animals[id] = growth.targetLevel;
      target.xp += 20 + target.animals[id] * 6;
      report.animalsGrown.push(ANIMALS[id].labels[target.animals[id]]);
      delete target.animalGrowth[id];
    });

    Object.entries(target.construction || {}).forEach(([id, building]) => {
      if (building.phaseReadyAt > now) return;
      if (building.phase < 2) {
        report.stagesReady.push(BUILDINGS[id].short);
        return;
      }
      target.buildings[id] = building.targetLevel;
      target.xp += 50 + target.buildings[id] * 15;
      report.buildingsCompleted.push(BUILDINGS[id].short);
      delete target.construction[id];
    });

    Object.entries(compo.habitatGrowth || {}).forEach(([id, growth]) => {
      if (growth.completeAt > now) return;
      const priorLevel = compo.habitats[id] || 0;
      const extraSeconds = Math.min(MAX_OFFLINE_MS, Math.max(0, now - growth.completeAt)) / 1000 * OFFLINE_EFFICIENCY;
      const addedLevel = Math.max(0, growth.targetLevel - priorLevel);
      const good = id === "beachhouse" ? "rentals" : "passes";
      const bonus = accrueBeachGood(compo, id, good, extraSeconds, addedLevel);
      report.beachGoods[good] += bonus;
      compo.habitats[id] = growth.targetLevel;
      compo.xp += 20 + compo.habitats[id] * 6;
      report.beachHabitatsGrown.push(BEACH_HABITATS[id].labels[compo.habitats[id]]);
      delete compo.habitatGrowth[id];
    });

    Object.entries(compo.construction || {}).forEach(([id, building]) => {
      if (building.phaseReadyAt > now) return;
      if (building.phase < 2) {
        report.beachStagesReady.push(BEACH_BUILDINGS[id].short);
        return;
      }
      compo.buildings[id] = building.targetLevel;
      compo.xp += 50 + compo.buildings[id] * 15;
      report.beachBuildingsCompleted.push(BEACH_BUILDINGS[id].short);
      delete compo.construction[id];
    });

    const riverComplete = Object.values(target.buildings).every((level) => level >= MAX_BUILDING_LEVEL)
      && Object.values(target.animals).every((level) => level >= 3)
      && target.plots.every((plot) => !plot?.locked);
    if (riverComplete) target.districts.compo = true;
    target.offlineReport = report;
  }

  function accrueAnimalGood(target, animal, good, elapsedSeconds, level = target.animals[animal] || 0) {
    const rates = { chickens: 180, cows: 300 };
    if (!level || elapsedSeconds <= 0) return 0;
    target.productionProgress[animal] = (target.productionProgress[animal] || 0) + level * elapsedSeconds / rates[animal];
    const whole = Math.floor(target.productionProgress[animal]);
    if (!whole) return 0;
    const cap = good === "eggs" ? 30 : 18;
    const room = Math.max(0, cap - Math.floor(target.goods[good] || 0));
    const added = Math.min(whole, room);
    target.goods[good] = (target.goods[good] || 0) + added;
    target.productionProgress[animal] -= whole;
    return added;
  }

  function accrueAnimalGoods(target = state, elapsedSeconds = 0) {
    const produced = { eggs: 0, milk: 0 };
    [["chickens", "eggs"], ["cows", "milk"]].forEach(([animal, good]) => {
      produced[good] = accrueAnimalGood(target, animal, good, elapsedSeconds);
    });
    return produced;
  }

  function accrueBeachGood(compo, habitat, good, elapsedSeconds, level = compo.habitats[habitat] || 0) {
    const rates = { beachhouse: 240, apartment: 360 };
    if (!level || elapsedSeconds <= 0) return 0;
    compo.productionProgress[habitat] = (compo.productionProgress[habitat] || 0) + level * elapsedSeconds / rates[habitat];
    const whole = Math.floor(compo.productionProgress[habitat]);
    if (!whole) return 0;
    const cap = good === "rentals" ? 24 : 16;
    const room = Math.max(0, cap - Math.floor(compo.goods[good] || 0));
    const added = Math.min(whole, room);
    compo.goods[good] = (compo.goods[good] || 0) + added;
    compo.productionProgress[habitat] -= whole;
    return added;
  }

  function accrueBeachGoods(compo = getCompo(), elapsedSeconds = 0) {
    const produced = { rentals: 0, passes: 0 };
    [["beachhouse", "rentals"], ["apartment", "passes"]].forEach(([habitat, good]) => {
      produced[good] = accrueBeachGood(compo, habitat, good, elapsedSeconds);
    });
    return produced;
  }

  function showOfflineReport(delay = 300) {
    const report = state.offlineReport;
    if (!report) return;
    const updates = [];
    if (report.cropsReady) updates.push(`${report.cropsReady} ${report.cropsReady === 1 ? "crop is" : "crops are"} ready`);
    if (report.buildingsCompleted.length) updates.push(`${report.buildingsCompleted.join(" and ")} completed`);
    if (report.stagesReady.length) updates.push(`${report.stagesReady.join(" and ")} need the next supplies`);
    if (report.animalsGrown.length) updates.push(`${report.animalsGrown.join(" and ")} arrived`);
    if (report.goods.eggs) updates.push(`${report.goods.eggs} egg basket${report.goods.eggs === 1 ? "" : "s"}`);
    if (report.goods.milk) updates.push(`${report.goods.milk} milk jug${report.goods.milk === 1 ? "" : "s"}`);
    if (report.beachReady) updates.push(`${report.beachReady} beach catch${report.beachReady === 1 ? " is" : "es are"} ready`);
    if (report.beachBuildingsCompleted.length) updates.push(`${report.beachBuildingsCompleted.join(" and ")} completed at Compo`);
    if (report.beachStagesReady.length) updates.push(`${report.beachStagesReady.join(" and ")} need beach supplies`);
    if (report.beachHabitatsGrown.length) updates.push(`${report.beachHabitatsGrown.join(" and ")} opened at Compo`);
    if (report.beachGoods.rentals) updates.push(`${report.beachGoods.rentals} rental card${report.beachGoods.rentals === 1 ? "" : "s"}`);
    if (report.beachGoods.passes) updates.push(`${report.beachGoods.passes} guest pass${report.beachGoods.passes === 1 ? "" : "es"}`);
    const summary = updates.length ? updates.join(" · ") : "timers continued safely";
    window.setTimeout(() => toast(`Welcome back after ${formatAway(report.elapsed)} — ${summary}.`), delay);
    delete state.offlineReport;
    delete state.offlineGoods;
    delete state.offlineTime;
    saveState();
  }

  function resumeOfflineProgress() {
    applyOfflineProgress(state);
    lastTick = Date.now();
    finalizeProgress(lastTick);
    renderAll();
    showOfflineReport(100);
  }

  function initialSeasonAnchor(now = Date.now()) {
    const startIndex = SEASONS.findIndex((season) => season.id === START_SEASON);
    return now - Math.max(0, startIndex) * SEASON_LENGTH_MS;
  }

  function currentSeason(now = Date.now(), target = state) {
    const anchor = Number(target.seasonAnchor) || initialSeasonAnchor(now);
    const elapsed = Math.max(0, now - anchor);
    return SEASONS[Math.floor(elapsed / SEASON_LENGTH_MS) % SEASONS.length];
  }

  function nextSeason(now = Date.now(), target = state) {
    const anchor = Number(target.seasonAnchor) || initialSeasonAnchor(now);
    const elapsed = Math.max(0, now - anchor);
    const nextIndex = (Math.floor(elapsed / SEASON_LENGTH_MS) + 1) % SEASONS.length;
    const nextAt = anchor + (Math.floor(elapsed / SEASON_LENGTH_MS) + 1) * SEASON_LENGTH_MS;
    return { ...SEASONS[nextIndex], nextAt };
  }

  function cropAvailableInSeason(crop, season = currentSeason()) {
    return crop.seasons.includes(season.id);
  }

  function cropSeasonLabel(crop) {
    return crop.seasons.map((id) => SEASONS.find((season) => season.id === id)?.name || id).join(" / ");
  }

  function cropDuration(crop, season = currentSeason()) {
    return Math.round(crop.duration * (season.id === "winter" ? 1.5 : 1));
  }

  function getCrop(id) { return CROPS.find((crop) => crop.id === id); }

  function getBeachCatch(id) { return BEACH_CATCHES.find((item) => item.id === id); }

  function beachCatchAvailableInSeason(catchConfig, season = currentSeason()) {
    return catchConfig.seasons.includes(season.id);
  }

  function beachCatchSeasonLabel(catchConfig) {
    return catchConfig.seasons.map((id) => SEASONS.find((season) => season.id === id)?.name || id).join(" / ");
  }

  function beachCatchDuration(catchConfig, season = currentSeason()) {
    const boatLevel = getCompo().buildings.boat || 0;
    const boatBonus = boatLevel ? 0.94 - Math.min(0.12, boatLevel * 0.04) : 1;
    return Math.round(catchConfig.duration * (season.id === "winter" ? 1.35 : 1) * boatBonus);
  }

  function getLevelInfo(xp = state.xp) {
    let index = 0;
    for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].xp) index = i;
    const current = LEVELS[index];
    const next = LEVELS[Math.min(index + 1, LEVELS.length - 1)];
    const capped = index === LEVELS.length - 1;
    const progress = capped ? 1 : (xp - current.xp) / (next.xp - current.xp);
    return { level: index + 1, current, next, progress: clamp(progress, 0, 1), capped };
  }

  function getCompoLevelInfo(xp = state?.compo?.xp || 0) {
    let index = 0;
    for (let i = 0; i < COMPO_LEVELS.length; i += 1) if (xp >= COMPO_LEVELS[i].xp) index = i;
    const current = COMPO_LEVELS[index];
    const next = COMPO_LEVELS[Math.min(index + 1, COMPO_LEVELS.length - 1)];
    const capped = index === COMPO_LEVELS.length - 1;
    const progress = capped ? 1 : (xp - current.xp) / (next.xp - current.xp);
    return { level: index + 1, current, next, progress: clamp(progress, 0, 1), capped };
  }

  function getCompo() { return state.compo || (state.compo = createCompoState()); }

  function isCompoActive() { return state.activeRegion === "compo"; }

  function getTotalProduce() {
    return Object.values(state.inventory).reduce((sum, value) => sum + value, 0) + Object.values(state.goods).reduce((sum, value) => sum + Math.floor(value), 0);
  }

  function getTotalBeachProduce(compo = getCompo()) {
    return Object.values(compo.inventory).reduce((sum, value) => sum + value, 0) + Object.values(compo.goods).reduce((sum, value) => sum + Math.floor(value), 0);
  }

  function isBoostActive() { return Date.now() < state.boostUntil; }

  function marketMultiplier() {
    return (isBoostActive() ? 2 : 1) * (1 + state.buildings.market * 0.08 + state.buildings.bakery * 0.12);
  }

  function beachMarketMultiplier(compo = getCompo()) {
    return (isBoostActive() ? 2 : 1) * (1 + compo.buildings.beachmarket * 0.08 + compo.buildings.icecream * 0.1);
  }

  function learningReward() {
    if (isCompoActive()) {
      const compo = getCompo();
      if (state.subject === "math") {
        const amount = 2 + compo.buildings.towncenter + (state.streak >= 4 ? 1 : 0);
        return { scope: "compo", type: "bait", amount, label: `${amount} bait` };
      }
      if (state.subject === "chinese") {
        const amount = 2 + Math.floor(compo.buildings.boat / 2);
        return { scope: "compo", type: "wood", amount, label: `${amount} beach wood` };
      }
      const amount = 1 + Math.floor(compo.buildings.towncenter / 2);
      return { scope: "compo", type: "ore", amount, label: `${amount} beach ore` };
    }
    if (state.subject === "math") {
      const amount = 2 + state.buildings.school + (state.streak >= 4 ? 1 : 0);
      return { type: "seeds", amount, label: `${amount} ${amount === 1 ? "seed" : "seeds"}` };
    }
    if (state.subject === "chinese") {
      const amount = 2 + state.buildings.library;
      return { type: "wood", amount, label: `${amount} wood` };
    }
    const amount = 1 + Math.floor(state.buildings.school / 2);
    return { type: "ore", amount, label: `${amount} ore` };
  }

  function grantLearningReward(reward, amount = reward.amount) {
    if (reward.scope === "compo") {
      const compo = getCompo();
      compo[reward.type] += amount;
    } else {
      state[reward.type] += amount;
    }
  }

  function learningBoostLabel() {
    return isCompoActive() ? "2× beach market" : "2× market";
  }

  function buildingCost(id, targetLevel = state.buildings[id] + 1) {
    const config = BUILDINGS[id];
    return Math.round(config.baseCost * Math.pow(1.75, Math.max(0, targetLevel - 1)));
  }

  function buildingMaterialCost(id, targetLevel = state.buildings[id] + 1) {
    const config = BUILDINGS[id];
    const multiplier = Math.pow(1.6, Math.max(0, targetLevel - 1));
    return {
      wood: Math.ceil(config.materials.wood * multiplier),
      ore: Math.ceil(config.materials.ore * multiplier),
    };
  }

  function buildingInstallments(id, targetLevel = state.buildings[id] + 1) {
    const coins = buildingCost(id, targetLevel);
    const materials = buildingMaterialCost(id, targetLevel);
    const foundationCoins = Math.ceil(coins * 0.4);
    const frameCoins = Math.ceil(coins * 0.3);
    const foundationWood = Math.ceil(materials.wood * 0.55);
    const frameOre = Math.ceil(materials.ore / 2);
    return [
      { coins: foundationCoins, wood: foundationWood, ore: 0 },
      { coins: frameCoins, wood: materials.wood - foundationWood, ore: frameOre },
      { coins: coins - foundationCoins - frameCoins, wood: 0, ore: materials.ore - frameOre },
    ];
  }

  function canPay(cost) {
    return state.coins >= cost.coins && state.wood >= cost.wood && state.ore >= cost.ore;
  }

  function payCost(cost) {
    state.coins -= cost.coins;
    state.wood -= cost.wood;
    state.ore -= cost.ore;
  }

  function costLabel(cost) {
    return `${cost.coins} coins${cost.wood ? ` · ${cost.wood} wood` : ""}${cost.ore ? ` · ${cost.ore} ore` : ""}`;
  }

  function constructionPhaseName(phase) {
    return ["Laying foundation", "Raising timber frame", "Finishing the building"][phase] || "Building";
  }

  function constructionReady(building, now = Date.now()) {
    return now >= building.phaseReadyAt;
  }

  function buildingRushCoinCost(building) {
    return 12 + building.phase * 8 + Math.max(0, building.targetLevel - 1) * 6;
  }

  function rushBuilding(id, mode) {
    const building = state.construction[id];
    if (!building || constructionReady(building)) return;
    if (mode === "coins") {
      const cost = buildingRushCoinCost(building);
      if (state.coins < cost) return;
      state.coins -= cost;
      building.phaseReadyAt -= BUILD_RUSH.coins.seconds * 1000;
      toast(`Extra crew hired — ${BUILD_RUSH.coins.seconds} seconds removed.`);
    } else if (mode === "materials") {
      const cost = BUILD_RUSH.materials;
      if (state.wood < cost.wood || state.ore < cost.ore) return;
      state.wood -= cost.wood;
      state.ore -= cost.ore;
      building.phaseReadyAt -= cost.seconds * 1000;
      toast(`Extra supplies delivered — ${cost.seconds} seconds removed.`);
    } else {
      return;
    }
    playSfx("build");
    finalizeProgress(Date.now());
    renderAll();
    saveState();
    openBuilding(id);
  }

  function constructionAssetStage(building) {
    return building.phase === 0 ? 0 : 1;
  }

  function animalCost(id) {
    return Math.round(ANIMALS[id].baseCost * Math.pow(1.7, state.animals[id]));
  }

  function animalFeed(id) {
    return ANIMALS[id].feed[Math.min(state.animals[id], 2)] || {};
  }

  function feedLabel(feed) {
    return Object.entries(feed).map(([cropId, amount]) => `${amount} ${getCrop(cropId).name.toLowerCase()}`).join(" + ");
  }

  function hasFeed(feed) {
    return Object.entries(feed).every(([cropId, amount]) => (state.inventory[cropId] || 0) >= amount);
  }

  function consumeFeed(feed) {
    Object.entries(feed).forEach(([cropId, amount]) => { state.inventory[cropId] -= amount; });
  }

  function unlockedPlotCount() {
    return state.plots.filter((plot) => !plot?.locked).length;
  }

  function farmExpansionCost() {
    const costs = [
      { coins: 55, wood: 2, ore: 0 },
      { coins: 100, wood: 3, ore: 0 },
      { coins: 170, wood: 5, ore: 1 },
      { coins: 260, wood: 7, ore: 2 },
      { coins: 380, wood: 10, ore: 3 },
    ];
    return costs[Math.max(0, unlockedPlotCount() - 1)] || null;
  }

  function canExpandFarm() {
    const cost = farmExpansionCost();
    return Boolean(cost && state.coins >= cost.coins && state.wood >= cost.wood && state.ore >= cost.ore);
  }

  function beachBuildingCost(id, targetLevel = getCompo().buildings[id] + 1) {
    const config = BEACH_BUILDINGS[id];
    return Math.round(config.baseCost * Math.pow(1.75, Math.max(0, targetLevel - 1)));
  }

  function beachBuildingMaterialCost(id, targetLevel = getCompo().buildings[id] + 1) {
    const config = BEACH_BUILDINGS[id];
    const multiplier = Math.pow(1.58, Math.max(0, targetLevel - 1));
    return {
      wood: Math.ceil(config.materials.wood * multiplier),
      ore: Math.ceil(config.materials.ore * multiplier),
    };
  }

  function beachBuildingInstallments(id, targetLevel = getCompo().buildings[id] + 1) {
    const shells = beachBuildingCost(id, targetLevel);
    const materials = beachBuildingMaterialCost(id, targetLevel);
    const foundationShells = Math.ceil(shells * 0.4);
    const frameShells = Math.ceil(shells * 0.3);
    const foundationWood = Math.ceil(materials.wood * 0.55);
    const frameOre = Math.ceil(materials.ore / 2);
    return [
      { shells: foundationShells, wood: foundationWood, ore: 0 },
      { shells: frameShells, wood: materials.wood - foundationWood, ore: frameOre },
      { shells: shells - foundationShells - frameShells, wood: 0, ore: materials.ore - frameOre },
    ];
  }

  function canPayBeach(cost, compo = getCompo()) {
    return compo.shells >= cost.shells && compo.wood >= cost.wood && compo.ore >= cost.ore;
  }

  function payBeachCost(cost, compo = getCompo()) {
    compo.shells -= cost.shells;
    compo.wood -= cost.wood;
    compo.ore -= cost.ore;
  }

  function beachCostLabel(cost) {
    return `${cost.shells} shells${cost.wood ? ` · ${cost.wood} beach wood` : ""}${cost.ore ? ` · ${cost.ore} beach ore` : ""}`;
  }

  function beachSpotCount(compo = getCompo()) {
    return compo.spots.filter((spot) => !spot?.locked).length;
  }

  function beachSpotExpansionCost(compo = getCompo()) {
    const costs = [
      { shells: 70, wood: 2, ore: 0 },
      { shells: 140, wood: 4, ore: 1 },
      { shells: 260, wood: 7, ore: 2 },
    ];
    return costs[Math.max(0, beachSpotCount(compo) - 1)] || null;
  }

  function canExpandBeachSpots(compo = getCompo()) {
    const cost = beachSpotExpansionCost(compo);
    return Boolean(cost && canPayBeach(cost, compo));
  }

  function beachHabitatCost(id, compo = getCompo()) {
    return Math.round(BEACH_HABITATS[id].baseCost * Math.pow(1.72, compo.habitats[id]));
  }

  function beachHabitatFeed(id, compo = getCompo()) {
    return BEACH_HABITATS[id].feed[Math.min(compo.habitats[id], 2)] || {};
  }

  function beachFeedLabel(feed) {
    const parts = Object.entries(feed).map(([catchId, amount]) => `${amount} ${getBeachCatch(catchId).name.toLowerCase()}`);
    return parts.length ? parts.join(" + ") : "no feed";
  }

  function hasBeachFeed(feed, compo = getCompo()) {
    return Object.entries(feed).every(([catchId, amount]) => (compo.inventory[catchId] || 0) >= amount);
  }

  function consumeBeachFeed(feed, compo = getCompo()) {
    Object.entries(feed).forEach(([catchId, amount]) => { compo.inventory[catchId] -= amount; });
  }

  const CROP_STATES = ["soil", "sprout", "young", "mature"];
  const BUILDING_STATES = ["foundation", "construction", "level-1", "level-2", "level-3"];
  const ANIMAL_STATES = ["empty", "young", "adult", "full"];
  const BEACH_CATCH_STATES = ["water", "ripple", "young", "mature"];
  const BEACH_HABITAT_STATES = ["empty", "young", "adult", "full"];
  function cropAsset(crop, stage) { return `assets/art/living-world/crops/${crop.artKey}-${CROP_STATES[clamp(stage,0,3)]}.png`; }
  function buildingAsset(config, stage) { return `assets/art/living-world/buildings/${config.artKey}-${BUILDING_STATES[clamp(stage,0,3)]}.png`; }
  function animalAsset(config, stage) { return `assets/art/living-world/animals/${config.artKey}-${ANIMAL_STATES[clamp(stage,0,3)]}.png`; }
  function beachCatchAsset(config, stage) { return `assets/art/compo-world/catches/${config.artKey}-${BEACH_CATCH_STATES[clamp(stage,0,3)]}.png`; }
  function beachBuildingAsset(config, stage, season = currentSeason()) {
    const stateName = BUILDING_STATES[clamp(stage,0,4)];
    const winterTownCenter = config.artKey === "towncenter" && stateName === "level-3" && season.id === "winter";
    return `assets/art/compo-world/buildings/${config.artKey}-${stateName}${winterTownCenter ? "-winter" : ""}.png`;
  }
  function beachHabitatAsset(config, stage) { return `assets/art/compo-world/habitats/${config.artKey}-${BEACH_HABITAT_STATES[clamp(stage,0,3)]}.png`; }

  function isModernCompoEra(compo = getCompo()) {
    return compo.buildings.towncenter >= 2 || compo.buildings.beachmarket >= 2 || compo.buildings.icecream >= 2 || compo.buildings.boat >= 2 || getCompoLevelInfo(compo.xp).level >= 3;
  }

  function beachWalkerStrip(person, compo = getCompo()) {
    const early = {
      "beach-collector": "beach-shell-girl-walk",
      "beach-crabber": "beach-crab-boy-walk",
      "beach-helper": "beach-kelp-girl-walk",
    };
    const modern = {
      "beach-collector": "beach-lifeguard-girl-modern-walk",
      "beach-crabber": "beach-sailor-boy-modern-walk",
      "beach-helper": "beach-tennis-girl-modern-walk",
    };
    const filename = (isModernCompoEra(compo) ? modern : early)[person] || early["beach-collector"];
    return `assets/art/compo-world/people/${filename}.png`;
  }

  function cropStage(plot, now = Date.now()) {
    if (!plot?.crop) return 0;
    const progress = clamp((now - plot.plantedAt) / (plot.readyAt - plot.plantedAt), 0, 1);
    if (progress >= 1) return 3;
    if (progress >= 0.72) return 2;
    if (progress >= 0.22) return 1;
    return 0;
  }

  function beachCatchStage(spot, now = Date.now()) {
    if (!spot?.catchId) return 0;
    const progress = clamp((now - spot.startedAt) / (spot.readyAt - spot.startedAt), 0, 1);
    if (progress >= 1) return 3;
    if (progress >= 0.7) return 2;
    if (progress >= 0.22) return 1;
    return 0;
  }

  function compoDevelopmentCount(compo = getCompo()) {
    return Object.values(compo.buildings).reduce((sum, level) => sum + level, 0) + Object.values(compo.habitats).reduce((sum, level) => sum + level, 0);
  }

  function developmentCount() {
    return Object.values(state.buildings).reduce((sum, level) => sum + level, 0) + Object.values(state.animals).reduce((sum, level) => sum + level, 0);
  }

  function riverTownComplete() {
    return Object.values(state.buildings).every((level) => level >= MAX_BUILDING_LEVEL) && Object.values(state.animals).every((level) => level >= 3) && state.plots.every((plot) => !plot?.locked);
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function formatNumber(value) { return Math.floor(value).toLocaleString(); }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return minutes ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
  }

  function formatAway(ms) {
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 60) return `${Math.max(1, minutes)} min`;
    return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function setView(view) {
    if (view !== "town" && layoutMode) setLayoutMode(false);
    if (view !== "town") clearWildlifeEvents();
    dom.app.dataset.view = view;
    document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
    document.querySelectorAll(".nav-button").forEach((button) => {
      const active = button.dataset.viewTarget === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (view !== "farm") dom.seedDrawer.classList.remove("open");
    if (view === "learn" && !state.question) nextQuestion();
    else if (view === "learn") renderLesson();
    if (view === "town") updateGuide();
    if (view === "farm") renderFarm();
    if (view === "market") renderMarket();
    if (view === "goals") renderGoals();
  }

  function renderHUD() {
    const compoActive = isCompoActive();
    const compo = getCompo();
    dom.coinLabel.textContent = compoActive ? "Shells" : "Coins";
    dom.seedLabel.textContent = compoActive ? "Bait" : "Seeds";
    dom.woodLabel.textContent = compoActive ? "Beach wood" : "Wood";
    dom.oreLabel.textContent = compoActive ? "Beach ore" : "Ore";
    dom.coinCount.textContent = formatNumber(compoActive ? compo.shells : state.coins);
    dom.seedCount.textContent = formatNumber(compoActive ? compo.bait : state.seeds);
    dom.woodCount.textContent = formatNumber(compoActive ? compo.wood : state.wood);
    dom.oreCount.textContent = formatNumber(compoActive ? compo.ore : state.ore);
    dom.farmNavLabel.textContent = compoActive ? "Fish" : "Farm";
    dom.marketNavLabel.textContent = compoActive ? "Beach Market" : "Market";
    dom.goalsNavLabel.textContent = "Goals";
    const level = compoActive ? getCompoLevelInfo(compo.xp) : getLevelInfo();
    const season = currentSeason();
    const next = nextSeason();
    dom.levelName.textContent = level.current.name;
    dom.levelLabel.textContent = `${compoActive ? "Coast" : "Level"} ${level.level} · ${season.name} ${formatTime((next.nextAt - Date.now()) / 1000)}`;
    dom.levelProgress.style.width = `${level.progress * 100}%`;
    dom.app.dataset.season = season.id;
    dom.learnReadyDot.classList.toggle("visible", !isBoostActive());
    renderHarvestStatus();
    Object.keys(BUILDINGS).forEach((id) => {
      const element = document.getElementById(`${id}-level-map`);
      if (!element) return;
      const unlocked = BUILDINGS[id].unlock(state);
      const building = state.construction[id];
      element.textContent = building
        ? (constructionReady(building) && building.phase < 2 ? "Materials needed" : `${formatTime((building.phaseReadyAt - Date.now()) / 1000)} left`)
        : unlocked ? (state.buildings[id] ? `Era ${state.buildings[id]}` : "Build") : "Locked";
      const button = document.querySelector(`[data-building="${id}"]`);
      button?.classList.toggle("locked-building", !unlocked);
      button?.classList.toggle("under-construction", Boolean(building));
    });
  }

  function renderHarvestStatus(now = Date.now()) {
    const readyCount = state.plots.filter((plot) => plot?.crop && plot.readyAt <= now).length;
    return readyCount;
  }

  function renderBeachWorld(now = Date.now(), season = currentSeason(now)) {
    const compo = getCompo();
    if (dom.beachWorld.dataset.ready !== "true") {
      const spotButtons = compo.spots.map((_, index) => `<button class="beach-spot" data-beach-spot="${index}" type="button"><img class="world-asset beach-catch-image" alt=""><span class="beach-label"></span></button>`);
      const buildingButtons = Object.entries(BEACH_BUILDINGS).map(([id, config]) => `<button class="beach-building ${id}-beach-building" data-beach-building="${id}" type="button" aria-label="${config.name}"><img class="world-asset beach-building-image" alt=""><em class="construction-badge" aria-hidden="true">Building…</em><span class="beach-label">${config.short}</span></button>`);
      const habitatButtons = Object.entries(BEACH_HABITATS).map(([id, config]) => `<button class="beach-habitat ${id}-beach-habitat" data-beach-habitat="${id}" type="button" aria-label="${config.name}"><img class="world-asset beach-habitat-image" alt=""><span class="beach-label">${config.name}</span></button>`);
      const walkers = ["beach-collector", "beach-crabber", "beach-helper"].map((person) => `<span class="shore-walker shore-walker-${person}" data-beach-walker="${person}"><span class="shore-walker-frame"><img class="shore-walker-strip" alt=""></span></span>`);
      dom.beachWorld.innerHTML = [...spotButtons, ...buildingButtons, ...habitatButtons, `<div class="beach-life" aria-hidden="true">${walkers.join("")}</div>`].join("");
      dom.beachWorld.dataset.ready = "true";
      startBeachWalkerRoutes();
    }

    dom.beachWorld.querySelectorAll("[data-beach-walker]").forEach((walker) => {
      const strip = walker.querySelector(".shore-walker-strip");
      if (!strip) return;
      const source = beachWalkerStrip(walker.dataset.beachWalker, compo);
      if (strip.getAttribute("src") !== source) strip.src = source;
    });

    dom.beachWorld.querySelectorAll("[data-beach-spot]").forEach((button, index) => {
      const spot = compo.spots[index];
      const locked = spot?.locked;
      button.hidden = Boolean(locked);
      const catchConfig = spot?.catchId ? getBeachCatch(spot.catchId) : BEACH_CATCHES[0];
      const ready = spot?.catchId && spot.readyAt <= now;
      const stage = locked ? 0 : beachCatchStage(spot, now);
      const label = locked ? "Locked water" : !spot ? "Open fishing spot" : ready ? `${catchConfig.name} ready!` : `${catchConfig.name} · ${formatTime((spot.readyAt - now) / 1000)}`;
      const position = compo.layout.spots[index] || { x: 12 + index * 15, y: 64 };
      button.className = `beach-spot ${ready ? "ready" : spot?.catchId ? "growing" : ""} ${locked ? "locked" : ""}`;
      button.setAttribute("aria-label", label);
      const progress = spot?.catchId ? clamp((now - spot.startedAt) / (spot.readyAt - spot.startedAt), 0, 1) : 0;
      button.style.setProperty("--catch-progress", `${progress * 100}%`);
      button.style.left = `${position.x}%`;
      button.style.top = `${position.y}%`;
      const image = button.querySelector(".beach-catch-image");
      const source = beachCatchAsset(catchConfig, stage);
      if (image.getAttribute("src") !== source) image.src = source;
      button.querySelector(".beach-label").textContent = label;
    });

    Object.entries(BEACH_BUILDINGS).forEach(([id, config]) => {
      const button = dom.beachWorld.querySelector(`[data-beach-building="${id}"]`);
      const sprite = button?.querySelector(".beach-building-image");
      if (!button || !sprite) return;
      const building = compo.construction[id];
      const level = compo.buildings[id] || 0;
      const unlocked = config.unlock(compo);
      button.hidden = level <= 0 && !building;
      const column = building ? constructionAssetStage(building) : level <= 0 ? 0 : level + 1;
      const source = beachBuildingAsset(config, column, season);
      if (sprite.getAttribute("src") !== source) sprite.src = source;
      const position = compo.layout.buildings[id];
      button.style.left = `${position.x}%`;
      button.style.top = `${position.y}%`;
      button.classList.toggle("locked-building", !unlocked);
      button.classList.toggle("under-construction", Boolean(building));
      const badge = button.querySelector(".construction-badge");
      if (badge && building) {
        const awaitingMaterials = constructionReady(building) && building.phase < 2;
        badge.textContent = awaitingMaterials ? "!" : formatTime((building.phaseReadyAt - now) / 1000);
        button.classList.toggle("awaiting-materials", awaitingMaterials);
        button.setAttribute("aria-label", `${config.name}. ${awaitingMaterials ? "Ready for the next beach supply payment" : `${constructionPhaseName(building.phase)}, ${badge.textContent} remaining`}`);
      } else {
        button.classList.remove("awaiting-materials");
        button.setAttribute("aria-label", config.name);
      }
      button.querySelector(".beach-label").textContent = building ? `${config.short} · ${constructionPhaseName(building.phase)}` : level ? `${config.short} · Era ${level}` : config.short;
    });

    Object.entries(BEACH_HABITATS).forEach(([id, config]) => {
      const button = dom.beachWorld.querySelector(`[data-beach-habitat="${id}"]`);
      const sprite = button?.querySelector(".beach-habitat-image");
      if (!button || !sprite) return;
      const level = clamp(compo.habitats[id] || 0, 0, 3);
      const growth = compo.habitatGrowth[id];
      button.hidden = level <= 0 && !growth;
      const source = beachHabitatAsset(config, level);
      if (sprite.getAttribute("src") !== source) sprite.src = source;
      const position = compo.layout.habitats[id];
      button.style.left = `${position.x}%`;
      button.style.top = `${position.y}%`;
      button.classList.toggle("growing", Boolean(growth));
      button.querySelector(".beach-label").textContent = growth ? `${formatTime((growth.completeAt - now) / 1000)} left` : config.labels[level];
    });
  }

  function renderWorld() {
    const now = Date.now();
    const season = currentSeason(now);
    dom.worldArt.dataset.region = state.activeRegion;
    dom.worldArt.dataset.season = season.id;
    dom.regionButtons.forEach((button) => {
      const region = button.dataset.region;
      button.classList.toggle("active", region === state.activeRegion);
      button.disabled = region === "compo" && !state.districts.compo;
      if (region === "compo") button.textContent = state.districts.compo ? "Compo Coast" : "🔒 Compo Coast";
    });
    const arrangingLabel = state.activeRegion === "compo" ? "Arrange coast" : "Arrange town";
    dom.layoutButton.innerHTML = layoutMode ? `<span>✓</span><b>Done arranging</b>` : `<span>✥</span><b>${arrangingLabel}</b>`;
    dom.layoutHint.textContent = state.activeRegion === "compo"
      ? "Drag fishing spots, beach buildings, and beach homes to arrange Compo. Tap Done when it feels right."
      : "Drag buildings and habitats to arrange your town. Tap Done when it feels right.";
    dom.worldArt.classList.toggle("layout-mode", layoutMode);
    if (state.activeRegion === "compo") renderBeachWorld(now, season);
    if (dom.worldCrops.children.length !== state.plots.length) {
      dom.worldCrops.innerHTML = state.plots.map((_, index) => `<button class="world-crop" data-world-plot="${index}" type="button"><img class="world-asset crop-image" alt=""><span class="world-crop-label"></span></button>`).join("");
    }
    dom.worldCrops.querySelectorAll("[data-world-plot]").forEach((button, index) => {
      const plot = state.plots[index];
      const locked = plot?.locked;
      button.hidden = Boolean(locked);
      const crop = plot?.crop ? getCrop(plot.crop) : CROPS[0];
      const stage = locked ? 0 : cropStage(plot, now);
      const ready = plot?.crop && plot.readyAt <= now;
      const label = locked ? "Locked field" : !plot ? "Empty field" : ready ? `${crop.name} ready!` : `${crop.name} · ${formatTime((plot.readyAt - now) / 1000)}`;
      const position = state.layout.plots[index] || { x: 8 + index * 10, y: 68 };
      button.className = `world-crop ${ready ? "ready" : plot?.crop ? "growing" : ""} ${locked ? "locked" : ""}`;
      button.setAttribute("aria-label", label);
      const cropProgress = plot?.crop ? clamp((now - plot.plantedAt) / (plot.readyAt - plot.plantedAt), 0, 1) : 0;
      button.style.setProperty("--crop-progress", `${cropProgress * 100}%`);
      button.style.left = `${position.x}%`;
      button.style.top = `${position.y}%`;
      button.style.right = "auto";
      button.style.bottom = "auto";
      const image = button.querySelector(".crop-image");
      const source = cropAsset(crop, stage);
      if (image.getAttribute("src") !== source) image.src = source;
      button.querySelector(".world-crop-label").textContent = label;
    });

    Object.entries(BUILDINGS).forEach(([id, config]) => {
      const button = document.querySelector(`[data-building="${id}"]`);
      const sprite = button?.querySelector(".building-image");
      if (!sprite) return;
      button.hidden = state.buildings[id] <= 0 && !state.construction[id];
      const building = state.construction[id];
      const column = building ? constructionAssetStage(building) : state.buildings[id] <= 0 ? 0 : state.buildings[id] + 1;
      const source = buildingAsset(config, column);
      if (sprite.getAttribute("src") !== source) sprite.src = source;
      const badge = button.querySelector(".construction-badge");
      if (badge && building) {
        const awaitingMaterials = constructionReady(building) && building.phase < 2;
        badge.textContent = awaitingMaterials ? "!" : formatTime((building.phaseReadyAt - now) / 1000);
        button.classList.toggle("awaiting-materials", awaitingMaterials);
        button.setAttribute("aria-label", `${config.name}. ${awaitingMaterials ? "Ready for the next supply payment" : `${constructionPhaseName(building.phase)}, ${badge.textContent} remaining`}`);
      } else {
        button.classList.remove("awaiting-materials");
        button.setAttribute("aria-label", config.name);
      }
      const position = state.layout.buildings[id];
      button.style.left = `${position.x}%`; button.style.top = `${position.y}%`; button.style.right = "auto"; button.style.bottom = "auto";
    });

    Object.entries(ANIMALS).forEach(([id, config]) => {
      const button = document.querySelector(`[data-animal="${id}"]`);
      const sprite = button?.querySelector(".animal-image");
      const level = clamp(state.animals[id], 0, 3);
      if (button) button.hidden = level <= 0 && !state.animalGrowth[id];
      const source = animalAsset(config, level);
      if (sprite && sprite.getAttribute("src") !== source) sprite.src = source;
      const position = state.layout.animals[id];
      button.style.left = `${position.x}%`; button.style.top = `${position.y}%`; button.style.right = "auto"; button.style.bottom = "auto";
      button?.classList.toggle("growing", Boolean(state.animalGrowth[id]));
    });
    dom.chickenLevelMap.textContent = state.animalGrowth.chickens ? `${formatTime((state.animalGrowth.chickens.completeAt - now) / 1000)} left` : ANIMALS.chickens.labels[state.animals.chickens];
    dom.cowLevelMap.textContent = state.animalGrowth.cows ? `${formatTime((state.animalGrowth.cows.completeAt - now) / 1000)} left` : ANIMALS.cows.labels[state.animals.cows];
    const vendor = document.querySelector(".walker-vendor");
    const teacher = document.querySelector(".walker-teacher");
    if (vendor) vendor.hidden = state.buildings.market <= 0 && !state.construction.market;
    if (teacher) teacher.hidden = state.buildings.school <= 0 && !state.construction.school;
    const modernResidents = riverTownComplete() || Object.values(state.buildings).filter((level) => level >= MAX_BUILDING_LEVEL).length >= 2;
    dom.worldArt.dataset.residentEra = modernResidents ? "modern" : "historic";
    document.querySelectorAll("[data-walker]").forEach((walker) => {
      const era = modernResidents ? "-modern" : "";
      const artKey = walker.dataset.walker === "vendor" ? "market-helper-stride" : walker.dataset.walker;
      const prefix = `assets/art/people/${artKey}${era}-rig`;
      const sources = [
        [walker.querySelector(".walker-torso"), `${prefix}-torso.png`],
        [walker.querySelector(".walker-leg-front"), `${prefix}-leg-1.png`],
        [walker.querySelector(".walker-leg-back"), `${prefix}-leg-2.png`],
      ];
      sources.forEach(([image, source]) => { if (image && image.getAttribute("src") !== source) image.src = source; });
    });
  }

  function renderFarm() {
    if (isCompoActive()) {
      renderFishing();
      return;
    }
    const now = Date.now();
    dom.farmRegionLabel.textContent = "Old Hill Farm";
    dom.farmTitle.textContent = "Grow something wonderful.";
    dom.farmCopy.textContent = "Spend seeds earned from math, then use crops for market income or animal feed.";
    renderHarvestStatus(now);
    dom.farmField.dataset.plotCount = String(unlockedPlotCount());

    if (dom.farmField.children.length !== state.plots.length) {
      dom.farmField.innerHTML = state.plots.map((_, index) => `<button class="plot" data-plot="${index}" type="button"></button>`).join("");
    }
    dom.farmField.querySelectorAll("[data-plot]").forEach((button, index) => {
      const plot = state.plots[index];
      if (plot?.locked) {
        button.hidden = true;
        button.className = "plot locked";
        button.removeAttribute("aria-label");
        button.innerHTML = "";
        button.dataset.renderKey = "locked";
        return;
      }
      button.hidden = false;
      if (!plot) {
        button.className = "plot empty";
        button.setAttribute("aria-label", `Empty plot ${index + 1}, plant something`);
        if (button.dataset.renderKey !== "empty") button.innerHTML = `<span class="plot-content"><span class="plot-number">${index + 1}</span><span class="empty-plus">+</span><span class="plot-state">Plant something</span></span>`;
        button.dataset.renderKey = "empty";
        return;
      }
      const crop = getCrop(plot.crop);
      const total = plot.readyAt - plot.plantedAt;
      const progress = clamp((now - plot.plantedAt) / total, 0, 1);
      const ready = progress >= 1;
      const stage = cropStage(plot, now);
      const label = ready ? `Harvest ${crop.name}` : `${formatTime((plot.readyAt - now) / 1000)} left`;
      const renderKey = `${crop.id}-${stage}-${ready ? "ready" : "growing"}`;
      button.className = `plot ${ready ? "ready" : "growing"}`;
      button.setAttribute("aria-label", label);
      if (button.dataset.renderKey !== renderKey) {
        button.innerHTML = `<span class="plot-content"><span class="plot-number">${index + 1}</span><img class="plot-icon" src="${cropAsset(crop,stage)}" alt=""><span class="plot-state"></span>${ready ? "" : `<span class="crop-progress"><span></span></span>`}</span>`;
        button.dataset.renderKey = renderKey;
      }
      button.querySelector(".plot-state").textContent = label;
      const progressBar = button.querySelector(".crop-progress span");
      if (progressBar) progressBar.style.width = `${progress * 100}%`;
    });

    renderSeeds();
    renderBoost();
  }

  function renderSeeds() {
    dom.seedTitle.textContent = "Choose a crop";
    const townLevel = getLevelInfo().level;
    const season = currentSeason();
    const renderKey = `${townLevel}:${Math.floor(state.seeds)}:${season.id}`;
    if (dom.seedList.dataset.renderKey === renderKey) return;
    dom.seedList.dataset.renderKey = renderKey;
    dom.seedList.innerHTML = CROPS.map((crop) => {
      const levelLocked = townLevel < crop.level;
      const seasonLocked = !cropAvailableInSeason(crop, season);
      const poor = state.seeds < crop.seedCost;
      const locked = levelLocked || seasonLocked || poor;
      const duration = cropDuration(crop, season);
      const note = levelLocked
        ? `Unlocks at town level ${crop.level}`
        : seasonLocked ? `Sleeps until ${cropSeasonLabel(crop)}`
          : `${formatTime(duration)} · ${season.name} crop · yields ${crop.yield}`;
      return `<button class="seed-option" data-seed="${crop.id}" type="button" ${locked ? "disabled" : ""}><img class="seed-art" src="${cropAsset(crop,3)}" alt=""><span class="seed-copy"><strong>${crop.name}</strong><small>${note}</small></span><span class="seed-price">${crop.seedCost} ${crop.seedCost === 1 ? "seed" : "seeds"}<small>${crop.value} coins each</small></span></button>`;
    }).join("");
  }

  function renderFishing() {
    const compo = getCompo();
    const now = Date.now();
    dom.farmRegionLabel.textContent = "Compo Fishing Cove";
    dom.farmTitle.textContent = "Cast lines, collect catches, build the shore.";
    dom.farmCopy.textContent = "Math earns bait. Start with shoreline shells, kelp, and crabs; then build a boat to reach bluefish and deep-water catches.";
    dom.farmField.classList.add("beach-field");
    dom.farmField.dataset.plotCount = String(beachSpotCount(compo));

    if (dom.farmField.children.length !== compo.spots.length) {
      dom.farmField.innerHTML = compo.spots.map((_, index) => `<button class="plot beach-plot" data-plot="${index}" type="button"></button>`).join("");
    }
    dom.farmField.querySelectorAll("[data-plot]").forEach((button, index) => {
      const spot = compo.spots[index];
      if (spot?.locked) {
        button.hidden = true;
        button.className = "plot beach-plot locked";
        button.innerHTML = "";
        button.dataset.renderKey = "locked";
        return;
      }
      button.hidden = false;
      if (!spot) {
        const source = beachCatchAsset(BEACH_CATCHES[0], 0);
        button.className = "plot beach-plot empty";
        button.setAttribute("aria-label", `Open fishing spot ${index + 1}, choose bait`);
        if (button.dataset.renderKey !== "beach-empty") button.innerHTML = `<span class="plot-content"><span class="plot-number">${index + 1}</span><img class="plot-icon beach-icon" src="${source}" alt=""><span class="plot-state">Choose bait</span></span>`;
        button.dataset.renderKey = "beach-empty";
        return;
      }
      const catchConfig = getBeachCatch(spot.catchId);
      const total = spot.readyAt - spot.startedAt;
      const progress = clamp((now - spot.startedAt) / total, 0, 1);
      const ready = progress >= 1;
      const stage = beachCatchStage(spot, now);
      const label = ready ? `Collect ${catchConfig.name}` : `${formatTime((spot.readyAt - now) / 1000)} left`;
      const renderKey = `beach-${catchConfig.id}-${stage}-${ready ? "ready" : "growing"}`;
      button.className = `plot beach-plot ${ready ? "ready" : "growing"}`;
      button.setAttribute("aria-label", label);
      if (button.dataset.renderKey !== renderKey) {
        button.innerHTML = `<span class="plot-content"><span class="plot-number">${index + 1}</span><img class="plot-icon beach-icon" src="${beachCatchAsset(catchConfig,stage)}" alt=""><span class="plot-state"></span>${ready ? "" : `<span class="crop-progress"><span></span></span>`}</span>`;
        button.dataset.renderKey = renderKey;
      }
      button.querySelector(".plot-state").textContent = label;
      const progressBar = button.querySelector(".crop-progress span");
      if (progressBar) progressBar.style.width = `${progress * 100}%`;
    });

    renderBeachBait();
    renderBoost();
  }

  function renderBeachBait() {
    const compo = getCompo();
    const coastLevel = getCompoLevelInfo(compo.xp).level;
    const season = currentSeason();
    dom.seedTitle.textContent = "Choose bait";
    const renderKey = `beach:${coastLevel}:${Math.floor(compo.bait)}:${season.id}:${compo.buildings.boat}`;
    if (dom.seedList.dataset.renderKey === renderKey) return;
    dom.seedList.dataset.renderKey = renderKey;
    dom.seedList.innerHTML = BEACH_CATCHES.map((catchConfig) => {
      const levelLocked = coastLevel < catchConfig.level;
      const seasonLocked = !beachCatchAvailableInSeason(catchConfig, season);
      const boatLocked = catchConfig.requiresBoat && compo.buildings.boat < catchConfig.requiresBoat;
      const poor = compo.bait < catchConfig.baitCost;
      const locked = levelLocked || seasonLocked || boatLocked || poor;
      const duration = beachCatchDuration(catchConfig, season);
      const note = levelLocked
        ? `Unlocks at coast level ${catchConfig.level}`
        : boatLocked ? `Needs Fishing Boat era ${catchConfig.requiresBoat}`
          : seasonLocked ? `Best in ${beachCatchSeasonLabel(catchConfig)}`
            : `${formatTime(duration)} · ${season.name} catch · yields ${catchConfig.yield}`;
      return `<button class="seed-option beach-bait-option" data-beach-catch="${catchConfig.id}" type="button" ${locked ? "disabled" : ""}><img class="seed-art" src="${beachCatchAsset(catchConfig,3)}" alt=""><span class="seed-copy"><strong>${catchConfig.name}</strong><small>${note}</small></span><span class="seed-price">${catchConfig.baitCost} bait<small>${catchConfig.value} shells each</small></span></button>`;
    }).join("");
  }

  function renderBoost() {
    const active = isBoostActive();
    dom.focusBoost.classList.toggle("active", active);
    dom.boostLabel.textContent = active ? `${formatTime((state.boostUntil - Date.now()) / 1000)} remaining` : "Not active";
  }

  function expandFarm() {
    const cost = farmExpansionCost();
    const index = state.plots.findIndex((plot) => plot?.locked);
    if (!cost || index < 0) return;
    if (!canExpandFarm()) {
      toast(`Next field needs ${cost.coins} coins, ${cost.wood} wood${cost.ore ? `, and ${cost.ore} ore` : ""}.`);
      return;
    }
    state.coins -= cost.coins;
    state.wood -= cost.wood;
    state.ore -= cost.ore;
    state.plots[index] = null;
    addXP(25 + index * 5);
    maybeUnlockCompo();
    playSfx("build");
    toast(`Field ${index + 1} is cleared and ready to plant!`);
    renderAll();
    saveState();
  }

  function selectPlot(index) {
    if (isCompoActive()) {
      selectBeachSpot(index);
      return;
    }
    const plot = state.plots[index];
    if (plot?.locked) {
      expandFarm();
      return;
    }
    if (!plot) {
      selectedPlot = index;
      dom.seedDrawer.classList.add("open");
      if (window.innerWidth > 760) dom.seedDrawer.querySelector("button:not(:disabled)")?.focus();
      return;
    }
    if (plot.readyAt <= Date.now()) harvestPlot(index);
    else toast(`${getCrop(plot.crop).name} need ${formatTime((plot.readyAt - Date.now()) / 1000)} more.`);
  }

  function plantCrop(cropId) {
    if (selectedPlot === null || state.plots[selectedPlot]) return;
    const crop = getCrop(cropId);
    const season = currentSeason();
    if (!crop || state.seeds < crop.seedCost || getLevelInfo().level < crop.level) return;
    if (!cropAvailableInSeason(crop, season)) {
      toast(`${crop.name} do best in ${cropSeasonLabel(crop)}. ${season.name} planting is limited.`);
      return;
    }
    const now = Date.now();
    const duration = cropDuration(crop, season);
    state.seeds -= crop.seedCost;
    state.plots[selectedPlot] = { crop: crop.id, plantedAt: now, readyAt: now + duration * 1000 };
    state.stats.planted += 1;
    addXP(3);
    playSfx("plant");
    toast(`${crop.name} planted for ${season.name.toLowerCase()} — ready in ${formatTime(duration)}.`);
    selectedPlot = null;
    dom.seedDrawer.classList.remove("open");
    renderAll();
    saveState();
  }

  function expandBeachSpots() {
    const compo = getCompo();
    const cost = beachSpotExpansionCost(compo);
    const index = compo.spots.findIndex((spot) => spot?.locked);
    if (!cost || index < 0) return;
    if (!canExpandBeachSpots(compo)) {
      toast(`Next fishing spot needs ${beachCostLabel(cost)}.`);
      return;
    }
    payBeachCost(cost, compo);
    compo.spots[index] = null;
    addCompoXP(24 + index * 7);
    playSfx("build");
    toast(`Fishing spot ${index + 1} is open at Compo Beach!`);
    renderAll();
    saveState();
  }

  function selectBeachSpot(index) {
    const compo = getCompo();
    const spot = compo.spots[index];
    if (spot?.locked) {
      expandBeachSpots();
      return;
    }
    if (!spot) {
      selectedPlot = index;
      dom.seedDrawer.classList.add("open");
      if (window.innerWidth > 760) dom.seedDrawer.querySelector("button:not(:disabled)")?.focus();
      return;
    }
    if (spot.readyAt <= Date.now()) harvestBeachSpot(index);
    else toast(`${getBeachCatch(spot.catchId).name} need ${formatTime((spot.readyAt - Date.now()) / 1000)} more.`);
  }

  function castLine(catchId) {
    const compo = getCompo();
    if (selectedPlot === null || compo.spots[selectedPlot]) return;
    const catchConfig = getBeachCatch(catchId);
    const season = currentSeason();
    if (!catchConfig || compo.bait < catchConfig.baitCost || getCompoLevelInfo(compo.xp).level < catchConfig.level) return;
    if (catchConfig.requiresBoat && compo.buildings.boat < catchConfig.requiresBoat) {
      toast(`${catchConfig.name} need the Fishing Boat at era ${catchConfig.requiresBoat}.`);
      return;
    }
    if (!beachCatchAvailableInSeason(catchConfig, season)) {
      toast(`${catchConfig.name} are best in ${beachCatchSeasonLabel(catchConfig)}. ${season.name} fishing is limited.`);
      return;
    }
    const now = Date.now();
    const duration = beachCatchDuration(catchConfig, season);
    compo.bait -= catchConfig.baitCost;
    compo.spots[selectedPlot] = { catchId: catchConfig.id, startedAt: now, readyAt: now + duration * 1000 };
    addCompoXP(3);
    playSfx("plant");
    toast(`Line cast for ${catchConfig.name.toLowerCase()} — ready in ${formatTime(duration)}.`);
    selectedPlot = null;
    dom.seedDrawer.classList.remove("open");
    renderAll();
    saveState();
  }

  function harvestBeachSpot(index) {
    const compo = getCompo();
    const spot = compo.spots[index];
    if (!spot?.catchId || spot.readyAt > Date.now()) return;
    const catchConfig = getBeachCatch(spot.catchId);
    const boatBonus = Math.max(0, compo.buildings.boat || 0);
    const yieldAmount = catchConfig.yield + boatBonus;
    compo.inventory[catchConfig.id] += yieldAmount;
    compo.spots[index] = null;
    addCompoXP(6 + catchConfig.level * 2);
    playSfx("harvest");
    toast(`Collected ${yieldAmount} ${catchConfig.name.toLowerCase()}!`);
    renderAll();
    saveState();
  }

  function harvestAllBeach() {
    const compo = getCompo();
    const ready = compo.spots.map((spot, index) => ({ spot, index })).filter(({ spot }) => spot?.catchId && spot.readyAt <= Date.now());
    if (!ready.length) return;
    let total = 0;
    ready.forEach(({ spot, index }) => {
      const catchConfig = getBeachCatch(spot.catchId);
      const yieldAmount = catchConfig.yield + Math.max(0, compo.buildings.boat || 0);
      compo.inventory[catchConfig.id] += yieldAmount;
      total += yieldAmount;
      compo.spots[index] = null;
      compo.xp += 6 + catchConfig.level * 2;
    });
    playSfx("harvest");
    toast(`Beach basket filled with ${total} catches!`);
    renderAll();
    saveState();
  }

  function harvestPlot(index) {
    const plot = state.plots[index];
    if (!plot?.crop || plot.readyAt > Date.now()) return;
    const crop = getCrop(plot.crop);
    state.inventory[crop.id] += crop.yield;
    state.plots[index] = null;
    state.stats.harvested += crop.yield;
    addXP(6 + crop.level * 2);
    playSfx("harvest");
    toast(`Harvested ${crop.yield} ${crop.name.toLowerCase()}!`);
    renderAll();
    saveState();
  }

  function harvestAll() {
    const ready = state.plots.map((plot, index) => ({ plot, index })).filter(({ plot }) => plot?.crop && plot.readyAt <= Date.now());
    if (!ready.length) return;
    let total = 0;
    ready.forEach(({ plot, index }) => {
      const crop = getCrop(plot.crop);
      state.inventory[crop.id] += crop.yield;
      total += crop.yield;
      state.stats.harvested += crop.yield;
      state.xp += 6 + crop.level * 2;
      state.plots[index] = null;
    });
    playSfx("harvest");
    toast(`Harvest basket filled with ${total} crops!`);
    renderAll();
    saveState();
  }

  function renderMarket() {
    if (isCompoActive()) {
      renderBeachMarket();
      return;
    }
    dom.marketRegionLabel.textContent = "Main Street Market";
    dom.marketTitle.textContent = "Fresh from your fields.";
    dom.marketCopy.textContent = "Sell crops for coins, then put the earnings back into Coleytown.";
    dom.sellAll.innerHTML = "Sell everything <span>→</span>";
    const multiplier = marketMultiplier();
    let totalValue = 0;
    const itemCount = CROPS.length + GOODS.length;
    if (dom.marketList.dataset.marketMode !== "river" || dom.marketList.children.length !== itemCount) {
      const cropCards = CROPS.map((crop) => `<article class="market-item" data-market-crop="${crop.id}"><img class="market-art" alt=""><div class="market-item-copy"><strong></strong><small></small><button data-sell="${crop.id}" type="button"></button></div></article>`);
      const goodsCards = GOODS.map((good) => `<article class="market-item" data-market-good="${good.id}"><img class="market-art" alt=""><div class="market-item-copy"><strong></strong><small></small><button data-sell-good="${good.id}" type="button"></button></div></article>`);
      dom.marketList.innerHTML = [...cropCards, ...goodsCards].join("");
      dom.marketList.dataset.marketMode = "river";
    }
    dom.marketList.querySelectorAll("[data-market-crop]").forEach((item) => {
      const crop = getCrop(item.dataset.marketCrop);
      const count = state.inventory[crop.id] || 0;
      const unit = Math.round(crop.value * multiplier);
      totalValue += count * unit;
      const image = item.querySelector(".market-art");
      const source = cropAsset(crop, 3);
      if (image.getAttribute("src") !== source) image.src = source;
      item.querySelector("strong").textContent = crop.name;
      item.querySelector("small").textContent = `${count} in basket · ${unit} coins each`;
      const button = item.querySelector("button");
      button.disabled = !count;
      button.textContent = `Sell ${count ? `all for ${count * unit}` : "when ready"}`;
    });
    dom.marketList.querySelectorAll("[data-market-good]").forEach((item) => {
      const good = GOODS.find((candidate) => candidate.id === item.dataset.marketGood);
      const count = Math.floor(state.goods[good.id] || 0);
      const unit = Math.round(good.value * multiplier);
      totalValue += count * unit;
      const image = item.querySelector(".market-art");
      const source = animalAsset(ANIMALS[good.animal], 3);
      if (image.getAttribute("src") !== source) image.src = source;
      item.querySelector("strong").textContent = good.name;
      item.querySelector("small").textContent = `${count} ready · ${unit} coins each · sell manually`;
      const button = item.querySelector("button");
      button.disabled = !count;
      button.textContent = `Sell ${count ? `all for ${count * unit}` : "when produced"}`;
    });
    dom.basketValue.textContent = `${formatNumber(totalValue)} coins`;
    dom.basketCopy.textContent = totalValue ? `${getTotalProduce()} items ready for Main Street.` : "Harvest crops or raise animals to stock the market stall.";
    dom.sellAll.disabled = totalValue <= 0;
  }

  function beachGoodIcon(good) {
    if (good.id === "necklaces") return beachCatchAsset(getBeachCatch("seashell"), 3);
    const habitat = BEACH_HABITATS[good.habitat];
    return beachHabitatAsset(habitat, 3);
  }

  function renderBeachMarket() {
    const compo = getCompo();
    const multiplier = beachMarketMultiplier(compo);
    let totalValue = 0;
    dom.marketRegionLabel.textContent = "Beach Market & Restaurant";
    dom.marketTitle.textContent = "Turn beach finds into shell coins.";
    dom.marketCopy.textContent = "Sell shoreline shells, kelp, shore crabs, boat-caught fish, rental cards, guest passes, and shell necklaces. River Town coins do not apply here.";
    dom.sellAll.innerHTML = "Sell beach basket <span>→</span>";
    const itemCount = BEACH_CATCHES.length + BEACH_GOODS.length;
    if (dom.marketList.dataset.marketMode !== "beach" || dom.marketList.children.length !== itemCount) {
      const catchCards = BEACH_CATCHES.map((catchConfig) => `<article class="market-item beach-market-item" data-market-beach-catch="${catchConfig.id}"><img class="market-art" alt=""><div class="market-item-copy"><strong></strong><small></small><button data-sell-beach="${catchConfig.id}" type="button"></button></div></article>`);
      const goodCards = BEACH_GOODS.map((good) => `<article class="market-item beach-market-item" data-market-beach-good="${good.id}"><img class="market-art" alt=""><div class="market-item-copy"><strong></strong><small></small><button data-sell-beach-good="${good.id}" type="button"></button></div></article>`);
      dom.marketList.innerHTML = [...catchCards, ...goodCards].join("");
      dom.marketList.dataset.marketMode = "beach";
    }
    dom.marketList.querySelectorAll("[data-market-beach-catch]").forEach((item) => {
      const catchConfig = getBeachCatch(item.dataset.marketBeachCatch);
      const count = compo.inventory[catchConfig.id] || 0;
      const unit = Math.round(catchConfig.value * multiplier);
      totalValue += count * unit;
      const image = item.querySelector(".market-art");
      const source = beachCatchAsset(catchConfig, 3);
      if (image.getAttribute("src") !== source) image.src = source;
      item.querySelector("strong").textContent = catchConfig.name;
      item.querySelector("small").textContent = `${count} in beach basket · ${unit} shells each`;
      const button = item.querySelector("button");
      button.disabled = !count;
      button.textContent = `Sell ${count ? `all for ${count * unit}` : "when ready"}`;
    });
    dom.marketList.querySelectorAll("[data-market-beach-good]").forEach((item) => {
      const good = BEACH_GOODS.find((candidate) => candidate.id === item.dataset.marketBeachGood);
      const count = Math.floor(compo.goods[good.id] || 0);
      const unit = Math.round(good.value * multiplier);
      totalValue += count * unit;
      const image = item.querySelector(".market-art");
      const source = beachGoodIcon(good);
      if (image.getAttribute("src") !== source) image.src = source;
      item.querySelector("strong").textContent = good.name;
      if (good.cost) {
        const craftLabel = Object.entries(good.cost).map(([id, amount]) => `${amount} ${getBeachCatch(id).name.toLowerCase()}`).join(" + ");
        item.querySelector("small").textContent = `${count} crafted · ${unit} shells each · craft from ${craftLabel}`;
        const canCraft = Object.entries(good.cost).every(([id, amount]) => (compo.inventory[id] || 0) >= amount);
        const button = item.querySelector("button");
        button.dataset.craftBeachGood = good.id;
        button.disabled = !count && !canCraft;
        button.textContent = count ? `Sell all for ${count * unit}` : canCraft ? "Craft necklace" : "Need shells";
      } else {
        item.querySelector("small").textContent = `${count} produced · ${unit} shells each · sell manually`;
        const button = item.querySelector("button");
        delete button.dataset.craftBeachGood;
        button.disabled = !count;
        button.textContent = `Sell ${count ? `all for ${count * unit}` : "when produced"}`;
      }
    });
    dom.basketValue.textContent = `${formatNumber(totalValue)} shells`;
    dom.basketCopy.textContent = totalValue ? `${getTotalBeachProduce(compo)} beach items ready.` : "Fish, gather shells, craft necklaces, or grow beach lodging to stock this market.";
    dom.sellAll.disabled = totalValue <= 0;
  }

  function sellCrop(cropId) {
    const crop = getCrop(cropId);
    const count = state.inventory[cropId] || 0;
    if (!crop || !count) return;
    const earned = Math.round(count * crop.value * marketMultiplier());
    state.coins += earned;
    state.inventory[cropId] = 0;
    state.stats.sold += count;
    state.stats.earned += earned;
    addXP(Math.max(2, Math.floor(count / 2)));
    playSfx("coins");
    toast(`Main Street paid ${earned} coins for your ${crop.name.toLowerCase()}.`);
    renderAll();
    saveState();
  }

  function sellGood(goodId) {
    const good = GOODS.find((candidate) => candidate.id === goodId);
    const count = Math.floor(state.goods[goodId] || 0);
    if (!good || !count) return;
    const earned = Math.round(count * good.value * marketMultiplier());
    state.coins += earned;
    state.goods[goodId] -= count;
    state.stats.sold += count;
    state.stats.earned += earned;
    addXP(Math.max(2, Math.floor(count / 2)));
    playSfx("coins");
    toast(`Main Street paid ${earned} coins for ${count} ${good.name.toLowerCase()}.`);
    renderAll();
    saveState();
  }

  function sellAll() {
    if (isCompoActive()) {
      sellAllBeach();
      return;
    }
    const totalBefore = getTotalProduce();
    if (!totalBefore) return;
    let earned = 0;
    CROPS.forEach((crop) => {
      const count = state.inventory[crop.id] || 0;
      earned += Math.round(count * crop.value * marketMultiplier());
      state.inventory[crop.id] = 0;
    });
    GOODS.forEach((good) => {
      const count = Math.floor(state.goods[good.id] || 0);
      earned += Math.round(count * good.value * marketMultiplier());
      state.goods[good.id] -= count;
    });
    state.coins += earned;
    state.stats.sold += totalBefore;
    state.stats.earned += earned;
    addXP(Math.max(4, Math.floor(totalBefore / 2)));
    playSfx("coins");
    toast(`Sold the whole basket for ${earned} coins!`);
    renderAll();
    saveState();
  }

  function sellBeachCatch(catchId) {
    const compo = getCompo();
    const catchConfig = getBeachCatch(catchId);
    const count = compo.inventory[catchId] || 0;
    if (!catchConfig || !count) return;
    const earned = Math.round(count * catchConfig.value * beachMarketMultiplier(compo));
    compo.shells += earned;
    compo.inventory[catchId] = 0;
    addCompoXP(Math.max(2, Math.floor(count / 2)));
    playSfx("coins");
    toast(`Beach Market paid ${earned} shells for ${catchConfig.name.toLowerCase()}.`);
    renderAll();
    saveState();
  }

  function craftBeachGood(goodId) {
    const compo = getCompo();
    const good = BEACH_GOODS.find((candidate) => candidate.id === goodId);
    if (!good?.cost) return false;
    const canCraft = Object.entries(good.cost).every(([id, amount]) => (compo.inventory[id] || 0) >= amount);
    if (!canCraft) return false;
    Object.entries(good.cost).forEach(([id, amount]) => { compo.inventory[id] -= amount; });
    compo.goods[good.id] = (compo.goods[good.id] || 0) + 1;
    addCompoXP(6);
    playSfx("build");
    toast(`Crafted 1 ${good.name.toLowerCase()} for the beach market.`);
    renderAll();
    saveState();
    return true;
  }

  function sellBeachGood(goodId) {
    const compo = getCompo();
    const good = BEACH_GOODS.find((candidate) => candidate.id === goodId);
    const count = Math.floor(compo.goods[goodId] || 0);
    if (!good || !count) {
      craftBeachGood(goodId);
      return;
    }
    const earned = Math.round(count * good.value * beachMarketMultiplier(compo));
    compo.shells += earned;
    compo.goods[goodId] -= count;
    addCompoXP(Math.max(2, Math.floor(count / 2)));
    playSfx("coins");
    toast(`Beach Market paid ${earned} shells for ${count} ${good.name.toLowerCase()}.`);
    renderAll();
    saveState();
  }

  function sellAllBeach() {
    const compo = getCompo();
    const totalBefore = getTotalBeachProduce(compo);
    if (!totalBefore) return;
    let earned = 0;
    BEACH_CATCHES.forEach((catchConfig) => {
      const count = compo.inventory[catchConfig.id] || 0;
      earned += Math.round(count * catchConfig.value * beachMarketMultiplier(compo));
      compo.inventory[catchConfig.id] = 0;
    });
    BEACH_GOODS.forEach((good) => {
      const count = Math.floor(compo.goods[good.id] || 0);
      earned += Math.round(count * good.value * beachMarketMultiplier(compo));
      compo.goods[good.id] -= count;
    });
    compo.shells += earned;
    addCompoXP(Math.max(4, Math.floor(totalBefore / 2)));
    playSfx("coins");
    toast(`Sold the beach basket for ${earned} shells!`);
    renderAll();
    saveState();
  }

  function generateCompoMathQuestion() {
    const level = Math.min(6, Math.max(1, Math.ceil(state.stats.correct / 5) + learningTier()));
    const type = Math.floor(Math.random() * 5);
    let prompt, answer, skill, distractors;
    if (type === 0) {
      const lines = 2 + Math.floor(Math.random() * (2 + level));
      const bait = 3 + Math.floor(Math.random() * 6);
      answer = lines * bait;
      prompt = `Each fishing line needs ${bait} pieces of bait. How many pieces are needed for ${lines} lines?`;
      skill = "Multiplication";
      distractors = [answer + bait, answer - lines, bait + lines];
    } else if (type === 1) {
      const necklaces = 2 + Math.floor(Math.random() * 5);
      const shellsEach = 6 + Math.floor(Math.random() * 5);
      answer = necklaces * shellsEach;
      prompt = `A shell necklace uses ${shellsEach} shells. How many shells are needed for ${necklaces} necklaces?`;
      skill = "Multiplication";
      distractors = [answer + shellsEach, answer - necklaces, shellsEach + necklaces];
    } else if (type === 2) {
      const groups = 3 + Math.floor(Math.random() * 5);
      const perGroup = 4 + Math.floor(Math.random() * 7);
      const total = groups * perGroup;
      answer = perGroup;
      prompt = `${total} crabs are divided equally into ${groups} tide-pool groups. How many crabs are in each group?`;
      skill = "Division";
      distractors = [answer + 1, answer - 1, groups];
    } else if (type === 3) {
      const total = 40 * (2 + Math.floor(Math.random() * 5));
      const percent = [25, 50, 75][Math.floor(Math.random() * 3)];
      answer = total * percent / 100;
      prompt = `${percent}% of ${total} beach visitors rent gear. How many visitors rent gear?`;
      skill = "Percents";
      distractors = [total - answer, answer + 10, total / 4];
    } else {
      const base = 3 + Math.floor(Math.random() * 5);
      const boatBonus = 1 + Math.floor(Math.random() * Math.max(2, level));
      const trips = 2 + Math.floor(Math.random() * 4);
      answer = (base + boatBonus) * trips;
      prompt = `A boat trip catches ${base} fish plus ${boatBonus} bonus fish. How many fish come from ${trips} trips?`;
      skill = "Multi-step";
      distractors = [base * trips, answer - boatBonus, answer + trips];
    }
    const unique = [...new Set([answer, ...distractors].filter((value) => value >= 0))];
    while (unique.length < 4) unique.push(answer + unique.length + 2);
    return { subject: "math", prompt, hint: "Use the beach story to choose the best answer.", skill: `Compo Math · ${skill}`, answer: String(answer), choices: shuffle(unique.slice(0, 4).map(String)) };
  }

  function generateMathQuestion() {
    if (isCompoActive()) return generateCompoMathQuestion();
    const level = Math.min(6, Math.max(1, Math.ceil(state.stats.correct / 4) + learningTier()));
    const type = Math.floor(Math.random() * 5);
    let prompt, answer, skill, distractors;
    if (type === 0) {
      const denominator = [4, 5, 8, 10][Math.floor(Math.random() * 4)];
      const numerator = Math.ceil(Math.random() * (denominator - 1));
      const factor = 2 + Math.floor(Math.random() * (5 + level));
      answer = numerator * factor;
      prompt = `What is ${numerator}/${denominator} of ${denominator * factor}?`;
      skill = "Fractions";
      distractors = [answer + numerator, answer - numerator, factor * denominator];
    } else if (type === 1) {
      const price = 4 + Math.floor(Math.random() * 12);
      const count = 3 + Math.floor(Math.random() * 8);
      answer = price * count;
      prompt = `${count} market baskets cost ${price} coins each. What is the total?`;
      skill = "Multiplication";
      distractors = [answer + price, answer - count, price + count];
    } else if (type === 2) {
      const divisor = 3 + Math.floor(Math.random() * 9);
      answer = 4 + Math.floor(Math.random() * 12);
      const total = divisor * answer;
      prompt = `${total} apples are shared equally among ${divisor} tables. How many per table?`;
      skill = "Division";
      distractors = [answer + 1, answer - 1, divisor];
    } else if (type === 3) {
      const whole = 50 * (2 + Math.floor(Math.random() * 8));
      const percent = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
      answer = whole * percent / 100;
      prompt = `What is ${percent}% of ${whole}?`;
      skill = "Percents";
      distractors = [whole / percent, answer + 10, whole - answer];
    } else {
      const length = 4 + Math.floor(Math.random() * 10);
      const width = 3 + Math.floor(Math.random() * 8);
      answer = length * width;
      prompt = `A garden is ${length} feet by ${width} feet. What is its area?`;
      skill = "Geometry";
      distractors = [2 * (length + width), length + width, answer + width];
    }
    const unique = [...new Set([answer, ...distractors].filter((value) => value >= 0))];
    while (unique.length < 4) unique.push(answer + unique.length + 2);
    return { subject: "math", prompt, hint: "Choose the best answer.", skill, answer: String(answer), choices: shuffle(unique.slice(0, 4).map(String)) };
  }

  function generateChineseQuestion() {
    const words = isCompoActive() ? COMPO_CHINESE : CHINESE;
    const pool = learningTier() > 1 ? words : words.slice(0, 8);
    const word = pool[Math.floor(Math.random() * pool.length)];
    return {
      subject: "chinese",
      prompt: `What does “${word.hanzi}” mean?`,
      hint: word.pinyin,
      skill: "Intro Chinese",
      answer: word.answer,
      choices: shuffle([word.answer, ...word.distractors]),
    };
  }

  function learningTier() {
    return state.activeRegion === "compo" || getLevelInfo().level >= 4 ? 2 : 1;
  }

  function generateSocialQuestion() {
    const lessons = isCompoActive() ? COMPO_SOCIAL_LESSONS : SOCIAL_LESSONS;
    const recentKey = isCompoActive() ? "recentCompoSocial" : "recentSocial";
    const recent = Array.isArray(state[recentKey]) ? state[recentKey] : [];
    const available = lessons.filter((lesson) => lesson.tier <= learningTier()).flatMap((lesson) =>
      lesson.questions.map((question, index) => ({ ...question, id: `${lesson.id}-${index}`, passage: lesson.passage, skill: lesson.skill }))
    );
    const unseen = available.filter((question) => !recent.includes(question.id));
    const pool = unseen.length ? unseen : available;
    const question = pool[Math.floor(Math.random() * pool.length)];
    state[recentKey] = [...recent, question.id].slice(-8);
    return {
      subject: "social",
      id: question.id,
      passage: question.passage,
      prompt: question.prompt,
      hint: "Use the short reading above. The answer is stated or supported there.",
      skill: `Grade 5 Social Studies · ${question.skill}`,
      answer: question.answer,
      choices: shuffle([question.answer, ...question.distractors]),
    };
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function nextQuestion() {
    state.question = state.subject === "math" ? generateMathQuestion() : state.subject === "chinese" ? generateChineseQuestion() : generateSocialQuestion();
    dom.lessonFeedback.textContent = "";
    dom.lessonFeedback.className = "lesson-feedback";
    renderLesson();
    saveState();
  }

  function renderLesson() {
    if (!state.question) return;
    const question = state.question;
    const hasPassage = question.subject === "social" && Boolean(question.passage);
    if (isCompoActive()) {
      dom.learnRegionLabel.textContent = "Compo Learning Tent";
      dom.learnCopy.textContent = "Math earns bait, Intro Chinese earns beach wood, and Grade 5 Social Studies earns beach ore.";
      dom.rewardCopy.textContent = "Math → bait. Chinese → beach wood. Social Studies → beach ore. Correct answers also boost Beach Market sale value.";
      dom.rewardResourceList.innerHTML = `<span>∑ Math <b>Bait</b></span><span>中文 Chinese <b>Beach wood</b></span><span>⌂ Social Studies <b>Beach ore</b></span><span>🎣 Fishing <b>Shells · Supplies</b></span>`;
    } else {
      dom.learnRegionLabel.textContent = "Coleytown Learning Tent";
      dom.learnCopy.textContent = "Math earns seeds, Intro Chinese earns wood, and Grade 5 Social Studies earns ore.";
      dom.rewardCopy.textContent = "Math → seeds. Chinese → wood. Social Studies → ore. Every correct answer also adds five minutes of double market value.";
      dom.rewardResourceList.innerHTML = `<span>∑ Math <b>Seeds</b></span><span>中文 Chinese <b>Wood</b></span><span>⌂ Social Studies <b>Ore</b></span><span>🌾 Farm <b>Coins · Feed</b></span>`;
    }
    dom.lessonCard.classList.toggle("social-lesson", hasPassage);
    dom.lessonPassage.hidden = !hasPassage;
    dom.lessonPassageText.textContent = hasPassage ? question.passage : "";
    dom.questionSkill.textContent = question.skill;
    dom.questionReward.textContent = `+${learningReward().label} · ${learningBoostLabel()}`;
    dom.questionPrompt.textContent = question.prompt;
    dom.questionHint.textContent = question.hint;
    dom.answerGrid.innerHTML = question.choices.map((choice, index) => `<button class="answer-button" data-answer="${escapeHtml(choice)}" type="button"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(choice)}</button>`).join("");
    dom.streakCount.textContent = `${state.streak} correct`;
    const step = state.lessonStep % 3;
    dom.lessonProgressBar.style.width = `${step / 3 * 100}%`;
    dom.lessonProgressLabel.textContent = `${step} / 3 for bonus crate`;
    document.querySelectorAll(".lesson-tab").forEach((tab) => {
      const active = tab.dataset.subject === state.subject;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  function answerQuestion(choice, button) {
    if (!state.question || dom.answerGrid.dataset.locked === "true") return;
    dom.answerGrid.dataset.locked = "true";
    state.stats.answered += 1;
    const correct = choice === state.question.answer;
    dom.answerGrid.querySelectorAll("button").forEach((answerButton) => {
      answerButton.disabled = true;
      if (answerButton.dataset.answer === state.question.answer) answerButton.classList.add("correct");
    });
    if (correct) {
      const reward = learningReward();
      state.streak += 1;
      state.stats.correct += 1;
      state.lessonStep += 1;
      grantLearningReward(reward);
      if (state.subject === "chinese") state.stats.chineseCorrect += 1;
      if (state.subject === "social") state.stats.socialCorrect += 1;
      state.boostUntil = Math.max(Date.now(), state.boostUntil) + 5 * 60 * 1000;
      if (isCompoActive()) addCompoXP(15);
      else addXP(15);
      let message = `Correct — +${reward.label} and five minutes added to ${learningBoostLabel()} value!`;
      if (state.lessonStep % 3 === 0) {
        if (isCompoActive() && state.subject === "math") {
          getCompo().bait += 2;
          message = `Tackle crate! +${reward.label} plus 2 bonus bait.`;
        } else if (isCompoActive() && state.subject === "chinese") {
          getCompo().wood += 2;
          message = `Driftwood crate! +${reward.label} plus 2 bonus beach wood.`;
        } else if (isCompoActive()) {
          getCompo().ore += 1;
          message = `Beach works crate! +${reward.label} plus 1 bonus beach ore.`;
        } else if (state.subject === "math") {
          state.seeds += 2;
          message = `Supply crate! +${reward.label} plus 2 bonus seeds.`;
        } else if (state.subject === "chinese") {
          state.wood += 2;
          message = `Carpenter crate! +${reward.label} plus 2 bonus wood.`;
        } else {
          state.ore += 1;
          message = `Civic works crate! +${reward.label} plus 1 bonus ore.`;
        }
      }
      dom.lessonFeedback.textContent = message;
      playSfx("correct");
    } else {
      state.streak = 0;
      button.classList.add("wrong");
      dom.lessonFeedback.textContent = state.subject === "social"
        ? `Not quite. The answer is ${state.question.answer}. Re-read the short passage and notice the sentence that supports it.`
        : `Not quite. The answer is ${state.question.answer}. A new one is coming up.`;
      dom.lessonFeedback.classList.add("error");
      playSfx("wrong");
    }
    renderHUD();
    renderBoost();
    renderMarket();
    renderLessonProgressOnly();
    saveState();
    pendingTimers.push(window.setTimeout(() => {
      dom.answerGrid.dataset.locked = "false";
      nextQuestion();
    }, state.subject === "social" ? (correct ? 1500 : 3200) : (correct ? 950 : 1350)));
  }

  function renderLessonProgressOnly() {
    dom.streakCount.textContent = `${state.streak} correct`;
    const step = state.lessonStep % 3;
    dom.lessonProgressBar.style.width = `${step / 3 * 100}%`;
    dom.lessonProgressLabel.textContent = `${step} / 3 for bonus crate`;
  }

  function goalSectionHeading(kicker, title, copy) {
    return `<article class="goal-section-heading"><small>${escapeHtml(kicker)}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`;
  }

  function compoWorldComplete(compo = getCompo()) {
    return beachSpotCount(compo) >= compo.spots.length
      && Object.values(compo.buildings).every((level) => level >= MAX_BUILDING_LEVEL)
      && Object.values(compo.habitats).every((level) => level >= 3);
  }

  function globalRoadmapStatus(index) {
    if (index === 0) return riverTownComplete() || state.districts.compo ? "complete" : state.activeRegion === "coleytown" ? "active" : "future";
    if (index === 1) return compoWorldComplete() ? "complete" : state.activeRegion === "compo" || state.districts.compo ? "active" : "future";
    if (index === 2) return compoWorldComplete() ? "active" : "future";
    return "future";
  }

  function roadmapStopStatus(stops, index) {
    if (stops[index]?.complete) return "complete";
    const activeIndex = stops.findIndex((stop) => !stop.complete);
    return index === activeIndex ? "active" : "future";
  }

  function worldEvolutionRoadmapCard(kicker, title, stops) {
    return `<article class="roadmap-card world-evolution-card"><small>${escapeHtml(kicker)}</small><h3>${escapeHtml(title)}</h3><div class="roadmap-line">${stops.map((stop,index)=>`<span class="roadmap-stop ${roadmapStopStatus(stops,index)}"><i>${index+1}</i><b>${escapeHtml(stop.name)}</b><small>${escapeHtml(stop.detail)}</small></span>`).join("")}</div></article>`;
  }

  function globalRoadmapCard() {
    return `<article class="roadmap-card global-roadmap-card"><small>Long-term game progress</small><h3>Farm town → modern Westport</h3><div class="roadmap-line">${WESTPORT_ROADMAP.map((stop,index)=>`<span class="roadmap-stop ${globalRoadmapStatus(index)}"><i>${index+1}</i><b>${stop.name}</b><small>${stop.detail}</small></span>`).join("")}</div></article>`;
  }

  function renderGoals() {
    if (isCompoActive()) {
      renderBeachGoals();
      return;
    }
    dom.goalsRegionLabel.textContent = "Town project board";
    dom.goalsTitle.textContent = "What should Coleytown become?";
    dom.goalsCopy.textContent = "Buildings need sale coins, Chinese-earned wood, and Social Studies ore. Animals also need food from your fields.";
    const plotCount = unlockedPlotCount();
    const farmCost = farmExpansionCost();
    const farmProgress = farmCost ? Math.min(
      1,
      state.coins / farmCost.coins,
      farmCost.wood ? state.wood / farmCost.wood : 1,
      farmCost.ore ? state.ore / farmCost.ore : 1,
    ) * 100 : 100;
    const farmCostLabel = farmCost ? `${farmCost.coins} coins · ${farmCost.wood} wood${farmCost.ore ? ` · ${farmCost.ore} ore` : ""}` : "All six fields open";
    const farmProject = `<article class="project-card"><span class="project-icon" aria-hidden="true">🌱</span><div class="project-copy"><h3>Clear the next farm field</h3><p>${farmCost ? `Grow beyond your ${plotCount === 1 ? "single starter field" : `${plotCount} working fields`} when the town can afford it.` : "Old Hill Farm is fully cleared and ready."}</p><div class="project-progress"><span style="width:${farmProgress}%"></span></div></div><div class="project-action"><small>${farmCostLabel}</small><button data-expand-farm type="button" ${farmCost && canExpandFarm() ? "" : "disabled"}>${farmCost ? `Open field ${plotCount + 1}` : "Farm complete"}</button></div></article>`;
    const projects = Object.entries(BUILDINGS).map(([id, config]) => {
      const level = state.buildings[id];
      const unlocked = config.unlock(state);
      const building = state.construction[id];
      const targetLevel = building?.targetLevel || Math.min(MAX_BUILDING_LEVEL, level + 1);
      const installments = buildingInstallments(id, targetLevel);
      const nextStep = building ? Math.min(2, building.phase + 1) : 0;
      const due = installments[nextStep];
      const ready = building ? constructionReady(building) : true;
      const complete = level >= MAX_BUILDING_LEVEL;
      const canAfford = unlocked && !complete && ready && (building?.phase === 2 || canPay(due));
      const icon = { school: "✎", market: "⚖", bakery: "♨", library: "▤" }[id];
      const action = building
        ? building.phase === 2
          ? `Finishing · ${formatTime((building.phaseReadyAt - Date.now()) / 1000)}`
          : ready ? (building.phase === 0 ? "Supply timber frame" : "Supply final masonry") : `${constructionPhaseName(building.phase)} · ${formatTime((building.phaseReadyAt - Date.now()) / 1000)}`
        : !unlocked ? "Locked" : complete ? "Modern form complete" : level ? `Begin era ${level + 1}` : "Lay foundation";
      const requirement = id === "bakery" ? "Reach town level 2" : id === "library" ? "Upgrade the schoolhouse" : "";
      const phaseProgress = building ? Math.min(1, Math.max(0, 1 - (building.phaseReadyAt - Date.now()) / (BUILD_PHASE_SECONDS[building.phase] * 1000))) : 0;
      const progress = complete ? 100 : building ? (building.phase + phaseProgress) / 3 * 100 : level / MAX_BUILDING_LEVEL * 100;
      const dueLabel = building?.phase === 2 ? "Final work underway" : complete ? "Three eras complete" : unlocked ? `Next installment: ${costLabel(due)}` : requirement;
      return `<article class="project-card ${building ? "project-building" : ""}"><span class="project-icon" aria-hidden="true">${icon}</span><div class="project-copy"><h3>${config.name}</h3><p>${building ? `${constructionPhaseName(building.phase)} for era ${building.targetLevel}. Each stage needs time and a separate supply payment.` : unlocked ? config.effect(Math.max(1, level)) : requirement}</p><div class="project-progress"><span style="width:${progress}%"></span></div></div><div class="project-action"><small>${dueLabel}</small><button data-project="${id}" type="button" ${unlocked && (building || canAfford || complete) ? "" : "disabled"}>${action}</button></div></article>`;
    });
    const animalProjects = Object.entries(ANIMALS).map(([id, config]) => {
      const level = state.animals[id];
      const cost = animalCost(id);
      const feed = animalFeed(id);
      const growth = state.animalGrowth[id];
      const action = growth ? `Growing · ${formatTime((growth.completeAt - Date.now()) / 1000)}` : level >= 3 ? "Habitat full" : level ? "Grow the herd" : "Open habitat";
      const feedProgress = Object.entries(feed).reduce((minimum, [cropId, amount]) => Math.min(minimum, (state.inventory[cropId] || 0) / amount), 1);
      return `<article class="project-card ${growth ? "project-building" : ""}"><span class="project-icon" aria-hidden="true">${id === "chickens" ? "🐣" : "🐄"}</span><div class="project-copy"><h3>${config.name}</h3><p>${growth ? "New animals are settling in. Watch the habitat on the town map." : level ? config.effect(level) : "Build the habitat, then feed the first animals from your harvest."}</p><div class="project-progress"><span style="width:${Math.min(1,state.coins/cost,feedProgress)*100}%"></span></div></div><div class="project-action"><small>${level >= 3 ? "Complete" : `${cost} coins · ${feedLabel(feed)}`}</small><button data-animal-project="${id}" type="button" ${state.coins >= cost && hasFeed(feed) && level < 3 && !growth ? "" : "disabled"}>${action}</button></div></article>`;
    });
    const completedPieces = Object.values(state.buildings).filter((level) => level >= MAX_BUILDING_LEVEL).length + Object.values(state.animals).filter((level) => level >= 3).length + (state.plots.every((plot) => !plot?.locked) ? 1 : 0);
    const coastProgress = completedPieces / 7 * 100;
    const coastProject = `<article class="project-card expansion-project"><span class="project-icon" aria-hidden="true">☀</span><div class="project-copy"><h3>Open Compo Coast</h3><p>${state.districts.compo ? "Unlocked — switch regions on the town map to visit the coast." : "Finish all River Town buildings, habitats, and garden plots to open a whole new seaside screen."}</p><div class="project-progress"><span style="width:${state.districts.compo ? 100 : coastProgress}%"></span></div></div><div class="project-action"><small>${state.districts.compo ? "Coast unlocked" : `${completedPieces} / 7 town goals`}</small><button data-open-region="compo" type="button" ${state.districts.compo ? "" : "disabled"}>${state.districts.compo ? "Visit coast" : "Keep building"}</button></div></article>`;
    const riverStops = [
      { name: "Starter meadow", detail: "One working field and first learning rewards", complete: plotCount >= 1 },
      { name: "Working farm", detail: "More crop land and food for animals", complete: state.plots.every((plot) => !plot?.locked) },
      { name: "Main Street", detail: "Schoolhouse and market anchor the village", complete: state.buildings.school > 0 && state.buildings.market > 0 },
      { name: "Civic town", detail: "Bakery, library, chickens, and cows add life", complete: state.buildings.bakery > 0 && state.buildings.library > 0 && Object.values(state.animals).every((level) => level > 0) },
      { name: "Ready for coast", detail: "Complete every River project to open Compo", complete: riverTownComplete() },
    ];
    const riverRoadmap = worldEvolutionRoadmapCard("River Town evolution", "Empty meadow → living town", riverStops);
    const worldHeader = goalSectionHeading("World progress", "River Town progress", "Finish the farm, buildings, and habitats that make the first screen feel alive.");
    dom.projectList.innerHTML = [worldHeader, farmProject, ...projects, ...animalProjects, coastProject, riverRoadmap, globalRoadmapCard()].join("");
    const level = getLevelInfo();
    dom.milestoneName.textContent = level.capped ? "A thriving Coleytown" : level.next.name;
    dom.milestoneCopy.textContent = level.capped ? "You’ve reached the current town milestone. Keep growing!" : "Earn town XP by planting, harvesting, learning, and building.";
    dom.milestoneProgress.style.width = `${level.progress * 100}%`;
    dom.milestoneLabel.textContent = level.capped ? `${formatNumber(state.xp)} XP` : `${formatNumber(state.xp - level.current.xp)} / ${formatNumber(level.next.xp - level.current.xp)} XP`;
  }

  function renderBeachGoals() {
    const compo = getCompo();
    const spotCount = beachSpotCount(compo);
    const spotCost = beachSpotExpansionCost(compo);
    const spotProgress = spotCost ? Math.min(
      1,
      compo.shells / spotCost.shells,
      spotCost.wood ? compo.wood / spotCost.wood : 1,
      spotCost.ore ? compo.ore / spotCost.ore : 1,
    ) * 100 : 100;
    dom.goalsRegionLabel.textContent = "Compo project board";
    dom.goalsTitle.textContent = "Build Compo Beach into a seaside town.";
    dom.goalsCopy.textContent = "Beach projects use shell coins from fishing sales plus beach wood from Chinese and beach ore from Social Studies.";
    const spotProject = `<article class="project-card"><span class="project-icon" aria-hidden="true">🎣</span><div class="project-copy"><h3>Open the next fishing spot</h3><p>${spotCost ? `Add more water to work after your ${spotCount === 1 ? "starter fishing spot" : `${spotCount} fishing spots`}.` : "All Compo fishing spots are open."}</p><div class="project-progress"><span style="width:${spotProgress}%"></span></div></div><div class="project-action"><small>${spotCost ? beachCostLabel(spotCost) : "All four spots open"}</small><button data-expand-beach type="button" ${spotCost && canExpandBeachSpots(compo) ? "" : "disabled"}>${spotCost ? `Open spot ${spotCount + 1}` : "Fishing complete"}</button></div></article>`;
    const buildingProjects = Object.entries(BEACH_BUILDINGS).map(([id, config]) => {
      const level = compo.buildings[id];
      const unlocked = config.unlock(compo);
      const building = compo.construction[id];
      const targetLevel = building?.targetLevel || Math.min(MAX_BUILDING_LEVEL, level + 1);
      const installments = beachBuildingInstallments(id, targetLevel);
      const nextStep = building ? Math.min(2, building.phase + 1) : 0;
      const due = installments[nextStep];
      const ready = building ? constructionReady(building) : true;
      const complete = level >= MAX_BUILDING_LEVEL;
      const canAfford = unlocked && !complete && ready && (building?.phase === 2 || canPayBeach(due, compo));
      const icon = { towncenter: "⛳", beachmarket: "🍽", icecream: "🍦", boat: "⛵" }[id];
      const action = building
        ? building.phase === 2
          ? `Finishing · ${formatTime((building.phaseReadyAt - Date.now()) / 1000)}`
          : ready ? (building.phase === 0 ? "Supply boardwalk frame" : "Supply final beach stone") : `${constructionPhaseName(building.phase)} · ${formatTime((building.phaseReadyAt - Date.now()) / 1000)}`
        : !unlocked ? "Locked" : complete ? "Modern coast form complete" : level ? `Begin era ${level + 1}` : "Lay foundation";
      const requirement = id === "icecream" ? "Reach coast level 2" : id === "boat" ? "Requires Beach Market first; this project builds the boat." : "";
      const phaseProgress = building ? Math.min(1, Math.max(0, 1 - (building.phaseReadyAt - Date.now()) / (BUILD_PHASE_SECONDS[building.phase] * 1000))) : 0;
      const progress = complete ? 100 : building ? (building.phase + phaseProgress) / 3 * 100 : level / MAX_BUILDING_LEVEL * 100;
      const dueLabel = building?.phase === 2 ? "Final work underway" : complete ? "Three eras complete" : unlocked ? `Next installment: ${beachCostLabel(due)}` : requirement;
      return `<article class="project-card ${building ? "project-building" : ""}"><span class="project-icon" aria-hidden="true">${icon}</span><div class="project-copy"><h3>${config.name}</h3><p>${building ? `${constructionPhaseName(building.phase)} for era ${building.targetLevel}. Each stage changes the beach map and needs a later payment.` : unlocked ? config.effect(Math.max(1, level)) : requirement}</p><div class="project-progress"><span style="width:${progress}%"></span></div></div><div class="project-action"><small>${dueLabel}</small><button data-beach-project="${id}" type="button" ${unlocked && (building || canAfford || complete) ? "" : "disabled"}>${action}</button></div></article>`;
    });
    const habitatProjects = Object.entries(BEACH_HABITATS).map(([id, config]) => {
      const level = compo.habitats[id];
      const cost = beachHabitatCost(id, compo);
      const feed = beachHabitatFeed(id, compo);
      const growth = compo.habitatGrowth[id];
      const action = growth ? `Growing · ${formatTime((growth.completeAt - Date.now()) / 1000)}` : level >= 3 ? "Fully developed" : level ? "Expand lodging" : "Open lodging";
      const feedProgress = Object.entries(feed).reduce((minimum, [catchId, amount]) => Math.min(minimum, (compo.inventory[catchId] || 0) / amount), 1);
      return `<article class="project-card ${growth ? "project-building" : ""}"><span class="project-icon" aria-hidden="true">${id === "beachhouse" ? "🏖" : "🏘"}</span><div class="project-copy"><h3>${config.name}</h3><p>${growth ? "The lodging is visibly developing on the beach map." : level ? config.effect(level) : "Build lodging, then supply it with beach catches to make rental goods."}</p><div class="project-progress"><span style="width:${Math.min(1,compo.shells/cost,feedProgress)*100}%"></span></div></div><div class="project-action"><small>${level >= 3 ? "Complete" : `${cost} shells · ${beachFeedLabel(feed)}`}</small><button data-beach-habitat-project="${id}" type="button" ${compo.shells >= cost && hasBeachFeed(feed, compo) && level < 3 && !growth ? "" : "disabled"}>${action}</button></div></article>`;
    });
    const coastStops = [
      { name: "Starter shore", detail: "One fishing spot, bait, and shell sales", complete: true },
      { name: "Compo market", detail: "Restaurant, ice cream, and shell necklaces", complete: compo.buildings.beachmarket > 0 },
      { name: "Boat water", detail: "Deep-water fish and stronger yields", complete: compo.buildings.boat >= 2 },
      { name: "Beach club", detail: "Golf, tennis, pool, and winter rink", complete: compo.buildings.towncenter >= 3 },
      { name: "Modern coast", detail: "Homes, apartments, and full Compo identity", complete: compoDevelopmentCount(compo) >= 18 },
    ];
    const roadmap = worldEvolutionRoadmapCard("Compo Beach evolution", "Fishing shore → modern coast", coastStops);
    const completedPieces = (beachSpotCount(compo) >= compo.spots.length ? 1 : 0)
      + Object.values(compo.buildings).filter((level) => level >= MAX_BUILDING_LEVEL).length
      + Object.values(compo.habitats).filter((level) => level >= 3).length;
    const downtownProgress = completedPieces / 7 * 100;
    const downtownReady = compoWorldComplete(compo);
    const downtownProject = `<article class="project-card expansion-project"><span class="project-icon" aria-hidden="true">🌉</span><div class="project-copy"><h3>Open Downtown & Flag Bridge</h3><p>${downtownReady ? "Compo is complete. Downtown & Flag Bridge is the next world in the Westport roadmap." : "Finish every Compo fishing spot, beach building, and lodging project to prepare the next world."}</p><div class="project-progress"><span style="width:${downtownProgress}%"></span></div></div><div class="project-action"><small>${downtownReady ? "Next world ready" : `${completedPieces} / 7 coast goals`}</small><button data-open-next-world="downtown" type="button" ${downtownReady ? "" : "disabled"}>${downtownReady ? "Preview next" : "Keep building"}</button></div></article>`;
    const worldHeader = goalSectionHeading("World progress", "Compo Coast progress", "Build the beach economy, town center, boat, lodging, and modern coast identity.");
    dom.projectList.innerHTML = [worldHeader, spotProject, ...buildingProjects, ...habitatProjects, downtownProject, roadmap, globalRoadmapCard()].join("");
    const level = getCompoLevelInfo(compo.xp);
    dom.milestoneName.textContent = level.capped ? "A thriving Compo Coast" : level.next.name;
    dom.milestoneCopy.textContent = level.capped ? "You’ve reached the current Compo milestone. Keep building the shoreline!" : "Earn coast XP by fishing, learning, selling, crafting, and building Compo Beach.";
    dom.milestoneProgress.style.width = `${level.progress * 100}%`;
    dom.milestoneLabel.textContent = level.capped ? `${formatNumber(compo.xp)} coast XP` : `${formatNumber(compo.xp - level.current.xp)} / ${formatNumber(level.next.xp - level.current.xp)} coast XP`;
  }

  function openBuilding(id) {
    const config = BUILDINGS[id];
    if (!config) return;
    const level = state.buildings[id];
    const unlocked = config.unlock(state);
    const building = state.construction[id];
    const targetLevel = building?.targetLevel || Math.min(MAX_BUILDING_LEVEL, level + 1);
    const installments = buildingInstallments(id, targetLevel);
    const nextStep = building ? Math.min(2, building.phase + 1) : 0;
    const due = installments[nextStep];
    const ready = building ? constructionReady(building) : true;
    const complete = level >= MAX_BUILDING_LEVEL;
    const column = building ? constructionAssetStage(building) : level <= 0 ? 0 : level + 1;
    const eraNames = ["Unbuilt", "Historic form", "Expanded form", "Modern form"];
    const phaseCopy = building
      ? building.phase === 2
        ? `Final work is underway. Completion in about ${formatTime((building.phaseReadyAt - Date.now()) / 1000)}.`
        : ready
          ? `${constructionPhaseName(building.phase)} is complete. The crew is waiting for the next installment before the town changes again.`
          : `${constructionPhaseName(building.phase)} is visible on the map. This stage needs about ${formatTime((building.phaseReadyAt - Date.now()) / 1000)} more.`
      : config.description;
    const actionText = building
      ? building.phase === 2 ? "Final work underway" : !ready ? `${constructionPhaseName(building.phase)}…` : building.phase === 0 ? `Raise timber frame · ${costLabel(due)}` : `Finish with masonry · ${costLabel(due)}`
      : complete ? "Modern evolution complete" : `${level ? "Begin next era" : "Lay foundation"} · ${costLabel(due)}`;
    const actionEnabled = unlocked && !complete && (building ? building.phase < 2 && ready && canPay(due) : canPay(due));
    const budget = buildingInstallments(id, targetLevel).reduce((total, step) => ({ coins: total.coins + step.coins, wood: total.wood + step.wood, ore: total.ore + step.ore }), { coins: 0, wood: 0, ore: 0 });
    const rushCoinCost = building ? buildingRushCoinCost(building) : 0;
    const rushPanel = building && !ready
      ? `<div class="building-rush"><div><small>Speed up this stage</small><strong>Optional — later supply payments still apply</strong></div><button data-rush-building="${id}" data-rush-mode="coins" type="button" ${state.coins >= rushCoinCost ? "" : "disabled"}>Hire crew · ${rushCoinCost} coins <b>−${BUILD_RUSH.coins.seconds}s</b></button><button data-rush-building="${id}" data-rush-mode="materials" type="button" ${state.wood >= BUILD_RUSH.materials.wood && state.ore >= BUILD_RUSH.materials.ore ? "" : "disabled"}>Extra materials · ${BUILD_RUSH.materials.wood} wood + ${BUILD_RUSH.materials.ore} ore <b>−${BUILD_RUSH.materials.seconds}s</b></button></div>`
      : "";
    dom.buildingModalContent.innerHTML = `<div class="building-hero"><img class="modal-asset" src="${buildingAsset(config,column)}" alt=""></div><small>${building ? `Construction stage ${building.phase + 1} of 3` : level ? `Town building · ${eraNames[level]}` : "New town project"}</small><h2>${config.name}</h2><p class="building-description">${phaseCopy}</p><div class="building-stats"><div class="building-stat"><small>Current era</small><strong>${eraNames[level]}</strong></div><div class="building-stat"><small>${complete ? "Evolution" : "Next era benefit"}</small><strong>${complete ? "Historic → expanded → modern" : config.effect(level + 1)}</strong></div><div class="building-stat"><small>Full era budget</small><strong>${costLabel(budget)}</strong></div></div>${rushPanel}<div class="building-actions"><button class="secondary-button" data-close-modal type="button">Back to town</button><button class="primary-button" data-upgrade="${id}" type="button" ${actionEnabled ? "" : "disabled"}>${unlocked ? actionText : "Project locked"}</button></div>`;
    if (!dom.buildingModal.open) dom.buildingModal.showModal();
  }

  function upgradeBuilding(id) {
    const config = BUILDINGS[id];
    if (!config || !config.unlock(state) || state.buildings[id] >= MAX_BUILDING_LEVEL) return;
    const building = state.construction[id];
    if (!building) {
      const targetLevel = state.buildings[id] + 1;
      const due = buildingInstallments(id, targetLevel)[0];
      if (!canPay(due)) return;
      payCost(due);
      state.construction[id] = { targetLevel, phase: 0, phaseReadyAt: Date.now() + BUILD_PHASE_SECONDS[0] * 1000 };
      toast(`${config.short} foundation started. The crew will need another installment for the timber frame.`);
    } else {
      if (!constructionReady(building) || building.phase >= 2) return;
      const nextPhase = building.phase + 1;
      const due = buildingInstallments(id, building.targetLevel)[nextPhase];
      if (!canPay(due)) return;
      payCost(due);
      building.phase = nextPhase;
      building.phaseReadyAt = Date.now() + BUILD_PHASE_SECONDS[nextPhase] * 1000;
      toast(nextPhase === 1 ? `${config.short} timber frame is rising.` : `${config.short} final masonry and finish work has begun.`);
    }
    playSfx("build");
    dom.buildingModal.close();
    renderAll();
    saveState();
  }

  function openBeachBuilding(id) {
    const compo = getCompo();
    const config = BEACH_BUILDINGS[id];
    if (!config) return;
    const level = compo.buildings[id];
    const unlocked = config.unlock(compo);
    const building = compo.construction[id];
    const targetLevel = building?.targetLevel || Math.min(MAX_BUILDING_LEVEL, level + 1);
    const installments = beachBuildingInstallments(id, targetLevel);
    const nextStep = building ? Math.min(2, building.phase + 1) : 0;
    const due = installments[nextStep];
    const ready = building ? constructionReady(building) : true;
    const complete = level >= MAX_BUILDING_LEVEL;
    const column = building ? constructionAssetStage(building) : level <= 0 ? 0 : level + 1;
    const eraNames = ["Unbuilt", "Starter shore form", "Expanded beach form", "Modern Compo form"];
    const phaseCopy = building
      ? building.phase === 2
        ? `Final beach work is underway. Completion in about ${formatTime((building.phaseReadyAt - Date.now()) / 1000)}.`
        : ready
          ? `${constructionPhaseName(building.phase)} is complete. The beach crew is waiting for the next installment before the map changes again.`
          : `${constructionPhaseName(building.phase)} is visible on the Compo map. This stage needs about ${formatTime((building.phaseReadyAt - Date.now()) / 1000)} more.`
      : config.description;
    const actionText = building
      ? building.phase === 2 ? "Final work underway" : !ready ? `${constructionPhaseName(building.phase)}…` : building.phase === 0 ? `Raise boardwalk frame · ${beachCostLabel(due)}` : `Finish beach work · ${beachCostLabel(due)}`
      : complete ? "Modern evolution complete" : `${level ? "Begin next era" : "Lay foundation"} · ${beachCostLabel(due)}`;
    const actionEnabled = unlocked && !complete && (building ? building.phase < 2 && ready && canPayBeach(due, compo) : canPayBeach(due, compo));
    const budget = beachBuildingInstallments(id, targetLevel).reduce((total, step) => ({ shells: total.shells + step.shells, wood: total.wood + step.wood, ore: total.ore + step.ore }), { shells: 0, wood: 0, ore: 0 });
    const rushShellCost = building ? buildingRushCoinCost(building) : 0;
    const rushPanel = building && !ready
      ? `<div class="building-rush"><div><small>Speed up this stage</small><strong>Optional — later supply payments still apply</strong></div><button data-rush-beach-building="${id}" data-rush-mode="shells" type="button" ${compo.shells >= rushShellCost ? "" : "disabled"}>Hire beach crew · ${rushShellCost} shells <b>−${BUILD_RUSH.coins.seconds}s</b></button><button data-rush-beach-building="${id}" data-rush-mode="materials" type="button" ${compo.wood >= BUILD_RUSH.materials.wood && compo.ore >= BUILD_RUSH.materials.ore ? "" : "disabled"}>Extra beach materials · ${BUILD_RUSH.materials.wood} wood + ${BUILD_RUSH.materials.ore} ore <b>−${BUILD_RUSH.materials.seconds}s</b></button></div>`
      : "";
    dom.buildingModalContent.innerHTML = `<div class="building-hero"><img class="modal-asset" src="${beachBuildingAsset(config,column)}" alt=""></div><small>${building ? `Beach construction stage ${building.phase + 1} of 3` : level ? `Compo building · ${eraNames[level]}` : "New Compo project"}</small><h2>${config.name}</h2><p class="building-description">${phaseCopy}</p><div class="building-stats"><div class="building-stat"><small>Current era</small><strong>${eraNames[level]}</strong></div><div class="building-stat"><small>${complete ? "Evolution" : "Next era benefit"}</small><strong>${complete ? "Starter → expanded → modern" : config.effect(level + 1)}</strong></div><div class="building-stat"><small>Full era budget</small><strong>${beachCostLabel(budget)}</strong></div></div>${rushPanel}<div class="building-actions"><button class="secondary-button" data-close-modal type="button">Back to beach</button><button class="primary-button" data-upgrade-beach="${id}" type="button" ${actionEnabled ? "" : "disabled"}>${unlocked ? actionText : "Project locked"}</button></div>`;
    if (!dom.buildingModal.open) dom.buildingModal.showModal();
  }

  function upgradeBeachBuilding(id) {
    const compo = getCompo();
    const config = BEACH_BUILDINGS[id];
    if (!config || !config.unlock(compo) || compo.buildings[id] >= MAX_BUILDING_LEVEL) return;
    const building = compo.construction[id];
    if (!building) {
      const targetLevel = compo.buildings[id] + 1;
      const due = beachBuildingInstallments(id, targetLevel)[0];
      if (!canPayBeach(due, compo)) return;
      payBeachCost(due, compo);
      compo.construction[id] = { targetLevel, phase: 0, phaseReadyAt: Date.now() + BUILD_PHASE_SECONDS[0] * 1000 };
      toast(`${config.short} foundation started. The beach crew will need another installment for the frame.`);
    } else {
      if (!constructionReady(building) || building.phase >= 2) return;
      const nextPhase = building.phase + 1;
      const due = beachBuildingInstallments(id, building.targetLevel)[nextPhase];
      if (!canPayBeach(due, compo)) return;
      payBeachCost(due, compo);
      building.phase = nextPhase;
      building.phaseReadyAt = Date.now() + BUILD_PHASE_SECONDS[nextPhase] * 1000;
      toast(nextPhase === 1 ? `${config.short} boardwalk frame is rising.` : `${config.short} final beach work has begun.`);
    }
    playSfx("build");
    dom.buildingModal.close();
    renderAll();
    saveState();
  }

  function rushBeachBuilding(id, mode) {
    const compo = getCompo();
    const building = compo.construction[id];
    if (!building || constructionReady(building)) return;
    if (mode === "shells") {
      const cost = buildingRushCoinCost(building);
      if (compo.shells < cost) return;
      compo.shells -= cost;
      building.phaseReadyAt -= BUILD_RUSH.coins.seconds * 1000;
      toast(`Beach crew hired — ${BUILD_RUSH.coins.seconds} seconds removed.`);
    } else if (mode === "materials") {
      const cost = BUILD_RUSH.materials;
      if (compo.wood < cost.wood || compo.ore < cost.ore) return;
      compo.wood -= cost.wood;
      compo.ore -= cost.ore;
      building.phaseReadyAt -= cost.seconds * 1000;
      toast(`Extra beach supplies delivered — ${cost.seconds} seconds removed.`);
    } else {
      return;
    }
    playSfx("build");
    finalizeProgress(Date.now());
    renderAll();
    saveState();
    openBeachBuilding(id);
  }

  function openAnimal(id) {
    const config = ANIMALS[id];
    if (!config) return;
    const level = state.animals[id];
    const cost = animalCost(id);
    const feed = animalFeed(id);
    const growth = state.animalGrowth[id];
    dom.buildingModalContent.innerHTML = `<div class="building-hero"><img class="modal-asset" src="${animalAsset(config,level)}" alt=""></div><small>${growth ? "New arrivals on the way" : "Living farm habitat"}</small><h2>${config.name}</h2><p class="building-description">${growth ? `The habitat will visibly fill in ${formatTime((growth.completeAt-Date.now())/1000)}.` : "Grow the population by paying for the habitat and feeding animals from your own harvest."}</p><div class="building-stats"><div class="building-stat"><small>Now</small><strong>${config.labels[level]}</strong></div><div class="building-stat"><small>Feed needed</small><strong>${level >= 3 ? "Habitat complete" : feedLabel(feed)}</strong></div></div><div class="building-actions"><button class="secondary-button" data-close-modal type="button">Back to town</button><button class="primary-button" data-grow-animal="${id}" type="button" ${state.coins >= cost && hasFeed(feed) && level < 3 && !growth ? "" : "disabled"}>${growth ? "Animals growing" : level >= 3 ? "Habitat complete" : `Add animals · ${cost} coins + feed`}</button></div>`;
    dom.buildingModal.showModal();
  }

  function growAnimal(id) {
    const level = state.animals[id];
    const cost = animalCost(id);
    const feed = animalFeed(id);
    if (level >= 3 || state.coins < cost || !hasFeed(feed) || state.animalGrowth[id]) return;
    state.coins -= cost;
    consumeFeed(feed);
    state.animalGrowth[id] = { targetLevel: level + 1, completeAt: Date.now() + 150_000 };
    dom.buildingModal.close();
    playSfx("build");
    toast(`New ${id} are arriving — watch the habitat change!`);
    renderAll(); saveState();
  }

  function openBeachHabitat(id) {
    const compo = getCompo();
    const config = BEACH_HABITATS[id];
    if (!config) return;
    const level = compo.habitats[id];
    const cost = beachHabitatCost(id, compo);
    const feed = beachHabitatFeed(id, compo);
    const growth = compo.habitatGrowth[id];
    dom.buildingModalContent.innerHTML = `<div class="building-hero"><img class="modal-asset" src="${beachHabitatAsset(config,level)}" alt=""></div><small>${growth ? "Beach lodging in progress" : "Living beach lodging"}</small><h2>${config.name}</h2><p class="building-description">${growth ? `The lodging will visibly expand in ${formatTime((growth.completeAt-Date.now())/1000)}.` : "Beach houses and apartments replace farm animal habitats here. Grow them with shell coins and beach catches, then sell rental goods."}</p><div class="building-stats"><div class="building-stat"><small>Now</small><strong>${config.labels[level]}</strong></div><div class="building-stat"><small>Supplies needed</small><strong>${level >= 3 ? "Lodging complete" : beachFeedLabel(feed)}</strong></div></div><div class="building-actions"><button class="secondary-button" data-close-modal type="button">Back to beach</button><button class="primary-button" data-grow-beach-habitat="${id}" type="button" ${compo.shells >= cost && hasBeachFeed(feed, compo) && level < 3 && !growth ? "" : "disabled"}>${growth ? "Lodging growing" : level >= 3 ? "Lodging complete" : `Develop lodging · ${cost} shells + supplies`}</button></div>`;
    dom.buildingModal.showModal();
  }

  function growBeachHabitat(id) {
    const compo = getCompo();
    const level = compo.habitats[id];
    const cost = beachHabitatCost(id, compo);
    const feed = beachHabitatFeed(id, compo);
    if (level >= 3 || compo.shells < cost || !hasBeachFeed(feed, compo) || compo.habitatGrowth[id]) return;
    compo.shells -= cost;
    consumeBeachFeed(feed, compo);
    compo.habitatGrowth[id] = { targetLevel: level + 1, completeAt: Date.now() + 180_000 };
    dom.buildingModal.close();
    playSfx("build");
    toast(`${BEACH_HABITATS[id].name} is developing — watch it change on the beach!`);
    renderAll();
    saveState();
  }

  function maybeUnlockCompo() {
    if (state.districts.compo || !riverTownComplete()) return;
    state.districts.compo = true;
    addXP(100);
    playSfx("build");
    toast("Compo Coast unlocked — a whole new shoreline is ready!");
    saveState();
  }

  function setRegion(region) {
    if (region === "compo" && !state.districts.compo) {
      toast("Finish every River Town building, habitat, and garden plot to open Compo Coast.");
      return;
    }
    if (!['coleytown', 'compo'].includes(region)) return;
    setLayoutMode(false);
    clearWildlifeEvents();
    state.activeRegion = region;
    renderAll();
    if (region === "coleytown") resumeRiverWalkerMotion();
    if (region === "compo") resumeBeachWalkerMotion();
    updateGuide();
    saveState();
  }

  function finalizeProgress(now = Date.now()) {
    Object.entries(state.construction).forEach(([id, build]) => {
      if (build.phase < 2 || build.phaseReadyAt > now) return;
      state.buildings[id] = build.targetLevel; delete state.construction[id];
      addXP(50 + state.buildings[id] * 15); playSfx("build"); toast(`${BUILDINGS[id].short} reached its ${["", "historic", "expanded", "modern"][state.buildings[id]]} form — the town has changed!`);
    });
    Object.entries(state.animalGrowth).forEach(([id, growth]) => {
      if (growth.completeAt > now) return;
      state.animals[id] = growth.targetLevel; delete state.animalGrowth[id];
      addXP(20 + state.animals[id] * 6); playSfx("harvest"); toast(`${ANIMALS[id].labels[state.animals[id]]} now live in Coleytown!`);
    });
    const compo = getCompo();
    Object.entries(compo.construction).forEach(([id, build]) => {
      if (build.phase < 2 || build.phaseReadyAt > now) return;
      compo.buildings[id] = build.targetLevel;
      delete compo.construction[id];
      addCompoXP(50 + compo.buildings[id] * 15);
      playSfx("build");
      toast(`${BEACH_BUILDINGS[id].short} reached its ${["", "starter", "expanded", "modern"][compo.buildings[id]]} Compo form — the beach has changed!`);
    });
    Object.entries(compo.habitatGrowth).forEach(([id, growth]) => {
      if (growth.completeAt > now) return;
      compo.habitats[id] = growth.targetLevel;
      delete compo.habitatGrowth[id];
      addCompoXP(20 + compo.habitats[id] * 6);
      playSfx("harvest");
      toast(`${BEACH_HABITATS[id].labels[compo.habitats[id]]} now anchors Compo Beach!`);
    });
    maybeUnlockCompo();
  }

  function addXP(amount) {
    const before = getLevelInfo().level;
    state.xp += amount;
    const after = getLevelInfo().level;
    if (after > before) pendingTimers.push(window.setTimeout(() => toast(`Town level up — welcome to ${getLevelInfo().current.name}!`), 150));
  }

  function addCompoXP(amount) {
    const compo = getCompo();
    const before = getCompoLevelInfo(compo.xp).level;
    compo.xp += amount;
    const after = getCompoLevelInfo(compo.xp).level;
    if (after > before) pendingTimers.push(window.setTimeout(() => toast(`Compo Coast level up — welcome to ${getCompoLevelInfo(compo.xp).current.name}!`), 150));
  }

  function updateGuide() {
    // The old Maple tip card was intentionally removed; guidance now lives in
    // the visible crop/building/habitat states and the Farm/Goals/Learn tabs.
  }

  function clearWildlifeEvents() {
    dom.wildlifeLayer?.replaceChildren();
  }

  function scheduleWildlifeEvent(delay = 35_000 + Math.random() * 65_000) {
    if (wildlifeTimer) window.clearTimeout(wildlifeTimer);
    if (!dom.wildlifeLayer || state.settings.reduceMotion) return;
    wildlifeTimer = window.setTimeout(triggerWildlifeEvent, delay);
  }

  function triggerWildlifeEvent() {
    wildlifeTimer = null;
    const canShow = dom.app.dataset.view === "town"
      && document.visibilityState !== "hidden"
      && !layoutMode
      && !state.settings.reduceMotion;
    if (canShow) spawnWildlifeEvent(state.activeRegion === "compo" ? "dolphin" : "deer");
    scheduleWildlifeEvent(55_000 + Math.random() * 75_000);
  }

  function spawnWildlifeEvent(type) {
    if (!dom.wildlifeLayer) return;
    clearWildlifeEvents();
    const event = document.createElement("span");
    event.className = `wildlife-event wildlife-${type}`;
    const image = document.createElement("img");
    image.alt = "";
    image.src = type === "dolphin" ? "assets/art/wildlife/dolphin-leap.png" : "assets/art/wildlife/deer-run.png";
    event.append(image);
    if (type === "dolphin") {
      event.style.setProperty("--wildlife-left", `${68 + Math.random() * 13}%`);
      event.style.setProperty("--wildlife-top", `${42 + Math.random() * 8}%`);
    } else {
      event.style.setProperty("--wildlife-left", `${102 + Math.random() * 6}%`);
      event.style.setProperty("--wildlife-top", `${31 + Math.random() * 12}%`);
    }
    dom.wildlifeLayer.append(event);
    const remove = () => event.remove();
    event.addEventListener("animationend", remove, { once: true });
    window.setTimeout(remove, type === "dolphin" ? 5_500 : 7_000);
  }

  function renderAll() {
    renderHUD();
    renderWorld();
    renderFarm();
    renderMarket();
    renderGoals();
    if (state.question) {
      dom.questionReward.textContent = `+${learningReward().label} · ${learningBoostLabel()}`;
      renderLessonProgressOnly();
    }
    if (dom.app.dataset.view === "town") updateGuide();
  }

  function nearestPathIndex(position) {
    return WALK_PATH.reduce((best, node, index) => {
      const distance = Math.hypot(node.x - position.x, node.y - position.y);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  }

  function shortestPathStep(currentIndex, targetIndex, previousIndex = -1) {
    if (currentIndex === targetIndex) return currentIndex;
    const queue = [currentIndex];
    const cameFrom = new Map([[currentIndex, null]]);
    while (queue.length) {
      const nodeIndex = queue.shift();
      if (nodeIndex === targetIndex) break;
      WALK_PATH[nodeIndex].links.forEach((link) => {
        if (cameFrom.has(link)) return;
        cameFrom.set(link, nodeIndex);
        queue.push(link);
      });
    }
    if (!cameFrom.has(targetIndex)) return null;
    let step = targetIndex;
    while (cameFrom.get(step) !== currentIndex && cameFrom.get(step) !== null) step = cameFrom.get(step);
    if (step === previousIndex) {
      const alternate = WALK_PATH[currentIndex].links.find((link) => link !== previousIndex);
      return alternate ?? step;
    }
    return step;
  }

  function buildingTarget(id) {
    const position = state.layout.buildings[id];
    return position ? nearestPathIndex({ x: position.x + 7, y: position.y + 8 }) : null;
  }

  function animalTarget(id) {
    const position = state.layout.animals[id];
    return position ? nearestPathIndex({ x: position.x + 7, y: position.y + 8 }) : null;
  }

  function readyCropTarget() {
    const now = Date.now();
    const index = state.plots.findIndex((plot) => plot?.crop && plot.readyAt <= now);
    if (index < 0) return null;
    const position = state.layout.plots[index];
    return position ? nearestPathIndex({ x: position.x + 5, y: position.y + 6 }) : null;
  }

  function activeConstructionTarget() {
    const id = Object.keys(state.construction)[0];
    return id ? buildingTarget(id) : null;
  }

  function residentDestination(person) {
    const constructionTarget = activeConstructionTarget();
    if (constructionTarget !== null && Math.random() < 0.45) return constructionTarget;
    const cropTarget = readyCropTarget();
    if (person === "farmer" && cropTarget !== null) return cropTarget;
    if (person === "vendor" && state.buildings.market > 0 && (getTotalProduce() > 0 || Math.random() < 0.35)) return buildingTarget("market");
    if (person === "teacher" && state.buildings.school > 0 && Math.random() < 0.55) return buildingTarget("school");
    if (person === "farmer" && state.animals.chickens > 0 && Math.random() < 0.35) return animalTarget("chickens");
    if (person === "farmer" && state.animals.cows > 0 && Math.random() < 0.35) return animalTarget("cows");
    const built = Object.entries(state.buildings).filter(([, level]) => level > 0).map(([id]) => id);
    if (built.length && Math.random() < 0.2) return buildingTarget(built[Math.floor(Math.random() * built.length)]);
    return null;
  }

  function walkerNextStep(element, currentIndex, previousIndex) {
    const existing = Number(element.dataset.walkTarget);
    let target = Number.isFinite(existing) ? existing : null;
    if (target === currentIndex) {
      delete element.dataset.walkTarget;
      target = null;
    }
    if (target === null && Math.random() < 0.42) {
      target = residentDestination(element.dataset.walker);
      if (target !== null) element.dataset.walkTarget = String(target);
    }
    if (target !== null) {
      const step = shortestPathStep(currentIndex, target, previousIndex);
      if (step !== null) return step;
      delete element.dataset.walkTarget;
    }
    const current = WALK_PATH[currentIndex];
    const choices = current.links.filter((index) => index !== previousIndex);
    const pool = choices.length ? choices : current.links;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function scheduleWalker(element, currentIndex, previousIndex = -1, delay = 0) {
    window.clearTimeout(walkerTimers.get(element));
    const timer = window.setTimeout(() => {
      if (state.settings.reduceMotion || state.activeRegion !== "coleytown") {
        scheduleWalker(element, currentIndex, previousIndex, 1500);
        return;
      }
      const current = WALK_PATH[currentIndex];
      const nextIndex = walkerNextStep(element, currentIndex, previousIndex);
      const next = WALK_PATH[nextIndex];
      const distance = Math.hypot(next.x - current.x, next.y - current.y);
      const duration = clamp(distance * (0.72 + Math.random() * 0.12), 4.5, 10.5);
      element.classList.toggle("walking-left", next.x < current.x);
      element.style.transitionDuration = `${duration}s`;
      element.style.zIndex = String(5 + Math.round(next.y / 12));
      element.style.left = `${next.x}%`;
      element.style.top = `${next.y}%`;
      scheduleWalker(element, nextIndex, currentIndex, duration * 1000 + 350 + Math.random() * 1250);
    }, delay);
    walkerTimers.set(element, timer);
  }

  function startWalkerRoutes() {
    const starts = { farmer: 3, vendor: 9, teacher: 14 };
    document.querySelectorAll("[data-walker]").forEach((element) => {
      const start = starts[element.dataset.walker] ?? 4;
      element.style.left = `${WALK_PATH[start].x}%`;
      element.style.top = `${WALK_PATH[start].y}%`;
      scheduleWalker(element, start, -1, 450 + Math.random() * 1800);
    });
  }

  function restartCssAnimations(selector) {
    const elements = [...document.querySelectorAll(selector)];
    elements.forEach((element) => { element.style.animation = "none"; });
    elements.forEach((element) => { void element.offsetWidth; });
    elements.forEach((element) => { element.style.animation = ""; });
  }

  function resumeRiverWalkerMotion() {
    startWalkerRoutes();
    window.requestAnimationFrame(() => restartCssAnimations(".walker-rig, .walker-leg"));
  }

  function resumeBeachWalkerMotion() {
    startBeachWalkerRoutes();
    window.requestAnimationFrame(() => restartCssAnimations(".shore-walker-frame, .shore-walker-strip"));
  }

  function beachNearestPathIndex(position) {
    return BEACH_PATH.reduce((best, node, index) => {
      const distance = Math.hypot(node.x - position.x, node.y - position.y);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  }

  function beachShortestPathStep(currentIndex, targetIndex, previousIndex = -1) {
    if (currentIndex === targetIndex) return currentIndex;
    const queue = [currentIndex];
    const cameFrom = new Map([[currentIndex, null]]);
    while (queue.length) {
      const nodeIndex = queue.shift();
      if (nodeIndex === targetIndex) break;
      BEACH_PATH[nodeIndex].links.forEach((link) => {
        if (cameFrom.has(link)) return;
        cameFrom.set(link, nodeIndex);
        queue.push(link);
      });
    }
    if (!cameFrom.has(targetIndex)) return null;
    let step = targetIndex;
    while (cameFrom.get(step) !== currentIndex && cameFrom.get(step) !== null) step = cameFrom.get(step);
    if (step === previousIndex) {
      const alternate = BEACH_PATH[currentIndex].links.find((link) => link !== previousIndex);
      return alternate ?? step;
    }
    return step;
  }

  function beachBuildingTarget(id) {
    const position = getCompo().layout.buildings[id];
    return position ? beachNearestPathIndex({ x: position.x + 6, y: position.y + 8 }) : null;
  }

  function beachHabitatTarget(id) {
    const position = getCompo().layout.habitats[id];
    return position ? beachNearestPathIndex({ x: position.x + 7, y: position.y + 8 }) : null;
  }

  function beachReadyCatchTarget() {
    const compo = getCompo();
    const now = Date.now();
    const index = compo.spots.findIndex((spot) => spot?.catchId && spot.readyAt <= now);
    if (index < 0) return null;
    const position = compo.layout.spots[index];
    return position ? beachNearestPathIndex({ x: position.x + 5, y: position.y + 5 }) : null;
  }

  function beachConstructionTarget() {
    const id = Object.keys(getCompo().construction)[0];
    return id ? beachBuildingTarget(id) : null;
  }

  function beachResidentDestination(person) {
    const constructionTarget = beachConstructionTarget();
    if (constructionTarget !== null && Math.random() < 0.42) return constructionTarget;
    const catchTarget = beachReadyCatchTarget();
    if ((person === "beach-collector" || person === "beach-crabber") && catchTarget !== null) return catchTarget;
    const compo = getCompo();
    if ((person === "beach-collector" || person === "beach-helper") && compo.buildings.beachmarket > 0 && (getTotalBeachProduce(compo) > 0 || Math.random() < 0.35)) return beachBuildingTarget("beachmarket");
    if (person === "beach-helper" && compo.buildings.towncenter > 0 && Math.random() < 0.55) return beachBuildingTarget("towncenter");
    if (person === "beach-helper" && compo.habitats.apartment > 0 && Math.random() < 0.25) return beachHabitatTarget("apartment");
    if (person === "beach-crabber" && compo.buildings.boat > 0 && Math.random() < 0.45) return beachBuildingTarget("boat");
    const built = Object.entries(compo.buildings).filter(([, level]) => level > 0).map(([id]) => id);
    if (built.length && Math.random() < 0.22) return beachBuildingTarget(built[Math.floor(Math.random() * built.length)]);
    return null;
  }

  function beachWalkerNextStep(element, currentIndex, previousIndex) {
    const existing = Number(element.dataset.walkTarget);
    let target = Number.isFinite(existing) ? existing : null;
    if (target === currentIndex) {
      delete element.dataset.walkTarget;
      target = null;
    }
    if (target === null && Math.random() < 0.44) {
      target = beachResidentDestination(element.dataset.beachWalker);
      if (target !== null) element.dataset.walkTarget = String(target);
    }
    if (target !== null) {
      const step = beachShortestPathStep(currentIndex, target, previousIndex);
      if (step !== null) return step;
      delete element.dataset.walkTarget;
    }
    const current = BEACH_PATH[currentIndex];
    const choices = current.links.filter((index) => index !== previousIndex);
    const pool = choices.length ? choices : current.links;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function scheduleBeachWalker(element, currentIndex, previousIndex = -1, delay = 0) {
    window.clearTimeout(beachWalkerTimers.get(element));
    const timer = window.setTimeout(() => {
      if (state.settings.reduceMotion || state.activeRegion !== "compo") {
        scheduleBeachWalker(element, currentIndex, previousIndex, 1500);
        return;
      }
      const current = BEACH_PATH[currentIndex];
      const nextIndex = beachWalkerNextStep(element, currentIndex, previousIndex);
      const next = BEACH_PATH[nextIndex];
      const distance = Math.hypot(next.x - current.x, next.y - current.y);
      const duration = clamp(distance * (0.95 + Math.random() * 0.18), 5.6, 13.5);
      element.classList.toggle("walking-left", next.x < current.x);
      element.style.transitionDuration = `${duration}s`;
      element.style.zIndex = String(6 + Math.round(next.y / 12));
      element.style.left = `${next.x}%`;
      element.style.top = `${next.y}%`;
      scheduleBeachWalker(element, nextIndex, currentIndex, duration * 1000 + 350 + Math.random() * 1250);
    }, delay);
    beachWalkerTimers.set(element, timer);
  }

  function startBeachWalkerRoutes() {
    const starts = { "beach-collector": 2, "beach-crabber": 6, "beach-helper": 10 };
    dom.beachWorld?.querySelectorAll("[data-beach-walker]").forEach((element) => {
      if (beachWalkerTimers.has(element)) return;
      const start = starts[element.dataset.beachWalker] ?? 3;
      element.style.left = `${BEACH_PATH[start].x}%`;
      element.style.top = `${BEACH_PATH[start].y}%`;
      scheduleBeachWalker(element, start, -1, 450 + Math.random() * 1800);
    });
  }

  function setLayoutMode(enabled) {
    layoutMode = Boolean(enabled) && (state.activeRegion === "coleytown" || state.activeRegion === "compo");
    layoutDrag = null;
    dom.worldArt.classList.toggle("layout-mode", layoutMode);
    dom.layoutButton.setAttribute("aria-pressed", String(layoutMode));
    renderWorld();
  }

  function layoutTarget(element) {
    const selector = state.activeRegion === "compo"
      ? "[data-beach-building], [data-beach-habitat], [data-beach-spot]"
      : "[data-building], [data-animal], [data-world-plot]";
    const draggable = element.closest(selector);
    if (!draggable || !dom.worldArt.contains(draggable)) return null;
    if (state.activeRegion === "compo") {
      if (draggable.dataset.beachBuilding) return { region: "compo", kind: "buildings", key: draggable.dataset.beachBuilding, element: draggable };
      if (draggable.dataset.beachHabitat) return { region: "compo", kind: "habitats", key: draggable.dataset.beachHabitat, element: draggable };
      return { region: "compo", kind: "spots", key: Number(draggable.dataset.beachSpot), element: draggable };
    }
    if (draggable.dataset.building) return { kind: "buildings", key: draggable.dataset.building, element: draggable };
    if (draggable.dataset.animal) return { kind: "animals", key: draggable.dataset.animal, element: draggable };
    return { kind: "plots", key: Number(draggable.dataset.worldPlot), element: draggable };
  }

  function beginLayoutDrag(event) {
    if (!layoutMode || event.button !== 0) return;
    const target = layoutTarget(event.target);
    if (!target) return;
    const elementRect = target.element.getBoundingClientRect();
    layoutDrag = {
      ...target,
      pointerId: event.pointerId,
      offsetX: event.clientX - elementRect.left,
      offsetY: event.clientY - elementRect.top,
    };
    dom.worldArt.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveLayoutDrag(event) {
    if (!layoutDrag || event.pointerId !== layoutDrag.pointerId) return;
    const worldRect = dom.worldArt.getBoundingClientRect();
    const elementRect = layoutDrag.element.getBoundingClientRect();
    const maxX = Math.max(0, 100 - elementRect.width / worldRect.width * 100);
    const maxY = Math.max(0, 100 - elementRect.height / worldRect.height * 100);
    const x = clamp((event.clientX - worldRect.left - layoutDrag.offsetX) / worldRect.width * 100, 0, maxX);
    const y = clamp((event.clientY - worldRect.top - layoutDrag.offsetY) / worldRect.height * 100, 4, maxY);
    const position = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    const targetLayout = layoutDrag.region === "compo" ? getCompo().layout : state.layout;
    if (layoutDrag.kind === "plots" || layoutDrag.kind === "spots") targetLayout[layoutDrag.kind][layoutDrag.key] = position;
    else targetLayout[layoutDrag.kind][layoutDrag.key] = position;
    layoutDrag.element.style.left = `${position.x}%`;
    layoutDrag.element.style.top = `${position.y}%`;
    layoutDrag.element.style.right = "auto";
    layoutDrag.element.style.bottom = "auto";
    event.preventDefault();
  }

  function finishLayoutDrag(event) {
    if (!layoutDrag || event.pointerId !== layoutDrag.pointerId) return;
    dom.worldArt.releasePointerCapture?.(event.pointerId);
    layoutDrag = null;
    saveState();
  }

  function setWhiteboardTool(tool) {
    whiteboardTool = tool === "eraser" ? "eraser" : "pen";
    const penActive = whiteboardTool === "pen";
    dom.whiteboardPen.classList.toggle("active", penActive);
    dom.whiteboardEraser.classList.toggle("active", !penActive);
    dom.whiteboardPen.setAttribute("aria-pressed", String(penActive));
    dom.whiteboardEraser.setAttribute("aria-pressed", String(!penActive));
    dom.whiteboardCanvas.classList.toggle("eraser", !penActive);
  }

  function whiteboardPoint(event) {
    const rect = dom.whiteboardCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * dom.whiteboardCanvas.width / rect.width,
      y: (event.clientY - rect.top) * dom.whiteboardCanvas.height / rect.height,
    };
  }

  function beginWhiteboardStroke(event) {
    if (event.button !== 0) return;
    whiteboardDrawing = { pointerId: event.pointerId, point: whiteboardPoint(event) };
    dom.whiteboardCanvas.setPointerCapture?.(event.pointerId);
    const context = dom.whiteboardCanvas.getContext("2d");
    context.save();
    context.globalCompositeOperation = whiteboardTool === "eraser" ? "destination-out" : "source-over";
    context.fillStyle = whiteboardTool === "eraser" ? "rgba(0,0,0,1)" : "#294f3a";
    context.beginPath();
    context.arc(whiteboardDrawing.point.x, whiteboardDrawing.point.y, whiteboardTool === "eraser" ? 13 : 2.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
    event.preventDefault();
  }

  function moveWhiteboardStroke(event) {
    if (!whiteboardDrawing || event.pointerId !== whiteboardDrawing.pointerId) return;
    const next = whiteboardPoint(event);
    const context = dom.whiteboardCanvas.getContext("2d");
    context.save();
    context.globalCompositeOperation = whiteboardTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = whiteboardTool === "eraser" ? "rgba(0,0,0,1)" : "#294f3a";
    context.lineWidth = whiteboardTool === "eraser" ? 26 : 4.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(whiteboardDrawing.point.x, whiteboardDrawing.point.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    context.restore();
    whiteboardDrawing.point = next;
    event.preventDefault();
  }

  function finishWhiteboardStroke(event) {
    if (!whiteboardDrawing || event.pointerId !== whiteboardDrawing.pointerId) return;
    dom.whiteboardCanvas.releasePointerCapture?.(event.pointerId);
    whiteboardDrawing = null;
  }

  function clearWhiteboard() {
    dom.whiteboardCanvas.getContext("2d").clearRect(0, 0, dom.whiteboardCanvas.width, dom.whiteboardCanvas.height);
  }

  function toast(message) {
    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    dom.toastRegion.appendChild(element);
    window.setTimeout(() => element.remove(), 2800);
  }

  function playSfx(type) {
    if (!state.settings.sfx) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const presets = {
        plant: [320, 430, 0.08], harvest: [520, 760, 0.12], coins: [640, 920, 0.13],
        correct: [550, 880, 0.16], wrong: [260, 190, 0.12], build: [360, 610, 0.18],
      };
      const [from, to, duration] = presets[type] || presets.plant;
      oscillator.type = type === "wrong" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(from, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(to, audioContext.currentTime + duration);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration + 0.02);
    } catch (error) { /* audio is optional */ }
  }

  function toggleMusic(enabled) {
    state.settings.music = enabled;
    if (enabled) dom.music.play().catch(() => { dom.musicToggle.checked = false; state.settings.music = false; });
    else dom.music.pause();
    saveState();
  }

  function tick() {
    const now = Date.now();
    const elapsed = Math.min(2, (now - lastTick) / 1000);
    lastTick = now;
    accrueAnimalGoods(state, elapsed);
    accrueBeachGoods(getCompo(), elapsed);
    finalizeProgress(now);
    renderHUD();
    const view = dom.app.dataset.view;
    if (view === "town") { renderWorld(); updateGuide(); }
    if (view === "farm") renderFarm();
    if (view === "market") renderMarket();
    if (view === "goals") renderGoals();
  }

  function bindEvents() {
    document.querySelectorAll("[data-view-target], [data-open-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewTarget || button.dataset.openView)));
    document.getElementById("brand-button").addEventListener("click", () => setView("town"));
    dom.worldCrops.addEventListener("click", (event) => {
      if (layoutMode) return;
      const plotButton = event.target.closest("[data-world-plot]");
      if (!plotButton) return;
      const index = Number(plotButton.dataset.worldPlot);
      const plot = state.plots[index];
      if (plot?.crop && plot.readyAt <= Date.now()) harvestPlot(index);
      else { setView("farm"); selectPlot(index); }
    });
    dom.beachWorld.addEventListener("click", (event) => {
      if (layoutMode) return;
      const spotButton = event.target.closest("[data-beach-spot]");
      if (spotButton) {
        const index = Number(spotButton.dataset.beachSpot);
        const spot = getCompo().spots[index];
        if (spot?.catchId && spot.readyAt <= Date.now()) harvestBeachSpot(index);
        else { setView("farm"); selectBeachSpot(index); }
        return;
      }
      const buildingButton = event.target.closest("[data-beach-building]");
      if (buildingButton) {
        openBeachBuilding(buildingButton.dataset.beachBuilding);
        return;
      }
      const habitatButton = event.target.closest("[data-beach-habitat]");
      if (habitatButton) openBeachHabitat(habitatButton.dataset.beachHabitat);
    });
    document.querySelectorAll("[data-animal]").forEach((habitat) => habitat.addEventListener("click", () => { if (!layoutMode) openAnimal(habitat.dataset.animal); }));
    dom.regionButtons.forEach((button) => button.addEventListener("click", () => setRegion(button.dataset.region)));
    dom.layoutButton.addEventListener("click", () => setLayoutMode(!layoutMode));
    dom.worldArt.addEventListener("pointerdown", beginLayoutDrag);
    dom.worldArt.addEventListener("pointermove", moveLayoutDrag);
    dom.worldArt.addEventListener("pointerup", finishLayoutDrag);
    dom.worldArt.addEventListener("pointercancel", finishLayoutDrag);
    dom.farmField.addEventListener("click", (event) => {
      const plot = event.target.closest("[data-plot]");
      if (plot) selectPlot(Number(plot.dataset.plot));
    });
    dom.seedList.addEventListener("click", (event) => {
      const seed = event.target.closest("[data-seed]");
      if (seed) plantCrop(seed.dataset.seed);
      const beachCatch = event.target.closest("[data-beach-catch]");
      if (beachCatch) castLine(beachCatch.dataset.beachCatch);
    });
    dom.seedClose.addEventListener("click", () => { selectedPlot = null; dom.seedDrawer.classList.remove("open"); });
    document.querySelectorAll(".lesson-tab").forEach((tab) => tab.addEventListener("click", () => {
      state.subject = tab.dataset.subject;
      state.streak = 0;
      pendingTimers.forEach(clearTimeout); pendingTimers = [];
      dom.answerGrid.dataset.locked = "false";
      nextQuestion();
    }));
    dom.whiteboardToggle.addEventListener("click", () => {
      const show = !dom.workBoard.classList.contains("show");
      dom.workBoard.classList.toggle("show", show);
      dom.whiteboardToggle.setAttribute("aria-expanded", String(show));
      dom.whiteboardToggle.textContent = show ? "Hide whiteboard" : "Open whiteboard";
    });
    dom.whiteboardPen.addEventListener("click", () => setWhiteboardTool("pen"));
    dom.whiteboardEraser.addEventListener("click", () => setWhiteboardTool("eraser"));
    dom.whiteboardClear.addEventListener("click", clearWhiteboard);
    dom.whiteboardCanvas.addEventListener("pointerdown", beginWhiteboardStroke);
    dom.whiteboardCanvas.addEventListener("pointermove", moveWhiteboardStroke);
    dom.whiteboardCanvas.addEventListener("pointerup", finishWhiteboardStroke);
    dom.whiteboardCanvas.addEventListener("pointercancel", finishWhiteboardStroke);
    dom.answerGrid.addEventListener("click", (event) => {
      const answer = event.target.closest("[data-answer]");
      if (answer) answerQuestion(answer.dataset.answer, answer);
    });
    dom.marketList.addEventListener("click", (event) => {
      const sell = event.target.closest("[data-sell]");
      if (sell) sellCrop(sell.dataset.sell);
      const sellGoodButton = event.target.closest("[data-sell-good]");
      if (sellGoodButton) sellGood(sellGoodButton.dataset.sellGood);
      const sellBeach = event.target.closest("[data-sell-beach]");
      if (sellBeach) sellBeachCatch(sellBeach.dataset.sellBeach);
      const sellBeachGoodButton = event.target.closest("[data-sell-beach-good]");
      if (sellBeachGoodButton) sellBeachGood(sellBeachGoodButton.dataset.sellBeachGood);
    });
    dom.sellAll.addEventListener("click", sellAll);
    dom.projectList.addEventListener("click", (event) => {
      if (event.target.closest("[data-expand-farm]")) expandFarm();
      if (event.target.closest("[data-expand-beach]")) expandBeachSpots();
      const project = event.target.closest("[data-project]");
      if (project) openBuilding(project.dataset.project);
      const beachProject = event.target.closest("[data-beach-project]");
      if (beachProject) openBeachBuilding(beachProject.dataset.beachProject);
      const animalProject = event.target.closest("[data-animal-project]");
      if (animalProject) openAnimal(animalProject.dataset.animalProject);
      const beachHabitatProject = event.target.closest("[data-beach-habitat-project]");
      if (beachHabitatProject) openBeachHabitat(beachHabitatProject.dataset.beachHabitatProject);
      const region = event.target.closest("[data-open-region]");
      if (region) { setView("town"); setRegion(region.dataset.openRegion); }
      const nextWorld = event.target.closest("[data-open-next-world]");
      if (nextWorld) toast("Downtown & Flag Bridge is the next world on the roadmap — coming in the next expansion.");
    });
    document.querySelectorAll("[data-building]").forEach((building) => building.addEventListener("click", () => { if (!layoutMode) openBuilding(building.dataset.building); }));
    dom.buildingModal.addEventListener("click", (event) => {
      const upgrade = event.target.closest("[data-upgrade]");
      if (upgrade) upgradeBuilding(upgrade.dataset.upgrade);
      const beachUpgrade = event.target.closest("[data-upgrade-beach]");
      if (beachUpgrade) upgradeBeachBuilding(beachUpgrade.dataset.upgradeBeach);
      const rush = event.target.closest("[data-rush-building]");
      if (rush) rushBuilding(rush.dataset.rushBuilding, rush.dataset.rushMode);
      const beachRush = event.target.closest("[data-rush-beach-building]");
      if (beachRush) rushBeachBuilding(beachRush.dataset.rushBeachBuilding, beachRush.dataset.rushMode);
      const grow = event.target.closest("[data-grow-animal]");
      if (grow) growAnimal(grow.dataset.growAnimal);
      const beachGrow = event.target.closest("[data-grow-beach-habitat]");
      if (beachGrow) growBeachHabitat(beachGrow.dataset.growBeachHabitat);
    });
    dom.settingsButton.addEventListener("click", () => dom.settingsModal.showModal());
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) event.target.closest("dialog")?.close();
    });
    [dom.buildingModal, dom.settingsModal].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
    dom.musicToggle.addEventListener("change", () => toggleMusic(dom.musicToggle.checked));
    dom.sfxToggle.addEventListener("change", () => { state.settings.sfx = dom.sfxToggle.checked; saveState(); playSfx("correct"); });
    dom.motionToggle.addEventListener("change", () => {
      state.settings.reduceMotion = dom.motionToggle.checked;
      dom.app.classList.toggle("reduce-motion", state.settings.reduceMotion);
      clearWildlifeEvents();
      if (state.settings.reduceMotion && wildlifeTimer) { window.clearTimeout(wildlifeTimer); wildlifeTimer = null; }
      if (!state.settings.reduceMotion) scheduleWildlifeEvent(20_000 + Math.random() * 40_000);
      saveState();
    });
    dom.resetButton.addEventListener("click", () => {
      if (!window.confirm("Reset Coleytown and erase the local save?")) return;
      [SAVE_KEY, ...LEGACY_SAVE_KEYS].forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    });
    dom.startButton.addEventListener("click", () => {
      state.welcomed = true;
      dom.welcomeModal.close();
      saveState();
      toast("The meadow is empty—use your three starter seeds to plant the first field!");
    });
    document.addEventListener("keydown", (event) => {
      if (event.target.closest("dialog, input, button") || event.metaKey || event.ctrlKey || event.altKey) return;
      const views = ["town", "farm", "learn", "market", "goals"];
      const index = Number(event.key) - 1;
      if (views[index]) setView(views[index]);
      if (event.key === " " && dom.app.dataset.view === "farm") { event.preventDefault(); isCompoActive() ? harvestAllBeach() : harvestAll(); }
    });
    window.addEventListener("beforeunload", saveState);
    window.addEventListener("pagehide", saveState);
    window.addEventListener("pageshow", (event) => { if (event.persisted) resumeOfflineProgress(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); else resumeOfflineProgress(); });
  }

  function initialize() {
    dom.app.dataset.view = "town";
    dom.musicToggle.checked = state.settings.music;
    dom.sfxToggle.checked = state.settings.sfx;
    dom.motionToggle.checked = state.settings.reduceMotion;
    dom.app.classList.toggle("reduce-motion", state.settings.reduceMotion);
    state.question ||= state.subject === "math" ? generateMathQuestion() : state.subject === "chinese" ? generateChineseQuestion() : generateSocialQuestion();
    bindEvents();
    renderAll();
    renderLesson();
    startWalkerRoutes();
    if (!state.welcomed) dom.welcomeModal.showModal();
    showOfflineReport(state.welcomed ? 300 : 1200);
    if (state.settings.music) toggleMusic(true);
    scheduleWildlifeEvent();
    window.setInterval(tick, TICK_MS);
    window.setInterval(saveState, 5_000);
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  initialize();
})();
