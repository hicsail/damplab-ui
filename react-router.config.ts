import type { Config } from "@react-router/dev/config";

export default {
    appDirectory: "src",
    ssr: false,

    /**
     * React Router v8 future flags, opted into early.
     *
     * All five were verified against this app before enabling: production build
     * output is byte-identical (234 chunks, 9.6M), `npm run typecheck` is
     * unchanged, all 612 unit tests pass, and the dev server produces no new
     * console errors.
     *
     * Three of them are structurally no-ops here: this app declares no `loader`,
     * `action`, `clientLoader`, `clientAction` or `middleware` anywhere — React
     * Router is used purely as a client-side router, with all data going through
     * Apollo — and `ssr: false` means there is no server request handling at all.
     * That covers v8_middleware, v8_passThroughRequests and
     * v8_trailingSlashAwareDataRequests.
     *
     * The remaining two are build-level (route module splitting, Vite
     * Environment API) and produced no change in the emitted bundle.
     *
     * Keeping them on means the eventual v8 upgrade is a version bump rather
     * than a behavioural migration.
     */
    future: {
        v8_middleware: true,
        v8_splitRouteModules: true,
        v8_viteEnvironmentApi: true,
        v8_passThroughRequests: true,
        v8_trailingSlashAwareDataRequests: true,
    },
} satisfies Config;
