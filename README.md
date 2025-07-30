# TaskPro.ai 🚀

> A sophisticated Telegram Task Management Bot using Elon Musk's delegation principles with AI-powered validation and automated development workflow.

[![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 🎯 Overview

TaskPro.ai is not just a task management bot - it's a complete development ecosystem that:
- **Enforces** Elon Musk's delegation principles (clear goals, metrics, deadlines, single owner)
- **Automates** feature development with AI-powered generators
- **Validates** code quality with contract-based architecture
- **Accelerates** development by 3-5x with smart tooling

## 🌟 Key Features

### For Users
- **Natural Language Task Creation** - Voice or text input with AI parsing
- **Smart Validation** - Ensures every task has goal, metric, deadline, and owner
- **Team Management** - Easy team member addition and task assignment
- **Status Tracking** - Visual task cards with progress indicators
- **Blocker Management** - Structured escalation with manager alerts
- **Daily Standups** - Automated morning check-ins
- **Manager Dashboard** - Real-time team overview

### For Developers
- **🤖 Feature Generator** - Creates entire feature structure in seconds
- **📋 Contract System** - Enforces consistent naming and structure
- **✅ Auto-validation** - Catches errors before they happen
- **🧪 Test Framework** - Automated testing with mocks
- **📊 Metrics Dashboard** - Track development progress
- **🔄 State Machines** - Predictable bot flows

## 🚀 Quick Start

### One-Command Setup
```bash
# Clone and setup everything
git clone https://github.com/yourusername/taskpro-ai.git
cd taskpro-ai
chmod +x setup.sh
./setup.sh
```

The setup wizard will:
- ✅ Check system requirements
- ✅ Create project structure
- ✅ Install dependencies
- ✅ Configure environment
- ✅ Setup Git hooks
- ✅ Create your first feature
- ✅ Guide you through bot creation

### Manual Setup
```bash
# Install dependencies
cd backend && npm install

# Copy environment file
cp .env.example .env

# Add your bot token to .env
# BOT_TOKEN=your_token_here

# Initialize database
npm run db:init

# Start development
npm run dev
```

## 🛠️ Development Workflow

### 1. Generate New Feature
```bash
npm run generate:feature
```

This interactive tool will:
- Ask for feature details
- Create all documentation files
- Generate boilerplate code
- Setup Git branch
- Create test files
- Update project progress

### 2. Validate Your Code
```bash
# Check contract compliance
npm run validate:contracts

# Auto-fix violations
npm run validate:contracts:fix

# Run all validations
npm run validate:all
```

### 3. Test Your Feature
```bash
# Run all tests
npm test

# Run specific feature tests
npm run test:feature -- task-creation

# Watch mode
npm run test:watch
```

### 4. Interactive Development
```bash
# Start with live reload and debugging
npm run dev:interactive

# Test commands in playground
npm run playground

# View metrics dashboard
npm run metrics
```

## 📁 Project Structure

```
TaskPro.ai/
├── backend/                 # Main application
│   ├── src/
│   │   ├── bot/            # Telegram bot logic
│   │   │   ├── commands/   # Command handlers
│   │   │   ├── callbacks/  # Button handlers
│   │   │   ├── formatters/ # Message formatting
│   │   │   └── utils/      # Bot utilities
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── config/         # Configuration
│   └── tests/              # Test files
├── shared/
│   └── contracts/          # Field naming contracts
│       ├── models/         # Model contracts
│       └── services/       # Service contracts
├── docs/
│   ├── features/           # Feature documentation
│   └── *.md               # Project guides
├── tools/                  # Development tools
│   ├── feature-generator.js
│   ├── validate-contracts.js
│   └── ...
└── setup.sh               # One-click setup
```

## 🔧 Available Commands

### Development
```bash
npm run dev              # Start bot in development mode
npm run dev:interactive  # Start with enhanced debugging
npm run bot:test        # Start with test bot token
npm run bot:prod        # Start in production mode
```

### Feature Development
```bash
npm run generate:feature    # Create new feature
npm run validate:contracts  # Check contract compliance
npm run validate:all       # Run all validations
```

### Testing
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:feature    # Test specific features
```

### Database
```bash
npm run db:init         # Initialize database
npm run db:seed         # Seed test data
npm run db:reset        # Reset database
```

### Utilities
```bash
npm run playground      # Interactive command testing
npm run metrics        # View development metrics
npm run analyze:performance  # Performance analysis
```

## 🏗️ Architecture

### Contract System
Every field name is defined in contracts to ensure consistency:

```javascript
// shared/contracts/models/task.contract.js
module.exports = {
  TaskContract: {
    title: 'String',          // NOT task_name or taskName
    deadline: 'Date',         // NOT due_date or dueDate
    assignedTo: 'ObjectId',   // NOT assigned_to or assignee
    // ... etc
  }
};
```

### State Machines
Bot flows are managed by XState for predictability:

```javascript
// Task creation flow
idle → collectingDescription → validating → collectingDeadline → done
```

### Validation Layers
1. **Contract Validation** - Field naming
2. **Type Validation** - JSDoc types
3. **Business Validation** - Elon Musk principles
4. **Runtime Validation** - Joi schemas

## 🚨 Error Prevention

### Pre-commit Hooks
Automatically runs:
- Contract validation
- Linting
- Unit tests

### Type Safety
```javascript
/**
 * @param {TaskContract} taskData 
 * @returns {Promise<Task>}
 * @throws {ValidationError}
 */
async function createTask(taskData) {
  // Full type checking
}
```

### Auto-recovery
- Automatic error logging
- Suggested fixes
- Rollback on failure

## 📊 Development Metrics

The metrics dashboard shows:
- Features completed
- Average time per task
- Contract violations
- Test coverage
- Error rate

## 🤝 Contributing

1. Run `npm run generate:feature` to create new features
2. Follow the generated task prompts
3. Ensure all tests pass
4. Contract validation must pass
5. Submit PR with feature branch

## 📚 Documentation

- [Project Setup Guide](Project-Setup-Guide.md)
- [Feature Development](Universal-Feature-Development-Prompt.md)
- [Features List](Features-Lists.md)
- [Development Improvements](Development-Improvements.md)

## 🐛 Troubleshooting

### Bot not responding
```bash
# Check bot token
cat .env | grep BOT_TOKEN

# Test connection
npm run bot:test

# Check logs
tail -f logs/bot.log
```

### Contract violations
```bash
# Auto-fix common issues
npm run validate:contracts:fix

# Manual check
npm run validate:contracts
```

### Database issues
```bash
# Reset and reinitialize
npm run db:reset
npm run db:init
```

## 🎯 Roadmap

- [x] Core bot functionality
- [x] Feature generator
- [x] Contract validation
- [x] Automated testing
- [ ] Web dashboard
- [ ] AI task suggestions
- [ ] Integration hub
- [ ] Mobile app

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Inspired by Elon Musk's delegation principles
- Built with [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- State management by [XState](https://xstate.js.org/)

---

<div align="center">
  <b>Built with ❤️ for efficient task management</b>
  <br>
  <i>Making delegation as simple as sending a message</i>
</div> 