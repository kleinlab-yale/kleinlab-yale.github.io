/**
 * Super Wizard Chess 3D Renderer (Three.js) — Upgraded Edition
 * Features:
 * 1. Rich 3D Architectural Background:
 *    - Procedural 360° Sky Dome (Great Hall Twilight, Haunted Halloween Blood Moon, Astral Nebula, Winter Aurora)
 *    - 12 Gothic Castle Columns & Archways surrounding the arena
 *    - 36 Floating Enchanted Candles with flickering flames
 *    - Engraved Marble & Arcane Rune Sanctuary Floor
 * 2. Full Mouse & Cursor 3D Board Manipulation:
 *    - Left-drag anywhere to rotate 360° & tilt
 *    - Right-drag (or Shift+drag) to pan the board
 *    - Scroll wheel / pinch to zoom + step rotation/zoom methods
 * 3. Cinematic Zoom-In Animated Fight on Captures:
 *    - Camera swoops in close to frame Attacker vs. Defender
 *    - Multi-stage animated duel: Approach -> Weapon Clash & Parry Sparks -> Finishing Leap -> 34-Shard Stone Shatter Explosion -> Smooth Camera Return
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { coordsToSquare, squareToCoords } from './chess-rules.js';

const TILE_SIZE = 1.15;
const BOARD_OFFSET = (7 * TILE_SIZE) / 2;

const PIECE_NAMES = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King'
};

function boardToWorld(r, c) {
  return {
    x: c * TILE_SIZE - BOARD_OFFSET,
    z: r * TILE_SIZE - BOARD_OFFSET
  };
}

export class Board3DRenderer {
  constructor(containerEl, onSquareSelect, callbacks = {}) {
    this.container = containerEl;
    this.onSquareSelect = onSquareSelect;
    this.callbacks = callbacks;

    this.orientation = 'w';
    this.lightingTheme = 'great-hall';
    this.autoRotate = false;
    this.battleCam = true;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.tileMeshes = new Map();
    this.pieceGroups = new Map();
    this.markerMeshes = [];
    this.fragments = [];
    this.shockwaves = [];
    this.activeAnimations = [];
    this.activeCombat = null; // Holds state of zoom-in animated capture duel
    this.braziers = [];
    this.floatingCandles = [];

    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.shakeIntensity = 0;

    this.cameraTargetPos = null;
    this.cameraTargetLook = new THREE.Vector3(0, 0.2, 0);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPos = { x: 0, y: 0 };

    this._initMaterials();
    this._initScene();
    this._buildSkyAndGreatHall();
    this._buildSanctuaryBoard();
    this._initParticles();
    this._bindEvents();
    this._startLoop();
  }

  _initMaterials() {
    this.materials = {
      wMain: new THREE.MeshStandardMaterial({
        color: 0xf4efe6,
        roughness: 0.24,
        metalness: 0.14
      }),
      wAccent: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.2,
        metalness: 0.86,
        emissive: 0x78350f,
        emissiveIntensity: 0.35
      }),
      wGlow: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        roughness: 0.1
      }),
      bMain: new THREE.MeshStandardMaterial({
        color: 0x1d192b,
        roughness: 0.22,
        metalness: 0.48
      }),
      bAccent: new THREE.MeshStandardMaterial({
        color: 0xc026d3,
        roughness: 0.24,
        metalness: 0.78,
        emissive: 0x701a75,
        emissiveIntensity: 0.48
      }),
      bGlow: new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.6,
        roughness: 0.1
      }),
      tileLight: new THREE.MeshStandardMaterial({
        color: 0xdcd5c9,
        roughness: 0.3,
        metalness: 0.1
      }),
      tileDark: new THREE.MeshStandardMaterial({
        color: 0x2c263d,
        roughness: 0.35,
        metalness: 0.2
      }),
      tileSelected: new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.22
      }),
      tileLastMove: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0x92400e,
        emissiveIntensity: 0.42,
        roughness: 0.28
      }),
      tileCheck: new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.9,
        roughness: 0.2
      }),
      pedestal: new THREE.MeshStandardMaterial({
        color: 0x161324,
        roughness: 0.5,
        metalness: 0.32
      }),
      hallStone: new THREE.MeshStandardMaterial({
        color: 0x1e1b2e,
        roughness: 0.7,
        metalness: 0.15
      }),
      goldTrim: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.24,
        metalness: 0.88
      })
    };
  }

  _initScene() {
    const width = this.container.clientWidth || 720;
    const height = this.container.clientHeight || 640;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0a18);
    this.scene.fog = new THREE.FogExp2(0x0c0a18, 0.015);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 140);
    this.camera.position.set(0, 8.6, 9.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Full Mouse & Cursor Controls: Left-drag = 360° Orbit/Tilt, Right-drag = Pan, Scroll = Zoom
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.rotateSpeed = 0.9;
    this.controls.zoomSpeed = 1.1;
    this.controls.panSpeed = 0.85;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 3.0;
    this.controls.maxDistance = 23;
    this.controls.target.set(0, 0.2, 0);

    // Ambient + Moonlit Directional Light
    this.ambientLight = new THREE.AmbientLight(0x6366f1, 1.35);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    this.dirLight.position.set(7, 15, 8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 36;
    const d = 8.0;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight(0xa855f7, 1.05);
    this.rimLight.position.set(-9, 8, -10);
    this.scene.add(this.rimLight);
  }

  /**
   * Generates a procedural 360° Sky Dome texture with stars, nebula clouds, and a glowing moon.
   */
  _generateSkyTexture(theme = 'great-hall') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    if (theme === 'halloween') {
      grad.addColorStop(0, '#09030f');
      grad.addColorStop(0.45, '#2b0926');
      grad.addColorStop(0.75, '#59161b');
      grad.addColorStop(1, '#120612');
    } else if (theme === 'astral') {
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.4, '#0f172a');
      grad.addColorStop(0.7, '#1e1b4b');
      grad.addColorStop(1, '#050816');
    } else if (theme === 'emerald-sanctum') {
      grad.addColorStop(0, '#021210');
      grad.addColorStop(0.45, '#06372c');
      grad.addColorStop(0.75, '#0c4a6e');
      grad.addColorStop(1, '#04130e');
    } else {
      // Great Hall Starlit Twilight
      grad.addColorStop(0, '#060512');
      grad.addColorStop(0.42, '#171336');
      grad.addColorStop(0.72, '#2d1c42');
      grad.addColorStop(1, '#0c0a18');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Nebula / Aurora ribbons
    for (let i = 0; i < 5; i++) {
      const rx = Math.random() * 1024;
      const ry = 80 + Math.random() * 200;
      const rad = ctx.createRadialGradient(rx, ry, 10, rx, ry, 240);
      const col =
        theme === 'halloween'
          ? 'rgba(249, 115, 22, 0.16)'
          : theme === 'emerald-sanctum'
          ? 'rgba(16, 185, 129, 0.18)'
          : 'rgba(168, 85, 247, 0.16)';
      rad.addColorStop(0, col);
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, 1024, 512);
    }

    // 450 Twinkling Stars
    for (let i = 0; i < 450; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 340;
      const sr = Math.random() * 1.8 + 0.4;
      ctx.fillStyle =
        i % 7 === 0 ? '#fde68a' : i % 11 === 0 ? '#38bdf8' : '#ffffff';
      ctx.globalAlpha = 0.35 + Math.random() * 0.65;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Giant Glowing Moon in the sky
    const moonX = 760;
    const moonY = 140;
    const moonRadius = theme === 'halloween' ? 46 : 34;
    const moonGlow = ctx.createRadialGradient(
      moonX,
      moonY,
      moonRadius * 0.2,
      moonX,
      moonY,
      moonRadius * 3.2
    );
    if (theme === 'halloween') {
      moonGlow.addColorStop(0, 'rgba(251, 146, 60, 0.95)');
      moonGlow.addColorStop(0.35, 'rgba(234, 88, 12, 0.45)');
      moonGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
    } else {
      moonGlow.addColorStop(0, 'rgba(254, 243, 199, 0.95)');
      moonGlow.addColorStop(0.35, 'rgba(56, 189, 248, 0.25)');
      moonGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    }
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius * 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme === 'halloween' ? '#ffedd5' : '#fef9c3';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Builds the surrounding 3D Great Hall architecture, Sky Dome, Gothic Columns,
   * Sanctuary Floor, and 36 Floating Enchanted Candles.
   */
  _buildSkyAndGreatHall() {
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);

    // 1. 360° Sky Dome
    const skyGeo = new THREE.SphereGeometry(58, 40, 28);
    this.skyMat = new THREE.MeshBasicMaterial({
      map: this._generateSkyTexture(this.lightingTheme),
      side: THREE.BackSide,
      fog: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.environmentGroup.add(this.skyDome);

    // 2. Grand Sanctuary Stone Floor & Glowing Rune Ring below the table
    const floorGeo = new THREE.CylinderGeometry(24, 25, 0.4, 48);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.hallStone);
    floorMesh.position.y = -2.4;
    floorMesh.receiveShadow = true;
    this.environmentGroup.add(floorMesh);

    // Stepped dais under the chess table
    const daisGeo = new THREE.CylinderGeometry(7.6, 8.8, 1.8, 16);
    const daisMesh = new THREE.Mesh(daisGeo, this.materials.pedestal);
    daisMesh.position.y = -1.3;
    daisMesh.receiveShadow = true;
    this.environmentGroup.add(daisMesh);

    // Glowing Arcane Floor Rings
    const outerRuneGeo = new THREE.RingGeometry(8.9, 9.25, 64);
    this.floorRuneMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const outerRune = new THREE.Mesh(outerRuneGeo, this.floorRuneMat);
    outerRune.rotation.x = -Math.PI / 2;
    outerRune.position.y = -2.18;
    this.environmentGroup.add(outerRune);

    // 3. Ring of 12 Towering Gothic Castle Columns & Arches
    const numPillars = 12;
    const hallRadius = 17.5;
    for (let i = 0; i < numPillars; i++) {
      const angle = (i * Math.PI * 2) / numPillars;
      const px = Math.cos(angle) * hallRadius;
      const pz = Math.sin(angle) * hallRadius;

      const colGroup = new THREE.Group();
      colGroup.position.set(px, -2.2, pz);
      colGroup.rotation.y = -angle;

      // Column Base
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.2, 1.5),
        this.materials.pedestal
      );
      base.position.y = 0.6;
      colGroup.add(base);

      // Fluted Shaft
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.65, 13, 12),
        this.materials.hallStone
      );
      shaft.position.y = 7.1;
      colGroup.add(shaft);

      // Golden Capital Ring
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.6, 1.4),
        this.materials.goldTrim
      );
      cap.position.y = 13.8;
      colGroup.add(cap);

      // Glowing Crystal Sconce on each pillar facing the board
      const sconce = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26, 0),
        this.materials.wGlow
      );
      sconce.position.set(-0.65, 5.8, 0);
      colGroup.add(sconce);

      this.environmentGroup.add(colGroup);
    }

    // 4. 36 Floating Enchanted Candles in the Great Hall Air
    const candleWaxMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const candleFlameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    for (let i = 0; i < 36; i++) {
      const cGroup = new THREE.Group();
      const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 5.8 + Math.random() * 8.5;
      const baseY = 3.2 + Math.random() * 5.2;

      const wax = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.48, 8),
        candleWaxMat
      );
      cGroup.add(wax);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.14, 6),
        candleFlameMat
      );
      flame.position.y = 0.32;
      cGroup.add(flame);

      cGroup.position.set(
        Math.cos(angle) * dist,
        baseY,
        Math.sin(angle) * dist
      );

      this.environmentGroup.add(cGroup);
      this.floatingCandles.push({
        group: cGroup,
        baseY,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.9
      });
    }
  }

  _buildSanctuaryBoard() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    const outerSize = 8 * TILE_SIZE + 1.4;
    const pedestalGeo = new THREE.BoxGeometry(outerSize, 0.55, outerSize);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, this.materials.pedestal);
    pedestalMesh.position.y = -0.34;
    pedestalMesh.receiveShadow = true;
    this.boardGroup.add(pedestalMesh);

    const trimGeo = new THREE.BoxGeometry(8 * TILE_SIZE + 0.32, 0.22, 8 * TILE_SIZE + 0.32);
    const trimMesh = new THREE.Mesh(trimGeo, this.materials.goldTrim);
    trimMesh.position.y = -0.12;
    trimMesh.receiveShadow = true;
    this.boardGroup.add(trimMesh);

    const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.96, 0.18, TILE_SIZE * 0.96);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = coordsToSquare(r, c);
        const isLight = (r + c) % 2 === 0;
        const mat = isLight ? this.materials.tileLight : this.materials.tileDark;
        const tile = new THREE.Mesh(tileGeo, mat);
        const pos = boardToWorld(r, c);
        tile.position.set(pos.x, 0, pos.z);
        tile.receiveShadow = true;
        tile.userData = { square: sq, isLight };
        this.boardGroup.add(tile);
        this.tileMeshes.set(sq, tile);
      }
    }

    const cornerOffset = outerSize / 2 - 0.35;
    const corners = [
      [-cornerOffset, -cornerOffset],
      [cornerOffset, -cornerOffset],
      [-cornerOffset, cornerOffset],
      [cornerOffset, cornerOffset]
    ];

    corners.forEach(([cx, cz], idx) => {
      const brazierGroup = new THREE.Group();
      brazierGroup.position.set(cx, 0, cz);

      const pillarGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.9, 12);
      const pillar = new THREE.Mesh(pillarGeo, this.materials.pedestal);
      pillar.position.y = 0.35;
      pillar.castShadow = true;
      brazierGroup.add(pillar);

      const bowlGeo = new THREE.ConeGeometry(0.42, 0.3, 12);
      const bowl = new THREE.Mesh(bowlGeo, this.materials.goldTrim);
      bowl.rotation.x = Math.PI;
      bowl.position.y = 0.85;
      brazierGroup.add(bowl);

      const flameMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xf59e0b : 0xa855f7
      });
      const flameGeo = new THREE.OctahedronGeometry(0.22, 1);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.15;
      brazierGroup.add(flame);

      const light = new THREE.PointLight(
        idx % 2 === 0 ? 0xf59e0b : 0xa855f7,
        2.3,
        10.5
      );
      light.position.set(0, 1.35, 0);
      brazierGroup.add(light);

      this.boardGroup.add(brazierGroup);
      this.braziers.push({ flame, light, phase: idx * 1.7 });
    });

    this.piecesRoot = new THREE.Group();
    this.scene.add(this.piecesRoot);

    this.markersRoot = new THREE.Group();
    this.scene.add(this.markersRoot);

    this.fxRoot = new THREE.Group();
    this.scene.add(this.fxRoot);
  }

  _initParticles() {
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 8 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.09,
      transparent: true,
      opacity: 0.7
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  _createWizardPieceMesh(type, color) {
    const group = new THREE.Group();
    const mainMat = color === 'w' ? this.materials.wMain : this.materials.bMain;
    const accentMat = color === 'w' ? this.materials.wAccent : this.materials.bAccent;
    const glowMat = color === 'w' ? this.materials.wGlow : this.materials.bGlow;

    const basePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.42, 0.08),
      new THREE.Vector2(0.36, 0.14),
      new THREE.Vector2(0.38, 0.20),
      new THREE.Vector2(0.28, 0.26)
    ];
    const baseGeo = new THREE.LatheGeometry(basePoints, 24);
    const baseMesh = new THREE.Mesh(baseGeo, mainMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const ringGeo = new THREE.TorusGeometry(0.33, 0.032, 10, 24);
    const ringMesh = new THREE.Mesh(ringGeo, accentMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.22;
    group.add(ringMesh);

    if (type === 'p') {
      const bodyPts = [
        new THREE.Vector2(0.27, 0.24),
        new THREE.Vector2(0.22, 0.55),
        new THREE.Vector2(0.26, 0.78),
        new THREE.Vector2(0.14, 0.88)
      ];
      const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 20), mainMat);
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 16), mainMat);
      head.position.y = 1.05;
      head.castShadow = true;
      group.add(head);

      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), accentMat);
      visor.position.y = 1.05;
      group.add(visor);

      const shieldDir = color === 'w' ? -1 : 1;
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.06, 8), accentMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0.12, 0.68, shieldDir * 0.23);
      shield.castShadow = true;
      group.add(shield);

      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 8), accentMat);
      spear.position.set(-0.22, 0.72, 0);
      spear.castShadow = true;
      group.add(spear);

      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), glowMat);
      spearTip.position.set(-0.22, 1.45, 0);
      group.add(spearTip);
    } else if (type === 'r') {
      const towerPts = [
        new THREE.Vector2(0.32, 0.24),
        new THREE.Vector2(0.27, 0.95),
        new THREE.Vector2(0.34, 1.08),
        new THREE.Vector2(0.34, 1.28),
        new THREE.Vector2(0.22, 1.28),
        new THREE.Vector2(0.22, 1.15),
        new THREE.Vector2(0, 1.15)
      ];
      const tower = new THREE.Mesh(new THREE.LatheGeometry(towerPts, 20), mainMat);
      tower.castShadow = true;
      group.add(tower);

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.12), accentMat);
        merlon.position.set(Math.cos(angle) * 0.28, 1.35, Math.sin(angle) * 0.28);
        merlon.rotation.y = -angle;
        merlon.castShadow = true;
        group.add(merlon);
      }

      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), glowMat);
      beacon.position.y = 1.32;
      group.add(beacon);
    } else if (type === 'n') {
      const dir = color === 'w' ? -1 : 1;
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.31, 0.35, 18),
        mainMat
      );
      pedestal.position.y = 0.4;
      pedestal.castShadow = true;
      group.add(pedestal);

      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.68, 0.42), mainMat);
      neck.position.set(0, 0.85, -dir * 0.04);
      neck.rotation.x = dir * 0.28;
      neck.castShadow = true;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.56), mainMat);
      head.position.set(0, 1.22, dir * 0.14);
      head.rotation.x = -dir * 0.32;
      head.castShadow = true;
      group.add(head);

      const armor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.52), accentMat);
      armor.position.set(0, 1.31, dir * 0.15);
      armor.rotation.x = -dir * 0.32;
      group.add(armor);

      for (const ex of [-0.1, 0.1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), accentMat);
        ear.position.set(ex, 1.46, -dir * 0.05);
        group.add(ear);
      }

      for (const ex of [-0.145, 0.145]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), glowMat);
        eye.position.set(ex, 1.26, dir * 0.18);
        group.add(eye);
      }

      for (let i = 0; i < 4; i++) {
        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.18), accentMat);
        mane.position.set(0, 0.72 + i * 0.16, -dir * (0.24 - i * 0.02));
        mane.rotation.x = dir * 0.4;
        group.add(mane);
      }
    } else if (type === 'b') {
      const robePts = [
        new THREE.Vector2(0.3, 0.24),
        new THREE.Vector2(0.22, 0.68),
        new THREE.Vector2(0.26, 0.85),
        new THREE.Vector2(0.17, 0.96),
        new THREE.Vector2(0.24, 1.2),
        new THREE.Vector2(0.14, 1.46),
        new THREE.Vector2(0, 1.56)
      ];
      const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 24), mainMat);
      robe.castShadow = true;
      group.add(robe);

      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.035, 10, 20), accentMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.92;
      group.add(collar);

      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), glowMat);
      crystal.position.y = 1.72;
      group.add(crystal);
    } else if (type === 'q') {
      const gownPts = [
        new THREE.Vector2(0.34, 0.24),
        new THREE.Vector2(0.23, 0.75),
        new THREE.Vector2(0.28, 0.98),
        new THREE.Vector2(0.18, 1.15),
        new THREE.Vector2(0.27, 1.52),
        new THREE.Vector2(0.19, 1.62),
        new THREE.Vector2(0, 1.58)
      ];
      const gown = new THREE.Mesh(new THREE.LatheGeometry(gownPts, 28), mainMat);
      gown.castShadow = true;
      group.add(gown);

      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 6), accentMat);
        spike.position.set(Math.cos(angle) * 0.22, 1.68, Math.sin(angle) * 0.22);
        group.add(spike);
      }

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), glowMat);
      orb.position.y = 1.88;
      group.add(orb);
    } else if (type === 'k') {
      const kingPts = [
        new THREE.Vector2(0.36, 0.24),
        new THREE.Vector2(0.26, 0.82),
        new THREE.Vector2(0.31, 1.06),
        new THREE.Vector2(0.22, 1.24),
        new THREE.Vector2(0.31, 1.64),
        new THREE.Vector2(0.25, 1.74),
        new THREE.Vector2(0, 1.72)
      ];
      const body = new THREE.Mesh(new THREE.LatheGeometry(kingPts, 28), mainMat);
      body.castShadow = true;
      group.add(body);

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.29, 0.26, 0.18, 16),
        accentMat
      );
      crown.position.y = 1.72;
      group.add(crown);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), accentMat);
      crossV.position.y = 1.98;
      group.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), accentMat);
      crossH.position.y = 2.02;
      group.add(crossH);

      const heartGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), glowMat);
      heartGem.position.y = 2.02;
      group.add(heartGem);
    }

    return group;
  }

  /**
   * Spawns golden weapon-clash sparks at mid-height during the 3D battle parry.
   */
  _spawnClashSparks(x, z) {
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.OctahedronGeometry(0.055, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfbbf24 : 0x38bdf8,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.95, z);
      this.fxRoot.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.5;
      this.fragments.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 1.5 + Math.random() * 3.2,
        vz: Math.sin(angle) * speed,
        rx: (Math.random() - 0.5) * 18,
        ry: (Math.random() - 0.5) * 18,
        rz: (Math.random() - 0.5) * 18,
        age: 0,
        maxAge: 0.55
      });
    }
  }

  /**
   * Triggers a 34-shard stone-shattering explosion when a piece is defeated.
   */
  triggerCaptureExplosion(r, c, capturedColor) {
    const pos = boardToWorld(r, c);
    const matMain = capturedColor === 'w' ? this.materials.wMain : this.materials.bMain;
    const matGlow = capturedColor === 'w' ? this.materials.wGlow : this.materials.bGlow;

    const ringGeo = new THREE.RingGeometry(0.15, 0.36, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: capturedColor === 'w' ? 0x38bdf8 : 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(pos.x, 0.12, pos.z);
    this.fxRoot.add(ringMesh);
    this.shockwaves.push({ mesh: ringMesh, age: 0, maxAge: 0.72 });

    for (let i = 0; i < 34; i++) {
      const radius = 0.065 + Math.random() * 0.12;
      const geo =
        i % 3 === 0
          ? new THREE.OctahedronGeometry(radius * 0.9, 0)
          : new THREE.DodecahedronGeometry(radius, 0);
      const fragMat = (i % 3 === 0 ? matGlow : matMain).clone();
      fragMat.transparent = true;
      fragMat.opacity = 1.0;

      const mesh = new THREE.Mesh(geo, fragMat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.35,
        0.35 + Math.random() * 0.95,
        pos.z + (Math.random() - 0.5) * 0.35
      );
      mesh.castShadow = true;
      this.fxRoot.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.6;
      this.fragments.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2.8 + Math.random() * 4.8,
        vz: Math.sin(angle) * speed,
        rx: (Math.random() - 0.5) * 15,
        ry: (Math.random() - 0.5) * 15,
        rz: (Math.random() - 0.5) * 15,
        age: 0,
        maxAge: 1.35 + Math.random() * 0.55
      });
    }

    this.shakeIntensity = 0.28;
  }

  /**
   * Animates a move. If it's a capture and `battleCam` is enabled, runs a
   * zoomed-in choreographed 3D battle duel between Attacker and Defender!
   */
  animateMove(moveRecord, game) {
    const fromCoords = squareToCoords(moveRecord.from);
    const toCoords = squareToCoords(moveRecord.to);
    if (!fromCoords || !toCoords) {
      this.render(game, this.selectedSquare, this.legalMoves, moveRecord);
      return;
    }

    // Re-sync the static board first
    this.render(game, null, [], moveRecord);

    const startWorld = boardToWorld(fromCoords.r, fromCoords.c);
    const endWorld = boardToWorld(toCoords.r, toCoords.c);

    // If this move is a capture and Battle Cam is active, launch the Zoom-In 3D Duel!
    if (moveRecord.captured && this.battleCam) {
      const attackerGroup = this.pieceGroups.get(moveRecord.to);
      if (attackerGroup) {
        attackerGroup.position.set(startWorld.x, 0.09, startWorld.z);
      }

      // Create temporary Victim/Defender 3D piece at the capture square until the finishing blow!
      const capCoords = moveRecord.ep
        ? { r: fromCoords.r, c: toCoords.c }
        : toCoords;
      const capWorld = boardToWorld(capCoords.r, capCoords.c);
      const defenderColor = moveRecord.color === 'w' ? 'b' : 'w';
      const defenderGroup = this._createWizardPieceMesh(
        moveRecord.captured,
        defenderColor
      );
      defenderGroup.position.set(capWorld.x, 0.09, capWorld.z);
      this.fxRoot.add(defenderGroup);

      // Compute direction vector from attacker to defender
      const dx = endWorld.x - startWorld.x;
      const dz = endWorld.z - startWorld.z;
      const len = Math.hypot(dx, dz) || 1;
      const dirX = dx / len;
      const dirZ = dz / len;

      // Save current camera position so we can restore after the duel
      const savedCamPos = this.camera.position.clone();
      const savedTarget = this.controls.target.clone();

      // Calculate dramatic side-angle close-up camera position around the battle square
      const perpX = -dirZ;
      const perpZ = dirX;
      const camZoomPos = new THREE.Vector3(
        endWorld.x + perpX * 3.4 - dirX * 1.6,
        2.75,
        endWorld.z + perpZ * 3.4 - dirZ * 1.6
      );
      const camZoomLook = new THREE.Vector3(
        endWorld.x - dirX * 0.25,
        0.85,
        endWorld.z - dirZ * 0.25
      );

      // Show Combat Banner in UI
      const attName = PIECE_NAMES[moveRecord.piece] || 'Warrior';
      const defName = PIECE_NAMES[moveRecord.captured] || 'Warrior';
      this.callbacks.onCombatBanner?.(
        `⚔️ ${attName.toUpperCase()} vs. ${defName.toUpperCase()} — BATTLE AT ${moveRecord.to.toUpperCase()}!`,
        true
      );

      this.activeCombat = {
        elapsed: 0,
        duration: 1.65,
        attackerGroup,
        defenderGroup,
        defenderColor,
        capCoords,
        startWorld,
        endWorld,
        dirX,
        dirZ,
        savedCamPos,
        savedTarget,
        camZoomPos,
        camZoomLook,
        clashed: false,
        shattered: false
      };
      return;
    }

    // Standard non-zoom capture or regular move animation
    if (moveRecord.captured) {
      const capCoords = moveRecord.ep
        ? { r: fromCoords.r, c: toCoords.c }
        : toCoords;
      const capturedColor = moveRecord.color === 'w' ? 'b' : 'w';
      this.triggerCaptureExplosion(capCoords.r, capCoords.c, capturedColor);
    }

    const movedGroup = this.pieceGroups.get(moveRecord.to);
    if (movedGroup) {
      movedGroup.position.set(startWorld.x, 0.09, startWorld.z);
      this.activeAnimations.push({
        group: movedGroup,
        startX: startWorld.x,
        startZ: startWorld.z,
        endX: endWorld.x,
        endZ: endWorld.z,
        arcHeight: moveRecord.piece === 'n' ? 1.35 : 0.14,
        elapsed: 0,
        duration: 0.28
      });
    }
  }

  render(game, selectedSquare = null, legalMoves = [], lastMove = null) {
    // Clean up any leftover combat defender mesh if user clicked mid-animation
    if (this.activeCombat && this.activeCombat.defenderGroup) {
      this.fxRoot.remove(this.activeCombat.defenderGroup);
      this.activeCombat = null;
      this.callbacks.onCombatBanner?.('', false);
    }

    this.selectedSquare = selectedSquare;
    this.legalMoves = legalMoves || [];
    this.lastMove = lastMove;

    const inCheckColor = game.inCheck(game.turn) ? game.turn : null;
    const kingInCheckPos = inCheckColor ? game.findKing(inCheckColor) : null;
    const kingInCheckSq = kingInCheckPos
      ? coordsToSquare(kingInCheckPos.r, kingInCheckPos.c)
      : null;

    for (const [sq, tile] of this.tileMeshes.entries()) {
      if (sq === this.selectedSquare) {
        tile.material = this.materials.tileSelected;
      } else if (sq === kingInCheckSq) {
        tile.material = this.materials.tileCheck;
      } else if (this.lastMove && (this.lastMove.from === sq || this.lastMove.to === sq)) {
        tile.material = this.materials.tileLastMove;
      } else {
        tile.material = tile.userData.isLight
          ? this.materials.tileLight
          : this.materials.tileDark;
      }
    }

    while (this.piecesRoot.children.length > 0) {
      this.piecesRoot.remove(this.piecesRoot.children[0]);
    }
    this.pieceGroups.clear();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.board[r][c];
        if (!p) continue;
        const sq = coordsToSquare(r, c);
        const pos = boardToWorld(r, c);
        const meshGroup = this._createWizardPieceMesh(p.type, p.color);
        const isSelected = sq === this.selectedSquare;
        meshGroup.position.set(pos.x, isSelected ? 0.34 : 0.09, pos.z);
        meshGroup.userData = { square: sq, piece: p };

        meshGroup.traverse(child => {
          child.userData.square = sq;
        });

        this.piecesRoot.add(meshGroup);
        this.pieceGroups.set(sq, meshGroup);
      }
    }

    while (this.markersRoot.children.length > 0) {
      this.markersRoot.remove(this.markersRoot.children[0]);
    }
    this.markerMeshes = [];

    for (const move of this.legalMoves) {
      const coords = squareToCoords(move.to);
      if (!coords) continue;
      const pos = boardToWorld(coords.r, coords.c);
      const isCapture = !!move.captured || move.ep;

      const geo = isCapture
        ? new THREE.RingGeometry(0.34, 0.49, 28)
        : new THREE.RingGeometry(0.12, 0.25, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: isCapture ? 0xf43f5e : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const marker = new THREE.Mesh(geo, mat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(pos.x, 0.11, pos.z);
      marker.userData = { square: move.to };
      this.markersRoot.add(marker);
      this.markerMeshes.push(marker);
    }
  }

  /**
   * Step-rotates the camera horizontally around the board.
   */
  rotateCameraBy(deltaRadians) {
    if (!this.camera || !this.controls) return;
    this.cameraTargetPos = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const cos = Math.cos(deltaRadians);
    const sin = Math.sin(deltaRadians);
    const nx = offset.x * cos - offset.z * sin;
    const nz = offset.x * sin + offset.z * cos;
    offset.x = nx;
    offset.z = nz;
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /**
   * Step-zooms the camera in (<1) or out (>1).
   */
  zoomCameraBy(scaleFactor) {
    if (!this.camera || !this.controls) return;
    this.cameraTargetPos = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.multiplyScalar(scaleFactor);
    const dist = offset.length();
    if (dist >= this.controls.minDistance && dist <= this.controls.maxDistance) {
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
  }

  setOrientation(color) {
    this.orientation = color === 'b' ? 'b' : 'w';
    this.setCameraPreset(this.orientation === 'b' ? 'black' : 'white');
  }

  setCameraPreset(preset) {
    this.cameraTargetLook.set(0, 0.2, 0);
    if (preset === 'white') {
      this.cameraTargetPos = new THREE.Vector3(0, 8.6, 9.8);
    } else if (preset === 'black') {
      this.cameraTargetPos = new THREE.Vector3(0, 8.6, -9.8);
    } else if (preset === 'cinematic') {
      const zSign = this.orientation === 'b' ? -1 : 1;
      this.cameraTargetPos = new THREE.Vector3(7.2 * zSign, 6.2, 8.4 * zSign);
    } else if (preset === 'top') {
      const zSign = this.orientation === 'b' ? -0.8 : 0.8;
      this.cameraTargetPos = new THREE.Vector3(0, 13.8, zSign);
    }
  }

  setLightingTheme(theme) {
    this.lightingTheme = theme;
    if (this.skyMat) {
      this.skyMat.map = this._generateSkyTexture(theme);
      this.skyMat.needsUpdate = true;
    }

    if (theme === 'halloween') {
      this.scene.background = new THREE.Color(0x120612);
      this.scene.fog = new THREE.FogExp2(0x120612, 0.015);
      this.ambientLight.color.setHex(0xf97316);
      this.ambientLight.intensity = 1.25;
      this.dirLight.color.setHex(0xffedd5);
      if (this.floorRuneMat) this.floorRuneMat.color.setHex(0xf97316);
    } else if (theme === 'astral') {
      this.scene.background = new THREE.Color(0x050816);
      this.scene.fog = new THREE.FogExp2(0x050816, 0.014);
      this.ambientLight.color.setHex(0x38bdf8);
      this.ambientLight.intensity = 1.25;
      this.dirLight.color.setHex(0xe0f2fe);
      if (this.floorRuneMat) this.floorRuneMat.color.setHex(0x38bdf8);
    } else if (theme === 'emerald-sanctum') {
      this.scene.background = new THREE.Color(0x04130e);
      this.scene.fog = new THREE.FogExp2(0x04130e, 0.014);
      this.ambientLight.color.setHex(0x10b981);
      this.ambientLight.intensity = 1.2;
      this.dirLight.color.setHex(0xd1fae5);
      if (this.floorRuneMat) this.floorRuneMat.color.setHex(0x10b981);
    } else {
      this.scene.background = new THREE.Color(0x0c0a18);
      this.scene.fog = new THREE.FogExp2(0x0c0a18, 0.015);
      this.ambientLight.color.setHex(0x6366f1);
      this.ambientLight.intensity = 1.35;
      this.dirLight.color.setHex(0xfff7ed);
      if (this.floorRuneMat) this.floorRuneMat.color.setHex(0xf59e0b);
    }
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  _bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', e => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.cameraTargetPos = null;
    });

    dom.addEventListener('pointerup', e => {
      const dx = Math.abs(e.clientX - this.pointerDownPos.x);
      const dy = Math.abs(e.clientY - this.pointerDownPos.y);
      // If the user dragged the mouse > 6px, treat as 3D board rotation/pan, not a square click
      if (dx > 6 || dy > 6) return;

      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const targets = [
        ...this.piecesRoot.children,
        ...Array.from(this.tileMeshes.values()),
        ...this.markerMeshes
      ];
      const intersects = this.raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData?.square) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.square) {
          this.onSquareSelect(obj.userData.square, 'click');
        }
      }
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  _startLoop() {
    let lastTime = performance.now();

    const animate = now => {
      requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const t = now * 0.001;

      // 1. Flicker corner braziers
      for (const b of this.braziers) {
        const flicker = Math.sin(t * 7 + b.phase) * 0.25 + Math.cos(t * 13 + b.phase) * 0.15;
        b.light.intensity = 2.2 + flicker;
        b.flame.scale.setScalar(1 + flicker * 0.18);
        b.flame.rotation.y += dt * 2.2;
      }

      // 2. Bob floating enchanted candles in the Great Hall
      for (const c of this.floatingCandles) {
        c.group.position.y = c.baseY + Math.sin(t * c.speed + c.phase) * 0.22;
      }

      // 3. Float ambient dust particles
      if (this.particles) {
        this.particles.rotation.y += dt * 0.035;
      }

      // 4. Choreographed Zoom-In 3D Capture Duel Sequence
      if (this.activeCombat) {
        const cb = this.activeCombat;
        cb.elapsed += dt;
        const e = cb.elapsed;

        // Stand-off spot just in front of the defender
        const standoffX = cb.endWorld.x - cb.dirX * 0.65;
        const standoffZ = cb.endWorld.z - cb.dirZ * 0.65;

        if (e < 0.38) {
          // Stage 1: Zoom Camera in & Attacker charges to stand-off position
          const p = e / 0.38;
          const ease = 1 - Math.pow(1 - p, 3);
          this.camera.position.lerpVectors(cb.savedCamPos, cb.camZoomPos, ease);
          this.controls.target.lerpVectors(cb.savedTarget, cb.camZoomLook, ease);

          if (cb.attackerGroup) {
            cb.attackerGroup.position.set(
              cb.startWorld.x + (standoffX - cb.startWorld.x) * ease,
              0.09 + Math.sin(p * Math.PI) * 0.25,
              cb.startWorld.z + (standoffZ - cb.startWorld.z) * ease
            );
          }
        } else if (e < 0.78) {
          // Stage 2: First Weapon Clash & Parry!
          const p = (e - 0.38) / 0.4;
          const lunge = Math.sin(p * Math.PI);

          if (cb.attackerGroup) {
            cb.attackerGroup.position.set(
              standoffX + cb.dirX * lunge * 0.35,
              0.09,
              standoffZ + cb.dirZ * lunge * 0.35
            );
            cb.attackerGroup.rotation.z = lunge * 0.28;
          }
          if (cb.defenderGroup) {
            cb.defenderGroup.position.set(
              cb.endWorld.x - cb.dirX * lunge * 0.16,
              0.09,
              cb.endWorld.z - cb.dirZ * lunge * 0.16
            );
            cb.defenderGroup.rotation.z = -lunge * 0.25;
          }

          if (!cb.clashed && p >= 0.48) {
            cb.clashed = true;
            this._spawnClashSparks(
              cb.endWorld.x - cb.dirX * 0.3,
              cb.endWorld.z - cb.dirZ * 0.3
            );
            this.callbacks.onClashSound?.();
          }
        } else if (e < 1.12) {
          // Stage 3: Attacker Finishing Leap & Strike!
          const p = (e - 0.78) / 0.34;
          const ease = p * p;
          if (cb.attackerGroup) {
            cb.attackerGroup.position.set(
              standoffX + (cb.endWorld.x - standoffX) * ease,
              0.09 + Math.sin(p * Math.PI) * 1.15,
              standoffZ + (cb.endWorld.z - standoffZ) * ease
            );
            cb.attackerGroup.rotation.z = (1 - p) * -0.35;
          }
        } else if (e < cb.duration) {
          // Stage 4: Impact! Defender shatters into 34 stone shards & Camera returns!
          if (!cb.shattered) {
            cb.shattered = true;
            if (cb.defenderGroup) {
              this.fxRoot.remove(cb.defenderGroup);
              cb.defenderGroup = null;
            }
            if (cb.attackerGroup) {
              cb.attackerGroup.position.set(cb.endWorld.x, 0.09, cb.endWorld.z);
              cb.attackerGroup.rotation.set(0, 0, 0);
            }
            this.triggerCaptureExplosion(
              cb.capCoords.r,
              cb.capCoords.c,
              cb.defenderColor
            );
            this.callbacks.onShatterSound?.();
          }

          const p = (e - 1.12) / (cb.duration - 1.12);
          const ease = 1 - Math.pow(1 - p, 2);
          this.camera.position.lerpVectors(cb.camZoomPos, cb.savedCamPos, ease);
          this.controls.target.lerpVectors(cb.camZoomLook, cb.savedTarget, ease);
        } else {
          // Combat sequence finished
          if (cb.defenderGroup) {
            this.fxRoot.remove(cb.defenderGroup);
          }
          if (cb.attackerGroup) {
            cb.attackerGroup.position.set(cb.endWorld.x, 0.09, cb.endWorld.z);
            cb.attackerGroup.rotation.set(0, 0, 0);
          }
          this.camera.position.copy(cb.savedCamPos);
          this.controls.target.copy(cb.savedTarget);
          this.activeCombat = null;
          this.callbacks.onCombatBanner?.('', false);
        }
      }

      // 5. Regular piece movement animations
      for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
        const anim = this.activeAnimations[i];
        anim.elapsed += dt;
        const p = Math.min(1, anim.elapsed / anim.duration);
        const ease = 1 - Math.pow(1 - p, 3);
        const x = anim.startX + (anim.endX - anim.startX) * ease;
        const z = anim.startZ + (anim.endZ - anim.startZ) * ease;
        const y = 0.09 + Math.sin(p * Math.PI) * anim.arcHeight;
        anim.group.position.set(x, y, z);
        if (p >= 1) {
          anim.group.position.set(anim.endX, 0.09, anim.endZ);
          this.activeAnimations.splice(i, 1);
        }
      }

      // 6. Animate shattering capture fragments
      for (let i = this.fragments.length - 1; i >= 0; i--) {
        const f = this.fragments[i];
        f.age += dt;
        if (f.age >= f.maxAge) {
          this.fxRoot.remove(f.mesh);
          f.mesh.geometry.dispose();
          f.mesh.material.dispose();
          this.fragments.splice(i, 1);
          continue;
        }
        f.vy -= 12.5 * dt;
        f.mesh.position.x += f.vx * dt;
        f.mesh.position.y += f.vy * dt;
        f.mesh.position.z += f.vz * dt;

        if (f.mesh.position.y < 0.14) {
          f.mesh.position.y = 0.14;
          f.vy = Math.abs(f.vy) * 0.44;
          f.vx *= 0.74;
          f.vz *= 0.74;
        }

        f.mesh.rotation.x += f.rx * dt;
        f.mesh.rotation.y += f.ry * dt;
        f.mesh.rotation.z += f.rz * dt;
        f.mesh.material.opacity = Math.max(0, 1 - Math.pow(f.age / f.maxAge, 1.8));
      }

      // 7. Animate capture shockwave rings
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.age += dt;
        if (sw.age >= sw.maxAge) {
          this.fxRoot.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          sw.mesh.material.dispose();
          this.shockwaves.splice(i, 1);
          continue;
        }
        const prog = sw.age / sw.maxAge;
        const scale = 1 + prog * 4.0;
        sw.mesh.scale.set(scale, scale, 1);
        sw.mesh.material.opacity = (1 - prog) * 0.9;
      }

      // 8. Camera preset smooth transition (when not in active combat)
      if (!this.activeCombat && this.cameraTargetPos) {
        this.camera.position.lerp(this.cameraTargetPos, Math.min(1, dt * 6));
        this.controls.target.lerp(this.cameraTargetLook, Math.min(1, dt * 6));
        if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.08) {
          this.cameraTargetPos = null;
        }
      }

      // 9. Camera shake on explosive Wizard Chess captures
      if (this.shakeIntensity > 0.002) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeIntensity *= Math.pow(0.02, dt);
      }

      this.controls.autoRotate = this.autoRotate && !this.activeCombat;
      this.controls.autoRotateSpeed = 1.2;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    requestAnimationFrame(animate);
  }
}
