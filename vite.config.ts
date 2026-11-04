import { defineConfig } from 'vite';
// Relative assets work under both username.github.io and /repository-name/.
export default defineConfig({ base: './', server: { host: '127.0.0.1', port: 5190, strictPort: true, watch: { usePolling: true, interval: 300 } } });
