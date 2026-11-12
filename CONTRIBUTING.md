# Contributing to O Baque Virado

O Baque Virado favors small changes that keep the page light on a phone and the show
deterministic. Read [`docs/product.md`](docs/product.md) for what belongs in it.

## Report a bug

Open an [issue](https://github.com/martonpaulo/baque-virado/issues) with the browser, the device
and the scene where it happened. Report a vulnerability through GitHub's private advisory form,
never in a public issue.

## Local setup

Node.js 24 and pnpm, plus Python 3 for the repository checks:

```bash
git clone https://github.com/martonpaulo/baque-virado.git
cd baque-virado
pnpm install
pnpm validate
```

## Commands

| Command | What it does |
| :--- | :--- |
| `pnpm serve` | Serves the site at <http://127.0.0.1:8000>. |
| `pnpm validate` | Runs the full gate, as CI does: Biome, the tests and the repository checks. |
| `pnpm test` | Runs the unit tests. |
| `pnpm format` | Formats the code with Biome. |
| `pnpm export` | Renders the show to an MP4 (see the README). |

## Commits

English [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), one concern per
commit, on `main`.
