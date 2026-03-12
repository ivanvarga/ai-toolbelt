---
name: figma-component
description: Use when creating a React Native component from a Figma design, implementing a design from Figma URL, or converting Figma designs to code. Triggers on Figma URLs, component creation from design, or design implementation requests.
---

# Create React Native Component from Figma Design

## Input

Figma URL with node-id parameter:

```
https://figma.com/design/:fileKey/:fileName?node-id=1-2
```

## Process

1. Extract the `node-id` from the URL
2. Fetch design context: use `mcp__figma-desktop__get_design_context` with that nodeId
3. **Before creating anything**: search `src/components/` for existing similar components -- do NOT create duplicates
4. If a similar component exists, extend or reuse it
5. Only create a new component if truly needed -- confirm with user first

## Location

New components go in: `src/components/liverpool-ui/{feature-name}/`

Files:
- `{component-name}.tsx`
- `{component-name}.stories.tsx`
- `index.ts`

## Component Patterns

- Prefer props-based components over compound components -- simpler API, easier to use
- Use `forwardRef` for ref forwarding
- Use `Box`, `AnimatedBox`, `Text` from `~/src/theme` -- NOT `View`/`Text` from react-native
- Use `Image` from `expo-image` -- NOT from react-native
- Apply design tokens directly on Box/Text props: `padding="S.Spacer.5"`, `backgroundColor="P.Color.Primary.1"`
- Use `StyleSheet.create()` ONLY for numeric pixel values (width, height)
- No anonymous inline functions -- use `useCallback`
- Keep it simple -- no over-engineering, no trivial wrapper components

## Animations (react-native-reanimated)

- Use `SharedValue<number>` for animated values passed as props
- Use `useSharedValue`, `useAnimatedStyle`, `useAnimatedScrollHandler`
- Use `AnimatedBox` from `~/src/theme` for animated containers
- Use `AnimatedBlinkContainer` for pulsing/blinking effects (e.g., live indicators)
- For progress animations: `withTiming`, `withRepeat`, `Easing`

## Design Token Values in JS

When you need actual pixel values for calculations, import from design tokens:

```typescript
import { spacing } from '~/design-tokens/lfc-app-tokens/variables/spacingTheme';
const GAP = spacing['S.Spacer.6']; // 16
```

## Padding and Spacing -- Pay Close Attention

- Verify EVERY padding and spacing value against Figma
- Check all 4 sides independently (paddingTop, paddingRight, paddingBottom, paddingLeft)
- Common issue: bottom padding often differs from other sides
- Gap between items: use `gap` prop, verify exact Figma `itemSpacing` value

Spacing tokens:

| Token | Value |
|-------|-------|
| S.Spacer.0 | 0 |
| S.Spacer.1 | 2px |
| S.Spacer.2 | 4px |
| S.Spacer.3 | 6px |
| S.Spacer.4 | 8px |
| S.Spacer.5 | 12px |
| S.Spacer.6 | 16px |
| S.Spacer.7 | 20px |
| S.Spacer.8 | 24px |

## Other Design Tokens

- Colors: `P.Color.Primary.{1-3}`, `P.Color.Neutral.{White,Black,500,900}`, `P.Color.Opacity.White.{10,20}`
- Border Radius: `P.BorderRadius.{0-5,Full}`
- Text: `P.Headings.H{1-6}`, `P.Body.{Large,Default,Small}-{1-3}`, `P.Labels.{XSmall,Small}-1`

## Container Components

For complex UI with multiple parts (header, carousel, pagination, footer):
- Create a container component
- Accept `renderFooter?: () => React.ReactNode` for flexible footer content
- Use `Animated.ScrollView` with `useAnimatedScrollHandler` for carousels

## Storybook Stories

- Same folder as component
- Title structure: use feature-based grouping (`Feature/Component`) not type-based (`Card/Feature`)
- Use `getColourWayStoryThemeColor('onDark')` for dark backgrounds
- Create variants matching Figma states
- After creating stories: run `yarn storybook:gen` to register them

## Common Issues to Verify

- Tag/badge heights often need explicit `height` in styles
- Time format: lowercase am/pm with minutes ("10:00 am")
- Small touch targets need `hitSlop`
- Progress bars align to bottom with `justifyContent="space-between"`
