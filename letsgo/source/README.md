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

Start in **Explore** to walk and orbit the camera. Select **Place** or pick a brick from the tray, then tap or click a surface to build. Choose **Rotate**, **Paint**, or **Remove** and tap a placed brick to edit it. **Undo** reverses your recent edits. Use **Turn next piece** in **Parts & colors** to orient a part before placing it.

Open **Parts & colors** and choose a **Build kit**. Shrine & treehouse, Blossom tree, Boat & dock, and Tea garden load matching materials and populate your quick tray. Pick a color for new bricks or choose **Paint placed bricks** to recolor existing ones. **Show all colors** opens the full palette. **Match a brick in the world** copies the shape and color of any brick you tap. Open **Objects** for the tea counter, lanterns, and the boat workshop.

Use **Camera** to cycle between third person, wide, and first person. **Customize** in the top bar opens presets and separate controls for your character’s face, hair, and clothes. Drag the preview to turn your character, or switch to Face close-up to see your expression. Your appearance is saved in your browser and shared with your co-op partner.

Use Space to jump, 1–7 to select a brick, R to rotate, Z to undo, V to change the camera, and Escape to pause.

Choose **Island voyage** and **Show dock direction** to find the south dock. At the workshop, load the simple raft or connect your own planks on the hull grid. Sail with the regular movement controls and follow the island marker. Holes and loose planks shorten your range. Reinforce a connected hull to reach Lantern Island. A sinking returns you to the dock with your design saved. You can use the return button after reaching either island.

Follow the marker on Lantern Island and choose **Rescue Mochi** near the lost puppy. Mochi follows you on land and rides aboard your boat. Each player’s rescue saves in their browser and travels with them between solo and co-op games.

Walk up to the tea counter in the High Pavilion, or build one from **Objects**. Choose **Brew tea**, wait for the tea to steep, then choose **Serve tea**.

For two players, choose **Play together**, then **Create room**. **Message a friend** opens the device’s share menu when supported. **Copy invite link** copies a link that fills in the room code for your friend. Your friend can also enter the six-character code manually. Keep the host tab open during play. The host’s browser saves the shared edits. Players need no accounts or keys. The game uses WebRTC and the [shared PeerJS Cloud service](https://peerjs.com/server/cloud) for room discovery and connectivity. Access depends on the service and the players’ networks.

Guests can place bricks and rotate, paint, remove, or undo changes to the ones they place during that visit. The host can edit the whole world. Guest builds become part of the host’s saved world. Only the host can change those builds on later visits.

## Host on GitHub Pages

1. Push this project to the `main` branch of a public GitHub repository for free GitHub Pages hosting.
2. In the repository’s **Settings → Pages**, choose **GitHub Actions** under **Build and deployment → Source**.
3. In **Actions**, run **Deploy LetsGo**. Subsequent pushes to `main` deploy automatically. The deployment view shows the game URL.

The workflow builds the static `dist/` site. The production bundle uses relative paths, so it works under a GitHub Pages repository URL. Multiplayer is configured by default. A different PeerServer can be selected at build time with `VITE_SIGNAL_HOST`, `VITE_SIGNAL_PORT`, `VITE_SIGNAL_PATH`, and `VITE_SIGNAL_SECURE`.

To update the game in an existing Pages site, run `npm run build` and copy the contents of `dist/` into the game’s published folder. The LetsGo deployment keeps the editable project in `letsgo/source/`.
