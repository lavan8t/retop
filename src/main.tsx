import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardApp } from "./pages/app";
import "./input.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DashboardApp />
    </React.StrictMode>,
  );
} else {
  console.error("Failed to find the root element in index.html");
}
