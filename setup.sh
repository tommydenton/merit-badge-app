#!/bin/bash

# Merit Badge Counselor Application - Setup Script
# This script helps automate the initial setup process

echo "========================================="
echo "Merit Badge Counselor Application Setup"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed successfully"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file with your database credentials:"
    echo "   - DB_HOST (usually 'localhost')"
    echo "   - DB_USER (your MySQL username)"
    echo "   - DB_PASSWORD (your MySQL password)"
    echo "   - DB_NAME (your database name)"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Ensure uploads directory exists
if [ ! -d "public/uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p public/uploads
    echo "✓ Uploads directory created"
else
    echo "✓ Uploads directory exists"
fi

# Set permissions on uploads directory
echo "🔒 Setting permissions on uploads directory..."
chmod 755 public/uploads
echo "✓ Permissions set"
echo ""

# Database setup instructions
echo "========================================="
echo "Next Steps - Database Setup"
echo "========================================="
echo ""
echo "1. Create a MySQL database:"
echo "   mysql -u root -p"
echo "   CREATE DATABASE merit_badge_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo ""
echo "2. Import the database schema:"
echo "   mysql -u your_username -p merit_badge_app < database/schema.sql"
echo ""
echo "3. Seed the merit badges data:"
echo "   mysql -u your_username -p merit_badge_app < database/seed_merit_badges.sql"
echo ""
echo "4. Update the .env file with your database credentials"
echo ""
echo "5. Start the application:"
echo "   npm start"
echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "For Namecheap deployment instructions, see:"
echo "NAMECHEAP_DEPLOYMENT.md"
echo ""
