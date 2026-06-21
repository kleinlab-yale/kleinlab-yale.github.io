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

  const dom = {
    app: document.getElementById("app"),
    coinCount: document.getElementById("coin-count"),
    seedCount: document.getElementById("seed-count"),
    woodCount: document.getElementById("wood-count"),
    oreCount: document.getElementById("ore-count"),
    levelName: document.getElementById("level-name"),
    levelLabel: document.getElementById("level-label"),
    levelProgress: document.getElementById("level-progress"),
    worldArt: document.getElementById("world-art"),
    worldCrops: document.getElementById("world-crops"),
    worldProgressCopy: document.getElementById("world-progress-copy"),
    layoutButton: document.getElementById("layout-button"),
    layoutHint: document.getElementById("layout-hint"),
    regionButtons: Array.from(document.querySelectorAll("[data-region]")),
    chickenLevelMap: document.getElementById("chicken-level-map"),
    cowLevelMap: document.getElementById("cow-level-map"),
    farmField: document.getElementById("farm-field"),
    seedDrawer: document.getElementById("seed-drawer"),
    seedList: document.getElementById("seed-list"),
    seedClose: document.getElementById("seed-close"),
    focusBoost: document.getElementById("focus-boost"),
    boostLabel: document.getElementById("boost-label"),
    readyCountLabel: document.getElementById("ready-count-label"),
    quickHarvest: document.getElementById("quick-harvest-button"),
    quickBuild: document.getElementById("quick-build-button"),
    guideAction: document.getElementById("guide-action"),
    townCard: document.getElementById("town-card"),
    townCardClose: document.getElementById("town-card-close"),
    guideTitle: document.getElementById("guide-title"),
    guideCopy: document.getElementById("guide-copy"),
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
    learnReadyDot: document.getElementById("learn-ready-dot"),
    marketList: document.getElementById("market-list"),
    basketValue: document.getElementById("basket-value"),
    basketCopy: document.getElementById("basket-copy"),
    sellAll: document.getElementById("sell-all-button"),
    projectList: document.getElementById("project-list"),
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
  const walkerTimers = new Map();
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

  function initialState() {
    const now = Date.now();
    return {
      version: 7,
      coins: 35,
      seeds: 3,
      wood: 0,
      ore: 0,
      xp: 0,
      inventory: { carrot: 0, wheat: 0, pumpkin: 0, apple: 0 },
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
      districts: { compo: false },
      activeRegion: "coleytown",
      layout: {
        buildings: { school: { x: 42, y: 16 }, market: { x: 49, y: 48 }, bakery: { x: 68, y: 53 }, library: { x: 60, y: 18 } },
        animals: { chickens: { x: 8, y: 28 }, cows: { x: 23, y: 25 } },
        plots: [{ x: 7, y: 68 }, { x: 18, y: 69 }, { x: 29, y: 68 }, { x: 40, y: 69 }, { x: 13, y: 52 }, { x: 28, y: 51 }],
      },
      stats: { planted: 0, harvested: 0, sold: 0, earned: 0, answered: 0, correct: 0, chineseCorrect: 0, socialCorrect: 0 },
      subject: "math",
      recentSocial: [],
      streak: 0,
      lessonStep: 0,
      boostUntil: 0,
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
        districts: { ...fresh.districts, ...(saved.districts || {}) },
        layout: {
          buildings: { ...fresh.layout.buildings, ...(saved.layout?.buildings || {}) },
          animals: { ...fresh.layout.animals, ...(saved.layout?.animals || {}) },
          plots: Array.isArray(saved.layout?.plots) ? saved.layout.plots : fresh.layout.plots,
        },
        stats: { ...fresh.stats, ...(saved.stats || {}) },
        settings: { ...fresh.settings, ...(saved.settings || {}) },
        plots: Array.isArray(saved.plots) ? saved.plots.slice(0, 6) : fresh.plots,
        recentSocial: Array.isArray(saved.recentSocial) ? saved.recentSocial.slice(-8) : fresh.recentSocial,
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
    };
    const produced = accrueAnimalGoods(target, productionElapsed / 1000 * OFFLINE_EFFICIENCY);
    report.goods.eggs += produced.eggs;
    report.goods.milk += produced.milk;

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

  function getCrop(id) { return CROPS.find((crop) => crop.id === id); }

  function getLevelInfo(xp = state.xp) {
    let index = 0;
    for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].xp) index = i;
    const current = LEVELS[index];
    const next = LEVELS[Math.min(index + 1, LEVELS.length - 1)];
    const capped = index === LEVELS.length - 1;
    const progress = capped ? 1 : (xp - current.xp) / (next.xp - current.xp);
    return { level: index + 1, current, next, progress: clamp(progress, 0, 1), capped };
  }

  function getTotalProduce() {
    return Object.values(state.inventory).reduce((sum, value) => sum + value, 0) + Object.values(state.goods).reduce((sum, value) => sum + Math.floor(value), 0);
  }

  function isBoostActive() { return Date.now() < state.boostUntil; }

  function marketMultiplier() {
    return (isBoostActive() ? 2 : 1) * (1 + state.buildings.market * 0.08 + state.buildings.bakery * 0.12);
  }

  function learningReward() {
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

  const CROP_STATES = ["soil", "sprout", "young", "mature"];
  const BUILDING_STATES = ["foundation", "construction", "level-1", "level-2", "level-3"];
  const ANIMAL_STATES = ["empty", "young", "adult", "full"];
  function cropAsset(crop, stage) { return `assets/art/living-world/crops/${crop.artKey}-${CROP_STATES[clamp(stage,0,3)]}.png`; }
  function buildingAsset(config, stage) { return `assets/art/living-world/buildings/${config.artKey}-${BUILDING_STATES[clamp(stage,0,3)]}.png`; }
  function animalAsset(config, stage) { return `assets/art/living-world/animals/${config.artKey}-${ANIMAL_STATES[clamp(stage,0,3)]}.png`; }

  function cropStage(plot, now = Date.now()) {
    if (!plot?.crop) return 0;
    const progress = clamp((now - plot.plantedAt) / (plot.readyAt - plot.plantedAt), 0, 1);
    if (progress >= 1) return 3;
    if (progress >= 0.72) return 2;
    if (progress >= 0.22) return 1;
    return 0;
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
    dom.app.dataset.view = view;
    document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
    document.querySelectorAll(".nav-button").forEach((button) => {
      const active = button.dataset.viewTarget === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (view !== "farm") dom.seedDrawer.classList.remove("open");
    if (view === "learn" && !state.question) nextQuestion();
    if (view === "town") updateGuide();
    if (view === "farm") renderFarm();
    if (view === "market") renderMarket();
    if (view === "goals") renderGoals();
  }

  function renderHUD() {
    dom.coinCount.textContent = formatNumber(state.coins);
    dom.seedCount.textContent = formatNumber(state.seeds);
    dom.woodCount.textContent = formatNumber(state.wood);
    dom.oreCount.textContent = formatNumber(state.ore);
    const level = getLevelInfo();
    dom.levelName.textContent = level.current.name;
    dom.levelLabel.textContent = `Level ${level.level}`;
    dom.levelProgress.style.width = `${level.progress * 100}%`;
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
    dom.readyCountLabel.textContent = `${readyCount} ${readyCount === 1 ? "plot" : "plots"}`;
    dom.quickHarvest.classList.toggle("ready", readyCount > 0);
    dom.quickHarvest.disabled = readyCount === 0;
    dom.quickHarvest.setAttribute("aria-label", readyCount ? `Harvest ${readyCount} ready ${readyCount === 1 ? "plot" : "plots"}` : "No crops are ready to harvest");
    return readyCount;
  }

  function renderWorld() {
    const now = Date.now();
    dom.worldArt.dataset.region = state.activeRegion;
    dom.regionButtons.forEach((button) => {
      const region = button.dataset.region;
      button.classList.toggle("active", region === state.activeRegion);
      button.disabled = region === "compo" && !state.districts.compo;
      if (region === "compo") button.textContent = state.districts.compo ? "Compo Coast" : "🔒 Compo Coast";
    });
    dom.layoutButton.innerHTML = layoutMode ? `<span>✓</span><b>Done arranging</b>` : `<span>✥</span><b>Arrange town</b>`;
    dom.worldArt.classList.toggle("layout-mode", layoutMode);
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
    const modernResidents = state.districts.compo || Object.values(state.buildings).filter((level) => level >= MAX_BUILDING_LEVEL).length >= 2;
    dom.worldArt.dataset.residentEra = modernResidents ? "modern" : "historic";
    document.querySelectorAll("[data-walker]").forEach((walker) => {
      const era = modernResidents ? "-modern" : "";
      const prefix = `assets/art/people/${walker.dataset.walker}${era}-rig`;
      const sources = [
        [walker.querySelector(".walker-torso"), `${prefix}-torso.png`],
        [walker.querySelector(".walker-leg-front"), `${prefix}-leg-1.png`],
        [walker.querySelector(".walker-leg-back"), `${prefix}-leg-2.png`],
      ];
      sources.forEach(([image, source]) => { if (image && image.getAttribute("src") !== source) image.src = source; });
    });
    dom.worldProgressCopy.textContent = `${developmentCount()} town pieces built`;
  }

  function renderFarm() {
    const now = Date.now();
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
    const townLevel = getLevelInfo().level;
    const renderKey = `${townLevel}:${Math.floor(state.seeds)}`;
    if (dom.seedList.dataset.renderKey === renderKey) return;
    dom.seedList.dataset.renderKey = renderKey;
    dom.seedList.innerHTML = CROPS.map((crop) => {
      const levelLocked = townLevel < crop.level;
      const poor = state.seeds < crop.seedCost;
      const locked = levelLocked || poor;
      const note = levelLocked ? `Unlocks at town level ${crop.level}` : `${formatTime(crop.duration)} · yields ${crop.yield}`;
      return `<button class="seed-option" data-seed="${crop.id}" type="button" ${locked ? "disabled" : ""}><img class="seed-art" src="${cropAsset(crop,3)}" alt=""><span class="seed-copy"><strong>${crop.name}</strong><small>${note}</small></span><span class="seed-price">${crop.seedCost} ${crop.seedCost === 1 ? "seed" : "seeds"}<small>${crop.value} coins each</small></span></button>`;
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
    if (!crop || state.seeds < crop.seedCost || getLevelInfo().level < crop.level) return;
    const now = Date.now();
    state.seeds -= crop.seedCost;
    state.plots[selectedPlot] = { crop: crop.id, plantedAt: now, readyAt: now + crop.duration * 1000 };
    state.stats.planted += 1;
    addXP(3);
    playSfx("plant");
    toast(`${crop.name} planted — ready in ${formatTime(crop.duration)}.`);
    selectedPlot = null;
    dom.seedDrawer.classList.remove("open");
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
    const multiplier = marketMultiplier();
    let totalValue = 0;
    const itemCount = CROPS.length + GOODS.length;
    if (dom.marketList.children.length !== itemCount) {
      const cropCards = CROPS.map((crop) => `<article class="market-item" data-market-crop="${crop.id}"><img class="market-art" alt=""><div class="market-item-copy"><strong></strong><small></small><button data-sell="${crop.id}" type="button"></button></div></article>`);
      const goodsCards = GOODS.map((good) => `<article class="market-item" data-market-good="${good.id}"><img class="market-art" alt=""><div class="market-item-copy"><strong></strong><small></small><button data-sell-good="${good.id}" type="button"></button></div></article>`);
      dom.marketList.innerHTML = [...cropCards, ...goodsCards].join("");
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

  function generateMathQuestion() {
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
    const pool = learningTier() > 1 ? CHINESE : CHINESE.slice(0, 8);
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
    const available = SOCIAL_LESSONS.filter((lesson) => lesson.tier <= learningTier()).flatMap((lesson) =>
      lesson.questions.map((question, index) => ({ ...question, id: `${lesson.id}-${index}`, passage: lesson.passage, skill: lesson.skill }))
    );
    const unseen = available.filter((question) => !state.recentSocial.includes(question.id));
    const pool = unseen.length ? unseen : available;
    const question = pool[Math.floor(Math.random() * pool.length)];
    state.recentSocial = [...state.recentSocial, question.id].slice(-8);
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
    dom.lessonCard.classList.toggle("social-lesson", hasPassage);
    dom.lessonPassage.hidden = !hasPassage;
    dom.lessonPassageText.textContent = hasPassage ? question.passage : "";
    dom.questionSkill.textContent = question.skill;
    dom.questionReward.textContent = `+${learningReward().label} · 2× market`;
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
      state[reward.type] += reward.amount;
      if (state.subject === "chinese") state.stats.chineseCorrect += 1;
      if (state.subject === "social") state.stats.socialCorrect += 1;
      state.boostUntil = Math.max(Date.now(), state.boostUntil) + 5 * 60 * 1000;
      addXP(15);
      let message = `Correct — +${reward.label} and five minutes added to 2× market value!`;
      if (state.lessonStep % 3 === 0) {
        if (state.subject === "math") {
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

  function renderGoals() {
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
    const roadmap = `<article class="roadmap-card"><small>Long-term world map</small><h3>Farm town → modern Westport</h3><div class="roadmap-line">${WESTPORT_ROADMAP.map((stop,index)=>`<span class="roadmap-stop ${index === 0 ? "complete" : index === 1 && state.districts.compo ? "complete" : stop.status}"><i>${index+1}</i><b>${stop.name}</b><small>${stop.detail}</small></span>`).join("")}</div></article>`;
    dom.projectList.innerHTML = [farmProject, ...projects, ...animalProjects, coastProject, roadmap].join("");
    const level = getLevelInfo();
    dom.milestoneName.textContent = level.capped ? "A thriving Coleytown" : level.next.name;
    dom.milestoneCopy.textContent = level.capped ? "You’ve reached the current town milestone. Keep growing!" : "Earn town XP by planting, harvesting, learning, and building.";
    dom.milestoneProgress.style.width = `${level.progress * 100}%`;
    dom.milestoneLabel.textContent = level.capped ? `${formatNumber(state.xp)} XP` : `${formatNumber(state.xp - level.current.xp)} / ${formatNumber(level.next.xp - level.current.xp)} XP`;
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
    state.activeRegion = region;
    renderWorld();
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
    maybeUnlockCompo();
  }

  function addXP(amount) {
    const before = getLevelInfo().level;
    state.xp += amount;
    const after = getLevelInfo().level;
    if (after > before) pendingTimers.push(window.setTimeout(() => toast(`Town level up — welcome to ${getLevelInfo().current.name}!`), 150));
  }

  function updateGuide() {
    if (state.activeRegion === "compo") {
      dom.guideTitle.textContent = "Compo Coast is the next chapter.";
      dom.guideCopy.textContent = "This separate shoreline is ready for future beach, recreation, and neighborhood buildings—without crowding River Town.";
      dom.guideAction.firstChild.textContent = "Return to River Town ";
      dom.guideAction.dataset.destination = "town";
      return;
    }
    const ready = state.plots.filter((plot) => plot?.crop && plot.readyAt <= Date.now()).length;
    const activeBuild = Object.keys(state.construction)[0];
    if (activeBuild) {
      dom.guideTitle.textContent = `${BUILDINGS[activeBuild].short} is taking shape!`;
      const build = state.construction[activeBuild];
      dom.guideCopy.textContent = constructionReady(build) && build.phase < 2 ? "This stage is finished. Visit Goals to supply the next paid construction stage." : "Watch the foundation become a timber frame, then return with more coins and materials for the next stage.";
      dom.guideAction.firstChild.textContent = "View construction ";
      dom.guideAction.dataset.destination = "town";
    } else if (ready) {
      dom.guideTitle.textContent = `${ready} crop ${ready === 1 ? "is" : "are"} ready!`;
      dom.guideCopy.textContent = "The harvest is waiting at Old Hill Farm. Gather it, then trade it on Main Street.";
      dom.guideAction.firstChild.textContent = "Harvest now ";
      dom.guideAction.dataset.destination = "farm";
    } else if (getTotalProduce()) {
      dom.guideTitle.textContent = "The market is bustling.";
      dom.guideCopy.textContent = "Sell your harvest for the coins used by every building and animal project.";
      dom.guideAction.firstChild.textContent = "Visit the market ";
      dom.guideAction.dataset.destination = "market";
    } else if (!state.plots.some((plot) => plot?.crop) && state.seeds > 0) {
      dom.guideTitle.textContent = "Plant the first field.";
      dom.guideCopy.textContent = `You have ${state.seeds} starter seeds—enough to begin before doing a lesson.`;
      dom.guideAction.firstChild.textContent = "Choose a crop ";
      dom.guideAction.dataset.destination = "farm";
    } else if (state.seeds < 2) {
      dom.guideTitle.textContent = "Math grows new seeds.";
      dom.guideCopy.textContent = "Answer a short grade 5–6 problem to refill the seed basket and keep the farm moving.";
      dom.guideAction.firstChild.textContent = "Try a challenge ";
      dom.guideAction.dataset.destination = "learn";
    } else if (state.wood < 4) {
      dom.guideTitle.textContent = "Chinese supplies the carpenters.";
      dom.guideCopy.textContent = "Intro Chinese answers earn wood for timber frames and future building stages.";
      dom.guideAction.firstChild.textContent = "Earn wood ";
      dom.guideAction.dataset.destination = "learn";
    } else if (state.ore < 2) {
      dom.guideTitle.textContent = "Social Studies supplies civic works.";
      dom.guideCopy.textContent = "Grade 5 history, geography, and civics answers earn ore for masonry and final construction.";
      dom.guideAction.firstChild.textContent = "Earn materials ";
      dom.guideAction.dataset.destination = "learn";
    } else {
      dom.guideTitle.textContent = "The fields are waking up!";
      dom.guideCopy.textContent = "Plant a few crops, then visit the market to turn your harvest into your first town improvements.";
      dom.guideAction.firstChild.textContent = "Visit the farm ";
      dom.guideAction.dataset.destination = "farm";
    }
  }

  function renderAll() {
    renderHUD();
    renderWorld();
    renderFarm();
    renderMarket();
    renderGoals();
    if (state.question) {
      dom.questionReward.textContent = `+${learningReward().label} · 2× market`;
      renderLessonProgressOnly();
    }
    if (dom.app.dataset.view === "town") updateGuide();
  }

  function scheduleWalker(element, currentIndex, previousIndex = -1, delay = 0) {
    window.clearTimeout(walkerTimers.get(element));
    const timer = window.setTimeout(() => {
      if (state.settings.reduceMotion || state.activeRegion !== "coleytown") {
        scheduleWalker(element, currentIndex, previousIndex, 1500);
        return;
      }
      const current = WALK_PATH[currentIndex];
      const choices = current.links.filter((index) => index !== previousIndex);
      const pool = choices.length ? choices : current.links;
      const nextIndex = pool[Math.floor(Math.random() * pool.length)];
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

  function setLayoutMode(enabled) {
    layoutMode = Boolean(enabled) && state.activeRegion === "coleytown";
    layoutDrag = null;
    dom.worldArt.classList.toggle("layout-mode", layoutMode);
    dom.layoutButton.setAttribute("aria-pressed", String(layoutMode));
    renderWorld();
  }

  function layoutTarget(element) {
    const draggable = element.closest("[data-building], [data-animal], [data-world-plot]");
    if (!draggable || !dom.worldArt.contains(draggable)) return null;
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
    if (layoutDrag.kind === "plots") state.layout.plots[layoutDrag.key] = position;
    else state.layout[layoutDrag.kind][layoutDrag.key] = position;
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
    dom.guideAction.addEventListener("click", () => {
      if (state.activeRegion === "compo") setRegion("coleytown");
      else setView(dom.guideAction.dataset.destination || "farm");
    });
    dom.townCardClose.addEventListener("click", () => dom.townCard.classList.add("hidden"));
    dom.quickHarvest.addEventListener("click", () => { harvestAll(); setView("farm"); });
    dom.quickBuild.addEventListener("click", () => setView("goals"));
    dom.worldCrops.addEventListener("click", (event) => {
      if (layoutMode) return;
      const plotButton = event.target.closest("[data-world-plot]");
      if (!plotButton) return;
      const index = Number(plotButton.dataset.worldPlot);
      const plot = state.plots[index];
      if (plot?.crop && plot.readyAt <= Date.now()) harvestPlot(index);
      else { setView("farm"); selectPlot(index); }
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
    });
    dom.sellAll.addEventListener("click", sellAll);
    dom.projectList.addEventListener("click", (event) => {
      if (event.target.closest("[data-expand-farm]")) expandFarm();
      const project = event.target.closest("[data-project]");
      if (project) openBuilding(project.dataset.project);
      const animalProject = event.target.closest("[data-animal-project]");
      if (animalProject) openAnimal(animalProject.dataset.animalProject);
      const region = event.target.closest("[data-open-region]");
      if (region) { setView("town"); setRegion(region.dataset.openRegion); }
    });
    document.querySelectorAll("[data-building]").forEach((building) => building.addEventListener("click", () => { if (!layoutMode) openBuilding(building.dataset.building); }));
    dom.buildingModal.addEventListener("click", (event) => {
      const upgrade = event.target.closest("[data-upgrade]");
      if (upgrade) upgradeBuilding(upgrade.dataset.upgrade);
      const rush = event.target.closest("[data-rush-building]");
      if (rush) rushBuilding(rush.dataset.rushBuilding, rush.dataset.rushMode);
      const grow = event.target.closest("[data-grow-animal]");
      if (grow) growAnimal(grow.dataset.growAnimal);
    });
    dom.settingsButton.addEventListener("click", () => dom.settingsModal.showModal());
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) event.target.closest("dialog")?.close();
    });
    [dom.buildingModal, dom.settingsModal].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
    dom.musicToggle.addEventListener("change", () => toggleMusic(dom.musicToggle.checked));
    dom.sfxToggle.addEventListener("change", () => { state.settings.sfx = dom.sfxToggle.checked; saveState(); playSfx("correct"); });
    dom.motionToggle.addEventListener("change", () => { state.settings.reduceMotion = dom.motionToggle.checked; dom.app.classList.toggle("reduce-motion", state.settings.reduceMotion); saveState(); });
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
      if (event.key === " " && dom.app.dataset.view === "farm") { event.preventDefault(); harvestAll(); }
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
    window.setInterval(tick, TICK_MS);
    window.setInterval(saveState, 5_000);
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  initialize();
})();
