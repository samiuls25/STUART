import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ".././styles/index.css";

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

const initializeTheme = () => {
	const savedTheme = localStorage.getItem("theme");
	if (savedTheme === "dark") {
		document.documentElement.classList.add("dark");
		return;
	}

	if (savedTheme === "light") {
		document.documentElement.classList.remove("dark");
		return;
	}

	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	if (prefersDark) {
		document.documentElement.classList.add("dark");
	} else {
		document.documentElement.classList.remove("dark");
	}
};

initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
