#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const GO_VERSION_LOCATIONS = [
  {
    file: 'template/go.mod.template',
    patterns: [
      { regex: /^go \d+\.\d+(\.\d+)?$/m, replacement: (version: string) => `go ${version}` },
      { regex: /^toolchain go\d+\.\d+(\.\d+)?$/m, replacement: (version: string) => `toolchain go${version}` }
    ]
  },
  {
    file: '.github/workflows/ci.yml',
    patterns: [
      { regex: /go-version: '\d+\.\d+(\.\d+)?'/g, replacement: (version: string) => `go-version: '${version.split('.').slice(0, 2).join('.')}'` }
    ]
  },
  {
    file: '.github/workflows/template-validation.yml',
    patterns: [
      { regex: /go-version: '\d+\.\d+(\.\d+)?'/g, replacement: (version: string) => `go-version: '${version.split('.').slice(0, 2).join('.')}'` }
    ]
  },
  {
    file: 'scripts/validate-template.ts',
    patterns: [
      { regex: /go \d+\.\d+(\.\d+)?/g, replacement: (version: string) => `go ${version}` }
    ]
  }
];

function updateGoVersion(newVersion: string) {
  console.log(`🔄 Updating Go version to ${newVersion}...`);
  
  if (!/^\d+\.\d+(\.\d+)?$/.test(newVersion)) {
    console.error('❌ Invalid version format. Use format: 1.23.0 or 1.23');
    process.exit(1);
  }

  let updatedFiles = 0;
  
  for (const location of GO_VERSION_LOCATIONS) {
    const filePath = join(process.cwd(), location.file);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileUpdated = false;
      
      for (const pattern of location.patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          newContent = newContent.replace(pattern.regex, pattern.replacement(newVersion));
          fileUpdated = true;
        }
      }
      
      if (fileUpdated) {
        writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ Updated ${location.file}`);
        updatedFiles++;
      } else {
        console.log(`⚠️  No Go version found in ${location.file}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${location.file}:`, error);
    }
  }
  
  console.log(`\n🎉 Successfully updated Go version in ${updatedFiles} files`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Run: npm run template:validate`);
  console.log(`   2. Run: npm run dev:create-testbed`);
  console.log(`   3. Test: npm run dev:test-e2e`);
  console.log(`   4. Commit changes if everything works`);
}

// CLI usage
const newVersion = process.argv[2];
if (!newVersion) {
  console.error('❌ Please provide a Go version');
  console.error('Usage: npm run update-go-version 1.24.3');
  process.exit(1);
}

updateGoVersion(newVersion);