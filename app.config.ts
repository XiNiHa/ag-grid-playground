import { defineConfig } from "@solidjs/start/config";
import { cjsInterop } from "vite-plugin-cjs-interop";
import relay from "vite-plugin-relay-lite";

export default defineConfig({
	vite: () => ({
		plugins: [relay(), cjsInterop({ dependencies: ["relay-runtime"] })],
	}),
});
