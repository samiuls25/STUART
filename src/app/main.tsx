import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ".././styles/index.css";

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
