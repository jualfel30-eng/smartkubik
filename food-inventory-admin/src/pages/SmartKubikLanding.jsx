import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SmartKubikLogoDark from '@/assets/logo-smartkubik.png';
import LightRaysCanvas from '../components/LightRaysCanvas';
import SalesContactModal from '../components/SalesContactModal';

// Industry Backgrounds
import RestaurantBg from '@/assets/industries/restaurant.png';
import RetailBg from '@/assets/industries/retail.png';
import ManufacturaBg from '@/assets/industries/manufactura.png';
import ServicesBg from '@/assets/industries/services.png';
import LogisticsBg from '@/assets/industries/logistics.png';
import HotelsBg from '@/assets/industries/hotels.png';

// Restaurant Mockups
import ErpTables from '@/assets/industries/erp_tables.png';
import ErpKds from '@/assets/industries/erp_kds.png';
import ErpReservations from '@/assets/industries/erp_reservations.png';
import ErpBillSplitting from '@/assets/industries/erp_billsplitting.png';
import ErpTips from '@/assets/industries/erp_tips.png';
import ErpMenu from '@/assets/industries/erp_menu.png';

const SmartKubikLanding = () => {
    const [language, setLanguage] = useState('es');
    const [isDashboardHovered, setIsDashboardHovered] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(1);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Industry Active Feature States
    const [activeRestaurantFeature, setActiveRestaurantFeature] = useState(null); // Default: None (Show generic bg + card)

    // Configuration for Contact Details
    const CONTACT_CONFIG = {
        whatsapp: "584244263922", // Format: CountryCode + Number
        email: "hola@smartkubik.com",
    };

    const whatsAppLink = `https://wa.me/${CONTACT_CONFIG.whatsapp}?text=Hola%20SmartKubik,%20estoy%20interesado%20en%20profesionalizar%20mi%20negocio%20con%20IA.`;
    // Email link is no longer needed for mailto, but kept for fallback or display if needed. 
    // We will use the modal instead.
    const emailLink = "#"; // Placeholder as we use onClick handler

    // Inject critical styles on mount
    useEffect(() => {
        const styleId = 'smartkubik-custom-styles';
        // Remove existing style if present to ensure fresh update
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
          /* Global body styles to match backup */
          html { scroll-behavior: smooth !important; }
          body {
            background-color: #0A0F1C !important;
            color: #F8FAFC !important;
          }

          /* Custom color classes */
          .bg-navy-900 { background-color: #0A0F1C !important; }
          .bg-navy-800 { background-color: #0F172A !important; }
          .bg-navy-700 { background-color: #1E293B !important; }
          .text-cyan-electric { color: #06B6D4 !important; }
          .bg-cyan-electric { background-color: #06B6D4 !important; }
          .border-cyan-electric { border-color: #06B6D4 !important; }
          .text-text-secondary { color: #94A3B8 !important; }

          /* Section 6 AI background gradient fix */
          #ia > div:first-child {
            background: linear-gradient(to right, rgba(8, 51, 68, 0.2), #0A0F1C, rgba(88, 28, 135, 0.5)) !important;
          }

          /* Button styles from backup */
          .btn-primary {
            background: linear-gradient(135deg, #06B6D4, #10B981) !important;
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.4) !important;
            transition: all 0.3s ease !important;
          }

          .btn-primary:hover {
            transform: translateY(-2px) scale(1.02) !important;
            box-shadow: 0 0 50px rgba(6, 182, 212, 0.6) !important;
          }

          /* Glass card styles from backup - but NOT for stack-card elements */
          .glass-card:not(.stack-card) {
            background: rgba(255, 255, 255, 0.03) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            transform: translate3d(0, 0, 0) !important;
            -webkit-transform: translate3d(0, 0, 0) !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
            will-change: auto !important;
            transition: all 0.3s ease !important;
          }

          .glass-card:not(.stack-card):hover {
            border-color: rgba(6, 182, 212, 0.5) !important;
            border-width: 2px !important;
            box-shadow:
              0 8px 32px rgba(6, 182, 212, 0.15),
              0 0 0 1px rgba(6, 182, 212, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
          }

          /* Animations */
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
          .stack-card { will-change: transform, opacity; transition: transform 0.1s linear, opacity 0.1s linear; }
          .rotate-y-12 { transform: rotateY(12deg) rotateX(6deg); }
          .hover-rotate-0:hover { transform: rotateY(0deg) rotateX(0deg) !important; }
          @keyframes pulse-slow { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
          .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
          .text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500 { background: linear-gradient(to right, #06B6D4, #A855F7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
          @keyframes pulse-glow { 0%, 100% { filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.3)); } 50% { filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.5)); } }
          .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }

          /* Custom overlap adjustments for specific resolutions - WITH PROGRESSIVE PADDING */
          @media (max-width: 639px) {
            /* Móviles pequeños: -120px overlap */
            #modulos { margin-top: calc(-44vh + 25px) !important; }
            /* COMPACT TYPOGRAPHY FOR MOBILE */
            h1 { font-size: 3rem !important; line-height: 1.1 !important; } /* 48px - Restored Hero Size */
            h2 { font-size: 1.375rem !important; line-height: 1.2 !important; } /* 22px */
            p, li, .text-base, .text-lg { font-size: 15px !important; }
          }
          @media (min-width: 640px) and (max-width: 767px) {
            /* Móviles grandes/tablets pequeños: -200px overlap */
            #modulos { margin-top: calc(-55vh + 25px) !important; }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            /* Tablets: -250px overlap */
            #modulos { margin-top: -53vh !important; }
          }

          /* PROGRESSIVE PADDING SYSTEM (1024px - 1799px) */
          /* Logic: As resolution decreases, padding INCREASES to simulate "zooming out" */
          
          /* PRICING EXCEPTION: Prevent pricing cards from crushing */
          @media (min-width: 1024px) {
            #pricing .max-w-7xl {
              max-width: 90% !important; 
              padding-left: 2rem !important;
              padding-right: 2rem !important;
            }
          }

          @media (min-width: 1024px) and (max-width: 1279px) {
            /* 1024px - 1279px (Includes 1168px - Air/Small Laptop)
               RELAXED PADDING: 4rem (was 8rem) 
               FIX: Removed 'section' selector to allow full-width backgrounds */
            #modulos { margin-top: -40vh !important; }
            .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
              padding-left: 4rem !important;
              padding-right: 4rem !important;
            }
            .max-w-7xl { max-width: 60rem !important; } /* Relaxed width constraint */
            
            /* TUNED TYPOGRAPHY: H1 Restored, H2/H3 Compact */
            h1 { font-size: 2.75rem !important; line-height: 1.1 !important; } /* 44px - RESTORED PRESENCE */
            h2 { font-size: 1.5rem !important; line-height: 1.2 !important; } /* 24px - Compact */
            h3 { font-size: 1.25rem !important; line-height: 1.3 !important; } /* 20px - Compact */
            /* Force 14px Body Text for High Density */
            p, li, .text-base, .text-lg, span.text-base, div.text-base { 
                font-size: 14px !important; 
                line-height: 1.5 !important;
            }
            /* GLOBAL CARD TEXT EXCEPTION (13px) */
            #parallax-cards p, .glass-card p, .glass-card .text-sm, .stack-card p { font-size: 13px !important; }
          }

          @media (min-width: 1280px) and (max-width: 1439px) {
            /* 1280px - 1439px (13" Pro / Standard Laptop)
               RELAXED PADDING: 4.5rem (was 6rem) */
            #modulos { margin-top: -38vh !important; }
            .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
              padding-left: 4.5rem !important;
              padding-right: 4.5rem !important;
            }
            .max-w-7xl { max-width: 72rem !important; } /* Wide enough */
            
            /* TUNED TYPOGRAPHY */
            h1 { font-size: 3rem !important; line-height: 1.2 !important; } /* 48px - IMPACTFUL */
            h2 { font-size: 1.5rem !important; line-height: 1.3 !important; } /* 24px - Compact */
            /* Force 14px Body Text for High Density */
            p, li, .text-base, .text-lg, span.text-base, div.text-base { 
                font-size: 14px !important; 
                line-height: 1.5 !important;
            }
            /* GLOBAL CARD TEXT EXCEPTION (13px) */
            #parallax-cards p, .glass-card p, .glass-card .text-sm, .stack-card p { font-size: 13px !important; }
          }

          @media (min-width: 1440px) and (max-width: 1535px) {
             /* 1440px - 1535px (High Res Laptop)
                Ranges up to 15" Laptops.
                RELAXED PADDING: 4.5rem (was 5rem) */
            #modulos { margin-top: -45vh !important; }
            .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
              padding-left: 4.5rem !important;
              padding-right: 4.5rem !important;
            }
            .max-w-7xl { max-width: 76rem !important; }
            
            /* TUNED TYPOGRAPHY */
            h1 { font-size: 3rem !important; line-height: 1.2 !important; } /* 48px */
            h2 { font-size: 1.5rem !important; line-height: 1.3 !important; } /* 24px */
            /* Force 14px Body Text for High Density */
            p, li, .text-base, .text-lg, span.text-base, div.text-base { 
                font-size: 14px !important; 
                line-height: 1.5 !important;
            }
            /* GLOBAL CARD TEXT EXCEPTION (13px) */
            #parallax-cards p, .glass-card p, .glass-card .text-sm, .stack-card p { font-size: 13px !important; }
          }

          @media (min-width: 1536px) and (max-width: 1799px) {
             /* 1536px - 1799px (16" Pro / 2K Monitors)
                LIGHT PADDING: 4rem (64px) side padding 
                TYPOGRAPHY: Intact (Standard Design) - Starts getting bigger here */
            #modulos { margin-top: calc(-47.5vh + 10px) !important; }
            .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
              padding-left: 4rem !important;
              padding-right: 4rem !important;
            }
            .max-w-7xl { max-width: 72rem !important; }
          }

          /* Large Screens */
          @media (min-width: 1800px) and (max-width: 1999px) {
            /* 1920x1200: -520px overlap */
            #modulos { margin-top: calc(-53vh + 10px) !important; }
            /* Keep standard padding & typography */
          }
          @media (min-width: 2000px) {
            /* 2056x1285+: Keep current value */
            #modulos { margin-top: calc(-53vh + 10px) !important; }
          }
        `;
        document.head.appendChild(styleSheet);

        return () => {
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        };
    }, []);

    // Section 6 Sticky Scroll Observer
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-40% 0px -40% 0px', // Trigger when element is near center
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const step = parseInt(entry.target.dataset.step);
                    if (step) setActiveStep(step);
                }
            });
        }, observerOptions);

        const triggers = document.querySelectorAll('.step-trigger');
        triggers.forEach(trigger => observer.observe(trigger));

        return () => {
            triggers.forEach(trigger => observer.unobserve(trigger));
        };
    }, []);

    // Toggle Language Handler
    const toggleLanguage = () => {
        setLanguage(prev => prev === 'es' ? 'en' : 'es');
    };

    // Scroll Stack Animation Logic - Optimized for Mobile/iOS
    useEffect(() => {
        let metrics = {
            sectionTop: 0,
            sectionHeight: 0,
            scrollDistance: 0,
            viewportHeight: 0
        };

        const section = document.querySelector('#section-scroll-stack');
        const cards = document.querySelectorAll('.stack-card');
        const title = document.querySelector('#stack-title');
        const footer = document.querySelector('#stack-footer');

        const calculateMetrics = () => {
            if (!section) return;
            const rect = section.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            metrics.sectionTop = rect.top + scrollTop;
            metrics.sectionHeight = section.offsetHeight;
            metrics.viewportHeight = window.innerHeight;

            // CRITICAL FIX: Lock section height to PIXELS on mobile to prevent address bar jumps
            // We use the initial '250svh' but then freeze it in px
            if (window.innerWidth < 768) {
                const fixedHeight = window.innerHeight * 2.5;
                // Only set if different to avoid thrashing
                if (section.style.height !== fixedHeight + 'px') {
                    // section.style.height = fixedHeight + 'px'; 
                    // Actually, let's rely on cached metrics calculation which logic uses, 
                    // but the JS logic below uses 'metrics.sectionHeight'.
                    // If we don't change the DOM height, the 'vh' in CSS will still cause resize.
                    // So YES, we must set pixel height on the DOM element.
                    section.style.height = fixedHeight + 'px';
                    metrics.sectionHeight = fixedHeight; // Update metric to match
                }
            } else {
                // Reset on desktop
                section.style.height = '250vh';
            }

            metrics.scrollDistance = metrics.sectionHeight - metrics.viewportHeight;
        };

        const handleScroll = () => {
            if (!section || cards.length === 0) return;

            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // Calculate progress (0 to 1) using CACHED metrics
            let rawProgress = (scrollTop - metrics.sectionTop) / metrics.scrollDistance;
            let progress = Math.max(0, Math.min(1, rawProgress));

            // Title - KEEP VISIBLE (Pinned) UNTIL EXIT
            // Exit Logic: Mimic Card Stacking Physics
            // Last card settles at ~0.51. We start Title "stacking back" at 0.50.
            let titleDepth = 0;
            if (progress > 0.50) {
                titleDepth = (progress - 0.50) / 0.10; // Rate of moving back
            }

            if (title) {
                if (titleDepth > 0) {
                    // Mimic Card Stacking: Scale down + Fade
                    // Scale: 1 -> 0.8
                    const exitScale = Math.max(0.8, 1 - (titleDepth * 0.05));

                    // Opacity: Aggressive fade matching "depth > 0.2" logic of cards
                    // We accelerate it slightly to ensure it's gone by the time "Eso es SmartKubik" is fully up
                    let exitOpacity = 1;
                    if (titleDepth > 0.1) {
                        exitOpacity = Math.max(0, 1 - ((titleDepth - 0.1) * 2));
                    }

                    title.style.transform = `scale(${exitScale})`;
                    title.style.opacity = exitOpacity.toString();
                } else {
                    title.style.opacity = '1';
                    title.style.transform = 'scale(1)';
                }
            }

            // Cards Logic
            const cardGap = 20;
            const scaleStep = 0.05;

            // Global exit phase for cards - Starts later to clear the stagfe
            let cardsExitPhase = 0;
            if (progress > 0.55) {
                cardsExitPhase = (progress - 0.55) / 0.15;
            }

            cards.forEach((card, index) => {
                // Calculate specific trigger points for each card
                const cardStart = 0.0 + (index * 0.12);

                let cardProgress = (progress - cardStart) / 0.15;
                cardProgress = Math.max(0, Math.min(1, cardProgress));

                // Entrance: Translate Y from lower down to 0
                const easeOut = 1 - Math.pow(1 - cardProgress, 3);
                // Start VERY low (80% of viewport) to be hidden by bottom mask
                let translateY = (1 - easeOut) * (metrics.viewportHeight * 0.8);

                // Stacking Logic
                const currentCardFloat = (progress - 0.0) / 0.12;
                let depth = Math.max(0, currentCardFloat - (index + 1));

                // Apply stacking effects based on depth
                let stackOffset = -(depth * cardGap);
                let scale = 1 - (depth * scaleStep);

                // Aggressive Fade & Blur for background cards (readability)
                let opacity = 1;
                let blur = 0;

                if (depth > 0) {
                    // Delay the blur/fade slightly to allow readability as it starts moving back
                    // Only apply strong effects after depth > 0.2
                    if (depth > 0.2) {
                        const effectDepth = depth - 0.2;
                        opacity = Math.max(0.1, 1 - (effectDepth * 1.5));
                        blur = effectDepth * 10;
                    } else {
                        // Gentle fade initially w/o blur
                        opacity = 1 - (depth * 0.2);
                    }
                }

                // Initial entrance opacity (reveal as it comes up from bottom)
                if (cardProgress < 1) {
                    // Combine entrance opacity with stacking opacity
                    opacity = opacity * Math.min(1, easeOut * 2);
                }

                // SYNCHRONIZED BACKWARDS EXIT
                if (cardsExitPhase > 0) {
                    // Scale down further
                    scale = scale * (1 - (cardsExitPhase * 0.2));
                    // Fade out
                    opacity = opacity * (1 - (cardsExitPhase * 3));
                }

                // Apply transforms
                const finalY = translateY + stackOffset;
                card.style.transform = `translate3d(0, ${finalY}px, 0) scale(${Math.max(0.8, scale)})`;
                card.style.opacity = Math.max(0, opacity).toString();
                // We use Filter for blur. Note: 'backdrop-filter' is already on the class, this is standard filter.
                card.style.filter = `blur(${blur}px)`;
            });

            // Footer Animation - REVERTED to "Static Hold / Docking" (The V4 Original)
            if (footer) {
                footer.style.transition = 'none'; // Keep transition disabled for JS control

                if (progress > 0.5) {
                    // Phase 1: Rise to Center (0.5 to 0.75)
                    // Phase 2: HOLD (0.75 to 1.0) - The "Docking" Effect

                    let holdProgress = (progress - 0.5) / 0.25; // Normalizes 0.5->0.75 to 0->1
                    holdProgress = Math.min(1, holdProgress); // Clamp at 1 (HOLD)

                    // Opacity: 0 to 1 quickly
                    footer.style.opacity = Math.min(1, holdProgress * 4).toString();

                    // TranslateY: Move to -25vh (Center) and STAY THERE
                    // The "Mask" (Section 4) will rise to meet it.
                    const startY = 20;
                    const holdY = -25;
                    const currentY = startY - ((startY - holdY) * holdProgress);

                    footer.style.transform = `translateY(${currentY}vh) scale(${1 + (holdProgress * 0.15)})`;
                } else {
                    footer.style.opacity = '0';
                    footer.style.transform = 'translateY(20vh)';
                }
            }
        };

        // Use requestAnimationFrame for smoother performance
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        // Initial measurement
        let lastWidth = window.innerWidth;
        const onResize = () => {
            // Ignore vertical-only resizes (mobile address bar) to prevent glitches
            if (window.innerWidth !== lastWidth) {
                lastWidth = window.innerWidth;
                calculateMetrics();
            }
        };

        calculateMetrics();

        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, { passive: true });

        // Initial call to set positions
        handleScroll();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Parallax Effect Hook
    useEffect(() => {
        const handleScroll = () => {
            const section = document.getElementById('section-2-parallax');
            if (!section) return;

            const rect = section.getBoundingClientRect();
            const sectionTop = rect.top;
            const sectionHeight = rect.height;
            const windowHeight = window.innerHeight;

            // Only apply parallax when section is in viewport
            if (sectionTop < windowHeight && sectionTop + sectionHeight > 0) {
                const scrollProgress = (windowHeight - sectionTop) / (windowHeight + sectionHeight);

                // Elements to parallax
                const headline = document.getElementById('parallax-headline');
                const cards = document.getElementById('parallax-cards');
                const rays = document.getElementById('light-rays-container');

                if (headline) {
                    const speed = 0.15;
                    const offset = (scrollProgress - 0.5) * 100 * speed;
                    headline.style.transform = `translate3d(0, ${offset}px, 0)`;
                }

                if (cards) {
                    const speed = 0.05;
                    const offset = (scrollProgress - 0.5) * 100 * speed;
                    cards.style.transform = `translate3d(0, ${offset}px, 0)`;
                }

                if (rays) {
                    const speed = 0.3;
                    const offset = (scrollProgress - 0.5) * 100 * speed;
                    rays.style.transform = `translate3d(0, ${offset}px, 0)`;
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    useEffect(() => {
        // FAQ LOGIC
        const handleFaqClick = (e) => {
            const question = e.currentTarget;
            const answer = question.nextElementSibling;
            const icon = question.querySelector('.faq-icon');
            if (answer) answer.classList.toggle('hidden');
            if (icon) icon.classList.toggle('rotate-180');
        };

        const faqQuestions = document.querySelectorAll('.faq-question');
        faqQuestions.forEach(question => {
            question.addEventListener('click', handleFaqClick);
        });

        // CALCULATOR LOGIC
        const handleSliderInput = (e) => {
            const users = parseInt(e.currentTarget.value);
            const userCount = document.getElementById('userCount');
            const monthlyCost = document.getElementById('monthlyCost');
            const competitorCost = document.getElementById('competitorCost');
            const savings = document.getElementById('savings');
            const annualSavings = document.getElementById('annualSavings');

            if (userCount) userCount.textContent = users;

            // SmartKubik Cost (Flat Fee Tiers)
            let skCost = 29;
            if (users > 5 && users <= 20) {
                skCost = 59;
            } else if (users > 20) {
                skCost = 99;
            }

            // Fragmented Stack Cost
            const fragCost = 500 + (users * 50);
            const saveMonth = fragCost - skCost;
            const saveYear = saveMonth * 12;

            if (monthlyCost) monthlyCost.textContent = `$${skCost}`;
            if (competitorCost) competitorCost.textContent = `~$${fragCost.toLocaleString()}`;
            if (savings) savings.textContent = `$${saveMonth.toLocaleString()}`;
            if (annualSavings) annualSavings.textContent = `$${saveYear.toLocaleString()}`;
        };

        const slider = document.getElementById('userSlider');
        if (slider) {
            slider.addEventListener('input', handleSliderInput);
        }

        return () => {
            faqQuestions.forEach(question => question.removeEventListener('click', handleFaqClick));
            if (slider) slider.removeEventListener('input', handleSliderInput);
        };
    }, []);

    const switchTab = (tabId) => {
        // Hide all content
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.add('hidden');
        });
        // Show target content
        const target = document.getElementById('tab-' + tabId);
        if (target) {
            target.classList.remove('hidden');
            // Re-trigger animation
            target.classList.remove('animate-fade-in-up');
            void target.offsetWidth; // trigger reflow
            target.classList.add('animate-fade-in-up');
        }

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active', 'bg-white/10', 'text-white', 'border-cyan-electric/50', 'shadow-[0_0_15px_rgba(6,182,212,0.3)]');
                btn.classList.remove('text-text-secondary');
            } else {
                btn.classList.remove('active', 'bg-white/10', 'text-white', 'border-cyan-electric/50', 'shadow-[0_0_15px_rgba(6,182,212,0.3)]');
                btn.classList.add('text-text-secondary');
            }
        });
    };

    return (<div className="v4-landing-page">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Animated Orbs */}
            <div className="orb orb-cyan w-[800px] h-[800px] top-[-20%] left-[-10%]"></div>
            <div className="orb orb-emerald w-[1000px] h-[1000px] bottom-[-20%] right-[-20%]" style={{ animationDelay: '-5s' }}></div>
            <div className="orb orb-violet w-[600px] h-[600px] top-[30%] right-[10%]" style={{ animationDelay: '-10s' }}></div>
        </div>

        {/*  Background Effects (From V2)  */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/*  Animated Orbs  */}
            <div className="orb orb-cyan w-96 h-96 top-[-10%] left-[-5%]"></div>
            <div className="orb orb-emerald w-[500px] h-[500px] bottom-[-15%] right-[-10%]" style={{ animationDelay: "-5s" }}></div>
            <div className="orb orb-violet w-80 h-80 top-[40%] right-[20%]" style={{ animationDelay: "-10s" }}></div>
        </div>

        {/*  NAVIGATION (From V2: Sticky & Floating Glass Pill)  */}
        <nav className="fixed top-0 w-full z-50 py-4 px-4 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div id="nav-card" className="glass-card rounded-full px-6 py-3 flex justify-between items-center">
                    {/*  Logo  */}
                    <a href="#" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <img src="/assets/logo-smartkubik.png" alt="SmartKubik Logo" className="h-8 w-auto" />
                    </a>

                    {/*  Nav Links - Desktop (V2 Style + New Links)  */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
                        <a href="#modulos" className="hover:text-cyan-electric hover:font-bold transition-all">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Módulos</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Features</span>
                        </a>
                        <a href="#industrias" className="hover:text-cyan-electric hover:font-bold transition-all">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Industrias</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Industries</span>
                        </a>
                        <a href="#ia" className="hover:text-cyan-electric hover:font-bold transition-all">IA</a>
                        <a href="#whatsapp" className="hover:text-cyan-electric hover:font-bold transition-all">
                            WhatsApp
                        </a>
                        <a href="#pricing" className="hover:text-cyan-electric hover:font-bold transition-all">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Precios</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Pricing</span>
                        </a>
                        <Link to="/docs" className="hover:text-cyan-electric hover:font-bold transition-all">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ayuda</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Help</span>
                        </Link>
                        <Link to="/blog" className="hover:text-cyan-electric hover:font-bold transition-all">Blog</Link>
                    </div>

                    {/*  Language Toggle & CTA (V2 Style + Login/Register)  */}
                    <div className="flex items-center gap-4">
                        <button id="langToggle" onClick={toggleLanguage}
                            className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>🇪🇸 ES</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>🇺🇸 EN</span>
                        </button>

                        <Link to="/login"
                            className="hidden md:flex items-center justify-center w-9 h-9 rounded-full glass-card text-text-secondary hover:text-white hover:bg-white/10 transition-all group"
                            title={language === "es" ? "Inicia sesión" : "Log in"}>
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </Link>

                        <Link to="/register"
                            className="hidden md:inline-flex bg-gradient-to-br from-cyan-500 to-emerald-500 text-white px-6 py-2 rounded-full font-bold text-sm hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Regístrate</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Sign Up</span>
                        </Link>

                        {/*  Mobile Menu Toggle  */}
                        <button
                            className="md:hidden text-white p-2"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/*  Mobile Menu Overlay  */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-navy-900/95 backdrop-blur-xl flex flex-col justify-center items-center md:hidden animate-fade-in">
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white p-2"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex flex-col items-center gap-8 text-xl font-medium text-white">
                        <a href="#modulos" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Módulos</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Features</span>
                        </a>
                        <a href="#industrias" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Industrias</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Industries</span>
                        </a>
                        <a href="#ia" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">IA</a>
                        <a href="#whatsapp" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">WhatsApp</a>
                        <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Precios</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Pricing</span>
                        </a>
                        <Link to="/docs" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ayuda</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Help</span>
                        </Link>
                        <Link to="/blog" onClick={() => setIsMenuOpen(false)} className="hover:text-cyan-electric transition-colors">Blog</Link>

                        <div className="h-px w-24 bg-white/10 my-4"></div>

                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Inicia sesión</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Log in</span>
                        </Link>
                        <Link to="/register" onClick={() => setIsMenuOpen(false)}
                            className="bg-gradient-to-br from-cyan-500 to-emerald-500 text-white px-8 py-3 rounded-full font-bold hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Regístrate</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Sign Up</span>
                        </Link>
                    </div>
                </div>
            )}
        </nav>

        {/*  SECTION 1: HERO (From V3: High Impact 2-Column with 3D Mockup)  */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-screen flex items-center" style={{
            background: `radial-gradient(ellipse at 20% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 70%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 60%),
                        linear-gradient(180deg, #0A0F1C 0%, #1E293B 100%)`,
            backgroundSize: '150% 150%'
        }}>
            {/*  Grid Overlay  */}
            <div className="absolute inset-0 grid-overlay z-0"></div>

            {/*  Floating Orbs  */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse"></div>
            <div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] animate-pulse delay-1000">
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-20 items-center">

                    {/*  Hero Content  */}
                    <div className="text-left space-y-8 animate-fade-in-up">

                        {/*  Badge  */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyan-500/30">
                            <span className="relative flex h-3 w-3">
                                <span
                                    className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                            </span>
                            <span className="text-cyan-300 text-sm font-medium tracking-wide uppercase">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Nueva Generación ERP 2026</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Next Gen ERP 2026</span>
                            </span>
                        </div>

                        {/*  Headline  */}
                        <h1
                            className="text-5xl md:text-5xl lg:text-7xl font-extrabold tracking-tight leading-none"
                            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>
                                Deja de Administrar <span
                                    className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">Caos</span>.<br />
                                Empieza a Administrar <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Tu Negocio</span>.
                            </span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>
                                Stop Managing <span
                                    className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">Chaos</span>.<br />
                                Start Managing <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Your Business</span>.
                            </span>
                        </h1>

                        {/*  Subheadline  */}
                        <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>
                                Un solo sistema para inventario, ventas, contabilidad y nómina.
                                Con <strong className="text-white">Inteligencia Artificial</strong> que trabaja mientras tú
                                descansas.
                            </span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>
                                One system for inventory, sales, accounting, and payroll.
                                With <strong className="text-white">AI</strong> that works while you rest.
                            </span>
                        </p>

                        {/*  CTAs  */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-start">
                            <a href="#pricing"
                                className="bg-gradient-to-br from-cyan-500 to-emerald-500 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-lg shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)] hover:scale-105 transition-all">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Empezar Ahora</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Start Now</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </a>
                            <Link to="#demo"
                                className="btn-secondary inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg hover:bg-white/5 transition-all">
                                <span
                                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </span>
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ver Demo</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Watch Demo</span>
                            </Link>
                        </div>

                        {/*  Trust Signals  */}
                        <div className="flex items-center gap-6 text-sm text-text-secondary pt-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sin tarjeta de crédito</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Setup en 15 min</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Setup in 15 min</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🇻🇪</span>
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>100% Venezuela Ready</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>100% Venezuela Ready</span>
                            </div>
                        </div>
                    </div>

                    {/*  Hero Visual (3D Mockup from V3)  */}
                    <div className="relative hidden lg:block perspective-container animate-float"
                        style={{ animationDuration: "8s", perspective: '1000px' }}>
                        {/*  Decorative Elements behind  */}
                        <div
                            className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-full blur-3xl">
                        </div>

                        {/*  Main Dashboard Card  */}
                        {/*  Main Dashboard Card  */}
                        <div
                            onMouseEnter={() => setIsDashboardHovered(true)}
                            onMouseLeave={() => setIsDashboardHovered(false)}
                            style={{
                                transform: isDashboardHovered ? 'rotateX(0deg) rotateY(0deg) scale(1.05)' : 'rotateX(6deg) rotateY(12deg)',
                                boxShadow: isDashboardHovered
                                    ? '0 0 30px rgba(6, 182, 212, 0.15), 0 50px 100px -20px rgba(0, 0, 0, 0.4)'
                                    : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                borderColor: isDashboardHovered ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                                backgroundColor: 'rgba(10, 15, 28, 0.8)', // Deep Navy #0A0F1C
                                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            className="glass rounded-2xl p-2 md:p-4 border relative z-20">
                            {/*  Mockup Header  */}
                            <div className="flex gap-2 mb-4 border-b border-white/5 pb-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>

                            {/*  Mockup Body  */}
                            <div className="space-y-4">
                                {/*  Stats Row  */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                        <div className="text-xs text-gray-400">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ventas Hoy</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Sales Today</span>
                                        </div>
                                        <div className="text-xl font-mono font-bold text-emerald-400">$2,450.00</div>
                                        <div className="text-xs text-emerald-500/80">↗ 12%</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                        <div className="text-xs text-gray-400">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Órdenes</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Orders</span>
                                        </div>
                                        <div className="text-xl font-mono font-bold text-white">48</div>
                                        <div className="text-xs text-gray-500">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>3 pendientes</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>3 pending</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                        <div className="text-xs text-gray-400">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Inventario</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Inventory</span>
                                        </div>
                                        <div className="text-xl font-mono font-bold text-amber-400">Low</div>
                                        <div className="text-xs text-amber-500/80">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>5 alertas</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>5 alerts</span>
                                        </div>
                                    </div>
                                </div>

                                {/*  Graph Area Placeholder  */}
                                <div
                                    className="h-32 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-lg border border-white/5 relative overflow-hidden flex items-end px-2 gap-1">
                                    {/*  Bars simulation  */}
                                    <div className="w-1/6 bg-cyan-500/40 h-[40%] rounded-t-sm"></div>
                                    <div className="w-1/6 bg-cyan-500/50 h-[60%] rounded-t-sm"></div>
                                    <div className="w-1/6 bg-cyan-500/60 h-[30%] rounded-t-sm"></div>
                                    <div className="w-1/6 bg-cyan-500/70 h-[80%] rounded-t-sm"></div>
                                    <div className="w-1/6 bg-cyan-500/80 h-[55%] rounded-t-sm"></div>
                                    <div
                                        className="w-1/6 bg-emerald-500 h-[90%] rounded-t-sm shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                    </div>
                                </div>

                                {/*  Floating Notification  */}
                                <div className="absolute -right-12 top-20 glass p-3 rounded-xl border-l-4 border-l-emerald-500 shadow-xl animate-bounce"
                                    style={{ animationDuration: "3s" }}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white">
                                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Nueva Venta #1024</span>
                                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>New Sale #1024</span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Hace 2 min • $150.00</span>
                                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>2 min ago • $150.00</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        {/*  SECTION 2: LA BARRA DE DOLOR (From V2)  */}
        {/*  Doubled horizontal padding for more refined look  */}
        <section id="section-2-parallax" className="py-32 md:py-48 px-12 sm:px-16 lg:px-24 bg-black/30 relative overflow-hidden">
            {/*  Light Rays Background - Parallax Layer 1 (slowest)  */}
            <LightRaysCanvas />

            <div className="max-w-7xl mx-auto relative z-10">

                {/*  Headline - Parallax Layer 2 (faster)  */}
                <div id="parallax-headline" className="text-center mb-16 relative" data-speed="0.15">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Te suena familiar?</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Sound familiar?</span>
                    </h2>
                    <p className="text-xl text-text-secondary mt-6 max-w-2xl mx-auto">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Si te identificas con esto, no estás solo.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>If you identify with this, you are not alone.</span>
                    </p>
                </div>

                {/*  Pain Points Grid - Parallax Layer 3 (normal)  */}
                <div id="parallax-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative" data-speed="0.05">

                    {/*  Cards mapped manually to preserve exact text content  */}
                    {[
                        { icon: "📊", es: '"Uso Excel, QuickBooks, WhatsApp Business, y 3 apps más... y ninguna habla con la otra."', en: '"I use Excel, QuickBooks, WhatsApp Business, and 3 other apps... and none of them talk to each other."' },
                        { icon: "📦", es: '"Se me venden productos que ya no tengo. O se vencen porque nadie me avisó."', en: '"I sell products I don\'t have. Or they expire because no one warned me."' },
                        { icon: "💸", es: '"Gasto más de $800/mes en suscripciones y todavía no sé si gano o pierdo dinero."', en: '"I spend $800+/month on subscriptions and still don\'t know if I\'m making or losing money."' },
                        { icon: "⏰", es: '"Paso 3 horas al día contestando WhatsApp. No puedo ni almorzar tranquilo."', en: '"I spend 3 hours a day answering WhatsApp. I can\'t even have lunch in peace."' },
                        { icon: "📱", es: '"Quiero vender online pero no tengo tiempo de manejar otra plataforma."', en: '"I want to sell online but don\'t have time to manage another platform."' },
                        { icon: "😓", es: '"Los reportes para el contador me toman un día entero. Cada mes."', en: '"Monthly reports for my accountant take an entire day. Every. Single. Month."' }
                    ].map((item, index) => (
                        <div key={index}
                            className="rounded-2xl p-6 transition-all group duration-300"
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(245, 158, 11, 0.2)', // Amber-500/20
                                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'; // Amber-500/40
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                                e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                            }}
                        >
                            <div className="text-4xl mb-4">{item.icon}</div>
                            <p className={`text-text-secondary leading-relaxed lang-es ${language === "es" ? "" : "hidden"} `}>
                                {item.es}
                            </p>
                            <p className={`text-text-secondary leading-relaxed lang-en ${language === "en" ? "" : "hidden"} `}>
                                {item.en}
                            </p>
                        </div>
                    ))}

                </div>

                {/*  Closing Statement  */}
                <div className="text-center mt-12">
                    <p className="text-xl text-text-secondary">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Si marcaste 2 o más... no es tu culpa. <span className="text-white font-bold block mt-2 md:inline md:mt-0">Tu negocio creció, tus herramientas no.</span></span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>If you checked 2 or more... it's not your fault. <span className="text-white font-bold block mt-2 md:inline md:mt-0">Your business grew, your tools didn't.</span></span>
                    </p>
                </div>

            </div>
        </section>

        {/*  SECTION 3: SCROLL STACK (Vanilla JS Implementation)  */}
        {/* Fixed height to prevent mobile jumps - Lock to svh (Small Viewport Height) */}
        <section id="section-scroll-stack" className="relative bg-navy-900" style={{ height: "250svh" }}>
            {/*  Height defines scroll duration  */}
            <div className="sticky top-0 w-full flex flex-col items-center justify-center overflow-hidden" style={{ height: '100svh' }}>

                {/*  Dynamic Background  */}
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow">
                    </div>
                </div>

                {/*  Bottom Mask (Blur effect for entering cards)  */}
                <div
                    className="absolute bottom-0 left-0 w-full h-64 md:h-80 bg-gradient-to-t from-navy-900 via-navy-900 to-transparent z-20 pointer-events-none" >
                </div >

                {/*  Doubled horizontal padding for more refined look  */}
                <div className="relative z-10 w-full max-w-5xl px-12 sm:px-16 md:px-8 flex flex-col items-center h-full justify-start pt-32 md:justify-center md:pt-0">

                    {/*  Initial Title - Increased mb for separation  */}
                    <h3 id="stack-title"
                        className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-12 lg:mb-16 tracking-wide transition-all duration-700 transform drop-shadow-lg"
                        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Imagina un lunes donde...</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Imagine a Monday where...</span>
                    </h3>

                    {/*  Cards Container - Increased margin top to mt-12  */}
                    <div className="relative w-full max-w-2xl h-[450px] sm:h-[400px] md:h-[300px] perspective-[1000px] mt-12">
                        {/*  Cards will be controlled by JS  */}

                        {/*  Card 1  */}
                        <div
                            className="stack-card absolute top-0 left-0 w-full glass-card p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl origin-top will-change-transform bg-navy-900/80">
                            <div className="flex items-start gap-4 sm:gap-5 md:gap-6">
                                <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    ✓</div>
                                <div>
                                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 leading-relaxed font-medium">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Abres <span className="text-white font-bold">UNA sola app</span> y
                                            ves todo tu negocio. Adiós al caos.</span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>You open <span className="text-white font-bold">ONE
                                            app</span> and see your entire business. Goodbye chaos.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/*  Card 2  */}
                        <div
                            className="stack-card absolute top-0 left-0 w-full glass-card p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl origin-top will-change-transform bg-navy-900/85">
                            <div className="flex items-start gap-4 sm:gap-5 md:gap-6">
                                <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                    🤖</div>
                                <div>
                                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 leading-relaxed font-medium">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Tu WhatsApp responde solo a las 2am. <br /><span
                                            className="text-cyan-400 text-sm sm:text-base md:text-lg italic">"Hola, aquí tienes nuestro
                                            menú..."</span></span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Your WhatsApp answers by itself at 2am. <br /><span
                                            className="text-cyan-400 text-sm sm:text-base md:text-lg italic">"Hi, here is our menu..."</span></span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/*  Card 3  */}
                        <div
                            className="stack-card absolute top-0 left-0 w-full glass-card p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl origin-top will-change-transform bg-navy-900/90">
                            <div className="flex items-start gap-4 sm:gap-5 md:gap-6">
                                <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                    💰</div>
                                <div>
                                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 leading-relaxed font-medium">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sabes exactamente cuánto ganaste esta semana. Al
                                            centavo.</span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>You know exactly how much you made this week. To the
                                            penny.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/*  Card 4  */}
                        <div
                            className="stack-card absolute top-0 left-0 w-full glass-card p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl origin-top will-change-transform bg-navy-900/95">
                            <div className="flex items-start gap-4 sm:gap-5 md:gap-6">
                                <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                    📦</div>
                                <div>
                                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 leading-relaxed font-medium">
                                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Tu inventario se actualiza con cada venta.</span>
                                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Updates with every sale. Never sell what you don't have
                                            again.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/*  Final Title - REMOVED CSS TRANSITIONS for smooth scroll physics  */}
                    {/*  Adjusted margins: XL: -150px, 2XL: -100px overlap  */}
                    <div id="stack-footer" className="mt-8 mb-32 sm:mb-28 md:mb-24 lg:mb-16 xl:mb-20 2xl:mb-20 opacity-0 translate-y-10 text-center">
                        <div className="relative flex justify-center mb-4 md:mb-6">
                            {/* Badge Removed */}
                        </div>
                        <h2
                            className="!text-5xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500 animate-pulse-glow px-4"
                            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '3rem' }}>
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Eso es SmartKubik.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>That's SmartKubik.</span>
                        </h2>
                    </div>

                </div>
            </div >

        </section >

        {/*  SECTION 4: QUÉ ES SMARTKUBIK (Masking Effect)  */}
        {/*  Bg color added for mask. -mt-[50vh] pulls it way up. z-30 puts it on top.  */}
        {/*  SECTION 4: QUÉ ES SMARTKUBIK (Masking Effect + Floating Title)  */}
        {/*  BACKGROUND REMOVED from Section to allow Title to float. -mt-[50vh] pulls it way up. z-30 puts it on top.  */}
        {/*  XL: -150px for 1312x848-1535px, 2XL: -520px for 1920x1200+  */}
        < section id="modulos" className="pt-12 sm:pt-14 md:pt-16 lg:pt-10 xl:pt-10 2xl:pt-10 px-0 -mt-[2vh] sm:-mt-[5vh] md:-mt-[10vh] lg:-mt-[25vh] xl:-mt-[35vh] 2xl:-mt-[53vh] relative z-30" >

            {/*  Container for Title (Transparent Background)  */}
            {/*  Doubled horizontal padding for more refined look  */}
            <div className="max-w-7xl mx-auto px-12 sm:px-16 lg:px-24">
                {/*  Headline floats over Section 3 content  */}
                {/*  Balanced top padding for extra separation on smaller screens  */}
                <div className="text-center pt-8 sm:pt-10 md:pt-12 lg:pt-6 xl:pt-0 mb-12 md:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 md:mb-6" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Todas las caras de tu negocio en un solo lugar.<br /><span
                            className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Desde $29/Usuario.</span></span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>All sides of your business in one place.<br /><span
                            className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">From $29/User.</span></span>
                    </h2>
                    {/*  Subtitle  */}
                    <div className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-4xl mx-auto backdrop-blur-sm bg-black/20 rounded-xl p-4 inline-block">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>El sistema nervioso de tu negocio. Conecta y automatiza todo lo que necesitas en una sola plataforma inteligente.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>The nervous system of your business. Connects and automates everything you need in a single intelligent platform.</span>
                    </div>
                </div>
            </div>

            {/*  NEW WRAPPER: Dark Background Mask only for Cards and below  */}
            {/*  Doubled horizontal padding for more refined look  */}
            <div className="w-full bg-[#0A0F1C] pt-12 md:pt-16 pb-12 md:pb-16 px-12 sm:px-16 lg:px-24 relative z-40">
                <div className="max-w-7xl mx-auto">
                    {/*  Modules Grid (3x3) - Responsive sizing  */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-12">

                        {/*  Módulo 1: POS  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-electric/20 to-cyan-electric/5 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">💰</span>
                            </div>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-es ${language === "es" ? "" : "hidden"}`}>POS & Ventas</h3>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-en ${language === "en" ? "" : "hidden"}`}>POS & Sales</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Vende en tienda, web y WhatsApp</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Sell in-store, web and WhatsApp</p>
                        </div>

                        {/*  Módulo 2: Inventario  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">📦</span>
                            </div>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-es ${language === "es" ? "" : "hidden"}`}>Inventario</h3>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-en ${language === "en" ? "" : "hidden"}`}>Inventory</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Multi-almacén, lotes, alertas</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Multi-warehouse, batches, alerts</p>
                        </div>

                        {/*  Módulo 3: Contabilidad  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-subtle/20 to-violet-subtle/5 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">🧾</span>
                            </div>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-es ${language === "es" ? "" : "hidden"}`}>Contabilidad</h3>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-en ${language === "en" ? "" : "hidden"}`}>Accounting</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>P&L, Balance, Impuestos automáticos</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>P&L, Balance, Automated taxes</p>
                        </div>

                        {/*  Módulo 4: CRM  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">👥</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-display font-bold mb-2 md:mb-3">CRM</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Clientes 360°, pipeline, lealtad</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>360° customers, pipeline, loyalty</p>
                        </div>

                        {/*  Módulo 5: Marketing  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">📧</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-display font-bold mb-2 md:mb-3">Marketing</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Campañas automáticas multi-canal</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Automated multi-channel campaigns</p>
                        </div>

                        {/*  Módulo 6: Nómina  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-electric/20 to-emerald-500/20 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">👔</span>
                            </div>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-es ${language === "es" ? "" : "hidden"}`}>Nómina</h3>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-en ${language === "en" ? "" : "hidden"}`}>Payroll</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Paga correctamente, cumple la ley</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Pay correctly, comply with the law</p>
                        </div>

                        {/*  Módulo 7: Producción  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-subtle/20 to-rose-500/20 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">🏭</span>
                            </div>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-es ${language === "es" ? "" : "hidden"}`}>Producción</h3>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-en ${language === "en" ? "" : "hidden"}`}>Manufacturing</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>BOM, órdenes, costos</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>BOM, orders, costing</p>
                        </div>

                        {/*  Módulo 8: Citas  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-electric/20 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">📅</span>
                            </div>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-es ${language === "es" ? "" : "hidden"}`}>Citas</h3>
                            <h3 className={`text-lg md:text-xl font-display font-bold mb-2 md:mb-3 lang-en ${language === "en" ? "" : "hidden"}`}>Appointments</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Reservas online, calendar sync</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Online bookings, calendar sync</p>
                        </div>

                        {/*  Módulo 9: E-Commerce  */}
                        <div className="glass-card rounded-xl md:rounded-2xl p-4 md:p-6 group">
                            <div
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl md:text-3xl">🛒</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-display font-bold mb-2 md:mb-3">E-Commerce</h3>
                            <p className={`text-text-secondary text-xs md:text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Tu tienda online automática</p>
                            <p className={`text-text-secondary text-xs md:text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Your automatic online store</p>
                        </div>

                    </div>

                    {/*  IA Destacada (Responsive)  */}
                    <div className="glass-card rounded-2xl md:rounded-3xl p-5 md:p-8 lg:p-10 border-cyan-electric/30 relative overflow-hidden">
                        <div
                            className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-cyan-electric/20 to-emerald-500/20 rounded-full blur-3xl">
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8">
                            <div
                                className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center flex-shrink-0 animate-glow-pulse">
                                <span className="text-3xl md:text-4xl">🤖</span>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div
                                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-500 text-xs md:text-sm font-bold mb-2 md:mb-3">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>INCLUIDO</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>INCLUDED</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-display font-bold mb-2 md:mb-3">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Asistente con Inteligencia Artificial</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>AI Assistant</span>
                                </h3>
                                <p className="text-sm md:text-base lg:text-lg text-text-secondary">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Pregúntale lo que quieras desde Whatsapp: "¿Cuánto vendí hoy?" "¿Qué se está acabando?" — Responde al instante. ¡El empleado eficiente y veloz que no descansa!</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Ask anything via WhatsApp: "How much did I sell today?" "What's running low?" — Answers instantly. The efficient, tireless employee that never sleeps!</span>
                                </p>
                            </div>
                            <button
                                className="btn-secondary px-5 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base text-white hover:bg-white/5 transition-all duration-300 whitespace-nowrap">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ver más →</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>See more →</span>
                            </button>
                        </div>
                    </div>

                    {/*  CTA (Responsive)  */}
                    <div className="text-center mt-8 md:mt-12">
                        <button
                            className="glass-card px-5 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base hover:bg-white/10 transition-all duration-300 inline-flex items-center gap-2 group">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Explorar Todos los Módulos</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Explore All Modules</span>
                            <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none"
                                stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </section >

        {/*  SECTION 5: INDUSTRIES (From V3: Interactive Tabs)  */}
        {/*  Doubled horizontal padding for more refined look  */}
        < section id="industrias" className="pt-32 pb-32 md:pt-48 md:pb-48 bg-[#050810] relative" >
            <div className="max-w-7xl mx-auto px-12 sm:px-16 lg:px-24 w-full">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>No Es Software Genérico. <br className="hidden md:block" /> <span
                            className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Está Diseñado Para Tu Industria.</span></span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Not Generic Software. <br className="hidden md:block" /> <span
                            className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">It's Designed For Your Industry.</span></span>
                    </h2>
                </div>

                {/*  Tabs Navigation  */}
                <div
                    className="flex overflow-x-auto space-x-2 md:space-x-4 py-4 mb-8 no-scrollbar justify-start md:justify-center">
                    <button onClick={() => switchTab('restaurantes')}
                        className="tab-btn active px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border border-transparent bg-white/10 text-white border-cyan-electric/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        data-tab="restaurantes">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>🍽️ Restaurantes</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>🍽️ Restaurants</span>
                    </button>
                    <button onClick={() => switchTab('retail')}
                        className="tab-btn px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border border-transparent text-text-secondary hover:text-white hover:bg-white/5"
                        data-tab="retail">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>🛍️ Tiendas</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>🛍️ Retail</span>
                    </button>
                    <button onClick={() => switchTab('manufactura')}
                        className="tab-btn px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border border-transparent text-text-secondary hover:text-white hover:bg-white/5"
                        data-tab="manufactura">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>🏭 Fábricas</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>🏭 Factories</span>
                    </button>
                    <button onClick={() => switchTab('servicios')}
                        className="tab-btn px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border border-transparent text-text-secondary hover:text-white hover:bg-white/5"
                        data-tab="servicios">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>💼 Servicios</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>💼 Services</span>
                    </button>
                    <button onClick={() => switchTab('logistica')}
                        className="tab-btn px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border border-transparent text-text-secondary hover:text-white hover:bg-white/5"
                        data-tab="logistica">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>🚚 Logística</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>🚚 Logistics</span>
                    </button>
                    <button onClick={() => switchTab('hoteles')}
                        className="tab-btn px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border border-transparent text-text-secondary hover:text-white hover:bg-white/5"
                        data-tab="hoteles">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>🏨 Hoteles</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>🏨 Hotels</span>
                    </button>
                </div>

                {/*  Tab Content: Restaurantes (Default)  */}
                <div id="tab-restaurantes" className="tab-content animate-fade-in-up">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-display font-bold text-white mb-6">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Para Restaurantes que Quieren <span
                                        className="text-emerald-500">Llenar Mesas</span>, No Papeles</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>For Restaurants That Want to <span
                                        className="text-emerald-500">Fill Tables</span>, Not Paperwork</span>
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {/*  Feature 1: Mesas  */}
                                    <button
                                        onClick={() => setActiveRestaurantFeature('tables')}
                                        className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === 'tables' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-white/5' : 'border-white/10'}`}>
                                        <div className="text-2xl mb-2">🗺️</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Mesas en Tiempo Real</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Real-Time Tables</div>
                                        <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Gestión visual de tu salón.</div>
                                        <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Visual floor management.</div>
                                    </button>
                                    {/*  Feature 2: KDS  */}
                                    <button
                                        onClick={() => setActiveRestaurantFeature('kds')}
                                        className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === 'kds' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-white/5' : 'border-white/10'}`}>
                                        <div className="text-2xl mb-2">📺</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Pantalla de Cocina</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Kitchen Display System</div>
                                        <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Cero gritos, cero errores.</div>
                                        <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>No shouting, no errors.</div>
                                    </button>
                                    {/*  Feature 3: Reservaciones  */}
                                    <button
                                        onClick={() => setActiveRestaurantFeature('reservations')}
                                        className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === 'reservations' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-white/5' : 'border-white/10'}`}>
                                        <div className="text-2xl mb-2">📅</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Reservaciones</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Reservations</div>
                                        <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Agenda inteligente.</div>
                                        <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Smart scheduling.</div>
                                    </button>
                                    {/*  Feature 4: Division de Cuentas  */}
                                    <button
                                        onClick={() => setActiveRestaurantFeature('split')}
                                        className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === 'split' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-white/5' : 'border-white/10'}`}>
                                        <div className="text-2xl mb-2">💸</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>División de Cuentas</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Bill Splitting</div>
                                        <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Sin dolores de cabeza.</div>
                                        <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>No more headaches.</div>
                                    </button>
                                    {/*  Feature 5: Propinas Justas  */}
                                    <button
                                        onClick={() => setActiveRestaurantFeature('tips')}
                                        className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === 'tips' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-white/5' : 'border-white/10'}`}>
                                        <div className="text-2xl mb-2">💵</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Propinas Justas</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Fair Tips</div>
                                        <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Reparto automático.</div>
                                        <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Automatic splitting.</div>
                                    </button>
                                    {/*  Feature 6: Menu Engineering  */}
                                    <button
                                        onClick={() => setActiveRestaurantFeature('menu')}
                                        className={`glass-card p-4 rounded-xl text-left transition-all hover:scale-105 ${activeRestaurantFeature === 'menu' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-white/5' : 'border-white/10'}`}>
                                        <div className="text-2xl mb-2">📊</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Menu Engineering</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Menu Engineering</div>
                                        <div className={`text-xs text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Maximiza ganancias.</div>
                                        <div className={`text-xs text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Maximize profits.</div>
                                    </button>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-2xl">
                                            🎯</div>
                                        <p className="text-text-secondary">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Produce más rápido, reduce el caos y <strong
                                                className="text-white">aumenta la rotación de mesas un 20%</strong>.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Produce faster, reduce chaos, and <strong
                                                className="text-white">increase table turnover by 20%</strong>.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Visual Display */}
                            <div
                                className="rounded-xl border border-white/10 h-80 md:h-[500px] flex items-center justify-center relative overflow-hidden group">

                                {/* Default View: Background + Reservation Card */}
                                {!activeRestaurantFeature && (
                                    <>
                                        <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${RestaurantBg})` }}></div>
                                        <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                        {/*  Placeholder visual  */}
                                        <div className="absolute inset-0 z-20 bg-gradient-to-br from-cyan-electric/5 to-emerald-500/5"></div>
                                        <div className="relative z-30 glass-card p-6 rounded-xl border border-white/20 w-72 text-left shadow-2xl animate-fade-in">
                                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">🍽️</div>
                                                    <div>
                                                        <div className="text-white font-bold text-lg">Mesa 12</div>
                                                        <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Reservada</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-xs text-text-secondary uppercase tracking-widest mb-1">Cliente</div>
                                                    <div className="text-white font-medium flex items-center gap-2">
                                                        <span>Familia Rodríguez</span>
                                                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-xs text-text-secondary uppercase tracking-widest mb-1">Hora</div>
                                                        <div className="text-white">8:00 PM</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-text-secondary uppercase tracking-widest mb-1">Personas</div>
                                                        <div className="text-white">4 Pax</div>
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 rounded-lg p-3 flex items-start gap-3 mt-2">
                                                    <div className="text-amber-400 mt-0.5">📝</div>
                                                    <div className="text-xs text-gray-300 italic">"Preferiblemente en la terraza cerca de la vista."</div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Active Feature View: Full Image */}
                                {activeRestaurantFeature && (
                                    <div className="absolute inset-0 z-40 bg-navy-900 animate-fade-in">
                                        <img
                                            src={
                                                activeRestaurantFeature === 'tables' ? ErpTables :
                                                    activeRestaurantFeature === 'kds' ? ErpKds :
                                                        activeRestaurantFeature === 'reservations' ? ErpReservations :
                                                            activeRestaurantFeature === 'split' ? ErpBillSplitting :
                                                                activeRestaurantFeature === 'tips' ? ErpTips :
                                                                    activeRestaurantFeature === 'menu' ? ErpMenu : ErpTables
                                            }
                                            alt="Feature Preview"
                                            className="w-full h-full object-contain"
                                        />
                                        {/* Close/Reset Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveRestaurantFeature(null); }}
                                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors border border-white/10 z-50">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/*  Tab Content: Retail  */}
                <div id="tab-retail" className="tab-content hidden animate-fade-in-up">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-display font-bold text-white mb-6">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Para Tiendas que Quieren <span className="text-cyan-electric">Vender
                                        Más</span>, No Contar Más</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>For Stores That Want to <span
                                        className="text-cyan-electric">Sell More</span>, Not Count More</span>
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">🏪</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Multi-Tienda</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Multi-Store</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Administra todas tus sucursales
                                            desde un solo lugar.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Manage all your branches
                                            from a single place.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📱</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>E-commerce Integrado</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Integrated E-commerce</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Vende online y en tienda con el
                                            mismo inventario.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Sell online and in-store
                                            with the same inventory.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">👥</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Programa de Lealtad</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Loyalty Program</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Puntos, descuentos y promociones
                                            automáticas.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Points, discounts, and
                                            automated promotions.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📊</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Análisis de Ventas</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Sales Analysis</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Qué se vende, cuándo y a quién.
                                        </div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>What sells, when, and to
                                            whom.</div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full bg-cyan-electric/20 text-cyan-electric flex items-center justify-center text-2xl">
                                            🛍️</div>
                                        <p className="text-text-secondary">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Evita sobreventa, vende 24/7 y ten <strong
                                                className="text-white">control total de tu mercancía</strong>.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Avoid overselling, sell 24/7, and have <strong
                                                className="text-white">total control of your merchandise</strong>.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="rounded-xl border border-white/10 h-80 md:h-[500px] flex items-center justify-center relative overflow-hidden group">
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${RetailBg})` }}></div>
                                <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                <div
                                    className="relative z-20 glass-card p-6 rounded-xl border border-white/20 max-w-xs text-center">
                                    <div className="font-bold text-white text-xl mb-1">POS Retail</div>
                                    <div className="text-sm text-gray-300 mb-4">Escanea & Vende</div>
                                    <div className="bg-black/40 rounded p-2 text-left font-mono text-xs text-emerald-400">Item:
                                        Camis T-M<br />Stock: 4<br />Price: $45.00</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/*  Tab Content: Manufactura  */}
                <div id="tab-manufactura" className="tab-content hidden animate-fade-in-up">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-display font-bold text-white mb-6">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Para Fábricas que Quieren <span
                                        className="text-amber-500">Producir</span>, No Buscar Papeles</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>For Factories That Want to <span
                                        className="text-amber-500">Produce</span>, Not Hunt for Paperwork</span>
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">⚙️</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Órdenes de Producción</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Production Orders</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>De materia prima a producto
                                            terminado.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>From raw material to
                                            finished product.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📦</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Control de Lotes</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Batch Control</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Trazabilidad completa de cada
                                            producción.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Complete traceability of
                                            every production run.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">💰</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Costeo Real</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Real Costing</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Sabe cuánto cuesta fabricar cada
                                            unidad.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Know exactly how much each
                                            unit costs to make.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">🔔</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Alertas de Material</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Material Alerts</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Nunca pares la producción por falta
                                            de insumos.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Never stop production due to
                                            lack of supplies.</div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-2xl">
                                            📈</div>
                                        <p className="text-text-secondary">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Detecta mermas ocultas y <strong className="text-white">baja
                                                tus costos operativos hasta un 15%</strong>.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Detect hidden waste and <strong
                                                className="text-white">lower your operating costs by up to
                                                15%</strong>.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="rounded-xl border border-white/10 h-80 md:h-[500px] flex items-center justify-center relative overflow-hidden group">
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${ManufacturaBg})` }}></div>
                                <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                <div className="relative z-20 glass-card p-6 rounded-xl border border-white/20">
                                    <div className="font-bold text-white mb-2">Orden #PRD-9023</div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full mb-2 overflow-hidden">
                                        <div className="bg-amber-500 h-full w-2/3"></div>
                                    </div>
                                    <div className="text-xs text-gray-300">En Progreso • 67%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/*  Tab Content: Servicios  */}
                <div id="tab-servicios" className="tab-content hidden animate-fade-in-up">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-display font-bold text-white mb-6">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Para Servicios Profesionales que <span
                                        className="text-violet-500">Facturan Tiempo</span></span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>For Professional Services That <span
                                        className="text-violet-500">Bill for Time</span></span>
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">⏱️</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Time Tracking</div>
                                        <div className="font-bold text-white lang-en hidden">Time Tracking</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Registra horas por proyecto y
                                            cliente.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Track hours by project and
                                            client.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📋</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Gestión de Proyectos</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Project Management</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Tareas, plazos y equipo en un solo
                                            lugar.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Tasks, deadlines, and team
                                            in one place.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">💵</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Facturación Automática</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Automated Invoicing</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>De horas trabajadas a factura en
                                            segundos.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>From billable hours to
                                            invoice in seconds.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📊</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Rentabilidad por Proyecto</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Project Profitability</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Qué clientes y proyectos son
                                            rentables.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Which clients and projects
                                            are profitable.</div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center text-2xl">
                                            ⏳</div>
                                        <p className="text-text-secondary">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Elimina las cadenas de emails y <strong
                                                className="text-white">cobra más rápido por tu trabajo</strong>.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Eliminate email chains and <strong
                                                className="text-white">get paid faster for your work</strong>.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="rounded-xl border border-white/10 h-80 md:h-[500px] flex items-center justify-center relative overflow-hidden group">
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${ServicesBg})` }}></div>
                                <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                <div className="relative z-20 glass-card p-6 rounded-xl border border-white/20 w-64">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="font-bold text-white">Lun, 14 Oct</div>
                                        <div className="text-xs text-gray-400">Hoy</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div
                                            className="bg-violet-500/20 border-l-2 border-violet-500 p-2 text-xs text-gray-200">
                                            <strong>09:00 AM</strong> Consultoría
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/*  Tab Content: Logistica  */}
                <div id="tab-logistica" className="tab-content hidden animate-fade-in-up">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-display font-bold text-white mb-6">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Para Logística que Quiere <span
                                        className="text-blue-500">Mover</span>, No Buscar</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>For Logistics That Wants to <span
                                        className="text-blue-500">Move</span>, Not Search</span>
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📍</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Tracking en Tiempo Real</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Real-Time Tracking</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Dónde está cada envío, siempre.
                                        </div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Where every shipment is,
                                            always.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">🗺️</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Optimización de Rutas</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Route Optimization</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>IA calcula la ruta más eficiente.
                                        </div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>AI calculates the most
                                            efficient route.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📦</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Gestión de Flotas</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Fleet Management</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Vehículos, choferes, mantenimiento.
                                        </div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Vehicles, drivers,
                                            maintenance.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">💵</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Costeo por Ruta</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Cost Per Route</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Cuánto cuesta cada entrega
                                            realmente.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>What each delivery really
                                            costs.</div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-2xl">
                                            🚚</div>
                                        <p className="text-text-secondary">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Entrega a tiempo, reduce costos de combustible y <strong
                                                className="text-white">evita pérdidas de inventario</strong>.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Deliver on time, reduce fuel costs, and <strong
                                                className="text-white">avoid inventory losses</strong>.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="rounded-xl border border-white/10 h-80 md:h-[500px] flex items-center justify-center relative overflow-hidden group">
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${LogisticsBg})` }}></div>
                                <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                <div className="relative z-20 glass-card p-6 rounded-xl border border-white/20 text-center">
                                    <div className="text-4xl text-blue-500 mb-2">🚚💨</div>
                                    <div className="font-bold text-white">Ruta #829 En Camino</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/*  Tab Content: Hoteles  */}
                <div id="tab-hoteles" className="tab-content hidden animate-fade-in-up">
                    <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-display font-bold text-white mb-6">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Para Hoteles que Quieren <span className="text-rose-500">Huéspedes
                                        Felices</span></span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>For Hotels That Want <span className="text-rose-500">Happy
                                        Guests</span></span>
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">🛏️</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Gestión de Habitaciones</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Room Management</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Disponibilidad, check-in/out
                                            automático.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Availability, automatic
                                            check-in/out.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">💳</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Reservas Multi-Canal</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Multi-Channel Booking</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Booking, Airbnb, directo - todo
                                            sincronizado.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Booking, Airbnb, direct -
                                            all synchronized.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">🍽️</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Servicios Extras</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Extra Services</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Restaurante, spa, room service
                                            integrado.</div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Restaurant, spa, integrated
                                            room service.</div>
                                    </div>
                                    <div className="glass-card p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📊</div>
                                        <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Revenue Management</div>
                                        <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Revenue Management</div>
                                        <div className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Precios dinámicos según demanda.
                                        </div>
                                        <div className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Dynamic pricing based on
                                            demand.</div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-2xl">
                                            🛎️</div>
                                        <p className="text-text-secondary">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ofrece una experiencia de 5 estrellas y <strong
                                                className="text-white">aumenta tu ocupación</strong>.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Offer a 5-star experience and <strong
                                                className="text-white">increase your occupancy</strong>.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="rounded-xl border border-white/10 h-80 md:h-[500px] flex items-center justify-center relative overflow-hidden group">
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${HotelsBg})` }}></div>
                                <div className="absolute inset-0 z-10 bg-navy-900/60"></div>
                                <div className="relative z-20 glass-card p-6 rounded-xl border border-white/20">
                                    <div className="flex justify-between gap-8 mb-2 border-b border-white/10 pb-2">
                                        <div className="text-white font-bold">Hab. 302</div>
                                        <div className="text-green-400 text-xs font-bold uppercase">Limpia</div>
                                    </div>
                                    <div className="text-xs text-gray-300">Huésped: Sr. Smith<br />Salida: Mañana</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section >

        {/*  SECTION 6: TU WEB DE VENTAS (NEW) */}
        <section id="tu-web" className="py-24 relative overflow-hidden bg-navy-900">
            {/* Background Gradient Mesh */}
            <div className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse at 30% 40%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 60%, rgba(16, 185, 129, 0.10) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 45%),
                        linear-gradient(180deg, #0F172A 0%, #1E293B 100%)
                     `
                }}>
            </div>

            <div className="container max-w-7xl mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <span className="text-cyan-400 text-sm font-medium tracking-wide uppercase mb-4 block">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Incluido sin costo extra</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Included at no extra cost</span>
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>
                            Tu Negocio Abierto <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-emerald-400">24/7</span>.<br />
                            Tu Web Vende Por Ti.
                        </span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>
                            Your Business Open <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-emerald-400">24/7</span>.<br />
                            Your Website Sells For You.
                        </span>
                    </h2>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>
                            SmartKubik genera automáticamente tu página web conectada al sistema.
                            Tus clientes compran productos, reservan servicios o agendan citas —
                            sin que tú levantes un dedo. Todo sincronizado en tiempo real.
                        </span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>
                            SmartKubik automatically generates your website connected to the system.
                            Your customers buy products, book services, or schedule appointments —
                            without you lifting a finger. Everything synced in real-time.
                        </span>
                    </p>
                </div>

                {/* Visual Central */}
                {/* Visual Central - CSS Generated Devices */}
                <div className="relative mb-12 mt-32 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 px-4">

                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                    {/* Floating Badge (Centered on Page) */}
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-40">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full text-white font-semibold shadow-lg animate-bounce-slow whitespace-nowrap">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>🚀 Se genera automáticamente</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>🚀 Auto-generated</span>
                        </div>
                    </div>

                    {/* 1. Laptop (Left) */}
                    <div className="relative z-20 w-[90%] sm:w-[340px] md:w-[500px] lg:w-[600px] transform hover:scale-[1.02] transition-transform duration-500 order-1">
                        {/* Lid */}
                        <div className="bg-navy-900 rounded-t-xl md:rounded-t-2xl border-[8px] md:border-[12px] border-gray-800 border-b-0 aspect-[16/10] relative overflow-hidden shadow-2xl flex flex-col">
                            {/* Browser Bar */}
                            <div className="h-6 md:h-8 bg-gray-900 flex items-center px-3 gap-1.5 border-b border-white/5">
                                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                <div className="ml-4 w-1/3 h-1.5 bg-gray-800 rounded-full"></div>
                            </div>
                            {/* Screen Content: Store Grid */}
                            <div className="flex-1 bg-navy-950 p-4 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 overflow-hidden content-start">
                                {/* Product Cards */}
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white/5 rounded-lg p-2 space-y-2 border border-white/5 group hover:border-cyan-500/30 transition-colors">
                                        <div className="w-full aspect-square bg-gradient-to-br from-white/5 to-white/0 rounded-md mb-2 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </div>
                                        <div className="w-3/4 h-1.5 bg-gray-700/50 rounded-full"></div>
                                        <div className="w-1/3 h-1.5 bg-cyan-900/50 rounded-full"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Base */}
                        <div className="h-3 md:h-5 bg-gray-800 rounded-b-lg md:rounded-b-xl shadow-lg relative mx-[2px]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 md:w-32 h-1.5 bg-gray-700 rounded-b-md"></div>
                        </div>
                    </div>

                    {/* 2. Tablet (Center) */}
                    <div className="relative z-10 w-[180px] md:w-[240px] aspect-[3/4] transition-transform duration-300 ease-out hover:-translate-y-4 order-2 hidden sm:block">
                        <div className="w-full h-full bg-navy-900 rounded-[20px] md:rounded-[30px] border-[6px] md:border-[8px] border-gray-800 shadow-2xl">
                            {/* Screen Content: Calendar Grid */}
                            <div className="w-full h-full bg-navy-950 rounded-[14px] md:rounded-[22px] overflow-hidden p-3 relative flex flex-col">
                                <div className="w-1/3 h-3 bg-gray-700 rounded-full mb-4 opacity-50"></div>
                                {/* Fake Calendar Grid */}
                                <div className="grid grid-cols-4 gap-2 flex-1 content-start">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className={`aspect-video rounded-sm ${i === 4 ? 'bg-emerald-500/40' : 'bg-white/5'}`}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Mobile (Right) */}
                    <div className="relative z-10 w-[100px] md:w-[140px] aspect-[9/19] transition-transform duration-300 ease-out hover:-translate-y-4 delay-100 order-3 hidden sm:block">
                        <div className="w-full h-full bg-navy-900 rounded-[24px] md:rounded-[30px] border-[6px] md:border-[8px] border-gray-800 shadow-2xl">
                            {/* Screen Content: Reservation */}
                            <div className="w-full h-full bg-navy-950 rounded-[18px] md:rounded-[22px] overflow-hidden p-3 relative flex flex-col items-center">
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 mb-4 flex items-center justify-center text-emerald-400 font-bold">✓</div>
                                    <div className="w-3/4 h-2 bg-gray-700 rounded-full mb-2 opacity-50"></div>
                                    <div className="w-1/2 h-2 bg-gray-800 rounded-full mb-2 opacity-30"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* How It Works Header */}
                <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 text-white">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>¿Cómo funciona?</span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>How does it work?</span>
                </h3>

                {/* How It Works - 3 Steps */}
                <div className="grid md:grid-cols-3 gap-8 mb-24">
                    {[
                        {
                            icon: "⚙️",
                            titleEs: "Configura tu negocio",
                            titleEn: "Set up your business",
                            descEs: "Agrega tus productos, servicios, o define tu disponibilidad en SmartKubik.",
                            descEn: "Add your products, services, or define your availability in SmartKubik."
                        },
                        {
                            icon: "🌐",
                            titleEs: "Tu web se genera sola",
                            titleEn: "Your website generates itself",
                            descEs: "Automáticamente obtienes una página web profesional con todo tu catálogo o agenda.",
                            descEn: "Automatically get a professional website with your entire catalog or schedule."
                        },
                        {
                            icon: "💰",
                            titleEs: "Vende mientras duermes",
                            titleEn: "Sell while you sleep",
                            descEs: "Tus clientes compran o reservan 24/7. Tú recibes notificaciones y el sistema hace el resto.",
                            descEn: "Your customers buy or book 24/7. You get notifications and the system does the rest."
                        }
                    ].map((step, idx) => (
                        <div key={idx} className="glass-card p-8 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
                            <div className="text-4xl mb-4">{step.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>{step.titleEs}</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>{step.titleEn}</span>
                            </h3>
                            <p className="text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>{step.descEs}</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>{step.descEn}</span>
                            </p>
                        </div>
                    ))}
                </div>

                {/* What You Get Header */}
                <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 text-white">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>¿Qué obtienes?</span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>What do you get?</span>
                </h3>

                {/* Benefits Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
                    {[
                        { icon: "🔄", titleEs: "Sincronización Real", titleEn: "Real-Time Sync", descEs: "Si vendes en tienda, tu web se actualiza. Si alguien reserva online, tu agenda se bloquea.", descEn: "Sell in-store, your website updates. Someone books online, your calendar blocks." },
                        { icon: "🎨", titleEs: "Diseño Profesional", titleEn: "Professional Design", descEs: "No necesitas diseñador. Tu web se ve moderna, rápida, y lista para convertir.", descEn: "No designer needed. Your website looks modern, fast, and ready to convert." },
                        { icon: "💳", titleEs: "Pagos Integrados", titleEn: "Integrated Payments", descEs: "Tus clientes pagan online. El dinero llega a tu cuenta. La factura se genera automáticamente.", descEn: "Your customers pay online. Money hits your account. Invoice generates automatically." },
                        { icon: "📱", titleEs: "100% Responsive", titleEn: "100% Responsive", descEs: "Funciona perfecto en celular, tablet y computadora. Porque tus clientes compran desde cualquier lugar.", descEn: "Works perfectly on phone, tablet, and computer. Because your customers shop from anywhere." },
                        { icon: "🔗", titleEs: "Tu Dominio", titleEn: "Your Domain", descEs: "Usa tu propio dominio (tuempresa.com) o un subdominio gratuito. Tú eliges.", descEn: "Use your own domain (yourbusiness.com) or a free subdomain. Your choice." },
                        { icon: "📊", titleEs: "Analytics Incluido", titleEn: "Analytics Included", descEs: "Sabe cuántas visitas tienes, qué productos ven más, y dónde abandonan.", descEn: "Know how many visits you get, what products they view most, and where they drop off." }
                    ].map((b, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:-translate-y-1 hover:border-cyan-500/30 transition-all duration-300 shadow-lg">
                            <div className="text-3xl mb-4">{b.icon}</div>
                            <h4 className="text-lg font-bold text-white mb-2">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>{b.titleEs}</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>{b.titleEn}</span>
                            </h4>
                            <p className="text-sm text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>{b.descEs}</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>{b.descEn}</span>
                            </p>
                        </div>
                    ))}
                </div>

                {/* Call to Actions - Examples & More Info */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-24">
                    {/* Button 1: Conocer más (Primary) */}
                    <button className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Conocer más</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Learn more</span>
                    </button>

                    {/* Button 2: Store Example */}
                    <button className="group px-6 py-4 rounded-full border border-white/20 hover:bg-white/5 hover:border-cyan-400/50 transition-all duration-300 flex items-center gap-2 text-gray-300 hover:text-white">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Ver Tienda Online →</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>View Online Store →</span>
                    </button>

                    {/* Button 3: Agenda Example */}
                    <button className="group px-6 py-4 rounded-full border border-white/20 hover:bg-white/5 hover:border-purple-400/50 transition-all duration-300 flex items-center gap-2 text-gray-300 hover:text-white">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Ver Web de Servicios →</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>View Services Website →</span>
                    </button>
                </div>



            </div>
        </section>

        {/*  SECTION 5.5: STICKY WORKFLOW (n8n Style)  */}
        < section className="py-24 bg-navy-900 relative" >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-24">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Un Flujo <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Automático</span>.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>One <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Automated</span> Flow.</span>
                    </h2>
                    <p className="text-xl text-gray-400">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Olvídate de copiar y pegar datos. SmartKubik conecta los puntos.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Forget copying and pasting data. SmartKubik connects the
                            dots.</span>
                    </p>
                </div>

                {/*  Sticky Container - Section 6 Styles V4 Fix Applied  */}
                <div className="relative flex flex-col md:flex-row gap-8 lg:gap-12">

                    {/*  Left Column: Scrolling Steps  */}
                    <div className="w-full md:w-1/2 flex flex-col gap-[50vh] py-[25vh]">

                        {/*  Step 1 Trigger  */}
                        <div className="step-trigger" data-step="1">
                            <div
                                className="step-card p-8 rounded-2xl"
                                style={{
                                    backgroundColor: 'rgba(22, 78, 99, 0.1)',
                                    borderLeft: '4px solid #06B6D4'
                                }}>
                                <div className="text-cyan-500 font-bold text-lg mb-2">Paso 01</div>
                                <h3 className="text-2xl font-display font-bold text-white mb-4">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Entra el Pedido</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Order Comes In</span>
                                </h3>
                                <p className="text-gray-400">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>El cliente escribe por WhatsApp. SmartKubik detecta la
                                        intención de compra automáticamente.</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Customer texts via WhatsApp. SmartKubik automatically
                                        detects purchase intent.</span>
                                </p>
                            </div>
                        </div>

                        {/*  Step 2 Trigger  */}
                        <div className="step-trigger" data-step="2">
                            <div
                                className="step-card p-8 rounded-2xl"
                                style={{
                                    backgroundColor: 'rgba(6, 78, 59, 0.1)',
                                    borderLeft: '4px solid #10B981'
                                }}>
                                <div className="text-emerald-500 font-bold text-lg mb-2">Paso 02</div>
                                <h3 className="text-2xl font-display font-bold text-white mb-4">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Inventario en Tiempo Real</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Real-Time Inventory</span>
                                </h3>
                                <p className="text-gray-400">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Se reserva stock al instante. Si es manufactura, se descuentan
                                        las materias primas.</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Stock is reserved instantly. If manufacturing, raw
                                        materials are deducted.</span>
                                </p>
                            </div>
                        </div>

                        {/*  Step 3 Trigger  */}
                        <div className="step-trigger" data-step="3">
                            <div
                                className="step-card p-8 rounded-2xl"
                                style={{
                                    backgroundColor: 'rgba(88, 28, 135, 0.1)',
                                    borderLeft: '4px solid #A855F7'
                                }}>
                                <div className="text-purple-500 font-bold text-lg mb-2">Paso 03</div>
                                <h3 className="text-2xl font-display font-bold text-white mb-4">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Factura & Despacho</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Invoice & Dispatch</span>
                                </h3>
                                <p className="text-gray-400">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Se genera la factura fiscal y se notifica a logística. Todo
                                        sin clicks humanos.</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Fiscal invoice is generated and logistics notified. All
                                        without human clicks.</span>
                                </p>
                            </div>
                        </div>

                    </div>

                    {/*  Right Column: Sticky Visuals  */}
                    <div className="w-full md:w-1/2 h-[50vh] md:h-[600px] sticky top-32 perspective-1000 hidden md:block">
                        <div className="relative w-full h-full">

                            {/*  Visual 1: Chat UI  */}
                            <div id="visual-1"
                                className={`workflow-visual absolute inset-0 transition-all duration-700 ${activeStep === 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
                                <div
                                    style={{ background: 'linear-gradient(to bottom right, rgba(22, 78, 99, 0.5), rgba(0, 0, 0, 0.5))' }}
                                    className="glass-panel w-full h-full rounded-2xl border border-white/10 p-6 flex flex-col justify-center items-center">
                                    <div
                                        className="w-64 glass-card p-4 rounded-2xl rounded-tr-none mb-4 self-end animate-pulse">
                                        <div className={`text-xs text-cyan-300 mb-1 lang-es ${language === "es" ? "" : "hidden"}`}>Cliente (WhatsApp)</div>
                                        <div className={`text-xs text-cyan-300 mb-1 lang-en ${language === "en" ? "" : "hidden"}`}>Client (WhatsApp)</div>
                                        <div className={`text-white text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Quiero 20 hamburguesas clásicas para llevar.
                                        </div>
                                        <div className={`text-white text-sm lang-en ${language === "en" ? "" : "hidden"}`}>I want 20 classic burgers to go.
                                        </div>
                                    </div>
                                    <div
                                        className="w-64 glass-card p-4 rounded-2xl rounded-tl-none self-start border border-cyan-500/30">
                                        <div className={`text-xs text-cyan-300 mb-1`}>SmartKubik AI</div>
                                        <div className={`text-white text-sm lang-es ${language === "es" ? "" : "hidden"}`}>¡Entendido! Creando orden #ORD-992...</div>
                                        <div className={`text-white text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Got it! Creating order #ORD-992...</div>
                                        <div
                                            className="mt-2 bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded inline-block">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>Procesando...</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>Processing...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/*  Visual 2: Stock Dashboard  */}
                            <div id="visual-2"
                                className={`workflow-visual absolute inset-0 transition-all duration-700 ${activeStep === 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
                                <div
                                    style={{ background: 'linear-gradient(to bottom right, rgba(6, 78, 59, 0.5), rgba(0, 0, 0, 0.5))' }}
                                    className="glass-panel w-full h-full rounded-2xl border border-white/10 p-6 flex flex-col justify-center items-center">
                                    <div className="w-72 bg-navy-800 rounded-xl p-4 border border-white/10 shadow-2xl">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className={`text-gray-400 text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Carne Angus (kg)</div>
                                            <div className={`text-gray-400 text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Angus Beef (kg)</div>
                                            <div className="text-emerald-400 text-xs font-bold">-2.5kg</div>
                                        </div>
                                        <div className="w-full bg-gray-700 h-2 rounded-full mb-1">
                                            <div className="bg-emerald-500 h-full w-[80%] transition-all duration-1000"
                                                style={{ width: "75%" }}></div>
                                        </div>

                                        <div className="flex justify-between items-center mt-6 mb-4">
                                            <div className={`text-gray-400 text-sm lang-es ${language === "es" ? "" : "hidden"}`}>Pan Brioche (uni)</div>
                                            <div className={`text-gray-400 text-sm lang-en ${language === "en" ? "" : "hidden"}`}>Brioche Bun (unit)</div>
                                            <div className="text-emerald-400 text-xs font-bold">-20 u</div>
                                        </div>
                                        <div className="w-full bg-gray-700 h-2 rounded-full mb-1">
                                            <div className="bg-emerald-500 h-full w-[60%] transition-all duration-1000"
                                                style={{ width: "55%" }}></div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500 animate-ping"></div>
                                            <span className={`text-xs text-green-400 lang-es ${language === "es" ? "" : "hidden"}`}>Stock Actualizado</span>
                                            <span className={`text-xs text-green-400 lang-en ${language === "en" ? "" : "hidden"}`}>Stock Updated</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/*  Visual 3: Invoice  */}
                            <div id="visual-3"
                                className={`workflow-visual absolute inset-0 transition-all duration-700 ${activeStep === 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
                                <div
                                    style={{ background: 'linear-gradient(to bottom right, rgba(88, 28, 135, 0.5), rgba(0, 0, 0, 0.5))' }}
                                    className="glass-panel w-full h-full rounded-2xl border border-white/10 p-6 flex flex-col justify-center items-center">
                                    <div
                                        className="w-64 bg-white/95 text-black rounded-lg p-6 shadow-[0_0_40px_rgba(168,85,247,0.3)] rotate-3 hover:rotate-0 transition-transform duration-500">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className={`font-bold text-lg lang-es ${language === "es" ? "" : "hidden"}`}>FACTURA</div>
                                            <div className={`font-bold text-lg lang-en ${language === "en" ? "" : "hidden"}`}>INVOICE</div>
                                            <div className="text-xs text-gray-500">#F-2024-001</div>
                                        </div>
                                        <div className="space-y-2 mb-6 border-b border-gray-200 pb-4">
                                            <div className="flex justify-between text-sm">
                                                <span className={`lang-es ${language === "es" ? "" : "hidden"}`}>20x Hamburguesa</span>
                                                <span className={`lang-en ${language === "en" ? "" : "hidden"}`}>20x Burger</span>
                                                <span>$240.00</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold pt-2">
                                                <span>TOTAL</span>
                                                <span>$240.00</span>
                                            </div>
                                        </div>
                                        <div
                                            className="flex items-center justify-center gap-2 text-green-600 bg-green-100 p-2 rounded">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className={`text-xs font-bold font-mono lang-es ${language === "es" ? "" : "hidden"}`}>ENVIADO A FISCO</span>
                                            <span className={`text-xs font-bold font-mono lang-en ${language === "en" ? "" : "hidden"}`}>SENT TO TAX AUTHORITY</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section >

        {/*  SECTION 6: AI ASSISTANT  */}
        < section id="ia" className="py-24 relative overflow-hidden" >
            {/*  AI Aura Background - Layering Strategy: Orb ON TOP of Gradient  */}
            {/* 1. The Gradient (Bottom Layer) */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900 via-navy-900 to-purple-900" style={{ opacity: 0.3 }}></div>
            {/* 2. The Orb (Top Layer - Custom Pulsating Animation - Centered via Layout) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                <div
                    className="w-[500px] h-[500px] bg-cyan-500 rounded-full blur-[200px] animate-pulse-scale">
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/*  Chat Interface  */}
                    <div
                        className="glass-card rounded-3xl p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] order-2 lg:order-1">
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                            <div
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                                <span className="text-white text-xl">🤖</span>
                            </div>
                            <div>
                                <div className="font-bold text-white">SmartKubik AI</div>
                                <div className="text-xs text-emerald-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Online
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/*  User Message  */}
                            <div className="flex justify-end">
                                <div
                                    className="bg-gray-700/50 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
                                    <p className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Cuánto vendí esta semana?</p>
                                    <p className={`lang-en ${language === "en" ? "" : "hidden"} `}>How much did I sell this week?</p>
                                </div>
                            </div>

                            {/*  AI Response  */}
                            <div className="flex justify-start">
                                <div
                                    className="glass-card border border-cyan-500/20 text-gray-200 rounded-2xl rounded-tl-none px-4 py-3 max-w-[90%] shadow-lg">
                                    <div className={`lang-es ${language === "es" ? "" : "hidden"} `}>
                                        <p className="mb-2">Esta semana vendiste <strong className="text-white">$4,320</strong>.
                                        </p>
                                        <p className="text-sm">Eso es un <span className="text-emerald-400 font-bold">↑ 12%
                                            más</span> que la semana pasada. Tu producto estrella fue "Hamburguesa
                                            Clásica" con 47 unidades.</p>
                                    </div>
                                    <div className={`lang-en ${language === "en" ? "" : "hidden"} `}>
                                        <p className="mb-2">This week you sold <strong className="text-white">$4,320</strong>.
                                        </p>
                                        <p className="text-sm">That's <span className="text-emerald-400 font-bold">↑ 12%
                                            more</span>
                                            than last week. Your top product was "Classic Burger" with 47 units.</p>
                                    </div>
                                </div>
                            </div>

                            {/*  User Message  */}
                            <div className="flex justify-end">
                                <div
                                    className="bg-gray-700/50 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
                                    <p className={`lang-es ${language === "es" ? "" : "hidden"} `}>Reserva una mesa para 4 personas mañana a las 8pm a nombre de
                                        García
                                    </p>
                                    <p className={`lang-en ${language === "en" ? "" : "hidden"} `}>Book a table for 4 people tomorrow at 8pm under Garcia</p>
                                </div>
                            </div>

                            {/*  AI Response  */}
                            <div className="flex justify-start">
                                <div
                                    className="glass-card border border-cyan-500/20 text-gray-200 rounded-2xl rounded-tl-none px-4 py-3 max-w-[90%] shadow-lg">
                                    <div className={`lang-es ${language === "es" ? "" : "hidden"} `}>
                                        <p>Listo. Mesa 7 reservada para <strong>García</strong>, 4 personas, mañana 8:00
                                            PM.
                                        </p>
                                        <div
                                            className="mt-2 flex items-center gap-2 text-xs text-gray-400 bg-black/20 p-2 rounded">
                                            <span className="text-green-400">✓</span> Confirmación enviada por WhatsApp al
                                            cliente
                                        </div>
                                    </div>
                                    <div className={`lang-en ${language === "en" ? "" : "hidden"} `}>
                                        <p>Done. Table 7 reserved for <strong>Garcia</strong>, 4 people, tomorrow 8:00
                                            PM.
                                        </p>
                                        <div
                                            className="mt-2 flex items-center gap-2 text-xs text-gray-400 bg-black/20 p-2 rounded">
                                            <span className="text-green-400">✓</span> Confirmation sent via WhatsApp to
                                            client
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/*  Input Mockup  */}
                        <div className="mt-6 relative">
                            <div
                                className="w-full bg-navy-900/50 border border-white/10 rounded-full h-12 px-4 flex items-center text-gray-500 italic text-sm">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Escribe algo...</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Type something...</span>
                            </div>
                            <div
                                className="absolute right-2 top-2 w-8 h-8 bg-cyan-electric rounded-full flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/*  Capabilities  */}
                    <div className="order-1 lg:order-2">
                        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-white">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Tu Asistente de Negocios que <span className="text-cyan-electric">Nunca
                                Duerme</span>.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Your Business Assistant That <span
                                className="text-cyan-electric">Never
                                Sleeps</span>.</span>
                        </h2>
                        <p className="text-xl text-text-secondary mb-12">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Inteligencia Artificial integrada en todo el sistema. Pregunta lo que
                                quieras en español normal. No es un chatbot, es tu copiloto.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Artificial Intelligence integrated throughout the system. Ask
                                whatever you want in natural language. It's not a chatbot, it's your copilot.</span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg bg-cyan-electric/20 text-cyan-electric flex items-center justify-center text-xl flex-shrink-0">
                                    📊</div>
                                <div>
                                    <h4 className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Responde Preguntas</h4>
                                    <h4 className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Answers Questions</h4>
                                    <p className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Sobre ventas, inventario, finanzas...
                                    </p>
                                    <p className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>About sales, inventory,
                                        finance...
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl flex-shrink-0">
                                    ⚡</div>
                                <div>
                                    <h4 className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Ejecuta Acciones</h4>
                                    <h4 className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Executes Actions</h4>
                                    <p className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Crea citas, busca datos, envía
                                        correos.
                                    </p>
                                    <p className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Creates appointments, finds
                                        data,
                                        sends emails.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-xl flex-shrink-0">
                                    💬</div>
                                <div>
                                    <h4 className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Auto-WhatsApp</h4>
                                    <h4 className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Auto-WhatsApp</h4>
                                    <p className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Atiende clientes a las 3am
                                        automáticamente.</p>
                                    <p className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>Serves customers at 3am
                                        automatically.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
                                    📈</div>
                                <div>
                                    <h4 className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Análisis Predictivo</h4>
                                    <h4 className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Predictive Analysis</h4>
                                    <p className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>"Tu martes será lento, lanza una
                                        promo."
                                    </p>
                                    <p className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>"Your Tuesday will be slow,
                                        launch
                                        a promo."</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center text-xl flex-shrink-0">
                                    🧠</div>
                                <div>
                                    <h4 className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Aprende de Tu Negocio</h4>
                                    <h4 className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Learns from Your Business</h4>
                                    <p className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Mientras más lo uses, más inteligente
                                        se
                                        vuelve.</p>
                                    <p className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>The more you use it, the
                                        smarter
                                        it gets.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center text-xl flex-shrink-0">
                                    🔒</div>
                                <div>
                                    <h4 className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>Solo Tu Información</h4>
                                    <h4 className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>Your Information Only</h4>
                                    <p className={`text-sm text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Datos 100% privados. No se comparte
                                        con
                                        nadie.</p>
                                    <p className={`text-sm text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>100% private data. Shared with
                                        no
                                        one.</p>
                                </div>
                            </div>

                            {/*  Full Width Card  */}
                            <div
                                className="sm:col-span-2 mt-4 p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group hover:border-cyan-electric/50 transition-colors">
                                <div
                                    className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                </div>
                                <div className="relative z-10 flex gap-4">
                                    <div className="text-3xl">🤯</div>
                                    <div>
                                        <h4 className={`font-bold text-white text-lg mb-1 lang-es ${language === "es" ? "" : "hidden"}`}>Esto no es un chatbot
                                            genérico.</h4>
                                        <h4 className={`font-bold text-white text-lg mb-1 lang-en ${language === "en" ? "" : "hidden"}`}>This is not a
                                            generic
                                            chatbot.</h4>
                                        <p className={`text-text-secondary lang-es ${language === "es" ? "" : "hidden"}`}>Es una IA que conoce <strong
                                            className="text-cyan-electric">TU</strong> negocio, <strong
                                                className="text-cyan-electric">TUS</strong> productos, <strong
                                                    className="text-cyan-electric">TUS</strong> clientes.</p>
                                        <p className={`text-text-secondary lang-en ${language === "en" ? "" : "hidden"}`}>It's an AI that knows <strong
                                            className="text-cyan-electric">YOUR</strong> business, <strong
                                                className="text-cyan-electric">YOUR</strong> products, <strong
                                                    className="text-cyan-electric">YOUR</strong> clients.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10">
                            <Link to="/register"
                                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ver la IA en Acción</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>See AI in Action</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section >
        {/*  SECTION 7: WHATSAPP INTEGRATED  */}
        < section id="whatsapp" className="py-24 bg-navy-900 border-t border-white/5 relative" >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="text-center mb-16">
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-bold mb-4">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path
                                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Integración Nativa 2026</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Native Integration 2026</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>WhatsApp No Es Solo para Chatear. <br /><span className="text-white">Es Tu Nuevo
                            Canal de Ventas.</span></span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>WhatsApp Is Not Just for Chatting. <br /><span
                            className="text-white">It's
                            Your New Sales Channel.</span></span>
                    </h2>
                    <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>78% de los negocios en LATAM usan WhatsApp para vender. SmartKubik lo
                            profesionaliza con IA, CRM y automatización.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>78% of businesses in LATAM use WhatsApp to sell. SmartKubik
                            professionalizes it with AI, CRM, and automation.</span>
                    </p>
                </div>

                {/*  WhatsApp Mockup & Features  */}
                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/*  Mockup  */}
                    <div className="relative group">
                        <div
                            className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-emerald-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000">
                        </div>
                        <div
                            className="relative bg-navy-900 rounded-3xl border border-white/10 overflow-hidden h-[500px] flex">
                            {/*  Sidebar list (partial)  */}
                            <div className="w-1/3 border-r border-white/5 bg-navy-800/50 p-4 hidden md:block">
                                <div className="space-y-4">
                                    <div
                                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border-l-2 border-[#25D366]">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">Juan Pérez</div>
                                            <div className={`text-xs text-green-400 truncate lang-es ${language === "es" ? "" : "hidden"}`}>Reservando...</div>
                                            <div className={`text-xs text-green-400 truncate lang-en ${language === "en" ? "" : "hidden"}`}>Booking...</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl opacity-50">
                                        <div className="w-10 h-10 rounded-full bg-pink-500/20"></div>
                                        <div>
                                            <div className="text-sm font-bold text-white">María L.</div>
                                            <div className={`text-xs text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Gracias!</div>
                                            <div className={`text-xs text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>Thanks!</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/*  Chat Area  */}
                            <div className="flex-1 flex flex-col bg-[#0b141a]">
                                {/*  Header  */}
                                <div className="h-16 border-b border-white/5 flex items-center px-6 bg-navy-800/50">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 mr-3"></div>
                                    <div>
                                        <div className="text-white font-bold text-sm">Juan Pérez</div>
                                        <div className={`text-xs text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Cliente VIP • LTV $1,200</div>
                                        <div className={`text-xs text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>VIP Client • LTV $1,200</div>
                                    </div>
                                </div>

                                {/*  Messages  */}
                                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                                    <div className="flex justify-start">
                                        <div
                                            className="bg-[#202c33] p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm text-gray-200">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Hola, ¿tienen la camisa azul en talla M?</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Hi, do you have the blue shirt in size
                                                M?</span>
                                            <div className="text-[10px] text-gray-500 text-right mt-1">10:42 AM</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <div
                                            className="bg-[#005c4b] p-3 rounded-lg rounded-tr-none max-w-[80%] text-sm text-gray-100 shadow-md">
                                            <div
                                                className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold mb-1">
                                                <span>🤖 SmartKubik AI</span>
                                            </div>
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sí, Juan! Nos quedan 2 unidades en la tienda del
                                                centro.
                                                ¿Quieres que te reserve una?</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Yes, Juan! We have 2 units left downtown. Would
                                                you
                                                like me to reserve one?</span>
                                            <div
                                                className="text-[10px] text-green-200 text-right mt-1 flex items-center justify-end gap-1">
                                                10:42 AM <span className="text-blue-300">✓✓</span></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-start">
                                        <div
                                            className="bg-[#202c33] p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm text-gray-200">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sí por favor, paso hoy en la tarde.</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Yes please, I'll stop by this afternoon.</span>
                                            <div className="text-[10px] text-gray-500 text-right mt-1">10:43 AM</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center my-2">
                                        <div
                                            className="bg-navy-800 text-xs text-gray-400 px-3 py-1 rounded-full border border-white/5">
                                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Orden #4829 creada automáticamente</span>
                                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Order #4829 created automatically</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/*  Features Grid  */}
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="glass-card p-5 rounded-xl">
                            <h4 className={`font-bold text-white mb-2 lang-es ${language === "es" ? "" : "hidden"}`}>📥 Inbox Centralizado</h4>
                            <h4 className={`font-bold text-white mb-2 lang-en ${language === "en" ? "" : "hidden"}`}>📥 Centralized Inbox</h4>
                            <p className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Todas las conversaciones en un lugar. Múltiples
                                agentes
                                pueden responder.</p>
                            <p className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>All conversations in one place. Multiple
                                agents
                                can respond.</p>
                        </div>
                        <div className="glass-card p-5 rounded-xl">
                            <h4 className={`font-bold text-white mb-2 lang-es ${language === "es" ? "" : "hidden"}`}>🤖 Auto-Respuestas IA</h4>
                            <h4 className={`font-bold text-white mb-2 lang-en ${language === "en" ? "" : "hidden"}`}>🤖 AI Auto-Replies</h4>
                            <p className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>El cliente pregunta por un producto a las 11pm. La
                                IA
                                responde al instante.</p>
                            <p className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>Customer asks for a product at 11pm. AI
                                responds
                                instantly.</p>
                        </div>
                        <div className="glass-card p-5 rounded-xl">
                            <h4 className={`font-bold text-white mb-2 lang-es ${language === "es" ? "" : "hidden"}`}>📢 Campañas Masivas</h4>
                            <h4 className={`font-bold text-white mb-2 lang-en ${language === "en" ? "" : "hidden"}`}>📢 Mass Campaigns</h4>
                            <p className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Envía promociones a segmentos. "Clientes VIP que no
                                compran hace 30 días."</p>
                            <p className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>Send promotions to segments. "VIP clients
                                who
                                haven't bought in 30 days."</p>
                        </div>
                        <div className="glass-card p-5 rounded-xl">
                            <h4 className={`font-bold text-white mb-2 lang-es ${language === "es" ? "" : "hidden"}`}>🛒 Órdenes por WhatsApp</h4>
                            <h4 className={`font-bold text-white mb-2 lang-en ${language === "en" ? "" : "hidden"}`}>🛒 WhatsApp Orders</h4>
                            <p className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Cliente pide → IA confirma → Orden creada → Factura
                                enviada. Automático.</p>
                            <p className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>Client orders → AI confirms → Order created
                                →
                                Invoice sent. Automatic.</p>
                        </div>
                        <div className="glass-card p-5 rounded-xl">
                            <h4 className={`font-bold text-white mb-2 lang-es ${language === "es" ? "" : "hidden"}`}>📋 Todo en el CRM</h4>
                            <h4 className={`font-bold text-white mb-2 lang-en ${language === "en" ? "" : "hidden"}`}>📋 Everything in CRM</h4>
                            <p className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Cada conversación queda en el perfil del cliente.
                                Historial completo.</p>
                            <p className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>Every conversation stays in the client's
                                profile. Complete history.</p>
                        </div>
                        <div className="glass-card p-5 rounded-xl">
                            <h4 className={`font-bold text-white mb-2 lang-es ${language === "es" ? "" : "hidden"}`}>📊 Métricas</h4>
                            <h4 className={`font-bold text-white mb-2 lang-en ${language === "en" ? "" : "hidden"}`}>📊 Metrics</h4>
                            <p className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Mensajes enviados, tasa de respuesta, conversiones.
                                Mide lo que funciona.</p>
                            <p className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>Messages sent, response rate, conversions.
                                Measure what works.</p>
                        </div>

                        <div className="sm:col-span-2 mt-3 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 text-lg font-bold text-white">
                                <span>💬</span>
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Deja de ser esclavo del teléfono. SmartKubik responde por
                                    ti.</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Stop being a slave to the phone. SmartKubik answers for
                                    you.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section >

        {/*  SECTION 8: VIDEO DEMO  */}
        < section id="demo" className="py-24 relative overflow-hidden bg-[#050810]" >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
                <h2 className="text-3xl md:text-5xl font-display font-bold mb-8">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ve SmartKubik en Acción <span className="text-cyan-400 text-lg align-top ml-2">(90
                        Segundos)</span></span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>See SmartKubik in Action <span
                        className="text-cyan-400 text-lg align-top ml-2">(90 Seconds)</span></span>
                </h2>

                <div
                    className="relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group cursor-pointer">
                    {/*  Video Thumbnail / Placeholder  */}
                    <div className="aspect-video bg-navy-800 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        {/*  Play Button  */}
                        <div
                            className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform relative z-10">
                            <div
                                className="absolute inset-0 rounded-full border border-cyan-500/50 animate-ping opacity-75">
                            </div>
                            <svg className="w-8 h-8 text-white fill-current ml-1" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <div className={`font-bold text-white text-lg lang-es ${language === "es" ? "" : "hidden"}`}>Demo Completa: Restaurante & Retail</div>
                            <div className={`font-bold text-white text-lg lang-en ${language === "en" ? "" : "hidden"}`}>Full Demo: Restaurant & Retail
                            </div>
                            <div className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>Ver cómo funciona POS, Inventario y WhatsApp
                            </div>
                            <div className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>See how POS, Inventory and WhatsApp work
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <Link to="#trial"
                        className="text-gray-400 hover:text-white underline decoration-cyan-500/50 hover:decoration-cyan-500 transition-all">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Quiero Probarlo Ahora sin ver video</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>I Want to Try It Now (Skip Video)</span>
                    </Link>
                </div>
            </div>
        </section >

        {/*  SECTION 9: COMPARISON  */}
        < section id="comparison" className="py-24 border-y border-white/5" >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Lo Que Pagas Hoy vs. <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Lo Que Podrías
                            Pagar</span></span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>What You Pay Today vs. <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">What You Could
                            Pay</span></span>
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/*  Current Stack Table  */}
                    <div className="glass-card p-8 rounded-3xl border-red-500/20">
                        <h3 className={`text-xl font-bold text-gray-400 mb-6 lang-es ${language === "es" ? "" : "hidden"}`}>Tu Stack Actual (Fragmentado)</h3>
                        <h3 className={`text-xl font-bold text-gray-400 mb-6 lang-en ${language === "en" ? "" : "hidden"}`}>Your Current Stack (Fragmented)
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between py-3 border-b border-white/5 text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>QuickBooks / Contabilidad</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>QuickBooks / Accounting</span>
                                <span>$90/mes</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-white/5 text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sistema de Inventario</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Inventory System</span>
                                <span>$150/mes</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-white/5 text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>POS (2 cajas)</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>POS (2 registers)</span>
                                <span>$165/mes</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-white/5 text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Marketing & CRM</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Marketing & CRM</span>
                                <span>$350/mes</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-white/5 text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Plataforma E-commerce</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>E-commerce Platform</span>
                                <span>$79/mes</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-white/5 text-gray-400">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Integraciones (Zapier, etc)</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Integrations (Zapier, etc)</span>
                                <span>$49/mes</span>
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
                            <span className={`text-gray-400 font-medium lang-es ${language === "es" ? "" : "hidden"}`}>Total Mensual</span>
                            <span className={`text-gray-400 font-medium lang-en ${language === "en" ? "" : "hidden"}`}>Monthly Total</span>
                            <span className="text-3xl font-bold text-red-400">$883<span
                                className="text-sm text-gray-500 font-normal">/mes</span></span>
                        </div>
                    </div>

                    {/*  SmartKubik Table  */}
                    <div
                        className="glass-card p-8 rounded-3xl border-emerald-500/30 bg-emerald-900/5 relative overflow-hidden">
                        <div
                            className={`absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl lang-es ${language === "es" ? "" : "hidden"}`}>
                            MEJOR OPCIÓN</div>
                        <div
                            className={`absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl lang-en ${language === "en" ? "" : "hidden"}`}>
                            BEST CHOICE</div>
                        <h3 className="text-xl font-bold text-white mb-6">SmartKubik</h3>
                        <div className="space-y-4">
                            <div
                                className="flex justify-between py-3 border-b border-white/5 text-white bg-white/5 px-2 rounded">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Contabilidad + Impuestos</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Accounting + Taxes</span>
                                <span className={`text-emerald-400 font-bold lang-es ${language === "es" ? "" : "hidden"}`}>Incluido</span>
                                <span className={`text-emerald-400 font-bold lang-en ${language === "en" ? "" : "hidden"}`}>Included</span>
                            </div>
                            <div
                                className="flex justify-between py-3 border-b border-white/5 text-white bg-white/5 px-2 rounded">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Inventario Avanzado</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Advanced Inventory</span>
                                <span className={`text-emerald-400 font-bold lang-es ${language === "es" ? "" : "hidden"}`}>Incluido</span>
                                <span className={`text-emerald-400 font-bold lang-en ${language === "en" ? "" : "hidden"}`}>Included</span>
                            </div>
                            <div
                                className="flex justify-between py-3 border-b border-white/5 text-white bg-white/5 px-2 rounded">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>POS Ilimitado</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Unlimited POS</span>
                                <span className={`text-emerald-400 font-bold lang-es ${language === "es" ? "" : "hidden"}`}>Incluido</span>
                                <span className={`text-emerald-400 font-bold lang-en ${language === "en" ? "" : "hidden"}`}>Included</span>
                            </div>
                            <div
                                className="flex justify-between py-3 border-b border-white/5 text-white bg-white/5 px-2 rounded">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>CRM + Marketing + WhatsApp</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>CRM + Marketing + WhatsApp</span>
                                <span className={`text-emerald-400 font-bold lang-es ${language === "es" ? "" : "hidden"}`}>Incluido</span>
                                <span className={`text-emerald-400 font-bold lang-en ${language === "en" ? "" : "hidden"}`}>Included</span>
                            </div>
                            <div
                                className="flex justify-between py-3 border-b border-white/5 text-white bg-white/5 px-2 rounded">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>E-commerce Nativo</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Native E-commerce</span>
                                <span className={`text-emerald-400 font-bold lang-es ${language === "es" ? "" : "hidden"}`}>Incluido</span>
                                <span className={`text-emerald-400 font-bold lang-en ${language === "en" ? "" : "hidden"}`}>Included</span>
                            </div>
                            <div
                                className="flex justify-between py-3 border-b border-white/5 text-white bg-white/5 px-2 rounded">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Integraciones</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Integrations</span>
                                <span className={`text-emerald-400 font-bold lang-es ${language === "es" ? "" : "hidden"}`}>Incluido</span>
                                <span className={`text-emerald-400 font-bold lang-en ${language === "en" ? "" : "hidden"}`}>Included</span>
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
                            <span className={`text-white font-medium lang-es ${language === "es" ? "" : "hidden"}`}>Total Mensual (8 usuarios)</span>
                            <span className={`text-white font-medium lang-en ${language === "en" ? "" : "hidden"}`}>Monthly Total (8 users)</span>
                            <span className="text-3xl font-bold text-emerald-400">$280<span
                                className="text-sm text-gray-400 font-normal">/mes</span></span>
                        </div>

                        <div className="mt-6 bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                            <p className={`text-emerald-300 font-bold text-lg lang-es ${language === "es" ? "" : "hidden"}`}>Ahorras $7,236 al año 🎉</p>
                            <p className={`text-emerald-300 font-bold text-lg lang-en ${language === "en" ? "" : "hidden"}`}>Save $7,236 per year 🎉</p>
                        </div>
                    </div>
                </div>

                {/*  Competitor Matrix  */}
                <div className="mt-24 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-4 pl-4 text-gray-400 font-medium">Feature</th>
                                <th
                                    className="py-4 px-4 text-center font-bold text-white text-xl bg-cyan-500/10 rounded-t-xl border-t border-x border-cyan-500/20 min-w-[180px]">
                                    SmartKubik</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-medium min-w-[140px]">Odoo</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-medium min-w-[140px]">SAP B1</th>
                                <th className="py-4 px-4 text-center text-gray-500 font-medium min-w-[140px]">QuickBooks
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm md:text-base">
                            <tr className="border-b border-white/5">
                                <td className="py-4 pl-4 text-white">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Todos los módulos incluidos</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>All modules included</span>
                                </td>
                                <td
                                    className="py-4 px-4 text-center bg-cyan-500/5 border-x border-cyan-500/10 text-emerald-400 text-lg">
                                    ✅</td>
                                <td className={`py-4 px-4 text-center text-gray-500 lang-es ${language === "es" ? "" : "hidden"}`}>💰 Extra</td>
                                <td className={`py-4 px-4 text-center text-gray-500 lang-en ${language === "en" ? "" : "hidden"}`}>💰 Extra</td>
                                <td className={`py-4 px-4 text-center text-gray-500 lang-es ${language === "es" ? "" : "hidden"}`}>💰 Extra</td>
                                <td className={`py-4 px-4 text-center text-gray-500 lang-en ${language === "en" ? "" : "hidden"}`}>💰 Extra</td>
                                <td className="py-4 px-4 text-center text-red-400">❌</td>
                            </tr>
                            <tr className="border-b border-white/5">
                                <td className="py-4 pl-4 text-white">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Configuración &lt; 1 día</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Setup &lt; 1 day</span>
                                </td>
                                <td
                                    className="py-4 px-4 text-center bg-cyan-500/5 border-x border-cyan-500/10 text-emerald-400 text-lg">
                                    ✅</td>
                                <td className="py-4 px-4 text-center text-gray-500"><span className={`lang-es ${language === "es" ? "" : "hidden"} `}>❌
                                    Semanas</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>❌ Weeks</span></td>
                                <td className="py-4 px-4 text-center text-gray-500"><span className={`lang-es ${language === "es" ? "" : "hidden"} `}>❌
                                    Meses</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>❌ Months</span></td>
                                <td className="py-4 px-4 text-center text-amber-500">⚠️</td>
                            </tr>
                            <tr className="border-b border-white/5">
                                <td className="py-4 pl-4 text-white">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Inteligencia Artificial</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Artificial Intelligence</span>
                                </td>
                                <td
                                    className="py-4 px-4 text-center bg-cyan-500/5 border-x border-cyan-500/10 text-emerald-400 text-lg">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>✅ Incluida</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>✅
                                        Included</span>
                                </td>
                                <td className="py-4 px-4 text-center text-red-400">❌</td>
                                <td className="py-4 px-4 text-center text-red-400">❌</td>
                                <td className="py-4 px-4 text-center text-red-400">❌</td>
                            </tr>
                            <tr className="border-b border-white/5">
                                <td className="py-4 pl-4 text-white">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>WhatsApp Nativo</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Native WhatsApp</span>
                                </td>
                                <td
                                    className="py-4 px-4 text-center bg-cyan-500/5 border-x border-cyan-500/10 text-emerald-400 text-lg">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>✅ Nativo</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>✅ Native</span>
                                </td>
                                <td className="py-4 px-4 text-center text-gray-500">❌ 3rd party</td>
                                <td className="py-4 px-4 text-center text-gray-500">❌ 3rd party</td>
                                <td className="py-4 px-4 text-center text-red-400">❌</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section >

        {/*  SECTION 10: PRICING  */}
        < section id="pricing" className="py-24 relative overflow-hidden bg-[#050810]" >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Precio Simple. Todo Incluido. <br /><span className="text-white">Sin
                            Trucos.</span></span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Simple Price. All Included. <br /><span className="text-white">No
                            Tricks.</span></span>
                    </h2>
                    <p className="text-xl text-text-secondary">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>98 módulos, IA incluida, WhatsApp nativo. Un precio por usuario.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>98 modules, AI included, native WhatsApp. One price per
                            user.</span>
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
                    {/*  Starter  */}
                    <div className="glass-card p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all">
                        <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                        <div className="text-4xl font-bold font-mono text-white mb-6">$29<span
                            className="text-lg font-normal text-gray-400">/mes</span></div>
                        <p className={`text-gray-400 text-sm mb-6 lang-es ${language === "es" ? "" : "hidden"}`}>Para pequeños negocios que quieren orden.</p>
                        <p className={`text-gray-400 text-sm mb-6 lang-en ${language === "en" ? "" : "hidden"}`}>For small businesses that want order.</p>
                        <Link to="/register"
                            className="btn-secondary w-full py-3 rounded-xl flex justify-center text-white font-bold mb-8">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Empezar Gratis</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Start for Free</span>
                        </Link>
                        <ul className="space-y-4 text-sm text-gray-300">
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Hasta 3 usuarios</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Up to 3 users</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>1 sucursal</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>1 branch</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Módulos de gestión operativa</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Operational management modules</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Web de ventas vinculada al sistema</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Sales website linked to system</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Analítica y reportes básicos</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Basic analytics & reports</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Backup 30 días</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>30-day backup</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Soporte vía email</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Email support</span></li>
                        </ul>
                    </div>

                    {/*  Professional  */}
                    <div
                        id="pro-plan-card"
                        className="glass-card p-8 rounded-3xl border border-cyan-500/50 bg-cyan-900/5 relative transform md:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.15)] z-10 transition-all duration-300">
                        <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-b-lg lang-es ${language === "es" ? "" : "hidden"}`}>
                            MÁS POPULAR</div>
                        <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-b-lg lang-en ${language === "en" ? "" : "hidden"}`}>
                            MOST POPULAR</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                        <div className="text-4xl font-bold font-mono text-white mb-6">$59<span
                            className="text-lg font-normal text-gray-400">/mes</span></div>
                        <p className={`text-gray-400 text-sm mb-6 lang-es ${language === "es" ? "" : "hidden"}`}>Para empresas que crecen rápido.</p>
                        <p className={`text-gray-400 text-sm mb-6 lang-en ${language === "en" ? "" : "hidden"}`}>For fast-growing companies.</p>
                        <Link to="/register"
                            className="btn-primary w-full py-3 rounded-xl flex justify-center text-white font-bold mb-8 shadow-lg shadow-cyan-500/25">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Prueba Gratis 14 Días</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Start Free 14-Day Trial</span>
                        </Link>
                        <ul className="space-y-4 text-sm text-gray-300">
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Todo lo del plan Starter</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Everything in Starter plan</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Hasta 8 usuarios</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Up to 8 users</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>3 sucursales</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>3 branches</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>WhatsApp nativo</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Native WhatsApp</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Asistente de IA</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>AI Assistant</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Analítica predictiva IA</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>AI predictive analytics</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Integraciones (Gmail, etc)</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Integrations (Gmail, etc)</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Soporte prioritario</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Priority support</span></li>
                        </ul>
                    </div>

                    {/*  Enterprise  */}
                    <div className="glass-card p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all">
                        <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                        <div className="text-4xl font-bold font-mono text-white mb-6">$99<span
                            className="text-lg font-normal text-gray-400">/mes</span></div>
                        <p className={`text-gray-400 text-sm mb-6 lang-es ${language === "es" ? "" : "hidden"}`}>Para grandes operaciones y franquicias.</p>
                        <p className={`text-gray-400 text-sm mb-6 lang-en ${language === "en" ? "" : "hidden"}`}>For large operations and franchises.</p>
                        <Link to="/register"
                            className="btn-secondary w-full py-3 rounded-xl flex justify-center text-white font-bold mb-8">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Contactar Ventas</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Contact Sales</span>
                        </Link>
                        <ul className="space-y-4 text-sm text-gray-300">
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Todo lo del plan Pro</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Everything in Pro</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>25+ usuarios</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>25+ users</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sucursales ilimitadas</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Unlimited branches</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Asistente IA Ilimitado</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Unlimited AI Assistant</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Dominio web propio</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Custom web domain</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Web sin publicidad</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Ad-free website</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Migración gratuita</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Free migration</span></li>
                            <li className="flex gap-3"><span className="text-emerald-400">✓</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Soporte dedicado / SLA</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Dedicated support / SLA</span></li>
                        </ul>
                    </div>
                </div>

                <div
                    className="mt-16 text-center max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-400">
                    <div className="glass-card p-3 rounded-lg flex items-center justify-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sin costo de setup</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>No setup cost</span>
                    </div>
                    <div className="glass-card p-3 rounded-lg flex items-center justify-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sin cargos por módulos</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>No module fees</span>
                    </div>
                    <div className="glass-card p-3 rounded-lg flex items-center justify-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Migración gratis</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Free migration</span>
                    </div>
                    <div className="glass-card p-3 rounded-lg flex items-center justify-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Cancela cuando quieras</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Cancel anytime</span>
                    </div>
                    <div className="glass-card p-3 rounded-lg flex items-center justify-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sin límite de datos</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Unlimited data</span>
                    </div>
                    <div className="glass-card p-3 rounded-lg flex items-center justify-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>20% dcto anual</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>20% annual discount</span>
                    </div>
                </div>
            </div>
        </section >

        {/*  CALCULATOR SECTION  */}
        < section className="py-24 relative border-t border-white/5" >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="glass-card rounded-3xl p-8 md:p-12 max-w-3xl mx-auto">
                    <h3 className="text-2xl font-bold mb-6 text-center text-white">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Calculadora Interactiva</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Interactive Calculator</span>
                    </h3>

                    <div className="mb-6">
                        <label className="block text-gray-400 mb-3">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Cuántos usuarios tienes?</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>How many users do you have?</span>
                        </label>
                        <input type="range" min="1" max="30" defaultValue="8"
                            className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            id="userSlider" />
                        <div className="text-center mt-2">
                            <span className="text-4xl font-bold font-mono text-white" id="userCount">8</span>
                            <span className="text-gray-500 ml-2">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>usuarios</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>users</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-2">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Tu costo mensual</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Your monthly cost</span>
                            </div>
                            <div className="text-5xl font-bold font-mono text-cyan-400" id="monthlyCost">$59</div>
                            <div className="text-xs text-gray-500 mt-1">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>/mes</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>/month</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-2">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Vs. alternativas fragmentadas</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Vs. fragmented alternatives</span>
                            </div>
                            <div className="text-5xl font-bold font-mono text-gray-600 line-through" id="competitorCost">
                                ~$1,200
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>/mes</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>/month</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="text-center glass-card rounded-2xl p-6 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
                        <div className="text-sm text-gray-400 mb-2">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Ahorras</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>You save</span>
                        </div>
                        <div className="text-4xl font-bold text-emerald-400 mb-1" id="savings">$1,141</div>
                        <div className="text-lg text-gray-400">
                            = <span className="font-bold text-emerald-400" id="annualSavings">$13,692</span>
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>/año 🎉</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>/year 🎉</span>
                        </div>
                    </div>
                </div>
            </div>
        </section >

        {/*  SECTION 13: URGENCY  */}
        < section className="py-24 relative overflow-hidden bg-gradient-to-br from-navy-900 via-[#0a0f1c] to-red-900/10" >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/*  Left Column: Problem  */}
                    <div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold mb-8 text-left">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Cada Día que Pasa, <br />Tu Negocio Pierde Dinero.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Every Day That Passes, <br />Your Business Loses Money.</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4">
                                <div className="text-3xl">⏰</div>
                                <div className="text-left">
                                    <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>3 horas/día</div>
                                    <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>3 hours/day</div>
                                    <div className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>perdidas en WhatsApp</div>
                                    <div className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>lost on WhatsApp</div>
                                </div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4">
                                <div className="text-3xl">💸</div>
                                <div className="text-left">
                                    <div className="font-bold text-white">$500+/mes</div>
                                    <div className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>en apps innecesarias</div>
                                    <div className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>on unnecessary apps</div>
                                </div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4">
                                <div className="text-3xl">📉</div>
                                <div className="text-left">
                                    <div className={`font-bold text-white lang-es ${language === "es" ? "" : "hidden"}`}>20% ventas</div>
                                    <div className={`font-bold text-white lang-en ${language === "en" ? "" : "hidden"}`}>20% sales</div>
                                    <div className={`text-sm text-gray-400 lang-es ${language === "es" ? "" : "hidden"}`}>perdidas por desorden</div>
                                    <div className={`text-sm text-gray-400 lang-en ${language === "en" ? "" : "hidden"}`}>lost due to disorganization</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/*  Right Column: Solution & Offer  */}
                    <div>
                        <p className="text-xl text-gray-300 mb-8 text-left">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>No es que no puedas seguir como estás. Puedes. Pero cada mes que pasa
                                sin
                                un sistema integrado es dinero perdido y estrés acumulado.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>It's not that you can't go on like this. You can. But every
                                month
                                that passes without an integrated system is money lost and accumulated stress.</span>
                            <br /><br />
                            <span className={`text-white font-bold lang-es ${language === "es" ? "" : "hidden"}`}>La pregunta no es SI necesitas SmartKubik. Es
                                cuánto
                                más vas a esperar.</span>
                            <span className={`text-white font-bold lang-en ${language === "en" ? "" : "hidden"}`}>The question isn't IF you need SmartKubik.
                                It's how much longer you will wait.</span>
                        </p>

                        <div className="glass-card p-8 rounded-3xl border border-cyan-500/30 w-full">
                            <div className="text-left mb-6">
                                <span
                                    className="bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Oferta Especial</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Special Offer</span>
                                </span>
                                <h3 className="text-2xl font-bold text-white">
                                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Empieza hoy y recibe:</span>
                                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Start today and receive:</span>
                                </h3>
                            </div>
                            <ul className="text-left space-y-3 mb-8 text-gray-300">
                                <li className="flex gap-2"><span className="text-emerald-400">✅</span> <span
                                    className={`lang-es ${language === "es" ? "" : "hidden"} `}>Setup
                                    guiado gratis (valor $200)</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Free guided setup
                                        ($200
                                        value)</span>
                                </li>
                                <li className="flex gap-2"><span className="text-emerald-400">✅</span> <span
                                    className={`lang-es ${language === "es" ? "" : "hidden"} `}>Migración
                                    de datos incluida</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Data migration
                                        included</span>
                                </li>
                                <li className="flex gap-2"><span className="text-emerald-400">✅</span> <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>14
                                    días
                                    sin
                                    tarjeta de crédito</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>14 days without credit
                                        card</span>
                                </li>
                            </ul>
                            <Link to="/register"
                                className="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg block text-center shadow-lg hover:shadow-cyan-500/50 transition-all">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Empezar Mi Prueba Gratis →</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Start My Free Trial →</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section >

        {/*  SECTION 14: FAQ  */}
        < section className="py-24 px-4 bg-[#050810] relative overflow-hidden" >
            <div className="max-w-4xl mx-auto">
                {/*  Headline  */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 font-display">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Preguntas Frecuentes</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Frequently Asked Questions</span>
                    </h2>
                    <p className="text-xl text-gray-400">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Todo lo que necesitas saber</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Everything you need to know</span>
                    </p>
                </div>

                {/*  FAQ Accordion  */}
                <div className="space-y-4">

                    {/*  FAQ 1  */}
                    <div className="glass-card rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                        <button
                            className="faq-question w-full text-left px-8 py-6 flex justify-between items-center hover:bg-white/5 transition-all">
                            <span className="text-lg font-bold text-white">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Necesito conocimientos técnicos para usar SmartKubik?</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Do I need technical knowledge to use SmartKubik?</span>
                            </span>
                            <svg className="faq-icon w-6 h-6 flex-shrink-0 text-cyan-400 transform transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="faq-answer hidden px-8 pb-6 bg-white/5">
                            <p className="text-gray-300 leading-relaxed">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>No. SmartKubik está diseñado para dueños de negocio, no para
                                    programadores. Si sabes usar WhatsApp, puedes usar SmartKubik. Además, nuestro
                                    equipo te
                                    ayuda a configurar todo en menos de 15 minutos.</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>No. SmartKubik is designed for business owners, not
                                    programmers. If you can use WhatsApp, you can use SmartKubik. Plus, our team helps
                                    you
                                    set everything up in under 15 minutes.</span>
                            </p>
                        </div>
                    </div>

                    {/*  FAQ 2  */}
                    <div className="glass-card rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                        <button
                            className="faq-question w-full text-left px-8 py-6 flex justify-between items-center hover:bg-white/5 transition-all">
                            <span className="text-lg font-bold text-white">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Qué pasa con mis datos si cancelo?</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>What happens to my data if I cancel?</span>
                            </span>
                            <svg className="faq-icon w-6 h-6 flex-shrink-0 text-cyan-400 transform transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="faq-answer hidden px-8 pb-6 bg-white/5">
                            <p className="text-gray-300 leading-relaxed">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Tus datos son tuyos. Antes de cancelar, puedes exportar todo
                                    (inventario, clientes, ventas, contabilidad) en Excel o CSV. Y guardamos tu
                                    información
                                    por 90 días por si cambias de opinión.</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Your data is yours. Before canceling, you can export
                                    everything
                                    (inventory, customers, sales, accounting) in Excel or CSV. And we keep your
                                    information
                                    for 90 days in case you change your mind.</span>
                            </p>
                        </div>
                    </div>

                    {/*  FAQ 3  */}
                    <div className="glass-card rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                        <button
                            className="faq-question w-full text-left px-8 py-6 flex justify-between items-center hover:bg-white/5 transition-all">
                            <span className="text-lg font-bold text-white">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Funciona sin internet?</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Does it work offline?</span>
                            </span>
                            <svg className="faq-icon w-6 h-6 flex-shrink-0 text-cyan-400 transform transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="faq-answer hidden px-8 pb-6 bg-white/5">
                            <p className="text-gray-300 leading-relaxed">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sí. El POS funciona sin internet y sincroniza automáticamente
                                    cuando
                                    vuelve la conexión. Esto es especialmente útil para negocios en zonas con internet
                                    inestable.</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Yes. The POS works offline and automatically syncs when the
                                    connection returns. This is especially useful for businesses in areas with unstable
                                    internet.</span>
                            </p>
                        </div>
                    </div>

                    {/*  FAQ 4  */}
                    <div className="glass-card rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                        <button
                            className="faq-question w-full text-left px-8 py-6 flex justify-between items-center hover:bg-white/5 transition-all">
                            <span className="text-lg font-bold text-white">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Puedo empezar con algunos módulos y agregar más después?</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Can I start with some modules and add more later?</span>
                            </span>
                            <svg className="faq-icon w-6 h-6 flex-shrink-0 text-cyan-400 transform transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="faq-answer hidden px-8 pb-6 bg-white/5">
                            <p className="text-gray-300 leading-relaxed">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Absolutamente. Muchos clientes empiezan solo con POS e Inventario,
                                    y
                                    luego activan Contabilidad, Nómina, etc. cuando están listos. Puedes
                                    activar/desactivar
                                    módulos en cualquier momento.</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Absolutely. Many clients start with just POS and Inventory,
                                    then activate Accounting, Payroll, etc. when they're ready. You can
                                    activate/deactivate
                                    modules at any time.</span>
                            </p>
                        </div>
                    </div>

                    {/*  FAQ 5  */}
                    <div className="glass-card rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                        <button
                            className="faq-question w-full text-left px-8 py-6 flex justify-between items-center hover:bg-white/5 transition-all">
                            <span className="text-lg font-bold text-white">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Cómo funciona el soporte técnico?</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>How does technical support work?</span>
                            </span>
                            <svg className="faq-icon w-6 h-6 flex-shrink-0 text-cyan-400 transform transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="faq-answer hidden px-8 pb-6 bg-white/5">
                            <p className="text-gray-300 leading-relaxed">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Tienes soporte por WhatsApp, email y videollamada. En todos los
                                    planes. Tiempo de respuesta promedio: menos de 2 horas en días laborales. Y la IA
                                    integrada resuelve el 70% de las dudas al instante.</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>You have support via WhatsApp, email, and video call. On
                                    all
                                    plans. Average response time: less than 2 hours on business days. And the integrated
                                    AI
                                    solves 70% of questions instantly.</span>
                            </p>
                        </div>
                    </div>

                    {/*  FAQ 6  */}
                    <div className="glass-card rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                        <button
                            className="faq-question w-full text-left px-8 py-6 flex justify-between items-center hover:bg-white/5 transition-all">
                            <span className="text-lg font-bold text-white">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Cumple con las leyes fiscales de mi país?</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Does it comply with my country's tax laws?</span>
                            </span>
                            <svg className="faq-icon w-6 h-6 flex-shrink-0 text-cyan-400 transform transition-transform"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="faq-answer hidden px-8 pb-6 bg-white/5">
                            <p className="text-gray-300 leading-relaxed">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sí. SmartKubik genera facturas electrónicas según las normativas
                                    de
                                    Venezuela, Colombia y México. También generamos reportes listos para tu contador
                                    (P&L,
                                    Balance, flujo de caja, retenciones, IVA, etc.).</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Yes. SmartKubik generates electronic invoices according to
                                    the
                                    regulations of Venezuela, Colombia, and Mexico. We also generate reports ready for
                                    your
                                    accountant (P&L, Balance Sheet, cash flow, withholdings, VAT, etc.).</span>
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </section >

        {/*  SECTION 15: FINAL CTA (From V2)  */}
        < section
            className="py-24 px-4 bg-gradient-to-b from-black/20 to-[#0A0F1C] border-t border-white/5 relative overflow-hidden" >
            {/*  Enhanced Gradient Background (From V4)  */}
            < div className="absolute inset-0 bg-[linear-gradient(135deg,#06B6D4,#10B981)] opacity-10" ></div >

            <div className="max-w-4xl mx-auto text-center relative z-10">
                <h2 className="text-5xl md:text-7xl font-bold mb-6 font-display text-white">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Listo para Dejar de<br /><span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Administrar
                        Caos?</span></span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Ready to Stop<br /><span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-emerald-500">Managing
                        Chaos?</span></span>
                </h2>

                <p className="text-2xl text-gray-400 mb-12">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Un sistema. Todo tu negocio. Desde $29/usuario/mes.</span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>One system. Your entire business. From $29/user/month.</span>
                </p>

                {/*  Dual CTAs  */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                    <div
                        className="glass-card rounded-2xl p-8 hover:border-cyan-500/50 transition-all group cursor-pointer hover:!translate-y-0">
                        <h3 className="text-2xl font-bold mb-3 text-white">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Prueba Gratis 14 Días</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Free 14-Day Trial</span>
                        </h3>
                        <p className="text-gray-400 mb-6">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Sin tarjeta de crédito<br />Configura en 15 minutos<br />Empieza a vender
                                hoy</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>No credit card required<br />Set up in 15 minutes<br />Start
                                selling
                                today</span>
                        </p>
                        <Link to="/register" style={{ display: 'contents' }}>
                            <button
                                className="w-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg group-hover:shadow-cyan-500/40">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Empezar Ahora →</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Start Now →</span>
                            </button>
                        </Link>
                    </div>

                    <div
                        className="glass-card rounded-2xl p-8 hover:border-emerald-500/50 transition-all group cursor-pointer hover:!translate-y-0">
                        <h3 className="text-2xl font-bold mb-3 text-white">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Agendar Demo Personalizada</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Schedule Custom Demo</span>
                        </h3>
                        <p className="text-gray-400 mb-6">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Hablamos de tu negocio específico<br />30 minutos con un experto<br />Te
                                mostramos todo</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>We discuss your specific business<br />30 minutes with an
                                expert<br />We show you everything</span>
                        </p>
                        <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" style={{ display: 'contents' }}>
                            <button
                                className="w-full glass-card px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all text-white border border-white/10">
                                <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Agendar Demo →</span>
                                <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Schedule Demo →</span>
                            </button>
                        </a>
                    </div>
                </div>

                {/*  Contact  */}
                <p className="text-gray-500">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¿Preguntas? Escríbenos por <a href={whatsAppLink} target="_blank" rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline">WhatsApp</a> o <button onClick={() => setIsContactModalOpen(true)}
                            className="text-cyan-400 hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit">Email</button>. Respondemos en menos de 2 horas.</span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Questions? Write us on <a href={whatsAppLink} target="_blank" rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline">WhatsApp</a> or <button onClick={() => setIsContactModalOpen(true)}
                            className="text-cyan-400 hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit">Email</button>. We respond in under 2 hours.</span>
                </p>
            </div>

            {/* Contact Modal */}
            <SalesContactModal isOpen={isContactModalOpen} onOpenChange={setIsContactModalOpen} />
        </section >

        {/*  FOOTER (From V2)  */}
        < footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl py-16 px-4" >
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
                    {/*  Brand  */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <a href="#" className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity cursor-pointer">
                                <img src="/assets/logo-smartkubik.png" alt="SmartKubik Logo" className="h-8 w-auto" />
                            </a>
                        </div>
                        <p className="text-gray-400 leading-relaxed mb-6">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>El último ERP que tu negocio necesitará.</span>
                            <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>The last ERP your business will ever need.</span>
                        </p>
                        <div className="flex gap-4">
                            <Link to="#"
                                className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                            </Link>
                            <Link to="#"
                                className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </Link>
                            <Link to="#"
                                className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/*  Column 1  */}
                    <div>
                        <h4 className="font-bold mb-4 text-white">SmartKubik</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Sobre Nosotros</Link><Link
                                to="#" className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>About Us</Link>
                            </li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Contacto</Link><Link
                                to="#" className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Contact</Link>
                            </li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Trabaja con
                                Nosotros</Link><Link to="#"
                                    className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Carrers</Link></li>
                        </ul>
                    </div>
                    {/*  Column 2  */}
                    <div>
                        <h4 className="font-bold mb-4 text-white">
                            <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>Producto</span><span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Product</span>
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Módulos</Link><Link to="#"
                                className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Modules</Link></li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Precios</Link><Link to="#"
                                className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Pricing</Link></li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Integraciones</Link><Link
                                to="#"
                                className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Integrations</Link>
                            </li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Seguridad</Link><Link
                                to="#" className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Security</Link>
                            </li>
                        </ul>
                    </div>
                    {/*  Column 3  */}
                    <div>
                        <h4 className="font-bold mb-4 text-white">Legal</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Términos</Link><Link
                                to="#" className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Terms</Link></li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Privacidad</Link><Link
                                to="#" className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Privacy</Link>
                            </li>
                            <li><Link to="#" className={`hover:text-cyan-400 transition-colors lang-es ${language === "es" ? "" : "hidden"}`}>Cookies</Link><Link to="#"
                                className={`hover:text-cyan-400 transition-colors lang-en ${language === "en" ? "" : "hidden"}`}>Cookies</Link></li>
                        </ul>
                    </div>
                </div>

                {/*  Bottom Bar  */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500">
                        <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>© 2026 SmartKubik Inc. Todos los derechos reservados.</span>
                        <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>© 2026 SmartKubik Inc. All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        {/*  Language Toggle in Footer (Optional separate control or link to top)  */}
                    </div>
                </div>
            </div>
        </footer >


        {/*  Light Rays WebGL Effect  */}

        {/*  Parallax Effect for Section 2  */}

        {/*  WhatsApp Floating Widget  */}
        <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 group"
        >
            <div className="relative">
                {/* Ping Effect */}
                <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity"></div>

                {/* Main Button */}
                <div className="relative bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                </div>

                {/* Tooltip / Badge */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-navy-900 px-3 py-1 rounded-lg text-sm font-bold shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
                    <span className={`lang-es ${language === "es" ? "" : "hidden"} `}>¡Chatea con nosotros!</span>
                    <span className={`lang-en ${language === "en" ? "" : "hidden"} `}>Chat with us!</span>
                </div>
            </div>
        </a>

    </div >
    );
};

export default SmartKubikLanding;
