(function () {
  const APP_BUILD_ID = "20260704-case4-library1";
  const STORAGE_KEY = "kimmy-finch-mysteries-save";
  const RESET_MARKER_KEY = "kimmy-finch-mysteries-reset-build";
  const FORCE_RESET_ON_BUILD = "20260704-shell1";
  const LEGACY_STORAGE_KEYS = ["kimmy-finch-mysteries-v6"];
  const TOAST_DURATION_MS = 7800;

  const CASE1_BEATS = [
    "clientInterview",
    "poppyTalked",
    "bakeryClue",
    "parkTrail",
    "basilTalked",
    "caseSolved"
  ];

  const CASE2_BEATS = [
    "case2Unlocked",
    "hexibaldWarning",
    "briarWindowClue",
    "briarWindClue",
    "briarInside",
    "briarMusicClue",
    "briarVisitorTrail",
    "grandmotherMet",
    "moonMazeSolved",
    "briarPortraitClue",
    "observatoryLead"
  ];

  const CASE3_BEATS = [
    "case3Unlocked",
    "observatoryGate",
    "theoTalked",
    "moonDialClue",
    "starChartRead",
    "prismAligned",
    "archiveUnlocked",
    "case3Solved"
  ];

  const CASE4_BEATS = [
    "case4Unlocked",
    "rowanTalked",
    "librarySlipFound",
    "catalogDrawerFound",
    "libraryCipherSolved",
    "bookChuteTested",
    "quiltPatternFound",
    "case4Solved"
  ];

  const STORY = {
    title: "Kayla Finch Mysteries",
    case1Title: "Case 01: The Picnic Pet",
    case2Title: "Case 02: The Briar Lane House",
    case3Title: "Case 03: The Moonwake Observatory",
    case4Title: "Case 04: The Vanishing Blue Book",
    club: "Finch Street Mystery Club",
    intro:
      "Kayla Finch has always known two true things: she was adopted, and the Finches are her family completely. Her parents answer every question they can, but the first part of Kayla's story still has blank spaces.",
    mission:
      "What Kayla does have is a crescent locket, a notebook full of careful observations, and a brain that notices what other people walk past. Her parents call it curiosity. Kayla calls it evidence.",
    hook:
      "She built the Finch Street Mystery Club in a tree fort with maps, books, a pulley basket for urgent notes, and one best friend who believes every case deserves a proper file: Mila Gale.",
    seriesArc:
      "Neighbors bring Kayla small mysteries because she is kind, sharp, and stubborn in exactly the right way. Most cases solve someone else's problem. Every so often, one also leaves a clue about Kayla's own."
  };

  const AUDIO_CLIPS = {
    intro: "./assets/audio/intro.wav",
    mila: "./assets/audio/mila.wav",
    poppy: "./assets/audio/poppy.wav",
    basil: "./assets/audio/basil.wav",
    caseBoard: "",
    bakeryClues: "./assets/audio/bakery-clues.wav",
    parkPrints: "./assets/audio/park-prints.wav",
    locket: "./assets/audio/locket.wav",
    pickles: "",
    coaxPickles: "./assets/audio/coax-pickles.wav"
  };

  const AUDIO_MISSING_MESSAGE =
    "Voice clips are set up, but the local WAV files are not generated yet.";
  const VOICE_FEATURE_ENABLED = false;

  const ITEMS = {
    mintRibbon: {
      label: "Mint Ribbon",
      description: "A soft ribbon from Pickles' collar.",
      image: "./assets/inspect-rabbit-clues.jpg",
      inspectTitle: "Mint Ribbon",
      inspectText:
        "The ribbon smells faintly like carrot rolls and garden lavender."
    },
    carrotCrumbs: {
      label: "Carrot Crumbs",
      description: "Tiny orange crumbs from the bakery patio.",
      image: "./assets/inspect-rabbit-clues.jpg",
      inspectTitle: "Carrot Crumbs",
      inspectText:
        "Pickles probably stopped at the bakery first. These crumbs point away from the patio."
    },
    pawPrintSketch: {
      label: "Paw Print Sketch",
      description: "Kayla's quick drawing of the tiny park tracks.",
      image: "./assets/inspect-fountain-paw-prints.jpg",
      inspectTitle: "Paw Print Sketch",
      inspectText:
        "The little prints curve around the fountain and head toward the community garden gate."
    },
    pickles: {
      label: "Pickles",
      description: "A very relieved, very cute rabbit.",
      image: "./assets/pickles-rabbit.jpg",
      inspectTitle: "Pickles Found",
      inspectText:
        "Pickles is safe, cozy, and already nibbling a carrot top like nothing dramatic happened at all."
    },
    picklesBell: {
      label: "Pickles' Bell",
      description: "Mila's thank-you gift from Pickles' mint ribbon.",
      image: "./assets/case1-thank-you-mila.jpg",
      inspectTitle: "Pickles' Bell",
      inspectText:
        "Mila tied the tiny bell to a spare mint ribbon and gave it to Kayla. It rings softly enough to test delicate mechanisms without startling anyone."
    },
    fiveDollars: {
      label: "$5 Case Fee",
      description: "Mila's crinkled thank-you payment for finding Pickles.",
      image: "./assets/inspect-rabbit-clues.jpg",
      inspectTitle: "Five-Dollar Case Fee",
      inspectText:
        "The Finch Street Mystery Club's first paid case earned five dollars. Kayla tucks it away; a future clue may need bus fare, a copy fee, or a very useful snack."
    },
    briarFile: {
      label: "Briar Lane File",
      description: "Kayla's notes for the house everyone calls haunted.",
      image: "./assets/case2-exterior.jpg",
      inspectTitle: "Briar Lane File",
      inspectText:
        "Mila's warning, Mr. Hexibald's rule, glowing windows, and strange music all point to the same place: the empty old house on Briar Lane."
    },
    nurseryKey: {
      label: "Small Brass Key",
      description: "A key Mrs. Wren gives Kayla for the upstairs room.",
      image: "./assets/npc-grandmother.jpg",
      inspectTitle: "Small Brass Key",
      inspectText:
        "The key is old, polished by years of careful use, and tied with a faded lavender ribbon."
    },
    moonMazeToy: {
      label: "Moon-Maze Toy",
      description: "An old wooden maze toy from the nursery drawer.",
      image: "./assets/mini-moon-maze.jpg",
      inspectTitle: "Moon-Maze Toy",
      inspectText:
        "The wooden toy has brass moon rails and a tiny blue bead. A hidden drawer edge waits near the crescent-shaped finish."
    },
    heightMarkSketch: {
      label: "Height Mark Sketch",
      description: "Kayla's copy of the old 17-inch mark in the girls' room.",
      image: "./assets/mini-moon-maze.jpg",
      inspectTitle: "Height Mark Sketch",
      inspectText:
        "Kayla copied the little 17-inch mark from the nursery doorframe. It is too small for her now, but the number feels saved for a reason."
    },
    maraPortraitCopy: {
      label: "Faded Portrait Copy",
      description: "A copy of the portrait of a woman who looks like Kayla.",
      image: "./assets/inspect-mara-portrait.jpg",
      inspectTitle: "Faded Portrait Copy",
      inspectText:
        "The young woman in the portrait has Kayla's eyes and a crescent locket. Kayla does not know the name Mara yet, but the satchel keeps the question safe."
    },
    starChart: {
      label: "Mrs. Wren's Star Chart",
      description: "A folded chart pointing toward Moonwake Observatory.",
      image: "./assets/case2-observatory-handoff.jpg",
      inspectTitle: "Mrs. Wren's Star Chart",
      inspectText:
        "The paper shows the Moonwake Observatory dome and three moon phases circled in old ink. Mrs. Wren would not say who drew it."
    },
    observatoryToken: {
      label: "Crescent Observatory Token",
      description: "A brass crescent token that fits an old observatory gate.",
      image: "./assets/case2-observatory-handoff.jpg",
      inspectTitle: "Crescent Observatory Token",
      inspectText:
        "The crescent shape matches Kayla's locket almost too well. One edge is notched like it belongs in a lock."
    },
    moonDialSketch: {
      label: "Moon Dial Sketch",
      description: "Kayla's sketch of the observatory's three moon dials.",
      image: "./assets/inspect-dials.jpg",
      inspectTitle: "Moon Dial Sketch",
      inspectText:
        "The dials show new moon, half moon, and full moon. Kayla labels them as a three-step sequence."
    },
    prismNote: {
      label: "Prism Note",
      description: "A note about how the observatory creates flashing signals.",
      image: "./assets/inspect-prism.jpg",
      inspectTitle: "Prism Note",
      inspectText:
        "The prism splits moonlight into bright pulses. With the right chart, the flashes become a message instead of a mystery."
    },
    archiveLedger: {
      label: "Moonwake Ledger",
      description: "A copied page from the observatory family ledger.",
      image: "./assets/inspect-archive.jpg",
      inspectTitle: "Moonwake Ledger",
      inspectText:
        "The ledger connects the Gale, Wren, and Kline names through old family branches. Kayla underlines Mila Gale and the unfamiliar Kline branch twice."
    },
    libraryCallSlip: {
      label: "Library Call Slip",
      description: "A library slip tucked inside the Moonwake ledger page.",
      image: "./assets/case4-catalog-cipher.png",
      inspectTitle: "Library Call Slip",
      inspectText:
        "The slip points Kayla to Rowan Library's local-history shelves. It feels less like a random note and more like the next breadcrumb."
    },
    cipherWheel: {
      label: "Catalog Cipher Wheel",
      description: "A brass wheel from the old card catalog.",
      image: "./assets/case4-catalog-cipher.png",
      inspectTitle: "Catalog Cipher Wheel",
      inspectText:
        "The wheel has blank brass segments and one little notch. It is built to turn a remembered name into a shelf location."
    },
    rowanKeyCard: {
      label: "Rowan Key Card",
      description: "Ms. Rowan's old archive card for the local-history room.",
      image: "./assets/npc-rowan.png",
      inspectTitle: "Rowan Key Card",
      inspectText:
        "The card does not look official anymore, but Ms. Rowan says old library doors still respect old library manners."
    },
    blueBook: {
      label: "Blue Founders Book",
      description: "The local-history book that kept vanishing from display.",
      image: "./assets/case4-history-room.png",
      inspectTitle: "Blue Founders Book",
      inspectText:
        "The blue book is not stolen. Its display stand tilts toward a hidden return chute whenever the room warms in afternoon sun."
    },
    quiltPatternSketch: {
      label: "Quilt Pattern Sketch",
      description: "Kayla's sketch of the family quilt pattern in the history room.",
      image: "./assets/case4-history-room.png",
      inspectTitle: "Quilt Pattern Sketch",
      inspectText:
        "The quilt repeats a small four-point pattern that also appears on the back of the old photograph. Kayla files it under not proof, but not nothing."
    },
    maraFileCard: {
      label: "Mara File Card",
      description: "A copied local-history card with the name Mara Kline.",
      image: "./assets/case4-catalog-cipher.png",
      inspectTitle: "Mara File Card",
      inspectText:
        "The card links the initials M.K. to the name Mara Kline. It still does not explain who Mara is to Kayla, but it gives the private file a real family name."
    }
  };

  const CLUES = {
    mila:
      "Mila is frantic: Pickles wears a mint ribbon, loves carrots, and disappeared before the picnic. She can pay five dollars if Kayla finds her.",
    bakery:
      "Bakery clue: carrot crumbs, flour paw prints, and a mint ribbon point away from the patio.",
    poppy:
      "Mrs. Poppy saw a cream-colored rabbit hop toward the park after breakfast rolls came out.",
    park:
      "Park clue: tiny paw prints curve around the fountain and continue through the garden gate.",
    basil:
      "Mr. Basil says nervous rabbits hide near lavender and come out for quiet voices, carrot tops, and familiar bells.",
    milaResemblance:
      "Long mystery clue: in the thank-you hug, Mila jokes that Mrs. Poppy says they have the same stubborn detective smile. Mrs. Poppy hears it and goes very quiet.",
    briarLane:
      "Case 02 lead: Mila feared Pickles had gone near the old Briar Lane house, where Mr. Hexibald warns kids away and someone may be sneaking in after dark.",
    hexibaldWarning:
      "Mr. Hexibald is the caretaker. He keeps kids away because the house belonged to a family who left suddenly, and he promised to protect what remains.",
    briarWindow:
      "Briar Lane clue: the glowing upper window is lamplight from someone inside, not a ghost.",
    briarWind:
      "Briar Lane clue: a loose shutter makes a hollow knocking sound when the wind changes.",
    briarMusic:
      "Briar Lane clue: the haunted tune is coming from the old piano in the living room.",
    briarVisitor:
      "Briar Lane clue: fresh footprints and a folded shawl prove a real person is visiting the house at night.",
    grandmother:
      "Case 02 answer: Mrs. Wren is the nighttime visitor. She is not haunting the house; she comes back because she loved the family who lived there.",
    moonMazeToy:
      "Briar Lane object clue: the old nursery drawer holds a wooden moon-maze toy with a hidden compartment.",
    briarPortrait:
      "Long mystery clue: a sun-faded portrait in Briar Lane House shows a young woman with Kayla's eyes and a crescent locket.",
    briarHeight:
      "Long mystery clue: the old girls' room has a 17-inch baby-height mark and a crescent pattern that feel strangely familiar.",
    observatoryLead:
      "Case 03 lead: Mrs. Wren gives Kayla a star chart and crescent token for Moonwake Observatory, where strange lights have begun flashing again.",
    observatoryGate:
      "Moonwake clue: the crescent token opens the observatory gate. The same shape appears on Kayla's locket.",
    theo:
      "Theo says the observatory flashes three times after midnight even when no one is supposed to be inside.",
    moonDial:
      "Moonwake clue: the old dials are set to new moon, half moon, and full moon. Kayla sketches the order.",
    starChart:
      "Moonwake clue: Mrs. Wren's chart matches the telescope floor rings and points to the central prism.",
    prismSignal:
      "Case 03 answer: the mysterious flashes are moonlight bouncing through a prism signal system, not magic.",
    archiveCode:
      "Moonwake code clue: the archive lock uses numbers from earlier cases: Mila's five dollars, the old height mark, and the three moon phases.",
    case3Solved:
      "Case solved: Kayla opens the Moonwake archive and finds a ledger linking Gale, Wren, and Kline family branches.",
    milaCousin:
      "Long mystery clue: the Moonwake ledger suggests Mila Gale is not only Kayla's best friend. She may be Kayla's cousin.",
    libraryLead:
      "Case 04 lead: a library call slip hidden with the Moonwake ledger points to Rowan Library's local-history room.",
    rowan:
      "Ms. Rowan asks the Mystery Club to solve a bright little library mystery: a blue local-history book keeps vanishing from display and reappearing on the return cart.",
    librarySlip:
      "Library clue: the return cart holds a blank call slip, blue book dust, and a mark from the old card catalog.",
    catalogCipher:
      "Library clue: the card catalog drawer hides a brass cipher wheel that responds to a remembered name.",
    catalogCipherSolved:
      "Secret solved: the catalog cipher opens the local-history room when Kayla sets the Kline family name from the Moonwake ledger.",
    bookChute:
      "Case 04 answer: the blue book is not being stolen. Its display stand tilts toward a hidden return chute when afternoon sun warms the shelf.",
    quiltPattern:
      "Long mystery clue: the history-room quilt repeats the same small pattern Kayla found on the back of the old photograph.",
    maraName:
      "Long mystery clue: a local-history file card connects the initials M.K. to the name Mara Kline.",
    case4Solved:
      "Case solved: Kayla fixes the vanishing-book mystery and keeps the Mara file card in her private notes.",
    nameEcho:
      "Long mystery clue: Mrs. Poppy nearly called Kayla 'Mara,' then quickly pretended she meant 'my dear.'",
    photo:
      "Long mystery clue: an old photograph in the tree fort shows a young woman who looks almost exactly like Kayla.",
    photoBacking:
      "Long mystery clue: after Kayla restores the torn photograph, the back reveals a tiny crescent stamp and the initials M.K., as if someone wanted the picture found later.",
    identity:
      "Long mystery clue: the picnic invitation stamp has a tiny crescent-and-star mark like Kayla's locket.",
    solved:
      "Case solved: Pickles was hiding safely in the community garden basket. Kayla found her by following every clue in order and earned the club's first five-dollar fee."
  };

  const NPCS = {
    mila: {
      name: "Mila Gale",
      role: "Pet Owner",
      portrait: "./assets/npc-mila.jpg",
      line:
        "Please help me, Kayla. Pickles is gone. I checked the picnic blankets and called her name and I am trying not to cry. I have five dollars if the Mystery Club can find her.",
      hint:
        "Start where snacks smell strongest. Pickles always follows her nose."
    },
    poppy: {
      name: "Mrs. Poppy Gale",
      role: "Bakery Owner",
      portrait: "./assets/npc-poppy.jpg",
      line:
        "I found flour paw prints near the patio chair, dear. A little cream rabbit sniffed the carrot rolls, then hopped toward the park. For a second I almost called you Mara. Silly old habit.",
      hint:
        "Look low to the ground. Flour tracks fade fast, but ribbon catches on chair legs."
    },
    basil: {
      name: "Mr. Basil Green",
      role: "Community Gardener",
      portrait: "./assets/npc-basil.jpg",
      line:
        "A rabbit would choose the lavender bench if the picnic felt too noisy. Move slowly, offer a carrot top, then let her hear her little bell.",
      hint:
        "Quiet first, carrot second, bell last. That order will feel safe to Pickles."
    },
    hexibald: {
      name: "Mr. Hexibald",
      role: "Briar Lane Caretaker",
      portrait: "./assets/npc-hexibald.jpg",
      line:
        "That house is not for children, not for games, and certainly not for clubs with notebooks. I keep it locked because I promised I would.",
      hint:
        "A warning is a clue about what someone wants hidden."
    },
    grandmother: {
      name: "Mrs. Wren",
      role: "Night Visitor",
      portrait: "./assets/npc-grandmother.jpg",
      line:
        "I did not mean to frighten anyone. I come here to play the old lullaby and remember a family I loved very much.",
      hint:
        "The house is not haunted. It is remembered."
    },
    theo: {
      name: "Theo",
      role: "Moonwake Junior Keeper",
      portrait: "./assets/theo-avatar.jpg",
      line:
        "The dome flashed three times last night. I checked the logbook, and nobody signed in. That means either someone forgot, or the observatory is answering old stars.",
      hint:
        "Start with the gate token, then compare the chart to the moon dials."
    },
    rowan: {
      name: "Ms. Rowan",
      role: "Librarian",
      portrait: "./assets/npc-rowan.png",
      line:
        "I have a case for your club, Kayla. A blue local-history book keeps leaving its display and turning up on the return cart. I know books wander in stories, but I prefer evidence.",
      hint:
        "Start with the return cart, then the old catalog drawer. Libraries remember where things belong."
    }
  };

  const INSPECTIONS = {
    caseBoard: {
      title: "Kayla's Case Board",
      image: "./assets/case-board-empty.jpg",
      text:
        "The tree-fort board is ready for a case, but Kayla has not pinned any Pickles clues yet."
    },
    familyPhoto: {
      title: "The Unlabeled Photograph",
      image: "./assets/inspect-family-photo.jpg",
      text:
        "The woman in the old photograph has Kayla's eyes, Kayla's thoughtful half-smile, and the same kind of crescent locket. No name, no date, no explanation."
    },
    briarClipping: {
      title: "Briar Lane File",
      image: "./assets/case2-exterior.jpg",
      text:
        "Kayla writes the first Case 02 question: if no one lives in Briar Lane House, who keeps entering after dark, turning on lights, and playing the piano?"
    },
    case1ThankYou: {
      title: "Mila's Thank-You",
      image: "./assets/case1-thank-you-mila.jpg",
      text:
        "Mila hugs Kayla and Pickles at the tree fort. Pickles' tiny bell rings between them like a new clue for the satchel."
    },
    observatoryHandoff: {
      title: "Mrs. Wren's Observatory Clue",
      image: "./assets/case2-observatory-handoff.jpg",
      text:
        "Mrs. Wren gives Kayla a folded star chart and a brass crescent token. 'The observatory will make more sense to you than it ever did to me,' she says."
    },
    bakeryClues: {
      title: "Bakery Patio Clues",
      image: "./assets/inspect-rabbit-clues.jpg",
      text:
        "Carrot crumbs, a mint ribbon, and flour paw prints make a neat little trail away from the bakery bench."
    },
    parkPrints: {
      title: "Fountain Paw Prints",
      image: "./assets/inspect-fountain-paw-prints.jpg",
      text:
        "The prints are tiny and close together. Pickles was not running; she was exploring."
    },
    locket: {
      title: "Kayla's Crescent Locket",
      image: "./assets/inspect-kimmy-locket.jpg",
      text:
        "Kayla's old locket rests beside the picnic envelope. The tiny stamp on the envelope has the same crescent-and-star curve, as if someone wanted her to notice it."
    },
    pickles: {
      title: "A Cozy Hiding Spot",
      image: "./assets/pickles-rabbit.jpg",
      text:
        "Something soft rustles near the lavender bench. A mint ribbon peeks out from the basket."
    },
    gardenRustle: {
      title: "Lavender Bench",
      image: "./assets/case1-garden.jpg",
      text:
        "The lavender bench is quiet, shady, and full of little hiding places. Kayla hears one soft rustle, then nothing. She needs the right rabbit approach before she searches closer."
    },
    hexibaldNotice: {
      title: "Mr. Hexibald's Warning",
      image: "./assets/inspect-hexibald-warning.jpg",
      text:
        "A stiff card is wired to the gate. There are no clear words left after the weather, but the careful knots look like Mr. Hexibald's work."
    },
    briarWindow: {
      title: "Glowing Upper Window",
      image: "./assets/case2-exterior.jpg",
      text:
        "The upper window glows too warmly to be moonlight. Someone inside is using a lamp."
    },
    looseShutter: {
      title: "Loose Shutter",
      image: "./assets/case2-exterior.jpg",
      text:
        "A shutter taps the wall in a perfect knock-knock pause whenever the wind slides through the gate."
    },
    pianoMusic: {
      title: "Old Piano",
      image: "./assets/case2-living-room.jpg",
      text:
        "The piano keys are dusty except for the middle notes. Someone has played the same gentle tune more than once."
    },
    briarPortrait: {
      title: "Faded Portrait",
      image: "./assets/inspect-mara-portrait.jpg",
      text:
        "The portrait is too faded to prove anything. Still, the young woman has Kayla's eyes, and a crescent locket rests at her collar."
    },
    heightMarks: {
      title: "Old Girls' Room",
      image: "./assets/case2-nursery.jpg",
      text:
        "The room has been kept gently, not cleaned. A rocking chair, a toy shelf, and tiny height marks suggest someone could not bear to let it disappear. One old pencil mark reads 17 inches, but a sliding toy panel covers the clearest view."
    },
    moonMazeToy: {
      title: "Moon-Maze Toy",
      image: "./assets/mini-moon-maze.jpg",
      text:
        "The toy is heavy for its size, carved with moon rails and tiny brass stars. The blue bead rests at the start of a maze, and the finish sits beside a hidden drawer seam."
    },
    observatoryGate: {
      title: "Moonwake Gate",
      image: "./assets/exterior.jpg",
      text:
        "The gate lock has a crescent-shaped hollow. Mrs. Wren's brass token is the right size."
    },
    moonDials: {
      title: "Moon Phase Dials",
      image: "./assets/inspect-dials.jpg",
      text:
        "Three brass dials show new moon, half moon, and full moon. Below them, a tiny plate is scratched with old numbers: 5, 17, 3."
    },
    observatoryChart: {
      title: "Star Chart Alignment",
      image: "./assets/case2-observatory-handoff.jpg",
      text:
        "The chart does not show a route through town. It shows how moonlight should travel through the observatory floor rings."
    },
    prismSignal: {
      title: "Prism Signal",
      image: "./assets/inspect-prism.jpg",
      text:
        "When Kayla lines up the chart, the prism turns moonlight into three clean flashes across the dome."
    },
    archiveLedger: {
      title: "Moonwake Family Ledger",
      image: "./assets/inspect-archive.jpg",
      text:
        "The ledger is old, careful, and full of family branches. Kayla sees Gale near Kline, and Mila's name suddenly feels much less random."
    },
    libraryCallSlip: {
      title: "Library Call Slip",
      image: "./assets/case4-catalog-cipher.png",
      text:
        "The old slip points to Rowan Library's local-history catalog. It was tucked into the Moonwake ledger like the next page of a mystery."
    },
    catalogCipher: {
      title: "Old Catalog Cipher",
      image: "./assets/case4-catalog-cipher.png",
      text:
        "The brass wheel is not a lock by itself. It needs the right family name from Kayla's newest clue: Kline."
    },
    libraryBookChute: {
      title: "Blue Book Display",
      image: "./assets/case4-history-room.png",
      text:
        "The blue book sits on a tilted stand above a narrow slot. If the shelf warms and shifts, the book could slide into a hidden return chute."
    },
    quiltPattern: {
      title: "Town Quilt Pattern",
      image: "./assets/case4-history-room.png",
      text:
        "The quilt pattern is cheerful and public, but one small shape matches the hidden backing mark from Kayla's restored photograph."
    }
  };

  const LOCATIONS = {
    clubhouse: {
      title: "Tree Fort HQ",
      subtitle: "Finch Street Maple",
      image: "./assets/treefort-clubhouse.jpg",
      lead:
        "Kayla opens the Finch Street Mystery Club from her tree-fort HQ, where books, maps, and old photographs wait for the next knock on the ladder.",
      hotspots: [
        {
          id: "club-mila",
          label: "Talk to Mila",
          x: 22,
          y: 58,
          action: openMilaHotspot
        },
        {
          id: "club-board",
          label: "Check the case board",
          x: 78,
          y: 39,
          action: openCaseBoard
        },
        {
          id: "club-photo",
          label: "Inspect old photograph",
          x: 55,
          y: 68,
          action: () =>
            openActionMenu({
              title: "Unlabeled Photograph",
              image: INSPECTIONS.familyPhoto.image,
              text:
                "The photograph is not part of the pet case, but Kayla keeps noticing the woman in it.",
              actions: [
                {
                  label: "Study the face",
                  description: "Zoom in and compare details.",
                  primary: !getFlag("familyPhotoFound"),
                  onSelect: () =>
                    openInspection("familyPhoto", {
                      actionLabel: "Add to personal file",
                      onAction: () => {
                        setFlag("familyPhotoFound");
                        addClue("photo");
                        speak(
                          "Kayla adds the old photograph to her personal file. The woman in it looks too much like her to ignore."
                        );
                      }
                    })
                },
                {
                  label: "Restore photo pieces",
                  description: "Slide the torn picture back together to check the hidden backing.",
                  requires: () => getFlag("familyPhotoFound"),
                  lockedMessage: "Kayla should study the photograph closely before rearranging its torn pieces.",
                  primary: getFlag("familyPhotoFound") && !getFlag("photoSlideSolved"),
                  onSelect: openPhotoSlidePuzzle
                },
                {
                  label: "Ignore it",
                  description: "Stay focused on Pickles.",
                  onSelect: () =>
                    speak("Kayla looks away, but the photograph keeps feeling like a clue waiting for its chapter.")
                }
              ]
            })
        },
        {
          id: "club-briar",
          label: "Open Briar Lane file",
          showWhen: () => getFlag("case2Unlocked"),
          x: 84,
          y: 52,
          action: () =>
            openActionMenu({
              title: "Briar Lane Case File",
              image: INSPECTIONS.briarClipping.image,
              text:
                "Kayla starts a new file after Mila mentions the house everyone avoids: someone entering after dark, lights in the windows, piano music, and Mr. Hexibald's warning at the gate.",
              actions: [
                {
                  label: "Review Case 02",
                  description: "Pin Mila's warning and the first question.",
                  primary: true,
                  onSelect: () =>
                    openInspection("briarClipping", {
                      actionLabel: "Go to Briar Lane",
                      onAction: () => {
                        navigate("briarExterior");
                      }
                    })
                },
                {
                  label: "Check the fee",
                  description: "Remember the first paid case reward.",
                  onSelect: () =>
                    speak("Kayla has five dollars from Mila's case. She saves it in the club jar for future investigating.")
                }
              ]
            })
        },
        {
          id: "club-observatory",
          label: "Open Moonwake file",
          showWhen: () => getFlag("case3Unlocked"),
          x: 88,
          y: 36,
          action: () =>
            openActionMenu({
              title: "Moonwake Observatory File",
              image: "./assets/exterior.jpg",
              text:
                "Kayla pins Mrs. Wren's star chart, the crescent token, Theo's flashing-light report, and one big question: why did this case need clues from the cases before it?",
              actions: [
                {
                  label: "Review Case 03",
                  description: "Look at Mrs. Wren's observatory handoff.",
                  primary: true,
                  onSelect: () =>
                    openInspection("observatoryHandoff", {
                      actionLabel: "Go to Moonwake",
                      onAction: () => navigate("observatoryExterior")
                    })
                },
                {
                  label: "Check satchel keys",
                  description: "Remember which earlier items may matter.",
                  onSelect: () =>
                    speak("Kayla checks her satchel: Pickles' bell from Mila, the five-dollar fee, Mrs. Wren's chart, and the crescent token all feel useful.")
                }
              ]
            })
        },
        {
          id: "club-library",
          label: "Open library file",
          showWhen: () => getFlag("case4Unlocked") || getFlag("case3Solved"),
          x: 90,
          y: 24,
          action: () =>
            openActionMenu({
              title: "Rowan Library File",
              image: "./assets/case4-library.png",
              text:
                "Kayla pins the library call slip from the Moonwake ledger. The next question is simple and strange: why does the blue local-history book keep vanishing from its display?",
              actions: [
                {
                  label: "Begin Case 04",
                  description: "Follow the Moonwake ledger slip to Rowan Library.",
                  primary: true,
                  onSelect: beginCase4
                },
                {
                  label: "Review library slip",
                  description: "Zoom into the clue that bridges Case 03 to Case 04.",
                  onSelect: () => openInspection("libraryCallSlip")
                }
              ]
            })
        },
        {
          id: "club-locket",
          label: "Inspect Kayla's locket",
          x: 72,
          y: 70,
          action: () =>
            openActionMenu({
              title: "Kayla's Crescent Locket",
              image: INSPECTIONS.locket.image,
              text:
                "The locket is Kayla's oldest clue. The picnic envelope beside it has a familiar tiny stamp.",
              actions: [
                {
                  label: "Compare symbols",
                  description: "Add the matching mark to Kayla's personal mystery.",
                  primary: true,
                  onSelect: () =>
                    openInspection("locket", {
                      actionLabel: "Record Kayla clue",
                      onAction: () => {
                        setFlag("identityClueFound");
                        addClue("identity");
                        speak(
                          "Kayla notices the picnic envelope has a crescent-and-star mark like her locket. Interesting, but Pickles comes first."
                        );
                      }
                    })
                },
                {
                  label: "Close locket",
                  description: "Save the personal mystery for later.",
                  onSelect: () =>
                    speak("Kayla closes the locket carefully. Her own case can wait until Pickles is safe.")
                }
              ]
            })
        }
      ]
    },
    bakery: {
      title: "Poppy's Bakery",
      subtitle: "Town Picnic Street",
      image: "./assets/case1-bakery.jpg",
      unlockFlag: "clientInterview",
      lockedLead:
        "Kayla needs to officially open the case with Mila before leaving the tree fort.",
      lead:
        "The bakery patio smells like warm rolls and carrots. A perfect place for a hungry rabbit to visit.",
      hotspots: [
        {
          id: "bakery-poppy",
          label: "Talk to Mrs. Poppy",
          x: 30,
          y: 52,
          action: () =>
            openActionMenu({
              title: "Mrs. Poppy at the Bakery Window",
              image: NPCS.poppy.portrait,
              text:
                "Mrs. Poppy is dusting flour from the patio chair. She keeps glancing at Kayla like she recognizes someone else.",
              actions: [
                {
                  label: "Ask what she saw",
                  description: "Best first step here: learn where Pickles went after the carrot rolls.",
                  primary: true,
                  onSelect: () => {
                    setFlag("poppyTalked");
                    addClue("poppy");
                    addClue("nameEcho");
                    speak("Mrs. Poppy saw Pickles hop toward the park. New action unlocked: inspect the patio clues before following the trail.");
                  }
                },
                {
                  label: "Buy carrot roll",
                  description: "A funny experiment, but it does not record evidence.",
                  xpPenalty: 1,
                  xpReason: "snacks are tempting, but evidence comes first.",
                  onSelect: () =>
                    speak("The carrot roll smells amazing, but buying one does not prove where Pickles went. Kayla still needs Mrs. Poppy's witness clue.")
                },
                {
                  label: "Ask about Mara",
                  description: "Press the odd name Mrs. Poppy almost said.",
                  requires: () => getFlag("poppyTalked"),
                  lockedMessage: "Kayla has not heard the strange name yet.",
                  onSelect: () =>
                    speak("Mrs. Poppy smiles too fast. 'Old town habit, dear.' Kayla writes that down because it is not an answer.")
                }
              ]
            })
        },
        {
          id: "bakery-clues",
          label: "Inspect patio clues",
          requires: () => getFlag("poppyTalked"),
          lockedLabel: "Ask Mrs. Poppy first",
          lockedMessage:
            "Kayla should ask Mrs. Poppy what she saw before collecting patio evidence.",
          x: 54,
          y: 73,
          action: () =>
            openActionMenu({
              title: "Bakery Patio Clues",
              image: INSPECTIONS.bakeryClues.image,
              text:
                "Under the patio chair are carrot crumbs, a snag of mint ribbon, and little flour prints.",
              actions: [
                {
                  label: "Look closer",
                  description: "Zoom in before taking anything.",
                  onSelect: () => openInspection("bakeryClues")
                },
                {
                  label: "Collect ribbon and crumbs",
                  description: "This records the trail and unlocks the path toward the park.",
                  primary: true,
                  onSelect: () => {
                    setFlag("bakeryClue");
                    addItem("mintRibbon");
                    addItem("carrotCrumbs");
                    addClue("bakery");
                    speak("Kayla collects the mint ribbon and carrot crumbs. New place unlocked: Picnic Park.");
                  }
                },
                {
                  label: "Follow prints now",
                  description: "Rushing ahead loses the proof. Record the clue first.",
                  xpPenalty: 2,
                  xpReason: "rushing ahead before saving evidence weakens the case.",
                  onSelect: () =>
                    speak("Kayla stops herself. If she follows the prints now, the patio evidence could be swept away. Collect the ribbon and crumbs first.")
                }
              ]
            })
        },
        {
          id: "bakery-path",
          label: "Follow the park path",
          requires: () => getFlag("bakeryClue"),
          lockedLabel: "Find the patio trail",
          lockedMessage:
            "Kayla needs to collect the bakery clues before she knows where to go next.",
          x: 82,
          y: 64,
          action: () =>
            openActionMenu({
              title: "Path Toward the Park",
              image: "./assets/case1-bakery.jpg",
              text:
                "The flour marks fade near the sidewalk. A breeze points the carrot smell toward the park.",
              actions: [
                {
                  label: "Follow the trail",
                  description: "Leave the bakery after recording the evidence.",
                  primary: true,
                  onSelect: () => navigate("park")
                },
                {
                  label: "Search the street",
                  description: "Check the wrong direction.",
                  xpPenalty: 2,
                  xpReason: "the recorded trail points the other way.",
                  onSelect: () =>
                    speak("Kayla checks the street, but the prints vanish there. The park path is the stronger lead.")
                }
              ]
            })
        }
      ]
    },
    park: {
      title: "Picnic Park",
      subtitle: "Fountain Path",
      image: "./assets/case1-park.jpg",
      unlockFlag: "bakeryClue",
      lockedLead:
        "The park is not a real lead yet. Kayla needs the bakery clues first.",
      lead:
        "Picnic blankets wait under the trees. Near the fountain, the ground still holds tiny tracks.",
      hotspots: [
        {
          id: "park-prints",
          label: "Inspect paw prints",
          x: 47,
          y: 71,
          action: () =>
            openActionMenu({
              title: "Fountain Paw Prints",
              image: INSPECTIONS.parkPrints.image,
              text:
                "The prints make a curved path around the fountain. Some are deeper, like Pickles paused to listen.",
              actions: [
                {
                  label: "Look closer",
                  description: "Zoom into the marks and spacing.",
                  onSelect: () => openInspection("parkPrints")
                },
                {
                  label: "Sketch the trail",
                  description: "This records the direction and unlocks the garden gate.",
                  primary: true,
                  onSelect: () => {
                    setFlag("parkTrail");
                    addItem("pawPrintSketch");
                    addClue("park");
                    speak("The paw prints curve around the fountain and head through the garden gate. New lead: the community garden.");
                  }
                },
                {
                  label: "Call Pickles",
                  description: "A loud shortcut. It teaches why Pickles needs quiet.",
                  xpPenalty: 2,
                  xpReason: "a loud call scares a nervous rabbit.",
                  onSelect: () =>
                    speak("No bell answers. A nervous rabbit would hide from a loud voice. Kayla needs a quieter plan.")
                }
              ]
            })
        },
        {
          id: "park-gate",
          label: "Go to the garden gate",
          requires: () => getFlag("parkTrail"),
          lockedLabel: "Sketch the paw prints",
          lockedMessage:
            "Kayla should inspect the fountain paw prints before following them through the gate.",
          x: 77,
          y: 58,
          action: () =>
            openActionMenu({
              title: "Garden Gate",
              image: "./assets/case1-park.jpg",
              text:
                "The gate is open just wide enough for a rabbit. The picnic noise fades on the other side.",
              actions: [
                {
                  label: "Follow paw prints",
                  description: "Use the sketched trail to choose the next place.",
                  primary: true,
                  onSelect: () => navigate("garden")
                },
                {
                  label: "Check picnic tables",
                  description: "Search where the trail does not go.",
                  xpPenalty: 2,
                  xpReason: "the paw prints point through the garden gate.",
                  onSelect: () =>
                    speak("Kayla checks the picnic tables. Plenty of napkins, no mint ribbon, no rabbit bell.")
                }
              ]
            })
        },
        {
          id: "park-kite",
          label: "Listen near the picnic blankets",
          x: 20,
          y: 62,
          action: () =>
            openActionMenu({
              title: "Picnic Blankets",
              image: "./assets/case1-park.jpg",
              text:
                "The picnic blankets are bright and noisy. If Pickles came through here, she probably did not stay.",
              actions: [
                {
                  label: "Listen for bell",
                  description: "Use sound instead of guessing.",
                  onSelect: () =>
                    speak("Kayla hears picnic music, but no rabbit bell. Pickles must be somewhere quieter.")
                },
                {
                  label: "Search baskets",
                  description: "A tempting but weak lead.",
                  xpPenalty: 2,
                  xpReason: "random searching is weaker than following paw prints.",
                  onSelect: () =>
                    speak("Kayla finds sandwiches, lemonade, and zero rabbits. The paw prints matter more.")
                }
              ]
            })
        }
      ]
    },
    garden: {
      title: "Community Garden",
      subtitle: "Lavender Beds",
      image: "./assets/case1-garden.jpg",
      unlockFlag: "parkTrail",
      lockedLead:
        "The garden gate is still just a guess. Kayla needs the park paw-print trail first.",
      lead:
        "The garden is calm and sweet with lavender. If Pickles wanted a quiet hiding place, this is it.",
      hotspots: [
        {
          id: "garden-basil",
          label: "Talk to Mr. Basil",
          x: 30,
          y: 50,
          action: () =>
            openActionMenu({
              title: "Mr. Basil by the Lavender Beds",
              image: NPCS.basil.portrait,
              text:
                "Mr. Basil trims the lavender slowly, like he is trying not to scare whatever is hiding nearby.",
              actions: [
                {
                  label: "Ask about scared rabbits",
                  description: "This gives the final order clue for the rabbit puzzle.",
                  primary: true,
                  onSelect: () => {
                    setFlag("basilTalked");
                    addClue("basil");
                    speak("Mr. Basil gives Kayla the gentle order: quiet first, carrot second, bell last. New action unlocked: search the lavender bench.");
                  }
                },
                {
                  label: "Show mint ribbon",
                  description: "Use the clue from Pickles' collar.",
                  requires: () => hasItem("mintRibbon"),
                  lockedMessage: "Kayla has not collected the mint ribbon from the bakery patio yet.",
                  onSelect: () =>
                    speak("Mr. Basil nods. 'That tiny bell is familiar to her, but only after she feels safe.'")
                },
                {
                  label: "Search garden alone",
                  description: "Too many hiding places. This explains why Basil's clue matters.",
                  xpPenalty: 2,
                  xpReason: "skipping the rabbit expert makes the search harder.",
                  onSelect: () =>
                    speak("Too many hiding places. Kayla needs Mr. Basil's rabbit advice before searching the lavender bench.")
                }
              ]
            })
        },
        {
          id: "garden-basket",
          label: "Search the lavender bench",
          requires: () => getFlag("basilTalked"),
          lockedLabel: "Ask Mr. Basil first",
          lockedMessage:
            "Kayla hears a tiny rustle, but Mr. Basil will know how to approach a scared rabbit safely.",
          x: 66,
          y: 68,
          action: () => {
            if (!getFlag("bakeryClue") || !getFlag("parkTrail") || !getFlag("basilTalked")) {
              openActionMenu({
                title: "Lavender Bench Rustle",
                image: INSPECTIONS.gardenRustle.image,
                text:
                  "Something tiny rustles near the bench, then goes still. Kayla can tell this hiding spot needs a gentle plan.",
                actions: [
                  {
                    label: "Back away softly",
                    description: "Do not scare the hidden animal.",
                    primary: true,
                    onSelect: () =>
                      speak("Kayla should gather the bakery clue, the park trail, and Mr. Basil's rabbit tip first.")
                  },
                  {
                    label: "Reach inside",
                    description: "Rush the hiding place.",
                    xpPenalty: 3,
                    xpReason: "grabbing at a scared rabbit makes her hide.",
                    onSelect: () =>
                      speak("The rustle stops. Kayla pulls her hand back. A scared rabbit needs patience.")
                  }
                ]
              });
              return;
            }
            openActionMenu({
              title: "Lavender Bench Hiding Spot",
              image: INSPECTIONS.gardenRustle.image,
              text:
                "A soft rustle comes from the basket by the lavender. Kayla has the ribbon, the carrot clue, the paw-print trail, and Mr. Basil's order.",
              actions: [
                {
                  label: "Listen first",
                  description: "Confirm Pickles is calm enough to coax.",
                  onSelect: () =>
                    speak("Kayla waits. A tiny bell gives one soft chime from inside the basket.")
                },
                {
                  label: "Reach into basket",
                  description: "A fast move that could scare Pickles.",
                  xpPenalty: 3,
                  xpReason: "reaching in before Pickles feels safe is too sudden.",
                  onSelect: () =>
                    speak("The basket shivers away from Kayla's hand. Mr. Basil was right: quiet first.")
                },
                {
                  label: "Coax carefully",
                  description: "Start the final order puzzle.",
                  primary: true,
                  onSelect: () => openSequencePuzzle("coaxPickles")
                }
              ]
            });
          }
        },
        {
          id: "garden-carrots",
          label: "Inspect carrot tops",
          x: 47,
          y: 76,
          action: () =>
            openActionMenu({
              title: "Fresh Carrot Tops",
              image: "./assets/case1-garden.jpg",
              text:
                "The carrot patch is neat except for one wiggly row. These tops smell exactly like the bakery crumbs.",
              actions: [
                {
                  label: "Pick one carrot top",
                  description: "Save a gentle snack for Pickles.",
                  primary: true,
                  onSelect: () =>
                    speak("Kayla picks one soft carrot top. It is the right kind of snack, but it needs the right order.")
                },
                {
                  label: "Scatter carrots",
                  description: "Make a noisy shortcut.",
                  xpPenalty: 1,
                  xpReason: "messy shortcuts do not solve the clue.",
                  onSelect: () =>
                    speak("Kayla decides against it. A trail of snacks would make a mess, not solve the clue.")
                },
                {
                  label: "Ask Mr. Basil first",
                  description: "Check whether carrots are enough by themselves.",
                  requires: () => getFlag("basilTalked"),
                  lockedMessage: "Kayla should ask Mr. Basil how to approach a nervous rabbit.",
                  onSelect: () =>
                    speak("Mr. Basil's rule still fits: quiet first, carrot second, bell last.")
                }
              ]
            })
        }
      ]
    },
    briarExterior: {
      title: "Briar Lane House",
      subtitle: "Front Gate",
      image: "./assets/case2-exterior.jpg",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "case2Unlocked",
      lockedLead:
        "Briar Lane is not part of Kayla's case file yet. Finish helping Mila first.",
      lead:
        "Briar Lane House stands empty behind roses and ironwork. Kayla's question is simple: who keeps entering it after dark?",
      hotspots: [
        {
          id: "briar-hexibald",
          label: "Talk to Mr. Hexibald",
          x: 20,
          y: 61,
          action: () =>
            openActionMenu({
              title: "Mr. Hexibald at the Gate",
              image: NPCS.hexibald.portrait,
              text:
                "Mr. Hexibald steps between Kayla and the gate. He is stern, but his eyes keep flicking toward the glowing upper window.",
              actions: [
                {
                  label: "Ask why he guards it",
                  description: "Find out why the house matters.",
                  primary: true,
                  onSelect: () => {
                    setFlag("hexibaldWarning");
                    addClue("hexibaldWarning");
                    speak("Mr. Hexibald says he is the caretaker. The family left suddenly, and he promised to keep the house safe.");
                  }
                },
                {
                  label: "Mention Pickles",
                  description: "Explain how this case started.",
                  onSelect: () =>
                    speak("Mr. Hexibald softens a little. 'A lost rabbit is one thing. Sneaking into old houses is another.'")
                },
                {
                  label: "Try to slip past",
                  description: "A bad detective move.",
                  onSelect: () =>
                    speak("Kayla gets exactly three steps before Mr. Hexibald taps his cane. Subtle investigation will work better.")
                }
              ]
            })
        },
        {
          id: "briar-warning",
          label: "Inspect the gate notice",
          x: 29,
          y: 69,
          action: () =>
            openActionMenu({
              title: "Gate Warning",
              image: INSPECTIONS.hexibaldNotice.image,
              text:
                "The notice has weathered blank in places, but it is tied with four careful brass loops.",
              actions: [
                {
                  label: "Look closer",
                  description: "Zoom into the warning.",
                  onSelect: () => openInspection("hexibaldNotice")
                },
                {
                  label: "Record caretaker clue",
                  description: "Treat the warning as evidence.",
                  primary: true,
                  onSelect: () => {
                    setFlag("hexibaldWarning");
                    addClue("hexibaldWarning");
                    speak("Kayla records the warning. Someone is keeping kids out, but that is not the same as a ghost keeping people away.");
                  }
                }
              ]
            })
        },
        {
          id: "briar-window",
          label: "Watch glowing window",
          x: 61,
          y: 31,
          action: () =>
            openActionMenu({
              title: "Upper Window Glow",
              image: INSPECTIONS.briarWindow.image,
              text:
                "The upstairs window glows warm and steady, then shifts as if someone moved a lamp.",
              actions: [
                {
                  label: "Study the light",
                  description: "Separate spooky from practical.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarWindowClue");
                    addClue("briarWindow");
                    speak("Kayla decides the glow is lamplight. That means someone living, not something ghostly, is inside.");
                  }
                },
                {
                  label: "Call it haunted",
                  description: "Jump to the town rumor.",
                  onSelect: () =>
                    speak("Kayla writes 'haunted?' with a question mark, then underlines the question mark twice.")
                }
              ]
            })
        },
        {
          id: "briar-shutter",
          label: "Check loose shutter",
          x: 78,
          y: 38,
          action: () =>
            openActionMenu({
              title: "Loose Shutter",
              image: INSPECTIONS.looseShutter.image,
              text:
                "The shutter taps once, pauses, then taps twice. From the sidewalk it could sound like a signal.",
              actions: [
                {
                  label: "Match the sound",
                  description: "Test the 'knocking ghost' rumor.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarWindClue");
                    addClue("briarWind");
                    speak("Kayla matches the rhythm to the wind. One haunted-house sound is only a loose shutter.");
                  }
                },
                {
                  label: "Knock back",
                  description: "Try to answer the house.",
                  onSelect: () =>
                    speak("No one knocks back. Kayla smiles anyway; experiments count.")
                }
              ]
            })
        },
        {
          id: "briar-porch",
          label: "Approach the front door",
          requires: () => getFlag("hexibaldWarning") && getFlag("briarWindowClue") && getFlag("briarWindClue"),
          lockedLabel: "Gather gate clues",
          lockedMessage:
            "Kayla should understand Mr. Hexibald's warning, the glowing window, and the shutter sound before asking to enter.",
          x: 54,
          y: 58,
          action: () =>
            openActionMenu({
              title: "Front Door",
              image: "./assets/case2-exterior.jpg",
              text:
                "Kayla can now explain three things: the warning is from a caretaker, the glow is lamplight, and the knocking is a loose shutter.",
              actions: [
                {
                  label: "Ask to look inside",
                  description: "Use evidence instead of sneaking.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarInside");
                    speak("Mr. Hexibald sighs, then unlocks the door. 'Ten minutes. Notebook open. Hands careful.'");
                    navigate("briarFoyer");
                  }
                },
                {
                  label: "Sneak around back",
                  description: "Ignore the caretaker agreement.",
                  onSelect: () =>
                    speak("Kayla decides she likes permission better than scratches from rose bushes.")
                }
              ]
            })
        }
      ]
    },
    briarFoyer: {
      title: "Briar Lane Foyer",
      subtitle: "Inside the Empty House",
      image: "./assets/case2-foyer.jpg",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "briarInside",
      lockedLead:
        "Kayla needs permission from Mr. Hexibald before entering the house.",
      lead:
        "The foyer smells like old wood, dust, and lavender polish. The house is empty, but it does not feel forgotten.",
      hotspots: [
        {
          id: "foyer-portraits",
          label: "Study hallway portraits",
          x: 13,
          y: 43,
          action: () =>
            openActionMenu({
              title: "Hallway Portraits",
              image: "./assets/case2-foyer.jpg",
              text:
                "Most portraits are too faded to identify. One frame has been recently dusted.",
              actions: [
                {
                  label: "Look for family clues",
                  description: "Start a personal file note.",
                  onSelect: () =>
                    speak("Kayla notices the house has been cared for in small, quiet ways. Someone visits on purpose.")
                },
                {
                  label: "Follow the music",
                  description: "The piano sound is stronger through the archway.",
                  primary: true,
                  onSelect: () => navigate("briarLiving")
                }
              ]
            })
        },
        {
          id: "foyer-floorboard",
          label: "Inspect loose floorboard",
          x: 54,
          y: 78,
          action: () =>
            openActionMenu({
              title: "Loose Floorboard",
              image: "./assets/case2-foyer.jpg",
              text:
                "A board by the rug lifts slightly. Under it is a clean rectangle where something used to rest.",
              actions: [
                {
                  label: "Measure clean dust",
                  description: "Find signs of a recent visitor.",
                  primary: true,
                  onSelect: () =>
                    speak("The dust was disturbed recently. Someone knows this house well enough to hide things without making a mess.")
                },
                {
                  label: "Force it open",
                  description: "Risk damaging the house.",
                  onSelect: () =>
                    speak("Kayla leaves it gentle. This house feels like evidence and memory at the same time.")
                }
              ]
            })
        },
        {
          id: "foyer-parlor",
          label: "Enter the piano room",
          x: 88,
          y: 49,
          action: () =>
            openActionMenu({
              title: "Music Through the Archway",
              image: "./assets/case2-foyer.jpg",
              text:
                "The piano notes are soft and careful, like someone playing from memory.",
              actions: [
                {
                  label: "Follow the music",
                  description: "Investigate the haunted tune.",
                  primary: true,
                  onSelect: () => navigate("briarLiving")
                },
                {
                  label: "Call out",
                  description: "Announce Kayla is inside.",
                  onSelect: () =>
                    speak("The music stops. Kayla waits, then hears one floorboard creak in the piano room.")
                }
              ]
            })
        },
        {
          id: "foyer-stairs",
          label: "Go upstairs",
          requires: () => getFlag("grandmotherMet"),
          lockedLabel: "Find the visitor first",
          lockedMessage:
            "The upstairs room matters, but Kayla should solve who is visiting the house before opening private rooms.",
          x: 25,
          y: 42,
          action: () =>
            openActionMenu({
              title: "Stairway to the Old Room",
              image: "./assets/case2-foyer.jpg",
              text:
                "Mrs. Wren's small key fits the upstairs door. Mr. Hexibald watches, worried but quiet.",
              actions: [
                {
                  label: "Use the small key",
                  description: "Open the old girls' room.",
                  primary: true,
                  onSelect: () => navigate("briarNursery")
                },
                {
                  label: "Wait downstairs",
                  description: "Leave the private room for later.",
                  onSelect: () =>
                    speak("Kayla waits, but the key feels important in her palm.")
                }
              ]
            })
        }
      ]
    },
    briarLiving: {
      title: "Piano Room",
      subtitle: "Briar Lane Living Room",
      image: "./assets/case2-living-room.jpg",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "briarInside",
      lead:
        "The living room is dusty except for the piano bench, the middle keys, and a path of fresh footprints across the floor.",
      hotspots: [
        {
          id: "living-piano",
          label: "Inspect the piano",
          x: 26,
          y: 50,
          action: () =>
            openActionMenu({
              title: "Old Piano",
              image: INSPECTIONS.pianoMusic.image,
              text:
                "The piano is out of tune, but the middle keys are clean. The sheet music is open to a lullaby Kayla almost recognizes.",
              actions: [
                {
                  label: "Listen to the tune",
                  description: "Find the source of the ghost music.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarMusicClue");
                    addClue("briarMusic");
                    speak("The haunted music is a piano lullaby. Kayla almost knows it, which bothers her more than the rumor did.");
                  }
                },
                {
                  label: "Press random keys",
                  description: "Make noise before thinking.",
                  onSelect: () =>
                    speak("The notes wobble through the room. Kayla decides the house has enough rumors already.")
                }
              ]
            })
        },
        {
          id: "living-footprints",
          label: "Follow fresh footprints",
          x: 34,
          y: 76,
          action: () =>
            openActionMenu({
              title: "Fresh Footprints",
              image: "./assets/case2-living-room.jpg",
              text:
                "The footprints are too small for Mr. Hexibald's boots and too steady for kids running on a dare.",
              actions: [
                {
                  label: "Sketch the path",
                  description: "Track the visitor through the room.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarVisitorTrail");
                    addClue("briarVisitor");
                    speak("The visitor comes from the side door, sits at the piano, and leaves by the same careful path.");
                  }
                },
                {
                  label: "Blame a ghost",
                  description: "Ignore the physical clue.",
                  onSelect: () =>
                    speak("Kayla writes: ghosts probably do not leave muddy shoe prints.")
                }
              ]
            })
        },
        {
          id: "living-shawl",
          label: "Inspect folded shawl",
          x: 76,
          y: 62,
          action: () =>
            openActionMenu({
              title: "Folded Shawl",
              image: "./assets/case2-living-room.jpg",
              text:
                "A soft shawl rests on the couch. It smells faintly of lavender soap and piano dust.",
              actions: [
                {
                  label: "Record visitor clue",
                  description: "The house has a human visitor.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarVisitorTrail");
                    addClue("briarVisitor");
                    speak("The shawl is not old dust. Someone has been here recently, gently, and alone.");
                  }
                },
                {
                  label: "Put it on",
                  description: "Tempting, but not evidence-safe.",
                  onSelect: () =>
                    speak("Kayla leaves the shawl where it is. Detectives do not wear clues.")
                }
              ]
            })
        },
        {
          id: "living-grandmother",
          label: "Speak to the night visitor",
          requires: () => getFlag("briarMusicClue") && getFlag("briarVisitorTrail"),
          lockedLabel: "Identify the visitor",
          lockedMessage:
            "Kayla needs the piano clue and the fresh visitor trail before she can understand who is inside.",
          x: 52,
          y: 45,
          action: () =>
            openActionMenu({
              title: "Mrs. Wren by the Piano",
              image: NPCS.grandmother.portrait,
              text:
                "An older woman steps from the lamplight, one hand on the piano. She looks startled, then sad, then kind.",
              actions: [
                {
                  label: "Ask why she comes",
                  description: "Solve the haunting kindly.",
                  primary: true,
                  onSelect: () => {
                    setFlag("grandmotherMet");
                    addItem("nurseryKey");
                    addClue("grandmother");
                    speak("Mrs. Wren says she comes for memories, not mischief. She gives Kayla a small key for the upstairs room.");
                  }
                },
                {
                  label: "Ask if she is a ghost",
                  description: "Say the rumor out loud.",
                  onSelect: () =>
                    speak("Mrs. Wren laughs softly. 'No, dear. Only old enough to creak like one.'")
                },
                {
                  label: "Ask about the family",
                  description: "Push the bigger mystery.",
                  onSelect: () =>
                    speak("Mrs. Wren's smile wavers. 'They loved this house. That is all I can say tonight.'")
                }
              ]
            })
        }
      ]
    },
    briarNursery: {
      title: "Old Girls' Room",
      subtitle: "Upstairs at Briar Lane",
      image: "./assets/case2-nursery.jpg",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "grandmotherMet",
      lockedLead:
        "Kayla needs Mrs. Wren's key before entering the upstairs room.",
      lead:
        "The old girls' room is not spooky. It is careful, quiet, and preserved like someone has been protecting a memory.",
      hotspots: [
        {
          id: "nursery-mobile",
          label: "Listen to moon mobile",
          x: 52,
          y: 25,
          action: () =>
            openActionMenu({
              title: "Moon Mobile",
              image: "./assets/case2-nursery.jpg",
              text:
                "The mobile turns above the little bed, chiming the first notes of the piano lullaby.",
              actions: [
                {
                  label: "Hum along",
                  description: "Kayla knows more than she can explain.",
                  primary: true,
                  onSelect: () =>
                    speak("Kayla hums three notes before she realizes she knows them. She stops and writes that down.")
                },
                {
                  label: "Spin it fast",
                  description: "A noisy shortcut.",
                  onSelect: () =>
                    speak("Kayla keeps it gentle. Some clues are fragile.")
                }
              ]
            })
        },
        {
          id: "nursery-toy-drawer",
          label: "Open toy drawer",
          x: 67,
          y: 74,
          action: () =>
            openActionMenu({
              title: "Toy Drawer",
              image: INSPECTIONS.moonMazeToy.image,
              text:
                "The drawer is lined with lavender cloth. Under a knitted blanket, Kayla finds a wooden moon-maze toy with a tiny hidden latch.",
              actions: [
                {
                  label: "Take moon-maze toy",
                  description: "Add the object to Kayla's satchel.",
                  primary: !hasItem("moonMazeToy"),
                  onSelect: () => {
                    addItem("moonMazeToy");
                    addClue("moonMazeToy");
                    speak("Kayla adds the moon-maze toy to her satchel. Its hidden latch feels like it wants a careful hand.");
                  }
                },
                {
                  label: "Play moon maze",
                  description: "Guide the blue bead to the crescent finish.",
                  requires: () => hasItem("moonMazeToy"),
                  lockedMessage: "Kayla should take the moon-maze toy before playing it.",
                  primary: hasItem("moonMazeToy"),
                  onSelect: openMoonMazeMiniGame
                },
                {
                  label: "Leave drawer neat",
                  description: "Keep the room as Mrs. Wren preserved it.",
                  onSelect: () =>
                    speak("Kayla smooths the drawer cloth back into place. The toy still feels like the useful clue.")
                }
              ]
            })
        },
        {
          id: "nursery-height",
          label: "Check height marks",
          x: 13,
          y: 43,
          action: () =>
            openActionMenu({
              title: "Tiny Height Marks",
              image: INSPECTIONS.heightMarks.image,
              text:
                "The pencil marks are very low, the kind parents make before a child can stand still for long.",
              actions: [
                {
                  label: "Add to personal file",
                  description: "A small clue, not proof.",
                  requires: () => getFlag("moonMazeSolved"),
                  lockedMessage: "The clearest 17-inch mark is hidden behind the toy drawer's moon-maze latch.",
                  primary: true,
                  onSelect: () => {
                    addItem("heightMarkSketch");
                    addClue("briarHeight");
                    speak("Kayla copies the 17-inch height mark into her personal file. She cannot prove why it matters, but the number feels worth saving.");
                  }
                },
                {
                  label: "Measure herself",
                  description: "Check if the marks belong to her now.",
                  onSelect: () =>
                    speak("Kayla is much taller now. The marks belonged to a baby or toddler, long ago.")
                }
              ]
            })
        },
        {
          id: "nursery-box",
          label: "Open keepsake box",
          requires: () => hasItem("nurseryKey"),
          lockedLabel: "Need small key",
          lockedMessage:
            "Mrs. Wren's small brass key should open the keepsake box.",
          x: 82,
          y: 55,
          action: () =>
            openActionMenu({
              title: "Keepsake Box",
              image: "./assets/case2-nursery.jpg",
              text:
                "The little box opens with a quiet click. Inside is an old portrait wrapped in lace.",
              actions: [
                {
                  label: "Study portrait",
                  description: "Zoom into the woman who looks familiar.",
                  primary: true,
                  onSelect: () =>
                    openInspection("briarPortrait", {
                      actionLabel: "Save portrait clue",
                      onAction: () => {
                        setFlag("briarPortraitClue");
                        addItem("maraPortraitCopy");
                        addClue("briarPortrait");
                        openCase2Closed();
                      }
                    })
                },
                {
                  label: "Close box",
                  description: "Leave the memory untouched.",
                  onSelect: () =>
                    speak("Kayla closes the box carefully. Even mysteries deserve manners.")
                }
              ]
            })
        }
      ]
    },
    observatoryExterior: {
      title: "Moonwake Observatory",
      subtitle: "Front Gate",
      image: "./assets/exterior.jpg",
      showWhen: () => getFlag("case3Unlocked"),
      unlockFlag: "case3Unlocked",
      lockedLead:
        "Moonwake Observatory is not in Kayla's case file yet. Finish the Briar Lane mystery first.",
      lead:
        "Moonwake Observatory glows on the hill above town. Theo swears the dome flashed three times after midnight, even though the gate was locked.",
      hotspots: [
        {
          id: "observatory-theo",
          label: "Talk to Theo",
          x: 25,
          y: 64,
          action: () =>
            openActionMenu({
              title: "Theo at the Observatory Gate",
              image: NPCS.theo.portrait,
              text:
                "Theo has a flashlight, a clipboard, and the tense expression of someone who really wants the weird explanation to be true.",
              actions: [
                {
                  label: "Ask what flashed",
                  description: "Interview the person who saw the lights.",
                  primary: true,
                  onSelect: () => {
                    setFlag("theoTalked");
                    addClue("theo");
                    speak("Theo saw the dome flash three times after midnight. The sign-in ledger was blank, so Kayla marks it as a real mystery.");
                  }
                },
                {
                  label: "Ask about Mila",
                  description: "Follow the Gale family thread lightly.",
                  onSelect: () => {
                    addClue("milaResemblance");
                    speak("Theo says Mila Gale's family used to help at Moonwake too. Kayla writes that down beside Mrs. Poppy's quiet reaction.");
                  }
                }
              ]
            })
        },
        {
          id: "observatory-gate",
          label: "Inspect crescent gate",
          x: 36,
          y: 72,
          action: () =>
            openActionMenu({
              title: "Crescent Gate Lock",
              image: INSPECTIONS.observatoryGate.image,
              text:
                "The locked gate has a crescent-shaped hollow. Kayla's locket seems to warm under her collar, but Mrs. Wren's token is the practical clue.",
              actions: [
                {
                  label: "Look closer",
                  description: "Zoom in on the gate lock.",
                  onSelect: () => openInspection("observatoryGate")
                },
                {
                  label: "Use crescent token",
                  description: "Try the token Mrs. Wren gave Kayla.",
                  requires: () => hasItem("observatoryToken"),
                  lockedMessage: "Kayla needs Mrs. Wren's crescent token from the end of Case 02.",
                  primary: true,
                  onSelect: () => {
                    setFlag("observatoryGate");
                    addClue("observatoryGate");
                    speak("The crescent token clicks into the gate. Moonwake opens like it was waiting for Kayla.");
                    navigate("observatoryWorkshop");
                  }
                }
              ]
            })
        },
        {
          id: "observatory-chart",
          label: "Review Mrs. Wren's chart",
          x: 58,
          y: 76,
          action: () =>
            openActionMenu({
              title: "Folded Star Chart",
              image: INSPECTIONS.observatoryChart.image,
              text:
                "Mrs. Wren's chart is not a town map. It shows the dome, the telescope rings, and three moon phases circled in old ink.",
              actions: [
                {
                  label: "Compare to dome",
                  description: "Record what the chart is really for.",
                  requires: () => hasItem("starChart"),
                  lockedMessage: "Kayla needs the star chart Mrs. Wren gives her after Case 02.",
                  primary: true,
                  onSelect: () => {
                    setFlag("starChartRead");
                    addClue("starChart");
                    speak("Kayla realizes the chart maps a path for moonlight, not a path through town.");
                  }
                },
                {
                  label: "Fold it away",
                  description: "Save the chart for inside.",
                  onSelect: () =>
                    speak("Kayla keeps the star chart flat in her satchel. It feels too important to wrinkle.")
                }
              ]
            })
        }
      ]
    },
    observatoryWorkshop: {
      title: "Moonwake Workshop",
      subtitle: "Signal Desk",
      image: "./assets/workshop.jpg",
      showWhen: () => getFlag("case3Unlocked"),
      unlockFlag: "observatoryGate",
      lockedLead:
        "The workshop is behind the locked observatory gate. Use Mrs. Wren's token first.",
      lead:
        "The workshop is full of brass dials, dusty repair notes, and a signal cord that hangs beside a numbered drawer.",
      hotspots: [
        {
          id: "workshop-dials",
          label: "Inspect moon dials",
          x: 47,
          y: 63,
          action: () =>
            openActionMenu({
              title: "Moon Phase Dials",
              image: INSPECTIONS.moonDials.image,
              text:
                "Three old dials click between moon phases. Someone set them deliberately: new moon, half moon, full moon.",
              actions: [
                {
                  label: "Look closer",
                  description: "Zoom in before copying the sequence.",
                  onSelect: () => openInspection("moonDials")
                },
                {
                  label: "Sketch the order",
                  description: "Add the sequence to the satchel.",
                  primary: true,
                  onSelect: () => {
                    setFlag("moonDialClue");
                    addItem("moonDialSketch");
                    addClue("moonDial");
                    speak("Kayla sketches the moon sequence: new, half, full. Three phases. That number may matter later.");
                  }
                }
              ]
            })
        },
        {
          id: "workshop-bell",
          label: "Test signal cord",
          x: 31,
          y: 74,
          action: () =>
            openActionMenu({
              title: "Signal Cord",
              image: "./assets/workshop.jpg",
              text:
                "The cord runs into the dome. Pulling it hard might move old machinery, but Kayla needs a gentler test first.",
              actions: [
                {
                  label: "Tie Pickles' bell",
                  description: "Use a Case 01 satchel item for a quiet test.",
                  requires: () => hasItem("picklesBell"),
                  lockedMessage: "Kayla needs Pickles' tiny bell from Mila's thank-you.",
                  primary: true,
                  onSelect: () => {
                    setFlag("bellTested");
                    speak("Pickles' bell gives a tiny chime when the cord moves. Kayla can test the signal without forcing the old gears.");
                  }
                },
                {
                  label: "Yank the cord",
                  description: "A rough shortcut.",
                  onSelect: () =>
                    speak("The old cord groans. Kayla stops before she breaks the very thing she is investigating.")
                }
              ]
            })
        },
        {
          id: "workshop-chart",
          label: "Lay out star chart",
          x: 67,
          y: 72,
          action: () =>
            openActionMenu({
              title: "Chart on the Workbench",
              image: INSPECTIONS.observatoryChart.image,
              text:
                "The star chart fits the workbench scratches exactly. A telescope path, a prism mark, and three moon symbols line up.",
              actions: [
                {
                  label: "Trace light path",
                  description: "Use Mrs. Wren's chart to plan the dome test.",
                  requires: () => hasItem("starChart"),
                  lockedMessage: "Kayla needs Mrs. Wren's star chart.",
                  primary: true,
                  onSelect: () => {
                    setFlag("starChartRead");
                    addClue("starChart");
                    speak("The chart shows moonlight should travel from telescope to floor rings to prism.");
                  }
                },
                {
                  label: "Go to dome",
                  description: "Test the light path upstairs.",
                  requires: () => getFlag("starChartRead"),
                  lockedMessage: "Kayla should trace the chart before testing the dome.",
                  onSelect: () => navigate("observatoryDome")
                }
              ]
            })
        },
        {
          id: "workshop-lock",
          label: "Open numbered drawer",
          x: 50,
          y: 86,
          action: () =>
            openActionMenu({
              title: "Numbered Archive Drawer",
              image: "./assets/workshop.jpg",
              text:
                "The drawer lock has three tiny windows. A plate underneath reads: club fee, first mark, moon count.",
              actions: [
                {
                  label: "Try 5 - 17 - 3",
                  description: "Use Case 01 money, Case 02 height mark, and Case 03 moons.",
                  requires: () => hasItem("fiveDollars") && hasItem("heightMarkSketch") && getFlag("moonDialClue"),
                  lockedMessage:
                    "Kayla needs Mila's five-dollar fee, the Briar Lane height mark, and the moon dial sketch.",
                  primary: true,
                  onSelect: () => {
                    setFlag("archiveUnlocked");
                    addClue("archiveCode");
                    speak("The drawer clicks open. Kayla has used clues from three cases to unlock Moonwake's archive.");
                    navigate("observatoryArchive");
                  }
                },
                {
                  label: "Try 1 - 2 - 3",
                  description: "Guess without evidence.",
                  onSelect: () =>
                    speak("Nothing moves. Moonwake seems to prefer clues over guesses.")
                }
              ]
            })
        }
      ]
    },
    observatoryDome: {
      title: "Moonwake Dome",
      subtitle: "Telescope Floor",
      image: "./assets/dome.jpg",
      showWhen: () => getFlag("case3Unlocked"),
      unlockFlag: "observatoryGate",
      lockedLead:
        "The dome is past the observatory workshop. Open the gate first.",
      lead:
        "Moonlight pours across the dome floor. Brass rings circle a telescope, and a prism waits in the center like a glass question.",
      hotspots: [
        {
          id: "dome-telescope",
          label: "Align telescope",
          x: 41,
          y: 37,
          action: () =>
            openActionMenu({
              title: "Moonwake Telescope",
              image: "./assets/dome.jpg",
              text:
                "The telescope can swing toward the moon, but the floor marks show it must be aligned with the chart first.",
              actions: [
                {
                  label: "Use star chart",
                  description: "Line up the telescope with Mrs. Wren's chart.",
                  requires: () => getFlag("starChartRead"),
                  lockedMessage: "Kayla should trace Mrs. Wren's star chart in the workshop first.",
                  primary: true,
                  onSelect: () => {
                    setFlag("telescopeAligned");
                    speak("The telescope turns into place. A clean band of moonlight lands on the brass floor rings.");
                  }
                },
                {
                  label: "Aim at brightest star",
                  description: "Try the obvious sky target.",
                  onSelect: () =>
                    speak("Pretty, but wrong. The chart is about moonlight, not the brightest star.")
                }
              ]
            })
        },
        {
          id: "dome-prism",
          label: "Inspect floor prism",
          x: 50,
          y: 82,
          action: () =>
            openActionMenu({
              title: "Central Prism",
              image: INSPECTIONS.prismSignal.image,
              text:
                "The prism is scratched from years of careful use. If the telescope, dials, and signal cord work together, the flashes may stop being random.",
              actions: [
                {
                  label: "Align prism signal",
                  description: "Use the chart, dials, telescope, and bell test together.",
                  requires: () => getFlag("telescopeAligned") && getFlag("moonDialClue") && getFlag("bellTested"),
                  lockedMessage:
                    "Kayla needs the telescope aligned, the moon dial order, and Pickles' bell test before using the prism.",
                  primary: true,
                  onSelect: () => {
                    setFlag("prismAligned");
                    addItem("prismNote");
                    addClue("prismSignal");
                    openInspection("prismSignal", {
                      actionLabel: "Record signal answer",
                      onAction: () => {
                        speak("Case 03's surface mystery is clearer: Moonwake's flashes are an old prism signal system.");
                      }
                    });
                  }
                },
                {
                  label: "Cover the prism",
                  description: "Stop the flash instead of explaining it.",
                  onSelect: () =>
                    speak("The dome gets darker, but Kayla still has not explained why the flashes happened.")
                }
              ]
            })
        },
        {
          id: "dome-workshop",
          label: "Return to workshop",
          x: 88,
          y: 78,
          action: () => navigate("observatoryWorkshop")
        }
      ]
    },
    observatoryArchive: {
      title: "Moonwake Archive",
      subtitle: "Family Ledger",
      image: "./assets/archive.jpg",
      showWhen: () => getFlag("case3Unlocked"),
      unlockFlag: "archiveUnlocked",
      lockedLead:
        "The archive is locked inside the numbered drawer. Use the clues from Kayla's earlier cases.",
      lead:
        "The archive drawer holds old logbooks, maps, and a family ledger with names Kayla has heard all over town.",
      hotspots: [
        {
          id: "archive-ledger",
          label: "Read family ledger",
          x: 49,
          y: 59,
          action: () =>
            openActionMenu({
              title: "Moonwake Family Ledger",
              image: INSPECTIONS.archiveLedger.image,
              text:
                "The ledger is not a full answer, but it is a door opening. Gale, Wren, and Kline names appear in the same old family branches.",
              actions: [
                {
                  label: "Copy ledger page",
                  description: "Record the big personal clue.",
                  requires: () => getFlag("prismAligned"),
                  lockedMessage: "Kayla should solve the flashing signal before copying the hidden family ledger.",
                  primary: true,
                  onSelect: () => {
                    setFlag("case3Solved");
                    addItem("archiveLedger");
                    addClue("case3Solved");
                    addClue("milaCousin");
                    openCase3Closed();
                  }
                },
                {
                  label: "Read first line",
                  description: "Do not jump to the whole family tree yet.",
                  onSelect: () =>
                    speak("Kayla sees one familiar surname, then another. The answer is not simple, but Mila may be part of it.")
                }
              ]
            })
        },
        {
          id: "archive-display",
          label: "Inspect glass cases",
          x: 21,
          y: 63,
          action: () =>
            openActionMenu({
              title: "Old Observatory Cases",
              image: "./assets/archive.jpg",
              text:
                "The display cases hold badges from old Moonwake volunteers. One tarnished label reads Gale Family Night Watch.",
              actions: [
                {
                  label: "Look for Mila's family",
                  description: "Connect the Gale name to Moonwake.",
                  primary: true,
                  onSelect: () => {
                    addClue("milaResemblance");
                    speak("Kayla copies the Gale label. Mila's family name might not be just another name from town.");
                  }
                },
                {
                  label: "Check telescope badges",
                  description: "Stay on the observatory surface case.",
                  onSelect: () =>
                    speak("The badges prove Moonwake was run by town families, not by one official keeper.")
                }
              ]
            })
        }
      ]
    },
    rowanLibrary: {
      title: "Rowan Library",
      subtitle: "Main Reading Room",
      image: "./assets/case4-library.png",
      showWhen: () => getFlag("case4Unlocked"),
      unlockFlag: "case4Unlocked",
      lockedLead:
        "Rowan Library is not in Kayla's active case file yet. Finish the Moonwake archive first.",
      lead:
        "Rowan Library is warm, bright, and full of quiet footsteps. Ms. Rowan's blue local-history book keeps vanishing from display and reappearing on the return cart.",
      hotspots: [
        {
          id: "library-rowan",
          label: "Talk to Ms. Rowan",
          x: 82,
          y: 54,
          action: () =>
            openActionMenu({
              title: "Ms. Rowan at the Desk",
              image: NPCS.rowan.portrait,
              text:
                "Ms. Rowan has a neat stack of blank library cards and the expression of someone who has been waiting for Kayla to notice the right shelf.",
              actions: [
                {
                  label: "Ask about the blue book",
                  description: "Open the Case 04 surface mystery.",
                  primary: true,
                  onSelect: () => {
                    setFlag("rowanTalked");
                    addClue("rowan");
                    speak("Ms. Rowan hires the Mystery Club for one dollar: solve why the blue local-history book keeps vanishing from display and appearing on the return cart.");
                  }
                },
                {
                  label: "Ask about Kline",
                  description: "Follow the long mystery gently.",
                  requires: () => hasClue("case3Solved"),
                  lockedMessage: "Kayla has not copied the Moonwake ledger yet.",
                  onSelect: () =>
                    speak("Ms. Rowan pauses at the Kline name. 'Old town records can be shy. Start with the case, then the catalog.'")
                }
              ]
            })
        },
        {
          id: "library-cart",
          label: "Inspect return cart",
          requires: () => getFlag("rowanTalked"),
          lockedLabel: "Talk to Ms. Rowan first",
          lockedMessage:
            "Kayla should hear Ms. Rowan's missing-book case before touching the return cart.",
          x: 76,
          y: 76,
          action: () =>
            openActionMenu({
              title: "Return Cart",
              image: "./assets/case4-library.png",
              text:
                "The blue book is not on display. Again. On the return cart, Kayla finds blue cover dust, a blank call slip, and one card-catalog smudge.",
              actions: [
                {
                  label: "Collect the slip",
                  description: "Record the clue that points to the catalog drawers.",
                  primary: true,
                  onSelect: () => {
                    setFlag("librarySlipFound");
                    addItem("libraryCallSlip");
                    addClue("librarySlip");
                    speak("Kayla saves the blank call slip and blue book dust. The smudge points to the old card catalog.");
                  }
                },
                {
                  label: "Blame a prank",
                  description: "Guess before checking the mechanism.",
                  xpPenalty: 2,
                  xpReason: "guessing before testing the return trail costs detective XP.",
                  onSelect: () =>
                    speak("Maybe, but good detectives do not stop at maybe. The cart has a catalog clue.")
                }
              ]
            })
        },
        {
          id: "library-catalog",
          label: "Open card catalog",
          requires: () => getFlag("librarySlipFound"),
          lockedLabel: "Find return-cart clue",
          lockedMessage:
            "The catalog matters after Kayla finds the slip and smudge on the return cart.",
          x: 64,
          y: 55,
          action: () =>
            openActionMenu({
              title: "Old Card Catalog",
              image: INSPECTIONS.catalogCipher.image,
              text:
                "One drawer sticks out by a finger-width. Inside is a brass cipher wheel and a note-sized space where the blue book's call card should be.",
              actions: [
                {
                  label: "Take cipher wheel",
                  description: "Add the catalog tool to the satchel.",
                  primary: !hasItem("cipherWheel"),
                  onSelect: () => {
                    setFlag("catalogDrawerFound");
                    addItem("cipherWheel");
                    addClue("catalogCipher");
                    speak("Kayla adds the catalog cipher wheel to her satchel. The wheel wants a five-letter family name.");
                  }
                },
                {
                  label: "Solve catalog cipher",
                  description: "Use the Kline clue from Moonwake to open the local-history room.",
                  requires: () => hasItem("cipherWheel") || getFlag("catalogDrawerFound"),
                  lockedMessage: "Kayla should take the cipher wheel from the catalog drawer first.",
                  primary: hasItem("cipherWheel") || getFlag("catalogDrawerFound"),
                  onSelect: openCatalogCipherMiniGame
                }
              ]
            })
        },
        {
          id: "library-history-door",
          label: "Enter local-history room",
          requires: () => getFlag("libraryCipherSolved"),
          lockedLabel: "Solve catalog cipher",
          lockedMessage:
            "The local-history room is locked until Kayla solves the catalog cipher.",
          x: 51,
          y: 32,
          action: () => navigate("historyRoom")
        }
      ]
    },
    historyRoom: {
      title: "Local History Room",
      subtitle: "Rowan Library",
      image: "./assets/case4-history-room.png",
      showWhen: () => getFlag("case4Unlocked"),
      unlockFlag: "libraryCipherSolved",
      lockedLead:
        "The local-history room opens after Kayla solves the old catalog cipher.",
      lead:
        "The local-history room feels half library, half tiny museum. The blue book waits on a display stand beside town ribbons, a quilt, and flat-file drawers.",
      hotspots: [
        {
          id: "history-blue-book",
          label: "Test blue book display",
          x: 19,
          y: 74,
          action: () =>
            openActionMenu({
              title: "Vanishing Blue Book",
              image: INSPECTIONS.libraryBookChute.image,
              text:
                "The blue book rests on a slanted stand. A narrow slot hides behind the lip, exactly the width of a book cover.",
              actions: [
                {
                  label: "Tie Pickles' bell",
                  description: "Use a Case 01 satchel item to test whether the book moves.",
                  requires: () => hasItem("picklesBell"),
                  lockedMessage: "Kayla needs Pickles' tiny bell from Mila's thank-you to test the moving stand gently.",
                  primary: true,
                  onSelect: () => {
                    setFlag("bookChuteTested");
                    addItem("blueBook");
                    addClue("bookChute");
                    speak("When afternoon sun warms the stand, the blue book slides into a hidden return chute and Pickles' bell rings. The book was not stolen; it was being returned by a clever old display.");
                  }
                },
                {
                  label: "Hold the book still",
                  description: "Stop the vanishing without explaining it.",
                  onSelect: () =>
                    speak("The book stays put while Kayla holds it, but that only proves her hand works. She needs to test the stand.")
                }
              ]
            })
        },
        {
          id: "history-quilt",
          label: "Study town quilt",
          x: 73,
          y: 29,
          action: () =>
            openActionMenu({
              title: "Town Quilt Pattern",
              image: INSPECTIONS.quiltPattern.image,
              text:
                "The quilt is cheerful and public, but one little four-point pattern repeats in a way Kayla has seen before.",
              actions: [
                {
                  label: "Compare to photo backing",
                  description: "Connect the public town pattern to Kayla's private clue.",
                  requires: () => getFlag("photoSlideSolved"),
                  lockedMessage: "Kayla should restore the old photograph before comparing its backing mark to the quilt.",
                  primary: getFlag("photoSlideSolved") && !getFlag("quiltPatternFound"),
                  onSelect: () => {
                    setFlag("quiltPatternFound");
                    addItem("quiltPatternSketch");
                    addClue("quiltPattern");
                    speak("The quilt pattern matches the hidden mark on Kayla's restored photograph. The clue is public, but someone used it privately.");
                  }
                },
                {
                  label: "Sketch the pattern",
                  description: "Save the pattern even if Kayla cannot prove it yet.",
                  onSelect: () => {
                    setFlag("quiltPatternFound");
                    addItem("quiltPatternSketch");
                    addClue("quiltPattern");
                    speak("Kayla sketches the quilt pattern. It feels familiar enough to keep in her private file.");
                  }
                }
              ]
            })
        },
        {
          id: "history-flat-file",
          label: "Open Kline flat file",
          requires: () => getFlag("bookChuteTested") && getFlag("quiltPatternFound"),
          lockedLabel: "Solve room clues",
          lockedMessage:
            "Kayla should prove why the blue book vanishes and record the quilt pattern before opening the Kline flat file.",
          x: 60,
          y: 62,
          action: () =>
            openActionMenu({
              title: "Kline Family File",
              image: "./assets/case4-catalog-cipher.png",
              text:
                "The flat-file drawer sticks for a moment, then slides open. A local-history card sits alone in the front pocket.",
              actions: [
                {
                  label: "Copy Mara Kline card",
                  description: "Solve the case and advance Kayla's private mystery.",
                  primary: true,
                  onSelect: () => {
                    setFlag("case4Solved");
                    addItem("maraFileCard");
                    addClue("maraName");
                    addClue("case4Solved");
                    openCase4Closed();
                  }
                },
                {
                  label: "Ask Ms. Rowan first",
                  description: "Be careful with family records.",
                  onSelect: () =>
                    speak("Ms. Rowan nods from the doorway. 'Copy only what you can explain, Kayla. The rest will wait.'")
                }
              ]
            })
        },
        {
          id: "history-library-return",
          label: "Return to reading room",
          x: 91,
          y: 72,
          action: () => navigate("rowanLibrary")
        }
      ]
    }
  };

  const LOCATION_ORDER = [
    "clubhouse",
    "bakery",
    "park",
    "garden",
    "briarExterior",
    "briarFoyer",
    "briarLiving",
    "briarNursery",
    "observatoryExterior",
    "observatoryWorkshop",
    "observatoryDome",
    "observatoryArchive",
    "rowanLibrary",
    "historyRoom"
  ];

  const PUZZLES = {
    coaxPickles: {
      title: "Coax Pickles Out",
      image: "./assets/pickles-rabbit.jpg",
      intro:
        "Mr. Basil's clue is the order: make Pickles feel safe, offer a snack, then use the familiar bell. Choose three moves in order.",
      choices: ["Call loudly", "Walk quietly", "Reach into basket", "Offer carrot", "Ring ribbon bell"],
      answer: ["Walk quietly", "Offer carrot", "Ring ribbon bell"],
      solvedFlag: "caseSolved",
      solvedClue: "solved",
      reward: "pickles",
      success:
        "Pickles hops out, safe and happy. Mila is going to be so relieved.",
      already:
        "Pickles is already safe in Kayla's arms."
    }
  };

  const MOON_MAZE = {
    size: 6,
    start: { col: 0, row: 5 },
    goal: { col: 5, row: 0 },
    blocked: new Set([
      "1,0",
      "1,1",
      "3,1",
      "4,1",
      "3,2",
      "0,3",
      "1,3",
      "5,3",
      "1,4",
      "3,4",
      "3,5",
      "4,5"
    ])
  };

  const PHOTO_SLIDE = {
    size: 3,
    image: "./assets/inspect-family-photo.jpg",
    blank: 8,
    solved: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    start: [0, 1, 2, 6, 3, 5, 4, 7, 8]
  };

  const CATALOG_CIPHER = {
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    answer: "KLINE",
    start: "GRAEF"
  };

  const state = loadState();
  let toastTimer = null;
  let activeAudio = null;
  let pendingXpMessage = "";
  const audioStatus = {
    checked: false,
    hasAnyClip: false,
    clips: {}
  };

  const els = {
    sceneImage: document.getElementById("sceneImage"),
    locationTitle: document.getElementById("locationTitle"),
    locationSubtitle: document.getElementById("locationSubtitle"),
    hotspotLayer: document.getElementById("hotspotLayer"),
    mapNav: document.getElementById("mapNav"),
    caseTitle: document.getElementById("caseTitle"),
    xpBadge: document.getElementById("xpBadge"),
    objectiveChip: document.getElementById("objectiveChip"),
    satchelButton: document.getElementById("satchelButton"),
    notebookButton: document.getElementById("notebookButton"),
    hintButton: document.getElementById("hintButton"),
    resetButton: document.getElementById("resetButton"),
    storyButton: document.getElementById("storyButton"),
    voiceButton: document.getElementById("voiceButton"),
    progressText: document.getElementById("progressText"),
    progressFill: document.getElementById("progressFill"),
    modalRoot: document.getElementById("modalRoot"),
    toast: document.getElementById("toast")
  };

  function defaultState() {
    return {
      location: "clubhouse",
      inventory: [],
      clues: [],
      flags: {},
      xp: 100,
      xpEvents: [],
      meta: {
        createdWith: APP_BUILD_ID,
        lastBuildSeen: APP_BUILD_ID
      },
      voiceEnabled: false,
      lead:
        "Open Kayla's dossier. The first case begins when someone reaches the tree fort for help."
    };
  }

  function loadState() {
    const fallback = defaultState();
    try {
      if (localStorage.getItem(RESET_MARKER_KEY) !== FORCE_RESET_ON_BUILD) {
        localStorage.removeItem(STORAGE_KEY);
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
        localStorage.setItem(RESET_MARKER_KEY, FORCE_RESET_ON_BUILD);
        return fallback;
      }
      const saved = readSavedState(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map(readSavedState).find(Boolean);
      if (!saved || !saved.flags) {
        return fallback;
      }
      const migrated = {
        ...fallback,
        ...saved,
        inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
        clues: Array.isArray(saved.clues) ? saved.clues : [],
        xp: Number.isFinite(saved.xp) ? saved.xp : fallback.xp,
        xpEvents: Array.isArray(saved.xpEvents) ? saved.xpEvents : [],
        flags: saved.flags && typeof saved.flags === "object" ? saved.flags : {},
        meta: {
          ...fallback.meta,
          ...(saved.meta || {}),
          lastBuildSeen: APP_BUILD_ID
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch (error) {
      return fallback;
    }
  }

  function readSavedState(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    state.meta = {
      ...(state.meta || {}),
      lastBuildSeen: APP_BUILD_ID
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function hasItem(itemId) {
    return state.inventory.includes(itemId);
  }

  function addItem(itemId) {
    if (!ITEMS[itemId] || hasItem(itemId)) {
      return;
    }
    state.inventory.push(itemId);
    saveState();
    render();
  }

  function addClue(clueId) {
    if (!CLUES[clueId] || state.clues.includes(clueId)) {
      return;
    }
    state.clues.push(clueId);
    saveState();
    render();
  }

  function hasClue(clueId) {
    return state.clues.includes(clueId);
  }

  function getFlag(flag) {
    return Boolean(state.flags[flag]);
  }

  function setFlag(flag) {
    if (state.flags[flag]) {
      return;
    }
    state.flags[flag] = true;
    saveState();
    render();
  }

  function changeXp(amount, reason, options = {}) {
    if (!Number.isFinite(amount) || amount === 0) {
      return;
    }
    if (options.once) {
      state.xpEvents = Array.isArray(state.xpEvents) ? state.xpEvents : [];
      if (state.xpEvents.includes(options.once)) {
        return;
      }
      state.xpEvents.push(options.once);
    }
    const currentXp = Number.isFinite(state.xp) ? state.xp : 100;
    state.xp = Math.max(0, Math.min(150, currentXp + amount));
    saveState();
    renderXp();
    if (reason) {
      pendingXpMessage = reason;
    }
  }

  function applyChoiceXp(menuAction, menuTitle) {
    const eventKey = `choice:${menuTitle}:${menuAction.label}`;
    if (Number.isFinite(menuAction.xpPenalty)) {
      changeXp(
        -Math.abs(menuAction.xpPenalty),
        `XP -${Math.abs(menuAction.xpPenalty)}: ${menuAction.xpReason || "That choice skipped the evidence."}`,
        { once: eventKey }
      );
      return;
    }
    if (Number.isFinite(menuAction.xpReward)) {
      changeXp(
        Math.abs(menuAction.xpReward),
        `XP +${Math.abs(menuAction.xpReward)}: ${menuAction.xpReason || "Good detective choice."}`,
        { once: eventKey }
      );
      return;
    }
    if (menuAction.primary) {
      changeXp(2, "XP +2: good detective choice.", { once: eventKey });
    }
  }

  function speak(message) {
    const toastMessage = pendingXpMessage ? `${message} ${pendingXpMessage}` : message;
    pendingXpMessage = "";
    state.lead = message;
    saveState();
    render();
    showToast(toastMessage);
  }

  function hasGeneratedAudio() {
    if (!VOICE_FEATURE_ENABLED) {
      return false;
    }
    return audioStatus.hasAnyClip;
  }

  async function clipExists(src) {
    if (!src) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(audioStatus.clips, src)) {
      return audioStatus.clips[src];
    }
    try {
      const response = await fetch(src, { method: "HEAD", cache: "no-store" });
      const lengthHeader = response.headers.get("content-length");
      const contentLength = lengthHeader ? Number(lengthHeader) : 0;
      const hasAudioData = !lengthHeader || contentLength > 4096;
      const exists = response.ok && hasAudioData;
      audioStatus.clips[src] = exists;
      audioStatus.hasAnyClip = audioStatus.hasAnyClip || exists;
      return exists;
    } catch (error) {
      audioStatus.clips[src] = false;
      return false;
    }
  }

  async function refreshAudioStatus() {
    const configuredClips = Object.values(AUDIO_CLIPS).filter(Boolean);
    const results = await Promise.all(configuredClips.map((src) => clipExists(src)));
    audioStatus.checked = true;
    audioStatus.hasAnyClip = results.some(Boolean);
    renderVoiceButton();
  }

  async function playVoiceClip(clipId) {
    if (!VOICE_FEATURE_ENABLED) {
      showToast("Voice acting is not enabled in this demo build yet.");
      return;
    }
    const src = AUDIO_CLIPS[clipId];
    if (!src) {
      showToast("Voice clips are not generated yet for this line.");
      return;
    }
    const exists = await clipExists(src);
    audioStatus.checked = true;
    renderVoiceButton();
    if (!exists) {
      showToast(AUDIO_MISSING_MESSAGE);
      return;
    }
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    activeAudio = new Audio(src);
    activeAudio.play().catch(() => {
      showToast("Could not play this voice clip.");
    });
  }

  async function toggleVoice() {
    if (!VOICE_FEATURE_ENABLED) {
      state.voiceEnabled = false;
      saveState();
      renderVoiceButton();
      showToast("Voice acting needs a better source than the local system voice.");
      return;
    }
    if (!audioStatus.checked) {
      await refreshAudioStatus();
    }
    if (!hasGeneratedAudio()) {
      state.voiceEnabled = false;
      saveState();
      renderVoiceButton();
      showToast(AUDIO_MISSING_MESSAGE);
      return;
    }
    state.voiceEnabled = !state.voiceEnabled;
    saveState();
    renderVoiceButton();
    showToast(state.voiceEnabled ? "Voice on." : "Voice off.");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("visible");
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("visible");
    }, TOAST_DURATION_MS);
  }

  function navigate(locationId) {
    const location = LOCATIONS[locationId];
    if (!location) {
      return;
    }
    if (!canEnterLocation(locationId)) {
      speak(location.lockedLead || "Kayla needs another clue before going there.");
      return;
    }
    state.location = locationId;
    state.lead = location.lead;
    saveState();
    render();
  }

  function canEnterLocation(locationId) {
    const location = LOCATIONS[locationId];
    if (!location) {
      return false;
    }
    return canShowLocation(locationId) && (!location.unlockFlag || getFlag(location.unlockFlag));
  }

  function canShowLocation(locationId) {
    const location = LOCATIONS[locationId];
    return Boolean(location) && (!location.showWhen || location.showWhen());
  }

  function canShowHotspot(hotspot) {
    return !hotspot.showWhen || hotspot.showWhen();
  }

  function canUseHotspot(hotspot) {
    return !hotspot.requires || hotspot.requires();
  }

  function getGuidance() {
    if (!getFlag("clientInterview")) {
      return {
        text: "Talk to Mila at the tree fort and learn what Pickles likes.",
        locationId: "clubhouse",
        hotspotIds: ["club-mila"]
      };
    }
    if (!getFlag("poppyTalked")) {
      return {
        text: "Go to Poppy's Bakery and ask Mrs. Poppy what she saw.",
        locationId: "bakery",
        hotspotIds: ["bakery-poppy"]
      };
    }
    if (!getFlag("bakeryClue")) {
      return {
        text: "Inspect the bakery patio clues before leaving.",
        locationId: "bakery",
        hotspotIds: ["bakery-clues"]
      };
    }
    if (!getFlag("parkTrail")) {
      return {
        text: "Follow the trail to Picnic Park and sketch the paw prints.",
        locationId: "park",
        hotspotIds: ["park-prints"]
      };
    }
    if (!getFlag("basilTalked")) {
      return {
        text: "Go to the community garden and ask Mr. Basil how to approach a scared rabbit.",
        locationId: "garden",
        hotspotIds: ["garden-basil"]
      };
    }
    if (!getFlag("caseSolved")) {
      return {
        text: "Search the lavender bench and use Mr. Basil's gentle order.",
        locationId: "garden",
        hotspotIds: ["garden-basket"]
      };
    }
    if (!getFlag("case2Unlocked")) {
      return {
        text: "Case 01 is solved. Talk to Mila at the clubhouse to begin Case 02.",
        locationId: "clubhouse",
        hotspotIds: ["club-mila"]
      };
    }
    if (getFlag("case4Unlocked")) {
      if (!getFlag("rowanTalked")) {
        return {
          text: "Ask Ms. Rowan why the blue book keeps vanishing.",
          locationId: "rowanLibrary",
          hotspotIds: ["library-rowan"]
        };
      }
      if (!getFlag("librarySlipFound")) {
        return {
          text: "Inspect the return cart for the blue book's trail.",
          locationId: "rowanLibrary",
          hotspotIds: ["library-cart"]
        };
      }
      if (!getFlag("catalogDrawerFound")) {
        return {
          text: "Open the old card catalog drawer.",
          locationId: "rowanLibrary",
          hotspotIds: ["library-catalog"]
        };
      }
      if (!getFlag("libraryCipherSolved")) {
        return {
          text: "Solve the catalog cipher with the Kline family clue.",
          locationId: "rowanLibrary",
          hotspotIds: ["library-catalog"]
        };
      }
      if (!getFlag("bookChuteTested")) {
        return {
          text: "Test the blue book display with Pickles' bell.",
          locationId: "historyRoom",
          hotspotIds: ["history-blue-book"]
        };
      }
      if (!getFlag("quiltPatternFound")) {
        return {
          text: "Compare the town quilt pattern to Kayla's photo clue.",
          locationId: "historyRoom",
          hotspotIds: ["history-quilt"]
        };
      }
      if (!getFlag("case4Solved")) {
        return {
          text: "Open the Kline flat file and copy the Mara card.",
          locationId: "historyRoom",
          hotspotIds: ["history-flat-file"]
        };
      }
      return {
        text: "Case 04 is solved. Review the Mara Kline card or return to the clubhouse.",
        locationId: state.location,
        hotspotIds: []
      };
    }
    if (getFlag("case3Solved")) {
      return {
        text: "Case 03 is solved. Open the Rowan Library file to begin Case 04.",
        locationId: "clubhouse",
        hotspotIds: ["club-library", "club-board"]
      };
    }
    if (getFlag("case3Unlocked")) {
      if (!getFlag("theoTalked")) {
        return {
          text: "Ask Theo what flashed at Moonwake Observatory.",
          locationId: "observatoryExterior",
          hotspotIds: ["observatory-theo"]
        };
      }
      if (!getFlag("observatoryGate")) {
        return {
          text: "Use Mrs. Wren's crescent token on the observatory gate.",
          locationId: "observatoryExterior",
          hotspotIds: ["observatory-gate"]
        };
      }
      if (!getFlag("starChartRead")) {
        return {
          text: "Lay out Mrs. Wren's star chart and trace the moonlight path.",
          locationId: "observatoryWorkshop",
          hotspotIds: ["workshop-chart"]
        };
      }
      if (!getFlag("moonDialClue")) {
        return {
          text: "Inspect the moon dials and sketch the new-half-full order.",
          locationId: "observatoryWorkshop",
          hotspotIds: ["workshop-dials"]
        };
      }
      if (!getFlag("bellTested")) {
        return {
          text: "Test the signal cord with Pickles' tiny bell.",
          locationId: "observatoryWorkshop",
          hotspotIds: ["workshop-bell"]
        };
      }
      if (!getFlag("telescopeAligned")) {
        return {
          text: "Go to the dome and align the telescope with the star chart.",
          locationId: "observatoryDome",
          hotspotIds: ["dome-telescope"]
        };
      }
      if (!getFlag("prismAligned")) {
        return {
          text: "Align the floor prism after the telescope, dials, and bell test are ready.",
          locationId: "observatoryDome",
          hotspotIds: ["dome-prism"]
        };
      }
      if (!getFlag("archiveUnlocked")) {
        return {
          text: "Open the workshop drawer with the numbers from Cases 1, 2, and 3.",
          locationId: "observatoryWorkshop",
          hotspotIds: ["workshop-lock"]
        };
      }
      if (!getFlag("case3Solved")) {
        return {
          text: "Read the Moonwake family ledger in the archive.",
          locationId: "observatoryArchive",
          hotspotIds: ["archive-ledger"]
        };
      }
      return {
        text: "Case 03 is solved. Review the ledger or return to the clubhouse.",
        locationId: state.location,
        hotspotIds: []
      };
    }
    if (!getFlag("hexibaldWarning")) {
      return {
        text: "At Briar Lane, ask Mr. Hexibald why he keeps everyone away.",
        locationId: "briarExterior",
        hotspotIds: ["briar-hexibald", "briar-warning"]
      };
    }
    if (!getFlag("briarWindowClue")) {
      return {
        text: "Study the glowing upper window.",
        locationId: "briarExterior",
        hotspotIds: ["briar-window"]
      };
    }
    if (!getFlag("briarWindClue")) {
      return {
        text: "Check the loose shutter and match the knocking sound.",
        locationId: "briarExterior",
        hotspotIds: ["briar-shutter"]
      };
    }
    if (!getFlag("briarInside")) {
      return {
        text: "Ask Mr. Hexibald for permission to look inside.",
        locationId: "briarExterior",
        hotspotIds: ["briar-porch"]
      };
    }
    if (!getFlag("briarMusicClue")) {
      return {
        text: "Follow the piano music and inspect the keys.",
        locationId: "briarLiving",
        hotspotIds: ["living-piano"]
      };
    }
    if (!getFlag("briarVisitorTrail")) {
      return {
        text: "Use the footprints or shawl to prove a real person visits the house.",
        locationId: "briarLiving",
        hotspotIds: ["living-footprints", "living-shawl"]
      };
    }
    if (!getFlag("grandmotherMet")) {
      return {
        text: "Speak kindly to the night visitor by the piano.",
        locationId: "briarLiving",
        hotspotIds: ["living-grandmother"]
      };
    }
    if (!getFlag("moonMazeSolved")) {
      return {
        text: hasItem("moonMazeToy")
          ? "Play the moon-maze toy in the old girls' room."
          : "Open the toy drawer in the old girls' room.",
        locationId: "briarNursery",
        hotspotIds: ["nursery-toy-drawer"]
      };
    }
    if (!getFlag("briarPortraitClue")) {
      return {
        text: "Open the keepsake box and study the old portrait.",
        locationId: "briarNursery",
        hotspotIds: ["nursery-box"]
      };
    }
    if (!getFlag("case3Unlocked")) {
      return {
        text: "Case 02 is solved. Collect Mrs. Wren's Moonwake lead at the clubhouse.",
        locationId: "clubhouse",
        hotspotIds: ["club-mila"]
      };
    }
    return {
      text: "Review Kayla's private file or follow the next case lead.",
      locationId: state.location,
      hotspotIds: []
    };
  }

  function render() {
    let location = LOCATIONS[state.location] || LOCATIONS.clubhouse;
    if (!canEnterLocation(state.location)) {
      state.location = "clubhouse";
      location = LOCATIONS.clubhouse;
      state.lead = location.lead;
      saveState();
    }
    const currentCase = getCurrentCase();
    els.sceneImage.style.backgroundImage = `url("${location.image}")`;
    els.locationTitle.textContent = location.title;
    els.locationSubtitle.textContent = location.subtitle;
    if (els.caseTitle) {
      els.caseTitle.textContent = currentCase.title;
    }
    const guidance = getGuidance();
    if (els.objectiveChip) {
      els.objectiveChip.textContent = `Next lead: ${guidance.text}`;
    }
    if (!state.lead) {
      state.lead = location.lead;
      saveState();
    }
    renderHotspots(location, guidance);
    renderMap(guidance);
    renderSatchelButton();
    renderNotebookButton();
    renderXp();
    renderProgress();
    renderVoiceButton();
  }

  function getArcText() {
    if (getFlag("case4Solved")) {
      return "Kayla has a new private-file name: Mara Kline. Finch is still the family that raised her; Kline is the family line the old clues keep protecting.";
    }
    if (getFlag("maraName")) {
      return "The Rowan Library card connects M.K. to Mara Kline. Kayla does not know whether Mara is her mother yet, but the Kline name belongs in the center of the private file.";
    }
    if (getFlag("case4Unlocked")) {
      return "Moonwake's ledger pointed Kayla to Rowan Library. The Kline branch is not her adopted Finch name, which makes it feel like a clue from before she was adopted.";
    }
    if (getFlag("milaCousin")) {
      return "Moonwake's ledger connects Gale, Wren, and Kline branches. Kayla is not ready to call Mila her cousin yet, but the clue is too strong to ignore.";
    }
    if (getFlag("case3Solved")) {
      return "Kayla solved Moonwake's strange lights and found a family ledger hiding under the surface mystery. The Kline branch may belong in Kayla's private file.";
    }
    if (getFlag("prismAligned")) {
      return "The observatory flashes are a prism signal, not magic. Now Kayla needs to learn why someone wanted her to reach the archive.";
    }
    if (getFlag("case3Unlocked")) {
      return "Mrs. Wren's star chart and crescent token point Kayla toward Moonwake Observatory, where the same crescent shape keeps appearing.";
    }
    if (getFlag("briarPortraitClue")) {
      return "Kayla has found a Briar Lane portrait of a young woman with her eyes and a crescent locket. Mrs. Wren knows more than she is saying.";
    }
    if (getFlag("grandmotherMet")) {
      return "Mrs. Wren solved the ghost rumor, but not the bigger question. She remembers the house like family and gave Kayla a key without explaining why.";
    }
    if (getFlag("photoSlideSolved")) {
      return "Kayla restored the old photograph and found a crescent stamp with the initials M.K. on the back. The picture was saved for someone to notice.";
    }
    if (getFlag("case2Unlocked")) {
      return "Briar Lane is supposed to be empty, but Mila's warning opened a new lead: someone is visiting the old house after dark.";
    }
    if (getFlag("familyPhotoFound")) {
      return "Kayla has two personal clues now: a crescent mark like her locket and an old photograph of a woman who looks like her. Someone may be guiding her with cases.";
    }
    if (getFlag("identityClueFound")) {
      return "Kayla noticed a crescent-and-star mark like her locket on the picnic envelope. It is tiny, but it belongs in her personal case file.";
    }
    return "Kayla's oldest clue is a crescent locket from before she was adopted. Most club cases are for neighbors, but some leave crumbs for Kayla too.";
  }

  function renderXp() {
    if (!els.xpBadge) {
      return;
    }
    const xp = Number.isFinite(state.xp) ? state.xp : 100;
    els.xpBadge.textContent = `XP ${xp}`;
    els.xpBadge.classList.toggle("xp-low", xp < 70);
    els.xpBadge.classList.toggle("xp-high", xp >= 120);
  }

  function openCaseBoard() {
    const detail = getCaseBoardDetail();
    openActionMenu({
      title: detail.title,
      image: detail.image,
      text: detail.text,
      actions: detail.actions
    });
  }

  function openCurrentCaseBoardInspection(detail = getCaseBoardDetail()) {
    openInspection("caseBoard", {
      title: detail.title,
      image: detail.image,
      text: detail.inspectText || detail.text
    });
  }

  function getCaseBoardDetail() {
    if (getFlag("case4Unlocked")) {
      const solved = getFlag("case4Solved");
      const detail = {
        title: solved ? "Case Board: Mara Kline Card" : "Case Board: Vanishing Blue Book",
        image: solved ? "./assets/case4-catalog-cipher.png" : "./assets/case4-library.png",
        text: solved
          ? "The library board is complete: the blue book had a hidden return chute, and the Kline file gave Kayla a new private clue."
          : "The board now shows Rowan Library, Ms. Rowan's missing blue book, the return cart, and the old card catalog cipher.",
        inspectText: solved
          ? "Kayla marks Case 04 solved and files Mara Kline under the private mystery. Finch is her adopted family name; Kline is the family line the clues are starting to name."
          : "Current case: Rowan Library. Kayla pins Ms. Rowan's report, the return-cart slip, the catalog cipher wheel, and the question: why does the blue book keep returning itself?"
      };
      detail.actions = [
        {
          label: solved ? "Review Mara card" : "Read library board",
          description: "Review the current Case 04 file.",
          onSelect: () => openCurrentCaseBoardInspection(detail)
        },
        {
          label: "Go to Rowan Library",
          description: "Return to the library and keep working Case 04.",
          primary: !solved,
          onSelect: () => navigate("rowanLibrary")
        },
        {
          label: solved ? "File Kline clue" : "Check Kline clue",
          description: solved
            ? "Think about what the solved library case revealed about Kayla."
            : "Review why the catalog cipher uses Kline, not Finch.",
          onSelect: () =>
            speak(
              solved
                ? "Kayla writes it carefully: Finch is home. Kline is the name from before. Both can be true."
                : "The Moonwake ledger used Kline. The library catalog responds to Kline. Kayla is starting to understand that Finch may not be her first family name."
            )
        }
      ];
      return detail;
    }

    if (getFlag("case3Unlocked")) {
      const solved = getFlag("case3Solved");
      const detail = {
        title: solved ? "Case Board: Moonwake Archive" : "Case Board: Moonwake Observatory",
        image: solved ? "./assets/inspect-archive.jpg" : "./assets/case2-observatory-handoff.jpg",
        text: solved
          ? "The board has shifted to the family ledger Kayla found at Moonwake. This case is solved, and the Kline branch points to Rowan Library."
          : "Mrs. Wren's star chart and crescent token are pinned as the current case file. The question is why Moonwake flashes after midnight.",
        inspectText: solved
          ? "Kayla marks the Moonwake case solved and circles the ledger branch connecting Gale, Wren, and Kline. Mila's name suddenly feels like evidence."
          : "Current case: Moonwake Observatory. Kayla pins Mrs. Wren's star chart, the crescent token, Theo's locked-gate report, and the question: what is making the dome flash?"
      };
      detail.actions = [
        {
          label: solved ? "Review family ledger" : "Read Moonwake board",
          description: "Review the current Case 03 file.",
          onSelect: () => openCurrentCaseBoardInspection(detail)
        },
        {
          label: "Go to Observatory",
          description: "Return to Moonwake and keep working the current case.",
          primary: !solved,
          onSelect: () => navigate("observatoryExterior")
        },
        {
          label: solved ? "Begin Case 04" : "Check useful numbers",
          description: solved
            ? "Follow the library slip hidden with the Moonwake ledger."
            : "Review the earlier case objects that may matter at Moonwake.",
          primary: solved && !getFlag("case4Unlocked"),
          onSelect: solved && !getFlag("case4Unlocked")
            ? openCase4Bridge
            : () =>
                speak("Kayla checks her satchel: Mila's five dollars, the 17-inch height mark, and three moon phases might be more than souvenirs.")
        },
        {
          label: solved ? "Add to personal file" : "Review personal thread",
          description: solved
            ? "Think about what the solved case revealed about Kayla."
            : "Review the longer family mystery thread.",
          onSelect: () =>
            speak(
              solved
                ? "Kayla files the ledger under her personal mystery: Gale, Wren, Kline. Maybe Mila has been family all along."
                : "Kayla checks the private file: crescent locket, old photograph, Briar portrait, and a name she does not understand yet."
            )
        }
      ];
      return detail;
    }

    if (getFlag("case2Unlocked")) {
      const detail = {
        title: "Case Board: Briar Lane House",
        image: "./assets/case2-exterior.jpg",
        text:
          "The board now shows Briar Lane House, not Pickles. Kayla's current question is who keeps entering the empty house after dark.",
        inspectText:
          "Current case: Briar Lane House. Kayla pins Mila's worry, Mr. Hexibald's warning, the glowing upstairs window, the shutter knock, and the old piano music."
      };
      detail.actions = [
        {
          label: "Read Briar Lane board",
          description: "Review the current Case 02 file.",
          onSelect: () => openCurrentCaseBoardInspection(detail)
        },
        {
          label: "Go to Briar Lane",
          description: "Return to the front gate and investigate the house.",
          primary: !getFlag("briarPortraitClue"),
          onSelect: () => navigate("briarExterior")
        },
        {
          label: "Name the question",
          description: "Clarify what Kayla is trying to prove.",
          onSelect: () =>
            speak("Kayla writes the real question: if Briar Lane is empty, who is visiting after dark, and why do they care so much?")
        }
      ];
      return detail;
    }

    if (getFlag("caseSolved")) {
      const detail = {
        title: "Case Board: Pickles Found",
        image: "./assets/case1-thank-you-mila.jpg",
        text:
          "The Pickles board is complete. Kayla solved the trail in order and earned the club's first five-dollar case fee.",
        inspectText:
          "Solved case: Mila's carrot clue led to Mrs. Poppy, the bakery trail led to the fountain, the fountain prints led to the garden, and Mr. Basil's order brought Pickles out safely."
      };
      detail.actions = [
        {
          label: "Read solved board",
          description: "Review why the Pickles case worked.",
          onSelect: () => openCurrentCaseBoardInspection(detail)
        },
        {
          label: "Talk to Mila",
          description: "Let Mila explain the next worry that points to Case 02.",
          primary: true,
          onSelect: openCase2Bridge
        }
      ];
      return detail;
    }

    if (getFlag("clientInterview")) {
      const milaPinned = hasClue("mila");
      const detail = {
        title: "Case Board: Mila and Pickles",
        image: "./assets/npc-mila.jpg",
        text:
          "Mila's worried client card is pinned to the board. Kayla knows Pickles is cream-colored, wears mint green, and loves carrot snacks.",
        inspectText:
          "Current case: Mila's missing rabbit. Kayla pins the witness facts, then asks the useful question: where would a hungry rabbit go first?"
      };
      detail.actions = [
        {
          label: "Read Pickles board",
          description: "Review the current Case 01 file.",
          onSelect: () => openCurrentCaseBoardInspection(detail)
        },
        {
          label: milaPinned ? "Review Mila's facts" : "Pin Mila's facts",
          description: milaPinned
            ? "Confirm the facts without changing the trail."
            : "Record the rabbit description so Kayla knows what trail to follow.",
          primary: !milaPinned,
          onSelect: () => {
            addClue("mila");
            speak(
              milaPinned
                ? "Kayla checks the pinned facts again: cream rabbit, mint ribbon, carrot snacks. The bakery is still the strongest next lead."
                : "Kayla pins the useful facts: cream rabbit, mint ribbon, carrot snacks. Next lead: the bakery smells like carrots."
            );
          }
        },
        {
          label: "Guess the garden",
          description: "A guess without a trail. This will not unlock the next place.",
          xpPenalty: 2,
          xpReason: "guessing before collecting a trail costs detective XP.",
          onSelect: () =>
            speak("Too soon. Kayla needs a trail, not a guess. A good detective starts with the witness and the snack clue.")
        }
      ];
      return detail;
    }

    const detail = {
      title: "Kayla's Case Board",
      image: INSPECTIONS.caseBoard.image,
      text:
        "The tree-fort board is ready, but the Pickles case has not started yet. Kayla should hear Mila's whole story before pinning any clues.",
      inspectText:
        "No active case is pinned yet. Kayla keeps blank cards, string, and thumbtacks ready for the next client."
    };
    detail.actions = [
      {
        label: "Read empty board",
        description: "Check what Kayla knows before the first client interview.",
        onSelect: () => openCurrentCaseBoardInspection(detail)
      },
      {
        label: "Talk to Mila",
        description: "Start the first case by hearing from the worried pet owner.",
        primary: true,
        onSelect: openMilaHotspot
      },
      {
        label: "Pin a clue now",
        description: "Too early. Kayla needs a witness statement first.",
        xpPenalty: 1,
        xpReason: "pinning a clue before an interview is just guessing.",
        onSelect: () =>
          speak("Kayla stops with the thumbtack in her hand. No case facts yet. First rule: talk to the client.")
      }
    ];
    return detail;
  }

  function getCurrentCase() {
    if (state.location === "rowanLibrary" || state.location === "historyRoom") {
      return { title: STORY.case4Title };
    }
    if (getFlag("case4Unlocked")) {
      return { title: STORY.case4Title };
    }
    if (state.location && state.location.startsWith("observatory")) {
      return { title: STORY.case3Title };
    }
    if (getFlag("case3Unlocked")) {
      return { title: STORY.case3Title };
    }
    if (state.location && state.location.startsWith("briar")) {
      return { title: STORY.case2Title };
    }
    if (getFlag("case2Unlocked") && getFlag("caseSolved")) {
      return { title: STORY.case2Title };
    }
    return { title: STORY.case1Title };
  }

  function renderVoiceButton() {
    if (!VOICE_FEATURE_ENABLED) {
      els.voiceButton.hidden = true;
      els.voiceButton.setAttribute("aria-hidden", "true");
      return;
    }
    els.voiceButton.hidden = false;
    els.voiceButton.removeAttribute("aria-hidden");
    if (!audioStatus.checked) {
      els.voiceButton.textContent = "Voice Setup";
      els.voiceButton.setAttribute("aria-pressed", "false");
      return;
    }
    if (!hasGeneratedAudio()) {
      els.voiceButton.textContent = "Voice Pending";
      els.voiceButton.setAttribute("aria-pressed", "false");
      return;
    }
    els.voiceButton.textContent = state.voiceEnabled ? "Voice On" : "Voice Off";
    els.voiceButton.setAttribute("aria-pressed", String(state.voiceEnabled));
  }

  function renderHotspots(location, guidance) {
    els.hotspotLayer.replaceChildren();
    const nextHotspots = new Set(guidance.hotspotIds || []);

    location.hotspots.filter(canShowHotspot).forEach((hotspot) => {
      const available = canUseHotspot(hotspot);
      const isNext = available && nextHotspots.has(hotspot.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hotspot${available ? "" : " hotspot-locked"}${isNext ? " hotspot-next" : ""}`;
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;
      button.setAttribute("aria-label", available ? hotspot.label : hotspot.lockedLabel || hotspot.label);
      if (isNext) {
        button.setAttribute("data-next", "Next lead");
      }
      if (!available) {
        button.setAttribute("aria-disabled", "true");
        button.title = hotspot.lockedMessage || "Kayla needs another clue first.";
      }
      button.addEventListener("click", () => {
        if (!canUseHotspot(hotspot)) {
          speak(hotspot.lockedMessage || "Kayla needs another clue first.");
          return;
        }
        hotspot.action();
      });

      const label = document.createElement("span");
      label.className = "hotspot-label";
      label.textContent = isNext
        ? `Next: ${hotspot.label}`
        : available
          ? hotspot.label
          : hotspot.lockedLabel || hotspot.label;
      button.append(label);

      els.hotspotLayer.append(button);
    });
  }

  function renderMap(guidance) {
    els.mapNav.replaceChildren();

    LOCATION_ORDER.forEach((id) => {
      if (!canShowLocation(id)) {
        return;
      }
      const location = LOCATIONS[id];
      const available = canEnterLocation(id);
      const isNext = available && guidance.locationId === id && id !== state.location;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nav-button${available ? "" : " locked"}${isNext ? " next-lead" : ""}`;
      const stateLabel = id === state.location ? "current" : isNext ? "next lead" : !available ? "locked" : "";
      button.textContent = stateLabel ? `${location.title} • ${stateLabel}` : location.title;
      if (id === state.location) {
        button.setAttribute("aria-current", "page");
        button.title = "Kayla is here now.";
      }
      if (!available) {
        button.setAttribute("aria-disabled", "true");
        button.title = location.lockedLead || "Locked until Kayla finds another clue.";
      } else if (isNext) {
        button.title = `Next lead: ${guidance.text}`;
      } else if (id !== state.location) {
        button.title = `Move to ${location.title}.`;
      }
      button.addEventListener("click", () => navigate(id));
      els.mapNav.append(button);
    });
  }

  function renderSatchelButton() {
    if (!els.satchelButton) {
      return;
    }
    const count = state.inventory.length;
    els.satchelButton.textContent = count ? `Satchel (${count})` : "Satchel";
  }

  function renderNotebookButton() {
    if (!els.notebookButton) {
      return;
    }
    const count = state.clues.length;
    els.notebookButton.textContent = count ? `Notebook (${count})` : "Notebook";
  }

  function appendSatchelList(parent) {
    const list = document.createElement("ul");
    list.className = "inventory-list modal-list";

    if (!state.inventory.length) {
      const empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No satchel items yet.";
      list.append(empty);
      parent.append(list);
      return;
    }

    state.inventory.forEach((itemId) => {
      const item = ITEMS[itemId];
      if (!item) {
        return;
      }
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inventory-button";
      button.title = item.description;
      button.addEventListener("click", () => openItemInspection(itemId));

      const chip = document.createElement("span");
      chip.className = "item-chip";
      chip.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = item.label;
      button.append(chip, text);
      li.append(button);
      list.append(li);
    });

    parent.append(list);
  }

  function appendNotebookList(parent) {
    const list = document.createElement("ul");
    list.className = "clue-list modal-list";

    if (!state.clues.length) {
      const empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No notes recorded yet.";
      list.append(empty);
      parent.append(list);
      return;
    }

    state.clues.forEach((clueId) => {
      const li = document.createElement("li");
      li.textContent = CLUES[clueId] || clueId;
      list.append(li);
    });

    parent.append(list);
  }

  function openSatchel() {
    const modal = createModal("Kayla's Satchel");
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const intro = document.createElement("p");
    intro.className = "action-menu-copy";
    intro.textContent = "Objects Kayla has collected. Tap an item to inspect it.";
    body.append(intro);
    appendSatchelList(body);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);
    actions.append(close);
  }

  function openNotebook() {
    const modal = createModal("Kayla's Notebook", { wide: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const summary = document.createElement("div");
    summary.className = "notebook-summary";
    const leadLabel = document.createElement("p");
    leadLabel.className = "panel-label";
    leadLabel.textContent = "Current Lead";
    const lead = document.createElement("p");
    lead.textContent = state.lead || getGuidance().text;
    const arcLabel = document.createElement("p");
    arcLabel.className = "panel-label";
    arcLabel.textContent = "Private File";
    const arc = document.createElement("p");
    arc.textContent = getArcText();
    summary.append(leadLabel, lead, arcLabel, arc);
    body.append(summary);

    const cluesLabel = document.createElement("p");
    cluesLabel.className = "panel-label modal-section-label";
    cluesLabel.textContent = "Clues";
    body.append(cluesLabel);
    appendNotebookList(body);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);
    actions.append(close);
  }

  function renderProgress() {
    if (getFlag("case4Unlocked")) {
      const count = CASE4_BEATS.filter(getFlag).length;
      els.progressText.textContent = getFlag("case4Solved")
        ? "Case 4 solved"
        : `Case 4: ${count} of ${CASE4_BEATS.length} leads`;
      els.progressFill.style.width = `${(count / CASE4_BEATS.length) * 100}%`;
      return;
    }

    if (getFlag("case3Unlocked")) {
      const count = CASE3_BEATS.filter(getFlag).length;
      els.progressText.textContent = getFlag("case3Solved")
        ? "Case 3 solved"
        : `Case 3: ${count} of ${CASE3_BEATS.length} leads`;
      els.progressFill.style.width = `${(count / CASE3_BEATS.length) * 100}%`;
      return;
    }

    if (getFlag("case2Unlocked")) {
      const count = CASE2_BEATS.filter(getFlag).length;
      els.progressText.textContent = getFlag("briarPortraitClue")
        ? "Case 2 solved: take Mrs. Wren's lead"
        : `Case 2: ${count} of ${CASE2_BEATS.length} leads`;
      els.progressFill.style.width = `${(count / CASE2_BEATS.length) * 100}%`;
      return;
    }

    const count = CASE1_BEATS.filter(getFlag).length;
    els.progressText.textContent = getFlag("caseSolved")
      ? "Case 1 solved"
      : `Case 1: ${count} of ${CASE1_BEATS.length} steps`;
    els.progressFill.style.width = `${(count / CASE1_BEATS.length) * 100}%`;
  }

  function openIntro(isFirstRun) {
    const modal = createModal(STORY.title, { wide: true, intro: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const hero = document.createElement("div");
    hero.className = "intro-hero";
    hero.style.backgroundImage = 'url("./assets/intro-kimmy-triptych.jpg")';

    const story = document.createElement("div");
    story.className = "intro-copy";
    story.innerHTML = `
      <p class="panel-label">Series Premise</p>
      <p>${STORY.intro}</p>
      <p>${STORY.mission}</p>
      <p>${STORY.hook}</p>
      <p>${STORY.seriesArc}</p>
      <p>At home, Kayla is safe and loved. At the tree fort, she is brave and useful. In the private back pages of her notebook, she keeps the question no one can answer yet: who gave her the locket, and why did they disappear?</p>
    `;

    const introGallery = document.createElement("div");
    introGallery.className = "intro-gallery";
    introGallery.append(
      createIntroPanel(
        "./assets/intro-kimmy-family.jpg",
        "The Finch Home",
        "Kayla's parents give her the one thing every detective needs first: a place where questions are allowed."
      ),
      createIntroPanel(
        "./assets/intro-kimmy-mila-bff.jpg",
        "Mila Gale",
        "Mila is Kayla's best friend, club partner, and first person to say a mystery out loud when everyone else is guessing."
      )
    );

    const cast = document.createElement("div");
    cast.className = "cast-grid";
    cast.append(
      createCastCard("./assets/kimmy-avatar.jpg", "Kayla Finch", "Founder, clue-spotter, keeper of the crescent locket."),
      createCastCard("./assets/intro-kimmy-family.jpg", "The Finches", "Kayla's adoptive parents love her fiercely and encourage her questions, even when they cannot answer all of them."),
      createCastCard("./assets/intro-kimmy-mila-bff.jpg", "Mila Gale", "Kayla's best friend, first club partner, and the person most likely to climb the tree-fort ladder with an urgent note."),
      createCastCard("./assets/treefort-clubhouse.jpg", "Mystery Club HQ", "A tree-fort headquarters for maps, books, case files, and neighbor mysteries."),
      createCastCard("./assets/inspect-family-photo.jpg", "The Private File", "Kayla keeps the crescent locket and unlabeled photo separate from club business.")
    );

    body.append(hero, story, introGallery, cast);

    const start = document.createElement("button");
    start.type = "button";
    start.className = "modal-button primary";
    start.textContent = isFirstRun ? "Open the clubhouse" : "Back to the notebook";
    start.addEventListener("click", () => {
      setFlag("introSeen");
      closeModal();
      if (isFirstRun && !getFlag("clientInterview")) {
        openCase1Request();
        return;
      }
      speak("Kayla reviews the club notebook and her private mystery file.");
    });
    if (VOICE_FEATURE_ENABLED) {
      const voice = document.createElement("button");
      voice.type = "button";
      voice.className = "modal-button";
      voice.textContent = "Play voice";
      voice.addEventListener("click", () => playVoiceClip("intro"));
      actions.append(voice);
    }
    actions.append(start);
  }

  function openCase1Request() {
    openActionMenu({
      title: "Incoming Case: Pickles Is Missing",
      image: NPCS.mila.portrait,
      text:
        "The tree-fort pulley basket rattles with an urgent note from Mila: Pickles is missing. Please help. I have five dollars.",
      actions: [
        {
          label: "Invite Mila in",
          description: "Start by listening to the worried client.",
          primary: true,
          onSelect: openMilaCaseMenu
        },
        {
          label: "Check club rules",
          description: "Remember how Kayla handles a case.",
          onSelect: () =>
            speak("Kayla writes the club rules again: listen first, collect clues, be kind to worried clients.")
        }
      ]
    });
  }

  function openMilaHotspot() {
    if (getFlag("caseSolved")) {
      openCase2Bridge();
      return;
    }
    openMilaCaseMenu();
  }

  function openMilaCaseMenu() {
    openActionMenu({
      title: "Mila and the Empty Basket",
      image: NPCS.mila.portrait,
      text:
        "Mila climbs into the tree fort with Pickles' travel basket hugged to her chest. The door is open, and she is blinking hard like she does not want to cry.",
      actions: [
        {
          label: "Ask what happened",
          description: "Start the case by listening to the client.",
          primary: true,
          onSelect: () => {
            setFlag("clientInterview");
            addClue("mila");
            speak(
              "Kayla takes the case for five dollars. Pickles has a mint ribbon, a tiny bell, and a serious carrot habit. Next lead: Poppy's Bakery."
            );
          }
        },
        {
          label: "Examine basket",
          description: "A small clue, but Mila still needs to tell the full story first.",
          onSelect: () =>
            speak("The basket smells like hay, carrots, and lavender. Helpful, but Kayla still needs to ask Mila what happened.")
        },
        {
          label: "Promise first",
          description: "Kind, but it does not open the trail yet.",
          onSelect: () =>
            speak("Kayla promises carefully: she will follow every clue, and she will not give up on Pickles.")
        }
      ]
    });
  }

  function unlockCase2(message) {
    setFlag("case2Unlocked");
    addItem("fiveDollars");
    addItem("picklesBell");
    addItem("briarFile");
    addClue("briarLane");
    addClue("milaResemblance");
    speak(message);
  }

  function unlockCase3(message) {
    setFlag("observatoryLead");
    setFlag("case3Unlocked");
    addItem("starChart");
    addItem("observatoryToken");
    addClue("observatoryLead");
    speak(message);
  }

  function beginCase2() {
    if (!getFlag("case2Unlocked")) {
      unlockCase2("Case 02 begins: if Briar Lane House is empty, who keeps entering it after dark?");
    }
    navigate("briarExterior");
  }

  function beginCase3() {
    if (!getFlag("case3Unlocked")) {
      unlockCase3("Case 03 begins: Moonwake Observatory is flashing impossible moon signals.");
    }
    navigate("observatoryExterior");
  }

  function unlockCase4(message) {
    setFlag("case4Unlocked");
    addItem("libraryCallSlip");
    addClue("libraryLead");
    speak(message);
  }

  function beginCase4() {
    if (!getFlag("case4Unlocked")) {
      unlockCase4("Case 04 begins: Rowan Library's blue local-history book keeps vanishing from display.");
    }
    navigate("rowanLibrary");
  }

  function openCase4Bridge() {
    openActionMenu({
      title: "Next Case: Rowan Library",
      image: "./assets/case4-library.png",
      text:
        "Inside the Moonwake ledger, Kayla finds an old library call slip. Ms. Rowan at Rowan Library has a small, bright case for the Mystery Club: a blue local-history book keeps disappearing from display and coming back on the return cart.",
      actions: [
        {
          label: "Begin Case 04",
          description: "Follow the ledger slip to Rowan Library.",
          primary: true,
          onSelect: beginCase4
        },
        {
          label: "Review the slip",
          description: "Zoom into the clue connecting Moonwake to the library.",
          onSelect: () => openInspection("libraryCallSlip")
        }
      ]
    });
  }

  function openCase2Bridge() {
    if (getFlag("briarPortraitClue") && !getFlag("case3Unlocked")) {
      openCase2Closed();
      return;
    }

    if (getFlag("case2Unlocked")) {
      openActionMenu({
        title: "Case 02: Briar Lane House",
        image: INSPECTIONS.briarClipping.image,
        text:
          "The next case is ready. Mila's worry points Kayla to Briar Lane House, where someone keeps entering after dark even though everyone says it is empty.",
        actions: [
          {
            label: "Begin Case 02",
            description: "Go to Briar Lane and start the haunted-house investigation.",
            primary: true,
            onSelect: beginCase2
          },
          {
            label: "Review the file",
            description: "Look again at Kayla's first Case 02 note.",
            onSelect: () => openInspection("briarClipping")
          }
        ]
      });
      return;
    }

    openActionMenu({
      title: "Next Case: Briar Lane House",
      image: INSPECTIONS.case1ThankYou.image,
      text:
        "Mila hugs Kayla and Pickles so tightly the little bell jingles. Then she admits why she panicked: she was terrified Pickles had gone to Briar Lane House. No one goes there. Mr. Hexibald says to stay away.",
      actions: [
        {
          label: "Begin Case 02",
          description: "Take Mila's warning as the next mystery.",
          primary: true,
          onSelect: beginCase2
        },
        {
          label: "Ask about Mr. Hexibald",
          description: "Hear the caretaker clue, then start Case 02.",
          onSelect: () => {
            unlockCase2("Mila says Mr. Hexibald has guarded Briar Lane for years. Kayla opens a new file: caretaker, lights, piano music, night visitor.");
            navigate("briarExterior");
          }
        },
        {
          label: "Put $5 in the club jar",
          description: "Save the fee for a future investigation.",
          onSelect: () => {
            addItem("fiveDollars");
            speak("Kayla saves the five dollars in the club jar. A future case may need bus fare, a copy fee, or exactly one strategic snack.");
          }
        }
      ]
    });
  }

  function openCase2Closed() {
    const modal = createModal("Case Closed: Briar Lane House", { wide: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const image = document.createElement("img");
    image.className = "inspection-image";
    image.src = "./assets/case2-observatory-handoff.jpg";
    image.alt = "Mrs. Wren gives Kayla a star chart and crescent token";

    const summary = document.createElement("div");
    summary.className = "case-closed-copy";
    summary.innerHTML = `
      <p class="panel-label">Solved</p>
      <p>Briar Lane House was never haunted. The glowing window was a lamp, the knocking was a shutter, and the music was Mrs. Wren playing an old lullaby in a house she loved.</p>
      <p>Then the case becomes personal. The old girls' room holds a portrait of a woman with Kayla's eyes and a crescent locket. Mrs. Wren cannot tell Kayla everything, but she can give her the next clue: a folded star chart and a brass crescent token for Moonwake Observatory.</p>
      <div class="case-transition-card">
        <p class="panel-label">Next case unlocked</p>
        <h4>Case 03: Moonwake Observatory</h4>
        <p>Use the button below when you are ready. Kayla will put Mrs. Wren's star chart and crescent token in the satchel, then follow the clue to Moonwake.</p>
      </div>
    `;

    body.append(image, summary);

    const stay = document.createElement("button");
    stay.type = "button";
    stay.className = "modal-button";
    stay.textContent = "Review Briar clues";
    stay.addEventListener("click", closeModal);

    const takeLead = document.createElement("button");
    takeLead.type = "button";
    takeLead.className = "modal-button primary";
    takeLead.textContent = "Begin Case 03";
    takeLead.addEventListener("click", () => {
      closeModal();
      beginCase3();
    });

    actions.append(stay, takeLead);
  }

  function openCase3Closed() {
    const modal = createModal("Case Closed: Moonwake Signals", { wide: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const image = document.createElement("img");
    image.className = "inspection-image";
    image.src = "./assets/inspect-archive.jpg";
    image.alt = "Moonwake archive ledger with family branches";

    const summary = document.createElement("div");
    summary.className = "case-closed-copy";
    summary.innerHTML = `
      <p class="panel-label">Solved</p>
      <p>The Moonwake flashes were not magic. They were an old prism signal system, reawakened by the telescope, the moon dials, and a careful signal-cord test with Pickles' bell.</p>
      <p>The hidden archive needed clues from every case: Mila's five-dollar fee, the Briar Lane height mark, and the three moon phases. Inside, Kayla finds a ledger connecting Gale, Wren, and Kline family branches. Mila might not just be her best friend. She might be family.</p>
      <div class="case-transition-card">
        <p class="panel-label">Next case unlocked</p>
        <h4>Case 04: The Vanishing Blue Book</h4>
        <p>Use the button below when you are ready. Kayla will follow the Moonwake ledger slip to Rowan Library and a new local-history mystery.</p>
      </div>
    `;

    body.append(image, summary);

    const review = document.createElement("button");
    review.type = "button";
    review.className = "modal-button";
    review.textContent = "Review ledger";
    review.addEventListener("click", closeModal);

    const returnHome = document.createElement("button");
    returnHome.type = "button";
    returnHome.className = "modal-button primary";
    returnHome.textContent = "Begin Case 04";
    returnHome.addEventListener("click", () => {
      closeModal();
      beginCase4();
    });

    actions.append(review, returnHome);
  }

  function openCase4Closed() {
    const modal = createModal("Case Closed: Vanishing Blue Book", { wide: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const image = document.createElement("img");
    image.className = "inspection-image";
    image.src = "./assets/case4-history-room.png";
    image.alt = "Rowan Library local-history room with the blue book display";

    const summary = document.createElement("div");
    summary.className = "case-closed-copy";
    summary.innerHTML = `
      <p class="panel-label">Solved</p>
      <p>The blue local-history book was never stolen. Its old display stand tilts when afternoon sun warms the shelf, sliding the book into a hidden return chute and sending it back to the cart.</p>
      <p>The deeper clue is quieter: the catalog cipher uses the Kline branch from Moonwake, and the local-history drawer gives Kayla a copied card for Mara Kline. Finch is still the family name that raised her. Kline is the name her private file has been waiting to understand.</p>
    `;

    body.append(image, summary);

    const review = document.createElement("button");
    review.type = "button";
    review.className = "modal-button";
    review.textContent = "Review library clues";
    review.addEventListener("click", closeModal);

    const returnHome = document.createElement("button");
    returnHome.type = "button";
    returnHome.className = "modal-button primary";
    returnHome.textContent = "Return to clubhouse";
    returnHome.addEventListener("click", () => {
      closeModal();
      navigate("clubhouse");
      speak("Kayla files the Mara Kline card behind the locket sketch. She has a real family name now, but not the whole story.");
    });

    actions.append(review, returnHome);
  }

  function createIntroPanel(image, title, text) {
    const card = document.createElement("article");
    card.className = "intro-panel";
    const img = document.createElement("img");
    img.src = image;
    img.alt = title;
    const copy = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    copy.append(heading, paragraph);
    card.append(img, copy);
    return card;
  }

  function createCastCard(image, name, text) {
    const card = document.createElement("article");
    card.className = "cast-card";
    const img = document.createElement("img");
    img.src = image;
    img.alt = `${name} portrait`;
    const copy = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = name;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    copy.append(heading, paragraph);
    card.append(img, copy);
    return card;
  }

  function openActionMenu(options) {
    const modal = createModal(options.title);
    const body = modal.querySelector(".modal-body");
    const actionBar = modal.querySelector(".modal-actions");

    if (options.image) {
      const image = document.createElement("img");
      image.className = "inspection-image action-menu-image";
      image.src = options.image;
      image.alt = options.title;
      body.append(image);
    }

    if (options.text) {
      const text = document.createElement("p");
      text.className = "action-menu-copy";
      text.textContent = options.text;
      body.append(text);
    }

    const feedback = document.createElement("p");
    feedback.className = "action-menu-feedback";
    feedback.hidden = true;

    const grid = document.createElement("div");
    grid.className = "action-choice-grid";

    options.actions.forEach((menuAction) => {
      const isAvailable = !menuAction.requires || menuAction.requires();
      const button = document.createElement("button");
      button.type = "button";
      button.className = `action-choice${menuAction.primary ? " primary-action" : ""}${isAvailable ? "" : " locked"}`;
      button.setAttribute("aria-disabled", String(!isAvailable));

      const label = document.createElement("strong");
      label.textContent = menuAction.label;
      const tag = document.createElement("em");
      tag.className = "action-choice-tag";
      tag.textContent = !isAvailable
        ? "Needs clue"
        : Number.isFinite(menuAction.xpPenalty)
          ? "Costs XP"
          : menuAction.primary
            ? "Best next step"
            : "Try and learn";
      const description = document.createElement("span");
      description.textContent = menuAction.description || "";
      button.append(label, tag, description);

      button.addEventListener("click", () => {
        if (!isAvailable) {
          feedback.hidden = false;
          feedback.textContent = menuAction.lockedMessage || "Kayla needs another clue first.";
          showToast(feedback.textContent);
          return;
        }
        applyChoiceXp(menuAction, options.title);
        closeModal();
        if (menuAction.onSelect) {
          menuAction.onSelect();
        }
        if (pendingXpMessage) {
          showToast(pendingXpMessage);
          pendingXpMessage = "";
        }
      });

      grid.append(button);
    });

    body.append(grid, feedback);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);
    actionBar.append(close);
  }

  function openDialogue(npcId, options = {}) {
    const npc = NPCS[npcId];
    if (!npc) {
      return;
    }
    const modal = createModal(npc.name);
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const dialogue = document.createElement("div");
    dialogue.className = "dialogue-card";

    const portrait = document.createElement("img");
    portrait.src = npc.portrait;
    portrait.alt = `${npc.name} portrait`;

    const copy = document.createElement("div");
    const role = document.createElement("p");
    role.className = "panel-label";
    role.textContent = npc.role;
    const line = document.createElement("p");
    line.className = "dialogue-line";
    line.textContent = npc.line;
    const hint = document.createElement("p");
    hint.className = "dialogue-hint";
    hint.textContent = npc.hint;
    copy.append(role, line, hint);
    dialogue.append(portrait, copy);
    body.append(dialogue);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "modal-button primary";
    action.textContent = options.actionLabel || "Record note";
    action.addEventListener("click", () => {
      closeModal();
      if (options.onAction) {
        options.onAction();
      }
    });

    if (VOICE_FEATURE_ENABLED) {
      const hear = document.createElement("button");
      hear.type = "button";
      hear.className = "modal-button";
      hear.textContent = "Play voice";
      hear.addEventListener("click", () => playVoiceClip(npcId));
      actions.append(hear);
    }
    actions.append(close, action);

    if (VOICE_FEATURE_ENABLED && state.voiceEnabled) {
      playVoiceClip(npcId);
    }
  }

  function openInspection(key, options = {}) {
    const detail = { ...INSPECTIONS[key], ...options };
    const modal = createModal(detail.title);
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    if (detail.image) {
      const image = document.createElement("img");
      image.className = "inspection-image";
      image.src = detail.image;
      image.alt = detail.title;
      body.append(image);
    }

    const text = document.createElement("p");
    text.textContent = detail.text;
    body.append(text);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);

    if (detail.onAction) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "modal-button primary";
      action.textContent = detail.actionLabel || "Investigate";
      action.addEventListener("click", () => {
        closeModal();
        detail.onAction();
      });
      if (VOICE_FEATURE_ENABLED) {
        const hear = document.createElement("button");
        hear.type = "button";
        hear.className = "modal-button";
        hear.textContent = "Play voice";
        hear.addEventListener("click", () => playVoiceClip(detail.audioId || key));
        actions.append(hear);
      }
      actions.append(close, action);
    } else {
      if (VOICE_FEATURE_ENABLED) {
        const hear = document.createElement("button");
        hear.type = "button";
        hear.className = "modal-button";
        hear.textContent = "Play voice";
        hear.addEventListener("click", () => playVoiceClip(detail.audioId || key));
        actions.append(hear);
      }
      actions.append(close);
    }
  }

  function openItemInspection(itemId) {
    const item = ITEMS[itemId];
    if (!item) {
      return;
    }
    openInspection("caseBoard", {
      title: item.inspectTitle,
      image: item.image,
      text: item.inspectText
    });
  }

  function openMoonMazeMiniGame() {
    if (!hasItem("moonMazeToy")) {
      addItem("moonMazeToy");
      addClue("moonMazeToy");
    }

    const modal = createModal("Moon-Maze Toy", { wide: true });
    modal.classList.add("mini-game-modal");
    modal.tabIndex = -1;

    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const intro = document.createElement("div");
    intro.className = "mini-game-intro";
    intro.innerHTML = `
      <p class="panel-label">Mini Puzzle</p>
      <p>Guide the blue bead through the moon rails to the crescent finish. Use swipes, arrow keys, or the brass controls.</p>
    `;

    const board = document.createElement("div");
    board.className = "moon-maze-board";
    board.style.setProperty("--maze-size", MOON_MAZE.size);
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", "Moon-maze toy puzzle");

    const grid = document.createElement("div");
    grid.className = "moon-maze-grid";
    for (let row = 0; row < MOON_MAZE.size; row += 1) {
      for (let col = 0; col < MOON_MAZE.size; col += 1) {
        const cell = document.createElement("div");
        cell.className = `maze-cell${MOON_MAZE.blocked.has(`${col},${row}`) ? " blocked" : ""}`;
        cell.style.gridColumn = String(col + 1);
        cell.style.gridRow = String(row + 1);
        grid.append(cell);
      }
    }

    const goal = document.createElement("div");
    goal.className = "maze-goal";
    const marble = document.createElement("div");
    marble.className = "maze-marble";
    const glint = document.createElement("span");
    glint.setAttribute("aria-hidden", "true");
    marble.append(glint);
    board.append(grid, goal, marble);

    const status = document.createElement("p");
    status.className = "mini-game-status";

    const controls = document.createElement("div");
    controls.className = "maze-controls";

    const moveCount = document.createElement("span");
    moveCount.className = "maze-move-count";

    let position = { ...MOON_MAZE.start };
    let moves = 0;
    let solved = getFlag("moonMazeSolved");
    let swipeStart = null;

    function canEnter(col, row) {
      return (
        col >= 0 &&
        row >= 0 &&
        col < MOON_MAZE.size &&
        row < MOON_MAZE.size &&
        !MOON_MAZE.blocked.has(`${col},${row}`)
      );
    }

    function placeToken(token, point) {
      const mazeOffset = 18;
      const mazeSpan = 64;
      const cellSpan = mazeSpan / MOON_MAZE.size;
      token.style.left = `${mazeOffset + (point.col + 0.5) * cellSpan}%`;
      token.style.top = `${mazeOffset + (point.row + 0.5) * cellSpan}%`;
    }

    function updateMazeUi() {
      placeToken(goal, MOON_MAZE.goal);
      placeToken(marble, position);
      moveCount.textContent = `${moves} move${moves === 1 ? "" : "s"}`;
      status.textContent = solved
        ? "The crescent latch has opened. Kayla can copy the 17-inch mark."
        : "The bead rolls only through open moon rails. Find the path to the crescent finish.";
      board.classList.toggle("solved", solved);
      takeSketch.hidden = !solved;
    }

    function bump() {
      board.classList.remove("bump");
      requestAnimationFrame(() => {
        board.classList.add("bump");
        setTimeout(() => board.classList.remove("bump"), 220);
      });
      changeXp(-1, "XP -1: that rail blocks the bead.");
      if (pendingXpMessage) {
        showToast(pendingXpMessage);
        pendingXpMessage = "";
      }
    }

    function completeMaze() {
      if (!solved) {
        solved = true;
        setFlag("moonMazeSolved");
        addItem("heightMarkSketch");
        addClue("briarHeight");
        changeXp(10, "XP +10: solved the moon-maze mini-game.", { once: "mini:moonMaze" });
        speak("The moon-maze latch opens with a soft click. Behind it, Kayla finds the clear 17-inch height mark.");
      }
      updateMazeUi();
    }

    function move(dx, dy) {
      if (solved) {
        return;
      }
      const next = { col: position.col + dx, row: position.row + dy };
      if (!canEnter(next.col, next.row)) {
        bump();
        return;
      }
      position = next;
      moves += 1;
      if (position.col === MOON_MAZE.goal.col && position.row === MOON_MAZE.goal.row) {
        completeMaze();
        return;
      }
      updateMazeUi();
    }

    function addControl(label, dx, dy) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "maze-control-button";
      button.textContent = label;
      button.addEventListener("click", () => move(dx, dy));
      controls.append(button);
    }

    addControl("Up", 0, -1);
    addControl("Left", -1, 0);
    addControl("Right", 1, 0);
    addControl("Down", 0, 1);

    board.addEventListener("pointerdown", (event) => {
      swipeStart = { x: event.clientX, y: event.clientY };
      board.setPointerCapture(event.pointerId);
    });

    board.addEventListener("pointerup", (event) => {
      if (!swipeStart) {
        return;
      }
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 1 : -1, 0);
      } else {
        move(0, dy > 0 ? 1 : -1);
      }
    });

    modal.addEventListener("keydown", (event) => {
      const keyMoves = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0]
      };
      const delta = keyMoves[event.key];
      if (!delta) {
        return;
      }
      event.preventDefault();
      move(delta[0], delta[1]);
    });

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "modal-button";
    reset.textContent = "Reset Maze";
    reset.addEventListener("click", () => {
      if (solved) {
        speak("The latch is already open. Kayla leaves the solved path in her notes.");
        return;
      }
      position = { ...MOON_MAZE.start };
      moves = 0;
      updateMazeUi();
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);

    const takeSketch = document.createElement("button");
    takeSketch.type = "button";
    takeSketch.className = "modal-button primary";
    takeSketch.textContent = "Take 17-inch sketch";
    takeSketch.addEventListener("click", () => {
      closeModal();
      speak("Kayla tucks the 17-inch height-mark sketch into her satchel. It feels like a number waiting for another lock.");
    });

    body.append(intro, board, controls, moveCount, status);
    actions.append(reset, close, takeSketch);
    updateMazeUi();
    modal.focus();
  }

  function openPhotoSlidePuzzle() {
    if (!getFlag("familyPhotoFound")) {
      setFlag("familyPhotoFound");
      addClue("photo");
    }

    const modal = createModal("Torn Photograph Puzzle", { wide: true });
    modal.classList.add("mini-game-modal", "slide-puzzle-modal");
    modal.tabIndex = -1;

    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const intro = document.createElement("div");
    intro.className = "mini-game-intro";
    intro.innerHTML = `
      <p class="panel-label">Slide Puzzle</p>
      <p>Slide one piece at a time into the empty space. Restore the photograph to read the hidden mark on the back.</p>
    `;

    const board = document.createElement("div");
    board.className = "slide-puzzle-board";
    board.style.setProperty("--slide-size", PHOTO_SLIDE.size);
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", "Torn photograph slide puzzle");

    const moveCount = document.createElement("span");
    moveCount.className = "maze-move-count";

    const status = document.createElement("p");
    status.className = "mini-game-status";

    let order = getFlag("photoSlideSolved") ? [...PHOTO_SLIDE.solved] : [...PHOTO_SLIDE.start];
    let moves = 0;
    let solved = getFlag("photoSlideSolved");

    function blankIndex() {
      return order.indexOf(PHOTO_SLIDE.blank);
    }

    function isAdjacentToBlank(index) {
      const blank = blankIndex();
      const size = PHOTO_SLIDE.size;
      const tileCol = index % size;
      const tileRow = Math.floor(index / size);
      const blankCol = blank % size;
      const blankRow = Math.floor(blank / size);
      return Math.abs(tileCol - blankCol) + Math.abs(tileRow - blankRow) === 1;
    }

    function nudgeWrongPiece() {
      board.classList.remove("bump");
      requestAnimationFrame(() => {
        board.classList.add("bump");
        setTimeout(() => board.classList.remove("bump"), 220);
      });
      changeXp(-1, "XP -1: that piece cannot slide from there.");
      if (pendingXpMessage) {
        showToast(pendingXpMessage);
        pendingXpMessage = "";
      }
    }

    function completeSlidePuzzle() {
      if (!solved) {
        solved = true;
        order = [...PHOTO_SLIDE.solved];
        setFlag("photoSlideSolved");
        addClue("photoBacking");
        changeXp(8, "XP +8: restored the torn photograph puzzle.", { once: "mini:photoSlide" });
        speak("The restored photograph has a tiny crescent stamp on the back and the initials M.K. Kayla files it with her private clues.");
      }
      renderSlidePuzzle();
    }

    function moveTile(index) {
      if (solved) {
        return;
      }
      if (!isAdjacentToBlank(index)) {
        nudgeWrongPiece();
        return;
      }
      const blank = blankIndex();
      [order[index], order[blank]] = [order[blank], order[index]];
      moves += 1;
      if (arraysMatch(order, PHOTO_SLIDE.solved)) {
        completeSlidePuzzle();
        return;
      }
      renderSlidePuzzle();
    }

    function renderSlidePuzzle() {
      board.replaceChildren();
      order.forEach((piece, index) => {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = `slide-tile${piece === PHOTO_SLIDE.blank ? " blank" : ""}`;
        if (piece === PHOTO_SLIDE.blank) {
          tile.disabled = true;
          tile.setAttribute("aria-label", "Empty slide space");
        } else {
          const pieceCol = piece % PHOTO_SLIDE.size;
          const pieceRow = Math.floor(piece / PHOTO_SLIDE.size);
          tile.style.backgroundImage = `url("${PHOTO_SLIDE.image}")`;
          tile.style.backgroundSize = `${PHOTO_SLIDE.size * 100}% ${PHOTO_SLIDE.size * 100}%`;
          tile.style.backgroundPosition = `${(pieceCol / (PHOTO_SLIDE.size - 1)) * 100}% ${(pieceRow / (PHOTO_SLIDE.size - 1)) * 100}%`;
          tile.setAttribute("aria-label", `Slide photograph piece ${piece + 1}`);
          tile.addEventListener("click", () => moveTile(index));
        }
        board.append(tile);
      });
      moveCount.textContent = `${moves} move${moves === 1 ? "" : "s"}`;
      status.textContent = solved
        ? "The photograph is whole again. The hidden backing clue is now in Kayla's notebook."
        : "Only pieces next to the empty space can slide. Watch the face and locket line up.";
      takeClue.hidden = !solved;
      board.classList.toggle("solved", solved);
    }

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "modal-button";
    reset.textContent = "Reset Pieces";
    reset.addEventListener("click", () => {
      if (solved) {
        speak("Kayla has already restored the photo and copied the backing clue.");
        return;
      }
      order = [...PHOTO_SLIDE.start];
      moves = 0;
      renderSlidePuzzle();
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);

    const takeClue = document.createElement("button");
    takeClue.type = "button";
    takeClue.className = "modal-button primary";
    takeClue.textContent = "File backing clue";
    takeClue.addEventListener("click", () => {
      closeModal();
      speak("Kayla marks the photo backing as a private-file clue: crescent stamp, initials M.K., no explanation yet.");
    });

    body.append(intro, board, moveCount, status);
    actions.append(reset, close, takeClue);
    renderSlidePuzzle();
    modal.focus();
  }

  function openCatalogCipherMiniGame() {
    if (!hasItem("cipherWheel")) {
      setFlag("catalogDrawerFound");
      addItem("cipherWheel");
      addClue("catalogCipher");
    }

    const modal = createModal("Catalog Cipher Wheel", { wide: true });
    modal.classList.add("mini-game-modal", "catalog-cipher-modal");
    modal.tabIndex = -1;

    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const intro = document.createElement("div");
    intro.className = "mini-game-intro";
    intro.innerHTML = `
      <p class="panel-label">Mini Puzzle</p>
      <p>Turn the old catalog dials to the five-letter family branch from Moonwake. Finch is Kayla's adopted family name; the hidden branch is different.</p>
    `;

    const board = document.createElement("div");
    board.className = "catalog-cipher-board";
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", "Catalog cipher letter dials");

    const feedback = document.createElement("p");
    feedback.className = "mini-game-status";

    let letters = getFlag("libraryCipherSolved")
      ? CATALOG_CIPHER.answer.split("")
      : CATALOG_CIPHER.start.split("");
    let solved = getFlag("libraryCipherSolved");

    function cycleLetter(index, delta) {
      if (solved) {
        return;
      }
      const alphabet = CATALOG_CIPHER.alphabet;
      const current = alphabet.indexOf(letters[index]);
      const next = (current + delta + alphabet.length) % alphabet.length;
      letters[index] = alphabet[next];
      renderCipher();
    }

    function renderCipher() {
      board.replaceChildren();
      letters.forEach((letter, index) => {
        const dial = document.createElement("div");
        dial.className = "cipher-dial";

        const up = document.createElement("button");
        up.type = "button";
        up.className = "cipher-step";
        up.textContent = "+";
        up.setAttribute("aria-label", `Advance cipher dial ${index + 1}`);
        up.addEventListener("click", () => cycleLetter(index, 1));

        const display = document.createElement("button");
        display.type = "button";
        display.className = "cipher-letter";
        display.textContent = letter;
        display.setAttribute("aria-label", `Cipher dial ${index + 1}: ${letter}`);
        display.addEventListener("click", () => cycleLetter(index, 1));

        const down = document.createElement("button");
        down.type = "button";
        down.className = "cipher-step";
        down.textContent = "-";
        down.setAttribute("aria-label", `Reverse cipher dial ${index + 1}`);
        down.addEventListener("click", () => cycleLetter(index, -1));

        dial.append(up, display, down);
        board.append(dial);
      });
      board.classList.toggle("solved", solved);
      feedback.textContent = solved
        ? "The catalog drawer unlocks the local-history room. Ms. Rowan's old archive card is now in Kayla's satchel."
        : "Clue: the answer is the family name from Moonwake's hidden branch, not Kayla's adopted surname.";
      enterRoom.hidden = !solved;
    }

    function submitCipher() {
      if (letters.join("") !== CATALOG_CIPHER.answer) {
        changeXp(-2, "XP -2: the catalog dials need the exact family branch.");
        feedback.textContent = "The drawer stays shut. The answer is five letters from the Moonwake ledger branch.";
        showToast(`${feedback.textContent} ${pendingXpMessage || ""}`.trim());
        pendingXpMessage = "";
        board.classList.remove("bump");
        requestAnimationFrame(() => {
          board.classList.add("bump");
          setTimeout(() => board.classList.remove("bump"), 220);
        });
        return;
      }
      if (!solved) {
        solved = true;
        setFlag("libraryCipherSolved");
        addItem("rowanKeyCard");
        addClue("catalogCipherSolved");
        changeXp(10, "XP +10: solved the catalog cipher mini-game.", { once: "mini:catalogCipher" });
        speak("The catalog drawer clicks open on KLINE. Ms. Rowan's old archive card slides out, and the local-history room unlocks.");
      }
      renderCipher();
    }

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "modal-button";
    reset.textContent = "Reset Dials";
    reset.addEventListener("click", () => {
      if (solved) {
        speak("The catalog cipher is already solved. Kayla leaves the KLINE setting in her notes.");
        return;
      }
      letters = CATALOG_CIPHER.start.split("");
      renderCipher();
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-button";
    close.textContent = "Close";
    close.addEventListener("click", closeModal);

    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "modal-button primary";
    submit.textContent = "Try Cipher";
    submit.addEventListener("click", submitCipher);

    const enterRoom = document.createElement("button");
    enterRoom.type = "button";
    enterRoom.className = "modal-button primary";
    enterRoom.textContent = "Enter history room";
    enterRoom.addEventListener("click", () => {
      closeModal();
      navigate("historyRoom");
    });

    body.append(intro, board, feedback);
    actions.append(reset, close, submit, enterRoom);
    renderCipher();
    modal.focus();
  }

  function openSequencePuzzle(puzzleId) {
    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) {
      return;
    }

    if (getFlag(puzzle.solvedFlag)) {
      speak(puzzle.already);
      return;
    }

    let picks = [];

    const modal = createModal(puzzle.title);
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const image = document.createElement("img");
    image.className = "inspection-image";
    image.src = puzzle.image;
    image.alt = puzzle.title;

    const riddle = document.createElement("div");
    riddle.className = "riddle";
    riddle.textContent = puzzle.intro;

    const readout = document.createElement("div");
    readout.className = "sequence-readout";
    readout.textContent = "Pick three in order.";

    const feedback = document.createElement("p");
    feedback.className = "sequence-feedback";
    feedback.textContent = "Clue: safe first, snack second, familiar bell last.";

    const grid = document.createElement("div");
    grid.className = "choice-grid";

    puzzle.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice;
      button.addEventListener("click", () => {
        if (picks.length >= puzzle.answer.length) {
          picks = [];
          feedback.textContent = "Starting a new try.";
        }
        picks.push(choice);
        updatePuzzleReadout(readout, picks);
        grid.querySelectorAll(".choice-button").forEach((item) => {
          item.classList.toggle("selected", picks.includes(item.textContent));
        });
      });
      grid.append(button);
    });

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "modal-button";
    clear.textContent = "Clear";
    clear.addEventListener("click", () => {
      picks = [];
      updatePuzzleReadout(readout, picks);
      feedback.textContent = "Clue: safe first, snack second, familiar bell last.";
      grid.querySelectorAll(".choice-button").forEach((item) => item.classList.remove("selected"));
    });

    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "modal-button primary";
    submit.textContent = "Try Sequence";
    submit.addEventListener("click", () => {
      if (arraysMatch(picks, puzzle.answer)) {
        closeModal();
        solvePuzzle(puzzle);
      } else {
        const mistake = explainSequenceMistake(picks, puzzle.answer);
        changeXp(-3, "XP -3: the sequence startled Pickles.");
        feedback.textContent = `${mistake} XP -3.`;
        showToast(`${mistake} XP -3.`);
        pendingXpMessage = "";
      }
    });

    body.append(image, riddle, grid, readout, feedback);
    if (VOICE_FEATURE_ENABLED) {
      const hear = document.createElement("button");
      hear.type = "button";
      hear.className = "modal-button";
      hear.textContent = "Play voice";
      hear.addEventListener("click", () => playVoiceClip(puzzleId));
      actions.append(hear);
    }
    actions.append(clear, submit);
  }

  function explainSequenceMistake(picks, answer) {
    if (picks.length < answer.length) {
      return "Pick three moves before trying the sequence.";
    }
    if (picks[0] !== answer[0]) {
      return "Pickles is nervous. The first move must be quiet and gentle so she does not hide deeper in the basket.";
    }
    if (picks[1] !== answer[1]) {
      return "After Kayla moves quietly, Pickles needs a reason to come forward. The carrot comes before the bell.";
    }
    if (picks[2] !== answer[2]) {
      return "The bell works last, after Pickles feels safe and smells the carrot. Ringing it too early startles her.";
    }
    return "That almost works. Use Mr. Basil's exact clue: quiet first, carrot second, bell last.";
  }

  function updatePuzzleReadout(readout, picks) {
    readout.replaceChildren();
    if (!picks.length) {
      readout.textContent = "Pick three in order.";
      return;
    }
    picks.forEach((pick, index) => {
      const pill = document.createElement("span");
      pill.className = "sequence-pill";
      pill.textContent = `${index + 1}. ${pick}`;
      readout.append(pill);
    });
  }

  function solvePuzzle(puzzle) {
    changeXp(8, "XP +8: solved the sequence puzzle.", { once: `puzzle:${puzzle.title}` });
    setFlag(puzzle.solvedFlag);
    addClue(puzzle.solvedClue);
    addItem(puzzle.reward);
    state.lead = puzzle.success;
    saveState();
    render();
    const xpMessage = pendingXpMessage ? ` ${pendingXpMessage}` : "";
    pendingXpMessage = "";
    showToast(`${puzzle.success}${xpMessage}`);
    openCaseClosed();
  }

  function openCaseClosed() {
    const modal = createModal("Case Closed: Pickles Found", { wide: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const image = document.createElement("img");
    image.className = "inspection-image";
    image.src = "./assets/case1-thank-you-mila.jpg";
    image.alt = "Kayla and Mila hug after Pickles is found";

    const summary = document.createElement("div");
    summary.className = "case-closed-copy";
    summary.innerHTML = `
      <p class="panel-label">Solved</p>
      <p>Kayla did not just spot Pickles. She solved the path: Mila's carrot clue led to Mrs. Poppy, the bakery trail led to the park, the paw prints led to the garden, and Mr. Basil taught Kayla how to coax a nervous rabbit safely.</p>
      <p>Mila hugs Kayla at the tree fort, pays the five-dollar case fee, and ties Pickles' tiny bell to a mint ribbon for Kayla's satchel. She also admits why she panicked: she was afraid Pickles had gone near Briar Lane House, where no one is supposed to go.</p>
      <div class="case-transition-card">
        <p class="panel-label">Next case unlocked</p>
        <h4>Case 02: Briar Lane House</h4>
        <p>Use the button below when you are ready. Kayla will start a new file and go straight to the house everyone calls haunted.</p>
      </div>
    `;

    body.append(image, summary);

    const stay = document.createElement("button");
    stay.type = "button";
    stay.className = "modal-button";
    stay.textContent = "Review clues";
    stay.addEventListener("click", closeModal);

    const thankMila = document.createElement("button");
    thankMila.type = "button";
    thankMila.className = "modal-button primary";
    thankMila.textContent = "Begin Case 02";
    thankMila.addEventListener("click", () => {
      closeModal();
      beginCase2();
    });

    actions.append(stay, thankMila);
  }

  function arraysMatch(a, b) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  function createModal(title, options = {}) {
    els.modalRoot.replaceChildren();
    els.modalRoot.classList.add("active");

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closeModal();
      }
    });

    const modal = document.createElement("section");
    modal.className = `modal${options.wide ? " modal-wide" : ""}${options.intro ? " intro-modal" : ""}`;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", title);

    const header = document.createElement("div");
    header.className = "modal-header";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-close";
    close.setAttribute("aria-label", "Close dialog");
    close.textContent = "X";
    close.addEventListener("click", closeModal);

    const body = document.createElement("div");
    body.className = "modal-body";

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    header.append(heading, close);
    modal.append(header, body, actions);
    backdrop.append(modal);
    els.modalRoot.append(backdrop);
    close.focus();
    return modal;
  }

  function closeModal() {
    els.modalRoot.replaceChildren();
    els.modalRoot.classList.remove("active");
  }

  function showHint() {
    if (!getFlag("clientInterview")) {
      speak("Hint: talk to Mila at the clubhouse to learn what Pickles likes.");
      return;
    }
    if (!getFlag("poppyTalked")) {
      speak("Hint: go to Poppy's Bakery and ask Mrs. Poppy what she saw.");
      return;
    }
    if (!getFlag("bakeryClue")) {
      speak("Hint: inspect the bakery patio bench for crumbs, ribbon, and tiny tracks.");
      return;
    }
    if (!getFlag("parkTrail")) {
      speak("Hint: follow the trail to the park fountain and sketch the paw prints.");
      return;
    }
    if (!getFlag("basilTalked")) {
      speak("Hint: talk to Mr. Basil in the community garden.");
      return;
    }
    if (!getFlag("caseSolved")) {
      speak("Hint: coax Pickles with quiet feet, a carrot, and then the ribbon bell.");
      return;
    }
    if (!getFlag("case2Unlocked")) {
      speak("Hint: return Pickles to Mila at the clubhouse. Her thank-you points Kayla toward the next mystery.");
      return;
    }
    if (getFlag("case4Unlocked")) {
      if (!getFlag("rowanTalked")) {
        speak("Hint: at Rowan Library, talk to Ms. Rowan about the vanishing blue book.");
        return;
      }
      if (!getFlag("librarySlipFound")) {
        speak("Hint: inspect the return cart. The blue book leaves dust and a catalog clue behind.");
        return;
      }
      if (!getFlag("catalogDrawerFound")) {
        speak("Hint: open the old card catalog drawer and take the brass cipher wheel.");
        return;
      }
      if (!getFlag("libraryCipherSolved")) {
        speak("Hint: solve the catalog cipher with KLINE, the family branch from the Moonwake ledger.");
        return;
      }
      if (!getFlag("bookChuteTested")) {
        speak("Hint: in the local-history room, use Pickles' tiny bell to test the blue book display stand.");
        return;
      }
      if (!getFlag("quiltPatternFound")) {
        speak("Hint: study the town quilt pattern and compare it to Kayla's restored photograph clue.");
        return;
      }
      if (!getFlag("case4Solved")) {
        speak("Hint: open the Kline flat file and copy the Mara Kline card.");
        return;
      }
      speak("Case 04 is solved: the blue book used a hidden return chute, and Kayla has the name Mara Kline in her private file.");
      return;
    }
    if (getFlag("case3Solved")) {
      speak("Hint: open the Rowan Library file at the clubhouse or use the Case 03 closing screen to begin Case 04.");
      return;
    }
    if (getFlag("case3Unlocked")) {
      if (!getFlag("theoTalked")) {
        speak("Hint: at Moonwake Observatory, talk to Theo about the three flashes and the blank sign-in ledger.");
        return;
      }
      if (!getFlag("observatoryGate")) {
        speak("Hint: inspect Moonwake's crescent gate and use Mrs. Wren's brass token.");
        return;
      }
      if (!getFlag("starChartRead")) {
        speak("Hint: lay out Mrs. Wren's star chart and trace the moonlight path.");
        return;
      }
      if (!getFlag("moonDialClue")) {
        speak("Hint: inspect the moon dials in the workshop and sketch their new-half-full order.");
        return;
      }
      if (!getFlag("bellTested")) {
        speak("Hint: use Pickles' tiny bell on the signal cord. It is gentle enough to test the old mechanism.");
        return;
      }
      if (!getFlag("telescopeAligned")) {
        speak("Hint: go to the dome and align the telescope with Mrs. Wren's chart.");
        return;
      }
      if (!getFlag("prismAligned")) {
        speak("Hint: align the central prism after the telescope, moon dials, and bell test are ready.");
        return;
      }
      if (!getFlag("archiveUnlocked")) {
        speak("Hint: open the numbered drawer with 5 - 17 - 3. If 17 is missing, revisit the height marks in the Briar Lane girls' room.");
        return;
      }
      if (!getFlag("case3Solved")) {
        speak("Hint: read the Moonwake family ledger in the archive. The Gale, Wren, and Kline names are the real prize.");
        return;
      }
      speak("Case 03 is solved: the flashes were a prism signal, and the ledger hints that Mila Gale may be Kayla's cousin.");
      return;
    }
    if (!getFlag("hexibaldWarning")) {
      speak("Hint: at Briar Lane, ask Mr. Hexibald why he keeps everyone away.");
      return;
    }
    if (!getFlag("briarWindowClue")) {
      speak("Hint: study the glowing upper window. Is it spooky, or is it a lamp?");
      return;
    }
    if (!getFlag("briarWindClue")) {
      speak("Hint: check the loose shutter and match its knocking sound to the wind.");
      return;
    }
    if (!getFlag("briarInside")) {
      speak("Hint: once Kayla has the gate clues, ask Mr. Hexibald for permission to look inside.");
      return;
    }
    if (!getFlag("briarMusicClue")) {
      speak("Hint: follow the piano music into the living room and inspect the keys.");
      return;
    }
    if (!getFlag("briarVisitorTrail")) {
      speak("Hint: the footprints and shawl prove someone real is visiting Briar Lane at night.");
      return;
    }
    if (!getFlag("grandmotherMet")) {
      speak("Hint: after the piano clue and visitor trail, speak kindly to the night visitor.");
      return;
    }
    if (!getFlag("moonMazeSolved")) {
      speak(hasItem("moonMazeToy")
        ? "Hint: play the moon-maze toy in the old girls' room. Guide the bead to the crescent finish."
        : "Hint: open the toy drawer in the old girls' room and take the moon-maze toy.");
      return;
    }
    if (!getFlag("briarPortraitClue")) {
      speak("Hint: use Mrs. Wren's small key upstairs. The old girls' room has a keepsake box.");
      return;
    }
    if (!getFlag("case3Unlocked")) {
      speak("Hint: take Mrs. Wren's star chart and crescent token. They open the next case at Moonwake Observatory.");
      return;
    }
    if (!getFlag("identityClueFound")) {
      speak("Hint: inspect Kayla's locket back at the clubhouse.");
      return;
    }
    if (!getFlag("familyPhotoFound")) {
      speak("Hint: inspect the old photograph on the tree-fort desk.");
      return;
    }
    speak("Case 02's opening mystery is solved: Briar Lane is not haunted. Mrs. Wren has memories there, and Kayla has a new family clue.");
  }

  els.satchelButton.addEventListener("click", openSatchel);
  els.notebookButton.addEventListener("click", openNotebook);
  els.hintButton.addEventListener("click", showHint);
  els.storyButton.addEventListener("click", () => openIntro(false));
  els.voiceButton.addEventListener("click", toggleVoice);
  els.resetButton.addEventListener("click", () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(RESET_MARKER_KEY, FORCE_RESET_ON_BUILD);
    Object.assign(state, defaultState());
    render();
    openIntro(true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  render();
  refreshAudioStatus();
  if (!getFlag("introSeen")) {
    openIntro(true);
  }
})();
