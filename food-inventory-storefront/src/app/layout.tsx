import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Food Inventory Storefront",
  description: "Multi-tenant e-commerce storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
