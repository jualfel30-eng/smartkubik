import React from 'react';
import Link from 'next/link'; // Changed from react-router-dom
import { ChevronRight } from 'lucide-react';

const BlogBreadcrumb = ({ category, tag, postTitle }: { category?: string | null, tag?: string | null, postTitle?: string }) => {
    // Map category IDs to display names
    const categoryNames: Record<string, string> = {
        'purchases-inventory': 'Compras, Inventarios y Costeo',
        'sales-orders': 'Ventas y Órdenes',
        'finance-accounting': 'Finanzas y Contabilidad',
        'operations-logistics': 'Operaciones y logística',
        'crm-postsale': 'CRM y posventa',
        'analytics-reports': 'Analítica y Reportes'
    };

    return (
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground py-3 px-6 ml-6 flex-wrap">
            <Link
                href="/blog"
                className="hover:text-foreground transition-colors"
            >
                Blog
            </Link>

            {category && (
                <>
                    <ChevronRight className="w-4 h-4" />
                    <Link
                        href={`/blog?category=${category}`}
                        className="hover:text-foreground transition-colors"
                    >
                        {categoryNames[category] || category}
                    </Link>
                </>
            )}

            {tag && (
                <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="hover:text-foreground transition-colors">
                        {tag}
                    </span>
                </>
            )}

            {postTitle && (
                <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
                        {postTitle}
                    </span>
                </>
            )}
        </nav>
    );
};

export default BlogBreadcrumb;
