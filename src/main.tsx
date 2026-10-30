import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { markAppReady } from "./updater";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Nach dem ersten Rendern bestätigen, dass das aktive Web-Bundle funktioniert.
// Bleibt die Bestätigung aus, rollt das Live-Update-Plugin automatisch zurück.
void markAppReady().catch(() => {});
