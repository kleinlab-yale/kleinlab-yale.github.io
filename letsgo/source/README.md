# LetsGo

A touch-friendly 3D brick-building sandbox in Blossom Valley. Cross the vermilion bridge, climb the stairs into the cherry tree pavilion, and rebuild the village one stud at a time. The terrain, buildings, and trees are made from editable bricks. Solo and hosted edits save in the host browser.

## Run locally

Use Node.js 22.12 or newer and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

## Play

Use the arrow keys or hold the on-screen movement buttons to walk on a computer. On a touch screen, drag the joystick. Drag the world to orbit your character. On a computer, either mouse button works for dragging. The buttons beside **Camera** turn the view a quarter turn at a time.

On an iPhone, tap **Build** to pick a piece or edit tool. The check mark takes you back to exploring. **Journal** shows the story, build packs, pets, and islands. **Menu** opens camera, audio, player, and room settings. Music and game sounds have separate switches.

Start in **Explore** to walk and orbit the camera. Pick a brick and tap or click a top or side to snap it in place. Rectangular bricks follow the direction of the brick or row you tap. Use **Turn piece** while placing to set your own orientation, or select the piece again to resume automatic alignment. Choose **Move** and drag a placed piece to a new snap point. In **Rotate**, tap to turn a piece or drag it to move it. **Paint** and **Remove** edit a piece you tap. **Undo** reverses your recent edits.

Open **Parts & colors** and choose a **Build kit**. Shrine & treehouse, Blossom tree, Boat & dock, and Tea garden load matching materials and populate your quick tray. Pick a color for new bricks or choose **Paint placed bricks** to recolor existing ones. **Show all colors** opens the full palette. **Match a brick in the world** copies the shape and color of any brick you tap. Open **Objects** for the tea counter, lanterns, and the boat workshop.

Earn the House Pack by placing six pieces, the Furnishings Pack by serving blossom tea, the Garden Lights Pack by rescuing Mochi, and the Coastal Pack by sailing to Shell Cove. Open each earned pack from the journal or the build kit picker. Tap placed doors and lights in Explore, or walk up and use their interaction button.

Choose a House Pack door that matches the width and height of your opening, then tap the floor inside the opening. Door cards show their dimensions. Set glass or lattice windows on a sill. Use roof tiles or stepped eaves along the wall tops and finish a peaked roof with capped ridge pieces.

Use **Camera** to cycle between third person, wide, and first person. **Customize** in the top bar opens presets and separate controls for your character’s face, hair, and clothes. Drag the preview to turn your character, or switch to Face close-up to see your expression. Your appearance is saved in your browser and shared with your co-op partner.

Use Space to jump, 1–7 to select a brick, R to rotate, Z to undo, V to change the camera, and Escape to pause.

Choose **Island voyage** and **Show dock direction** to find the south dock. At the workshop, load the simple raft or draw connected planks on the hull grid. Sail with the regular movement controls and follow the island marker. Holes and loose planks shorten your range. You can build a bridge to Lantern Island or sail there. Shell Cove and Cloudberry Isle lie across open water beyond the building area. A wider, longer hull reaches Shell Cove, and a reinforced hull reaches Cloudberry Isle. A sinking returns you to the dock with your design saved.

Follow the island markers to rescue Mochi the puppy, Pebble the turtle, Pip the rabbit, Nori the otter, and Juniper the fox. Choose a companion in **Journal → Pets**. Pets follow you on land and ride aboard your boat.

Walk up to the tea counter in the High Pavilion, or build one from **Objects**. Choose **Brew tea**, wait for the tea to steep, then choose **Serve tea**.

## Christmas in Blossom Valley

Play from November 25 through December 25, 2026, Eastern time, to receive three free packs in **Journal → Build packs**. Choose the Christmas Tree, Holiday Home, or Winter Village pack for 22 decorations. The Indoor Christmas tree fits on a floor or table. Use **Explore** to open presents, switch lights on or off, light the fireplace and candles, and ring a jingle bell.

Starting December 26, the game packs away holiday pieces the next time you play your world. All the seasonal pieces stay available in your **Christmas Kit**. You can place them again at any time. In co-op, the host’s save contains the shared decorations and each player keeps their own kit.

## The Lantern Trail

Talk to Keeper Aya in Building Meadow, or open **Journal → Story** and track the current objective. Look for chests around the valley and outlying islands. Examine a chest to see its rewards and required power, then send your active companion to work the lock. The keeper’s supply chest and the Reed drift chest refill with the tide. Spend earned coins in **Journal → Pets** to add three power per level.

Recover the prism at Shell Cove and turn the three rings to match the lantern’s clue. Restoring a lantern lights its signal tower and opens the next route. The harbors on Shell Cove and Cloudberry Isle launch to the outer islands once you have the charts. If a crossing fails, you return to its departure harbor with your hull design saved.

The trail unlocks the **Shipwright Pack** and the **Stargazer Pack**. The Stargazer Pack includes a working wind bell. Step up to the bell or tap it in Explore to ring it. Coins, chest rewards, pets, and story progress save in each player’s browser and follow that player into co-op.

For two players, choose **Play together**, then **Create room**. **Message a friend** opens the device’s share menu when supported. **Copy invite link** copies a link that fills in the room code for your friend. Your friend can also enter the six-character code manually. Keep the host tab open during play. The host’s browser saves the shared edits. Players need no accounts or keys. The game uses WebRTC and the [shared PeerJS Cloud service](https://peerjs.com/server/cloud) for room discovery and connectivity. Access depends on the service and the players’ networks.

Guests can place bricks and move, rotate, paint, remove, or undo changes to the ones they place during that visit. The host can edit the whole world. Guest builds become part of the host’s saved world. Only the host can change those builds on later visits.

## Host on GitHub Pages

1. Push this project to the `main` branch of a public GitHub repository for free GitHub Pages hosting.
2. In the repository’s **Settings → Pages**, choose **GitHub Actions** under **Build and deployment → Source**.
3. In **Actions**, run **Deploy LetsGo**. Subsequent pushes to `main` deploy automatically. The deployment view shows the game URL.

The workflow builds the static `dist/` site. The production bundle uses relative paths, so it works under a GitHub Pages repository URL. Multiplayer is configured by default. A different PeerServer can be selected at build time with `VITE_SIGNAL_HOST`, `VITE_SIGNAL_PORT`, `VITE_SIGNAL_PATH`, and `VITE_SIGNAL_SECURE`.

To update the game in an existing Pages site, run `npm run build` and copy the contents of `dist/` into the game’s published folder. The LetsGo deployment keeps the editable project in `letsgo/source/`.
