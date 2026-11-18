# Lumi: your pocket buddy

**Lumi** is a free wellbeing website for young people (12–24) in NSW, built around a cute 3D character that reacts to how you feel.

It was made by a young person from **Auburn, Cumberland (Sydney)** as a pitch to the **NSW Office for Youth**, after applying for the NSW Youth Summit 2026.

**Live site:** https://reihooneh.github.io/lumi/

> Lumi is a prototype. It is **not** a crisis service or medical, legal or financial advice.
> If you're not safe right now, call **000**. Kids Helpline **1800 55 1800** (ages 5–25, 24/7) · Lifeline **13 11 14**.

---

## Why Lumi?

| What we know | Source |
|---|---|
| Mental health, cost of living and housing were the top issues for NSW young people in 2026 | NSW Office for Youth, Youth Week 2026 polling report |
| 29% of young people in NSW use AI to look after their mental health | NSW Youth Week 2026 polling report |
| 76% of young people feel unheard in government decision-making | NSW Youth Summit 2024 report |
| 73.9% of households in Cumberland use a language other than English at home | ABS Census 2021 QuickStats, Cumberland LGA |
| Young "language brokers" in Sydney started interpreting for family at age 11 on average, a form of "hidden care" | Narchal & Hembrow (2024), Western Sydney University |
| Unpaid trials are only lawful when they're short, supervised, and only to show the skills needed for the job | Fair Work Ombudsman guidance |

Full pitch, data and sources: [`docs/PITCH.md`](docs/PITCH.md)

---

## What it does

| Page | Features |
|---|---|
| **Home** | Live 3D Lumi you can tap, drag and spin, a "Today" summary, and links to every tool |
| **Talk** | AI chat with Lumi. You can speak (mic) and Lumi can talk back. Lumi's face reacts to the conversation. A crisis box with helplines appears straight away if someone writes something worrying. One tap turns the chat into a Story Pass |
| **Lens** | Live camera or photo upload. Lumi explains letters, bills and payslips in plain English, lists what to do and when it's due, and translates for your family (15 languages) and reads it aloud |
| **Check-in** | 6 moods that change Lumi's colour and face, energy level, voice notes, an AI reflection, a mood calendar for the month, and a streak counter |
| **Calm** | Breathing that Lumi grows and shrinks with (3 patterns, optional spoken guide), an AI worry shrinker, 5-4-3-2-1 grounding, and helplines |
| **Tell it once** | A Story Pass for counsellors and GPs. You choose which parts to share, then copy or download it |
| **My money** | Weekly budget donut chart, a housing stress check, your personal price rise, and AI saving ideas |
| **Work rights** | A 4-question unpaid trial check based on Fair Work guidance, plus a shift diary showing your pay per hour |
| **My voice** | Share an idea and get a tracking code like a parcel. AI can help make the idea stronger |
| **My Lumi** | Name and colour Lumi, dress it up (hat, headphones, bow, flower crown), grow a garden, earn 11 badges, choose Lumi's brain, and download or delete your data |

It works on phones (bottom tab bar, and it can be installed to your home screen) and on computers, in light and dark mode.

---

## Lumi's three "brains"

Everyone can use Lumi. Visitors choose a brain under **My Lumi → Lumi's brain**:

1. **Cloud AI (smartest).** Uses Claude through a small server you deploy (see below). It reads photos directly and translates well. The API key stays secret on the server.
2. **On-device AI (free and private).** Runs a small AI model (Qwen2.5 1.5B, via [WebLLM](https://github.com/mlc-ai/web-llm)) inside the visitor's browser. Nothing leaves the device. It needs WebGPU (recent Chrome or Edge on a computer or Android phone) and a one-time download of about 1 GB. Photos are read with [Tesseract.js](https://github.com/naptha/tesseract.js), which handles English text only.
3. **No AI.** Simple built-in replies. Every non-AI feature still works.

Voice uses the browser's own speech features: speech-to-text in Chrome, Edge and Safari, and text-to-speech in all modern browsers. The camera uses the browser camera, which needs HTTPS. GitHub Pages provides that.

---

## Switch on Cloud AI for everyone (optional)

The site works without this. To give every visitor the smartest brain:

1. Get an API key at https://console.anthropic.com (usage is paid. Set a monthly spend limit there.)
2. Install Node.js, then deploy the server in `/server` to Cloudflare Workers (free plan):
   ```bash
   cd server
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # paste your key
   npx wrangler deploy
   ```
   Wrangler prints an address like `https://lumi-ai.<your-name>.workers.dev`.
3. Put that address in `config.js`:
   ```js
   window.LUMI_CONFIG = { apiUrl: 'https://lumi-ai.<your-name>.workers.dev' };
   ```
4. Commit and push. Done.

The server only accepts requests from the sites listed in `ALLOWED_ORIGINS` (in `server/wrangler.toml`). It limits each visitor to 30 requests per 10 minutes, caps answer length, accepts at most one photo per request, and stores nothing. For a real launch, also add Cloudflare rate-limiting rules.

---

## Run it on your computer

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No build step. It's plain HTML, CSS and JavaScript (`index.html`, `config.js`), with [three.js](https://threejs.org) for the 3D character.

## Privacy

- Check-ins, story, money, shifts, ideas and settings are saved **only in the visitor's browser** (localStorage). **My Lumi → Delete everything** wipes them.
- With Cloud AI, chat text and photos go to the Lumi server and Claude only when an AI feature is used, and are not stored by Lumi.
- With on-device AI, nothing leaves the device.

## Files

```
index.html            the whole app
config.js             settings (Cloud AI address)
manifest.webmanifest  lets people add Lumi to their home screen
icons/                app icons
server/worker.js      Cloud AI server (Cloudflare Worker)
server/wrangler.toml  server settings
docs/PITCH.md         the idea, the data and sources
```

## Licence

MIT. Free to use, change and share.
