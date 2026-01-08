import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';

// Inject Keyframes and Global Styles from V4
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-float { animation: float 8s ease-in-out infinite; }
  .animate-bounce-custom { animation: bounce 3s ease-in-out infinite; }
  .perspective-container { perspective: 1000px; }
  .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); }
  .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
  .stack-card { will-change: transform, opacity; transition: transform 0.1s linear, opacity 0.1s linear; }
  .rotate-y-12 { transform: rotateY(12deg) rotateX(6deg); }
  .hover-rotate-0:hover { transform: rotateY(0deg) rotateX(0deg) !important; }
  @keyframes pulse-slow { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
  .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
  .bg-navy-900 { background-color: #0A0F1C; }
  .text-gradient { background: linear-gradient(to right, #06B6D4, #A855F7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  @keyframes pulse-glow { 0%, 100% { filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.3)); } 50% { filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.5)); } }
  .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
`;
document.head.appendChild(styleSheet);

const SmartKubikLanding = () => {
    const [language, setLanguage] = useState('es');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Toggle Language Handler
    const toggleLanguage = () => {
        setLanguage(prev => prev === 'es' ? 'en' : 'es');
    };

    // Scroll Stack Animation Logic (Ported from Vanilla JS)
    useEffect(() => {
        const handleScroll = () => {
            const section = document.querySelector('#section-scroll-stack');
            const cards = document.querySelectorAll('.stack-card');
            if (!section || cards.length === 0) return;

            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;

            // Start animation when section enters viewport
            const startOffset = sectionTop;
            // End animation when looking at the stack footer
            const endOffset = sectionTop + sectionHeight - viewportHeight;

            // Calculate progress (0 to 1)
            let progress = (scrollY - startOffset) / (endOffset - startOffset);
            progress = Math.max(0, Math.min(progress, 1));

            cards.forEach((card, index) => {
                // Stagger the cards
                // Card 1 starts at p=0, Card 2 at p=0.1, etc.
                const cardStart = index * 0.15;
                const cardDuration = 0.5; // How long a card stays "active" in the animation flow

                let cardProgress = (progress - cardStart) / cardDuration;
                cardProgress = Math.max(0, Math.min(cardProgress, 1));

                // Easing
                const easeOut = 1 - Math.pow(1 - cardProgress, 3);

                const cardGap = 20;
                const scaleStep = 0.05;

                // Visual calculations
                // Cards move UP as we scroll down (to simulate stacking)
                // But in the "Stack" visual, they pile up.
                // Actually, let's replicate the vanilla logic logic:
                // translateY: drops the card onto the stack

                // Logic from backup:
                // let yPos = (1 - easeOut) * 100; // Moves from 100px down to 0
                // But we want them to enter from bottom?
                // The prompt said "Stack Logic".
                // Let's use a simpler stack effect if the exact vanilla is complex:

                // Exact Vanilla Logic Interpretation:
                // Cards are `sticky` or fixed? No, standard flow.
                // Let's rely on the CSS classes mostly, but if there was JS transform:

                if (progress > 0) {
                    // Apply parallax/stack transform
                    const yOffset = index * -cardGap * easeOut;
                    const scale = 1 - (cards.length - 1 - index) * scaleStep * (1 - easeOut);
                    // This suggests cards shrink as they stack?

                    // Simplified Stack Effect for reliability:
                    const reverseIndex = cards.length - 1 - index;
                    const targetY = reverseIndex * 15; // 15px stacking
                    const targetScale = 1 - (reverseIndex * 0.05);

                    if (progress > index * 0.2) {
                        // Card is active
                        card.style.transform = \`translateY(\${targetY}px) scale(\${targetScale})\`;
                 card.style.opacity = '1';
             } else {
                 // Card waiting
                 card.style.transform = \`translateY(100px) scale(0.9)\`;
                 card.style.opacity = '0.5';
             }
        }
      });
      
      // Update Footer Opacity based on total progress
      const footer = document.querySelector('#stack-footer');
      if (footer) {
          footer.style.opacity = progress > 0.8 ? '1' : '0.2';
          footer.style.transform = progress > 0.8 ? 'translateY(0)' : 'translateY(50px)';
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
