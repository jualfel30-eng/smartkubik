'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // Changed from react-router-dom
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn, generateHeadingId } from '@/lib/utils';

const TableOfContents = ({ content }: { content: any[] }) => {
    const [headings, setHeadings] = useState<any[]>([]);
    const [activeId, setActiveId] = useState('');

    useEffect(() => {
        if (!content) return;

        const extractedHeadings: any[] = [];
        // Portable Text structure: content is an array of blocks
        content.forEach((block: any) => {
            if (block._type === 'block' && block.style) {
                if (block.style === 'h2' || block.style === 'h3') {
                    const text = block.children?.map((child: any) => child.text || '').join('');
                    const id = generateHeadingId(block.children); // Use block.children for id generation logic
                    if (id) {
                        extractedHeadings.push({
                            id,
                            text,
                            level: parseInt(block.style.replace('h', '')),
                        });
                    }
                }
            }
        });
        setHeadings(extractedHeadings);
    }, [content]);

    // Intersection Observer for active heading highlighting
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '0px 0px -70% 0px' } // Adjust as needed
        );

        headings.forEach((heading) => {
            const element = document.getElementById(heading.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            headings.forEach((heading) => {
                const element = document.getElementById(heading.id);
                if (element) {
                    observer.unobserve(element);
                }
            });
        };
    }, [headings]);

    if (headings.length === 0) {
        return null;
    }

    return (
        <ScrollArea className="h-[calc(100vh-150px)] py-6 px-6 ml-6">
            <Link href="/blog">
                <Button variant="ghost" size="sm" className="mb-6 w-full justify-start">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Blog
                </Button>
            </Link>
            <h3 className="mb-6 text-lg font-semibold tracking-tight">Contenido</h3>
            <nav className="flex flex-col space-y-3">
                {headings.map((heading) => (
                    <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={cn(
                            'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1',
                            heading.level === 3 && 'ml-4',
                            activeId === heading.id && 'text-primary font-semibold'
                        )}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                            setActiveId(heading.id);
                        }}
                    >
                        {heading.text}
                    </a>
                ))}
            </nav>
        </ScrollArea>
    );
};

export default TableOfContents;
