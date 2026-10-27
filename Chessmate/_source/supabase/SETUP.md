# Connect Chessmate accounts

The website stays on GitHub Pages. Supabase supplies authenticated login, room ownership, saved progress, invitations, and live game data. This copy is connected to the configured project, with the schema installed and username login enabled. The instructions below document the setup for future rebuilds or a new project.

## 1. Create the backend

Create a new Supabase project in a **Free-plan organization** in your own account. Keep the project on Free; no paid subscription or add-on is needed. In its SQL editor, run the complete contents of `schema.sql` once. It creates only Chessmate's `cm_*` tables, row access policies, and authenticated functions. The script is transactional; an error rolls the whole setup back. Do not rerun it over existing Chessmate tables.

## 2. Configure username login

Players enter **their name and a password**. The same name identifies their player and room. No email address, phone number, Google account, or other outside account is collected from them. Their username is also their room name.

When creating the Supabase project, select:

| Setting | Choice |
|---|---|
| Enable Data API | On |
| Automatically expose new tables | Off |
| Enable automatic RLS | On |

The SQL explicitly grants API access and defines row policies. Automatic exposure is unnecessary. See [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

In **Authentication → Sign In / Providers → Email**:

1. Enable the email/password provider. Supabase's API calls this “Email,” but Chessmate uses it only as a password-backed username service.
2. Turn **Confirm email off** for this dedicated Chessmate project. No player inbox exists; no email confirmation, OTP, magic link, or email password reset is used.
3. Set the minimum password length to **8** characters. Keep email notification options off. Leave social, phone, and anonymous providers disabled.
4. Allow new-user signup so players can create their own rooms.

Set the Site URL to `https://kleinlab-yyale.github.io/Chessmate/`. No OAuth app, SMTP service, paid domain, or separate Google setup is needed.

Implementation detail for the organizer: the client maps `emma` to `emma@players.chessmate.invalid` as a non-deliverable internal Auth identifier. This is not a real email address and is never represented as a verified personal identity. Supabase handles password hashing and sessions. A database trigger derives the username from that identifier and reserves its room in the same transaction as account creation. Invalid namespaces, duplicate names, and later username changes are rejected. This schema is for a new, dedicated Chessmate project.

This uses Supabase's [password authentication](https://supabase.com/docs/guides/auth/passwords) with [email confirmation disabled](https://supabase.com/docs/guides/auth/general-configuration). The `.invalid` alias is Chessmate's adapter, not a native Supabase username field. No paid email-delivery service is required.

The current [Supabase Free plan](https://supabase.com/pricing) is $0. Supabase states that Free-plan users [are not charged for overusage](https://supabase.com/docs/guides/platform/cost-control); sustained excess usage can restrict service. An inactive free project can pause after one week and needs to be resumed in the dashboard. These are service limits, not an unlimited-hosting promise. Plan terms can change.

## 3. Connect the website

Copy the project URL and the **publishable key** (or legacy public `anon` key). These are browser-safe values protected by the database policies. Never use a secret or `service_role` key.

Edit `public/chessmate-config.js` in the source project:

```js
window.CHESSMATE_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'YOUR_PUBLIC_KEY'
};
```

Run `pnpm build` and `pnpm package:pages`. Alternatively, edit `chessmate-config.js` directly in the prepared `release/Chessmate` folder before uploading it; make the same change in the source configuration for future rebuilds.

## 4. Verify before replacing the live app

1. Create two Chessmate accounts in separate browser profiles or devices, using only a name and password. Reserve distinct names such as `emma` and `lily`. Use different accounts, not two tabs sharing one login.
2. Sign in as Emma. **My room & friends** should show her room online immediately.
3. Open Emma's invitation on the other device or join `emma` by name. Lily should appear under **At your door**. No game should start until Emma clicks **Play**.
4. Exchange moves and chat, finish the game, and return to the room. Verify both accounts have the result, saved friend, and expected progress.
5. Sign out and sign back in on another device. Verify the same room name, avatar, XP, wardrobe, and history return. A second account must not be able to claim the same room name.
6. Send an invitation to the offline friend; sign in as that friend and verify the invitation appears. Open `room.html?room=emma` while Emma is offline and confirm the room remains identifiable.
7. Refresh during an active game and verify the move history resumes. Test signing back in with the same username and password and your phone's native sharing flow.

The packaged SQL has passed tests against an embedded PostgreSQL engine. Hosted username authentication and the account/room/game database flow passed a live integration check in the configured project. The above checklist also covers physical-device browser behavior.

## Forgotten passwords

The child-facing help directs the player to their parent or club organizer. There is no self-service email reset. The organizer can reset a password after checking the request with the parent, keeping the same room and progress.

From the source project on the organizer's own computer, run:

```sh
node scripts/reset-player-password.mjs
```

The utility prompts for the username, project URL, an organizer **secret/service-role key**, and the new password twice. Key and password prompts hide input. Credentials are used only in memory and are not saved to a file, command history, or the website. You can also supply the URL through `CHESSMATE_SUPABASE_URL` and the admin credential through `CHESSMATE_ADMIN_KEY` in a trusted process environment.

Only the organizer runs this tool. Never put the admin key in `chessmate-config.js`, send it to the player, or add it to GitHub. The browser never gets admin access. This uses Supabase's [server-side password reset operation](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid). No actual password resets have been performed during development.

## Data and operating behavior

- Public room cards expose display name, avatar, outfit, rating, room name, and presence. Internal login identifiers and password hashes are managed by Supabase Auth and are not in these cards. No child email addresses are collected.
- Only the account owner can read their progress or friend list. Waiting lists, match data, chat, and invitations are limited to their participants.
- A home room name remains reserved when offline. Presence expires after 45 seconds without a heartbeat. Guests remain in a live waiting list while their page is open; abandoned requests expire after 60 seconds. A room holds up to eight waiting guests.
- Invitations remain stored; the UI shows invitations from the last 24 hours. These are in-app invitations, not email/SMS or push notifications.
- Saving uses revision checks to prevent a stale device from overwriting newer progress. If a conflict or network error occurs, the page shows an unsaved warning. Download the current profile from Settings before reloading; this first version does not automatically merge simultaneous play from multiple devices.
- Chessmate is a casual app. Account and room access is enforced on the server, and multiplayer events enforce membership, turn order, and prior board state. Full chess legality, reward computation, and terminal-result detection run on the client; this is not an anti-cheat or competitive rating service.
- Active games resume from stored moves. Chat messages are stored for participants but are not yet restored into the chat panel after refresh. Outcomes are saved by each connected client; finishing while the other device is offline is not yet reconciled into that absent player's progression.
- Older browser-local profiles are preserved in local storage but are not silently attached to a new authenticated account. There is no automatic migration/import of those unverified scores.
