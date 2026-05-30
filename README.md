# APLamp

APL playground that runs in the browser. REPL, on-screen APL keyboard, glyph reference, and a pile of exercises. Static site, no backend.

## Running it

Needs Node 20+ and npm 10+.

```bash
npm install
npm run dev
npm run build
npm test
```

## What's in here

Interpreter written from scratch in TypeScript: tokenizer, parser, evaluator, primitives, formatter. No APL engine pulled in as a dependency.

UI is React 18 with Tailwind and a few Radix primitives. `i18next` handles English and Italian; the language is picked from the browser and kept in `localStorage`.

Two input modes: native APL (each physical key maps to its glyph) and ASCII with Alt-prefix shortcuts.

A lot of exercises, each with a reference solution the test suite checks.

## Deploying

Push to `main` and the GitHub Pages workflow builds and publishes. For a different host, tweak `base` in `vite.config.ts` and serve `dist/` from wherever.

## License

See [LICENSE](LICENSE).
