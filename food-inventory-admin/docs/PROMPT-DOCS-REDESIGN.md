# Prompt: UX/UI 80% Redesign — Documentation Pages (Desktop + Mobile)

## Your Role

Apply the `/ux-design` skill. You are a product designer with 25 years of experience at Stripe Docs, Notion Help Center, Intercom Articles, and Zendesk Guide — the last 10 years exclusively focused on **support-driven UX for non-technical users**. You specialize in help centers where the user arrives FRUSTRATED — something isn't working, they can't find a feature, they're about to give up. Your job is to reduce their frustration FAST, not add to it.

You are grounded in: **cognitive load theory** (Miller — a frustrated user can hold 3±1 items in working memory, not 7±2), **the frustration-aggression hypothesis** (Dollard — blocked goals create aggression; each extra click on a help page amplifies it), **information scent theory** (Pirolli — users follow "scent" of the answer; weak scent = they leave), **the paradox of the active user** (Carroll — users don't read instructions, they try things first and seek help only when stuck), and **learned helplessness** (Seligman — after 3 failed attempts to find help, users stop trying and churn).

Your UX philosophy: **If a user is reading documentation, something already went wrong.** They didn't find the answer in the UI itself. They're here because they're stuck, frustrated, and their patience is at 10%, not 100%. Every extra click, every wall of text, every generic category grid INCREASES their frustration. The documentation must work like a triage nurse: "Tell me what hurts" → "Here's exactly what to do" → "Done, go back to work." Three steps. Under 60 seconds. Anything longer and you lose them.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a). **Both desktop AND mobile.** Motion tokens in `src/lib/motion.js`.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

The docs system has 1,167 lines across 5 components + 31 markdown articles + index.js config. All existing routes, search, sidebar, TOC, breadcrumbs, markdown rendering, and mobile drawer must continue working.

---

## Current State

### Architecture
```
/docs                   → DocsLanding.jsx (320 lines)
/docs/:category         → DocsCategoryPage.jsx (256 lines)
/docs/:category/:slug   → DocsArticle.jsx (338 lines)

Supporting:
├── DocsHeader.jsx (94 lines) — sticky header
├── DocsSidebar.jsx (159 lines) — category tree + TOC
└── docs/index.js (362 lines) — all articles config + search

Content: 31 markdown files across 17 categories
Search: Client-side, searches title + description + keywords
Mobile: Floating "Índice" button → drawer sidebar
```

### The User Who Arrives Here

This is NOT a developer reading API docs. This is a **barbershop owner who can't figure out how to adjust stock**. Their mental state:

```
"I tried clicking everything. Nothing works. 
 My employee is waiting. My client is waiting. 
 I'm on my phone. I just need to know HOW TO DO THIS ONE THING.
 If I can't find it in 30 seconds, I'm calling support or giving up."
```

### 14 Problems (Ranked by Frustration Impact)

| # | Problem | Impact on Frustrated User |
|---|---------|---------------------------|
| 1 | **Landing page shows 15+ category cards** — frustrated user arrives and sees a GRID of categories (Inventario, Ventas, Compras, Finanzas, RRHH...). They don't know which category their problem belongs to. Cognitive overload at the WORST moment. | User freezes. "Is adjusting stock under Inventario or under Productos?" |
| 2 | **Search requires 3+ characters** — user must type 3 chars before search activates. On mobile with frustration, even typing "como" feels like a tax. | Friction at the moment of highest intent |
| 3 | **No contextual help from INSIDE the app** — user is in the inventory module and gets stuck. There's no "?" button or "Ayuda" link that takes them to the relevant docs article. They must navigate to /docs, find the category, find the article. | Help is disconnected from the context where the problem occurs |
| 4 | **Articles are walls of text** — markdown articles are long-form guides. A frustrated user scanning for "how to adjust stock" must read 2000 words to find the 3 steps they need. | TL;DR — user skips the article entirely |
| 5 | **No quick-answer snippets** — search shows article titles and descriptions but doesn't show THE ANSWER. "How to adjust stock" returns an article link, not the steps. | User must click through to find the answer — extra click = extra frustration |
| 6 | **No "popular problems" or FAQ** — landing page shows categories, not problems. Should show "Los usuarios más buscan:" with top queries. | User doesn't see their problem reflected immediately |
| 7 | **Category page is another grid** — clicking a category shows another grid of articles. User must now scan 5-10 article titles to guess which one has their answer. | Double-grid navigation: landing → category → article = 3 clicks minimum |
| 8 | **No video/GIF content** — all articles are text + screenshots. A 15-second screen recording showing "click here → click there → done" is 10x faster than 500 words of text. | Text-heavy docs punish non-readers (which is most users) |
| 9 | **Mobile drawer is manual** — user must tap floating "Índice" button to see navigation. On a phone, they're scrolling a long article with no visible way to navigate. | Mobile users scroll endlessly or give up |
| 10 | **No reading progress** — on long articles, no progress bar showing how far through they are. Blog has this feature; docs don't. | User feels lost in a long article |
| 11 | **No "Was this helpful?" feedback** — article ends and there's no way for user to say "this didn't help." No escalation path. | Dead end → frustration → churn |
| 12 | **No related problems** — article ends with "related articles" from same category, but not "people with this problem also had THIS problem." | Misses cross-category connections |
| 13 | **ZERO Framer Motion** — everything is static. No search result animation, no article transition, no sidebar reveal. | Feels like a 2018 static site |
| 14 | **No AI assistant integration** — the landing page mentions an AI assistant but doesn't embed it. User must go BACK to the app to use the assistant. | Help center promotes a feature it doesn't provide |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE — "Tell Me What Hurts" (40%)

#### 1.1 Problem-First Landing Page (Replace Category Grid)

Replace the 15-category grid with a **problem-first interface**:

```
┌──────────────────────────────────────────────────────────────┐
│ Centro de Ayuda                        [Contactar soporte]   │
│                                                              │
│ ¿Con qué necesitas ayuda?                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🔍 Describe tu problema... (ej: "no puedo ajustar stock")│ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Lo más buscado:                                              │
│ [Ajustar stock] [Crear una cita] [Configurar pagos]         │
│ [Agregar profesional] [Cierre de caja] [No-shows]           │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Guías por módulo                                             │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ 📅 Agenda │ │ 📦 Stock  │ │ 💰 Cobros │ │ ⚙ Config  │   │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ 👤 Equipo │ │ 🌐 Mi Web │ │ 📊 Report │ │ 💬 WhatsApp│   │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key changes:**
- **Search bar is HERO** — biggest element on the page, auto-focused on desktop. Placeholder: "Describe tu problema..." (not "Buscar en documentación"). Problem-framing, not feature-framing.
- **Search activates on 1 character** (not 3) — instant results
- **"Lo más buscado" pills** — top 6-8 most common problems as tappable chips. Data from search analytics or hardcoded based on support ticket frequency. Clicking a pill either jumps to the answer or opens the relevant article.
- **Categories BELOW** — still accessible, but secondary. Reduced to 8 (not 15) — grouped by daily usage, not by module name. Labels are problem-oriented: "Cobros y Caja" not "Finanzas".
- **Contact support button** visible in header — frustrated users who can't find the answer need an IMMEDIATE escalation path (WhatsApp to support)

#### 1.2 Smart Search with Instant Answers

Current search shows article links. Redesigned search shows THE ANSWER:

```
🔍 "ajustar stock"

┌──────────────────────────────────────────────────────────────┐
│ RESPUESTA RÁPIDA                                             │
│                                                              │
│ Para ajustar stock:                                          │
│ 1. Ve a Inventario → Stock                                  │
│ 2. Busca el producto                                         │
│ 3. Haz clic en [+] o [-] junto a la cantidad                │
│ 4. Selecciona la razón y confirma                            │
│                                                              │
│ [Ver guía completa →]                                        │
├──────────────────────────────────────────────────────────────┤
│ ARTÍCULOS RELACIONADOS                                       │
│ 📄 Cómo gestionar tu inventario (5 min)                      │
│ 📄 Alertas de stock bajo (3 min)                             │
│ 📄 Importar productos en lote (4 min)                        │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Add a `quickAnswer` field to article frontmatter: 3-5 steps in plain text
- When search matches an article with `quickAnswer`, show the steps INLINE in the search dropdown
- "Ver guía completa" links to the full article
- This means the user gets the answer WITHOUT LEAVING THE SEARCH RESULTS — 0 clicks after typing

```yaml
# In markdown frontmatter:
---
title: Cómo ajustar stock
quickAnswer: |
  1. Ve a Inventario → Stock
  2. Busca el producto
  3. Haz clic en [+] o [-] junto a la cantidad
  4. Selecciona la razón y confirma
---
```

#### 1.3 Contextual Help Links FROM the App

Add a `HelpButton` component to every module header in the admin app:

```jsx
// In each module (e.g., InventoryManagement.jsx):
<HelpButton
  articleSlug="como-ajustar-stock"
  label="¿Necesitas ayuda?"
/>
```

Renders as a subtle `?` icon or "Ayuda" text link in the module header. Clicking opens the relevant docs article in a new tab (or a slide-over panel).

**This is the HIGHEST-IMPACT change** because it connects help to the context where the problem occurs. The user doesn't have to leave their current module.

#### 1.4 Article Structure: TL;DR First

Every article should start with a quick-answer summary:

```
# Cómo ajustar stock

> **En resumen:** Inventario → Stock → [+]/[-] → razón → confirmar.
> Tiempo estimado: 30 segundos.

---

## Paso a paso detallado
...rest of the article...
```

- **TL;DR box at the top** with 1-2 sentences + estimated time
- Collapsible "Paso a paso detallado" for users who need more
- The summary IS the answer for 80% of users
- The detailed steps are for the 20% who need hand-holding

#### 1.5 "Was This Helpful?" + Escalation

At the end of every article:

```
┌──────────────────────────────────────────────────────────────┐
│ ¿Te ayudó este artículo?                                     │
│ [👍 Sí] [👎 No, necesito más ayuda]                          │
│                                                              │
│ (if No clicked:)                                             │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [💬 Hablar por WhatsApp] [🤖 Preguntar al Asistente IA] │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- "Sí" → brief "Gracias" toast + log for analytics
- "No" → escalation options: WhatsApp support + AI assistant link
- NEVER a dead end — always a next step

---

### LAYER 2: INTERACTION — "Here's Exactly What to Do" (35%)

#### 2.1 Search Animation
- Results dropdown fades in with `fadeUp` (DUR.fast)
- Each result staggers with `STAGGER(0.03)`
- Quick answer box scales in with `SPRING.soft`
- No results: "No encontramos resultados" with suggestion pills

#### 2.2 Article Transitions
- Category → article: content `fadeUp` with `DUR.base`
- Breadcrumb navigation: instant (no animation delay — speed matters when frustrated)
- Related articles at bottom: stagger on scroll into view

#### 2.3 Reading Progress Bar
- Thin progress bar at top of article page (like the blog has)
- `h-0.5 bg-primary` fixed at top, width tracks scroll position
- Gives spatial awareness in long articles

#### 2.4 Sidebar Animation
- Category expand: spring height animation (`SPRING.soft`)
- Active article highlight: pill indicator slides (`layoutId` pattern)
- Mobile drawer: slide-in with `SPRING.drawer`

#### 2.5 Skeleton Loading
- Search results: shimmer rectangles while filtering
- Article content: skeleton matching paragraph shapes while markdown loads
- Category grid: card-shaped skeletons

#### 2.6 "Lo más buscado" Chips Animation
- Chips stagger in on landing page mount (`STAGGER(0.04)`, `scaleIn`)
- Tap feedback: `whileTap={{ scale: 0.95 }}`

#### 2.7 Mobile Optimizations
- Search bar: auto-focused with keyboard appearing immediately
- Category grid: 2 columns (not 3) on mobile
- Floating TOC button: larger touch target (56px), positioned above thumb zone
- Article content: `prose-sm` on mobile for tighter reading
- Quick answer in search: full-width on mobile, no truncation
- "Was this helpful?" buttons: full-width, large touch targets (48px)

---

### LAYER 3: CELEBRATION — "Done, Go Back to Work" (25%)

Documentation doesn't need confetti. But it needs **relief moments**:

#### 3.1 Quick Answer Found — Visual Confirmation
When search shows a quick answer:

```
✓ Respuesta rápida encontrada
```

- Green checkmark scales in with `SPRING.bouncy`
- The quick answer box has a subtle green left border
- This signals: "You found what you needed. You can go now."

#### 3.2 Article Completed — Next Step Clear
After reading an article, show a clear next action:

```
┌──────────────────────────────────────────────────────────────┐
│ ✓ Ahora ya sabes cómo ajustar stock                         │
│                                                              │
│ [← Volver a SmartKubik]  [📄 Artículos relacionados]        │
└──────────────────────────────────────────────────────────────┘
```

- "Volver a SmartKubik" button links back to the app module where the article is relevant
- This closes the loop: app → docs → app

#### 3.3 Support Request Sent — Acknowledgment
If user clicks "Hablar por WhatsApp":

```
"Te estamos conectando con soporte. Respuesta típica: < 5 min."
```

- Sets expectation
- Reduces anxiety
- Shows the user they're not alone

#### 3.4 Search Analytics (Intelligence Trap for the Business)
Track what users search for most. This data becomes invaluable for:
- Identifying features that need better UI (if 100 users search "how to adjust stock," the adjust stock UX needs redesigning)
- Writing new articles for common problems
- Training the AI assistant

Store search queries in analytics:
```javascript
trackEvent('docs_search', { query, resultsCount, quickAnswerShown });
trackEvent('docs_article_read', { slug, category, readTime, wasHelpful });
trackEvent('docs_escalation', { method: 'whatsapp' | 'ai_assistant', fromArticle: slug });
```

---

## Micro-interactions Table

| Element | Trigger | Animation | Spec |
|---------|---------|-----------|------|
| Search bar | Page mount (desktop) | Auto-focus | Immediate |
| Search results | Typing 1+ char | Dropdown fadeUp | `DUR.fast` |
| Result items | Results loaded | Stagger | `STAGGER(0.03)`, `listItem` |
| Quick answer | Match found | Box scaleIn + green border | `SPRING.soft` |
| Quick answer checkmark | Shown | Scale 0→1 | `SPRING.bouncy` |
| "Lo más buscado" chips | Mount | Stagger scaleIn | `STAGGER(0.04)` |
| Chip tap | User taps | Scale 0.95 | `whileTap` |
| Category card | Mount | Stagger fadeUp | `STAGGER(0.05)`, `listItem` |
| Article content | Mount | fadeUp | `DUR.base` |
| Reading progress | Scroll | Width tracks scroll % | CSS `scroll` event |
| Sidebar expand | Category click | Height spring | `SPRING.soft` |
| Sidebar active | Article active | Pill slide | `layoutId` |
| Mobile drawer | "Índice" tap | Slide-in | `SPRING.drawer` |
| "Was helpful?" Sí | Tap | Green flash + toast | 200ms |
| "Was helpful?" No | Tap | Expand escalation | `SPRING.soft` height |
| Related articles | Scroll into view | Stagger fadeUp | IntersectionObserver |
| Skeleton → content | Data loaded | Crossfade | `mode="wait"` |

---

## Implementation Order

```
LAYER 1 — STRUCTURE (do first, biggest impact):
  1. Add quickAnswer field to article frontmatter (update 31 markdown files)
  2. Redesign DocsLanding — search as hero + "lo más buscado" pills + 8 categories
  3. Smart search with inline quick answers
  4. TL;DR summary at top of every article
  5. "Was this helpful?" + escalation at bottom of every article
  6. HelpButton component for in-app contextual help (optional — requires changes to other modules)
  7. Reduce 17 categories to 8 user-facing groups

LAYER 2 — INTERACTION:
  8. Search results animation (dropdown, stagger, quick answer scaleIn)
  9. Reading progress bar on articles
  10. Sidebar spring animation (expand/collapse)
  11. Article content fadeUp transition
  12. Category cards stagger on landing
  13. Skeleton loading for search/articles
  14. Mobile: auto-focus search, larger TOC button, full-width quick answers
  15. "Lo más buscado" chips stagger animation

LAYER 3 — CELEBRATION/RELIEF:
  16. Quick answer found visual confirmation (green checkmark)
  17. Article completed — clear next step ("Volver a SmartKubik")
  18. Search analytics tracking
  19. Escalation UX (WhatsApp + AI assistant)
```

**After EACH item:** build + verify on both desktop and mobile viewports.

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Find answer without clicking article | Quick answer shown in search results |
| Time from search to answer | < 10 seconds (type → see quick answer) |
| Know what's most common | "Lo más buscado" pills visible without scrolling |
| No dead ends | Every article ends with helpful/unhelpful + escalation |
| Mobile usable | Search auto-focuses, TOC button prominent, text readable |
| Frustration reduced | Search at 1 char (not 3), TL;DR at top of articles |
| Analytics captured | Every search, read, and escalation tracked |
| Feels modern | Every load has skeleton → stagger, every interaction has animation |

---

## Technical Constraints

- Content remains in markdown files (NOT migrated to CMS)
- Add `quickAnswer` field to frontmatter (backward-compatible — old articles without it skip quick answer display)
- Search remains client-side (31 articles is small enough)
- Routes stay the same (/docs, /docs/:category, /docs/:category/:slug)
- Both desktop and mobile must be tested
- Build: `npx vite build`
- Test: 375px (mobile), 768px (tablet), 1280px (desktop)

### What NOT to Build

- CMS migration (markdown files work fine for 31 articles)
- AI chat embedded in docs (the AI assistant is in the app already)
- User accounts for docs (public, no login required)
- Comments/discussion on articles
- Full-text search index (client-side is sufficient for 31 articles)

---

## Deliverables

1. `DocsLanding.jsx` — search-first redesign with quick answers, "lo más buscado" pills, 8 categories
2. `DocsArticle.jsx` — TL;DR summary box, reading progress bar, "was this helpful?" feedback, clear next step
3. `DocsCategoryPage.jsx` — stagger animation on article cards
4. `DocsSidebar.jsx` — spring expand/collapse, layoutId active indicator
5. `docs/index.js` — reduced categories (17→8), add quickAnswer support to search
6. 31 markdown files — add `quickAnswer` field to frontmatter
7. `HelpButton.jsx` (NEW) — contextual help link component for in-app use
8. `DocsSearchResults.jsx` (NEW or refactored) — inline quick answer display
9. `ArticleFeedback.jsx` (NEW) — "Was this helpful?" + escalation
10. `ReadingProgress.jsx` (NEW) — thin progress bar for articles
11. Analytics events for search, read, and escalation tracking
12. Build passing, all routes working, both desktop and mobile verified

The user who arrives at the documentation is already frustrated. Every design decision must ask: "Does this REDUCE frustration or ADD to it?" If an element adds cognitive load, remove it. If an interaction adds clicks, eliminate it. The best documentation experience is one the user never needs — but when they do, it says: "I know exactly what you're looking for. Here it is. Now go back to running your business."
