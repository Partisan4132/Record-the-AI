# record-able Support Bot

A Discord bot that answers questions about the **record-able** Minecraft mod in a
support channel, using a free LLM API and a knowledge base you can extend at any time.

- Watches one channel. Anyone types a question in plain English, the bot replies.
- Answers only from the knowledge base — it's told to say "I'm not sure" and point
  to GitHub issues / your Discord rather than make things up.
- Mods/admins can add new facts on the fly with `/addinfo`, no code changes or
  restarts needed.
- Runs on [Groq](https://console.groq.com)'s free API tier — no credit card, no cost.

## 1. Get a free Groq API key

1. Sign up at https://console.groq.com (email or Google, no card needed).
2. Go to **API Keys** → **Create API Key** → copy it. This is `GROQ_API_KEY`.

The free tier is rate-limited (roughly tens of requests per minute, a daily request
cap that varies by model — check current numbers at
https://console.groq.com/docs/rate-limits). That's plenty for a mod support channel
unless it gets genuinely high-traffic; if you ever outgrow it, Groq's paid tier is
also inexpensive since it only serves open models.

## 2. Your Discord bot

You said you've already created the bot application — you just need three things
from the Discord Developer Portal (https://discord.com/developers/applications →
your app):

1. **Bot** tab → **Message Content Intent** must be turned ON, or the bot won't be
   able to read message text to answer questions.
2. **Bot** tab → **Reset Token** (if you don't already have it saved) → this is
   `DISCORD_TOKEN`.
3. Make sure it's invited with the `bot` and `applications.commands` scopes and the
   **Send Messages**, **Read Message History**, and **Use Slash Commands**
   permissions — re-invite via **OAuth2 → URL Generator** if you're not sure.

## 3. Get your support channel's ID

In Discord: **User Settings → Advanced → Developer Mode** (turn on), then right-click
the channel you want the bot to watch → **Copy Channel ID**. This is
`SUPPORT_CHANNEL_ID`.

## 4. Configure and run locally

```bash
npm install
cp .env.example .env
# fill in .env: DISCORD_TOKEN, DISCORD_CLIENT_ID, GROQ_API_KEY, SUPPORT_CHANNEL_ID

npm run deploy-commands   # registers /addinfo, /listinfo, /removeinfo — run once,
                           # and again any time you edit src/commands.js
npm start
```

The bot needs to keep running to answer messages — host it somewhere that stays up
(a small VPS, Fly.io, a Raspberry Pi, etc.), not just your own machine, once you're
ready to run it for real.

## 5. Push it to GitHub

```bash
cd record-able-support-bot
git init
git add .
git commit -m "Initial commit: record-able support bot"
```

Then create an empty repo on GitHub (https://github.com/new — don't initialize it
with a README, since you already have one), and:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

`.env` is already excluded via `.gitignore`, so your API keys won't end up in the
repo. `knowledge/community-notes.json` **is** tracked by default — if you'd rather
keep whatever gets added via `/addinfo` out of version control too (e.g. because
you're deploying from the repo and don't want to conflict with live edits), add it
to `.gitignore` as well.

## 6. Using it

- Just ask a question in the support channel — no command needed, no @mention needed.
- `/addinfo <text>` — (mod/admin only) adds a fact the bot will use in future answers.
  Example: `/addinfo On MC 1.21.11 with an AMD GPU, disable hardware acceleration if
  recordings come out green — known driver issue, fix pending.`
- `/listinfo` — see everything added via `/addinfo` so far, with IDs.
- `/removeinfo <id>` — delete a note that's outdated or wrong.

## Updating the base knowledge

`/addinfo` is for day-to-day facts (known bugs, workarounds, community tips). For
bigger rewrites — a new mod version, a restructured feature list — edit
`knowledge/mod-info.md` directly (plain Markdown, no code involved) and restart the
bot. It's already pre-filled with the mod's current feature set, requirements,
controls, and changelog as a starting point — update it as the mod evolves, and
commit + push the change like any other file.

## Notes on the free tier

- Default model is `llama-3.3-70b-versatile` — a strong open model, free on Groq.
  `.env` has commented alternatives if you want to try others.
- The whole knowledge base (base doc + notes) is sent with every question. That's
  intentional — simple and reliable at this size. If `mod-info.md` and your notes
  grow to tens of thousands of words, you'd want a proper retrieval step instead of
  stuffing everything into the prompt every time.
- If the bot replies with a rate-limit message, you've hit Groq's free-tier cap —
  it resets on its own; check https://console.groq.com/docs/rate-limits for current
  limits.

## Persistence note for hosting

`/addinfo` writes to `knowledge/community-notes.json` on disk. If you deploy to a
platform with an ephemeral filesystem (a fresh container on every deploy), notes
added via `/addinfo` will be lost on redeploy unless you attach a persistent volume,
or just re-pull from GitHub after committing new notes. A VPS with a normal disk
doesn't have this problem.
