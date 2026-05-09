#!/bin/bash
#
# This script automates the process of setting up and running the development environment.
# It ensures all dependencies are installed before starting the Vite dev server.

# Exit immediately if a command exits with a non-zero status.
set -e

# Navigate to the script's directory to ensure commands are run in the project root.
cd "$(dirname "$0")"

echo "--- Installing/updating dependencies... ---"
npm install

echo "--- Starting the development server... ---"
npm run dev