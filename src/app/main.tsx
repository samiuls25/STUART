import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ".././styles/index.css";
import { initializeDocumentTheme } from "../lib/themePreference";

// Silence dev-only diagnostic logs in production builds while keeping warn/error
// intact. Allows authors to keep verbose console.log/debug/info statements during
// development without exposing them to end users in shipped bundles.
if (import.meta.env.PROD) {
	const noop = () => {};
	// eslint-disable-next-line no-console
	console.log = noop;
	// eslint-disable-next-line no-console
	console.debug = noop;
	// eslint-disable-next-line no-console
	console.info = noop;
}

initializeDocumentTheme();

createRoot(document.getElementById("root")!).render(<App />);
