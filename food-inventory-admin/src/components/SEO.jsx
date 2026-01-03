import { Helmet } from 'react-helmet-async';

/**
 * SEO Component with JSON-LD structured data
 * Optimized for search engines and AI discovery
 */
const SEO = ({
  title,
  description,
  keywords = [],
  author = "Equipo SmartKubik",
  type = "article",
  image = "https://smartkubik.com/og-image.png",
  url,
  publishedTime,
  modifiedTime,
  category,
  readTime,
  // Structured data specific fields
  articleData,
  breadcrumbs = [],
  faqItems = [],
}) => {
  // Base URL
  const baseUrl = "https://smartkubik.com";
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;

  // Organization structured data
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SmartKubik",
    url: baseUrl,
    logo: `${baseUrl}/logo-smartkubik.png`,
    description: "ERP todo en uno para PyMEs. Sistema de gestión empresarial en la nube.",
    sameAs: [
      "https://facebook.com/smartkubik",
      "https://twitter.com/smartkubik",
      "https://linkedin.com/company/smartkubik",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@smartkubik.com",
      availableLanguage: ["Spanish", "English"],
    },
  };

  // Software Application schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SmartKubik ERP",
    operatingSystem: "Web, iOS, Android",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "29",
      highPrice: "150",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "29",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
    },
    description: "ERP todo en uno para gestión de inventario, ventas, CRM y contabilidad. Diseñado para PyMEs en Latinoamérica.",
  };

  // Article structured data
  const articleSchema = articleData ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: image,
    author: {
      "@type": "Organization",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "SmartKubik",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo-smartkubik.png`,
      },
    },
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
    keywords: keywords.join(", "),
    articleSection: category,
    wordCount: articleData.wordCount,
    timeRequired: readTime,
    inLanguage: "es-MX",
  } : null;

  // Breadcrumb structured data
  const breadcrumbSchema = breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`,
    })),
  } : null;

  // FAQ structured data
  const faqSchema = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  } : null;

  // How-To structured data (for tutorial articles)
  const howToSchema = articleData?.isHowTo ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description: description,
    image: image,
    totalTime: readTime,
    step: articleData.steps?.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })) || [],
  } : null;

  // Combine all schemas
  const schemas = [
    organizationSchema,
    articleSchema,
    breadcrumbSchema,
    faqSchema,
    howToSchema,
  ].filter(Boolean);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title} | SmartKubik</title>
      <meta name="title" content={`${title} | SmartKubik`} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(", ")} />}
      <meta name="author" content={author} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="SmartKubik" />
      <meta property="og:locale" content="es_MX" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {category && <meta property="article:section" content={category} />}
      {keywords.length > 0 && keywords.map((keyword, index) => (
        <meta key={index} property="article:tag" content={keyword} />
      ))}

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      <meta name="twitter:creator" content="@smartkubik" />

      {/* Additional Meta Tags for SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="Spanish" />
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />

      {/* Mobile Optimization */}
      <meta name="theme-color" content="#0066FF" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Structured Data (JSON-LD) */}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
