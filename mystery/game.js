(function () {
  const STORAGE_KEY = "kimmy-finch-mysteries-v5";

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
    "briarPortraitClue"
  ];

  const STORY = {
    title: "Kimmy Finch Mysteries",
    case1Title: "Case 01: The Picnic Pet",
    case2Title: "Case 02: The Briar Lane House",
    club: "Finch Street Mystery Club",
    intro:
      "Kimmy Finch knows she was adopted, and her parents love her completely. Still, the first part of her story is a puzzle with only one clue: a tiny crescent locket she has had for as long as anyone can remember.",
    mission:
      "Kimmy is also the best noticer in town. She built the Finch Street Mystery Club in a tree fort, where she reads case files, researches old town maps, and helps neighbors with small, important mysteries.",
    hook:
      "Most cases solve someone else's problem. Every so often, one also gives Kimmy a clue about her own.",
    seriesArc:
      "Kimmy keeps a private question in the back of her notebook: who were her first family, and why did they leave so few tracks?"
  };

  const AUDIO_CLIPS = {
    intro: "./assets/audio/intro.wav",
    lila: "./assets/audio/lila.wav",
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
      image: "./assets/inspect-rabbit-clues.png",
      inspectTitle: "Mint Ribbon",
      inspectText:
        "The ribbon smells faintly like carrot rolls and garden lavender."
    },
    carrotCrumbs: {
      label: "Carrot Crumbs",
      description: "Tiny orange crumbs from the bakery patio.",
      image: "./assets/inspect-rabbit-clues.png",
      inspectTitle: "Carrot Crumbs",
      inspectText:
        "Pickles probably stopped at the bakery first. These crumbs point away from the patio."
    },
    pawPrintSketch: {
      label: "Paw Print Sketch",
      description: "Kimmy's quick drawing of the tiny park tracks.",
      image: "./assets/inspect-rabbit-clues.png",
      inspectTitle: "Paw Print Sketch",
      inspectText:
        "The little prints curve around the fountain and head toward the community garden gate."
    },
    pickles: {
      label: "Pickles",
      description: "A very relieved, very cute rabbit.",
      image: "./assets/pickles-rabbit.png",
      inspectTitle: "Pickles Found",
      inspectText:
        "Pickles is safe, cozy, and already nibbling a carrot top like nothing dramatic happened at all."
    },
    fiveDollars: {
      label: "$5 Case Fee",
      description: "Lila's crinkled thank-you payment for finding Pickles.",
      image: "./assets/inspect-rabbit-clues.png",
      inspectTitle: "Five-Dollar Case Fee",
      inspectText:
        "The Finch Street Mystery Club's first paid case earned five dollars. Kimmy tucks it away; a future clue may need bus fare, a copy fee, or a very useful snack."
    },
    briarFile: {
      label: "Briar Lane File",
      description: "Kimmy's notes for the house everyone calls haunted.",
      image: "./assets/case2-exterior.png",
      inspectTitle: "Briar Lane File",
      inspectText:
        "Lila's warning, Mr. Hexibald's rule, glowing windows, and strange music all point to the same place: the empty old house on Briar Lane."
    },
    nurseryKey: {
      label: "Small Brass Key",
      description: "A key Mrs. Wren gives Kimmy for the upstairs room.",
      image: "./assets/npc-grandmother.png",
      inspectTitle: "Small Brass Key",
      inspectText:
        "The key is old, polished by years of careful use, and tied with a faded lavender ribbon."
    }
  };

  const CLUES = {
    lila:
      "Lila is frantic: Pickles wears a mint ribbon, loves carrots, and disappeared before the picnic. She can pay five dollars if Kimmy finds her.",
    bakery:
      "Bakery clue: carrot crumbs, flour paw prints, and a mint ribbon point away from the patio.",
    poppy:
      "Mrs. Poppy saw a cream-colored rabbit hop toward the park after breakfast rolls came out.",
    park:
      "Park clue: tiny paw prints curve around the fountain and continue through the garden gate.",
    basil:
      "Mr. Basil says nervous rabbits hide near lavender and come out for quiet voices, carrot tops, and familiar bells.",
    briarLane:
      "Case 02 lead: Lila feared Pickles had gone near the old Briar Lane house, where Mr. Hexibald warns kids away and someone may be sneaking in after dark.",
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
    briarPortrait:
      "Long mystery clue: a sun-faded portrait in Briar Lane House shows a young woman with Kimmy's eyes and a crescent locket.",
    briarHeight:
      "Long mystery clue: the old girls' room has baby-height marks and a crescent pattern that feel strangely familiar.",
    nameEcho:
      "Long mystery clue: Mrs. Poppy nearly called Kimmy 'Mara,' then quickly pretended she meant 'my dear.'",
    photo:
      "Long mystery clue: an old photograph in the tree fort shows a young woman who looks almost exactly like Kimmy.",
    identity:
      "Long mystery clue: the picnic invitation stamp has a tiny crescent-and-star mark like Kimmy's locket.",
    solved:
      "Case solved: Pickles was hiding safely in the community garden basket. Kimmy found her by following every clue in order and earned the club's first five-dollar fee."
  };

  const NPCS = {
    lila: {
      name: "Lila",
      role: "Pet Owner",
      portrait: "./assets/npc-lila.png",
      line:
        "Please help me, Kimmy. Pickles is gone. I checked the picnic blankets and called her name and I am trying not to cry. I have five dollars if the Mystery Club can find her.",
      hint:
        "Start where snacks smell strongest. Pickles always follows her nose."
    },
    poppy: {
      name: "Mrs. Poppy Vale",
      role: "Bakery Owner",
      portrait: "./assets/npc-poppy.png",
      line:
        "I found flour paw prints near the patio chair, dear. A little cream rabbit sniffed the carrot rolls, then hopped toward the park. For a second I almost called you Mara. Silly old habit.",
      hint:
        "Look low to the ground. Flour tracks fade fast, but ribbon catches on chair legs."
    },
    basil: {
      name: "Mr. Basil Green",
      role: "Community Gardener",
      portrait: "./assets/npc-basil.png",
      line:
        "A rabbit would choose the lavender bench if the picnic felt too noisy. Move slowly, offer a carrot top, then let her hear her little bell.",
      hint:
        "Quiet first, carrot second, bell last. That order will feel safe to Pickles."
    },
    hexibald: {
      name: "Mr. Hexibald",
      role: "Briar Lane Caretaker",
      portrait: "./assets/npc-hexibald.png",
      line:
        "That house is not for children, not for games, and certainly not for clubs with notebooks. I keep it locked because I promised I would.",
      hint:
        "A warning is a clue about what someone wants hidden."
    },
    grandmother: {
      name: "Mrs. Wren",
      role: "Night Visitor",
      portrait: "./assets/npc-grandmother.png",
      line:
        "I did not mean to frighten anyone. I come here to play the old lullaby and remember a family I loved very much.",
      hint:
        "The house is not haunted. It is remembered."
    }
  };

  const INSPECTIONS = {
    caseBoard: {
      title: "Kimmy's Case Board",
      image: "./assets/inspect-rabbit-clues.png",
      text:
        "In the tree-fort HQ, Kimmy pins up three facts: Pickles is cream-colored, wears mint green, and loves carrots."
    },
    familyPhoto: {
      title: "The Unlabeled Photograph",
      image: "./assets/inspect-family-photo.png",
      text:
        "The woman in the old photograph has Kimmy's eyes, Kimmy's thoughtful half-smile, and the same kind of crescent locket. No name, no date, no explanation."
    },
    briarClipping: {
      title: "Briar Lane File",
      image: "./assets/case2-exterior.png",
      text:
        "Kimmy writes the first Case 02 question: if no one lives in Briar Lane House, who keeps entering after dark, turning on lights, and playing the piano?"
    },
    bakeryClues: {
      title: "Bakery Patio Clues",
      image: "./assets/inspect-rabbit-clues.png",
      text:
        "Carrot crumbs, a mint ribbon, and flour paw prints make a neat little trail away from the bakery bench."
    },
    parkPrints: {
      title: "Fountain Paw Prints",
      image: "./assets/inspect-rabbit-clues.png",
      text:
        "The prints are tiny and close together. Pickles was not running; she was exploring."
    },
    locket: {
      title: "Kimmy's Crescent Locket",
      image: "./assets/inspect-kimmy-locket.png",
      text:
        "Kimmy's old locket rests beside the picnic envelope. The tiny stamp on the envelope has the same crescent-and-star curve, as if someone wanted her to notice it."
    },
    pickles: {
      title: "A Cozy Hiding Spot",
      image: "./assets/pickles-rabbit.png",
      text:
        "Something soft rustles near the lavender bench. A mint ribbon peeks out from the basket."
    },
    gardenRustle: {
      title: "Lavender Bench",
      image: "./assets/case1-garden.png",
      text:
        "The lavender bench is quiet, shady, and full of little hiding places. Kimmy hears one soft rustle, then nothing. She needs the right rabbit approach before she searches closer."
    },
    hexibaldNotice: {
      title: "Mr. Hexibald's Warning",
      image: "./assets/inspect-hexibald-warning.png",
      text:
        "A stiff card is wired to the gate. There are no clear words left after the weather, but the careful knots look like Mr. Hexibald's work."
    },
    briarWindow: {
      title: "Glowing Upper Window",
      image: "./assets/case2-exterior.png",
      text:
        "The upper window glows too warmly to be moonlight. Someone inside is using a lamp."
    },
    looseShutter: {
      title: "Loose Shutter",
      image: "./assets/case2-exterior.png",
      text:
        "A shutter taps the wall in a perfect knock-knock pause whenever the wind slides through the gate."
    },
    pianoMusic: {
      title: "Old Piano",
      image: "./assets/case2-living-room.png",
      text:
        "The piano keys are dusty except for the middle notes. Someone has played the same gentle tune more than once."
    },
    briarPortrait: {
      title: "Faded Portrait",
      image: "./assets/inspect-mara-portrait.png",
      text:
        "The portrait is too faded to prove anything. Still, the young woman has Kimmy's eyes, and a crescent locket rests at her collar."
    },
    heightMarks: {
      title: "Old Girls' Room",
      image: "./assets/case2-nursery.png",
      text:
        "The room has been kept gently, not cleaned. A rocking chair, a toy shelf, and tiny height marks suggest someone could not bear to let it disappear."
    }
  };

  const LOCATIONS = {
    clubhouse: {
      title: "Tree Fort HQ",
      subtitle: "Finch Street Maple",
      image: "./assets/treefort-clubhouse.png",
      lead:
        "Kimmy opens the Finch Street Mystery Club from her tree-fort HQ, where books, maps, and old photographs wait for the next knock on the ladder.",
      hotspots: [
        {
          id: "club-lila",
          label: "Talk to Lila",
          x: 22,
          y: 58,
          action: openLilaHotspot
        },
        {
          id: "club-board",
          label: "Check the case board",
          x: 78,
          y: 39,
          action: () =>
            openActionMenu({
              title: "Kimmy's Case Board",
              image: INSPECTIONS.caseBoard.image,
              text:
                "The board has string, blank clue cards, and a big question written in blue pencil: Where would Pickles go first?",
              actions: [
                {
                  label: "Read the board",
                  description: "Review what Kimmy knows right now.",
                  onSelect: () => openInspection("caseBoard")
                },
                {
                  label: "Pin Lila's facts",
                  description: "Record the rabbit description as evidence.",
                  requires: () => getFlag("clientInterview"),
                  lockedMessage: "Kimmy needs to ask Lila what happened before pinning facts.",
                  primary: true,
                  onSelect: () => {
                    addClue("lila");
                    speak("Kimmy pins the useful facts: cream rabbit, mint ribbon, carrot snacks.");
                  }
                },
                {
                  label: "Guess the garden",
                  description: "Skip the evidence and jump to a conclusion.",
                  onSelect: () =>
                    speak("Too soon. Kimmy needs a trail, not a guess.")
                }
              ]
            })
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
                "The photograph is not part of the pet case, but Kimmy keeps noticing the woman in it.",
              actions: [
                {
                  label: "Study the face",
                  description: "Zoom in and compare details.",
                  primary: true,
                  onSelect: () =>
                    openInspection("familyPhoto", {
                      actionLabel: "Add to personal file",
                      onAction: () => {
                        setFlag("familyPhotoFound");
                        addClue("photo");
                        speak(
                          "Kimmy adds the old photograph to her personal file. The woman in it looks too much like her to ignore."
                        );
                      }
                    })
                },
                {
                  label: "Ignore it",
                  description: "Stay focused on Pickles.",
                  onSelect: () =>
                    speak("Kimmy looks away, but the photograph keeps feeling like a clue waiting for its chapter.")
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
                "Kimmy starts a new file after Lila mentions the house everyone avoids: someone entering after dark, lights in the windows, piano music, and Mr. Hexibald's warning at the gate.",
              actions: [
                {
                  label: "Review Case 02",
                  description: "Pin Lila's warning and the first question.",
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
                    speak("Kimmy has five dollars from Lila's case. She saves it in the club jar for future investigating.")
                }
              ]
            })
        },
        {
          id: "club-locket",
          label: "Inspect Kimmy's locket",
          x: 72,
          y: 70,
          action: () =>
            openActionMenu({
              title: "Kimmy's Crescent Locket",
              image: INSPECTIONS.locket.image,
              text:
                "The locket is Kimmy's oldest clue. The picnic envelope beside it has a familiar tiny stamp.",
              actions: [
                {
                  label: "Compare symbols",
                  description: "Add the matching mark to Kimmy's personal mystery.",
                  primary: true,
                  onSelect: () =>
                    openInspection("locket", {
                      actionLabel: "Record Kimmy clue",
                      onAction: () => {
                        setFlag("identityClueFound");
                        addClue("identity");
                        speak(
                          "Kimmy notices the picnic envelope has a crescent-and-star mark like her locket. Interesting, but Pickles comes first."
                        );
                      }
                    })
                },
                {
                  label: "Close locket",
                  description: "Save the personal mystery for later.",
                  onSelect: () =>
                    speak("Kimmy closes the locket carefully. Her own case can wait until Pickles is safe.")
                }
              ]
            })
        }
      ]
    },
    bakery: {
      title: "Poppy's Bakery",
      subtitle: "Town Picnic Street",
      image: "./assets/case1-bakery.png",
      unlockFlag: "clientInterview",
      lockedLead:
        "Kimmy needs to officially open the case with Lila before leaving the tree fort.",
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
                "Mrs. Poppy is dusting flour from the patio chair. She keeps glancing at Kimmy like she recognizes someone else.",
              actions: [
                {
                  label: "Ask what she saw",
                  description: "Interview the witness before touching evidence.",
                  primary: true,
                  onSelect: () => {
                    setFlag("poppyTalked");
                    addClue("poppy");
                    addClue("nameEcho");
                    speak("Mrs. Poppy saw Pickles hop toward the park. She also almost called Kimmy by another name: Mara.");
                  }
                },
                {
                  label: "Buy carrot roll",
                  description: "Useful smell, not useful evidence.",
                  onSelect: () =>
                    speak("The carrot roll smells amazing. Kimmy files away one fact: Pickles would definitely follow this scent.")
                },
                {
                  label: "Ask about Mara",
                  description: "Press the odd name Mrs. Poppy almost said.",
                  requires: () => getFlag("poppyTalked"),
                  lockedMessage: "Kimmy has not heard the strange name yet.",
                  onSelect: () =>
                    speak("Mrs. Poppy smiles too fast. 'Old town habit, dear.' Kimmy writes that down because it is not an answer.")
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
            "Kimmy should ask Mrs. Poppy what she saw before collecting patio evidence.",
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
                  description: "Bag the evidence and mark the direction.",
                  primary: true,
                  onSelect: () => {
                    setFlag("bakeryClue");
                    addItem("mintRibbon");
                    addItem("carrotCrumbs");
                    addClue("bakery");
                    speak("Kimmy collects the mint ribbon and carrot crumbs. The trail points toward the park.");
                  }
                },
                {
                  label: "Follow prints now",
                  description: "Move on without preserving the clue.",
                  onSelect: () =>
                    speak("Kimmy stops herself. If she follows the prints now, the patio evidence could be swept away.")
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
            "Kimmy needs to collect the bakery clues before she knows where to go next.",
          x: 82,
          y: 64,
          action: () =>
            openActionMenu({
              title: "Path Toward the Park",
              image: "./assets/case1-bakery.png",
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
                  onSelect: () =>
                    speak("Kimmy checks the street, but the prints vanish there. The park path is the stronger lead.")
                }
              ]
            })
        }
      ]
    },
    park: {
      title: "Picnic Park",
      subtitle: "Fountain Path",
      image: "./assets/case1-park.png",
      unlockFlag: "bakeryClue",
      lockedLead:
        "The park is not a real lead yet. Kimmy needs the bakery clues first.",
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
                  description: "Record the direction before moving on.",
                  primary: true,
                  onSelect: () => {
                    setFlag("parkTrail");
                    addItem("pawPrintSketch");
                    addClue("park");
                    speak("The paw prints curve around the fountain and head through the garden gate.");
                  }
                },
                {
                  label: "Call Pickles",
                  description: "Try to solve it by shouting.",
                  onSelect: () =>
                    speak("No bell answers. A nervous rabbit would hide from a loud voice.")
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
            "Kimmy should inspect the fountain paw prints before following them through the gate.",
          x: 77,
          y: 58,
          action: () =>
            openActionMenu({
              title: "Garden Gate",
              image: "./assets/case1-park.png",
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
                  onSelect: () =>
                    speak("Kimmy checks the picnic tables. Plenty of napkins, no mint ribbon, no rabbit bell.")
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
              image: "./assets/case1-park.png",
              text:
                "The picnic blankets are bright and noisy. If Pickles came through here, she probably did not stay.",
              actions: [
                {
                  label: "Listen for bell",
                  description: "Use sound instead of guessing.",
                  onSelect: () =>
                    speak("Kimmy hears picnic music, but no rabbit bell. Pickles must be somewhere quieter.")
                },
                {
                  label: "Search baskets",
                  description: "A tempting but weak lead.",
                  onSelect: () =>
                    speak("Kimmy finds sandwiches, lemonade, and zero rabbits. The paw prints matter more.")
                }
              ]
            })
        }
      ]
    },
    garden: {
      title: "Community Garden",
      subtitle: "Lavender Beds",
      image: "./assets/case1-garden.png",
      unlockFlag: "parkTrail",
      lockedLead:
        "The garden gate is still just a guess. Kimmy needs the park paw-print trail first.",
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
                  description: "Learn the safe way to bring Pickles out.",
                  primary: true,
                  onSelect: () => {
                    setFlag("basilTalked");
                    addClue("basil");
                    speak("Mr. Basil gives Kimmy the gentle order: quiet first, carrot second, bell last.");
                  }
                },
                {
                  label: "Show mint ribbon",
                  description: "Use the clue from Pickles' collar.",
                  requires: () => hasItem("mintRibbon"),
                  lockedMessage: "Kimmy has not collected the mint ribbon from the bakery patio yet.",
                  onSelect: () =>
                    speak("Mr. Basil nods. 'That tiny bell is familiar to her, but only after she feels safe.'")
                },
                {
                  label: "Search garden alone",
                  description: "Try to skip the rabbit expert.",
                  onSelect: () =>
                    speak("Too many hiding places. Kimmy needs Mr. Basil's advice before searching the lavender bench.")
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
            "Kimmy hears a tiny rustle, but Mr. Basil will know how to approach a scared rabbit safely.",
          x: 66,
          y: 68,
          action: () => {
            if (!getFlag("bakeryClue") || !getFlag("parkTrail") || !getFlag("basilTalked")) {
              openActionMenu({
                title: "Lavender Bench Rustle",
                image: INSPECTIONS.gardenRustle.image,
                text:
                  "Something tiny rustles near the bench, then goes still. Kimmy can tell this hiding spot needs a gentle plan.",
                actions: [
                  {
                    label: "Back away softly",
                    description: "Do not scare the hidden animal.",
                    primary: true,
                    onSelect: () =>
                      speak("Kimmy should gather the bakery clue, the park trail, and Mr. Basil's rabbit tip first.")
                  },
                  {
                    label: "Reach inside",
                    description: "Rush the hiding place.",
                    onSelect: () =>
                      speak("The rustle stops. Kimmy pulls her hand back. A scared rabbit needs patience.")
                  }
                ]
              });
              return;
            }
            openActionMenu({
              title: "Lavender Bench Hiding Spot",
              image: INSPECTIONS.gardenRustle.image,
              text:
                "A soft rustle comes from the basket by the lavender. Kimmy has the ribbon, the carrot clue, the paw-print trail, and Mr. Basil's order.",
              actions: [
                {
                  label: "Listen first",
                  description: "Confirm Pickles is calm enough to coax.",
                  onSelect: () =>
                    speak("Kimmy waits. A tiny bell gives one soft chime from inside the basket.")
                },
                {
                  label: "Reach into basket",
                  description: "A fast move that could scare Pickles.",
                  onSelect: () =>
                    speak("The basket shivers away from Kimmy's hand. Mr. Basil was right: quiet first.")
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
              image: "./assets/case1-garden.png",
              text:
                "The carrot patch is neat except for one wiggly row. These tops smell exactly like the bakery crumbs.",
              actions: [
                {
                  label: "Pick one carrot top",
                  description: "Save a gentle snack for Pickles.",
                  primary: true,
                  onSelect: () =>
                    speak("Kimmy picks one soft carrot top. It is the right kind of snack, but it needs the right order.")
                },
                {
                  label: "Scatter carrots",
                  description: "Make a noisy shortcut.",
                  onSelect: () =>
                    speak("Kimmy decides against it. A trail of snacks would make a mess, not solve the clue.")
                },
                {
                  label: "Ask Mr. Basil first",
                  description: "Check whether carrots are enough by themselves.",
                  requires: () => getFlag("basilTalked"),
                  lockedMessage: "Kimmy should ask Mr. Basil how to approach a nervous rabbit.",
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
      image: "./assets/case2-exterior.png",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "case2Unlocked",
      lockedLead:
        "Briar Lane is not part of Kimmy's case file yet. Finish helping Lila first.",
      lead:
        "Briar Lane House stands empty behind roses and ironwork. Kimmy's question is simple: who keeps entering it after dark?",
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
                "Mr. Hexibald steps between Kimmy and the gate. He is stern, but his eyes keep flicking toward the glowing upper window.",
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
                    speak("Kimmy gets exactly three steps before Mr. Hexibald taps his cane. Subtle investigation will work better.")
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
                    speak("Kimmy records the warning. Someone is keeping kids out, but that is not the same as a ghost keeping people away.");
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
                    speak("Kimmy decides the glow is lamplight. That means someone living, not something ghostly, is inside.");
                  }
                },
                {
                  label: "Call it haunted",
                  description: "Jump to the town rumor.",
                  onSelect: () =>
                    speak("Kimmy writes 'haunted?' with a question mark, then underlines the question mark twice.")
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
                    speak("Kimmy matches the rhythm to the wind. One haunted-house sound is only a loose shutter.");
                  }
                },
                {
                  label: "Knock back",
                  description: "Try to answer the house.",
                  onSelect: () =>
                    speak("No one knocks back. Kimmy smiles anyway; experiments count.")
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
            "Kimmy should understand Mr. Hexibald's warning, the glowing window, and the shutter sound before asking to enter.",
          x: 54,
          y: 58,
          action: () =>
            openActionMenu({
              title: "Front Door",
              image: "./assets/case2-exterior.png",
              text:
                "Kimmy can now explain three things: the warning is from a caretaker, the glow is lamplight, and the knocking is a loose shutter.",
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
                    speak("Kimmy decides she likes permission better than scratches from rose bushes.")
                }
              ]
            })
        }
      ]
    },
    briarFoyer: {
      title: "Briar Lane Foyer",
      subtitle: "Inside the Empty House",
      image: "./assets/case2-foyer.png",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "briarInside",
      lockedLead:
        "Kimmy needs permission from Mr. Hexibald before entering the house.",
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
              image: "./assets/case2-foyer.png",
              text:
                "Most portraits are too faded to identify. One frame has been recently dusted.",
              actions: [
                {
                  label: "Look for family clues",
                  description: "Start a personal file note.",
                  onSelect: () =>
                    speak("Kimmy notices the house has been cared for in small, quiet ways. Someone visits on purpose.")
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
              image: "./assets/case2-foyer.png",
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
                    speak("Kimmy leaves it gentle. This house feels like evidence and memory at the same time.")
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
              image: "./assets/case2-foyer.png",
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
                  description: "Announce Kimmy is inside.",
                  onSelect: () =>
                    speak("The music stops. Kimmy waits, then hears one floorboard creak in the piano room.")
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
            "The upstairs room matters, but Kimmy should solve who is visiting the house before opening private rooms.",
          x: 25,
          y: 42,
          action: () =>
            openActionMenu({
              title: "Stairway to the Old Room",
              image: "./assets/case2-foyer.png",
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
                    speak("Kimmy waits, but the key feels important in her palm.")
                }
              ]
            })
        }
      ]
    },
    briarLiving: {
      title: "Piano Room",
      subtitle: "Briar Lane Living Room",
      image: "./assets/case2-living-room.png",
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
                "The piano is out of tune, but the middle keys are clean. The sheet music is open to a lullaby Kimmy almost recognizes.",
              actions: [
                {
                  label: "Listen to the tune",
                  description: "Find the source of the ghost music.",
                  primary: true,
                  onSelect: () => {
                    setFlag("briarMusicClue");
                    addClue("briarMusic");
                    speak("The haunted music is a piano lullaby. Kimmy almost knows it, which bothers her more than the rumor did.");
                  }
                },
                {
                  label: "Press random keys",
                  description: "Make noise before thinking.",
                  onSelect: () =>
                    speak("The notes wobble through the room. Kimmy decides the house has enough rumors already.")
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
              image: "./assets/case2-living-room.png",
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
                    speak("Kimmy writes: ghosts probably do not leave muddy shoe prints.")
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
              image: "./assets/case2-living-room.png",
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
                    speak("Kimmy leaves the shawl where it is. Detectives do not wear clues.")
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
            "Kimmy needs the piano clue and the fresh visitor trail before she can understand who is inside.",
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
                    speak("Mrs. Wren says she comes for memories, not mischief. She gives Kimmy a small key for the upstairs room.");
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
      image: "./assets/case2-nursery.png",
      showWhen: () => getFlag("case2Unlocked"),
      unlockFlag: "grandmotherMet",
      lockedLead:
        "Kimmy needs Mrs. Wren's key before entering the upstairs room.",
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
              image: "./assets/case2-nursery.png",
              text:
                "The mobile turns above the little bed, chiming the first notes of the piano lullaby.",
              actions: [
                {
                  label: "Hum along",
                  description: "Kimmy knows more than she can explain.",
                  primary: true,
                  onSelect: () =>
                    speak("Kimmy hums three notes before she realizes she knows them. She stops and writes that down.")
                },
                {
                  label: "Spin it fast",
                  description: "A noisy shortcut.",
                  onSelect: () =>
                    speak("Kimmy keeps it gentle. Some clues are fragile.")
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
                  primary: true,
                  onSelect: () => {
                    addClue("briarHeight");
                    speak("Kimmy adds the height marks to her personal file. She cannot prove why they matter, but they do.");
                  }
                },
                {
                  label: "Measure herself",
                  description: "Check if the marks belong to her now.",
                  onSelect: () =>
                    speak("Kimmy is much taller now. The marks belonged to a baby or toddler, long ago.")
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
              image: "./assets/case2-nursery.png",
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
                        addClue("briarPortrait");
                        speak("Kimmy saves the portrait clue. She does not know the woman's name yet, but the face feels like a question written for her.");
                      }
                    })
                },
                {
                  label: "Close box",
                  description: "Leave the memory untouched.",
                  onSelect: () =>
                    speak("Kimmy closes the box carefully. Even mysteries deserve manners.")
                }
              ]
            })
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
    "briarNursery"
  ];

  const PUZZLES = {
    coaxPickles: {
      title: "Coax Pickles Out",
      image: "./assets/pickles-rabbit.png",
      intro:
        "Mr. Basil gave Kimmy the gentle order. What should she do first, second, and last?",
      choices: ["Call loudly", "Walk quietly", "Reach into basket", "Offer carrot", "Ring ribbon bell"],
      answer: ["Walk quietly", "Offer carrot", "Ring ribbon bell"],
      solvedFlag: "caseSolved",
      solvedClue: "solved",
      reward: "pickles",
      success:
        "Pickles hops out, safe and happy. Lila is going to be so relieved.",
      already:
        "Pickles is already safe in Kimmy's arms."
    }
  };

  const state = loadState();
  let toastTimer = null;
  let activeAudio = null;
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
    leadText: document.getElementById("leadText"),
    arcText: document.getElementById("arcText"),
    inventoryList: document.getElementById("inventoryList"),
    inventoryCount: document.getElementById("inventoryCount"),
    clueList: document.getElementById("clueList"),
    caseTitle: document.getElementById("caseTitle"),
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
      voiceEnabled: false,
      lead:
        "Open Kimmy's dossier. The first case begins when someone reaches the tree fort for help."
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && saved.flags ? { ...defaultState(), ...saved } : defaultState();
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
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

  function speak(message) {
    state.lead = message;
    saveState();
    render();
    showToast(message);
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
    }, 3400);
  }

  function navigate(locationId) {
    const location = LOCATIONS[locationId];
    if (!location) {
      return;
    }
    if (!canEnterLocation(locationId)) {
      speak(location.lockedLead || "Kimmy needs another clue before going there.");
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
    els.leadText.textContent = state.lead || location.lead;
    if (getFlag("briarPortraitClue")) {
      els.arcText.textContent =
        "Kimmy has found a Briar Lane portrait of a young woman with her eyes and a crescent locket. Mrs. Wren knows more than she is saying.";
    } else if (getFlag("grandmotherMet")) {
      els.arcText.textContent =
        "Mrs. Wren solved the ghost rumor, but not the bigger question. She remembers the house like family and gave Kimmy a key without explaining why.";
    } else if (getFlag("case2Unlocked")) {
      els.arcText.textContent =
        "Briar Lane is supposed to be empty, but Lila's warning opened a new lead: someone is visiting the old house after dark.";
    } else if (getFlag("familyPhotoFound")) {
      els.arcText.textContent =
        "Kimmy has two personal clues now: a crescent mark like her locket and an old photograph of a woman who looks like her. Someone may be guiding her with cases.";
    } else if (getFlag("identityClueFound")) {
      els.arcText.textContent =
        "Kimmy noticed a crescent-and-star mark like her locket on the picnic envelope. It is tiny, but it belongs in her personal case file.";
    } else {
      els.arcText.textContent =
        "Kimmy's oldest clue is a crescent locket from before she was adopted. Most club cases are for neighbors, but some leave crumbs for Kimmy too.";
    }
    renderHotspots(location);
    renderMap();
    renderInventory();
    renderClues();
    renderProgress();
    renderVoiceButton();
  }

  function getCurrentCase() {
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

  function renderHotspots(location) {
    els.hotspotLayer.replaceChildren();

    location.hotspots.filter(canShowHotspot).forEach((hotspot) => {
      const available = canUseHotspot(hotspot);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hotspot${available ? "" : " hotspot-locked"}`;
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;
      button.setAttribute("aria-label", available ? hotspot.label : hotspot.lockedLabel || hotspot.label);
      if (!available) {
        button.setAttribute("aria-disabled", "true");
        button.title = hotspot.lockedMessage || "Kimmy needs another clue first.";
      }
      button.addEventListener("click", () => {
        if (!canUseHotspot(hotspot)) {
          speak(hotspot.lockedMessage || "Kimmy needs another clue first.");
          return;
        }
        hotspot.action();
      });

      const label = document.createElement("span");
      label.className = "hotspot-label";
      label.textContent = available ? hotspot.label : hotspot.lockedLabel || hotspot.label;
      button.append(label);

      els.hotspotLayer.append(button);
    });
  }

  function renderMap() {
    els.mapNav.replaceChildren();

    LOCATION_ORDER.forEach((id) => {
      if (!canShowLocation(id)) {
        return;
      }
      const location = LOCATIONS[id];
      const available = canEnterLocation(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nav-button${available ? "" : " locked"}`;
      button.textContent = available ? location.title : `${location.title} locked`;
      if (id === state.location) {
        button.setAttribute("aria-current", "page");
      }
      if (!available) {
        button.setAttribute("aria-disabled", "true");
        button.title = location.lockedLead || "Locked until Kimmy finds another clue.";
      }
      button.addEventListener("click", () => navigate(id));
      els.mapNav.append(button);
    });
  }

  function renderInventory() {
    els.inventoryList.replaceChildren();
    els.inventoryCount.textContent = `${state.inventory.length} item${state.inventory.length === 1 ? "" : "s"}`;

    if (!state.inventory.length) {
      const empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No clues collected yet.";
      els.inventoryList.append(empty);
      return;
    }

    state.inventory.forEach((itemId) => {
      const item = ITEMS[itemId];
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
      els.inventoryList.append(li);
    });
  }

  function renderClues() {
    els.clueList.replaceChildren();

    if (!state.clues.length) {
      const empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No notes recorded yet.";
      els.clueList.append(empty);
      return;
    }

    state.clues.forEach((clueId) => {
      const li = document.createElement("li");
      li.textContent = CLUES[clueId];
      els.clueList.append(li);
    });
  }

  function renderProgress() {
    if (getFlag("case2Unlocked")) {
      const count = CASE2_BEATS.filter(getFlag).length;
      els.progressText.textContent = getFlag("briarPortraitClue")
        ? "Case 2: first room solved"
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
    hero.style.backgroundImage = 'url("./assets/treefort-clubhouse.png")';

    const story = document.createElement("div");
    story.className = "intro-copy";
    story.innerHTML = `
      <p class="panel-label">Series Premise</p>
      <p>${STORY.intro}</p>
      <p>${STORY.mission}</p>
      <p>${STORY.hook}</p>
      <p>${STORY.seriesArc}</p>
    `;

    const cast = document.createElement("div");
    cast.className = "cast-grid";
    cast.append(
      createCastCard("./assets/kimmy-avatar.png", "Kimmy Finch", "Founder, clue-spotter, keeper of the crescent locket."),
      createCastCard("./assets/treefort-clubhouse.png", "Finch Street Mystery Club", "A tree-fort headquarters for maps, books, case files, and neighbor mysteries."),
      createCastCard("./assets/inspect-family-photo.png", "The Private File", "Kimmy keeps the crescent locket and unlabeled photo separate from club business.")
    );

    body.append(hero, story, cast);

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
      speak("Kimmy reviews the club notebook and her private mystery file.");
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
      image: NPCS.lila.portrait,
      text:
        "The tree-fort pulley basket rattles with an urgent note from Lila: Pickles is missing. Please help. I have five dollars.",
      actions: [
        {
          label: "Invite Lila in",
          description: "Start by listening to the worried client.",
          primary: true,
          onSelect: openLilaCaseMenu
        },
        {
          label: "Check club rules",
          description: "Remember how Kimmy handles a case.",
          onSelect: () =>
            speak("Kimmy writes the club rules again: listen first, collect clues, be kind to worried clients.")
        }
      ]
    });
  }

  function openLilaHotspot() {
    if (getFlag("caseSolved")) {
      openCase2Bridge();
      return;
    }
    openLilaCaseMenu();
  }

  function openLilaCaseMenu() {
    openActionMenu({
      title: "Lila and the Empty Basket",
      image: NPCS.lila.portrait,
      text:
        "Lila climbs into the tree fort with Pickles' travel basket hugged to her chest. The door is open, and she is blinking hard like she does not want to cry.",
      actions: [
        {
          label: "Ask what happened",
          description: "Start the case by listening to the client.",
          primary: true,
          onSelect: () => {
            setFlag("clientInterview");
            addClue("lila");
            speak(
              "Kimmy takes the case for five dollars. Pickles has a mint ribbon, a tiny bell, and a serious carrot habit."
            );
          }
        },
        {
          label: "Examine basket",
          description: "Look for a clue before making promises.",
          onSelect: () =>
            speak("The basket smells like hay, carrots, and a little lavender. Pickles has favorite places.")
        },
        {
          label: "Promise first",
          description: "A kind impulse, but not a detective move.",
          onSelect: () =>
            speak("Kimmy promises carefully: she will follow every clue, and she will not give up on Pickles.")
        }
      ]
    });
  }

  function unlockCase2(message) {
    setFlag("case2Unlocked");
    addItem("fiveDollars");
    addItem("briarFile");
    addClue("briarLane");
    speak(message);
  }

  function openCase2Bridge() {
    if (getFlag("case2Unlocked")) {
      openActionMenu({
        title: "Briar Lane Lead",
        image: INSPECTIONS.briarClipping.image,
        text:
          "Kimmy's new question is waiting: if the old house is empty, who keeps entering after dark?",
        actions: [
          {
            label: "Go to Briar Lane",
            description: "Begin Case 02 at the front gate.",
            primary: true,
            onSelect: () => navigate("briarExterior")
          },
          {
            label: "Review the file",
            description: "Look again at Kimmy's first Case 02 note.",
            onSelect: () => openInspection("briarClipping")
          }
        ]
      });
      return;
    }

    openActionMenu({
      title: "Lila's Thank-You",
      image: NPCS.lila.portrait,
      text:
        "Lila hugs Pickles so tightly the little bell jingles. She pays the promised five dollars, then admits she was terrified Pickles had gone to Briar Lane House. No one goes there. Mr. Hexibald says to stay away.",
      actions: [
        {
          label: "Ask about Briar Lane",
          description: "Let Lila's fear become the next case.",
          primary: true,
          onSelect: () => {
            unlockCase2("Case 02 begins: if Briar Lane House is empty, who keeps entering it after dark?");
            navigate("briarExterior");
          }
        },
        {
          label: "Ask about Mr. Hexibald",
          description: "Learn why the caretaker sounds suspicious.",
          onSelect: () =>
            unlockCase2("Lila says Mr. Hexibald has guarded Briar Lane for years. Kimmy opens a new file: caretaker, lights, piano music, night visitor.")
        },
        {
          label: "Put $5 in the club jar",
          description: "Save the fee for a future investigation.",
          onSelect: () => {
            addItem("fiveDollars");
            speak("Kimmy saves the five dollars in the club jar. A future case may need bus fare, a copy fee, or exactly one strategic snack.");
          }
        }
      ]
    });
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
      const description = document.createElement("span");
      description.textContent = menuAction.description || "";
      button.append(label, description);

      button.addEventListener("click", () => {
        if (!isAvailable) {
          showToast(menuAction.lockedMessage || "Kimmy needs another clue first.");
          return;
        }
        closeModal();
        if (menuAction.onSelect) {
          menuAction.onSelect();
        }
      });

      grid.append(button);
    });

    body.append(grid);

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
        speak("Pickles stays hidden. Check Mr. Basil's hint for the gentle order.");
      }
    });

    body.append(image, riddle, grid, readout);
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
    setFlag(puzzle.solvedFlag);
    addClue(puzzle.solvedClue);
    addItem(puzzle.reward);
    state.lead = puzzle.success;
    saveState();
    render();
    showToast(puzzle.success);
    openCaseClosed();
  }

  function openCaseClosed() {
    const modal = createModal("Case Closed: Pickles Found", { wide: true });
    const body = modal.querySelector(".modal-body");
    const actions = modal.querySelector(".modal-actions");

    const image = document.createElement("img");
    image.className = "inspection-image";
    image.src = "./assets/pickles-rabbit.png";
    image.alt = "Pickles the rabbit safe in the garden basket";

    const summary = document.createElement("div");
    summary.className = "case-closed-copy";
    summary.innerHTML = `
      <p class="panel-label">Solved</p>
      <p>Kimmy did not just spot Pickles. She solved the path: Lila's carrot clue led to Mrs. Poppy, the bakery trail led to the park, the paw prints led to the garden, and Mr. Basil taught Kimmy how to coax a nervous rabbit safely.</p>
      <p>Pickles is safe before the picnic. Now Kimmy needs to return Pickles to Lila, collect the five-dollar case fee, and hear why Lila was afraid of the old house on Briar Lane.</p>
    `;

    body.append(image, summary);

    const stay = document.createElement("button");
    stay.type = "button";
    stay.className = "modal-button";
    stay.textContent = "Review clues";
    stay.addEventListener("click", closeModal);

    const thankLila = document.createElement("button");
    thankLila.type = "button";
    thankLila.className = "modal-button primary";
    thankLila.textContent = "Return Pickles to Lila";
    thankLila.addEventListener("click", () => {
      closeModal();
      navigate("clubhouse");
      openCase2Bridge();
    });

    actions.append(stay, thankLila);
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
      speak("Hint: talk to Lila at the clubhouse to learn what Pickles likes.");
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
      speak("Hint: return Pickles to Lila at the clubhouse. Her thank-you points Kimmy toward the next mystery.");
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
      speak("Hint: once Kimmy has the gate clues, ask Mr. Hexibald for permission to look inside.");
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
    if (!getFlag("briarPortraitClue")) {
      speak("Hint: use Mrs. Wren's small key upstairs. The old girls' room has a keepsake box.");
      return;
    }
    if (!getFlag("identityClueFound")) {
      speak("Hint: inspect Kimmy's locket back at the clubhouse.");
      return;
    }
    if (!getFlag("familyPhotoFound")) {
      speak("Hint: inspect the old photograph on the tree-fort desk.");
      return;
    }
    speak("Case 02's opening mystery is solved: Briar Lane is not haunted. Mrs. Wren has memories there, and Kimmy has a new family clue.");
  }

  els.hintButton.addEventListener("click", showHint);
  els.storyButton.addEventListener("click", () => openIntro(false));
  els.voiceButton.addEventListener("click", toggleVoice);
  els.resetButton.addEventListener("click", () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    localStorage.removeItem(STORAGE_KEY);
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
