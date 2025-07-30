#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { execSync } = require('child_process');

class FeatureGenerator {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.featureName = '';
    this.featureType = '';
    this.command = '';
  }

  async run() {
    console.log(chalk.blue.bold('\n🚀 TaskPro.ai Feature Generator\n'));
    
    try {
      // Get feature details
      await this.promptFeatureDetails();
      
      // Create all necessary files
      await this.createMemoryFiles();
      await this.createDocumentationFiles();
      await this.createTaskPrompts();
      await this.createBoilerplateCode();
      
      // Setup git branch
      await this.setupGitBranch();
      
      // Update project progress
      await this.updateProjectProgress();
      
      // Show success message
      this.showSuccessMessage();
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  }

  async promptFeatureDetails() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'featureName',
        message: 'Feature name (e.g., task-creation):',
        validate: input => /^[a-z-]+$/.test(input) || 'Use lowercase and hyphens only'
      },
      {
        type: 'list',
        name: 'featureType',
        message: 'Feature type:',
        choices: ['core', 'smart', 'intelligence', 'advanced']
      },
      {
        type: 'input',
        name: 'command',
        message: 'Bot command (e.g., newtask):',
        validate: input => /^[a-z]+$/.test(input) || 'Use lowercase letters only'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Feature description:',
        validate: input => input.length > 10 || 'Please provide a meaningful description'
      }
    ]);

    this.featureName = answers.featureName;
    this.featureType = answers.featureType;
    this.command = answers.command;
    this.description = answers.description;
  }

  async createMemoryFiles() {
    console.log(chalk.yellow('\n📁 Creating memory files...'));
    
    const memoryDir = path.join(this.rootDir, 'docs', 'features', this.featureName);
    await fs.ensureDir(memoryDir);

    // CURRENT-STATE.md
    await fs.writeFile(
      path.join(memoryDir, 'CURRENT-STATE.md'),
      this.generateCurrentStateTemplate()
    );

    // BOT-INTERACTIONS.md
    await fs.writeFile(
      path.join(memoryDir, 'BOT-INTERACTIONS.md'),
      this.generateBotInteractionsTemplate()
    );

    // TASK-LIST.md
    await fs.writeFile(
      path.join(memoryDir, 'TASK-LIST.md'),
      this.generateTaskListTemplate()
    );

    // PROBLEMS-LOG.md
    await fs.writeFile(
      path.join(memoryDir, 'PROBLEMS-LOG.md'),
      this.generateProblemsLogTemplate()
    );

    console.log(chalk.green('✅ Memory files created'));
  }

  async createDocumentationFiles() {
    console.log(chalk.yellow('\n📝 Creating documentation files...'));
    
    const docsDir = path.join(this.rootDir, 'docs', 'features', this.featureName);

    // spec.md
    await fs.writeFile(
      path.join(docsDir, 'spec.md'),
      this.generateSpecTemplate()
    );

    // messages.md
    await fs.writeFile(
      path.join(docsDir, 'messages.md'),
      this.generateMessagesTemplate()
    );

    // tasks.md
    await fs.writeFile(
      path.join(docsDir, 'tasks.md'),
      this.generateTasksTemplate()
    );

    // task-prompts.md
    await fs.writeFile(
      path.join(docsDir, 'task-prompts.md'),
      this.generateTaskPromptsTemplate()
    );

    console.log(chalk.green('✅ Documentation files created'));
  }

  async createBoilerplateCode() {
    console.log(chalk.yellow('\n💻 Creating boilerplate code...'));

    // Command handler
    const commandPath = path.join(this.rootDir, 'backend', 'src', 'bot', 'commands', `${this.command}.command.js`);
    await fs.ensureDir(path.dirname(commandPath));
    await fs.writeFile(commandPath, this.generateCommandHandler());

    // Callback handler
    const callbackPath = path.join(this.rootDir, 'backend', 'src', 'bot', 'callbacks', `${this.featureName}.callbacks.js`);
    await fs.ensureDir(path.dirname(callbackPath));
    await fs.writeFile(callbackPath, this.generateCallbackHandler());

    // Service
    const servicePath = path.join(this.rootDir, 'backend', 'src', 'services', this.featureName, `${this.featureName}.service.js`);
    await fs.ensureDir(path.dirname(servicePath));
    await fs.writeFile(servicePath, this.generateService());

    // Formatter
    const formatterPath = path.join(this.rootDir, 'backend', 'src', 'bot', 'formatters', `${this.featureName}.formatter.js`);
    await fs.ensureDir(path.dirname(formatterPath));
    await fs.writeFile(formatterPath, this.generateFormatter());

    // Test file
    const testPath = path.join(this.rootDir, 'backend', 'tests', 'bot', `${this.featureName}.test.js`);
    await fs.ensureDir(path.dirname(testPath));
    await fs.writeFile(testPath, this.generateTestFile());

    console.log(chalk.green('✅ Boilerplate code created'));
  }

  async setupGitBranch() {
    console.log(chalk.yellow('\n🌿 Setting up git branch...'));
    
    try {
      execSync(`git checkout -b feature/${this.featureName}`, { cwd: this.rootDir });
      execSync('git add .', { cwd: this.rootDir });
      execSync(`git commit -m "feat(${this.featureName}): initialize feature structure"`, { cwd: this.rootDir });
      console.log(chalk.green('✅ Git branch created and files committed'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Git operations skipped (may already exist)'));
    }
  }

  async updateProjectProgress() {
    console.log(chalk.yellow('\n📊 Updating project progress...'));
    
    const progressPath = path.join(this.rootDir, 'docs', 'project-progress.md');
    let content = await fs.readFile(progressPath, 'utf-8');
    
    const activeSection = content.indexOf('## Active Features');
    if (activeSection !== -1) {
      const insertion = `\n- 🚧 ${this.capitalizeFeature()} (/${this.command})`;
      content = content.slice(0, activeSection + 18) + insertion + content.slice(activeSection + 18);
      await fs.writeFile(progressPath, content);
    }
    
    console.log(chalk.green('✅ Project progress updated'));
  }

  // Template generation methods
  generateCurrentStateTemplate() {
    return `# ${this.capitalizeFeature()} Current State

## Last Updated: ${new Date().toISOString()}

## What Exists Now:
- Command handler: \`${this.command}.command.js\`
- Callback handlers: \`${this.featureName}.callbacks.js\`
- Service layer: \`${this.featureName}.service.js\`
- Message formatter: \`${this.featureName}.formatter.js\`
- Test file: \`${this.featureName}.test.js\`

## Bot Commands:
- \`/${this.command}\` - ${this.description}

## Inline Keyboards:
<!-- Will be updated as keyboards are created -->

## Database Models Used:
<!-- Will be updated based on requirements -->

## Next Task: B1 - Database Models

## Git Status:
- Branch: \`feature/${this.featureName}\`
- Initial commit created
`;
  }

  generateBotInteractionsTemplate() {
    return `# ${this.capitalizeFeature()} Bot Interactions

## User Flow:
1. User types \`/${this.command}\`
2. Bot responds with welcome message
3. [Flow to be defined]

## Messages:
### Command: /${this.command}
**Bot Response:**
\`\`\`
${this.description}

[Initial message to be defined]
\`\`\`

**Keyboard:**
\`\`\`javascript
{
  inline_keyboard: [
    [{ text: "🆕 Start", callback_data: "${this.featureName}_start" }],
    [{ text: "❌ Cancel", callback_data: "${this.featureName}_cancel" }]
  ]
}
\`\`\`

## Callback Handlers:
- \`${this.featureName}_start\`: Begins the process
- \`${this.featureName}_cancel\`: Cancels and returns to main menu
`;
  }

  generateTaskListTemplate() {
    return `# ${this.capitalizeFeature()} Task List

## Backend Tasks:
- [ ] B1: Create/Update Database Models
- [ ] B2: Create Bot Command Handler ✅ (Boilerplate created)
- [ ] B3: Create Callback Query Handlers ✅ (Boilerplate created)
- [ ] B4: Create Service Layer ✅ (Boilerplate created)
- [ ] B5: Create Message Formatters ✅ (Boilerplate created)
- [ ] B6: Integration Tests ✅ (Boilerplate created)

## Current Task: B1 - Implement business logic in created files

## Notes:
- Boilerplate files have been created
- Need to implement actual logic based on feature requirements
- Follow Elon Musk delegation principles
`;
  }

  generateProblemsLogTemplate() {
    return `# ${this.capitalizeFeature()} Problems Log

## Format:
\`\`\`
Date: [date]
Task: [task]
Error: [exact error message]
Cause: [why it happened]
Fix: [how fixed]
Prevention: [avoid in future]
\`\`\`

## Entries:
<!-- Problems will be logged here as they occur -->
`;
  }

  generateSpecTemplate() {
    return `# ${this.capitalizeFeature()} Specification

## Overview
${this.description}

## Elon Musk Principles Applied
- Clear goal definition required
- Measurable success metrics
- Specific deadlines
- Single accountable person

## User Flow
1. User types \`/${this.command}\`
2. [Define specific flow]

## Bot Commands
- \`/${this.command}\` - ${this.description}

## Database Requirements
- [To be determined based on feature needs]

## Message Templates
- Welcome: "[Define welcome message]"
- Error: "[Define error messages]"
- Success: "[Define success message]"

## Validation Rules
- [Define validation rules]
`;
  }

  generateMessagesTemplate() {
    return `# ${this.capitalizeFeature()} Bot Messages

## Command: /${this.command}

### Initial Message
\`\`\`
🎯 ${this.capitalizeFeature()}

${this.description}

How can I help you?
\`\`\`

### Validation Messages
**Missing Information:**
\`\`\`
❓ I need more details:
[Specific request]

Example: "[Provide example]"
\`\`\`

### Success Messages
**Operation Complete:**
\`\`\`
✅ Success!

[Success details]

What would you like to do next?
\`\`\`

## Error Messages
**Invalid Input:**
\`\`\`
❌ I couldn't understand that.
Please try again or type /help
\`\`\`
`;
  }

  generateCommandHandler() {
    return `const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../utils/keyboard');

module.exports = {
  command: '${this.command}',
  description: '${this.description}',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // TODO: Implement command logic
      const keyboard = createInlineKeyboard([
        [{ text: '🆕 Start', callback_data: '${this.featureName}_start' }],
        [{ text: '❌ Cancel', callback_data: '${this.featureName}_cancel' }]
      ]);
      
      await bot.sendMessage(
        chatId,
        \`🎯 ${this.capitalizeFeature()}\\n\\n${this.description}\\n\\nHow can I help you?\`,
        { reply_markup: keyboard, parse_mode: 'Markdown' }
      );
      
    } catch (error) {
      console.error('Error in ${this.command} command:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  }
};
`;
  }

  generateCallbackHandler() {
    return `const handleStart = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    // TODO: Implement start logic
    await bot.editMessageText(
      'Starting ${this.featureName} process...',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  } catch (error) {
    console.error('Error in ${this.featureName} start:', error);
  }
};

const handleCancel = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  await bot.editMessageText(
    'Operation cancelled.',
    {
      chat_id: chatId,
      message_id: messageId
    }
  );
};

module.exports = {
  '${this.featureName}_start': handleStart,
  '${this.featureName}_cancel': handleCancel
};
`;
  }

  generateService() {
    return `const { ValidationError } = require('../../utils/errors');

class ${this.capitalizeFeature().replace(/-/g, '')}Service {
  async process(data) {
    // TODO: Implement validation
    this.validate(data);
    
    // TODO: Implement business logic
    
    return {
      success: true,
      message: 'Operation completed'
    };
  }
  
  validate(data) {
    // TODO: Implement validation rules
    // Follow Elon Musk principles:
    // - Must have clear goal
    // - Must have success metric
    // - Must have deadline
    // - Must have single owner
    
    if (!data) {
      throw new ValidationError('No data provided');
    }
  }
}

module.exports = new ${this.capitalizeFeature().replace(/-/g, '')}Service();
`;
  }

  generateFormatter() {
    return `const format${this.capitalizeFeature().replace(/-/g, '')}Card = (data) => {
  return \`📋 *${this.capitalizeFeature()}*

📝 Details: \${data.details || 'N/A'}
📅 Created: \${new Date().toLocaleDateString()}

_ID: #\${data.id || 'pending'}_\`;
};

const create${this.capitalizeFeature().replace(/-/g, '')}Keyboard = (status) => {
  return {
    inline_keyboard: [
      [
        { text: '✏️ Edit', callback_data: \`${this.featureName}_edit\` },
        { text: '🗑️ Delete', callback_data: \`${this.featureName}_delete\` }
      ],
      [
        { text: '↩️ Back', callback_data: \`${this.featureName}_back\` }
      ]
    ]
  };
};

module.exports = {
  format${this.capitalizeFeature().replace(/-/g, '')}Card,
  create${this.capitalizeFeature().replace(/-/g, '')}Keyboard
};
`;
  }

  generateTestFile() {
    return `describe('${this.capitalizeFeature()} Feature', () => {
  let bot;
  let msg;
  
  beforeEach(() => {
    // Setup test bot and message
    bot = {
      sendMessage: jest.fn(),
      editMessageText: jest.fn()
    };
    
    msg = {
      chat: { id: 123 },
      from: { id: 456 }
    };
  });
  
  describe('/${this.command} command', () => {
    test('should send welcome message with keyboard', async () => {
      const command = require('../../src/bot/commands/${this.command}.command');
      
      await command.handler(bot, msg);
      
      expect(bot.sendMessage).toHaveBeenCalled();
      expect(bot.sendMessage.mock.calls[0][1]).toContain('${this.capitalizeFeature()}');
      expect(bot.sendMessage.mock.calls[0][2]).toHaveProperty('reply_markup');
    });
  });
  
  describe('Callback handlers', () => {
    test('should handle start callback', async () => {
      const callbacks = require('../../src/bot/callbacks/${this.featureName}.callbacks');
      const query = {
        message: { chat: { id: 123 }, message_id: 789 }
      };
      
      await callbacks['${this.featureName}_start'](bot, query);
      
      expect(bot.editMessageText).toHaveBeenCalled();
    });
  });
});
`;
  }

  generateTaskPromptsTemplate() {
    // This will include all the task-specific prompts
    return `# Task Prompts for ${this.capitalizeFeature()}

## How to Use:
1. Copy each prompt exactly
2. Paste to AI
3. Report "done" or error
4. Move to next task

## Task B1: Database Models

**MANDATORY FIRST:**
1. Read \`docs/features/${this.featureName}/CURRENT-STATE.md\`
2. Read \`shared/contracts/models/\` - ALL model contracts
3. Read \`docs/features/${this.featureName}/spec.md\`
4. List what models this feature needs

**YOUR TASK:**
[Specific instructions for this feature's database needs]

## Task B2: Bot Command Handler

**MANDATORY FIRST:**
1. Read \`docs/features/${this.featureName}/CURRENT-STATE.md\`
2. Read \`docs/features/${this.featureName}/messages.md\`
3. Read \`docs/features/${this.featureName}/BOT-INTERACTIONS.md\`
4. Check existing command in \`backend/src/bot/commands/${this.command}.command.js\`

**YOUR TASK:**
Implement the command handler logic in the existing file.

[Continue with remaining tasks...]
`;
  }

  capitalizeFeature() {
    return this.featureName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  showSuccessMessage() {
    console.log(chalk.green.bold(`
✅ Feature "${this.featureName}" setup complete!

📁 Created Files:
  Memory System:
  - docs/features/${this.featureName}/CURRENT-STATE.md
  - docs/features/${this.featureName}/BOT-INTERACTIONS.md
  - docs/features/${this.featureName}/TASK-LIST.md
  - docs/features/${this.featureName}/PROBLEMS-LOG.md
  
  Documentation:
  - docs/features/${this.featureName}/spec.md
  - docs/features/${this.featureName}/messages.md
  - docs/features/${this.featureName}/tasks.md
  - docs/features/${this.featureName}/task-prompts.md
  
  Code:
  - backend/src/bot/commands/${this.command}.command.js
  - backend/src/bot/callbacks/${this.featureName}.callbacks.js
  - backend/src/services/${this.featureName}/${this.featureName}.service.js
  - backend/src/bot/formatters/${this.featureName}.formatter.js
  - backend/tests/bot/${this.featureName}.test.js

🌿 Git: Created branch feature/${this.featureName}

🚀 Next Steps:
1. Review generated files
2. Start with Task B1 (Database Models)
3. Copy prompts from task-prompts.md
4. Implement feature logic

💡 Quick Commands:
  Test bot: npm run dev
  Run tests: npm test ${this.featureName}
  Check progress: cat docs/features/${this.featureName}/CURRENT-STATE.md
`));
  }
}

// Run the generator
const generator = new FeatureGenerator();
generator.run().catch(console.error); 