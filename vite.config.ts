import { defineConfig } from 'vite';
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
    },
    plugins: [reactRouter()],
  };
});
