# Niijima Home

The browser start page of the Niijima Network, for your computer and your phone, at
`home.niijimasisters.com`. It's built to open instantly as your homepage and new-tab page: one
server-rendered page with the in-game calendar and the weather, a greeting from Makoto or Sae,
a search box, a small strip with your next events from Niijima Calendar, the money from Treasure
and the latest pages of the Compendium wiki, the Network's services with live up/down dots, and
your own links.

It also answers on `makoto.niijimasisters.com` and `sae.niijimasisters.com`: each is that
sister's own start page (her colours, greeting, links, events and money), while `home.` follows
the Makoto | Sae switch that every Niijima site shares.

## What's on the page

- **Header**: the date in a red starburst with the time of day, the clock and the weather
  (Open-Meteo, no key needed), and the host greeting you with a line for the time of day. Her art
  comes from your `./assets` folder; until it's there a silhouette stands in.
- **Search**: one big box. An address or domain (`github.com`, `localhost:5173`) opens directly,
  `!bangs` (`!w tokyo`, `!yt …`) go to DuckDuckGo, anything else is searched with your engine
  (DuckDuckGo, Google, Startpage, Kagi or your own). A leading `?` always searches. Works without
  JavaScript too.
- **The strip**: one small panel right under the search, with three slots, so the things you
  check every day are there at a glance on your phone and your computer alike. Side by side on a
  computer; on a phone three cards you swipe through, so it takes no more than a third of the
  screen.
  - **Calendar**: the next three events (today and tomorrow first) with the time and a dot in
    the owner's colour, or "Nothing planned". Tap one to open that day in Niijima Calendar.
  - **Treasure**: your total in big numerals, the month-end forecast and how many budgets are
    over or near their limit. **Hide/Show** keeps money off the screen in public; it's
    remembered on each device and hidden by default on phones. Tap it to open Treasure.
  - **Compendium**: the wiki pages changed last (title, how long ago, collection), each a link
    into the wiki, and a box that searches it.
- **Network**: tiles for Treasure, Calendar, Archive, Mementos, Compendium and the landing page,
  each with a dot the server checks every minute: lit when it answers, a red cross when it's down.
- **Links**: your bookmarks in groups, her own first, then the shared ones. Icons are fetched
  once by the server and kept in `./data`; a site without one gets a letter tile.
- **Today** and **Treasury** (off unless you add them to `sections`): the bigger versions, with
  a week of events day by day and the next bills.

Every section, and each slot of the strip, can be turned off or moved in `config.yml`.

**Keyboard** (computer): the search box is focused when the page opens. `/` jumps back to it,
`Esc` leaves it, then `1`–`9` open the first nine links (`Shift` + number: in a new tab).

**Fast by design**: everything is rendered on the server; answers from other apps are kept for a
minute; the page never waits more than 1.5 seconds for one. A slow or unreachable app just shows
"Unavailable" in its section (or its last answer), and the answer that arrives late is ready for
the next tab you open. Tokens for Calendar, Treasure and the Compendium stay on the server.

## Set up on the server

You need Docker with Compose, and your Traefik and Cloudflare Tunnel (the wildcard tunnel route
already sends every subdomain to Traefik). It's one small Node container; the 2 vCPU / 7.8 GB VM
has room to spare.

```sh
git clone https://github.com/sopika2/Niijima-Home ~/niijima-home && cd ~/niijima-home && cp .env.example .env && cp config.example.yml config.yml && mkdir -p data assets && nano .env && docker compose up -d --build
```

Then:

1. **Sign-in.** In `.env`, use the Discord application you already have for Treasure: copy its
   **Client ID** and **Client Secret**, and in the Discord Developer Portal (OAuth2 → Redirects)
   add `https://home.niijimasisters.com/auth/callback`. Use the **same** `SESSION_SECRET` and
   `SESSION_DOMAIN=niijimasisters.com` in every Niijima app and you sign in once for all of them
   (makoto.… and sae.… included). Put your Discord user id in `config.yml` under
   `access.discord_user_ids`; if you don't know it, sign in once and the page shows it. You stay
   signed in for as long as browsers allow (about 400 days, renewed whenever you visit).
2. **Calendar.** Set `CALENDAR_TOKEN` to the token Niijima Calendar gives the homepage
   (`CALENDAR_URL` defaults to its container, `http://niijima-calendar:3000`).
3. **Treasure.** Set `SUMMARY_TOKEN` to the same value as `SUMMARY_TOKEN` in Treasure's `.env`
   (create one with `openssl rand -hex 32` and put it in both). `TREASURE_URL` defaults to
   `http://niijima-treasure:3000`.
4. **Compendium.** In the wiki, open Settings → **API & Apps** (older Outline: **API Tokens**),
   create a key named "Niijima Home" and put it in `OUTLINE_TOKEN`. If Outline runs on the same
   Docker network, set `OUTLINE_URL` to its container (e.g. `http://outline:3000`); otherwise
   the server asks `https://compendium.niijimasisters.com`, which must then not be behind
   Cloudflare Access for it.
5. **Art.** The host pictures come from `~/niijima-data/assets`, the folder every Niijima app and the landing page share (set `NIIJIMA_ASSETS` in `.env` to use another): `menu-makoto.png` and `menu-sae.png`, or the
   names you set in `config.yml`. They never go into git.
6. **Links.** Edit `links:` in `config.yml`. Save and reload the page: config changes are picked
   up by themselves, no restart.

Check it with `docker compose logs -f home`; the log ends with `ready · sign-in discord …`.

**Update:** `git pull && docker compose up -d --build`

A `config.yml` copied from an older example lists `sections: [search, network, links, today,
treasury]`, which keeps the big sections and leaves the strip out. Change it to
`sections: [search, strip, network, links]` (or delete the line) to get the strip.

| To change              | Edit                    | Then                           |
| ---------------------- | ----------------------- | ------------------------------ |
| Links, sections, lines | `config.yml`            | Reload the page                |
| Art                    | `~/niijima-data/assets` | Reload the page                |
| Tokens, sign-in        | `.env`                  | `docker compose up -d`         |
| The app itself         | `git pull`              | `docker compose up -d --build` |

The three hosts are routed by one Traefik rule (`APP_HOST`, `MAKOTO_HOST`, `SAE_HOST` in
`.env`); it wins over the landing page's wildcard catch-all.

## Make it your homepage

### Firefox on a computer

**Homepage** (the Home button, and new windows):
Settings → **Home** → _Homepage and new windows_ → **Custom URLs…** → enter
`https://home.niijimasisters.com` (or your sister's own address,
`https://makoto.niijimasisters.com`).

**New tab page**: Firefox has no setting for a custom new-tab address, and the old
`browser.newtab.url` in `about:config` was removed years ago (Firefox 41), so it does nothing.
Use the **New Tab Override** add-on:

1. Install it from addons.mozilla.org ("New Tab Override" by Sören Hentzschel).
2. Open its options (Add-ons and themes → New Tab Override → Options).
3. _Option_: **Custom URL**, _URL_: `https://home.niijimasisters.com`.
4. Tick **Set focus to the web page instead of the address bar**, so you can type into the
   search box (and use `/` and the number keys) straight away.

### Firefox for Android

- If your version has **Settings → Homepage** with a custom address, enter
  `https://home.niijimasisters.com` there.
- Otherwise: open the page, then menu (⋮) → **Add to shortcuts** so it's a tile on Firefox's
  home screen, and menu (⋮) → **Add to Home screen** (or **Install**) to get it as an app icon
  with its own name and icon. On `makoto.` or `sae.` the installed app is that sister's
  (her colours and icon). Links you open from the installed app show in an in-app tab.

The search box isn't focused on phones, so the keyboard doesn't pop up every time; money is
hidden until you tap **Show**.

## Development

```sh
pnpm install
cp config.example.yml config.yml   # optional; without it the defaults are used
ACCESS_MODE=off pnpm dev           # http://localhost:5182
pnpm verify                        # format check, lint, type checks, tests, production build
```

Needs Node.js 22 and pnpm 10. Without network access the page still renders: the weather tag is
left out, the dots show down, and each slot of the strip says it's unavailable.

```
src/lib/search.ts          what the search box does (address, bang or search)
src/lib/server/upstream.ts the 60-second cache with the 1.5-second wait for every outside answer
src/lib/server/sources.ts  weather, service checks, Calendar, Treasure and the Compendium
src/lib/server/outline.ts  the Compendium's Outline API (documents.list, collections.list)
src/lib/server/glance.ts   what the strip shows, shaped from those answers
src/lib/server/hosts.ts    which host shows whose page
src/lib/server/favicons.ts link icons, fetched once and kept in data/icons
src/lib/server/config.ts   config.yml, with every default
src/lib/components/        the sections
```

Fan site · Persona 5 © ATLUS / SEGA · not affiliated. No game art lives in this repository.
