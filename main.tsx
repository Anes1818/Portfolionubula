import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "lenis/dist/lenis.css";

/**
 * StrictMode added:
 * - Surfaces double-invoke bugs in dev
 * - Catches deprecated API usage early
 * - Zero cost in production (stripped at build)
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
