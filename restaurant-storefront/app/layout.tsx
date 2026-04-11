import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import { restaurantApi } from "@/lib/api";
import { resolveTenantId } from "@/lib/tenant";
import { RestaurantConfig } from "@/types";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-sans',
});

const syne = Syne({
  subsets: ["latin"],
  variable: '--font-display',
});

// Fetch config una vez por request (Next.js cachea automáticamente en producción)
async function getRestaurantConfig(): Promise<RestaurantConfig | null> {
  const tenantId = await resolveTenantId();
  if (!tenantId) return null;
  try {
    const data = await restaurantApi.getConfig(tenantId);
    return data as RestaurantConfig;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getRestaurantConfig();
  const name = config?.restaurantName || "Restaurante";
  return {
    title: name,
    description: config?.tagline || `Menú y pedidos de ${name}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getRestaurantConfig();
  const accentColor = config?.accentColor || "#FF4500";

  return (
    <html lang="es" className={`${inter.variable} ${syne.variable}`}>
      {/* Inyectar --accent dinámicamente desde la config del tenant */}
      <head>
        <style>{`:root { --accent: ${accentColor}; }`}</style>
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
