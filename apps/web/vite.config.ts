import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const repository = env['GITHUB_REPOSITORY']?.split('/')[1];
  const base = env['VITE_BASE_PATH'] || (env['GITHUB_ACTIONS'] === 'true' && repository ? `/${repository}/` : '/');
  return {
    base,
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      css: true,
    },
  };
});
