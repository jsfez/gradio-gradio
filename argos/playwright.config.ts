import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

/**
 * Argos visual testing on the Gradio Storybook.
 *
 * The captured surface is the static Storybook build produced by
 * `pnpm build-storybook`, which is the very artifact the current
 * `storybook-build` / `storybook-deploy` workflows upload for review.
 */
const PORT = 6103;
const STATIC_DIR = fileURLToPath(
	new URL("../storybook-static", import.meta.url)
);

const isCI = Boolean(process.env.CI);

export default defineConfig({
	testDir: fileURLToPath(new URL(".", import.meta.url)),
	fullyParallel: true,
	forbidOnly: isCI,
	// One worker on CI: the audio player and a couple of markdown stories are
	// sensitive to how much CPU the runner has left, and a capture taken under
	// contention is the one thing a visual review must not produce.
	workers: isCI ? 1 : undefined,
	timeout: 120_000,
	expect: { timeout: 15_000 },
	reporter: isCI
		? [["list"], ["@argos-ci/playwright/reporter", { uploadToArgos: true }]]
		: [["list"]],
	use: {
		...devices["Desktop Chrome"],
		baseURL: `http://localhost:${PORT}`,
		// Chromatic's default viewport width, used for the stories that do not
		// declare `chromatic.modes`.
		viewport: { width: 1200, height: 800 },
		colorScheme: "light",
		// Subpixel antialiasing makes screenshots depend on the host; these flags
		// keep local and CI renders comparable.
		launchOptions: {
			args: ["--disable-lcd-text", "--font-render-hinting=none"]
		}
	},
	webServer: {
		// A static server that keeps the exact path: `serve` and friends turn
		// `/iframe.html` into a redirect, and Storybook then never boots.
		command: `python3 -m http.server ${PORT} --directory ${STATIC_DIR}`,
		url: `http://localhost:${PORT}/iframe.html`,
		reuseExistingServer: !isCI,
		timeout: 120_000
	}
});
