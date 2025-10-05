import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStorefrontConfig } from '@/lib/api';
import ThemeProvider from '@/components/ThemeProvider';

interface DomainLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

/**
 * Genera metadata dinámica basada en la configuración del tenant
 */
export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  try {
    const { domain } = await params;
    const config = await getStorefrontConfig(domain);

    return {
      title: config.seo?.title || config.domain,
      description: config.seo?.description || `Tienda online de ${config.domain}`,
      keywords: config.seo?.keywords?.join(', ') || '',
      openGraph: {
        title: config.seo?.title || config.domain,
        description: config.seo?.description,
        images: config.theme?.logo ? [config.theme.logo] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: config.seo?.title || config.domain,
        description: config.seo?.description,
        images: config.theme?.logo ? [config.theme.logo] : [],
      },
      icons: {
        icon: config.theme?.favicon || '/favicon.ico',
      },
    };
  } catch (error) {
    return {
      title: 'Tienda no encontrada',
      description: 'La tienda que buscas no existe',
    };
  }
}

/**
 * Layout dinámico que aplica el theme del tenant
 */
export default async function DomainLayout({
  children,
  params,
}: DomainLayoutProps) {
  let config;

  try {
    const { domain } = await params;
    config = await getStorefrontConfig(domain);

    // Verificar que la tienda esté activa
    if (!config.isActive) {
      notFound();
    }
  } catch (error) {
    notFound();
  }

  // Generar CSS variables para el theme
  const themeStyles = `
    :root {
      --primary-color: ${config.theme?.primaryColor || '#fb923c'};
      --secondary-color: ${config.theme?.secondaryColor || '#f97316'};
      --primary-rgb: ${hexToRgb(config.theme?.primaryColor || '#fb923c')};
      --secondary-rgb: ${hexToRgb(config.theme?.secondaryColor || '#f97316')};
    }
    
    /* Estilos base con colores del theme */
    .btn-primary {
      background-color: var(--primary-color);
      color: white;
    }
    
    .btn-primary:hover {
      opacity: 0.9;
    }
    
    .text-primary {
      color: var(--primary-color);
    }
    
    .bg-primary {
      background-color: var(--primary-color);
    }
    
    .border-primary {
      border-color: var(--primary-color);
    }
    
    ${config.customCSS || ''}
  `;

  return (
    <ThemeProvider theme={config.theme}>
      <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </ThemeProvider>
  );
}

/**
 * Convierte un color hexadecimal a RGB
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
}
