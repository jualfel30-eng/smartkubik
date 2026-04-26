# Prompt: UX/UI Audit & Mobile Optimization — Beauty Storefront Template

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building consumer-facing booking interfaces at Airbnb, OpenTable, ClassPass, and Mindbody. You specialize in conversion-rate optimization for service booking flows — you know that every additional tap loses 7% of users, every loading state without feedback loses 12%, and every confusing label loses 3%. You have audited 500+ booking flows and shipped interfaces where the conversion rate from "landed on page" to "booking confirmed" exceeded 35%. You understand that a client booking a haircut at 11pm from their bed is making an emotional decision — the storefront must feel luxurious, fast, and reassuring. Not like a form. Like walking into the salon itself.

You are auditing the **SmartKubik Beauty Storefront** — a Next.js 15 public-facing booking page used by salon/barbershop CLIENTS (not owners). The storefront lives at `{tenant}.smartkubik.com/beauty`. Stack: Next.js 15 + React 19 + Tailwind CSS 3.4 + Framer Motion. Supports dark/light mode with a luxury palette. Fonts: Playfair Display (serif headers) + Inter (body).

---

## Context: What This Page Must Achieve

This is the MOST IMPORTANT page in the entire SmartKubik ecosystem. It's the only page that CLIENTS (not salon owners) ever see. If this page doesn't convert visitors into bookings, nothing else matters — the POS, the commissions, the reports are all useless without appointments.

**Conversion funnel:**
```
Client sees link (WhatsApp, Instagram, Google) 
  → Lands on storefront (/beauty)
    → Taps "Reservar"
      → Completes 5-step booking (/beauty/reservar)
        → Receives confirmation (/beauty/reserva/{number})
```

**Target audience:** Salon clients in Venezuela/LATAM
- 90% mobile (viewing from Instagram link or WhatsApp share)
- Scrolling at 11pm in bed, or between errands during the day
- Deciding between this salon and the one their friend recommended
- Need to see: what services exist, what they cost, who will do it, when it's available
- Trust signals: reviews, gallery, professional photos, location
- Booking barrier: "do I have to create an account?" (answer must be NO)

---

## Current Architecture

### Storefront Landing (`/beauty`)
**File:** `food-inventory-storefront/src/templates/BeautyStorefront/index.tsx`

**Sections (scroll order):**
1. Hero — video/image banner, salon name, tagline, "Reservar" CTA
2. Services — grid of services with prices, durations, categories
3. Team — professional cards with photos, specialties, bios
4. Gallery — portfolio images with before/after slider
5. Reviews — client testimonials grid
6. Location — Google Maps embed, hours, contact info
7. Footer — powered by SmartKubik

**Premium features:** Lenis smooth scroll, Framer Motion reveals, grain overlay texture, loading screen, floating CTA (desktop only — appears after 300px scroll)

### Booking Page (`/beauty/reservar`)
**File:** `food-inventory-storefront/src/app/[domain]/beauty/reservar/page.tsx`

**5-step wizard:**
1. Select services (grid with packages/individual, addons)
2. Select professional (cards with "no preference" option)
3. Select date + time (date picker + time slot grid)
4. Enter client info (name, phone, notes, no-show policy check)
5. Review + confirm (summary, submit)

**Navigation:** Step indicator + sticky bottom bar (back, summary, next/confirm)

### Confirmation (`/beauty/reserva/{bookingNumber}`)
**File:** `food-inventory-storefront/src/app/[domain]/beauty/reserva/[bookingNumber]/page.tsx`

**Shows:** Success badge, booking number, details, add-to-calendar (ICS), share on WhatsApp, contact business

### Styling
- Luxury palette: luxury.black (#0A0A0A), luxury.cream (#F5F5F0), luxury.gold (#C9A96E)
- Dynamic accent: `primaryColor` and `secondaryColor` per tenant (configurable)
- Dark/light toggle with localStorage persistence
- Typography: Playfair Display (serif headers), Inter (body)
- Custom shadows: `shadow-premium`, `shadow-premium-lg`

### API
```
GET  /public/storefront/by-domain/{domain}     — tenant config
GET  /public/beauty-services/{tenantId}         — services list
GET  /public/beauty-packages/{tenantId}         — service packages
GET  /public/professionals/{tenantId}           — team members
GET  /public/beauty-gallery/{tenantId}          — portfolio
GET  /public/beauty-reviews/{tenantId}          — testimonials
GET  /public/google-places/{placeId}            — Google ratings
POST /public/beauty-bookings/availability       — time slots
POST /public/beauty-bookings                    — create booking
GET  /public/beauty-bookings/client-status      — no-show check
GET  /public/beauty-bookings/booking-number/{n} — confirmation details
```

---

## Audit Scope

Audit EVERY aspect of the client-facing experience on mobile (375px-430px). For each issue found, provide:
1. **What's wrong** (specific observation)
2. **Why it matters** (impact on conversion/UX)
3. **How to fix it** (specific implementation)
4. **Priority** (P0 = blocking conversion, P1 = hurting conversion, P2 = polish)

### Audit Categories

#### A. First Impression (0-3 seconds)

Evaluate what the client sees in the first 3 seconds on mobile:
- Does the hero communicate WHAT this business does instantly?
- Is the "Reservar" CTA visible above the fold without scrolling?
- Does the page load fast enough? (loading screen duration, LCP)
- Is the salon name and key info (address, hours) immediately visible?
- Does it look professional or template-y? Does it feel like THIS salon or like a generic booking site?
- Is there social proof visible immediately (rating, review count)?

#### B. Service Discovery (Browsing Services)

- Can the client find their desired service in under 5 seconds?
- Is the service grid usable on 375px? (card size, text readability, price visibility)
- Are categories filterable? Searchable?
- Is pricing clear? (no hidden costs, no ambiguous "desde $X")
- Are service durations visible? (clients need to know how long it takes)
- Do service images add value or are they generic placeholders?
- Are packages/combos clearly differentiated from individual services?
- Can the client understand what an "addon" is without explanation?

#### C. Booking Flow (5-Step Wizard)

For EACH of the 5 steps, evaluate:

**Step 1 (Services):**
- Can the client select/deselect services easily on mobile?
- Is multi-select obvious? (how does the client know they can pick multiple?)
- Does the total update live as they select/deselect?
- Are packages vs individual services visually distinct?
- What happens with 0 services selected? Is the error clear?

**Step 2 (Professional):**
- Is "Sin preferencia" the default or does the client have to actively choose it?
- Are professional cards informative enough? (name + photo + specialties visible at a glance)
- What if there's only 1 professional? Is this step skipped?
- What if a professional has no photo? Does the fallback look professional?

**Step 3 (Date + Time):**
- Is the date picker mobile-friendly? (native HTML date or custom?)
- Are time slots large enough to tap? (44px minimum)
- What happens when no slots are available for a date? (empty state)
- How many slots are visible without scrolling?
- Is the "today" shortcut obvious?
- Does selecting a date feel responsive? (loading indicator while fetching slots)

**Step 4 (Client Info):**
- Is the phone input usable on mobile? (country selector, numeric keyboard)
- Is creating an account required? (it should NOT be)
- Is the no-show policy warning clear but not scary?
- Are required vs optional fields marked?
- Does the keyboard push the form out of view?

**Step 5 (Confirmation Review):**
- Can the client see everything they're about to book in one glance?
- Is the total price prominent?
- Is the "Confirmar" button compelling? ("Confirmar ✓" vs "Reservar mi cita")
- Is there a loading state while the booking is being created?
- What happens on error? (network failure, slot already taken, etc.)

#### D. Post-Booking (Confirmation Page)

- Does the client feel confident their booking is confirmed? (visual weight of success)
- Is the "Add to Calendar" button prominent? (most important post-booking action)
- Is the WhatsApp share button useful? (pre-filled message with booking details)
- Does the confirmation page follow the three-stage reward sequence?
  - Anticipation: loading while creating booking
  - Reveal: success confirmation with ceremony
  - Celebration: confetti/animation + share prompt

#### E. Navigation & Flow

- Is back-navigation clear at every step? (can the client go back without losing selections?)
- Is the step indicator accurate and visible on mobile?
- Does the sticky bottom bar work well on small screens? (not covering content)
- Can the client exit the booking flow and return to the storefront easily?
- What happens if the client refreshes mid-booking? (data persistence)

#### F. Performance & Loading

- What's the Largest Contentful Paint (LCP) on mobile?
- Does the loading screen add unnecessary delay?
- Are images optimized? (Next.js Image component used? Lazy loading?)
- Is Lenis smooth scroll causing jank on low-end Android devices?
- Are API calls parallelized or sequential?
- Is there a skeleton/shimmer while content loads?

#### G. Trust & Persuasion

- Are Google ratings/review counts visible on the storefront?
- Are client testimonials authentic-looking? (photo + name + date)
- Is there a "verified" or "trusted" badge anywhere?
- Is the WhatsApp contact button prominent enough?
- Does the gallery show real work or stock photos?
- Is the "no account required" messaging clear? (reduces booking anxiety)

#### H. Accessibility

- Are all interactive elements minimum 44px touch targets?
- Is contrast ratio ≥ 4.5:1 in both light and dark modes?
- Do all images have alt text?
- Is the booking form navigable with keyboard?
- Is the step indicator screen-reader friendly?
- Does the phone input work with assistive technology?

#### I. Dark/Light Mode

- Is the dark mode toggle discoverable on mobile?
- Does dark mode feel intentional or just inverted colors?
- Are all sections readable in both modes?
- Does the accent color (dynamic per tenant) work in both modes?
- Are images/gallery affected by dark mode? (should they be?)

#### J. Micro-interactions & Delight

- Is there haptic feedback on service selection? (if supported)
- Do service cards animate on selection? (scale, border, checkmark?)
- Does the time slot grid have hover/tap feedback?
- Is the step transition animated? (slide, fade, or instant?)
- Does the confirmation page celebrate the booking? (or is it a flat "success" message?)
- Are there any "gift moments" in the booking flow? (anticipation → reveal → celebration)
- Does the storefront have any scroll-triggered reveals? (or does everything appear at once?)

---

## Deliverables

For each audit category (A-J), provide:

1. **Findings table:**

| # | Issue | Severity | Current Behavior | Recommended Fix |
|---|-------|----------|-----------------|-----------------|
| A1 | ... | P0/P1/P2 | ... | ... |

2. **Priority-ranked fix list** (all P0s first, then P1s, then P2s)

3. **Before/After wireframes** (ASCII) for the top 5 highest-impact changes

4. **Micro-interaction spec** for any new animations/transitions recommended

5. **Implementation notes:**
   - File paths to modify
   - Tailwind classes to add/change
   - Framer Motion animations to add
   - API calls to optimize
   - Performance improvements

6. **Conversion impact estimate** for each P0/P1 fix (based on industry benchmarks):
   - "Adding live total display during service selection: +8-12% completion rate (source: Booking.com A/B tests)"
   - "Reducing booking steps from 5 to 3: +15-20% completion rate (source: Expedia checkout redesign)"

The audit must be ruthlessly honest. If the storefront is good, say what's good and why. If something is broken, don't sugarcoat it. The goal is a booking page that converts at 30%+ from landing to confirmed booking. Every recommendation must serve that goal.
