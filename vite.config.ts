import { defineConfig } from 'vite';
import { reactRouter } from "@react-router/dev/vite";
import fs from 'node:fs';
import path from 'node:path';

// Every bare module specifier imported anywhere under src/, so Vite can
// pre-bundle the lot in one cold-start pass. Anything left out gets discovered
// lazily mid-load, which forces a re-optimize under a new browser hash and a
// full-page reload -- and the reloading page can end up holding two generations
// of react/react-dom at once. Two React copies means the dispatcher react-dom
// sets is not the one hooks read, surfacing as "Invalid hook call" /
// "null is not an object (evaluating 'dispatcher.useContext')" from <Meta>.
const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

// Owned by the React Router plugin's own optimizeDeps.include -- listing them
// again here is redundant and risks fighting its dedupe/resolve handling.
const PLUGIN_OWNED = new Set([
  'react', 'react/jsx-runtime', 'react/jsx-dev-runtime',
  'react-dom', 'react-dom/client',
  'react-router', 'react-router/dom', 'react-router-dom',
]);

// Build-time/test-only packages that never reach the browser bundle. Feeding
// these to optimizeDeps makes Vite try (and fail) to pre-bundle them.
const NOT_BROWSER_DEPS = ['@react-router/dev', 'vitest', 'vite'];

function packageNameOf(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

// Types-only packages (e.g. @graphql-typed-document-node/core, which ships
// `"main": ""`) are imported purely for TS types and have no runtime entry.
// Handing one to optimizeDeps.include fails the dev server outright with
// "Failed to resolve entry for package", so require a real entry point.
const runtimeEntryCache = new Map<string, boolean>();

function hasRuntimeEntry(rootDir: string, pkgName: string): boolean {
  const cached = runtimeEntryCache.get(pkgName);
  if (cached !== undefined) return cached;

  let result = false;
  try {
    const pkgDir = path.join(rootDir, 'node_modules', pkgName);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
    );
    result =
      manifest.exports != null ||
      Boolean(manifest.module) ||
      Boolean(manifest.browser) ||
      Boolean(manifest.main) ||
      fs.existsSync(path.join(pkgDir, 'index.js'));
  } catch {
    result = false;
  }

  runtimeEntryCache.set(pkgName, result);
  return result;
}

function findBareImports(srcDir: string, rootDir: string): string[] {
  const found = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        /\.(t|j)sx?$/.test(entry.name) &&
        // Tests never ship to the browser; scanning them pulls in vitest etc.
        !/\.(test|spec)\.(t|j)sx?$/.test(entry.name)
      ) {
        const code = fs.readFileSync(full, 'utf8');
        for (const pattern of SPECIFIER_PATTERNS) {
          for (const [, spec] of code.matchAll(pattern)) {
            // Bare specifiers only: skip relative, absolute, virtual, builtin.
            if (/^[./]/.test(spec)) continue;
            if (/^(node:|virtual:|\0)/.test(spec)) continue;
            // A stray trailing slash ('@mui/icons-material/') resolves for the
            // bundler but not as an optimizeDeps entry.
            if (spec.endsWith('/')) continue;
            if (/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp)$/.test(spec)) continue;
            if (PLUGIN_OWNED.has(spec)) continue;
            if (NOT_BROWSER_DEPS.includes(packageNameOf(spec))) continue;
            // Only keep specifiers backed by an installed package that has a
            // real runtime entry, so a stale or type-only import cannot break
            // startup with "Failed to resolve entry for package".
            if (!hasRuntimeEntry(rootDir, packageNameOf(spec))) continue;
            found.add(spec);
          }
        }
      }
    }
  };

  try {
    walk(srcDir);
  } catch {
    // Non-fatal: worst case Vite falls back to discovering these at runtime.
  }
  return [...found].sort();
}

export default defineConfig(() => {
  return {
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    esbuild: {
      target: 'esnext',
    },
    plugins: [reactRouter()],
    server: {
      // Proxy /graphql to the backend so React Router v7's dev-mode request
      // handler (which intercepts relative-URL POSTs as form actions) never
      // sees GraphQL requests.  Matches VITE_BACKEND=/graphql in .env.
      proxy: {
        '/graphql': {
          target: `http://localhost:${process.env.BACKEND_PORT ?? 5100}`,
          changeOrigin: true,
        },
        '/api': {
          target: `http://localhost:${process.env.BACKEND_PORT ?? 5100}`,
          changeOrigin: true,
        },
      },
    },
    define: {
      'global': 'globalThis',
      'process.env': {},
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        buffer: 'buffer',
      },
    },
    optimizeDeps: {
      // Pre-bundle every deep subpath actually imported by src/, up front.
      //
      // Vite otherwise discovers these lazily, as each page that imports them
      // is first visited. Each discovery triggers a re-optimize under fresh
      // chunk hashes plus a full-page reload, which can leave the page holding
      // modules from two optimizer generations at once -- i.e. two copies of
      // React and react-router live simultaneously. That surfaces as
      // "Invalid hook call" / "null is not an object (evaluating
      // 'dispatcher.useContext')" thrown from react-router's <Meta>.
      //
      // Derived from src/ on every config load, so it stays correct as imports
      // are added or removed -- nothing to maintain by hand.
      include: findBareImports(
        path.resolve(process.cwd(), 'src'),
        process.cwd(),
      ),
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});
