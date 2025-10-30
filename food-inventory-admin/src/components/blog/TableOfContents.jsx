import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming shadcn/ui ScrollArea
import { Button } from '@/components/ui/button';
import { cn, generateHeadingId } from '@/lib/utils'; // Utility for conditional class names

const TableOfContents = ({ content }) => {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (!content) return;

    const extractedHeadings = [];
    // Portable Text structure: content is an array of blocks
    content.forEach(block => {
      if (block._type === 'block' && block.style) {
        if (block.style === 'h2' || block.style === 'h3') {
          const text = block.children.map(child => child.text || '').join('');
          const id = generateHeadingId(block);
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
      <Link to="/blog">
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
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </ScrollArea>
  );
};

export default TableOfContents;
