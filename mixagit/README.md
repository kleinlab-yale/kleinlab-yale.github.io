# MIXA — MixaGit upload folder

This `MixaGit` folder contains **98 ordinary files in total**, counting all subfolders and the hidden `.streamlit/config.toml` file. There are no ZIP archives or archive launchers in this folder. Version: **0.5.11-preview**.

## Upload to GitHub and run on Streamlit

1. Drag this entire **MixaGit** folder into the GitHub repository used by your Streamlit app, then commit the upload. If you are already inside an existing `MixaGit` directory on GitHub, upload this folder's contents there so you do not create a second nested copy.
2. If you are selecting individual contents on a Mac, **Command–Shift–period** shows the hidden `.streamlit` folder.
3. Use **MixaGit/app.py** as the Streamlit entrypoint when this folder is at the repository root. If this folder's contents are directly at the repository root instead, use **app.py**. The original **mixa_app.py** entrypoint is also available.
4. Reboot the Streamlit app once after replacing an earlier deployment.

Directory names are case sensitive on the deployment server: this folder is named **MixaGit**, with capital M and G. If the previous path was `mixagit/app.py`, update the Streamlit entrypoint to match `MixaGit/app.py` when switching to this folder name.

Streamlit installs the dependencies listed in `requirements.txt`. For a deployment from a subfolder, keep any existing repository-root `.streamlit/config.toml` configuration; Streamlit reads its configuration from the repository root. The runtime declaration is also retained from the source release.

## Included functionality

- All 27 original Python modules and entrypoints, including every fitting model, transport model, uncertainty analysis, figure generator, and CLI.
- The complete MCAM LM411, laminin alpha4 LG1–3, and alpha6beta1 competition datasets, with all three existing repeats and the saved fit caches used by the app.
- The additional bundled sample and raw benchmark datasets.
- User guide, model and methods documentation, benchmark records, and the source/documentation download feature.
- Dynamic fit, residual, figure, data, Prism, and robustness exports.
- The existing combined and individual schematic panels in PDF, SVG, and PNG format.
- The contact/transport regression test, validation runner, and reference results.

The 27 Python modules and the fitting data are copied without modification from source commit `94aa7e2fbf8913880af32397d05b01073c875109`. This folder is a deployment subset; the larger development checkout retains the full test suite, offline audit runners, historical publication exports, and changelogs. Duplicate native fit caches and unused instrument summary tables are omitted. The app uses the same existing portable `.b64.txt` fit caches directly.

The source download lists any omitted optional development or historical files in its release manifest. No archive extraction is needed to start this app.

See `USER_GUIDE.md` for the fitting workflow and `CONTACT_TRANSPORT.md` for the MCAM contact/transport model and its assumptions.
