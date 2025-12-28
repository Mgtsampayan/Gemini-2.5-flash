import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
        exclude: ["node_modules", ".next"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["node_modules", ".next", "**/*.d.ts"]
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./")
        }
    }
});
