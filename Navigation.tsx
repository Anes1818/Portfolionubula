import { useState, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  number: string;
}

interface SocialItem {
  label: string;
  href: string;
}

/* ─── Data ──────────────────────────────────────────────────────────── */
const navItems: NavItem[] = [
  { label: "About",      href: "#about",      number: "01" },
  { label: "Work",       href: "#work",       number: "02" },
  { label: "Philosophy", href: "#philosophy", number: "03" },
  { label: "Contact",    href: "#contact",    number: "04" },
];

const socialItems: SocialItem[] = [
  { label: "GitHub",    href: "https://github.com/MAHESHPPAI" },
  { label: "LinkedIn",  href: "https://www.linkedin.com/in/mahesh-p-pai-b0987b2a8/" },
  { label: "Instagram", href: "https://www.instagram.com/mahesh_3.14_/" },
  { label: "Email",     href: "mailto:maheshpailinked@gmail.com" },
];

/* ─── Motion config ─────────────────────────────────────────────────────── */
// Defined outside the component — no recreation on every render.
const EASE_CINEMATIC  = [0.76, 0, 0.24, 1]    as [number, number, number, number];
const EASE_SPRING_OUT = [0.16, 1, 0.3, 1]      as [number, number, number, number];

const overlayVariants: Variants = {
  closed: { clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.9, ease: EASE_CINEMATIC } },
  open:   { clipPath: "inset(0% 0% 0% 0%)",   transition: { duration: 0.9, ease: EASE_CINEMATIC } },
};

const itemVariants: Variants = {
  closed: { y: 48, opacity: 0, transition: { duration: 0.7, ease: EASE_CINEMATIC } },
  open: (i: number) => ({
    y: 0, opacity: 1,
    transition: { duration: 1.0, delay: 0.35 + i * 0.1, ease: EASE_SPRING_OUT },
  }),
};

const socialVariants: Variants = {
  closed: { opacity: 0, y: 12, transition: { duration: 0.5, ease: EASE_CINEMATIC } },
  open: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: 0.55 + i * 0.07, ease: EASE_SPRING_OUT },
  }),
};

const lineTransition = { type: "spring" as const, stiffness: 260, damping: 22 };

/* ─── Navigation component ─────────────────────────────────────────────── */
const Navigation = () => {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId(); // Stable ID for aria-controls

  /* Lock body scroll when menu is open */
  useEffect(() => {
    document.body.style.overflow    = open ? "hidden" : "";
    document.body.style.touchAction = open ? "none" : ""; // iOS Safari fix
    return () => {
      document.body.style.overflow    = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  /* Detect scroll position to shrink the button */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close on Escape key */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleNavClick = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* ─── Brand mark (top-left) ──────────────────────────────────────── */}
      <motion.a
        href="#"
        aria-label="Mahesh P Pai — back to top"
        className="fixed top-6 left-6 md:top-8 md:left-10 z-[200] font-serif text-sm tracking-wider text-black mix-blend-difference"
        initial= opacity: 0, y: -12 
        animate= opacity: 1, y: 0 
        transition= duration: 0.8, delay: 0.2, ease: EASE_SPRING_OUT 
      >
        MPP
      </motion.a>

      {/* ─── Hamburger button ────────────────────────────────────────── */}
      <div className="fixed top-6 right-6 md:top-8 md:right-10 z-[200]">
        <motion.button
          onClick={() => setOpen((v) => !v)}
          /* a11y: announce state + control the menu panel */
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls={menuId}
          /* Shrink slightly on scroll for a refined feel */
          animate=
            width:  scrolled && !open ? 52 : 56,
            height: scrolled && !open ? 52 : 56,
          
          transition= duration: 0.4, ease: EASE_SPRING_OUT 
          className="flex items-center justify-center rounded-full bg-black relative overflow-hidden"
          style= cursor: "none" 
        >
          {/* Hover ripple fill */}
          <motion.span
            className="absolute inset-0 rounded-full bg-white"
            initial= scale: 0, opacity: 0 
            whileHover= scale: 1, opacity: 0.1 
            transition= duration: 0.4 
          />

          {/* Top line */}
          <motion.span
            animate={open ? { rotate: 45, y: 6.5 } : { rotate: 0, y: -4 }}
            transition={lineTransition}
            className="absolute block h-[1.5px] w-[22px] bg-white origin-center"
          />
          {/* Middle line */}
          <motion.span
            animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={lineTransition}
            className="absolute block h-[1.5px] w-[22px] bg-white origin-center"
          />
          {/* Bottom line */}
          <motion.span
            animate={open ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 4 }}
            transition={lineTransition}
            className="absolute block h-[1.5px] w-[22px] bg-white origin-center"
          />
        </motion.button>
      </div>

      {/* ─── Full-screen menu overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            key="nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-[100] bg-black flex flex-col justify-between px-8 md:px-16 pt-24 pb-10 md:pt-28 md:pb-14"
          >
            {/* Top row: availability badge + socials */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {/* Live availability dot */}
              <div className="flex items-center gap-2 mr-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs text-white/50 uppercase tracking-widest font-mono">
                  Available for work
                </p>
              </div>

              <p className="text-xs text-white/40 uppercase tracking-widest font-mono mr-1">//</p>

              {socialItems.map((item, i) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  custom={i}
                  variants={socialVariants}
                  className="text-sm text-white/60 hover:text-white transition-colors duration-200 font-mono tracking-wide underline-offset-4 hover:underline"
                >
                  {item.label}
                </motion.a>
              ))}
            </div>

            {/* Main nav items — cinematic large type */}
            <nav aria-label="Primary">
              <ul className="space-y-1 md:space-y-0">
                {navItems.map((item, i) => (
                  <li key={item.href} className="overflow-hidden border-b border-white/10">
                    <motion.a
                      href={item.href}
                      custom={i}
                      variants={itemVariants}
                      onClick={handleNavClick}
                      className="group flex items-baseline justify-between py-5 md:py-6"
                    >
                      {/* Number */}
                      <span className="text-xs text-white/30 font-mono w-8">{item.number}</span>

                      {/* Label — large serif */}
                      <span
                        className="flex-1 font-serif text-5xl md:text-7xl lg:text-8xl text-white leading-none
                                   transition-all duration-500 group-hover:translate-x-3 group-hover:text-white/80"
                      >
                        {item.label}
                      </span>

                      {/* Arrow — appears on hover */}
                      <motion.span
                        className="text-white/0 text-2xl group-hover:text-white/60 transition-colors duration-300"
                        aria-hidden="true"
                      >
                        ↗
                      </motion.span>
                    </motion.a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Bottom footer strip */}
            <motion.div
              custom={socialItems.length}
              variants={socialVariants}
              className="flex items-center justify-between text-xs text-white/30 font-mono"
            >
              <span>maheshppai-v1.netlify.app</span>
              <span>Full Stack Developer · React · TypeScript</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
