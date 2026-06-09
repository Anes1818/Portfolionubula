import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactLenis } from "lenis/react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// ─── Lazy-load the heavy WebGL splash cursor ────────────────────────────────
// SplashCursor is 44 KB of WebGL shader code — never block the initial paint.
// React.lazy defers its parse + eval until after first render.
const SplashCursor = lazy(() => import("@/components/SplashCursor"));

// ─── QueryClient ─────────────────────────────────────────────────────────────
// Defined OUTSIDE the component so it is created exactly once across the
// app lifetime. Inside the component it would be recreated on every render.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 min — avoids redundant refetches
      retry: 1,               // one retry on failure is enough
    },
  },
});

// ─── Lenis options ───────────────────────────────────────────────────────────
const lenisOptions = {
  duration: 1.4,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  // Prevent Lenis from fighting BrowserRouter's scroll restoration
  prevent: (node: Element) => node.id === "modal-root",
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ReactLenis root options={lenisOptions}>
      <TooltipProvider>
        {/* Single toast provider — Sonner is the modern choice */}
        <Toaster position="bottom-right" richColors />

        {/* SplashCursor loads after paint — zero impact on LCP */}
        <Suspense fallback={null}>
          <SplashCursor
            DYE_RESOLUTION={512}      // was 1440 — too expensive on mobile
            DENSITY_DISSIPATION={3.5}
            VELOCITY_DISSIPATION={2}
            TRANSPARENT={true}
          />
        </Suspense>

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ReactLenis>
  </QueryClientProvider>
);

export default App;
