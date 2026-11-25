import { TONES } from './bricks.js';

export function drawChristmasIcon(ctx, form, tone, turn) {
  const color = TONES[tone];
  const gold = '#e6bf72', white = '#f5f3e8', red = '#b94150', pine = '#315e4c', dark = '#243535';
  const outline = '#15262d66';

  function path(points, fill, stroke = outline, width = 1) {
    ctx.beginPath();
    for (const [i, [x, y]] of points.entries()) ctx[i ? 'lineTo' : 'moveTo'](x, y);
    if (fill) {
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function box(x, y, w, h, fill) {
    path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill);
  }

  function oval(x, y, w, h, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function star(x, y, size, fill = gold) {
    path(Array.from({ length: 10 }, (_, i) => {
      const angle = i * Math.PI / 5 - Math.PI / 2;
      const r = size * (i % 2 ? 0.45 : 1);
      return [x + r * Math.cos(angle), y + r * Math.sin(angle)];
    }), fill);
  }

  function brick(x, y, w, h, depth, fill) {
    box(x, y, w, h, fill);
    path([[x + w, y], [x + w + depth, y - depth * 0.48], [x + w + depth, y + h - depth * 0.48], [x + w, y + h]], fill);
    path([[x + w, y], [x + w + depth, y - depth * 0.48], [x + w + depth, y + h - depth * 0.48], [x + w, y + h]], '#101a223a', 'transparent');
    path([[x, y], [x + depth, y - depth * 0.48], [x + w + depth, y - depth * 0.48], [x + w, y]], fill);
    path([[x, y], [x + depth, y - depth * 0.48], [x + w + depth, y - depth * 0.48], [x + w, y]], '#fff9e736', 'transparent');
  }

  function bow(x, y, size, fill = red) {
    for (const side of [-1, 1]) {
      path([[x, y], [x + side * size * 0.82, y + size], [x + side * size * 0.25, y + size * 1.22]], fill);
      oval(x + side * size * 0.77, y - size * 0.16, size * 0.8, size * 0.55, fill);
    }
    oval(x, y, size * 0.44, size * 0.46, '#ed7271');
  }

  function candles(x, y, h) {
    brick(x, y - h, 11, h, 3, color);
    oval(x + 6.6, y - h - 9, 3.1, 5.7, '#ffe09c');
  }

  oval(55, 70, 31, 5, '#070c1037');
  if (turn % 2) {
    ctx.translate(112, 0);
    ctx.scale(-1, 1);
  }
  switch (form) {
    case 'festiveTree':
      brick(50, 60, 13, 12, 4, '#9c6340');
      for (const [y, width] of [[59, 29], [48, 24], [36, 19], [24, 13]]) {
        path([[56, y - 20], [56 + width, y], [56, y + 8], [56 - width, y]], color);
        path([[56, y - 20], [56 + width, y], [56, y + 8]], '#10261758', 'transparent');
        for (const [i, dx] of [-0.67, -0.2, 0.28, 0.67].entries()) oval(56 + dx * width, y + 1 - Math.abs(dx) * 7, 2.4, 2.3, [gold, '#ff9494', '#d2f8df', gold][i]);
      }
      star(56, 13, 9.6);
      break;
    case 'wrappedGift':
      brick(25, 35, 50, 32, 12, color);
      brick(22, 29, 56, 10, 12, color);
      box(46, 29, 9, 38, gold);
      path([[46, 29], [58, 23], [67, 23], [55, 29]], gold);
      oval(46, 22, 9, 4.5, gold);
      oval(64, 21, 9, 4.5, gold);
      oval(55, 23, 4.2, 3.3, '#fff0b5');
      break;
    case 'bauble':
      oval(56, 46, 23, 22, color);
      oval(49, 36, 8, 5.2, '#fff7e34c');
      path([[34, 44], [45, 49], [56, 50], [67, 49], [78, 44]], null, gold, 3);
      box(49, 20, 14, 10, gold);
      oval(56, 16, 5.2, 5.3, gold);
      oval(56, 16, 2.7, 2.8, dark);
      break;
    case 'starTopper':
      brick(52, 55, 8, 15, 3, gold);
      star(57, 39, 29, color);
      star(57, 39, 18);
      break;
    case 'pineGarland':
    case 'holidayWreath': {
      const wreath = form === 'holidayWreath';
      for (let i = 0; i < 19; i++) {
        const a = i * Math.PI * 2 / 19;
        const x = wreath ? 56 + Math.cos(a) * 24 : 16 + i * 4.45;
        const y = wreath ? 41 + Math.sin(a) * 22 : 44 + Math.sin(a) * 5;
        oval(x, y, wreath ? 8.2 : 7, 7, i % 3 ? color : pine);
        if (i % 3 === 1) oval(x + 1, y + 1, 3, 2.8, '#d44e5d');
      }
      bow(56, wreath ? 59 : 49, 7);
      break;
    }
    case 'candyCane':
      ctx.lineCap = 'round';
      path([[62, 69], [62, 29], [60, 21], [52, 16], [43, 18], [38, 25], [38, 32]], null, color, 13);
      for (const [x, y] of [[62, 60], [62, 48], [62, 36], [60, 23], [48, 17], [38, 27]]) {
        path([[x - 4, y + 3], [x + 4, y - 3]], null, white, 4.3);
      }
      break;
    case 'ribbonBow':
      bow(56, 38, 23, color);
      break;
    case 'stocking':
      brick(35, 20, 22, 39, 5, color);
      brick(36, 47, 40, 17, 5, color);
      oval(74, 55, 8, 9, '#ead3a5');
      brick(31, 16, 31, 13, 5, white);
      star(48, 39, 7);
      break;
    case 'fireplace':
      brick(18, 61, 73, 8, 7, '#8c8378');
      box(31, 31, 53, 31, '#291d20');
      for (const x of [22, 73]) for (let i = 0; i < 4; i++) brick(x, 27 + i * 8.4, 13, 7, 4, i % 2 ? color : '#9e6045');
      brick(18, 23, 72, 8, 7, '#af805b');
      path([[23, 31], [88, 31]], null, pine, 4);
      bow(56, 31, 4);
      path([[43, 59], [45, 48], [52, 52], [58, 40], [64, 49], [68, 59]], '#f3a561');
      path([[54, 60], [59, 48], [62, 60]], '#ffe2a1');
      break;
    case 'fairyLights':
      path([[14, 30], [26, 39], [40, 46], [56, 48], [72, 46], [86, 39], [98, 30]], null, pine, 3);
      for (const [i, [x, y]] of [[19, 35], [31, 42], [44, 47], [56, 48], [68, 47], [81, 42], [93, 35]].entries()) {
        box(x - 2, y, 4, 4, color);
        oval(x, y + 7, 3.8, 5, [gold, '#ffabb0', '#b3f3d9'][i % 3]);
      }
      break;
    case 'candles':
      oval(56, 65, 26, 8, gold);
      candles(49, 61, 34);
      candles(34, 63, 25);
      candles(64, 63, 19);
      break;
    case 'snowflake':
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const point = (r, s = 0) => [56 + r * Math.sin(a) + s * Math.cos(a), 41 - r * Math.cos(a) + s * Math.sin(a)];
        path([point(0), point(29)], null, color, 4.6);
        path([point(23, -8), point(15), point(23, 8)], null, color, 3.9);
      }
      oval(56, 41, 6, 6, white);
      break;
    case 'holidayRug':
      for (let i = 0; i < 10; i++) {
        path([[23 + i * 6.4, 58], [18 + i * 6.4, 65]], null, white, 2);
      }
      path([[16, 59], [36, 30], [98, 30], [79, 59]], color);
      path([[23, 55], [39, 34], [91, 34], [76, 55], [23, 55]], null, gold, 1.6);
      for (const x of [40, 57, 74]) star(x, 44, 7, white);
      break;
    case 'snowman':
      path([[22, 49], [36, 46], [47, 51], [63, 51], [77, 46], [91, 41]], null, '#a57553', 3.7);
      oval(55, 57, 22, 15, color);
      oval(55, 40, 16, 13, color);
      oval(55, 26, 13, 12, color);
      oval(55, 35, 14.8, 4.2, red);
      box(62, 36, 6, 11, red);
      box(44, 8, 23, 13, dark);
      oval(55, 20, 16, 3.7, dark);
      oval(51, 25, 2, 2, dark);
      oval(61, 25, 2, 2, dark);
      path([[57, 28], [71, 30], [58, 32]], '#ef9668');
      for (const y of [45, 53, 62]) oval(55, y, 2, 2, dark);
      break;
    case 'gingerbreadHouse':
      brick(28, 44, 48, 24, 11, color);
      path([[24, 46], [52, 19], [81, 45]], color);
      path([[52, 19], [67, 12], [94, 36], [81, 45]], '#935b43');
      path([[24, 45], [52, 19], [81, 45], [94, 36]], null, white, 5.1);
      for (const x of [37, 64]) box(x, 48, 9, 10, '#ffe3b3');
      box(49, 53, 12, 15, red);
      for (const [x, y] of [[36, 34], [45, 26], [58, 25], [69, 36]]) oval(x, y, 2.3, 2.4, red);
      break;
    case 'sleigh':
      path([[24, 65], [72, 65], [86, 59], [90, 47]], null, gold, 4.7);
      path([[23, 34], [29, 22], [39, 26], [47, 40], [67, 43], [78, 34], [87, 36], [78, 56], [31, 56]], color);
      path([[24, 33], [29, 22], [39, 26], [48, 40], [67, 43], [78, 34], [86, 36]], null, gold, 3);
      star(52, 48, 6);
      break;
    case 'toyTrain':
      brick(21, 52, 63, 7, 7, dark);
      brick(22, 35, 24, 17, 9, pine);
      brick(20, 30, 29, 7, 9, color);
      box(29, 39, 11, 10, '#edcf84');
      brick(45, 40, 36, 12, 6, color);
      oval(81, 46, 7, 7, gold);
      brick(72, 27, 6, 13, 3, dark);
      for (const x of [29, 47, 66]) { oval(x, 61, 7, 7, dark); oval(x, 61, 3.4, 3.4, gold); }
      break;
    case 'jingleBell':
      oval(56, 14, 8, 7, gold);
      path([[33, 56], [41, 41], [43, 25], [56, 21], [69, 25], [71, 41], [79, 56]], color);
      oval(56, 56, 24, 6, gold);
      oval(56, 62, 5.6, 5.4, '#ac7c41');
      bow(56, 23, 7);
      break;
    case 'reindeer':
      for (const [x, y] of [[26, 58], [39, 56], [61, 58], [69, 55]]) box(x, y, 7, 14, '#79563d');
      brick(23, 42, 46, 17, 7, color);
      box(59, 31, 12, 20, color);
      brick(59, 27, 25, 15, 4, color);
      box(63, 43, 10, 5, red);
      oval(85, 36, 5.4, 4.6, red);
      oval(77, 30, 2, 2, dark);
      path([[63, 26], [61, 14], [54, 11], [52, 5]], null, gold, 3.4);
      path([[72, 26], [71, 14], [78, 8], [81, 3]], null, gold, 3.4);
      break;
    case 'toyDrum':
      box(29, 28, 54, 34, color);
      oval(56, 62, 27, 8, gold);
      path([[30, 34], [38, 60], [47, 34], [56, 64], [65, 34], [73, 61], [82, 34]], null, white, 2);
      oval(56, 32, 27, 10, gold);
      oval(56, 29, 25, 9, white);
      path([[41, 26], [70, 31]], null, '#a67244', 3);
      path([[70, 23], [42, 32]], null, '#a67244', 3);
      break;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

