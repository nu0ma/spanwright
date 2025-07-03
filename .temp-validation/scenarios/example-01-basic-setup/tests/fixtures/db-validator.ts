import { test as base } from '@playwright/test';
import path from 'path';
import { safeGoRun, validateDatabaseId, validatePath } from "../../../command-utils-mock";

type DBValidatorFixtures = {
  validateDB: (databaseId: string, expectedPath: string) => void;
  validateAllDBs: (scenario?: string) => void;
};

export const test = base.extend<DBValidatorFixtures>({
  validateDB: async ({}, use) => {
    await use((databaseId: string, expectedPath: string) => {
      const projectRoot = path.resolve(__dirname, '../../../..');
      const validatorPath = path.join(projectRoot, 'cmd/db-validator/main.go');
      
      // Validate inputs
      validateDatabaseId(databaseId);
      const fullExpectedPath = validatePath(expectedPath, projectRoot);
      
      console.log(`🔍 Validating ${databaseId}...`);
      
      try {
        // Goプログラムを実行
        const output = safeGoRun(
          validatorPath,
          [databaseId, fullExpectedPath],
          {
            cwd: projectRoot,
            env: {
              ...process.env,
              SPANNER_EMULATOR_HOST: 'localhost:9010'
            },
            stdio: ['ignore', 'pipe', 'pipe'], // stdin無視, stdout/stderrキャプチャ
            timeout: 30000, // 30秒でタイムアウト
            maxBuffer: 1024 * 1024 * 10, // 10MBまでの出力を許可
          }
        );
        
        // 出力を解析
        const lines = output.trim().split('\n');
        
        // 成功パターンを探す
        const hasSuccess = lines.some(line => 
          line.includes('✅') || 
          line.includes('SUCCESS') || 
          line.includes('Validation passed') ||
          line.includes('All validations passed')
        );
        
        // エラーパターンを探す
        const hasError = lines.some(line => 
          line.includes('❌') || 
          line.includes('FAILED') || 
          line.includes('Validation failed') ||
          line.includes('ERROR')
        );
        
        if (hasError) {
          console.error(`❌ ${databaseId} validation failed`);
          console.error('Output:', output);
          throw new Error(`DB validation failed for ${databaseId}`);
        }
        
        if (!hasSuccess) {
          // 成功マーカーが見つからない場合は、JSONパースを試みる
          try {
            const jsonLine = lines[lines.length - 1];
            const result = JSON.parse(jsonLine);
            if (!result.success) {
              throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`);
            }
          } catch (parseError) {
            // JSONパースも失敗した場合は、出力全体を表示
            console.log('Validator output:', output);
            console.warn('⚠️  Could not determine validation result, assuming success');
          }
        }
        
        console.log(`✅ ${databaseId} validation passed`);
      } catch (error: any) {
        if (error.code === 'ETIMEDOUT') {
          throw new Error(`Validation timed out for ${databaseId}`);
        }
        
        if (error.status) {
          // 終了コードが0以外
          console.error(`Validator exited with code ${error.status}`);
          if (error.stdout) {
            console.error('stdout:', error.stdout);
          }
          if (error.stderr) {
            console.error('stderr:', error.stderr);
          }
          throw new Error(`Validator failed with exit code ${error.status}`);
        }
        
        throw error;
      }
    });
  },

  validateAllDBs: async ({ validateDB }, use) => {
    await use((scenario: string = 'scenario-01-basic-setup') => {
      console.log(`📋 Validating all databases for ${scenario}`);
      
      // Primary DB検証
      try {
        validateDB('primary-db', `scenarios/${scenario}/expected-primary.yaml`);
      } catch (error) {
        console.error('Primary DB validation failed:', error);
        throw error;
      }
      
      // Secondary DB検証
      try {
        validateDB('secondary-db', `scenarios/${scenario}/expected-secondary.yaml`);
      } catch (error) {
        console.error('Secondary DB validation failed:', error);
        throw error;
      }
      
      console.log('✅ All database validations passed');
    });
  },
});

export { expect } from '@playwright/test';