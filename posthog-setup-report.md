<wizard-report>
# PostHog post-wizard report

The wizard has completed a full PostHog integration for this Next.js 15 personal site. PostHog is initialized via `instrumentation-client.js` (the recommended approach for Next.js 15.3+), with a reverse proxy configured in `next.config.mjs` to route analytics traffic through `/ingest` — improving ad-blocker resilience and keeping data collection first-party. Seven events are now captured across the game and blog.

| Event | Description | File |
|---|---|---|
| `game_started` | Player clicks "Enter the Arena" to begin a new run | `app/claude-fable-game/game.js` |
| `game_over` | Player dies; captured with `score`, `level`, `level_name`, `best_combo` | `app/claude-fable-game/game.js` |
| `game_won` | Player beats all three levels; captured with `final_score`, `best_combo` | `app/claude-fable-game/game.js` |
| `level_cleared` | Player clears all waves in a level; captured with `level`, `level_name`, `score` | `app/claude-fable-game/game.js` |
| `game_retried` | Player retries after dying or restarting from pause; captured with `from_pause`, `level`, `score` | `app/claude-fable-game/game.js` |
| `game_quit_to_menu` | Player quits an active run from the pause screen; captured with `level`, `score` | `app/claude-fable-game/game.js` |
| `blog_post_opened` | Visitor opens a blog post; captured with `slug`, `title`, `category` | `app/blogs/[slug]/page.js` + `PostHogBlogTracker.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/464060/dashboard/1693856)
- [Game sessions started](https://us.posthog.com/project/464060/insights/kmR2gHIg) — Unique players who start a game run per day
- [Game completion funnel](https://us.posthog.com/project/464060/insights/dKoU3pVF) — Conversion from game start → level cleared → victory
- [Game outcomes: victories vs defeats](https://us.posthog.com/project/464060/insights/sT7CHXEY) — Win/loss balance over time
- [Blog post opens](https://us.posthog.com/project/464060/insights/pPLJwlce) — Unique visitors who open a blog post per day
- [Player retry rate after death](https://us.posthog.com/project/464060/insights/XHi5qHhG) — Retries ÷ deaths (engagement after failure)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
