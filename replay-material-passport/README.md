# RE:PLAY - Material Passport

An AI-assisted intake prototype for found parts used in a reconfigurable play-furniture project.

## What it does

- registers a photo and a minimum material passport for each salvaged component
- classifies components as `LINEAR`, `PLANAR`, or `TEXTILE`
- checks whether a part sits inside the project’s compatibility envelope
- generates a structured prompt for image analysis in ChatGPT
- lets the user paste the returned JSON as a draft, then manually validate the passport
- stores all cards in the browser and exports the inventory as JSON

## Important limitation

The AI draft is not an engineering assessment. It must not be used to infer load capacity, exact dimensions, hidden damage, or child-safety suitability. All dimensions and condition labels require human verification.

## Run

Open `index.html` in a modern browser. No build step or API key is needed for V0.

## V0 compatibility envelope

| Family | Rule |
| --- | --- |
| LINEAR | diameter 18-30 mm, length 300-900 mm |
| PLANAR | thickness 9-18 mm, maximum side 600 mm |
| TEXTILE | width 300 mm or more |

The envelope is a design hypothesis, not a safety certification.

## Next version

1. Select two admitted parts.
2. Recommend a `GRIP`, `REST`, or `TENSION` interface template.
3. Output a parameter sheet or cut-file for a reclaimed-sheet connector.
