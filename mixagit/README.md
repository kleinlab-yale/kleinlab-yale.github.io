# MIXA — mixagit upload folder

This `mixagit` folder contains **99 ordinary files in total**, counting all subfolders and the hidden `.streamlit/config.toml` file. There are no ZIP archives or archive launchers in this folder. Version: **0.5.13-preview**.

## Upload to GitHub and run on Streamlit

1. Drag this entire **mixagit** folder into the GitHub repository used by your Streamlit app, then commit the upload. If you are already inside an existing `mixagit` directory on GitHub, upload this folder's contents there so you do not create a second nested copy.
2. If you are selecting individual contents on a Mac, **Command–Shift–period** shows the hidden `.streamlit` folder.
3. Use **mixagit/app.py** as the Streamlit entrypoint when this folder is at the repository root. If this folder's contents are directly at the repository root instead, use **app.py**. The original **mixa_app.py** entrypoint is also available.
4. Reboot the Streamlit app once after replacing an earlier deployment.

Directory names are case sensitive on the deployment server: this folder is named **mixagit**, in all lowercase. Keep the Streamlit entrypoint at `mixagit/app.py` when using this folder name.

Streamlit installs the dependencies listed in `requirements.txt`. For a deployment from a subfolder, keep any existing repository-root `.streamlit/config.toml` configuration; Streamlit reads its configuration from the repository root. The runtime declaration is also retained from the source release.

## Included functionality

- All 27 original Python modules and entrypoints, including every fitting model, transport model, uncertainty analysis, figure generator, and CLI.
- The complete MCAM LM411, LM421, laminin alpha4 LG1–3, and alpha6beta1 competition datasets, with all three existing repeats and the saved fit caches used by the app.
- The additional bundled sample and raw benchmark datasets.
- User guide, model and methods documentation, benchmark records, and the source/documentation download feature.
- Dynamic fit, residual, figure, data, Prism, and robustness exports.
- The existing combined and individual schematic panels in PDF, SVG, and PNG format.
- The contact/transport regression test, validation runner, and reference results.

This deployment subset contains the verified MIXA 0.5.13-preview source, including LM421, the saved-fit traffic-light score, the Streamlit hot-reload repair and fixed-capacity equilibrium analysis. The larger development checkout retains the full test suite, offline audit runners, historical publication exports, and changelogs. Duplicate native fit caches and unused instrument summary tables are omitted. The app uses the same existing portable `.b64.txt` fit caches directly.

The source download lists any omitted optional development or historical files in its release manifest. No archive extraction is needed to start this app.

See `USER_GUIDE.md` for the fitting workflow and `CONTACT_TRANSPORT.md` for the MCAM contact/transport model and its assumptions.

## Fixed equilibrium capacity

In **Equilibrium Analysis**, check **Fix Rmax before fitting**, enter the capacity in input response units (for example, **0.80 nm** for the LG-only sensitivity analysis), then run the fit. Rmax stays fixed during optimization and independent-repeat refits. Results and exports record the supplied constraint; reported KD uncertainty is conditional on that value. Observed-maximum normalization is disabled while Rmax is fixed.

## LM421 dataset

Use **Load MCAM + LM421 Trimer Kinetics (3 reps)** in Data Input or the LM421 quick-switch button in Kinetic Analysis. The complete study loads LM411, LM421, LG1–3 and integrin competition. LM421 uses the same two-contact/transport model and concentration-sharing constraint as LM411, with a fitted capacity per series. Three redundant static PNG copies are outside the compact upload folder; the combined PNG and the corresponding SVG/PDF assets are retained. All fitting modules and demonstration datasets remain in the 99-file folder.
