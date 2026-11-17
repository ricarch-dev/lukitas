# Integrate with Lukitas, not a parallel UI system

## Verified baseline

Inspected on 2026-11-16. Revalidate these locators when applying the skill.

| Concern                                     | Current owner                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Product identity and interaction principles | `PRODUCT.md`                                                                                   |
| Authentication visual specification only    | `DESIGN.md`, section “Design System: Lukitas Auth Entry”                                       |
| Canonical color tokens                      | `apps/mobile/src/shared/theme/app-colors.ts`, `AUTH_COLORS` and `APP_COLORS`                   |
| Root stack                                  | `apps/mobile/src/app/_layout.tsx`                                                              |
| Auth/onboarding gate                        | `apps/mobile/src/navigation/RootNavigator.tsx`                                                 |
| Native four-tab shell                       | `apps/mobile/src/app/(tabs)/_layout.tsx`                                                       |
| Custom web tabs                             | `apps/mobile/src/app/(tabs)/_layout.web.tsx`                                                   |
| Product screen ownership                    | `apps/mobile/src/modules/{auth,onboarding,home,accounts,movements,planning,reports,settings}/` |

The manifest declares Expo 58.0.23, Expo Router ~58.0.30, React Native 0.88.1, and React 19.3.0. The lockfile resolves `expo-glass-effect` 58.0.5 through Router. Mobile does not directly declare `expo-glass-effect` or `expo-blur`; source inspection found no custom `GlassView` integration. Do not install either package merely because this skill activates.

## Preserve these patterns

- Maintain Lukitas's original, calm, trustworthy financial identity. Do not copy another app's assets or imply banking/custody/payment capabilities.
- Keep existing Spanish product copy, route names, and the four destinations: Inicio, Movimientos, Planificación, Ajustes. Accounts and reports remain available through their existing flows; do not add tabs to make glass more visible.
- Preserve the blue-teal primary accent, income/expense meanings, existing currency/date formatting, visible labels, and recoverable error feedback.
- Treat the auth specification as auth-specific. Do not spread its exact panel shape to every module; do not replace its flat, border-based content treatment with glass.
- Native tabs already use `expo-router/native-tabs`. Enhance surrounding custom controls only when justified; replacing the navigator is not required to adopt glass.
- Keep the custom web navigation intentional instead of forcing a mobile-native dependency into web.
- Preserve safe-area, keyboard, dismissal, and focus behavior in existing sheets. A custom React Native `Modal` does not automatically acquire SwiftUI sheet materials.
- Preserve the existing quick-action menu's reduced-motion, Android Back, safe-area, and accessibility behavior. Inspect the current file and tests before any authorized change; never overwrite unrelated work.

## Reuse and placement

Search for the concrete owning screen, styles, hooks, and sheet before introducing abstractions. There is no verified universal Button primitive; do not pretend one exists or replace all `Pressable`s as a side effect.

Keep route declarations in `app/`, navigation orchestration in `navigation/`, and feature implementation under the owning `modules/` capability. Keep material-only calculations side-effect free; place preference subscriptions in hooks, not generic utilities.

Extend existing semantic tokens rather than copying color literals. A shared material adapter belongs in `shared/` only when at least two real modules need identical semantics. Otherwise keep it local. Use typed, narrow props and a single policy owner; do not leak native-only props or repeated platform branches into every screen.

Load the project type-safety, normalized-reuse, refactorable-source, technology-documentation, and formatting skills when implementing UI. This skill complements native UI and design guidance; it does not override engineering standards, user scope, product truth, or screen-specific design constraints.

## App-wide rollout when separately authorized

Inventory all current routes and modules; classify each surface instead of bulk-replacing backgrounds. Start with canonical chrome/policy, validate a representative content-heavy and form-heavy screen on both mobile platforms, then apply bounded slices. Preserve each screen's default/loading/empty/error/disabled state. Keep an explicit fallback for every custom material and do not mass-move modules.

Creating this skill does not itself execute that rollout or certify device results.
