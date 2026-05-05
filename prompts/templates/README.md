# Prompt Templates

Local prompt template seed files live here.

Current starter templates:

- `observable_only.json`
- `boxing_structured.json`
- `coach_summary.json`

## Template Roles

- `observable_only.json`
  - Most conservative option
  - Best when you want strict visible-only notes with minimal interpretation
  - Good for checking whether the model is overclaiming

- `boxing_structured.json`
  - Default test template
  - Best current option for structured beginner boxing feedback
  - Best current candidate for normalized parsing and UI review

- `coach_summary.json`
  - Short supportive coaching-style feedback
  - Should stay grounded in visible evidence without becoming overly technical

## Claim Discipline

Across all templates, the model should:

- analyze only what is clearly visible
- avoid guessing hidden details or off-camera events
- avoid naming exact punch types unless visually clear
- avoid assuming a partner, target, or exchange unless clearly visible
- avoid technique judgments when the camera angle or visibility is too limited
- explicitly say when uncertainty comes from framing, blur, speed, or occlusion

## Default Evaluation Template

`boxing_structured.json` is the default evaluation template because it is designed to:

- produce the most stable structured output
- give beginner-appropriate technical feedback
- make overclaiming easier to spot
- work best with the current normalized parser

## How Uncertainty Should Be Expressed

When the clip is incomplete or ambiguous, the model should:

- prefer uncertainty over overclaiming
- place caveats in `notes`
- describe a movement more generally instead of forcing an exact punch label
- leave list fields empty rather than inventing details

Each JSON file is synced into the `prompt_templates` table by `key`.
