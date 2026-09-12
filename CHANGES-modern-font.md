# Modern font (DM Sans)

Replaces Fraunces + IBM Plex Sans with **DM Sans** across display and body so the UI reads as one modern sans, not a literary serif + old grotesque pair.

## Files
- `apps/mobile/src/theme.ts` — type tokens + system-ui fallback
- `apps/mobile/App.tsx` — load `@expo-google-fonts/dm-sans`
- `apps/mobile/package.json` — drop fraunces / ibm-plex-sans, add dm-sans

Screen components already use `font.display` / `font.body*` tokens, so they pick this up with no per-screen edits.
