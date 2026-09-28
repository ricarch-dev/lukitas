---
name: Lukitas Auth Entry
description: A clear, trustworthy sign-in and account-creation experience for multi-currency finances.
colors:
  canvas: "#F1F5F4"
  surface: "#FFFFFF"
  ink: "#192D30"
  body: "#334A4E"
  muted: "#52696D"
  primary: "#005864"
  primary-pressed: "#004751"
  disabled: "#4C696D"
  border: "#D8E2DF"
  field-border: "#71868A"
  error: "#A12F24"
  error-surface: "#FFF1EE"
  segment-surface: "#EAF0EE"
typography:
  display:
    fontFamily: "Platform system sans"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.19
    letterSpacing: "normal"
  headline:
    fontFamily: "Platform system sans"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.28
    letterSpacing: "normal"
  body:
    fontFamily: "Platform system sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.56
    letterSpacing: "normal"
  label:
    fontFamily: "Platform system sans"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: "normal"
rounded:
  compact: "6px"
  choice: "9px"
  control: "10px"
  segment: "12px"
  panel: "16px"
spacing:
  compact: "8px"
  base: "16px"
  panel: "24px"
  outer: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "52px"
  auth-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
    width: "100%"
  auth-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "52px"
  auth-mode-switch:
    backgroundColor: "{colors.segment-surface}"
    rounded: "{rounded.segment}"
    padding: "4px"
    width: "100%"
  button-mode-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.choice}"
    padding: "10px 8px"
    height: "44px"
  button-mode-default:
    backgroundColor: "transparent"
    textColor: "{colors.body}"
    rounded: "{rounded.choice}"
    padding: "10px 8px"
    height: "44px"
  button-password-visibility:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.compact}"
    padding: "0 8px"
    height: "44px"
---

# Design System: Lukitas Auth Entry

## Overview

**Creative North Star: "The Clear Currency Desk"**

This entry screen serves someone reviewing money across currencies in a quiet home workspace with soft morning daylight. A near-white surface keeps the sign-in task familiar on a phone or laptop, while a restrained blue-teal accent identifies the brand and the next action.

The documented scope is the authentication entry surface, not the rest of the app. It pairs a concise Lukitas wordmark and practical multi-currency explanation with a bounded form panel. The interface rejects clutter, financial jargon, decorative controls, and any suggestion that Lukitas holds or moves a user's money.

**Key Characteristics:**
- Clear Spanish copy and visible field labels.
- Calm, high-contrast neutrals with one blue-teal action color.
- Familiar form controls, direct feedback, and a responsive two-column desktop composition.

## Colors

The palette is restrained: cool near-white surfaces carry most of the screen, and blue-teal is reserved for identity, selection, focus, and primary action.

Hex sRGB is normative because the installed React Native 0.86.3 color normalizer rejects CSS `oklch()` values; the same tokens also meet Stitch's hex color schema.

### Primary
- **Deep Current Teal** (`colors.primary`): Primary action, selected sign-in mode, brand mark, and field focus. White button text measures 8.14:1.
- **Pressed Teal** (`colors.primary-pressed`): Pressed state for the primary action.

**The Single Accent Rule.** Keep blue-teal attached to a meaningful action or current state; never use it as decoration across large surfaces.

### Neutral
- **Cool Canvas** (`colors.canvas`): The page background.
- **White Surface** (`colors.surface`): The form panel and input interiors.
- **Deep Ink** (`colors.ink`): Main headings and keyboard-focus borders; 14.39:1 against white.
- **Readable Body** (`colors.body`): Supporting copy and inactive control labels; 9.42:1 against white.
- **Muted Ink** (`colors.muted`): Helper text and placeholder text; 5.83:1 against white.
- **Panel Border** (`colors.border`): The form panel's quiet outline.
- **Field Border** (`colors.field-border`): The default input stroke; 3.83:1 against white.
- **Segment Surface** (`colors.segment-surface`): The unselected background behind the sign-in/create-account controls.
- **Disabled Slate** (`colors.disabled`): Disabled primary-action background with white loading text; 5.92:1 against white.

### State
- **Error Text** (`colors.error`): Actionable form errors; 6.47:1 against the error surface.
- **Error Surface** (`colors.error-surface`): A quiet background for recoverable form feedback.

## Typography

**Display Font:** Platform system sans-serif (SF Pro on iOS, Roboto on Android, system sans-serif on web)
**Body Font:** The same platform system sans-serif
**Label/Mono Font:** None

**Character:** Familiar and functional, with weight and spacing doing the work instead of a decorative typeface. Preserve platform text scaling.

### Hierarchy
- **Display** (700, 36px/43px): The short brand statement beside the form on desktop and above it on narrow screens.
- **Headline** (700, 25px/32px): The active sign-in or account-creation title.
- **Title** (700, 19px/24px): The Lukitas wordmark.
- **Body** (400, 15-16px/22-25px): Form guidance and the product explanation. Keep paragraphs below 65ch.
- **Label** (600, 14px/20px): Field names and compact control labels; use sentence case.

**The One-Family Rule.** Use the platform's system sans-serif throughout this task surface; do not introduce a display font for a credential form.

## Elevation

This surface is flat. Depth comes from the white form panel against the cool canvas and a quiet 1px outline, not shadows or elevated card stacks. Input focus and error feedback use explicit border and surface changes.

**The Border-Only Rule.** Do not add drop shadows to the auth panel; keep the existing border as its only edge treatment.

## Components

### Buttons
- **Shape:** Gently rounded controls (10px radius); the segmented container uses a 12px radius.
- **Primary:** Blue-teal fill, white 16px bold label, 52px minimum height, and 18px horizontal padding.
- **Pressed / Focus:** Pressed primary actions use the darker teal. Keyboard focus receives a 2px ink border without changing the control's dimensions.
- **Disabled / Loading:** Disable duplicate activation and show an inline spinner with localized progress text on the disabled slate.
- **Mode selection:** Keep both actions visible. The selected mode uses the primary fill; the other remains on the muted segment surface. Both controls have a 44px minimum height and expose selected state to assistive technology.

### Cards / Containers
- **Corner Style:** Soft but controlled corners (16px panel radius).
- **Background:** White surface against the cool canvas.
- **Shadow Strategy:** None; see the Border-Only Rule.
- **Border:** A single quiet 1px outline.
- **Internal Padding:** 24px. Cap the desktop form at 456px and the full composition at 1120px.
- **Responsive behavior:** At 880px and wider, place brand context beside the form. Below that, stack the brand introduction and form; preserve vertical scrolling when the keyboard is open.

### Inputs / Fields
- **Style:** White fill, 1px field stroke, 10px radius, 52px minimum height, and 14px horizontal inset. Labels remain visible above the fields.
- **Focus:** Switch to a 2px primary stroke and keep keyboard focus visible on buttons.
- **Error / Disabled:** Keep entered email text after errors. Show a readable, localized error surface; make fields read-only during submission.
- **Password:** Obscure by default. The show/hide control has a changing accessible name and at least a 44px touch target.

## Do's and Don'ts

### Do:
- **Do** keep sign-in and create-account modes visible together; the mode must determine the existing login or registration action.
- **Do** keep the form readable at narrow widths and constrain its desktop width.
- **Do** preserve the measured text and control contrast ratios documented above.
- **Do** show loading, validation, authentication, duplicate-email, and connectivity feedback in neutral Spanish.

### Don't:
- **Don't** copy Rial's logo, QR code, visual assets, or exact interface.
- **Don't** use accounting jargon, opaque currency conversions, cluttered screens, or decorative controls that obscure common actions.
- **Don't** imply that Lukitas is a bank, custodian, or payment processor.
- **Don't** default to generic fintech navy+cream+orange, gradients, QR codes, or decorative motion.
- **Don't** expose unknown server messages, credentials, or implementation details in user-facing errors.
