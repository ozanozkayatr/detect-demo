---
name: Detect
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5f5e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2dd'
  on-secondary-container: '#656461'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#40000b'
  on-tertiary-container: '#e25160'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e5e2dd'
  secondary-fixed-dim: '#c9c6c2'
  on-secondary-fixed: '#1c1c19'
  on-secondary-fixed-variant: '#474743'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b5'
  on-tertiary-fixed: '#40000b'
  on-tertiary-fixed-variant: '#8e0f28'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  stats-number:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-margin: 24px
  gutter: 16px
  section-gap: 48px
  card-padding: 24px
---

## Brand & Style
The design system for this product is built upon the philosophy of **Quiet Confidence**. It rejects the aggressive, gritty tropes of combat sports in favor of a "private training club" aesthetic—one that is elite, analytical, and composed. The target audience consists of high-performance athletes and serious practitioners who value structured, professional feedback over flashy motivation.

The visual style is **Modern Corporate with Tactile Editorial influences**. It prioritizes extreme legibility, generous whitespace, and a refined structural grid. The interface should feel like a high-end physical ledger or a bespoke coaching tool, utilizing thin borders, canvas-inspired textures, and a disciplined color application to evoke a sense of heritage and precision.

## Colors
The palette is grounded in a high-contrast, "Warm Minimalist" foundation. 

- **Primary & Neutral:** Deep Charcoal (#1A1A1A) and Iron (#2D2D2D) are used for all core structural elements, typography, and primary navigation. They provide the "weight" and seriousness required for a performance review tool.
- **Surface & Background:** Warm Sand (#F5F2ED) and Cream (#FAF9F6) replace stark whites to create a more sophisticated, editorial atmosphere that reduces eye strain during deep analysis.
- **Accent:** Oxblood (#800020) is the sole "athletic" color. It is used sparingly for primary call-to-actions, critical performance metrics, and active states. It should feel like a premium leather or a refined seal of quality.
- **Success:** Muted Forest Green (#2E4D31) provides feedback on goal completion without breaking the muted, professional tone.

## Typography
The typography system uses a pairing of **Hanken Grotesk** for impact and **Inter** for utility. 

Hanken Grotesk provides a sharp, modern neo-grotesque feel for headlines and performance data. Its geometric clarity suggests technical precision. For body text and analytical notes, Inter is used to ensure maximum legibility and an unobtrusive, systematic feel. 

Special attention is given to `label-caps` for metadata (e.g., Round numbers, timestamps) and `stats-number` for performance metrics, ensuring they feel substantial and authoritative.

## Layout & Spacing
The layout follows a **Strict Fixed Grid** model to mirror the organized nature of a training camp. 

- **Desktop:** 12-column grid with 24px gutters. Content is typically centered in a 1120px max-width container.
- **Mobile:** 4-column grid with 16px gutters and 24px side margins.
- **Rhythm:** An 8px base unit governs all spacing. 

Whitespace is used as a luxury element; sections are separated by large gaps (`48px+`) to allow performance data to breathe and prevent the "data-heavy" fatigue common in fitness apps. Layouts should emphasize verticality, mimicking a coach's clipboard or a structured review sheet.

## Elevation & Depth
This design system avoids heavy shadows and floating elements. Depth is achieved through **Tonal Layering** and **Refined Outlines**:

- **Surface Tiers:** The base background is Cream (#FAF9F6). Cards and containers use Warm Sand (#F5F2ED) or pure White to create a subtle lift.
- **Thin Outlines:** Elements are defined by 1px borders in Iron (#2D2D2D) at low opacity (10-15%). This mimics the tension of ring ropes without being literal.
- **Shadows:** When used, shadows are "Ambient"—extremely diffused, with a large blur (20px+) and very low opacity (5%). They should feel like a natural light source in a gym, not a digital effect.
- **Canvas Texture:** A subtle 5% opacity noise or grid pattern may be applied to the base background to reference the canvas of a boxing ring.

## Shapes
The shape language is **Soft but Disciplined**. 

We use a `0.25rem` (4px) base radius for buttons and inputs, providing a hint of approachability while maintaining a sharp, professional edge. Larger cards use `0.5rem` (8px). We strictly avoid pill-shaped or overly rounded elements, as they feel too "consumer/tech" and diminish the serious, elite tone of the product.

## Components
- **Buttons:** Substantial height (48px or 56px). Primary buttons are Deep Charcoal with White text. Secondary buttons use a 1px Iron border. No gradients.
- **Performance Cards:** Cream background with a 1px Iron border. These contain performance charts or video analysis clips. Padding is generous (24px).
- **Metric Chips:** Small, rectangular labels with `label-caps` typography. Used for punch types (e.g., "JAB", "CROSS") or intensity levels.
- **Analysis Lists:** Use a clean 1px bottom border between items. Lead with a strong Hanken Grotesk timestamp or round number.
- **Input Fields:** Minimalist. Only a bottom border (2px) that turns Oxblood on focus, or a fully enclosed box with a very light Warm Sand fill.
- **Progress Bars:** Thin, surgical lines. The background track is Warm Sand, and the progress fill is Oxblood or Iron.
- **Video Overlays:** Use Oxblood for playback controls and frame-by-frame scrubbing tools to highlight the "Action" layer.