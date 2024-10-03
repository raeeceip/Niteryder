#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check for required environment variables
check_env_var() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}Error: Environment variable $1 is not set.${NC}"
        exit 1
    fi
}

echo "Checking prerequisites for NightRidyder..."

# Check for Node.js
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
if [ "$(printf '%s\n' "14.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "14.0.0" ]; then
    echo -e "${RED}Error: Node.js version 14.0.0 or higher is required. Current version: $NODE_VERSION${NC}"
    exit 1
fi

# Check for npm
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

# Check for Harper CLI
if ! command_exists harper-cli; then
    echo -e "${RED}Error: Harper CLI is not installed. Installing Harper CLI...${NC}"
    npm install -g @harper-cli/harper-cli
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Harper CLI. Please install it manually and try again.${NC}"
        exit 1
    fi
fi

# Check for required environment variables
required_vars=(
    "GITHUB_APP_ID"
    "GITHUB_PRIVATE_KEY"
    "GITHUB_INSTALLATION_ID"
    "SENTRY_DSN"
    "SENTRY_TOKEN"
    "SENTRY_ORG"
    "MAIN_REPO_OWNER"
    "MAIN_REPO_NAME"
)

for var in "${required_vars[@]}"; do
    check_env_var "$var"
done

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found. Please create a .env file with the required environment variables.${NC}"
    exit 1
fi

# Install project dependencies
echo "Installing project dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install project dependencies. Please check your internet connection and try again.${NC}"
    exit 1
fi

# Build the project
echo "Building the project..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build the project. Please check for any compilation errors and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites are met. Starting NightRidyder...${NC}"

# Run the application
npm start