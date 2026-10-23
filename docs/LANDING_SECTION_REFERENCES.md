# Landing section refinements

21 October 2026. Preserve Axyro's existing black/orange identity and adapt
section composition from references, using Axyro's own copy and imagery.

## References and adaptation

- [Glide setup workflow on Unsection](https://www.unsection.com/section/glide-setup-workflow-feature-section): compact visual examples above three sequential explanations. Axyro's existing plan explanation now shows priorities, availability, and a guided session in three columns on desktop and a single ordered column on mobile. Static previews are labeled as examples and do not impersonate working controls.
- [Glide construction CTA on Unsection](https://www.unsection.com/section/glide-construction-reporting-cta-section): contextual imagery gives the closing action a concrete product setting. Axyro uses an existing exercise poster beside its closing message, with separate readable text and image areas. The plan action remains primary, with the existing free starter offered as a secondary path.

No third-party images, code, logos, quotes, or customer claims were imported.
The existing preview interactions, membership rules, and destination routes are
unchanged. The redundant landing-only skip link was removed because the shared
layout already supplies one.

## Verification

`tests/e2e/landing.spec.ts` covers both sections at 320px and 1280px, checks the
three-step structure, action destinations, overflow, and automated accessibility,
and follows the free-workout link. Visual checks additionally use a 390px phone
viewport. Existing landing tests cover animation, reduced motion, the editable
schedule example, and the exercise preview.
