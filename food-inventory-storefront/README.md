# Food Inventory Storefront

Multi-tenant e-commerce storefront built with Next.js 15.

## Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Connects to NestJS API at http://localhost:3000

## Project Structure

```
food-inventory-storefront/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── templates/            # Storefront templates (will be created by Manus)
│   ├── components/           # Reusable components
│   ├── lib/                  # Utilities and API client
│   └── types/                # TypeScript types
├── public/                   # Static assets
└── package.json
```

## Getting Started

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

The storefront will be available at http://localhost:3001

### Environment Variables

Create a `.env.local` file (already created):

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3001
```

## Next Steps

Use the **Prompt 4** with Manus to build:
1. API client (`src/lib/api.ts`)
2. ModernEcommerce template
3. Dynamic routing system
4. All pages (home, products, cart, checkout)

## Development Notes

- Port: 3001 (to avoid conflict with backend on 3000)
- Backend must be running at http://localhost:3000
- Templates will be created in `src/templates/`
- Dynamic routes will use `[domain]` parameter
