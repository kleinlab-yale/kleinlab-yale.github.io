# Klein Lab at Yale website

Live site: https://kleinlab-yale.github.io/

Repository: https://github.com/kleinlab-yale/kleinlab-yale.github.io

Working folder: `/Users/daryl/Documents/ChatGPT/website`

The previous source folder is `/Users/daryl/Documents/4/codex/github`. This checkout was restored from the current GitHub repository, which has newer files. Use this working folder for future updates.

## Everyday updates

The homepage reads these editable files. Changes to them appear after GitHub Pages publishes the commit and the visitor refreshes the page.

| What to change | File |
| --- | --- |
| Lab photos and captions | `content/lab.json` |
| News items | `content/news.json` |
| Research tools and app links | `content/tools.json` |
| Lab members, roles, portraits, profile links | `content/people.json` |
| Photo uploads | `images/uploads/` |
| Research text, PI biography, alumni, publications, contact information | `index.html` |
| Design | `styles.css` |
| Editor configuration | `.pages.yml` |

There is no new framework, package installation, or custom server to maintain. The site stays on GitHub Pages. `content.js` renders text safely and retains the static HTML content if a JSON request fails. The HTML fallbacks are a snapshot; refresh them when making source changes. Routine editor updates use the JSON content. JSON errors are reported in the browser console.

## Editor access

Pages CMS is connected to the repository. The photo upload and caption-save workflow was checked on the draft branch, including saving with no optional link. The temporary test entry was removed before publication.

For setup on a new account or browser:

1. Publish this prepared update, including `.pages.yml`, `content.js`, all four `content/*.json` files, the updated HTML/CSS/JS, and `images/uploads/.gitkeep`.
2. Open https://app.pagescms.org and sign in with the GitHub account that owns this repository.
3. Install/authorize the Pages CMS GitHub App for **only `kleinlab-yale.github.io`**.
4. Open `kleinlab-yale/kleinlab-yale.github.io` and select `main`.
5. The configured forms are **Lab photos**, **Lab news**, **Research tools**, and **Lab members**.

The editor is a separate service. Its GitHub sign-in and authorization are completed by the repository owner. Use the `main` branch for updates to the public website.

Official setup guide: https://pagescms.org/docs/quick-start/

## Add a photo from your phone

After setup, open Pages CMS in your phone browser (you can bookmark it).

1. Open **Lab photos** and add an item under **Photos**.
2. Select/upload a photo, add a caption, and write a short image description for screen readers.
3. Optionally add a date and a related link. Put the newest entry first.
4. Save the changes. The editor commits to GitHub; wait for GitHub Pages to finish publishing, then refresh the site.

Use JPG/JPEG, PNG, WebP, GIF, or AVIF. Convert HEIC to JPEG before upload; HEIC is deliberately excluded because it is not consistently supported by browsers. Resize large phone photos to about 1600–2000 pixels across when practical. Images are displayed in 4:3 frames.

Photos saved in Pages CMS appear in the full gallery at https://kleinlab-yale.github.io/lab-photos.html. Add new photos at the end of the editor list; the site displays them newest-first. The homepage shows only the latest two, with a link to the complete gallery.

## Local preview

Run from this folder:

```sh
python3 -m http.server 8849 --bind 127.0.0.1
```

Open http://127.0.0.1:8849. Use the server rather than opening the HTML file directly; browsers restrict local-file JSON requests. Stop the server with Ctrl+C when finished.

## Publishing and repository scope

The public website publishes from `main`. Source changes can be prepared on `codex/website-refresh`; publish them to `main` after validation. MIXA has two launch buttons: https://kleinlab-yale-mixa.streamlit.app/ and https://huggingface.co/spaces/Ewaldssphere/MIXA_beta0.3. Both buttons appear only in the Tools section, alongside the other lab tools. The introduction focuses on the lab, followed by the lab-life photo section. Both addresses and button labels are editable under Research tools.

This is a sparse checkout: the root website files and `images/` are present. The same repository also hosts independent apps and games. Their folders remain in GitHub and are not part of this homepage refresh. Do not replace the entire repository with this local folder. Commit only the intended website changes.

Before publishing source changes, fetch the latest `main` and reconcile any newer changes, including edits made in Pages CMS. Use an authenticated Git client or the GitHub editor/upload interface. Credentials belong in your local credential manager, not this repository.

## Validation

- Check JavaScript syntax with `node --check script.js` and `node --check content.js`.
- Validate all `content/*.json` as JSON, and check `.pages.yml` as YAML.
- Preview desktop and phone layouts, verify both MIXA buttons open their respective apps, and test the photo gallery.
- Existing scientific copy and research-tool destinations are preserved; MIXA now offers both Streamlit and Hugging Face.

## Large phone photos (413 upload errors)

The hosted Pages CMS upload endpoint has a hosting request-size limit. This cannot be raised in `.pages.yml`. Before uploading a large photo, open https://kleinlab-yale.github.io/prepare-photo.html on your phone. Choose the photo, tap Save photo and choose Photos or On My iPhone, then select that saved copy in the CMS uploader.

The preparation page runs in the browser. It caps the longest image edge at 1800 pixels and outputs a JPEG no larger than 1.8 MB. It does not upload or publish a photo. The original stays unchanged. Formats that the browser cannot decode show an error; convert those to JPEG first.

## Photo edits and games

The photo preparation page supports original, square, landscape, portrait, and wide crops. Select a shape, zoom, and drag the preview or use the position sliders. Choose a filter, then tap Save photo, choose Photos or On My iPhone, and upload that copy in CMS. Reset edits returns to the original crop and color. The downloaded file includes the crop and filter, capped at 1800 pixels and 1.8 MB.

The Games section links to Chessmate, Town Lyfe, and Mummy 1971. Edit titles, descriptions, and links in the Games form in CMS (`content/games.json`).

## Saving edited photos on iPhone

The main Save photo button opens the native share/save sheet when the browser supports sharing JPEG files. Choose Save Image / Save to Photos, or Save to Files and select On My iPhone. Cancellation does not trigger a download. If file sharing is unavailable or fails, the page displays the edited image for touch-and-hold saving. A separate download option remains available; Safari's download location must be set to On My iPhone for local storage. The website cannot select the OS destination or change iCloud Photos synchronization.

## Public developer credits

Credit tools, games, and other developed resources to **KLAY** (Klein Lab at Yale). Avoid personal developer credits naming Daryl Klein.
