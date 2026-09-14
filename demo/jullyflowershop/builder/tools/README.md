# Development helpers

The app itself needs no tooling. Open `index.html` or deploy the complete folder.

- `bundle-assets.py`: rebuild and validate the embedded RGBA WebP bundle after changing runtime assets. Run `python3 tools/bundle-assets.py` from the project folder. Without rebuilding, the offline bundle can still display old artwork.
- `prepare-v6-art.py`: reproducible source-aligned Classic crop/neck preparation and measured head alpha radii. Requires Python, Pillow and NumPy. Uses `originals/existing-library/` and `artwork/working-png/`; regenerate only from reviewed matching source images and metadata. Then rebuild the bundle.
- `package.py`: verify local references, JavaScript syntax, image decoding, embedded bytes, test evidence and ZIP integrity. Run `python3 tools/package.py --output ../nebula-bouquet-builder-v6.zip`.

Other retained preparation tools document earlier asset work; do not rerun them blindly against v6 or assume old v5 tests certify this release. New artwork needs reviewed crop/anchor metadata and matching Classic/head identity.

`tests/v6/run-functional.cjs`, `run-native.cjs` and `run-edge.cjs` require Playwright and an existing authorized Chromium CDP connection in `AGENT_BROWSER_CDP`. They connect to that browser, create/close only their own test contexts, and never launch or close the shared browser. Default project root is discovered from the test file; optionally set `NEBULA_TEST_ROOT`. Tests inspect synthetic draft links without sending external communications.

Review `TEST-REPORT.md` for actual run results and limitations. Screenshots and measured JSON are included for repeatable visual checks, not as a physical-assembly certification.
