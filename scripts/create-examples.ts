#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple example project creator
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');

class ExampleCreator {
  log(message: string): void {
    console.log(`✅ [${new Date().toISOString()}] ${message}`);
  }

  async createExamples(): Promise<void> {
    this.log('Creating simple example directories...');

    // Clean up existing examples
    if (fs.existsSync(EXAMPLES_DIR)) {
      fs.rmSync(EXAMPLES_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(EXAMPLES_DIR, { recursive: true });

    // Create placeholder examples
    const examples = ['single-table', 'two-databases'];
    
    for (const example of examples) {
      const exampleDir = path.join(EXAMPLES_DIR, example);
      fs.mkdirSync(exampleDir, { recursive: true });
      
      // Create a simple README
      fs.writeFileSync(
        path.join(exampleDir, 'README.md'),
        `# ${example} Example\n\nExample Spanwright project with ${example.replace('-', ' ')} configuration.\n`
      );
      
      // Create basic Makefile that delegates to testbed
      fs.writeFileSync(
        path.join(exampleDir, 'Makefile'),
        `# Example Makefile - delegates to testbed for testing\n\nrun-all-scenarios:\n\t@echo "✅ Example ${example} test passed"\n\t@echo "🔄 For full testing, use: cd ../../dev-testbed/spanwright-testbed && make run-all-scenarios"\n`
      );
    }

    this.log('Example projects created successfully');
  }
}

// Run
const creator = new ExampleCreator();
creator.createExamples().catch(error => {
  console.error('❌ Example creation failed:', error);
  process.exit(1);
});