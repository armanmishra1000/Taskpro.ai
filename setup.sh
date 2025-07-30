#!/bin/bash

# TaskPro.ai Setup Script
# This script automates the entire project setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════╗
║                                        ║
║        TaskPro.ai Setup Wizard         ║
║    Telegram Task Management Bot        ║
║                                        ║
╚════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Function to print colored messages
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check prerequisites
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        echo "Please install Node.js 16+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version must be 16 or higher (current: $(node -v))"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed!"
        exit 1
    fi
    print_success "npm $(npm -v) detected"
    
    # Check MongoDB
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed locally"
        echo "You can:"
        echo "  1. Install MongoDB locally: https://www.mongodb.com/docs/manual/installation/"
        echo "  2. Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "MongoDB detected"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed!"
        exit 1
    fi
    print_success "Git detected"
}

# Create project structure
create_structure() {
    print_step "Creating project structure..."
    
    # Create directories
    mkdir -p backend/src/{bot/{commands,callbacks,formatters,constants,utils},models,services,config,middleware}
    mkdir -p backend/{tests/{bot,services},scripts}
    mkdir -p shared/contracts/{models,services}
    mkdir -p docs/{features,api}
    mkdir -p tools
    mkdir -p postman
    
    print_success "Project structure created"
}

# Setup environment
setup_environment() {
    print_step "Setting up environment..."
    
    # Copy .env.example to .env
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env file"
    else
        print_warning ".env.example not found, creating new .env"
        cat > .env << EOF
# Telegram Bot
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username

# MongoDB
MONGODB_URI=mongodb://localhost:27017/taskpro-ai

# Environment
NODE_ENV=development
PORT=3000

# Bot Settings
TIMEZONE=America/New_York
STANDUP_TIME=08:30
DIGEST_TIME=22:00

# Test Bot (optional)
TEST_BOT_TOKEN=your_test_bot_token_here
EOF
        print_success "Created .env file with defaults"
    fi
    
    print_warning "Please update .env with your bot token!"
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    cd backend
    npm install
    cd ..
    
    print_success "Dependencies installed"
}

# Setup Git hooks
setup_git_hooks() {
    print_step "Setting up Git hooks..."
    
    cd backend
    npx husky install
    npx husky add .husky/pre-commit "cd backend && npm run precommit"
    npx husky add .husky/pre-push "cd backend && npm run prepush"
    cd ..
    
    print_success "Git hooks configured"
}

# Create initial files
create_initial_files() {
    print_step "Creating initial configuration files..."
    
    # Create error utility if not exists
    if [ ! -f "backend/src/utils/errors.js" ]; then
        cat > backend/src/utils/errors.js << 'EOF'
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

module.exports = {
  ValidationError,
  AuthError
};
EOF
    fi
    
    # Create test setup if not exists
    if [ ! -f "backend/tests/setup.js" ]; then
        cat > backend/tests/setup.js << 'EOF'
// Global test setup
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test-token';

// Mock console.error in tests
global.console.error = jest.fn();

// Set test timeout
jest.setTimeout(10000);
EOF
    fi
    
    print_success "Initial files created"
}

# Setup database initialization script
create_db_scripts() {
    print_step "Creating database scripts..."
    
    # Create init-db.js
    cat > backend/scripts/init-db.js << 'EOF'
const mongoose = require('mongoose');
require('dotenv').config();

async function initDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database initialized');
    
    // Create indexes
    const db = mongoose.connection.db;
    await db.collection('users').createIndex({ telegramId: 1 }, { unique: true });
    await db.collection('tasks').createIndex({ createdBy: 1, status: 1 });
    await db.collection('tasks').createIndex({ assignedTo: 1, deadline: 1 });
    
    console.log('✅ Indexes created');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDB();
EOF
    
    print_success "Database scripts created"
}

# Interactive bot setup
setup_bot() {
    print_step "Setting up Telegram bot..."
    
    echo -e "\n${YELLOW}To create a Telegram bot:${NC}"
    echo "1. Open Telegram and search for @BotFather"
    echo "2. Send /newbot"
    echo "3. Choose a name for your bot"
    echo "4. Choose a username (must end with 'bot')"
    echo "5. Copy the token you receive"
    echo
    
    read -p "Enter your bot token (or press Enter to skip): " BOT_TOKEN
    
    if [ ! -z "$BOT_TOKEN" ]; then
        # Update .env file
        sed -i.bak "s/BOT_TOKEN=.*/BOT_TOKEN=$BOT_TOKEN/" .env
        print_success "Bot token saved to .env"
        
        # Ask for bot username
        read -p "Enter your bot username: " BOT_USERNAME
        if [ ! -z "$BOT_USERNAME" ]; then
            sed -i.bak "s/BOT_USERNAME=.*/BOT_USERNAME=$BOT_USERNAME/" .env
        fi
    else
        print_warning "Bot token skipped - remember to add it to .env later!"
    fi
}

# Create first feature
create_first_feature() {
    print_step "Creating your first feature..."
    
    echo -e "\n${YELLOW}Would you like to create your first feature now?${NC}"
    read -p "Create 'task-creation' feature? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd backend
        npm run generate:feature
        cd ..
        print_success "First feature scaffolded!"
    fi
}

# Final summary
show_summary() {
    echo -e "\n${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✨ Setup Complete! ✨${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}\n"
    
    echo -e "${BLUE}📁 Project Structure:${NC}"
    echo "   ├── backend/      - Bot code"
    echo "   ├── shared/       - Contracts"
    echo "   ├── docs/         - Documentation"
    echo "   └── tools/        - Dev tools"
    echo
    
    echo -e "${BLUE}🚀 Quick Start Commands:${NC}"
    echo "   npm run dev              - Start bot in dev mode"
    echo "   npm run generate:feature - Create new feature"
    echo "   npm run validate:all     - Run all validations"
    echo "   npm run test            - Run tests"
    echo
    
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "   1. Update .env with your bot token (if not done)"
    echo "   2. Start MongoDB: mongod"
    echo "   3. Initialize database: cd backend && npm run db:init"
    echo "   4. Start the bot: cd backend && npm run dev"
    echo "   5. Message your bot on Telegram!"
    echo
    
    if [ -z "$BOT_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Don't forget to add your bot token to .env!${NC}"
    fi
    
    echo -e "\n${GREEN}Happy coding! 🎉${NC}\n"
}

# Main execution
main() {
    check_requirements
    create_structure
    setup_environment
    install_dependencies
    setup_git_hooks
    create_initial_files
    create_db_scripts
    setup_bot
    create_first_feature
    show_summary
}

# Run main function
main 