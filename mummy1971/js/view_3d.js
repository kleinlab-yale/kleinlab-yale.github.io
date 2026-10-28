/**
 * 1971 Milton Bradley "Voice of the Mummy" — Interactive 3D Viewport
 * Dynamically loads Three.js + GLTFLoader (`voice_of_the_mummy.glb`), fixes grayscale bump maps
 * so the Sandstone Steps and Bronze Sarcophagus render brightly, and builds a true 6-sided 3D Die
 * that lands on the exact rolled value (1..6).
 */

import {
  BOARD_W,
  BOARD_H,
  BOARD_SPACES,
  SPACES_BY_ID,
  PLAYERS_CONFIG,
  pxToThree,
} from './board_data.js?v=3';

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

    this.spacePads = {};
    this.interactiveTargets = [];

    this.activeAnimations = [];
    this.cameraTransition = null;
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
    this.scene.background = new THREE.Color(0x18130e);
    this.scene.fog = new THREE.FogExp2(0x18130e, 0.02);

    const rect = this.container.getBoundingClientRect();
    const w = Math.max(320, rect.width || this.container.clientWidth || 720);
    const h = Math.max(320, rect.height || this.container.clientHeight || 560);

    this.camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100);
    this.camera.position.set(-7.6, 5.6, 1.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Create warm golden studio environment map so metallic bronze and gems reflect warm light instead of black
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x6e5536);
      const envTop = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffe8b8, side: THREE.BackSide })
      );
      envScene.add(envTop);
      this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      // Ignore if PMREM fails
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.0, 0.95, 0.0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 18.0;
    this.controls.update();

    // Bright, warm Egyptian studio lighting
    const ambient = new THREE.HemisphereLight(0xfff6e5, 0x5c462c, 1.85);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff0d6, 2.8);
    keyLight.position.set(-5.6, 7.2, 4.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 22.0;
    const d = 5.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const overheadLight = new THREE.DirectionalLight(0xfff8eb, 1.65);
    overheadLight.position.set(0.0, 9.5, 0.0);
    this.scene.add(overheadLight);

    const fillLight = new THREE.DirectionalLight(0xe8f0ff, 1.35);
    fillLight.position.set(-4.5, 5.2, -5.2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd694, 1.75);
    rimLight.position.set(5.8, 5.2, -0.8);
    this.scene.add(rimLight);

    this.mummyLight = new THREE.PointLight(0x38ff7a, 0.0, 3.8);
    this.mummyLight.position.set(0.0, 1.78, 0.25);
    this.scene.add(this.mummyLight);

    const tableGeo = new THREE.PlaneGeometry(36, 36);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1d1610,
      roughness: 0.78,
      metalness: 0.05,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.y = -0.002;
    tableMesh.receiveShadow = true;
    this.scene.add(tableMesh);
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

        const emeraldMat = new THREE.MeshPhysicalMaterial({
          color: 0x0ad462,
          emissive: 0x043818,
          roughness: 0.1,
          metalness: 0.05,
          transmission: 0.72,
          ior: 1.56,
          thickness: 0.18,
          clearcoat: 1.0,
          clearcoatRoughness: 0.04,
        });

        const rubyMat = new THREE.MeshPhysicalMaterial({
          color: 0xf0112c,
          emissive: 0x45030b,
          roughness: 0.08,
          metalness: 0.05,
          transmission: 0.76,
          ior: 1.58,
          thickness: 0.25,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03,
        });

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
            if (obj.isMesh) obj.material = emeraldMat;
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

        for (const [name, mesh] of Object.entries(this.scarabMeshes)) {
          this.scarabHomeTransforms[name] = {
            pos: mesh.position.clone(),
            quat: mesh.quaternion.clone(),
          };
        }

        this.greatJewelMesh = this.scene.getObjectByName('Great_Mummy_Jewel_Ruby');
        if (this.greatJewelMesh) {
          this.greatJewelMesh.traverse((c) => {
            if (c.isMesh) c.material = rubyMat;
          });
          this.greatJewelHome = {
            pos: this.greatJewelMesh.position.clone(),
            quat: this.greatJewelMesh.quaternion.clone(),
          };
        }

        this.cobraMesh = this.scene.getObjectByName('Ruby_Cobra_Figure');
        if (this.cobraMesh) {
          this.cobraMesh.traverse((c) => {
            if (c.isMesh) c.material = rubyMat;
          });
          this.cobraHome = {
            pos: this.cobraMesh.position.clone(),
            quat: this.cobraMesh.quaternion.clone(),
          };
        }

        for (const cfg of PLAYERS_CONFIG) {
          const expObj = this.scene.getObjectByName(cfg.explorerMeshName);
          if (expObj) {
            this.explorers[cfg.id] = expObj;
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
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;

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
    this.camera.aspect = w / h;
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

  setCameraPreset(presetName) {
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
      this._transitionCamera(new THREE.Vector3(-7.6, 5.6, 1.2), new THREE.Vector3(0.0, 0.95, 0.0));
    } else if (presetName === 'topdown') {
      this._transitionCamera(new THREE.Vector3(0.0, 10.6, 0.01), new THREE.Vector3(0.0, 1.0, 0.0));
    } else if (presetName === 'sarcophagus') {
      this._transitionCamera(new THREE.Vector3(-3.2, 3.6, 1.6), new THREE.Vector3(0.0, 1.48, 0.0));
    } else if (presetName === 'follow' && this.currentGameState) {
      const curPlayer = this.currentGameState.players[this.currentGameState.turnIndex];
      const exp = this.explorers[curPlayer?.id];
      if (exp) {
        const target = exp.position.clone().add(new THREE.Vector3(0, 0.25, 0));
        const offset = new THREE.Vector3(
          target.x < 0 ? -3.4 : 3.4,
          2.8,
          target.z < 0 ? -3.0 : 3.0
        );
        this._transitionCamera(target.clone().add(offset), target);
      }
    }
  }

  _transitionCamera(targetPos, targetLookAt, durationMs = 750) {
    if (!this.camera || !this.controls) return;
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
    for (const cfg of PLAYERS_CONFIG) {
      const expObj = this.explorers[cfg.id];
      if (!expObj) continue;
      if (!activeIds.has(cfg.id)) {
        expObj.visible = false;
        continue;
      }
      expObj.visible = true;
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

  animateExplorerPath(playerId, pathSpaceIds) {
    if (this.fallbackMode || !this.THREE) return;
    const THREE = this.THREE;
    const expObj = this.explorers[playerId];
    if (!expObj || !pathSpaceIds || pathSpaceIds.length === 0) return;

    const waypoints = [expObj.position.clone()];
    for (const spId of pathSpaceIds) {
      const sp = SPACES_BY_ID[spId];
      if (sp) {
        const p = pxToThree(sp.px, sp.py, sp.z);
        waypoints.push(new THREE.Vector3(p.x, p.y, p.z));
      }
    }

    if (this.currentGameState) {
      const player = this.currentGameState.players.find((pl) => pl.id === playerId);
      if (player) {
        const occ = this.currentGameState.players.filter((pl) => pl.spaceId === player.spaceId);
        waypoints[waypoints.length - 1] = this._getExplorerWorldPosition(player, occ);
      }
    }

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
        return overallT >= 1;
      },
    });
  }

  animateJewelCollection(jewelMeshName, toPlayerId) {
    if (this.fallbackMode) return;
    const meshObj = this.scarabMeshes[jewelMeshName];
    if (!meshObj || !this.currentGameState) return;
    const player = this.currentGameState.players.find((p) => p.id === toPlayerId);
    const slotIdx = Math.max(0, (player?.collectedMeshes?.length || 1) - 1);
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
        return t >= 1;
      },
    });
  }

  animateSarcophagusLeverPull() {
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

    if (this.cameraTransition) {
      const ct = this.cameraTransition;
      const t = Math.min(1, (now - ct.startTime) / ct.duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(ct.startPos, ct.endPos, ease);
      this.controls.target.lerpVectors(ct.startTarget, ct.endTarget, ease);
      if (t >= 1) this.cameraTransition = null;
    }

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    for (const pad of Object.values(this.spacePads)) {
      if (pad.userData.highlightMode) {
        pad.material.opacity = 0.42 + 0.36 * pulse;
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
