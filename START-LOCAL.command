#!/bin/zsh
cd -- "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  trial_node="$(command -v node)"
else
  trial_node="/Users/kelvinli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$trial_node" ]]; then
  echo 'Install Node.js 22 LTS or newer, then run npm install in this folder.'
  read '?Press Return to close.'
  exit 1
fi
echo 'Open http://127.0.0.1:5190 in your browser. Keep this terminal open.'
exec "$trial_node" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5190 --strictPort --open --configLoader runner
