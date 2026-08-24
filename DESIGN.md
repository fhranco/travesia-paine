---
name: Patagonian Editorial
colors:
  surface: '#faf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#faf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#516257'
  on-secondary: '#ffffff'
  secondary-container: '#d1e4d6'
  on-secondary-container: '#55675c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f27'
  on-tertiary-container: '#668995'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#d4e7d9'
  secondary-fixed-dim: '#b8cbbe'
  on-secondary-fixed: '#0f1f16'
  on-secondary-fixed-variant: '#3a4b40'
  tertiary-fixed: '#c4e8f6'
  tertiary-fixed-dim: '#a8ccd9'
  on-tertiary-fixed: '#001f27'
  on-tertiary-fixed-variant: '#284b56'
  background: '#faf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  section-gap: 120px
---

## Brand & Style
This design system embodies the rugged elegance of the Patagonia landscape through a premium, editorial lens. The target audience consists of discerning travelers seeking high-end, authentic experiences. 

The aesthetic is **Minimalist and Editorial**, prioritizing high-contrast compositions and significant negative space to allow cinematic photography to breathe. The emotional response should be one of quiet confidence, reliability, and awe. Every element is intentional, avoiding unnecessary decoration in favor of structural clarity and a "Safe" visual identity that emphasizes trustworthiness and professional curation.

## Colors
The palette is derived from the elemental textures of the Chilean wilderness. 

- **Charcoal Black (#1A1A1A):** Used for primary typography and structural anchors to ensure high contrast and authority.
- **Bone (#F9F7F2):** The primary canvas. This warm white reduces eye strain and feels more premium and organic than pure hex white.
- **Deep Forest Green (#1B2B22):** A low-vibrancy accent used for grounding natural elements and primary actions that require a sophisticated touch.
- **Glacier Blue (#A0C4D1):** Applied sparingly for subtle interactive states, highlights, or utility-based signifiers.
- **Stone Gray (#7D7D7D):** Reserved for secondary information, metadata, and delicate borders that define space without closing it in.

## Typography
The typographic system relies on a functional, systematic pair that creates a "Safe" and legible hierarchy. 

**Inter** provides a contemporary, neutral structure for headlines and labels. Large display sizes use tight tracking and heavy weights to mimic luxury editorial spreads. **Source Sans 3** is utilized for body copy, set with a generous line height (1.6 to 1.8) to ensure long-form narratives about expeditions remain inviting and easy to digest. Use `label-caps` for overlines and small category markers to add an institutional, curated feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain the integrity of editorial compositions, shifting to a fluid model on mobile.

- **Vertical Rhythm:** Use large vertical gaps (`section-gap`) between content blocks to emphasize the scale of the landscape.
- **The 12-Column Grid:** Elements should ideally span 4, 6, or 8 columns to avoid cluttered layouts. Asymmetric placements (e.g., a 7-column image paired with 3-column text and a 2-column offset) are encouraged for a premium feel.
- **Margins:** Generous outer margins prevent content from feeling "trapped" against the viewport edges.

## Elevation & Depth
In keeping with a minimalist aesthetic, this design system avoids heavy shadows. Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines**.

- **Surfaces:** Use the Bone background as the base. Content "elevates" by sitting on top of white (#FFFFFF) surfaces or within subtle 1px Stone Gray borders.
- **Shadows:** When necessary for functional depth (e.g., a floating navigation bar), use a single, highly diffused ambient shadow: `0 4px 24px rgba(26, 26, 26, 0.04)`.
- **Interaction:** Depth changes should feel mechanical and discreet—slight shifts in border opacity or a subtle translation in position rather than dramatic lighting changes.

## Shapes
The shape language is **Soft (Level 1)**. This adds a hint of approachability and "human touch" to an otherwise rigid, high-contrast system.

- **Standard Elements:** 0.25rem (4px) corner radius for buttons and input fields.
- **Large Components:** 0.5rem (8px) for cards and image containers.
- **Consistency:** Never use full pill shapes; maintain the rectangular structural integrity of the editorial grid.

## Components
- **Buttons:** Primary buttons are solid Charcoal Black with Bone text. Secondary buttons use a 1px Stone Gray border with no fill. Transitions should be a simple fade of the background or border color.
- **Cards:** Use "Discreet Cards"—no shadows, just a 1px border in a very light gray or a slight tonal shift from the background. Images within cards should have a subtle zoom effect on hover.
- **Inputs:** Clean lines with labels in `label-caps`. Focus states use a 1px Charcoal Black bottom border or a subtle Deep Forest Green outline.
- **Chips/Tags:** Small, rectangular tags with `label-caps` typography. Use Bone background on White surfaces or vice-versa to maintain subtle contrast.
- **Imagery:** All photos should use a consistent aspect ratio (e.g., 3:2 or 16:9) and include a 1px inset border or "frame" effect to reinforce the editorial look.
- **Lists:** Simple, high-contrast bullet points or numbered lists using the Glacier Blue for the markers to add a touch of color to functional data.