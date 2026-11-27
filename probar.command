#!/bin/zsh
# Doble clic para probar la app en el Mac. Cierra la ventana para pararla.
export PATH="$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")" && npm run dev -- --open
