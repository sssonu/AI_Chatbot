#!/bin/bash

# Subspace Chatbot - Quick Start Script
echo "🚀 Starting Subspace Chatbot Application..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the application..."
npm run build

# Start development server if requested
if [ "$1" == "dev" ]; then
    echo "🌐 Starting development server..."
    npm run dev
else
    echo "✅ Build completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up your Nhost project"
    echo "2. Configure your .env file"
    echo "3. Deploy to Netlify"
    echo ""
    echo "📚 See DEPLOYMENT.md for detailed instructions"
fi
