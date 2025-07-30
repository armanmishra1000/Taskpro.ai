#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

class ContractValidator {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.errors = [];
    this.warnings = [];
    this.contractFields = new Map();
  }

  async run() {
    console.log(chalk.blue.bold('\n🔍 Contract Validator\n'));
    
    try {
      // Load all contracts
      await this.loadContracts();
      
      // Validate models
      await this.validateModels();
      
      // Validate services
      await this.validateServices();
      
      // Validate bot handlers
      await this.validateBotHandlers();
      
      // Show results
      this.showResults();
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  async loadContracts() {
    console.log(chalk.yellow('Loading contracts...'));
    
    const contractFiles = glob.sync(
      path.join(this.rootDir, 'shared/contracts/**/*.contract.js')
    );
    
    for (const file of contractFiles) {
      const contract = require(file);
      const contractName = path.basename(file, '.contract.js');
      
      // Extract field names from contract
      Object.entries(contract).forEach(([key, value]) => {
        if (typeof value === 'object') {
          this.contractFields.set(key, Object.keys(value));
        }
      });
    }
    
    console.log(chalk.green(`✅ Loaded ${this.contractFields.size} contracts\n`));
  }

  async validateModels() {
    console.log(chalk.yellow('Validating models...'));
    
    const modelFiles = glob.sync(
      path.join(this.rootDir, 'backend/src/models/**/*.model.js')
    );
    
    for (const file of modelFiles) {
      await this.validateModelFile(file);
    }
  }

  async validateModelFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const modelName = fileName.replace('.model.js', '');
    
    // Check for contract compliance
    const contractName = `${modelName.charAt(0).toUpperCase()}${modelName.slice(1)}Contract`;
    const expectedFields = this.contractFields.get(contractName) || [];
    
    // Common violations
    const violations = [
      // Wrong field naming
      { pattern: /user_id|userId/, correct: 'telegramId', message: 'Use telegramId from UserContract' },
      { pattern: /created_at|dateCreated/, correct: 'createdAt', message: 'Use createdAt from BaseContract' },
      { pattern: /updated_at|dateUpdated/, correct: 'updatedAt', message: 'Use updatedAt from BaseContract' },
      { pattern: /is_deleted|deleted/, correct: 'isDeleted', message: 'Use isDeleted from BaseContract' },
      { pattern: /task_name|taskName/, correct: 'title', message: 'Use title from TaskContract' },
      { pattern: /due_date|dueDate/, correct: 'deadline', message: 'Use deadline from TaskContract' },
      { pattern: /assigned_to(?!:)/, correct: 'assignedTo', message: 'Use assignedTo from TaskContract' },
      { pattern: /team_id/, correct: 'teamId', message: 'Use teamId from contract' }
    ];
    
    violations.forEach(violation => {
      if (violation.pattern.test(content)) {
        this.errors.push({
          file: filePath,
          issue: `Contract violation: ${violation.message}`,
          line: this.findLineNumber(content, violation.pattern),
          fix: `Replace with: ${violation.correct}`
        });
      }
    });
    
    // Check if required fields exist
    expectedFields.forEach(field => {
      if (!content.includes(field)) {
        this.warnings.push({
          file: filePath,
          issue: `Missing contract field: ${field}`,
          fix: `Add field '${field}' as defined in ${contractName}`
        });
      }
    });
  }

  async validateServices() {
    console.log(chalk.yellow('Validating services...'));
    
    const serviceFiles = glob.sync(
      path.join(this.rootDir, 'backend/src/services/**/*.service.js')
    );
    
    for (const file of serviceFiles) {
      await this.validateServiceFile(file);
    }
  }

  async validateServiceFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Check for Elon Musk principles
    const requiredValidations = [
      { check: 'goal', message: 'Must validate task has clear goal' },
      { check: 'metric', message: 'Must validate task has success metric' },
      { check: 'deadline', message: 'Must validate task has deadline' },
      { check: 'assignedTo', message: 'Must validate task has single owner' }
    ];
    
    const hasValidation = content.includes('validate');
    if (!hasValidation) {
      this.errors.push({
        file: filePath,
        issue: 'Missing validation method',
        fix: 'Add validate() method to check Elon Musk principles'
      });
    } else {
      requiredValidations.forEach(validation => {
        if (!content.includes(validation.check)) {
          this.warnings.push({
            file: filePath,
            issue: `Missing validation: ${validation.message}`,
            fix: `Add validation for '${validation.check}' field`
          });
        }
      });
    }
  }

  async validateBotHandlers() {
    console.log(chalk.yellow('Validating bot handlers...'));
    
    const handlerFiles = glob.sync(
      path.join(this.rootDir, 'backend/src/bot/commands/**/*.command.js')
    );
    
    for (const file of handlerFiles) {
      await this.validateHandlerFile(file);
    }
  }

  async validateHandlerFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Required patterns
    const requirements = [
      {
        pattern: /module\.exports\s*=\s*{[\s\S]*command:[\s\S]*description:[\s\S]*handler:/,
        message: 'Command must export object with command, description, and handler'
      },
      {
        pattern: /try\s*{[\s\S]*}\s*catch/,
        message: 'Handler must have try-catch error handling'
      },
      {
        pattern: /MESSAGES\.ERRORS/,
        message: 'Must use MESSAGES.ERRORS for error responses'
      }
    ];
    
    requirements.forEach(req => {
      if (!req.pattern.test(content)) {
        this.errors.push({
          file: filePath,
          issue: req.message,
          fix: 'Update handler to match required structure'
        });
      }
    });
    
    // Check for inline keyboards
    if (content.includes('inline_keyboard')) {
      if (!content.includes('createInlineKeyboard')) {
        this.warnings.push({
          file: filePath,
          issue: 'Use createInlineKeyboard utility instead of raw inline_keyboard',
          fix: "Import and use createInlineKeyboard from '../utils/keyboard'"
        });
      }
    }
  }

  findLineNumber(content, pattern) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return 0;
  }

  showResults() {
    console.log('\n' + chalk.bold('Validation Results:'));
    console.log('=' .repeat(50));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('\n✅ All contracts validated successfully!\n'));
      return;
    }
    
    if (this.errors.length > 0) {
      console.log(chalk.red.bold(`\n❌ Errors (${this.errors.length}):\n`));
      this.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${path.relative(this.rootDir, error.file)}`));
        console.log(`   Issue: ${error.issue}`);
        if (error.line) console.log(`   Line: ${error.line}`);
        console.log(chalk.cyan(`   Fix: ${error.fix}`));
        console.log();
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow.bold(`\n⚠️  Warnings (${this.warnings.length}):\n`));
      this.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`${index + 1}. ${path.relative(this.rootDir, warning.file)}`));
        console.log(`   Issue: ${warning.issue}`);
        console.log(chalk.cyan(`   Fix: ${warning.fix}`));
        console.log();
      });
    }
    
    // Summary
    console.log('\n' + chalk.bold('Summary:'));
    console.log('=' .repeat(50));
    console.log(`Total Issues: ${chalk.red(this.errors.length)} errors, ${chalk.yellow(this.warnings.length)} warnings`);
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Validation failed! Fix errors before proceeding.'));
      process.exit(1);
    }
  }

  // Auto-fix functionality
  async autoFix() {
    console.log(chalk.blue.bold('\n🔧 Auto-fixing contract violations...\n'));
    
    const fixes = [
      { from: /user_id/g, to: 'telegramId' },
      { from: /userId/g, to: 'telegramId' },
      { from: /created_at/g, to: 'createdAt' },
      { from: /updated_at/g, to: 'updatedAt' },
      { from: /is_deleted/g, to: 'isDeleted' },
      { from: /task_name/g, to: 'title' },
      { from: /taskName/g, to: 'title' },
      { from: /due_date/g, to: 'deadline' },
      { from: /dueDate/g, to: 'deadline' },
      { from: /team_id/g, to: 'teamId' }
    ];
    
    const files = glob.sync(path.join(this.rootDir, 'backend/src/**/*.js'));
    let fixCount = 0;
    
    for (const file of files) {
      let content = await fs.readFile(file, 'utf-8');
      let modified = false;
      
      fixes.forEach(fix => {
        if (fix.from.test(content)) {
          content = content.replace(fix.from, fix.to);
          modified = true;
          fixCount++;
        }
      });
      
      if (modified) {
        await fs.writeFile(file, content);
        console.log(chalk.green(`✅ Fixed: ${path.relative(this.rootDir, file)}`));
      }
    }
    
    console.log(chalk.green.bold(`\n✅ Auto-fixed ${fixCount} violations\n`));
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const validator = new ContractValidator();

if (args.includes('--fix')) {
  validator.autoFix().catch(console.error);
} else {
  validator.run().catch(console.error);
} 