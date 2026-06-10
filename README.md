# personal-website

Personal site of Gyanendra Singh — Next.js (App Router), light mode.

- `/` — homepage
- `/blogs` — blog (MDX posts in `content/blog/`, loaded with gray-matter + next-mdx-remote)
- `/claude-fable-game` — BLADEFALL, a top-down 3D arena fighter (see below)

## Run

```sh
npm install
npm run dev -- --port 3210
```

Adding a blog post: drop a `.mdx` file into `content/blog/` with frontmatter (`title`, `description`, `date`, `category`, `tags`, `published`). Game posts can add `game:` + `gameLabel:` to show a play button on the post page.

---

# BLADEFALL — Arena Fighter

A top-down 3D arena fighter built with Three.js. Everything (characters, levels, sound, music) is generated procedurally — no asset files at all. Lives at `/claude-fable-game` (a standalone single-file build is kept at `public/standalone.html`).

## Controls

| Input | Action |
|---|---|
| WASD / Arrows | Move |
| F / J / Left click | Light attack (chains into a 3-hit combo) |
| E / Q / K / Right click | Heavy strike (slow, big damage, breaks Brute poise) |
| Space / Shift | Dodge roll (invincibility frames) |
| Esc / P | Pause |
| M | Mute |

## Game

- **3 levels**: The Pit → Frostmarch Bastion → Obsidian Throne, each with multiple waves and its own theme.
- **Enemies**: Grunts (melee, strafe and flank), Rangers (kite you and shoot), Brutes (slow, AOE slam with poise armor), and **Vorgath the Warlord** — a 3-phase boss with combo strings, slams, projectile volleys, dashes, and summoned adds.
- **Smart AI**: enemies coordinate via an attack-token system (only a couple attack at once), keep spacing, orbit you, and telegraph every attack in red — red circles on the ground mean move.
- **Feedback**: hit-stop, screen shake, slash arcs, particle bursts, shockwaves, damage numbers, low-HP vignette, combo multiplier scoring, health drops.
