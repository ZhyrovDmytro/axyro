# Frontend Design for Veyro

Installed on 31 October 2026 for Codex in this repository. The app currently uses
Axyro as its display name. This setup preserves that name and the current visual
system.

## What it does

Anthropic's [Frontend Design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
provides instructions for deliberate typography, color, layout, motion and copy.
It encourages a design plan grounded in the product, a review against the brief,
and visual critique during implementation. It is agent guidance, not a component
library, Figma integration or additional model/service.

## Installation performed

1. Inspected the upstream skill and its license, Veyro's package manifest,
   design tokens, landing documentation and navigation conventions.
2. Used Codex's bundled skill installer with `--repo anthropics/skills`,
   `--path skills/frontend-design` and `--dest` set to this repository's
   `.agents/skills` directory. The installed folder contains the upstream license.
3. Adapted `SKILL.md` in place. The Veyro scope takes precedence over its general
   aesthetic guidance; modified content is identified in the file.
4. Added a narrow `.gitignore` exception for this skill so it can be committed
   and shared with the team. Other local agent tooling stays ignored.
5. Validated the skill frontmatter and checked its local references. No application
   code, runtime dependencies or global Codex settings were changed.

## Local adaptation

- Preserve charcoal/orange tokens, current type and established components.
- Optimize for a phone near someone exercising: readable timers and accessible
  controls, quick starts and minimal interaction.
- Protect player progression, speech/media handling and structured workout data.
- Follow the existing 40-exercise catalog and 5/10/20-minute session contract.
- Reuse Next.js, React, TypeScript, Tailwind and existing CSS modules; avoid adding
  visual dependencies or fonts merely for novelty.
- Use a brief visual decision for small edits; reserve a full design plan for
  substantial work. Require relevant browser verification when changing UI.

The skill complements the existing UI engineering and motion skills. It does not
replace repository requirements or authorize unrelated product work.

## Use it

On your next turn in this repository, select Frontend Design in Codex's skill
picker or explicitly name it in the prompt:

> Use $frontend-design to refine the workout preview for mobile. Reuse the current
> design system, improve the start-action hierarchy, and preserve session behavior.

Automatic selection remains enabled for matching UI design requests. If the new
skill does not appear, start a new chat in the Veyro project and try again.

For a teammate, commit and share `.agents/skills/frontend-design/`, the ignore
exception and this guide. After pulling the change, they can use the skill from
Codex in this repository. No Anthropic account or API key is needed for these
instruction files. This task leaves the changes uncommitted.

The local skill is a snapshot, not an automatic subscription to upstream changes.
When updating, compare against the source and preserve the Veyro adaptation and
bundled `LICENSE.txt`. The upstream folder carries Apache-2.0 terms.
