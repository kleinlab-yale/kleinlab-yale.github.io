/**
 * 1971 Milton Bradley "Voice of the Mummy" — Interactive 3D Viewport
 * Dynamically loads Three.js + GLTFLoader (`voice_of_the_mummy.glb`), builds an immersive
 * 3D King Tut / Pharaoh's Burial Chamber environment around the pyramid board, fixes grayscale
 * bump maps so the Sandstone Steps and Bronze Sarcophagus render brightly, and builds a true
 * 6-sided 3D Die that lands on the exact rolled value (1..6).
 */

import {
  BOARD_W,
  BOARD_H,
  BOARD_SPACES,
  SPACES_BY_ID,
  PLAYERS_CONFIG,
  pxToThree,
} from './board_data.js?v=37';

export class Mummy3DView {
  constructor(containerEl, callbacks = {}) {
    this.container = containerEl;
    this.callbacks = callbacks; // { onSpaceClick, onLeverClick, onDieClick, onModelLoaded }
    this.THREE = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = null;
    this.pointer = { x: 0, y: 0 };

    this.modelLoaded = false;
    this.fallbackMode = false;

    this.explorers = {};
    this.holders = {};
    this.scarabMeshes = {};
    this.scarabHomeTransforms = {};
    this.greatJewelMesh = null;
    this.greatJewelHome = null;
    this.cobraMesh = null;
    this.cobraHome = null;
    this.sarcophagusCase = null;
    this.leverTab = null;
    this.leverHomePos = null;
    this.plungerBtn = null;
    this.dieMesh = null;
    this.dieHomePos = null;
    this.mummyLight = null;

    // Tomb Chamber & Background Mode ('tomb' | 'black')
    this.bgMode = 'tomb';
    this.tombGroup = null;
    this.tombCeilingGroup = null;
    this.blackBgTableMesh = null;
    this.torchFlames = [];
    this.torchLights = [];
    this.dustParticles = null;

    this.spacePads = {};
    this.interactiveTargets = [];

    this.activeAnimations = [];
    this.cameraTransition = null;
    this.cinematicIntro = null;
    this.cameraPreset = 'follow'; // 'follow' (default) | 'topdown' | 'hero' | 'sarcophagus'
    this.initialTopDownHold = true; // Start game from Top-Down view, then follow your character once movement begins
    this.isUserInteracting = false;
    this.userPausedFollowUntilNextMove = false;
    this.activeMovingExplorerId = null;
    this.localPeerId = 'local';
    this.isOnlineMode = false;
    this.isMummySpeaking = false;
    this.currentGameState = null;

    this._boot3D();
  }

  async _boot3D() {
    try {
      const [THREE, orbitMod, gltfMod] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/loaders/GLTFLoader.js'),
      ]);

      this.THREE = THREE;
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();

      this._initScene(THREE, orbitMod.OrbitControls);
      this._buildTombChamberEnvironment(THREE);
      this._buildSpaceHighlightPads(THREE);
      this._buildTrueSixSidedDie(THREE);
      this._loadGLBModel(THREE, gltfMod.GLTFLoader);
      this._bindEvents();
      this._animate();
    } catch (err) {
      console.warn('Three.js CDN unavailable or blocked, activating built-in 3D Perspective fallback:', err);
      this._initFallback3DView();
    }
  }

  _initFallback3DView() {
    this.fallbackMode = true;
    this.modelLoaded = true;
    const loadingEl = document.getElementById('loading-overlay-3d');
    if (loadingEl) loadingEl.classList.add('hidden');

    this.container.innerHTML = `
      <div class="fallback3d-stage" data-preset="hero">
        <img src="renders/voice_of_the_mummy_hero.png" alt="3D Hero Render" class="fallback3d-bg-img" />
      </div>
    `;
    if (this.callbacks.onModelLoaded) {
      this.callbacks.onModelLoaded();
    }
  }

  _initScene(THREE, OrbitControls) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080503);
    this.scene.fog = new THREE.FogExp2(0x0a0603, 0.021);

    const rect = this.container.getBoundingClientRect();
    const w = Math.max(280, rect.width || this.container.clientWidth || 720);
    const h = Math.max(240, rect.height || this.container.clientHeight || 560);

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 80);
    // Start in the Top-Down view inside the Tomb Room when the game loads
    this.camera.position.set(0.0, 10.2, 0.01);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.touchAction = 'none';

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Create warm golden tomb environment map so metallic bronze on the board reflects warm light
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x523c22);
      const envTop = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xd9b372, side: THREE.BackSide })
      );
      envScene.add(envTop);
      this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      // Ignore if PMREM fails
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.0, 1.0, 0.0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 1.25;
    this.controls.maxDistance = 13.2;
    this.controls.addEventListener('start', () => {
      this.isUserInteracting = true;
      this.cameraTransition = null;
      this.cinematicIntro = null;
      if (this.cameraPreset === 'follow') {
        this.userPausedFollowUntilNextMove = true;
      }
    });
    this.controls.addEventListener('end', () => {
      this.isUserInteracting = false;
    });
    this.controls.update();

    // 1. Low, moody subterranean global ambient so the outer Temple Room stays dark & mysterious
    //    except where the flickering Fire Torches cast dancing orange light!
    const ambient = new THREE.HemisphereLight(0x2e1b0c, 0x080503, 0.22);
    this.scene.add(ambient);

    // 2. Dedicated Board SpotLights (decay=0 inside the board cone so the Game Board stays 100% as bright,
    //    crisp, and readable as before, while falling off to 0 before reaching the outer Temple Walls & Columns!)
    const boardTarget = new THREE.Object3D();
    boardTarget.position.set(0.0, 0.35, 0.0);
    this.scene.add(boardTarget);

    // Board Ambient Fill Spot (replaces the bright global HemisphereLight specifically over the board)
    const boardAmbientSpot = new THREE.SpotLight(0xffeacc, 1.05, 16.5, 0.56, 0.65, 0.0);
    boardAmbientSpot.position.set(0.0, 10.5, 0.0);
    boardAmbientSpot.target = boardTarget;
    this.scene.add(boardAmbientSpot);

    // Main Board Key Light with crisp 2048x2048 shadows on the pyramid steps & pawns
    const keyLight = new THREE.SpotLight(0xffe8c8, 1.88, 18.5, 0.48, 0.58, 0.0);
    keyLight.position.set(-5.6, 7.6, 4.4);
    keyLight.target = boardTarget;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 2.0;
    keyLight.shadow.camera.far = 18.0;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Board Overhead Light
    const overheadLight = new THREE.SpotLight(0xfff0d6, 0.82, 16.5, 0.52, 0.6, 0.0);
    overheadLight.position.set(0.0, 8.8, 0.0);
    overheadLight.target = boardTarget;
    this.scene.add(overheadLight);

    // Board Fill Light
    const fillLight = new THREE.SpotLight(0xffdca8, 0.75, 17.5, 0.5, 0.6, 0.0);
    fillLight.position.set(-4.5, 5.4, -5.2);
    fillLight.target = boardTarget;
    this.scene.add(fillLight);

    // Board Rim Light
    const rimLight = new THREE.SpotLight(0xffc266, 0.95, 17.5, 0.5, 0.6, 0.0);
    rimLight.position.set(6.2, 5.4, -0.8);
    rimLight.target = boardTarget;
    this.scene.add(rimLight);

    this.mummyLight = new THREE.PointLight(0x38ff7a, 0.0, 4.2);
    this.mummyLight.position.set(0.0, 1.78, 0.25);
    this.scene.add(this.mummyLight);

    // Classic Black Background Studio Tabletop (shown when user selects "Black BG" mode)
    const tableGeo = new THREE.PlaneGeometry(36, 36);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0f0b08,
      roughness: 0.85,
      metalness: 0.04,
    });
    this.blackBgTableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.blackBgTableMesh.rotation.x = -Math.PI / 2;
    this.blackBgTableMesh.position.y = -0.003;
    this.blackBgTableMesh.receiveShadow = true;
    this.blackBgTableMesh.visible = false;
    this.scene.add(this.blackBgTableMesh);

    this.resize();
  }

  /**
   * Switches between the 3D King Tut Burial Chamber ('tomb') and a clean Classic Black Background ('black').
   */
  setBackgroundMode(mode) {
    this.bgMode = mode === 'black' ? 'black' : 'tomb';
    if (this.tombGroup) {
      this.tombGroup.visible = this.bgMode === 'tomb';
    }
    if (this.blackBgTableMesh) {
      this.blackBgTableMesh.visible = this.bgMode === 'black';
    }
    if (this.scene && this.THREE) {
      const bgHex = this.bgMode === 'black' ? 0x050403 : 0x080503;
      this.scene.background.setHex(bgHex);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(bgHex);
        this.scene.fog.density = this.bgMode === 'black' ? 0.008 : 0.021;
      }
    }
  }

  /**
   * Builds an authentic 3D King Tutankhamun / Valley of the Kings Burial Chamber around the game board:
   * - Carved limestone & basalt Sarcophagus Altar Table under the board
   * - Sunken Sandstone Flagstone Chamber Floor with drifted desert sand
   * - 4 Painted Egyptian Burial Chamber Mural Walls (Osiris, Anubis, Horus, Winged Sun Disks, Hieroglyphs)
   * - 8 Monumental Bundled-Papyrus Lotus Columns supporting carved stone ceiling architraves
   * - Midnight Lapis-Blue Astronomical Star Ceiling (KV62 / Seti I tomb style)
   * - Grand Carved Tomb Portal flanked by 2 Black-and-Gold Anubis Guardian Jackal Statues
   * - 10 Flickering Bronze Torch Braziers casting dancing firelight across the darkened temple walls & columns
   * - Canopic Jar Shrine, Treasure Chest, and Howard Carter 1922 Excavation Crate
   * - Drifting Golden Tomb Dust Motes in the torchlight
   */
  _buildTombChamberEnvironment(THREE) {
    const tombGroup = new THREE.Group();
    tombGroup.name = 'King_Tut_Burial_Chamber';
    this.tombGroup = tombGroup;
    this.scene.add(tombGroup);

    const wallMuralTex = this._createTombWallMuralTexture(THREE);
    const floorStoneTex = this._createTombFloorTexture(THREE);
    const starCeilingTex = this._createStarCeilingTexture(THREE);
    const hieroglyphBandTex = this._createAltarFriezeTexture(THREE);

    // Low envMapIntensity (0.06) + deeper subterranean stone base colors so the background temple stays
    // mysteriously dark in the shadows and visibly lights up whenever the Fire Torches flicker!
    const sandstoneWallMat = new THREE.MeshStandardMaterial({
      map: wallMuralTex,
      color: 0x8c6d46,
      roughness: 0.76,
      metalness: 0.05,
      envMapIntensity: 0.06,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorStoneTex,
      color: 0x785a38,
      roughness: 0.82,
      metalness: 0.04,
      envMapIntensity: 0.06,
    });

    const limestoneMat = new THREE.MeshStandardMaterial({
      color: 0x947850,
      roughness: 0.7,
      metalness: 0.06,
      envMapIntensity: 0.07,
    });

    const darkBasaltMat = new THREE.MeshStandardMaterial({
      color: 0x1c1510,
      roughness: 0.52,
      metalness: 0.14,
      envMapIntensity: 0.08,
    });

    const goldLeafMat = new THREE.MeshStandardMaterial({
      color: 0xffc845,
      emissive: 0x1a0e01,
      roughness: 0.28,
      metalness: 0.82,
      envMapIntensity: 0.22,
    });

    const lapisMat = new THREE.MeshStandardMaterial({
      color: 0x122d57,
      roughness: 0.45,
      metalness: 0.15,
      envMapIntensity: 0.07,
    });

    const turquoiseMat = new THREE.MeshStandardMaterial({
      color: 0x1b786e,
      roughness: 0.42,
      metalness: 0.1,
      envMapIntensity: 0.07,
    });

    const carnelianMat = new THREE.MeshStandardMaterial({
      color: 0x872115,
      roughness: 0.48,
      metalness: 0.08,
      envMapIntensity: 0.07,
    });

    const altarFriezeMat = new THREE.MeshStandardMaterial({
      map: hieroglyphBandTex,
      color: 0x8f7148,
      roughness: 0.62,
      metalness: 0.12,
      envMapIntensity: 0.07,
    });

    // =========================================================================
    // 1. CENTRAL SACRED ALTAR TABLE (supports the Pyramid Board & 4 Corner Temples)
    // =========================================================================
    const floorY = -1.25;

    // Top basalt/limestone slab right under y=0
    const altarTopGeo = new THREE.BoxGeometry(7.9, 0.14, 9.2);
    const altarTop = new THREE.Mesh(altarTopGeo, darkBasaltMat);
    altarTop.position.set(0, -0.07, 0);
    altarTop.receiveShadow = true;
    altarTop.castShadow = true;
    tombGroup.add(altarTop);

    // Gold trim frame around the altar table edge
    const altarGoldRim = new THREE.Mesh(new THREE.BoxGeometry(8.04, 0.06, 9.34), goldLeafMat);
    altarGoldRim.position.set(0, -0.04, 0);
    tombGroup.add(altarGoldRim);

    // Carved Hieroglyphic Frieze Collar under the tabletop
    const altarCollar = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.28, 8.8), altarFriezeMat);
    altarCollar.position.set(0, -0.28, 0);
    altarCollar.receiveShadow = true;
    tombGroup.add(altarCollar);

    // Main Altar Stone Pedestal Body
    const altarBody = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.72, 8.1), limestoneMat);
    altarBody.position.set(0, -0.78, 0);
    altarBody.receiveShadow = true;
    altarBody.castShadow = true;
    tombGroup.add(altarBody);

    // Stepped Altar Base Plinths resting on the Chamber Floor (y = -1.25)
    const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.18, 9.7), limestoneMat);
    plinth1.position.set(0, floorY + 0.09, 0);
    plinth1.receiveShadow = true;
    tombGroup.add(plinth1);

    // 4 Carved Corner Buttresses on the Altar
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.65), altarFriezeMat);
        buttress.position.set(sx * 3.45, -0.62, sz * 4.1);
        tombGroup.add(buttress);
      }
    }

    // =========================================================================
    // 2. SUNKEN SANDSTONE FLAGSTONE CHAMBER FLOOR & DESERT SAND DRIFTS
    // =========================================================================
    const roomW = 25.0;
    const roomD = 25.0;
    const wallH = 15.5;
    const columnH = 10.2;
    const ceilingY = floorY + wallH; // +14.25 (well above the Top-Down camera at y=9.8!)

    const chamberFloor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
    chamberFloor.rotation.x = -Math.PI / 2;
    chamberFloor.position.y = floorY;
    chamberFloor.receiveShadow = true;
    tombGroup.add(chamberFloor);

    // Drifted desert sand mounds in the chamber corners
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0x7d6139,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.05,
    });
    const sandCorners = [
      [-10.5, -10.5, 4.2],
      [10.5, -10.5, 4.6],
      [-10.5, 10.5, 4.0],
      [10.5, 10.5, 4.5],
      [11.2, 0.0, 3.2],
    ];
    for (const [cx, cz, rad] of sandCorners) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(rad, 18, 10), sandMat);
      mound.scale.set(1.0, 0.16, 1.0);
      mound.position.set(cx, floorY - 0.1, cz);
      mound.receiveShadow = true;
      tombGroup.add(mound);
    }

    // =========================================================================
    // 3. FOUR PAINTED KING TUT BURIAL CHAMBER WALLS & CORNICE LEDGES
    // =========================================================================
    const halfW = roomW * 0.5;
    const halfD = roomD * 0.5;
    const wallCenterY = floorY + wallH * 0.5;

    const wallSpecs = [
      { pos: [0, wallCenterY, -halfD], rotY: 0, len: roomW },          // North Wall (-Z)
      { pos: [0, wallCenterY, halfD], rotY: Math.PI, len: roomW },     // South Wall (+Z)
      { pos: [halfD, wallCenterY, 0], rotY: -Math.PI / 2, len: roomD }, // East Wall (+X, directly behind pyramid in Hero view!)
      { pos: [-halfD, wallCenterY, 0], rotY: Math.PI / 2, len: roomD }, // West Wall (-X)
    ];

    for (const ws of wallSpecs) {
      const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(ws.len, wallH), sandstoneWallMat);
      wallMesh.position.set(...ws.pos);
      wallMesh.rotation.y = ws.rotY;
      wallMesh.receiveShadow = true;
      tombGroup.add(wallMesh);

      // Stone baseboard dado ledge along bottom of each wall
      const dadoLedge = new THREE.Mesh(new THREE.BoxGeometry(ws.len, 0.45, 0.4), limestoneMat);
      dadoLedge.position.set(ws.pos[0], floorY + 0.225, ws.pos[2]);
      dadoLedge.rotation.y = ws.rotY;
      tombGroup.add(dadoLedge);

      // Upper Cavetto Cornice beam along top of each wall
      const topCornice = new THREE.Mesh(new THREE.BoxGeometry(ws.len, 0.55, 0.65), altarFriezeMat);
      topCornice.position.set(ws.pos[0], floorY + columnH + 0.25, ws.pos[2]);
      topCornice.rotation.y = ws.rotY;
      tombGroup.add(topCornice);
    }

    // =========================================================================
    // 4. ASTRONOMICAL LAPIS-BLUE STAR CEILING & OUTER ARCHITRAVES
    //    (Grouped in tombCeilingGroup so Top-Down view never collides with ceiling!)
    // =========================================================================
    this.tombCeilingGroup = new THREE.Group();
    tombGroup.add(this.tombCeilingGroup);

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: starCeilingTex,
      color: 0x7a7060,
      roughness: 0.7,
      metalness: 0.1,
      envMapIntensity: 0.05,
    });
    const ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = ceilingY;
    this.tombCeilingGroup.add(ceilingMesh);

    // Outer stone roof beams (at z = -8.8 and +8.8 only — NEVER over the center of the board!)
    for (const zBeam of [-8.8, 8.8]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.65, 0.85), limestoneMat);
      beam.position.set(0, floorY + columnH + 0.25, zBeam);
      this.tombCeilingGroup.add(beam);
    }

    // =========================================================================
    // 5. EIGHT MONUMENTAL BUNDLED-PAPYRUS / LOTUS STONE COLUMNS
    // =========================================================================
    const columnPositions = [
      [8.6, -5.8],
      [8.6, 5.8],
      [-8.6, -5.8],
      [-8.6, 5.8],
      [4.8, -8.8],
      [-4.8, -8.8],
      [4.8, 8.8],
      [-4.8, 8.8],
    ];

    for (const [cx, cz] of columnPositions) {
      const colGroup = this._createEgyptianLotusColumn(
        THREE,
        limestoneMat,
        goldLeafMat,
        lapisMat,
        turquoiseMat,
        carnelianMat,
        altarFriezeMat,
        columnH
      );
      colGroup.position.set(cx, floorY, cz);
      tombGroup.add(colGroup);
    }

    // =========================================================================
    // 6. GRAND PHARAOH TOMB PORTAL & GUARDIAN ANUBIS SHRINES (East Wall, +X)
    //    (Directly visible behind the Stepped Pyramid in the default 3/4 Hero View!)
    // =========================================================================
    const portalGroup = new THREE.Group();
    portalGroup.position.set(halfW - 0.25, floorY, 0);
    portalGroup.rotation.y = -Math.PI / 2;
    tombGroup.add(portalGroup);

    // Deep dark corridor recess behind doorway
    const recessMat = new THREE.MeshBasicMaterial({ color: 0x060403 });
    const doorwayRecess = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 5.8), recessMat);
    doorwayRecess.position.set(0, 2.9, 0.05);
    portalGroup.add(doorwayRecess);

    // Left & Right battered stone door jambs
    for (const sx of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 6.2, 0.75), altarFriezeMat);
      jamb.position.set(sx * 2.25, 3.1, 0.2);
      portalGroup.add(jamb);

      const goldStrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.1, 0.82), goldLeafMat);
      goldStrip.position.set(sx * 1.82, 3.05, 0.2);
      portalGroup.add(goldStrip);
    }

    // Heavy Cavetto Lintel above doorway with Winged Solar Disk
    const lintelMain = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.15, 0.95), limestoneMat);
    lintelMain.position.set(0, 6.55, 0.28);
    portalGroup.add(lintelMain);

    const lintelGoldBand = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 1.05), goldLeafMat);
    lintelGoldBand.position.set(0, 7.18, 0.32);
    portalGroup.add(lintelGoldBand);

    // Winged Sun Disk emblem on the lintel
    const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), carnelianMat);
    sunDisk.scale.set(1.0, 1.0, 0.35);
    sunDisk.position.set(0, 6.55, 0.78);
    portalGroup.add(sunDisk);

    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.38, 0.12), goldLeafMat);
      wing.position.set(sx * 1.05, 6.58, 0.75);
      wing.rotation.z = sx * 0.08;
      portalGroup.add(wing);

      const wingTurq = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 0.14), turquoiseMat);
      wingTurq.position.set(sx * 1.08, 6.46, 0.76);
      wingTurq.rotation.z = sx * 0.08;
      portalGroup.add(wingTurq);
    }

    // Two Guardian Anubis Jackal Statues on Gilded Shrines flanking the Tomb Portal
    for (const sz of [-3.4, 3.4]) {
      const anubisShrine = this._createAnubisGuardianShrine(
        THREE,
        darkBasaltMat,
        goldLeafMat,
        limestoneMat,
        lapisMat
      );
      anubisShrine.position.set(halfW - 2.1, floorY, sz);
      anubisShrine.rotation.y = -Math.PI / 2;
      tombGroup.add(anubisShrine);
    }

    // =========================================================================
    // 7. FLICKERING BRONZE TORCH BRAZIERS (Inner Altar Ring + Outer Temple Wall Ring)
    // =========================================================================
    const brazierCoords = [
      // 4 Inner Braziers around the Altar Table corners (warm local glow on altar & inner flagstones)
      { x: 4.65, z: -5.05, hasLight: true, intensity: 3.0, distance: 10.5, decay: 1.55 },
      { x: 4.65, z: 5.05, hasLight: true, intensity: 3.0, distance: 10.5, decay: 1.55 },
      { x: -4.65, z: -5.05, hasLight: true, intensity: 2.8, distance: 10.5, decay: 1.55 },
      { x: -4.65, z: 5.05, hasLight: true, intensity: 2.8, distance: 10.5, decay: 1.55 },
      // 2 Portal Braziers flanking the East Tomb Entrance & Anubis Statues
      { x: 9.7, z: -2.45, hasLight: true, intensity: 6.4, distance: 16.5, decay: 1.2 },
      { x: 9.7, z: 2.45, hasLight: true, intensity: 6.4, distance: 16.5, decay: 1.2 },
      // 2 North & South Column/Mural Wall Braziers
      { x: 0.0, z: -9.8, hasLight: true, intensity: 5.8, distance: 16.0, decay: 1.2 },
      { x: 0.0, z: 9.8, hasLight: true, intensity: 5.8, distance: 16.0, decay: 1.2 },
      // 2 West Temple Wall & Column Braziers
      { x: -9.7, z: -3.1, hasLight: true, intensity: 5.6, distance: 16.0, decay: 1.2 },
      { x: -9.7, z: 3.1, hasLight: true, intensity: 5.6, distance: 16.0, decay: 1.2 },
    ];

    brazierCoords.forEach((bCfg, idx) => {
      const brazier = this._createTorchBrazier(
        THREE,
        darkBasaltMat,
        goldLeafMat,
        bCfg.hasLight,
        bCfg.intensity,
        idx,
        bCfg.distance,
        bCfg.decay
      );
      brazier.position.set(bCfg.x, floorY, bCfg.z);
      tombGroup.add(brazier);
    });

    // =========================================================================
    // 8. KING TUT BURIAL TREASURES & 1922 EXCAVATION ANTIQUITIES
    // =========================================================================
    // A. Gilded Canopic Chest & 4 Alabaster Canopic Jars (North-East Chamber)
    const canopicGroup = this._createCanopicShrineProp(THREE, limestoneMat, goldLeafMat, lapisMat, turquoiseMat);
    canopicGroup.position.set(6.8, floorY, -6.6);
    canopicGroup.rotation.y = -0.55;
    tombGroup.add(canopicGroup);

    // B. Royal Treasure Chest, Gold Ingots & Terracotta Wine Amphorae (South-East Chamber)
    const treasureGroup = this._createTreasureAndAmphoraeProp(
      THREE,
      carnelianMat,
      goldLeafMat,
      darkBasaltMat,
      limestoneMat
    );
    treasureGroup.position.set(6.8, floorY, 6.4);
    treasureGroup.rotation.y = -2.4;
    tombGroup.add(treasureGroup);

    // C. 1922 Howard Carter Expedition Crate, Rope & Glowing Brass Lantern (West Side)
    const digGroup = this._createArchaeologistDigProp(THREE, limestoneMat, goldLeafMat, darkBasaltMat);
    digGroup.position.set(-6.8, floorY, -6.2);
    digGroup.rotation.y = 0.65;
    tombGroup.add(digGroup);

    // =========================================================================
    // 9. FLOATING GOLDEN TOMB DUST MOTES IN TORCHLIGHT
    // =========================================================================
    this._createTombDustParticles(THREE, tombGroup);
  }

  _createEgyptianLotusColumn(THREE, stoneMat, goldMat, lapisMat, turqMat, redMat, friezeMat, totalH) {
    const g = new THREE.Group();

    // Cushion base
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 0.42, 20), stoneMat);
    basePlinth.position.y = 0.21;
    basePlinth.receiveShadow = true;
    g.add(basePlinth);

    // Main shaft with slight entasis taper
    const shaftH = totalH - 1.75;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.76, shaftH, 20), friezeMat);
    shaft.position.y = 0.42 + shaftH * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    // Decorative painted collar bands along shaft
    const bandHeights = [1.4, shaftH * 0.5, shaftH - 0.35];
    const bandMats = [redMat, lapisMat, goldMat];
    bandHeights.forEach((bh, i) => {
      const r = 0.76 - (bh / shaftH) * 0.13;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.18, 20), bandMats[i % bandMats.length]);
      ring.position.y = 0.42 + bh;
      g.add(ring);
    });

    // Flared Bell / Lotus Capital at top of shaft
    const capY = 0.42 + shaftH;
    const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.63, 0.24, 20), goldMat);
    neckRing.position.y = capY + 0.12;
    g.add(neckRing);

    const lotusBell = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 0.64, 0.82, 20), turqMat);
    lotusBell.position.y = capY + 0.62;
    g.add(lotusBell);

    const lotusRim = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.08, 0.16, 20), goldMat);
    lotusRim.position.y = capY + 1.06;
    g.add(lotusRim);

    // Square Abacus block supporting ceiling architrave
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.34, 1.55), stoneMat);
    abacus.position.y = capY + 1.28;
    g.add(abacus);

    return g;
  }

  _createAnubisGuardianShrine(THREE, basaltMat, goldMat, stoneMat, lapisMat) {
    const g = new THREE.Group();

    // Stone & Gold Shrine Box (like King Tut's Anubis Pylon Shrine)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 2.2), stoneMat);
    plinth.position.y = 0.15;
    g.add(plinth);

    const shrineBody = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.15, 1.85), goldMat);
    shrineBody.position.y = 0.85;
    shrineBody.castShadow = true;
    shrineBody.receiveShadow = true;
    g.add(shrineBody);

    const shrineLid = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.16, 1.98), lapisMat);
    shrineLid.position.y = 1.48;
    g.add(shrineLid);

    // Recumbent Anubis Jackal Figure atop the gilded shrine
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 1.15), basaltMat);
    body.position.set(0, 1.76, -0.05);
    g.add(body);

    // Outstretched front paws
    for (const sx of [-0.16, 0.16]) {
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.65), basaltMat);
      paw.position.set(sx, 1.62, 0.62);
      g.add(paw);
    }

    // Neck & Gold Collar
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.48, 12), basaltMat);
    neck.position.set(0, 2.12, 0.36);
    neck.rotation.x = 0.22;
    g.add(neck);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 12), goldMat);
    collar.position.set(0, 1.98, 0.34);
    collar.rotation.x = 0.22;
    g.add(collar);

    // Jackal Head & Snout
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.56), basaltMat);
    head.position.set(0, 2.38, 0.52);
    g.add(head);

    // Tall Alert Jackal Ears with Gold Inner Trim
    for (const sx of [-0.11, 0.11]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 6), basaltMat);
      ear.position.set(sx, 2.7, 0.38);
      g.add(ear);

      const earGold = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 6), goldMat);
      earGold.position.set(sx, 2.69, 0.41);
      g.add(earGold);
    }

    return g;
  }

  _getTorchGlowTexture(THREE) {
    if (this._torchGlowTex) return this._torchGlowTex;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 245, 180, 1.0)');
    grad.addColorStop(0.28, 'rgba(255, 145, 30, 0.72)');
    grad.addColorStop(0.62, 'rgba(255, 70, 5, 0.25)');
    grad.addColorStop(1.0, 'rgba(255, 40, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this._torchGlowTex = new THREE.CanvasTexture(canvas);
    this._torchGlowTex.colorSpace = THREE.SRGBColorSpace;
    return this._torchGlowTex;
  }

  _createTorchBrazier(
    THREE,
    darkMetalMat,
    goldMat,
    hasLight,
    lightIntensity,
    seedIdx,
    lightDistance = 15.0,
    lightDecay = 1.3
  ) {
    const g = new THREE.Group();

    // Base ring
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.14, 14), darkMetalMat);
    base.position.y = 0.07;
    g.add(base);

    // Tall bronze tripod stand
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1.65, 10), darkMetalMat);
    stand.position.y = 0.92;
    stand.castShadow = true;
    g.add(stand);

    const goldRing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), goldMat);
    goldRing.position.y = 1.25;
    g.add(goldRing);

    // Hammered copper/gold fire bowl
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.18, 0.32, 16), goldMat);
    bowl.position.y = 1.82;
    g.add(bowl);

    // Glowing coal bed
    const coalMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const coals = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), coalMat);
    coals.scale.set(1.0, 0.35, 1.0);
    coals.position.y = 1.95;
    g.add(coals);

    // 3 Layered Dancing Flame Cones + Soft Additive Fire Halo Sprite (animated in _animate)
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff4d06,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.33, 1.02, 12), outerFlameMat);
    outerFlame.position.y = 2.42;
    g.add(outerFlame);

    const midFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff9e1b,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const midFlame = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.78, 10), midFlameMat);
    midFlame.position.y = 2.34;
    g.add(midFlame);

    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xfff6b0,
      transparent: true,
      opacity: 0.98,
    });
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.48, 8), innerFlameMat);
    innerFlame.position.y = 2.22;
    g.add(innerFlame);

    // Additive Fire Glow Halo around the torch flame
    const glowSpriteMat = new THREE.SpriteMaterial({
      map: this._getTorchGlowTexture(THREE),
      color: 0xff8c24,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowSpriteMat);
    glowSprite.position.set(0, 2.38, 0);
    glowSprite.scale.set(1.95, 2.15, 1.0);
    g.add(glowSprite);

    this.torchFlames.push({
      outer: outerFlame,
      mid: midFlame,
      inner: innerFlame,
      coals,
      glow: glowSprite,
      baseY: 2.42,
      seed: seedIdx * 1.93 + 0.5,
    });

    if (hasLight) {
      const pLight = new THREE.PointLight(0xff7e1c, lightIntensity, lightDistance, lightDecay);
      pLight.position.set(0, 2.58, 0);
      g.add(pLight);
      this.torchLights.push({
        light: pLight,
        baseIntensity: lightIntensity,
        baseY: 2.58,
        seed: seedIdx * 1.93 + 0.5,
      });
    }

    return g;
  }

  _createCanopicShrineProp(THREE, stoneMat, goldMat, lapisMat, turqMat) {
    const g = new THREE.Group();

    // Stone table plinth
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.72, 1.3), stoneMat);
    table.position.y = 0.36;
    table.receiveShadow = true;
    table.castShadow = true;
    g.add(table);

    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.4), goldMat);
    goldTrim.position.y = 0.74;
    g.add(goldTrim);

    // Alabaster material for the 4 Sons of Horus Canopic Jars
    const alabasterMat = new THREE.MeshStandardMaterial({
      color: 0xf7ebd2,
      roughness: 0.35,
      metalness: 0.02,
    });

    const jarOffsets = [
      [-0.45, -0.28],
      [0.45, -0.28],
      [-0.45, 0.28],
      [0.45, 0.28],
    ];
    const headMats = [goldMat, lapisMat, turqMat, goldMat];

    jarOffsets.forEach(([jx, jz], idx) => {
      const jarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.52, 14), alabasterMat);
      jarBody.position.set(jx, 1.05, jz);
      g.add(jarBody);

      const jarStopper = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), headMats[idx]);
      jarStopper.position.set(jx, 1.38, jz);
      g.add(jarStopper);
    });

    return g;
  }

  _createTreasureAndAmphoraeProp(THREE, redMat, goldMat, darkMat, stoneMat) {
    const g = new THREE.Group();

    // Royal Vaunted-Lid Treasure Chest (King Tut style)
    const chestBox = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.68, 0.92), redMat);
    chestBox.position.set(0, 0.34, 0);
    chestBox.castShadow = true;
    g.add(chestBox);

    const chestGoldFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.96), goldMat);
    chestGoldFrame.position.set(0, 0.68, 0);
    g.add(chestGoldFrame);

    const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.46, 12, 1, false, 0, Math.PI), goldMat);
    chestLid.rotation.z = Math.PI / 2;
    chestLid.scale.set(0.55, 1.0, 1.0);
    chestLid.position.set(0, 0.72, 0);
    g.add(chestLid);

    // 2 Tall Terracotta Amphora Wine Jars next to the chest
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: 0xb85d38,
      roughness: 0.75,
      metalness: 0.02,
    });
    for (const [ax, az, rotZ] of [
      [-1.1, 0.35, 0.05],
      [-0.85, -0.45, -0.18],
    ]) {
      const amphora = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.85, 14), terracottaMat);
      amphora.position.set(ax, 0.42, az);
      amphora.rotation.z = rotZ;
      g.add(amphora);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.26, 12), stoneMat);
      neck.position.set(ax, 0.92, az);
      g.add(neck);
    }

    return g;
  }

  _createArchaeologistDigProp(THREE, stoneMat, goldMat, darkMat) {
    const g = new THREE.Group();

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x7d5832,
      roughness: 0.85,
      metalness: 0.0,
    });

    // 1922 Expedition Wooden Crate
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 1.05), woodMat);
    crate.position.set(0, 0.425, 0);
    crate.castShadow = true;
    crate.receiveShadow = true;
    g.add(crate);

    // Smaller crate stacked beside it
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.75), woodMat);
    crate2.position.set(1.05, 0.275, 0.25);
    crate2.rotation.y = 0.35;
    g.add(crate2);

    // Glowing Archaeologist Brass Lantern atop the crate
    const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 12), goldMat);
    lanternBase.position.set(0.15, 0.89, 0.1);
    g.add(lanternBase);

    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe28a })
    );
    lanternGlass.position.set(0.15, 1.05, 0.1);
    g.add(lanternGlass);

    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.12, 12), goldMat);
    lanternCap.position.set(0.15, 1.24, 0.1);
    g.add(lanternCap);

    return g;
  }

  _createTombDustParticles(THREE, parentGroup) {
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18.0;
      positions[i * 3 + 1] = -0.8 + Math.random() * 7.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18.0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffe299,
      size: 0.065,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(geo, mat);
    parentGroup.add(this.dustParticles);
  }

  /**
   * Procedurally paints a rich Egyptian Burial Chamber Mural Texture (King Tut KV62 style)
   * with Kheker frieze, Winged Scarabs, Hieroglyphic columns, Royal Cartouches, and Painted Figures.
   */
  _createTombWallMuralTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Warm plastered limestone & golden ochre base
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#b5894c');
    bgGrad.addColorStop(0.18, '#cfa15e');
    bgGrad.addColorStop(0.76, '#c29250');
    bgGrad.addColorStop(1, '#6e4e27');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle limestone block masonry lines
    ctx.strokeStyle = 'rgba(70, 45, 18, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 64; y < 420; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
      const offset = ((y / 56) % 2) * 64;
      for (let x = offset; x < 1024; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 56);
        ctx.stroke();
      }
    }

    // 2. Top Egyptian Kheker & Lotus Frieze Band (y: 0..68)
    ctx.fillStyle = '#1b3b6b';
    ctx.fillRect(0, 0, 1024, 58);
    const stripeColors = ['#d43b27', '#f2c14e', '#24998c', '#1b3b6b'];
    for (let x = 0; x < 1024; x += 16) {
      ctx.fillStyle = stripeColors[(x / 16) % 4];
      ctx.fillRect(x, 8, 12, 42);
    }
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(0, 54, 1024, 8);
    ctx.fillStyle = '#24180c';
    ctx.fillRect(0, 62, 1024, 4);

    // 3. Bottom Palace-Facade Dado Band (y: 410..512)
    ctx.fillStyle = '#24180c';
    ctx.fillRect(0, 408, 1024, 6);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(0, 414, 1024, 10);
    ctx.fillStyle = '#8c281b';
    ctx.fillRect(0, 424, 1024, 88);

    for (let x = 0; x < 1024; x += 64) {
      ctx.fillStyle = '#1b3b6b';
      ctx.fillRect(x + 8, 432, 48, 72);
      ctx.fillStyle = '#24998c';
      ctx.fillRect(x + 16, 440, 32, 56);
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(x + 26, 448, 12, 42);
    }

    // 4. Vertical Hieroglyphic Columns & Royal Cartouches across the main mural register (y: 70..404)
    const glyphs = ['☥', '𓂀', '🪲', '☀️', '🐍', '🦅', '🏺', '🌾', '👑', '⚖️'];
    for (let colX = 0; colX < 1024; colX += 128) {
      // Hieroglyph column divider strip
      ctx.fillStyle = 'rgba(245, 222, 173, 0.55)';
      ctx.fillRect(colX + 4, 70, 36, 334);
      ctx.strokeStyle = '#3b2610';
      ctx.lineWidth = 2;
      ctx.strokeRect(colX + 4, 70, 36, 334);

      // Draw hieroglyph symbols down the column
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2b1b0c';
      for (let gy = 96; gy < 395; gy += 32) {
        const gChar = glyphs[((colX / 128) * 3 + (gy / 32)) % glyphs.length];
        ctx.fillText(gChar, colX + 22, gy);
      }

      // Mural Niche Panel between hieroglyph columns (colX + 46 .. colX + 122)
      const px = colX + 84;

      // Royal Golden Cartouche at top of panel
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.roundRect(px - 24, 82, 48, 76, 22);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#8c281b';
      ctx.stroke();

      ctx.fillStyle = '#1b3b6b';
      ctx.font = 'bold 18px serif';
      ctx.fillText('☀️', px, 108);
      ctx.fillText('🪲', px, 130);
      ctx.fillText('☥', px, 150);

      // Painted Egyptian Deity Silhouette in each mural bay (alternating Osiris, Anubis, Horus, Hathor)
      const deityIdx = (colX / 128) % 4;
      // Head / Crown
      ctx.fillStyle = deityIdx === 1 ? '#1c1815' : deityIdx === 0 ? '#24998c' : '#b8532a';
      ctx.beginPath();
      ctx.arc(px, 212, 16, 0, Math.PI * 2);
      ctx.fill();

      // Nemes headdress / Solar disk crown
      ctx.fillStyle = deityIdx % 2 === 0 ? '#f2c14e' : '#d43b27';
      ctx.beginPath();
      ctx.arc(px, 190, 12, 0, Math.PI * 2);
      ctx.fill();

      // Broad Gold Usekh Collar & Robe
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(px, 240, 24, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = deityIdx === 0 ? '#f0e6d2' : deityIdx === 2 ? '#1b3b6b' : '#d43b27';
      ctx.fillRect(px - 18, 240, 36, 118);

      // Gold belt & apron
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(px - 18, 285, 36, 12);
      ctx.fillStyle = '#24998c';
      ctx.fillRect(px - 8, 297, 16, 61);

      // Was-Scepter / Ankh staff
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 24, 195);
      ctx.lineTo(px + 24, 385);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1);
    return tex;
  }

  _createTombFloorTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#6e5233';
    ctx.fillRect(0, 0, 512, 512);

    const tileColors = ['#785a38', '#6b4e2f', '#82633f', '#63482b', '#735534'];
    let idx = 0;
    for (let y = 0; y < 512; y += 64) {
      const shift = ((y / 64) % 2) * 32;
      for (let x = -shift; x < 512; x += 64) {
        ctx.fillStyle = tileColors[idx++ % tileColors.length];
        ctx.fillRect(x + 2, y + 2, 60, 60);
        ctx.strokeStyle = '#3d2b18';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, 60, 60);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  _createStarCeilingTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep midnight lapis-lazuli ceiling (Tomb of Seti I / KV62 style)
    ctx.fillStyle = '#0d1f3d';
    ctx.fillRect(0, 0, 512, 512);

    // Golden 5-pointed Egyptian astronomical stars
    ctx.fillStyle = '#ffd25a';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 32; y < 512; y += 64) {
      for (let x = 32; x < 512; x += 64) {
        const jx = x + ((y * 7) % 18) - 9;
        const jy = y + ((x * 11) % 18) - 9;
        ctx.fillText('✶', jx, jy);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    return tex;
  }

  _createAltarFriezeTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#c49b5a';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#1b3b6b';
    ctx.fillRect(0, 8, 512, 18);
    ctx.fillStyle = '#8c281b';
    ctx.fillRect(0, 102, 512, 18);

    ctx.fillStyle = '#f2c14e';
    for (let x = 0; x < 512; x += 32) {
      ctx.fillRect(x, 10, 16, 14);
      ctx.fillRect(x + 8, 104, 16, 14);
    }

    ctx.fillStyle = '#2e1d0c';
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    const symbols = ['☥', '🪲', '𓂀', '☀️', '👑', '🐍', '🦅', '🏺'];
    for (let x = 32; x < 512; x += 64) {
      ctx.fillText(symbols[(x / 64) % symbols.length], x, 72);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
  }

  /**
   * Builds a true 6-sided 3D Ivory Die with all 6 faces (1..6) so every random roll (1..6)
   * physically lands with the exact rolled pip count on top (+Y)!
   */
  _buildTrueSixSidedDie(THREE) {
    // BoxGeometry material order:
    // 0: +X (Face 3), 1: -X (Face 4), 2: +Y (Face 1), 3: -Y (Face 6), 4: +Z (Face 2), 5: -Z (Face 5)
    const faceValues = [3, 4, 1, 6, 2, 5];
    const materials = faceValues.map((val) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Warm vintage ivory plastic background with soft border bevel
      ctx.fillStyle = '#f5eedc';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#d8ccb0';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 242, 242);

      // Pip positions in normalized [0..1] coordinates
      const pipCoords = {
        1: [[0.5, 0.5]],
        2: [[0.28, 0.28], [0.72, 0.72]],
        3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
        4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
        5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
        6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
      };

      ctx.fillStyle = '#14100c';
      for (const [ux, uy] of pipCoords[val]) {
        ctx.beginPath();
        ctx.arc(ux * 256, uy * 256, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.22,
        metalness: 0.0,
      });
    });

    const dieSize = 0.34;
    const geo = new THREE.BoxGeometry(dieSize, dieSize, dieSize);
    this.dieMesh = new THREE.Mesh(geo, materials);
    this.dieHomePos = new THREE.Vector3(-2.95, dieSize * 0.5, 1.25);
    this.dieMesh.position.copy(this.dieHomePos);
    this.dieMesh.castShadow = true;
    this.dieMesh.receiveShadow = true;
    this.dieMesh.userData.interactiveRole = 'game_die';
    this.scene.add(this.dieMesh);
    this.interactiveTargets.push(this.dieMesh);

    // Exact Euler ('XYZ') rotations that place each face value (1..6) strictly on top (+Y)
    this.dieTargetRotations = {
      1: new THREE.Euler(0, 0, 0, 'XYZ'),                 // +Y face on top
      6: new THREE.Euler(Math.PI, 0, 0, 'XYZ'),           // -Y face on top
      2: new THREE.Euler(-Math.PI / 2, 0, 0, 'XYZ'),      // +Z face on top
      5: new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ'),       // -Z face on top
      3: new THREE.Euler(0, 0, Math.PI / 2, 'XYZ'),       // +X face on top
      4: new THREE.Euler(0, 0, -Math.PI / 2, 'XYZ'),      // -X face on top
    };
  }

  _buildSpaceHighlightPads(THREE) {
    this.padsGroup = new THREE.Group();
    this.padsGroup.name = 'Interactive_Space_Pads';
    this.scene.add(this.padsGroup);

    for (const sp of BOARD_SPACES) {
      const [x0, y0, x1, y1] = sp.rect;
      const w = Math.max(0.24, (x1 - x0) * 0.01 * 0.9);
      const d = Math.max(0.24, (y1 - y0) * 0.01 * 0.9);
      const geo = new THREE.BoxGeometry(w, 0.018, d);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const pad = new THREE.Mesh(geo, mat);
      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5;
      const pos = pxToThree(cx, cy, sp.z + 0.012);
      pad.position.set(pos.x, pos.y, pos.z);
      pad.userData = {
        type: 'board_space',
        spaceId: sp.id,
        space: sp,
        highlightMode: null,
      };
      this.spacePads[sp.id] = pad;
      this.padsGroup.add(pad);
      this.interactiveTargets.push(pad);
    }
  }

  /**
   * Builds a multi-faceted Brilliant / Emerald-Cut Precious Gemstone Geometry with non-indexed
   * triangles and exact per-facet flat normals so every cut facet catches crisp gemstone highlights
   * and dark pavilion shadows naturally (with NO artificial circle base!).
   */
  _createFacetedGemGeometry(THREE, rx = 0.095, rz = 0.072, h = 0.072, segs = 8, pointedBottom = false) {
    const R0 = [];
    const R1 = [];
    const R2 = [];
    const R3 = [];

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const aHalf = ((i + 0.5) / segs) * Math.PI * 2;
      // Ring 0: Lower Pavilion Base resting on the board (tapers inward so lower facets catch dark shadow)
      R0.push([Math.cos(a) * rx * 0.72, 0.0, Math.sin(a) * rz * 0.72]);
      // Ring 1: Outer Girdle Edge (widest part of the cut stone)
      R1.push([Math.cos(a) * rx * 1.0, h * 0.34, Math.sin(a) * rz * 1.0]);
      // Ring 2: Crown Star Break (rotated by half a facet to form diamond kite & star facets)
      R2.push([Math.cos(aHalf) * rx * 0.8, h * 0.7, Math.sin(aHalf) * rz * 0.8]);
      // Ring 3: Top Table Octagon Edge
      R3.push([Math.cos(a) * rx * 0.44, h * 0.98, Math.sin(a) * rz * 0.44]);
    }
    const C = [0.0, h, 0.0];
    const B = [0.0, pointedBottom ? -h * 0.75 : 0.0, 0.0];

    const positions = [];
    const pushTri = (p0, p1, p2) => {
      positions.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
    };

    for (let i = 0; i < segs; i++) {
      const i1 = (i + 1) % segs;
      // Bottom Culet / Pavilion Cap (closes bottom completely so there is never a hollow ring)
      pushTri(B, R0[i], R0[i1]);
      // Lower Pavilion Facets (R0 -> R1)
      pushTri(R0[i], R1[i], R0[i1]);
      pushTri(R0[i1], R1[i], R1[i1]);
      // Lower Crown Bezel & Star Facets (R1 -> R2)
      pushTri(R1[i], R2[i], R1[i1]);
      pushTri(R1[i1], R2[i], R2[i1]);
      // Upper Crown Star & Kite Facets (R2 -> R3)
      pushTri(R2[i], R3[i], R3[i1]);
      pushTri(R2[i], R3[i1], R2[i1]);
      // Flat Top Table Facets (R3 -> C)
      pushTri(C, R3[i1], R3[i]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }

  _loadGLBModel(THREE, GLTFLoader) {
    const loader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();

    // Load crisp textures for Sandstone steps/risers and Sarcophagus bronze-gold relief
    const sandstoneTex = texLoader.load('textures/sandstone_tile.png');
    sandstoneTex.colorSpace = THREE.SRGBColorSpace;
    sandstoneTex.wrapS = THREE.RepeatWrapping;
    sandstoneTex.wrapT = THREE.RepeatWrapping;

    const sarcTex = texLoader.load('textures/sarcophagus_top.png');
    sarcTex.colorSpace = THREE.SRGBColorSpace;
    sarcTex.flipY = false;

    loader.load(
      'voice_of_the_mummy.glb',
      (gltf) => {
        const root = gltf.scene;
        this.scene.add(root);

        // Multi-faceted cut Emerald & Ruby materials with flatShading so every cut facet sparkles with high contrast
        this.emeraldMat = new THREE.MeshPhongMaterial({
          color: 0x00a838,
          emissive: 0x00330f,
          specular: 0xbaffd4,
          shininess: 110,
          flatShading: true,
        });

        this.rubyMat = new THREE.MeshPhongMaterial({
          color: 0xd4001c,
          emissive: 0x450008,
          specular: 0xffc4ce,
          shininess: 115,
          flatShading: true,
        });

        const facetedEmeraldGeo = this._createFacetedGemGeometry(THREE, 0.1, 0.074, 0.072, 8);
        const facetedGreatRubyGeo = this._createFacetedGemGeometry(THREE, 0.175, 0.175, 0.115, 12);

        const sandstoneMat = new THREE.MeshStandardMaterial({
          map: sandstoneTex,
          color: 0xf7dca6,
          emissive: 0x291d0c,
          roughness: 0.52,
          metalness: 0.0,
        });

        const sarcGoldMat = new THREE.MeshStandardMaterial({
          map: sarcTex,
          color: 0xffe48f,
          emissive: 0x332308,
          roughness: 0.34,
          metalness: 0.35,
        });

        const sarcSideMat = new THREE.MeshStandardMaterial({
          color: 0x9e762c,
          emissive: 0x241905,
          roughness: 0.36,
          metalness: 0.32,
        });

        root.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;

            // Convert any grayscale heightmap exported as normalMap into bumpMap so normals never invert to black!
            const fixMat = (m) => {
              if (!m) return m;
              if (m.name === 'Mat_Sandstone_Riser') return sandstoneMat;
              if (m.name === 'Mat_Sarcophagus_BronzeGold') return sarcGoldMat;
              if (m.name === 'Mat_Sarcophagus_SideWall') return sarcSideMat;
              if (m.normalMap) {
                m.bumpMap = m.normalMap;
                m.bumpScale = 0.012;
                m.normalMap = null;
                m.needsUpdate = true;
              }
              return m;
            };

            if (Array.isArray(obj.material)) {
              obj.material = obj.material.map(fixMat);
            } else {
              obj.material = fixMat(obj.material);
            }
          }

          if (obj.name.startsWith('Scarab_Jewel_')) {
            this.scarabMeshes[obj.name] = obj;
            if (obj.isMesh) obj.material = this.emeraldMat;
          }
        });

        // Remove the static single-face Blender die from the GLB (since we built the true 6-sided die above!)
        const oldBlenderDie = root.getObjectByName('Game_Die_Numbered');
        if (oldBlenderDie && oldBlenderDie.parent) {
          oldBlenderDie.parent.remove(oldBlenderDie);
        }

        const toDetach = [
          ...Object.values(this.scarabMeshes),
          root.getObjectByName('Great_Mummy_Jewel_Ruby'),
          root.getObjectByName('Ruby_Cobra_Figure'),
          root.getObjectByName('Explorer_Blue'),
          root.getObjectByName('Explorer_Red'),
          root.getObjectByName('Explorer_Yellow'),
          root.getObjectByName('Explorer_Green'),
        ].filter(Boolean);

        for (const obj of toDetach) {
          this.scene.attach(obj);
        }

        // Replace all 26 Scarab Jewels with multi-faceted Emerald-Cut Gemstones (no flat circle bases!)
        for (const [name, mesh] of Object.entries(this.scarabMeshes)) {
          if (mesh.isMesh) {
            mesh.geometry = facetedEmeraldGeo;
            mesh.material = this.emeraldMat;
          }
          mesh.position.y += 0.002;
          this.scarabHomeTransforms[name] = {
            pos: mesh.position.clone(),
            quat: mesh.quaternion.clone(),
          };
        }

        this.greatJewelMesh = this.scene.getObjectByName('Great_Mummy_Jewel_Ruby');
        if (this.greatJewelMesh) {
          this.greatJewelMesh.traverse((c) => {
            if (c.isMesh) {
              c.geometry = facetedGreatRubyGeo;
              c.material = this.rubyMat;
            }
          });
          this.greatJewelHome = {
            pos: this.greatJewelMesh.position.clone(),
            quat: this.greatJewelMesh.quaternion.clone(),
          };
        }

        this.cobraMesh = this.scene.getObjectByName('Ruby_Cobra_Figure');
        if (this.cobraMesh) {
          this.cobraMesh.traverse((c) => {
            if (c.isMesh) {
              c.material = this.rubyMat;
            }
          });
          this.cobraMesh.scale.multiplyScalar(1.22);
          this.cobraHome = {
            pos: this.cobraMesh.position.clone(),
            quat: this.cobraMesh.quaternion.clone(),
          };
        }

        for (const cfg of PLAYERS_CONFIG) {
          const expObj = this.scene.getObjectByName(cfg.explorerMeshName);
          if (expObj) {
            this.explorers[cfg.id] = expObj;

            // Add a vivid color-coded 3D pawn base ring so each Explorer's color (Blue, Red, Yellow, Green) is unmistakable from any angle
            const ringGeo = new THREE.RingGeometry(0.11, 0.175, 24);
            const ringMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(cfg.colorHex),
              side: THREE.DoubleSide,
            });
            const colorRing = new THREE.Mesh(ringGeo, ringMat);
            colorRing.rotation.x = -Math.PI / 2;
            colorRing.position.y = 0.015;
            expObj.add(colorRing);

            // Add a glowing active-turn outer halo ring (shown only when it is this Explorer's turn)
            const turnHaloGeo = new THREE.RingGeometry(0.185, 0.255, 28);
            const turnHaloMat = new THREE.MeshBasicMaterial({
              color: 0xffe64d,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.92,
            });
            const turnHalo = new THREE.Mesh(turnHaloGeo, turnHaloMat);
            turnHalo.rotation.x = -Math.PI / 2;
            turnHalo.position.y = 0.02;
            turnHalo.name = 'ActiveTurnHalo';
            turnHalo.visible = false;
            expObj.add(turnHalo);

            // Add a fiery crimson-red Cobra Curse Aura (shown in Part II when this Explorer holds the cursed Ruby Cobra!)
            const curseGroup = new THREE.Group();
            curseGroup.name = 'CobraCurseAura';
            curseGroup.visible = false;

            const curseRingGeo = new THREE.RingGeometry(0.24, 0.35, 28);
            const curseRingMat = new THREE.MeshBasicMaterial({
              color: 0xff1430,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
            });
            const curseRing = new THREE.Mesh(curseRingGeo, curseRingMat);
            curseRing.rotation.x = -Math.PI / 2;
            curseRing.position.y = 0.025;
            curseGroup.add(curseRing);

            const cursePillarGeo = new THREE.CylinderGeometry(0.19, 0.24, 0.56, 20, 1, true);
            const cursePillarMat = new THREE.MeshBasicMaterial({
              color: 0xff1a38,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.42,
              depthWrite: false,
            });
            const cursePillar = new THREE.Mesh(cursePillarGeo, cursePillarMat);
            cursePillar.position.y = 0.28;
            cursePillar.name = 'CobraCursePillar';
            curseGroup.add(cursePillar);

            const curseLight = new THREE.PointLight(0xff1a38, 2.4, 1.8);
            curseLight.position.set(0, 0.42, 0);
            curseGroup.add(curseLight);

            expObj.add(curseGroup);
          }
          const holderObj = root.getObjectByName(cfg.holderMeshName);
          if (holderObj) {
            this.holders[cfg.id] = holderObj;
          }
        }

        this.sarcophagusCase = root.getObjectByName('Sarcophagus_Case');
        this.leverTab = root.getObjectByName('Sarcophagus_Lever_Tab');
        this.plungerBtn = root.getObjectByName('Sarcophagus_Button_Plunger');

        if (this.leverTab) {
          this.leverHomePos = this.leverTab.position.clone();
          this.leverTab.userData.interactiveRole = 'sarcophagus_lever';
          this.interactiveTargets.push(this.leverTab);
        }
        if (this.plungerBtn) {
          this.plungerBtn.userData.interactiveRole = 'sarcophagus_lever';
          this.interactiveTargets.push(this.plungerBtn);
        }
        if (this.sarcophagusCase) {
          this.sarcophagusCase.userData.interactiveRole = 'sarcophagus_lever';
          this.interactiveTargets.push(this.sarcophagusCase);
        }

        const blTable = root.getObjectByName('Tabletop_Surface');
        if (blTable && blTable.parent) {
          blTable.parent.remove(blTable);
        }

        this.modelLoaded = true;
        this.resize();
        if (this.currentGameState) {
          this.syncWithState(this.currentGameState, true);
        }
        if (this.callbacks.onModelLoaded) {
          this.callbacks.onModelLoaded();
        }
      },
      undefined,
      (err) => {
        console.error('Error loading voice_of_the_mummy.glb:', err);
        this._initFallback3DView();
      }
    );
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.container);
    }

    const dom = this.renderer.domElement;
    let pointerDownPos = { x: 0, y: 0 };

    dom.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this._updateHover();
    });

    dom.addEventListener('pointerup', (e) => {
      // Allow up to 14px movement tolerance so finger taps on iPhone screens register reliably
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 14) return;

      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this._handleClick();
    });
  }

  resize() {
    if (this.fallbackMode || !this.container || !this.renderer || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || this.container.clientWidth;
    const h = rect.height || this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    const aspect = w / h;
    this.camera.aspect = aspect;

    // Guarantee at least a 48° horizontal FOV on narrow/portrait screens (like iPhone) so the full pyramid & 4 corner temples fit cleanly
    const baseFov = 38;
    const minTanHorizontal = 0.455; // tan(24.5°)
    const requiredTanVertical = minTanHorizontal / Math.max(0.42, aspect);
    const computedFov = (Math.atan(requiredTanVertical) * 360) / Math.PI;
    this.camera.fov = Math.max(baseFov, Math.min(68, computedFov));

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _updateHover() {
    if (this.fallbackMode || !this.currentGameState || !this.raycaster) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveTargets, true);

    let cursor = 'grab';
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      const role = hitObj.userData?.interactiveRole || hitObj.parent?.userData?.interactiveRole;
      if (hitObj.userData?.type === 'board_space' && hitObj.userData?.highlightMode) {
        cursor = 'pointer';
      } else if (role === 'sarcophagus_lever' && this.currentGameState.phase === 'PULL_LEVER') {
        cursor = 'pointer';
      } else if (role === 'game_die' && this.currentGameState.phase === 'ROLL_DIE') {
        cursor = 'pointer';
      }
    }
    this.renderer.domElement.style.cursor = cursor;
  }

  _handleClick() {
    if (this.fallbackMode || !this.currentGameState || !this.raycaster) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveTargets, true);

    for (const hit of hits) {
      const obj = hit.object;
      if (obj.userData?.type === 'board_space' && obj.userData?.highlightMode) {
        const mode = obj.userData.highlightMode;
        const spaceId = obj.userData.spaceId;
        if (this.callbacks.onSpaceClick) {
          this.callbacks.onSpaceClick(spaceId, mode);
        }
        return;
      }
      const role = obj.userData?.interactiveRole || obj.parent?.userData?.interactiveRole;
      if (role === 'sarcophagus_lever' && this.currentGameState.phase === 'PULL_LEVER') {
        if (this.callbacks.onLeverClick) {
          this.callbacks.onLeverClick();
        }
        return;
      }
      if (role === 'game_die' && this.currentGameState.phase === 'ROLL_DIE') {
        if (this.callbacks.onDieClick) {
          this.callbacks.onDieClick();
        }
        return;
      }
    }
  }

  /**
   * Resets camera & environment when starting a new game:
   * - Tomb Room enabled
   * - Plays a sweeping 3D Tomb Chamber Entrance Cinematic that locks onto the Top-Down view of the board
   * - Sets 'follow' as the default camera mode so it follows your character once movement begins
   */
  resetForNewGame(localPeerId = 'local', isOnlineMode = false) {
    this._cleanupVictoryCelebration();
    this.localPeerId = localPeerId;
    this.isOnlineMode = isOnlineMode;
    this.setBackgroundMode('tomb');
    this.cameraPreset = 'follow';
    this.initialTopDownHold = true;
    this.userPausedFollowUntilNextMove = false;
    this.activeMovingExplorerId = null;
    if (this.THREE && this.camera && this.controls) {
      this.playTombEntranceCinematic(3800);
    }
  }

  /**
   * Plays a 3.8-second sweeping 3D camera crane shot entering the darkened Pharaoh's Burial Chamber
   * past the flickering bronze torches, monumental lotus columns, and Anubis guardian shrines,
   * then ascending and locking onto the Top-Down view of the pyramid board!
   */
  playTombEntranceCinematic(durationMs = 3800) {
    if (this.fallbackMode || !this.THREE || !this.camera || !this.controls) return;
    const THREE = this.THREE;

    const posCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-9.4, 0.95, 2.6),
        new THREE.Vector3(-5.8, 2.15, 6.4),
        new THREE.Vector3(-1.6, 5.65, 5.2),
        new THREE.Vector3(0.0, 10.2, 0.01),
      ],
      false,
      'centripetal',
      0.5
    );

    const targetCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(2.8, 1.65, -0.8),
        new THREE.Vector3(1.2, 1.4, -0.6),
        new THREE.Vector3(0.0, 1.15, 0.0),
        new THREE.Vector3(0.0, 1.0, 0.0),
      ],
      false,
      'centripetal',
      0.5
    );

    this.cameraTransition = null;
    this.cinematicIntro = {
      startTime: performance.now(),
      duration: durationMs,
      posCurve,
      targetCurve,
    };

    this.camera.position.set(-9.4, 0.95, 2.6);
    this.controls.target.set(2.8, 1.65, -0.8);
    this.controls.update();
  }

  _cleanupVictoryCelebration() {
    this.victoryWinnerId = null;
    this.victoryBaseY = null;
    this.victoryGems = [];
    if (this.victoryCelebrationGroup && this.scene) {
      this.scene.remove(this.victoryCelebrationGroup);
      this.victoryCelebrationGroup = null;
    }
    for (const expObj of Object.values(this.explorers)) {
      if (expObj) {
        expObj.rotation.z = 0;
        expObj.rotation.x = 0;
      }
    }
  }

  /**
   * Launches the 3D Game Over Celebration on the Pyramid Board:
   * - Camera swoops in on the Winner
   * - Golden Pharaoh Sunbeam Pillar + 32 Faceted Gems fountain & rain around the Winner
   * - Winner jumps in celebration while Losers topple/slump on the pyramid steps!
   */
  triggerGameOverCelebration(winnerId) {
    if (this.fallbackMode || !this.THREE || !this.scene) return;
    this._cleanupVictoryCelebration();

    const THREE = this.THREE;
    const winnerExp = this.explorers[winnerId];
    if (!winnerExp) return;

    // Determine the Winner's FINAL board destination (since animateExplorerPath may still be mid-hop to the Home Temple!)
    let wPos = winnerExp.userData?.finalTargetPos
      ? winnerExp.userData.finalTargetPos.clone()
      : winnerExp.position.clone();
    if (this.currentGameState?.players) {
      const winnerPlayer = this.currentGameState.players.find((pl) => pl.id === winnerId);
      if (winnerPlayer) {
        const occ = this.currentGameState.players.filter((pl) => pl.spaceId === winnerPlayer.spaceId);
        wPos = this._getExplorerWorldPosition(winnerPlayer, occ);
      }
    }

    this.victoryWinnerId = winnerId;
    this.victoryBaseY = wPos.y;
    this.userPausedFollowUntilNextMove = true;

    // Tilt losing explorers on the board in defeat
    for (const [id, expObj] of Object.entries(this.explorers)) {
      if (!expObj || !expObj.visible) continue;
      if (id !== winnerId) {
        expObj.rotation.z = 0.42;
      }
    }

    // Swoop camera to frame the Winner at their final location and the Pyramid
    const radial = new THREE.Vector3(wPos.x, 0, wPos.z);
    if (radial.lengthSq() < 0.001) radial.set(-0.707, 0, -0.707);
    else radial.normalize();

    const camPos = new THREE.Vector3(
      wPos.x + radial.x * 3.1,
      3.35,
      wPos.z + radial.z * 3.1
    );
    const lookTarget = new THREE.Vector3(
      wPos.x * 0.72,
      wPos.y + 0.45,
      wPos.z * 0.72
    );
    this._transitionCamera(camPos, lookTarget, 950);

    // Build Golden Pharaoh Sunbeam & Gem Fountain Group positioned directly at the Winner's final location (wPos)
    const group = new THREE.Group();
    group.name = 'VictoryCelebrationGroup';
    group.position.copy(wPos);

    const beamGeo = new THREE.CylinderGeometry(0.32, 0.52, 6.5, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffe055,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 3.1, 0);
    group.add(beamMesh);

    const ringGeo = new THREE.RingGeometry(0.22, 0.56, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, 0.02, 0);
    group.add(ringMesh);

    const winLight = new THREE.PointLight(0xffe066, 3.2, 4.5);
    winLight.position.set(0, 1.2, 0);
    group.add(winLight);

    // 28 Upright Pointed Diamond (💎) 3D Crystals with crisp facet edge lines raining around the Winner
    const gemGeo = this._createFacetedGemGeometry(THREE, 0.105, 0.105, 0.085, 6, true);
    const gemEdgesGeo = new THREE.EdgesGeometry(gemGeo, 12);
    const emeraldEdgeMat = new THREE.LineBasicMaterial({ color: 0xaaffcf, transparent: true, opacity: 0.85 });
    const rubyEdgeMat = new THREE.LineBasicMaterial({ color: 0xffbfd0, transparent: true, opacity: 0.85 });
    const goldMat = new THREE.MeshPhongMaterial({
      color: 0xffc814,
      emissive: 0x4a3200,
      specular: 0xfff5bd,
      shininess: 120,
      flatShading: true,
    });
    const goldEdgeMat = new THREE.LineBasicMaterial({ color: 0xfff4ad, transparent: true, opacity: 0.9 });

    this.victoryGems = [];
    for (let i = 0; i < 28; i++) {
      const isRuby = i % 5 === 0;
      const isGold = i % 4 === 1;
      const mat = isRuby
        ? this.rubyMat || new THREE.MeshPhongMaterial({ color: 0xd4001c, flatShading: true })
        : isGold
        ? goldMat
        : this.emeraldMat || new THREE.MeshPhongMaterial({ color: 0x00a838, flatShading: true });
      const edgeMat = isRuby ? rubyEdgeMat : isGold ? goldEdgeMat : emeraldEdgeMat;

      const gem = new THREE.Mesh(gemGeo, mat);
      const wireframe = new THREE.LineSegments(gemEdgesGeo, edgeMat);
      gem.add(wireframe);

      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 0.28 + Math.random() * 1.15;
      gem.position.set(
        Math.cos(angle) * radius,
        0.4 + Math.random() * 3.2,
        Math.sin(angle) * radius
      );
      group.add(gem);
      this.victoryGems.push({
        mesh: gem,
        minY: 0.18,
        maxY: 3.4,
        speedY: 1.15 + Math.random() * 1.25,
        rotSpeed: 1.8 + Math.random() * 2.4,
        seed: i * 0.7,
      });
    }

    this.scene.add(group);
    this.victoryCelebrationGroup = group;
  }

  /**
   * Returns the player whose character should be followed by the 'follow' camera.
   * Follows your human character on the board!
   */
  _getFollowedPlayer() {
    const state = this.currentGameState;
    if (!state || !state.players || state.players.length === 0) return null;
    const humanPlayers = state.players.filter((p) => p.control === 'human');
    if (humanPlayers.length === 1) {
      return humanPlayers[0];
    }
    if (this.isOnlineMode && this.localPeerId) {
      const myPeerHuman = humanPlayers.find((p) => p.peerId === this.localPeerId);
      if (myPeerHuman) return myPeerHuman;
    }
    const turnPlayer = state.players[state.turnIndex];
    if (turnPlayer && turnPlayer.control === 'human') {
      return turnPlayer;
    }
    return humanPlayers[0] || state.players[0];
  }

  /**
   * Computes the smooth 3D camera position & look-at target behind and above your character,
   * looking across your character toward the center of the pyramid (and gently glancing toward any moving piece).
   */
  _computeFollowCameraTarget() {
    if (!this.THREE || !this.currentGameState) return null;
    const THREE = this.THREE;
    const myPlayer = this._getFollowedPlayer();
    const myExp = myPlayer ? this.explorers[myPlayer.id] : null;
    if (!myExp) return null;

    const expPos = myExp.position.clone();
    const radial = new THREE.Vector3(expPos.x, 0, expPos.z);
    if (radial.lengthSq() < 0.001) {
      radial.set(-0.707, 0, -0.707);
    } else {
      radial.normalize();
    }

    const camPos = new THREE.Vector3(
      expPos.x + radial.x * 3.85,
      5.75,
      expPos.z + radial.z * 3.85
    );

    const lookTarget = new THREE.Vector3(
      expPos.x * 0.52,
      expPos.y + 0.22,
      expPos.z * 0.52
    );

    if (this.activeMovingExplorerId && this.activeMovingExplorerId !== myPlayer.id) {
      const movingExp = this.explorers[this.activeMovingExplorerId];
      if (movingExp) {
        lookTarget.lerp(
          new THREE.Vector3(
            movingExp.position.x * 0.65,
            movingExp.position.y + 0.25,
            movingExp.position.z * 0.65
          ),
          0.35
        );
      }
    }

    return { camPos, lookTarget };
  }

  /**
   * Computes a close-up overhead 3D camera pose directly over top of a player's Temple Gem Collection Box
   * (defaults to the local player who clicked the "💎 Gem Box" button).
   */
  _computeGemBoxCameraTarget(playerId = null) {
    if (!this.THREE) return null;
    const THREE = this.THREE;
    const targetPlayer = playerId
      ? (this.currentGameState?.players?.find((p) => p.id === playerId) || { id: playerId })
      : this._getFollowedPlayer();
    const pid = targetPlayer?.id || 'blue';
    const cfg = PLAYERS_CONFIG.find((c) => c.id === pid) || PLAYERS_CONFIG[0];
    const holder = this.holders[pid];

    let basePos;
    if (holder) {
      basePos = holder.position.clone();
    } else if (cfg.holderPx) {
      const p = pxToThree(cfg.holderPx.px, cfg.holderPx.py, cfg.holderPx.z || 0.045);
      basePos = new THREE.Vector3(p.x, p.y, p.z);
    } else {
      basePos = new THREE.Vector3(-2.96, 0.05, -3.61);
    }

    const signX = basePos.x < 0 ? -1 : 1;
    const signZ = basePos.z < 0 ? -1 : 1;

    const lookTarget = new THREE.Vector3(
      basePos.x + signX * 0.08,
      0.08,
      basePos.z
    );
    const camPos = new THREE.Vector3(
      basePos.x + signX * 0.24,
      2.15,
      basePos.z + signZ * 0.36
    );

    return { camPos, lookTarget };
  }

  /**
   * Centers the 3D camera directly over top of the specified (or local) player's Temple Gem Box,
   * and automatically returns to Follow mode as soon as anyone rolls the die or moves.
   */
  focusPlayerGemBox(playerId = null) {
    this.cameraPreset = 'gembox';
    this.cinematicIntro = null;
    this.userPausedFollowUntilNextMove = false;
    this.isUserInteracting = false;
    this.initialTopDownHold = false;
    document.querySelectorAll('[data-cam-preset]').forEach((b) => {
      b.classList.toggle('active', b.dataset.camPreset === 'gembox');
    });
    const gemPose = this._computeGemBoxCameraTarget(playerId);
    if (gemPose) {
      this._transitionCamera(gemPose.camPos, gemPose.lookTarget, 650);
    }
  }

  /**
   * Automatically exits "💎 Gem Box" inspection view and returns to "🧭 Follow" mode
   * whenever a player rolls the die, moves, or pulls the Sarcophagus lever.
   */
  _resumeFollowAfterGemBox() {
    if (this.cameraPreset === 'gembox') {
      this.cameraPreset = 'follow';
      this.initialTopDownHold = false;
      this.userPausedFollowUntilNextMove = false;
      this.cameraTransition = null;
      document.querySelectorAll('[data-cam-preset]').forEach((b) => {
        b.classList.toggle('active', b.dataset.camPreset === 'follow');
      });
    }
  }

  setCameraPreset(presetName) {
    this.cameraPreset = presetName;
    this.cinematicIntro = null;
    this.userPausedFollowUntilNextMove = false;
    this.isUserInteracting = false;
    this.initialTopDownHold = false;

    if (this.fallbackMode) {
      const img = this.container.querySelector('.fallback3d-bg-img');
      if (img) {
        if (presetName === 'topdown') img.src = 'renders/voice_of_the_mummy_topdown.png';
        else if (presetName === 'sarcophagus') img.src = 'renders/voice_of_the_mummy_closeup.png';
        else img.src = 'renders/voice_of_the_mummy_hero.png';
      }
      return;
    }
    if (!this.THREE) return;
    const THREE = this.THREE;
    if (presetName === 'hero') {
      this._transitionCamera(new THREE.Vector3(-8.1, 4.65, 1.45), new THREE.Vector3(0.0, 1.0, 0.0));
    } else if (presetName === 'tomb') {
      this._transitionCamera(new THREE.Vector3(-9.8, 3.25, 4.2), new THREE.Vector3(0.5, 1.45, -0.4));
    } else if (presetName === 'topdown') {
      this._transitionCamera(new THREE.Vector3(0.0, 10.2, 0.01), new THREE.Vector3(0.0, 1.0, 0.0));
    } else if (presetName === 'sarcophagus') {
      this._transitionCamera(new THREE.Vector3(-3.2, 3.4, 1.55), new THREE.Vector3(0.0, 1.48, 0.0));
    } else if (presetName === 'gembox') {
      this.focusPlayerGemBox(null);
    } else if (presetName === 'follow') {
      this.initialTopDownHold = false;
      const followPose = this._computeFollowCameraTarget();
      if (followPose) {
        this._transitionCamera(followPose.camPos, followPose.lookTarget, 650);
      }
    }
  }

  _transitionCamera(targetPos, targetLookAt, durationMs = 750) {
    if (!this.camera || !this.controls) return;
    this.cinematicIntro = null;
    this.cameraTransition = {
      startPos: this.camera.position.clone(),
      endPos: targetPos.clone(),
      startTarget: this.controls.target.clone(),
      endTarget: targetLookAt.clone(),
      startTime: performance.now(),
      duration: durationMs,
    };
  }

  syncWithState(state, immediate = false) {
    this.currentGameState = state;
    if (this.fallbackMode || !this.modelLoaded || !state || !this.THREE) return;

    this.isMummySpeaking = state.phase === 'MUMMY_SPEAKING' || state.phase === 'PULL_LEVER';

    // Keep 3D die showing lastRoll on top when not actively tumbling
    if (state.lastRoll && this.dieMesh && !this._hasActiveAnimFor(this.dieMesh)) {
      const targetEuler = this.dieTargetRotations?.[state.lastRoll];
      if (targetEuler) {
        this.dieMesh.rotation.copy(targetEuler);
      }
    }

    const activeIds = new Set(state.players.map((p) => p.id));
    const currentTurnPlayerId = state.players[state.turnIndex]?.id;
    for (const cfg of PLAYERS_CONFIG) {
      const expObj = this.explorers[cfg.id];
      if (!expObj) continue;
      if (!activeIds.has(cfg.id)) {
        expObj.visible = false;
        continue;
      }
      expObj.visible = true;
      const halo = expObj.getObjectByName('ActiveTurnHalo');
      if (halo) {
        halo.visible = cfg.id === currentTurnPlayerId;
      }
      const curseAura = expObj.getObjectByName('CobraCurseAura');
      if (curseAura) {
        curseAura.visible = state.cobraOwner === cfg.id;
      }
    }

    const occupantsBySpace = {};
    for (const p of state.players) {
      if (!occupantsBySpace[p.spaceId]) occupantsBySpace[p.spaceId] = [];
      occupantsBySpace[p.spaceId].push(p);
    }

    for (const p of state.players) {
      const expObj = this.explorers[p.id];
      if (!expObj) continue;
      const targetPos = this._getExplorerWorldPosition(p, occupantsBySpace[p.spaceId]);
      if (immediate || !this._hasActiveAnimFor(expObj)) {
        expObj.position.copy(targetPos);
      }
    }

    const meshOwnerMap = {};
    for (const p of state.players) {
      p.collectedMeshes.forEach((mName, idx) => {
        meshOwnerMap[mName] = { playerId: p.id, slotIndex: idx };
      });
    }

    for (const [meshName, meshObj] of Object.entries(this.scarabMeshes)) {
      if (this._hasActiveAnimFor(meshObj)) continue;
      const ownerInfo = meshOwnerMap[meshName];
      if (ownerInfo) {
        const cupPos = this._getHolderGemPosition(ownerInfo.playerId, ownerInfo.slotIndex);
        meshObj.position.copy(cupPos);
        meshObj.visible = true;
      } else {
        const home = this.scarabHomeTransforms[meshName];
        if (home) {
          meshObj.position.copy(home.pos);
          meshObj.quaternion.copy(home.quat);
          meshObj.visible = true;
        }
      }
    }

    if (this.greatJewelMesh && !this._hasActiveAnimFor(this.greatJewelMesh)) {
      if (state.greatJewelOwner) {
        const pos = this._getTempleTrophyPosition(state.greatJewelOwner, 'great_jewel');
        this.greatJewelMesh.position.copy(pos);
      } else if (this.greatJewelHome) {
        this.greatJewelMesh.position.copy(this.greatJewelHome.pos);
        this.greatJewelMesh.quaternion.copy(this.greatJewelHome.quat);
      }
    }

    if (this.cobraMesh && !this._hasActiveAnimFor(this.cobraMesh)) {
      if (state.cobraOwner) {
        const pos = this._getTempleTrophyPosition(state.cobraOwner, 'cobra');
        this.cobraMesh.position.copy(pos);
      } else if (this.cobraHome) {
        this.cobraMesh.position.copy(this.cobraHome.pos);
        this.cobraMesh.quaternion.copy(this.cobraHome.quat);
      }
    }

    this._updateSpacePads(state);
  }

  _getExplorerWorldPosition(player, occupantsOnSameSpace = []) {
    const THREE = this.THREE;
    const sp = SPACES_BY_ID[player.spaceId];
    const cfg = PLAYERS_CONFIG.find((c) => c.id === player.id);

    let basePx = sp.px;
    let basePy = sp.py;
    if (sp.id === cfg.homeSpaceId && occupantsOnSameSpace.length === 1) {
      basePx = cfg.startStandPx.px;
      basePy = cfg.startStandPx.py;
    }

    const pos = pxToThree(basePx, basePy, sp.z);
    const vec = new THREE.Vector3(pos.x, pos.y, pos.z);

    if (occupantsOnSameSpace.length > 1) {
      const idx = occupantsOnSameSpace.findIndex((o) => o.id === player.id);
      const angle = (idx / occupantsOnSameSpace.length) * Math.PI * 2;
      const radius = 0.14;
      vec.x += Math.cos(angle) * radius;
      vec.z += Math.sin(angle) * radius;
    }
    return vec;
  }

  _getHolderGemPosition(playerId, slotIndex) {
    const THREE = this.THREE;
    const holder = this.holders[playerId];
    const base = holder ? holder.position.clone() : new THREE.Vector3(0, 0, 0);
    const col = slotIndex % 3;
    const row = Math.floor(slotIndex / 3) % 3;
    const layer = Math.floor(slotIndex / 9);
    return new THREE.Vector3(
      base.x + (col - 1) * 0.085,
      0.05 + layer * 0.042,
      base.z + (row - 1) * 0.075
    );
  }

  _getTempleTrophyPosition(playerId, trophyType) {
    const THREE = this.THREE;
    const holder = this.holders[playerId];
    const base = holder ? holder.position.clone() : new THREE.Vector3(0, 0, 0);
    const signX = base.x < 0 ? -1 : 1;
    if (trophyType === 'great_jewel') {
      return new THREE.Vector3(base.x + signX * 0.42, 0.08, base.z + 0.12);
    } else {
      return new THREE.Vector3(base.x + signX * 0.42, 0.02, base.z - 0.18);
    }
  }

  _updateSpacePads(state) {
    for (const pad of Object.values(this.spacePads)) {
      pad.userData.highlightMode = null;
      pad.material.opacity = 0.0;
    }

    if (state.part === 1 && state.greatJewelUnlocked) {
      for (const gjId of ['L3_12', 'L3_25']) {
        const pad = this.spacePads[gjId];
        if (pad) {
          pad.material.color.setHex(0xff2a4b);
          pad.material.opacity = 0.45;
          pad.userData.highlightMode = 'great_jewel_ready';
        }
      }
    }

    if (state.phase === 'CHOOSE_DIRECTION' && state.moveOptions) {
      const cwId = state.moveOptions.cw?.targetId;
      if (cwId && this.spacePads[cwId]) {
        const pad = this.spacePads[cwId];
        pad.material.color.setHex(0x2ee675);
        pad.material.opacity = 0.68;
        pad.userData.highlightMode = 'move_cw';
      }
      const ccwId = state.moveOptions.ccw?.targetId;
      if (ccwId && this.spacePads[ccwId] && ccwId !== cwId) {
        const pad = this.spacePads[ccwId];
        pad.material.color.setHex(0x36a2ff);
        pad.material.opacity = 0.68;
        pad.userData.highlightMode = 'move_ccw';
      }
    }

    if (state.phase === 'CHOOSE_LEVEL_STEP' && state.levelStepOptions) {
      const { upSpaceId, downSpaceId } = state.levelStepOptions;
      if (upSpaceId && this.spacePads[upSpaceId]) {
        const pad = this.spacePads[upSpaceId];
        pad.material.color.setHex(0xffc83b);
        pad.material.opacity = 0.72;
        pad.userData.highlightMode = 'step_up';
      }
      if (downSpaceId && this.spacePads[downSpaceId]) {
        const pad = this.spacePads[downSpaceId];
        pad.material.color.setHex(0xff7b2e);
        pad.material.opacity = 0.72;
        pad.userData.highlightMode = 'step_down';
      }
    }
  }

  /**
   * Animates the 6-sided 3D Die tumbling and landing with the exact `rollValue` (1..6) face on top!
   */
  animateDieRoll(rollValue = 1) {
    this._resumeFollowAfterGemBox();
    if (this.fallbackMode || !this.dieMesh || !this.dieHomePos) return;
    const startTime = performance.now();
    const duration = 640;
    const home = this.dieHomePos.clone();
    const endRot = this.dieTargetRotations?.[rollValue] || this.dieTargetRotations[1];

    this._removeAnimsFor(this.dieMesh);
    this.activeAnimations.push({
      target: this.dieMesh,
      update: (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        const bounce = Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t) * 1.15;
        this.dieMesh.position.set(
          home.x + Math.sin(t * Math.PI * 2) * 0.28 * (1 - t),
          home.y + bounce,
          home.z + Math.cos(t * Math.PI * 2) * 0.28 * (1 - t)
        );
        const spinExtra = (1 - ease) * Math.PI * 4;
        this.dieMesh.rotation.set(
          endRot.x + spinExtra,
          endRot.y + spinExtra * 0.5,
          endRot.z + spinExtra
        );
        return t >= 1;
      },
    });
  }

  animateExplorerPath(playerId, pathSpaceIds, fromSpaceId = null) {
    if (this.fallbackMode || !this.THREE) return;
    const THREE = this.THREE;
    const expObj = this.explorers[playerId];
    if (!expObj || !pathSpaceIds || pathSpaceIds.length === 0) return;

    // Release initial Top-Down hold and resume Follow mode when movement starts
    this._resumeFollowAfterGemBox();
    this.cinematicIntro = null;
    this.initialTopDownHold = false;
    this.userPausedFollowUntilNextMove = false;
    this.activeMovingExplorerId = playerId;

    const existingPlayer = this.currentGameState?.players?.find((pl) => pl.id === playerId);
    let startPos = expObj.position.clone();
    if (fromSpaceId && SPACES_BY_ID[fromSpaceId] && !this._hasActiveAnimFor(expObj)) {
      const fromVirtual = { ...(existingPlayer || {}), id: playerId, spaceId: fromSpaceId };
      const fromOcc = (this.currentGameState?.players || []).filter(
        (pl) => pl.id === playerId || pl.spaceId === fromSpaceId
      );
      startPos = this._getExplorerWorldPosition(
        fromVirtual,
        fromOcc.length > 0 ? fromOcc : [fromVirtual]
      );
    }

    const waypoints = [startPos];
    for (const spId of pathSpaceIds) {
      const sp = SPACES_BY_ID[spId];
      if (sp) {
        const p = pxToThree(sp.px, sp.py, sp.z);
        waypoints.push(new THREE.Vector3(p.x, p.y, p.z));
      }
    }

    // IMPORTANT: Always compute final waypoint using the destination space from pathSpaceIds
    // (NOT this.currentGameState.players[...].spaceId, which on a Guest client may still hold the pre-move spaceId!)
    const finalSpaceId = pathSpaceIds[pathSpaceIds.length - 1];
    if (finalSpaceId && SPACES_BY_ID[finalSpaceId]) {
      const movedPlayer = {
        ...(existingPlayer || {}),
        id: playerId,
        spaceId: finalSpaceId,
      };
      const otherOccupants = (this.currentGameState?.players || []).filter(
        (pl) => pl.id !== playerId && pl.spaceId === finalSpaceId
      );
      const occ = [...otherOccupants, movedPlayer];
      waypoints[waypoints.length - 1] = this._getExplorerWorldPosition(movedPlayer, occ);
    }

    expObj.userData.finalTargetPos = waypoints[waypoints.length - 1].clone();

    const totalSegs = waypoints.length - 1;
    const segDuration = Math.min(180, Math.max(95, 650 / totalSegs));
    const totalDuration = totalSegs * segDuration;
    const startTime = performance.now();

    this._removeAnimsFor(expObj);
    this.activeAnimations.push({
      target: expObj,
      update: (now) => {
        const elapsed = now - startTime;
        const overallT = Math.min(1, elapsed / totalDuration);
        const segFloat = overallT * totalSegs;
        const segIdx = Math.min(totalSegs - 1, Math.floor(segFloat));
        const localT = segFloat - segIdx;

        const p0 = waypoints[segIdx];
        const p1 = waypoints[segIdx + 1];
        expObj.position.lerpVectors(p0, p1, localT);
        expObj.position.y += Math.sin(localT * Math.PI) * 0.22;
        if (overallT >= 1) {
          if (this.activeMovingExplorerId === playerId) {
            this.activeMovingExplorerId = null;
          }
          // Snap cleanly to the final destination (or authoritative state if updated)
          expObj.position.copy(waypoints[waypoints.length - 1]);
          if (this.currentGameState) {
            const authPlayer = this.currentGameState.players.find((pl) => pl.id === playerId);
            if (authPlayer && authPlayer.spaceId === finalSpaceId) {
              const authOcc = this.currentGameState.players.filter((pl) => pl.spaceId === authPlayer.spaceId);
              expObj.position.copy(this._getExplorerWorldPosition(authPlayer, authOcc));
            }
          }
        }
        return overallT >= 1;
      },
    });
  }

  animateJewelCollection(jewelMeshName, toPlayerId, explicitSlotIdx = null) {
    if (this.fallbackMode) return;
    const meshObj = this.scarabMeshes[jewelMeshName];
    if (!meshObj) return;
    const player = this.currentGameState?.players?.find((p) => p.id === toPlayerId);
    const slotIdx =
      typeof explicitSlotIdx === 'number'
        ? Math.max(0, explicitSlotIdx)
        : Math.max(0, (player?.collectedMeshes?.length || 1) - 1);
    const startPos = meshObj.position.clone();
    const endPos = this._getHolderGemPosition(toPlayerId, slotIdx);
    const startTime = performance.now();
    const duration = 780;

    this._removeAnimsFor(meshObj);
    this.activeAnimations.push({
      target: meshObj,
      update: (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        meshObj.position.lerpVectors(startPos, endPos, ease);
        meshObj.position.y += Math.sin(ease * Math.PI) * 1.45;
        meshObj.rotation.y += 0.14;
        if (t >= 1) {
          meshObj.position.copy(endPos);
        }
        return t >= 1;
      },
    });
  }

  animateSarcophagusLeverPull() {
    this._resumeFollowAfterGemBox();
    if (this.fallbackMode || !this.leverTab || !this.leverHomePos) return;
    const startPos = this.leverHomePos.clone();
    const startTime = performance.now();
    const duration = 900;

    this._removeAnimsFor(this.leverTab);
    this.activeAnimations.push({
      target: this.leverTab,
      update: (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const pull = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
        this.leverTab.position.set(startPos.x, startPos.y, startPos.z - pull * 0.24);
        return t >= 1;
      },
    });
  }

  _hasActiveAnimFor(targetObj) {
    return this.activeAnimations.some((a) => a.target === targetObj);
  }

  _removeAnimsFor(targetObj) {
    this.activeAnimations = this.activeAnimations.filter((a) => a.target !== targetObj);
  }

  _animate() {
    if (this.fallbackMode) return;
    requestAnimationFrame(() => this._animate());
    const now = performance.now();

    if (this.activeAnimations.length > 0) {
      this.activeAnimations = this.activeAnimations.filter((anim) => !anim.update(now));
    }

    if (this.cinematicIntro) {
      const ci = this.cinematicIntro;
      const t = Math.min(1, Math.max(0, (now - ci.startTime) / ci.duration));
      const ease = 1 - Math.pow(1 - t, 2.25);
      ci.posCurve.getPoint(ease, this.camera.position);
      ci.targetCurve.getPoint(ease, this.controls.target);
      if (t >= 1) {
        this.camera.position.set(0.0, 10.2, 0.01);
        this.controls.target.set(0.0, 1.0, 0.0);
        this.cinematicIntro = null;
      }
    } else if (this.cameraTransition) {
      const ct = this.cameraTransition;
      const t = Math.min(1, (now - ct.startTime) / ct.duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(ct.startPos, ct.endPos, ease);
      this.controls.target.lerpVectors(ct.startTarget, ct.endTarget, ease);
      if (t >= 1) this.cameraTransition = null;
    } else if (
      this.cameraPreset === 'follow' &&
      !this.initialTopDownHold &&
      !this.isUserInteracting &&
      !this.userPausedFollowUntilNextMove &&
      this.currentGameState
    ) {
      const followPose = this._computeFollowCameraTarget();
      if (followPose) {
        this.camera.position.lerp(followPose.camPos, 0.055);
        this.controls.target.lerp(followPose.lookTarget, 0.075);
      }
    }

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    for (const pad of Object.values(this.spacePads)) {
      if (pad.userData.highlightMode) {
        pad.material.opacity = 0.42 + 0.36 * pulse;
      }
    }

    // Keep Faceted Emerald & Ruby Gemstones crisp with high facet contrast
    if (this.emeraldMat) {
      this.emeraldMat.emissiveIntensity = 0.35 + 0.25 * pulse;
    }
    if (this.rubyMat) {
      this.rubyMat.emissiveIntensity = 0.4 + 0.25 * pulse;
    }

    // Automatically hide Tomb Ceiling when camera is high overhead (e.g. Top-Down view) so it never blocks the board
    if (this.tombCeilingGroup && this.camera) {
      this.tombCeilingGroup.visible = this.camera.position.y < 7.2;
    }

    // Pulse the Cursed Explorer's fiery red Cobra Aura on the 3D board
    for (const expObj of Object.values(this.explorers)) {
      const curseAura = expObj?.getObjectByName('CobraCurseAura');
      if (curseAura && curseAura.visible) {
        const pillar = curseAura.getObjectByName('CobraCursePillar');
        if (pillar) {
          pillar.material.opacity = 0.28 + 0.35 * pulse;
          const s = 0.94 + 0.16 * pulse;
          pillar.scale.set(s, 1.0, s);
        }
      }
    }

    // Animate flickering Tomb Torch Braziers, dancing firelight on temple walls, & floating golden dust motes
    const sec = now * 0.001;
    for (const tf of this.torchFlames) {
      const w1 = Math.sin(sec * 7.8 + tf.seed);
      const w2 = Math.sin(sec * 16.4 + tf.seed * 2.1);
      const w3 = Math.cos(sec * 25.0 + tf.seed * 3.4);
      const gust = Math.pow(0.5 + 0.5 * Math.sin(sec * 2.6 + tf.seed * 0.8), 2);
      const flicker = w1 * 0.24 + w2 * 0.16 + w3 * 0.1 + (gust - 0.35) * 0.22;
      const swayX = Math.sin(sec * 6.2 + tf.seed * 1.4) * 0.14 + Math.cos(sec * 13.5 + tf.seed) * 0.07;
      const swayZ = Math.cos(sec * 5.7 + tf.seed * 1.9) * 0.14 + Math.sin(sec * 12.1 + tf.seed) * 0.07;

      const stretchY = Math.max(0.68, Math.min(1.48, 1.0 + flicker * 1.15));
      tf.outer.scale.set(1.0 - flicker * 0.32, stretchY, 1.0 + flicker * 0.28);
      tf.outer.position.set(swayX * 0.25, tf.baseY + (stretchY - 1.0) * 0.26, swayZ * 0.25);
      tf.outer.rotation.set(swayZ, sec * 1.8 + tf.seed, -swayX);

      if (tf.mid) {
        const midStretch = Math.max(0.72, Math.min(1.42, 1.0 - w1 * 0.18 + w2 * 0.26 + gust * 0.24));
        tf.mid.scale.set(1.0 + w2 * 0.22, midStretch, 1.0 - w1 * 0.22);
        tf.mid.position.set(-swayX * 0.18, tf.baseY - 0.08 + (midStretch - 1.0) * 0.2, -swayZ * 0.18);
        tf.mid.rotation.set(-swayZ * 0.7, -sec * 2.4 + tf.seed, swayX * 0.7);
      }

      tf.inner.scale.set(1.0 + w3 * 0.18, 1.0 + flicker * 0.75, 1.0 - w3 * 0.18);
      tf.inner.position.set(swayX * 0.1, tf.baseY - 0.2 + flicker * 0.08, swayZ * 0.1);

      if (tf.glow) {
        const glowScale = 1.95 + flicker * 0.75;
        tf.glow.scale.set(glowScale, glowScale * 1.1, 1.0);
        tf.glow.material.opacity = Math.max(0.48, Math.min(0.96, 0.76 + flicker * 0.42));
      }
    }
    for (const tl of this.torchLights) {
      const w1 = Math.sin(sec * 7.8 + tl.seed);
      const w2 = Math.sin(sec * 16.4 + tl.seed * 2.1);
      const w3 = Math.cos(sec * 25.0 + tl.seed * 3.4);
      const gust = Math.pow(0.5 + 0.5 * Math.sin(sec * 2.6 + tl.seed * 0.8), 2);
      const wave = w1 * 0.28 + w2 * 0.18 + w3 * 0.11 + (gust - 0.35) * 0.26;
      const mult = Math.max(0.42, Math.min(1.68, 1.0 + wave));
      tl.light.intensity = tl.baseIntensity * mult;
      // Subtle position dance so torch shadows & highlights visibly shimmer across the temple walls & columns
      tl.light.position.set(
        Math.sin(sec * 9.2 + tl.seed) * 0.13,
        (tl.baseY || 2.58) + wave * 0.15,
        Math.cos(sec * 8.4 + tl.seed * 1.5) * 0.13
      );
      // Warm color shift between deep fiery orange on dips and bright golden-amber on flares
      const gChan = Math.max(0.34, Math.min(0.64, 0.47 + wave * 0.22));
      const bChan = Math.max(0.04, Math.min(0.22, 0.1 + wave * 0.12));
      tl.light.color.setRGB(1.0, gChan, bChan);
    }
    if (this.dustParticles) {
      this.dustParticles.rotation.y = sec * 0.018;
    }

    // Animate 3D Victory Celebration (Winner jumping + 28 Faceted Gems raining around Winner)
    if (this.victoryWinnerId && this.explorers[this.victoryWinnerId]) {
      const wExp = this.explorers[this.victoryWinnerId];
      // Wait until the winning hop animation into the Home Temple finishes before bouncing in place
      if (!this._hasActiveAnimFor(wExp)) {
        const baseY = this.victoryBaseY ?? 0.36;
        wExp.position.y = baseY + Math.abs(Math.sin(sec * 6.5)) * 0.34;
        wExp.rotation.y = Math.sin(sec * 3.2) * 0.35;
        if (this.victoryCelebrationGroup) {
          this.victoryCelebrationGroup.position.set(wExp.position.x, baseY, wExp.position.z);
        }
      }
    }
    if (this.victoryGems && this.victoryGems.length > 0) {
      for (const vg of this.victoryGems) {
        vg.mesh.position.y -= vg.speedY * 0.016;
        if (vg.mesh.position.y < vg.minY) {
          vg.mesh.position.y = vg.maxY;
        }
        vg.mesh.rotation.y += vg.rotSpeed * 0.024;
      }
    }

    if (this.mummyLight) {
      if (this.isMummySpeaking) {
        this.mummyLight.intensity = 2.5 + 1.8 * Math.sin(now * 0.015);
        this.mummyLight.color.setHex(
          this.currentGameState?.part === 2 ? 0xff3b2f : 0x38ff7a
        );
      } else {
        this.mummyLight.intensity = 0.0;
      }
    }

    if (this.controls && this.renderer && this.scene && this.camera) {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }
}
