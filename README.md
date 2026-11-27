# gobble-run-turkey-escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/chepster4/gobble-run-turkey-escape/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/chepster4/gobble-run-turkey-escape/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**GOBBLE RUN** is an original turkey escape game that runs offline in a
desktop browser from its own static files. One turkey, one farmer, 4000 metres
between the farmyard and the kitchen door — and Thanksgiving dinner waiting at
the end of it.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

## How to play

You are the turkey. Run from the farmyard through the barn to the kitchen,
outrun the farmer, and do not become Thanksgiving dinner.

- **Space / ↑** — jump (over fences, oven flames, hay bales)
- **Shift** — dash: a burst of speed that puts distance between you and the farmer
- **↓** — hide in a haystack while the farmer searches
- **Mouse / click** — start, continue, retry · **R** — restart · **P** — pause · **M** — mute

The farmer hunts in five states — patrol, search, chase, corner, caught — and
closes in whenever you stumble. Corn is +25, golden corn +100. You have 3
lives and 4000 m to cover; reach the kitchen door to escape, get caught three
times and you are dinner.

## The run

1. **Farmyard** — fences, haystacks to hide in, corn to grab, the farmer on patrol.
2. **The Barn** — tighter jumps, the farmer searches harder and corners faster.
3. **The Kitchen** — oven flames and swinging carving knives over the last stretch to the door.

Each stage is harder than the last; the farmer gets faster the further you run.
The HUD shows score, distance, lives, stage and escape progress, and warns you
when the farmer is closing in.

No build step, no network requests, no libraries — plain canvas art drawn in
code and WebAudio sounds synthesized in code. Screenshots in `screenshots/`
are real renders of the game, staged by `game/src/shots.js`
(`?shot=title|chase|kitchen|escaped&seed=7`).

## Entry

Built for the make.fun competition
[turkey-run-game-01](https://make.fun/bounty/turkey-run-game-01).
`main.ts` (Node 22) copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=b5gt2sm0&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
