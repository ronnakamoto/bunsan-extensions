#!/bin/bash

# Define the source file
SOURCE_FILE="./dist/near-mpc-accounts.js"

# Define the output directory
OUTPUT_DIR="./dist"

# Define the Node.js version
NODE_VERSION="node18"

# Define the targets
TARGETS=(
    "linux-x64"
    "macos-x64"
    "macos-arm64"
    "win-x64"
)

# Function to build for a specific target
build_target() {
    local target=$1
    local output_file="${OUTPUT_DIR}/near-mpc-accounts-${target}"

    # Add .exe extension for Windows
    if [[ $target == *"win"* ]]; then
        output_file="${output_file}.exe"
    fi

    echo "Building for ${target}..."
    pkg "${SOURCE_FILE}" -t "${NODE_VERSION}-${target}" --out-path "${output_file}"
}

# Main execution
main() {
    # Ensure the output directory exists
    mkdir -p "${OUTPUT_DIR}"

    # Build for each target
    for target in "${TARGETS[@]}"; do
        build_target "$target"
    done

    echo "Build complete. Binaries are in ${OUTPUT_DIR}"
}

# Run the main function
main
