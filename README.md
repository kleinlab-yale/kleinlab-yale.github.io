[README.md](https://github.com/user-attachments/files/25271318/README.md)
# KLAY Lab Website Template

A stylish, editable static website template for **Klein Lab at Yale (KLAY)**.

## Files

- `index.html` - page structure and all primary site content (people, publications, tools, news)
- `styles.css` - visual design, layout, and responsive behavior
- `script.js` - small interactions only (menu, reveal animation, copyright year)

## Quick customization

1. Edit headline copy, research themes, people, publications, tools, news, and contact info in `index.html`.
2. Optional: change colors in CSS variables at the top of `styles.css`.

## Manual Instagram Update (Personal Account)

If your Instagram is a personal account, this template uses a manual 5-card feed:

1. Replace image files in `images/instagram/`:
   - `post-1.svg` ... `post-5.svg` (you can use `.jpg`/`.png` too)
2. In `index.html`, in the Instagram section:
   - update each card `href` to the specific Instagram post URL
   - update each card `img src` to your matching local image file
3. Keep the account button linked to your profile:
   - `https://www.instagram.com/kleinlab_yale/`

## Instagram Single-File Update (Current Setup)

You can now update the Instagram feed by editing only:

- `instagram_links.js`

Format:

```js
window.instagramFeedItems = [
  { postUrl: "https://www.instagram.com/p/POST_ID/", caption: "Hover text here" }
];
```

Notes:
- `postUrl` can be either `/p/.../` or `/reel/.../`.
- `caption` is the white text shown on hover.

## Local preview

Open `index.html` directly in your browser, or run a local server:

```bash
python3 -m http.server 8000
```

Then go to `http://localhost:8000`.

## Easiest upload (no terminal)

1. Create a new empty repository on GitHub.
2. Open the repo page, click **Add file -> Upload files**.
3. Drag in these 4 files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`
4. Commit directly to `main`.
5. Go to **Settings -> Pages**, set:
   - **Source:** Deploy from a branch
   - **Branch:** `main` and `/ (root)`
6. Save and wait 1-3 minutes for your site URL.

## Deploy to GitHub Pages

From this folder:

```bash
git init
git add .
git commit -m "Initial KLAY website template"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO>.git
git push -u origin main
```

Then in GitHub:

1. Open your repository.
2. Go to **Settings -> Pages**.
3. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` and `/ (root)`
4. Save. Your site will publish in about 1-3 minutes.

Your URL will be one of:

- `https://<YOUR-USERNAME>.github.io/<YOUR-REPO>/` (project site)
- `https://<YOUR-USERNAME>.github.io/` (if repo name is `<YOUR-USERNAME>.github.io`)

## Next edits you may want

- Add real photos (PI, team, lab spaces)
- Add a full publications page
- Add a detailed "Open Positions" section
- Connect a custom domain later (optional)
