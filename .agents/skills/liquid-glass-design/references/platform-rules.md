# Platform and material rules

## Choose by semantic layer

- Let navigation float above content without obscuring the task. Preserve clear separation between background, financial content, and interactive chrome.
- Use regular glass for custom functional surfaces when native glass is justified. Reserve clear glass for controls above rich media with verified contrast; it is not the default for a finance app.
- Do not glass-wrap balances, transaction rows, budgets, charts, text blocks, or whole screens. Controls embedded in content do not justify turning their surrounding content into glass.
- Keep destructive, positive, negative, selected, and disabled meanings unchanged. Use text, icons, and state semantics in addition to color.
- Preserve established shapes and spacing. Do not add gradients, glow, mirror highlights, or layered shadows merely to advertise glass.
- Use native pressed/selected behavior or existing interaction primitives. A material's interactive visual response is not a replacement for a real accessible button or its handler.

## iOS

Prefer the existing native navigation. System chrome already using Liquid Glass must not receive an extra backdrop, custom blur, or opaque overlay that defeats its behavior.

For authorized custom controls, Expo SDK 58 documents `GlassView` and `GlassContainer` in `expo-glass-effect`. The lockfile resolves version 58.0.5 transitively through Router, but mobile does not declare it directly and has no custom glass primitive. A transitive resolution does not authorize a direct import under pnpm. Verify dependency ownership, installed declarations, native build, and compatibility before introducing it.

- Require supported iOS, `isGlassEffectAPIAvailable()`, and `isLiquidGlassAvailable()` before rendering custom native glass. Do not rely on OS version alone.
- Availability does not indicate the user's accessibility preference. Query reduced transparency separately on iOS; default to a readable opaque presentation while asynchronous preferences are unknown or fail.
- Use `regular` by default. Match the existing app theme; do not force a new light/dark scheme.
- Group related adjacent custom glass through a container where appropriate; avoid glass-on-glass sampling and independent backdrop layers for every item.
- Keep glass and ancestor opacity at 1. Prefer the documented native style transition over opacity fades; respect reduced motion.
- Do not assume every SwiftUI effect has an Expo equivalent. Require documented support before implementing morphing, unions, or other advanced effects.

SDK 58 native tabs use `expo-router/native-tabs`; older SDK examples may use `unstable-native-tabs`. Confirm the installed implementation before migrating imports. On iOS 26, native tab backgrounds are derived from underlying content; setting `backgroundColor` does not force a glass background color. Preserve suitable content backgrounds and adaptive icon/label colors.

## Android

Deliver the same destinations, actions, ordering, information hierarchy, and state feedback through Android-appropriate navigation and controls. Keep Back behavior, ripple/pressed feedback, keyboard behavior, and system-bar insets intact.

- Default to existing branded tonal surfaces, paired foreground tokens, restrained borders/elevation, and an opaque legible background.
- Preserve Lukitas colors; do not introduce wallpaper-derived dynamic colors or replace the theme without a separate product decision.
- Do not import SF Symbols as the sole icon representation or copy iOS-only gestures and tab behavior into Android.
- `expo-glass-effect` falls back to an ordinary `View` on unsupported platforms. Supply the fallback's styling explicitly; the automatic fallback does not guarantee readability.
- Optional blur is an enhancement, not an acceptance requirement or native Liquid Glass. Introduce it only when authorized, compatible, and measured on representative hardware.
- SDK 58 `expo-blur` requires a `BlurTargetView` reference, `blurTarget`, and an appropriate `blurMethod` for Android blur. Avoid obsolete experimental API recipes. Prefer the SDK-31-plus method when older-device blur cost is unacceptable; retain the opaque fallback when blur is absent.
- Reuse a suitable blur target rather than creating one per element. Verify dynamic-list rendering order and clipping. Never blur every list row.

## Accessibility and unsupported environments

- Use native font scaling and layouts that expand. Do not shrink amounts or clip currency values to preserve a capsule shape.
- Keep focus order, roles, labels, disabled/selected states, and modal focus behavior independent of visual material.
- React Native 0.88 exposes reduced-motion state/events on both mobile platforms; reduced-transparency state/events are iOS-specific. Guard platform-specific calls and remove subscriptions on cleanup.
- Handle preference changes during use, not only at startup. Keep any existing user appearance choice intact.
- Check increased contrast through available platform APIs and device testing. If detection is unavailable, keep the baseline readable and explicitly report the unverified setting.
- Treat web and unsupported iOS as intentional content/tonal presentations. Preserve keyboard focus and all actions without backdrop-filter or native modules.
