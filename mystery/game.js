(function () {
  const STORAGE_KEY = "kimmy-finch-picnic-pet-v4";

  const CASE_BEATS = [
    "clientInterview",
    "poppyTalked",
    "bakeryClue",
    "parkTrail",
    "basilTalked",
    "caseSolved"
  ];

  const STORY = {
    title: "Case 01: The Picnic Pet",
    club: "Finch Street Mystery Club",
    intro:
      "Kimmy Finch knows she was adopted, and her parents love her completely. Still, the first part of her story is a puzzle with only one clue: a tiny crescent locket she has had for as long as anyone can remember.",
    mission:
      "Kimmy is also the best noticer in town. She built the Finch Street Mystery Club in a tree fort, where she reads case files, researches old town maps, and helps neighbors with small, important mysteries. Today's job is bright, urgent, and very fluffy: find Lila's rabbit, Pickles, before the town picnic begins.",
    hook:
      "Most cases solve someone else's problem. Every so often, one also gives Kimmy a clue about her own.",
    seriesArc:
      "A pattern is starting: the grown-ups who bring Kimmy cases seem to know more about her first family than they can say. Some may even be relatives helping from a distance, guiding Kimmy toward the truth because telling her outright could put people in danger.",
    nextCase:
      "Case 02 teaser: a harmless 'haunted house' mystery at an abandoned home on Briar Lane. The clues there should feel personal without proving anything yet: a tune Kimmy almost remembers, a faded portrait, and someone who says she has familiar eyes."
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
    }
  };

  const CLUES = {
    lila:
      "Lila says Pickles wears a mint ribbon and always follows the smell of carrots.",
    bakery:
      "Bakery clue: carrot crumbs, flour paw prints, and a mint ribbon point away from the patio.",
    poppy:
      "Mrs. Poppy saw a cream-colored rabbit hop toward the park after breakfast rolls came out.",
    park:
      "Park clue: tiny paw prints curve around the fountain and continue through the garden gate.",
    basil:
      "Mr. Basil says nervous rabbits hide near lavender and come out for quiet voices, carrot tops, and familiar bells.",
    briarLane:
      "Next case clue: the Briar Lane house has glowing windows, a music-box tune, and an old portrait too faded to identify.",
    nameEcho:
      "Long mystery clue: Mrs. Poppy nearly called Kimmy 'Mara,' then quickly pretended she meant 'my dear.'",
    photo:
      "Long mystery clue: an old photograph in the tree fort shows a young woman who looks almost exactly like Kimmy.",
    identity:
      "Long mystery clue: the picnic invitation stamp has a tiny crescent-and-star mark like Kimmy's locket.",
    solved:
      "Case solved: Pickles was hiding safely in the community garden basket. Kimmy found her by following every clue in order."
  };

  const NPCS = {
    lila: {
      name: "Lila",
      role: "Pet Owner",
      portrait: "./assets/npc-lila.png",
      line:
        "Pickles slipped out while we were setting up for the picnic. She has a mint ribbon with a tiny bell, and she will do anything for carrot snacks.",
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
      title: "Briar Lane Clipping",
      image: "./assets/inspect-briar-clipping.png",
      text:
        "A clipped note says the abandoned Briar Lane house glows at dusk and plays music when no one is inside. Someone underlined one phrase: 'the girl has familiar eyes.'"
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
    }
  };

  const LOCATIONS = {
    clubhouse: {
      title: "Tree Fort HQ",
      subtitle: "Finch Street Maple",
      image: "./assets/treefort-clubhouse.png",
      lead:
        "Kimmy opens the Finch Street Mystery Club from her tree-fort HQ, where books, maps, and old photographs wait beside today's pet case.",
      hotspots: [
        {
          id: "club-lila",
          label: "Talk to Lila",
          x: 22,
          y: 58,
          action: () =>
            openActionMenu({
              title: "Lila and the Empty Basket",
              image: NPCS.lila.portrait,
              text:
                "Lila is clutching Pickles' travel basket. The door is open, and a tiny bell string dangles from one corner.",
              actions: [
                {
                  label: "Ask what happened",
                  description: "Start the case by listening to the client.",
                  primary: true,
                  onSelect: () => {
                    setFlag("clientInterview");
                    addClue("lila");
                    speak(
                      "Kimmy takes the case. Pickles has a mint ribbon, a tiny bell, and a serious carrot habit."
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
                    speak("Kimmy almost promises too quickly, then remembers: good detectives listen before they leap.")
                }
              ]
            })
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
          label: "Read Briar Lane clipping",
          x: 84,
          y: 52,
          action: () =>
            openActionMenu({
              title: "Briar Lane Clipping",
              image: INSPECTIONS.briarClipping.image,
              text:
                "The clipping belongs to a later case, but the underlined words make Kimmy curious.",
              actions: [
                {
                  label: "Read clipping",
                  description: "Open the haunted-house teaser.",
                  primary: true,
                  onSelect: () =>
                    openInspection("briarClipping", {
                      actionLabel: "Save for Case 02",
                      onAction: () => {
                        setFlag("briarLaneTeased");
                        addClue("briarLane");
                        speak(
                          "Kimmy saves the Briar Lane clipping for the next case. A haunted house is usually only haunted by clues."
                        );
                      }
                    })
                },
                {
                  label: "Put it back",
                  description: "Do not mix cases yet.",
                  onSelect: () =>
                    speak("Kimmy leaves the clipping pinned. Pickles is today's case.")
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
    }
  };

  const LOCATION_ORDER = ["clubhouse", "bakery", "park", "garden"];

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
        "Open the story dossier, talk to Lila, and help Kimmy find Pickles before the picnic."
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
    return !location.unlockFlag || getFlag(location.unlockFlag);
  }

  function canUseHotspot(hotspot) {
    return !hotspot.requires || hotspot.requires();
  }

  function render() {
    const location = LOCATIONS[state.location] || LOCATIONS.clubhouse;
    els.sceneImage.style.backgroundImage = `url("${location.image}")`;
    els.locationTitle.textContent = location.title;
    els.locationSubtitle.textContent = location.subtitle;
    els.leadText.textContent = state.lead || location.lead;
    if (getFlag("familyPhotoFound")) {
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

    location.hotspots.forEach((hotspot) => {
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
    const count = CASE_BEATS.filter(getFlag).length;
    els.progressText.textContent = getFlag("caseSolved")
      ? "Case solved"
      : `${count} of ${CASE_BEATS.length} case steps`;
    els.progressFill.style.width = `${(count / CASE_BEATS.length) * 100}%`;
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
      <p>${STORY.nextCase}</p>
    `;

    const cast = document.createElement("div");
    cast.className = "cast-grid";
    cast.append(
      createCastCard("./assets/kimmy-avatar.png", "Kimmy Finch", "Founder, clue-spotter, keeper of the crescent locket."),
      createCastCard("./assets/npc-lila.png", "Lila", "Kimmy's first paying client. Her rabbit Pickles is missing."),
      createCastCard("./assets/inspect-family-photo.png", "The Unlabeled Photo", "A quiet clue from Kimmy's own mystery file.")
    );

    body.append(hero, story, cast);

    const start = document.createElement("button");
    start.type = "button";
    start.className = "modal-button primary";
    start.textContent = isFirstRun ? "Start the case" : "Back to the case";
    start.addEventListener("click", () => {
      setFlag("introSeen");
      closeModal();
      speak(
        "Kimmy opens her first paid case: find Pickles before the town picnic begins."
      );
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
      <p>Pickles is safe before the picnic, and Kimmy has a new personal clue tucked away: someone connected to this town knows the crescent-and-star mark on her locket.</p>
    `;

    body.append(image, summary);

    const stay = document.createElement("button");
    stay.type = "button";
    stay.className = "modal-button";
    stay.textContent = "Review clues";
    stay.addEventListener("click", closeModal);

    const returnHome = document.createElement("button");
    returnHome.type = "button";
    returnHome.className = "modal-button primary";
    returnHome.textContent = "Return to Tree Fort";
    returnHome.addEventListener("click", () => {
      closeModal();
      navigate("clubhouse");
      speak("Case 01 is solved. Kimmy can review her clues or peek at the Briar Lane teaser for Case 02.");
    });

    actions.append(stay, returnHome);
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
    if (!getFlag("identityClueFound")) {
      speak("Hint: inspect Kimmy's locket back at the clubhouse.");
      return;
    }
    if (!getFlag("familyPhotoFound")) {
      speak("Hint: inspect the old photograph on the tree-fort desk.");
      return;
    }
    speak("The first case is solved, and Kimmy has a tiny clue for her own mystery.");
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
