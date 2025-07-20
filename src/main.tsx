import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.toggle('dark', savedTheme === 'dark');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
