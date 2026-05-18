# Stitch Handoff

Place Stitch exports here so they can be reviewed and implemented into the app.

Recommended structure:

- `docs/stitch/*.zip`
  Raw exports downloaded from Stitch.
- `docs/stitch/export/`
  Unzipped project contents.
- `docs/stitch/screens/`
  Key screen PNGs or JPGs if you also export visuals separately.
- `docs/stitch/notes/`
  Any notes about which screens matter most or what changed between versions.
- `assets/stitch/`
  Design assets that should be reused directly in the app.

Suggested flow:

1. Copy the downloaded Stitch zip into `docs/stitch/`
2. Unzip it into `docs/stitch/export/`
3. Add any important screenshots into `docs/stitch/screens/`
4. Tell Codex which export/version to use

Example:

```bash
mv ~/Downloads/detect-stitch-export.zip docs/stitch/
cd docs/stitch
unzip detect-stitch-export.zip -d export
```
