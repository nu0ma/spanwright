import * as path from 'path';
import { SecurityError } from './errors';

// Template security utilities for preventing code injection attacks

/**
 * Supported template contexts for escaping
 */
export type TemplateContext = 'javascript' | 'shell' | 'sql' | 'generic';

/**
 * File extension to context mapping
 */
const FILE_CONTEXT_MAP: Record<string, TemplateContext> = {
  '.js': 'javascript',
  '.ts': 'javascript',
  '.jsx': 'javascript',
  '.tsx': 'javascript',
  '.json': 'generic',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  Makefile: 'shell',
  makefile: 'shell',
  '.mk': 'shell',
  '.mak': 'shell',
  '.sql': 'sql',
  '.ddl': 'sql',
  '.dml': 'sql',
  '.yaml': 'generic',
  '.yml': 'generic',
  '.toml': 'generic',
  '.md': 'generic',
  '.txt': 'generic',
  '.go': 'generic',
  '.mod': 'generic',
};

/**
 * Safe character patterns for different contexts
 */
const SAFE_PATTERNS = {
  PROJECT_NAME: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  DATABASE_NAME: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  SCHEMA_PATH: /^[a-zA-Z0-9_./\\-]+$/,
  GENERIC_IDENTIFIER: /^[a-zA-Z0-9_-]+$/,
};

/**
 * Escape user input for JavaScript/TypeScript contexts
 */
export function escapeForJavaScript(input: string): string {
  // Validate input is safe for JavaScript context
  if (!SAFE_PATTERNS.GENERIC_IDENTIFIER.test(input)) {
    throw new SecurityError(`Invalid characters in JavaScript context: ${input}`, input);
  }

  // Additional escaping for JavaScript strings and identifiers
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t') // Escape tabs
    .replace(/\//g, '\\/') // Escape forward slashes
    .replace(/\$/g, '\\$') // Escape dollar signs (template literals)
    .replace(/`/g, '\\`'); // Escape backticks (template literals)
}

/**
 * Escape user input for Shell/Makefile contexts
 */
export function escapeForShell(input: string): string {
  // Validate input is safe for shell context
  if (!SAFE_PATTERNS.GENERIC_IDENTIFIER.test(input)) {
    throw new SecurityError(`Invalid characters in shell context: ${input}`, input);
  }

  // Shell metacharacters that need escaping
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\$/g, '\\$') // Escape dollar signs (variable expansion)
    .replace(/`/g, '\\`') // Escape backticks (command substitution)
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\(/g, '\\(') // Escape parentheses
    .replace(/\)/g, '\\)')
    .replace(/\[/g, '\\[') // Escape brackets
    .replace(/\]/g, '\\]')
    .replace(/\{/g, '\\{') // Escape braces
    .replace(/\}/g, '\\}')
    .replace(/\|/g, '\\|') // Escape pipe
    .replace(/&/g, '\\&') // Escape ampersand
    .replace(/;/g, '\\;') // Escape semicolon
    .replace(/</g, '\\<') // Escape redirection
    .replace(/>/g, '\\>')
    .replace(/\*/g, '\\*') // Escape wildcards
    .replace(/\?/g, '\\?')
    .replace(/\^/g, '\\^') // Escape caret
    .replace(/~/g, '\\~') // Escape tilde
    .replace(/ /g, '\\ '); // Escape spaces
}

/**
 * Escape user input for SQL contexts
 */
export function escapeForSQL(input: string): string {
  // Validate input is safe for SQL context
  if (!SAFE_PATTERNS.GENERIC_IDENTIFIER.test(input)) {
    throw new SecurityError(`Invalid characters in SQL context: ${input}`, input);
  }

  // SQL injection prevention
  return input
    .replace(/'/g, "''") // Escape single quotes (SQL standard)
    .replace(/"/g, '""') // Escape double quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\0/g, '\\0') // Escape null bytes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/;/g, '\\;') // Escape semicolons to prevent statement injection
    .replace(/--/g, '\\-\\-') // Escape comment markers
    .replace(/\/\*/g, '\\/*') // Escape block comment start
    .replace(/\*\//g, '\\*/'); // Escape block comment end
}

/**
 * Generic escaping for unknown contexts
 */
export function escapeForGeneric(input: string): string {
  // Use the most restrictive validation
  if (!SAFE_PATTERNS.GENERIC_IDENTIFIER.test(input)) {
    throw new SecurityError(`Invalid characters in generic context: ${input}`, input);
  }

  // Basic escaping for generic contexts
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\$/g, '\\$') // Escape dollar signs
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}

/**
 * Determine the context based on file path
 */
export function getFileContext(filePath: string): TemplateContext {
  const basename = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  // Check for special filenames first
  if (basename === 'makefile' || basename.startsWith('makefile.')) {
    return 'shell';
  }

  // Check file extension
  const context = FILE_CONTEXT_MAP[ext];
  if (context) {
    return context;
  }

  // Default to generic if unknown
  return 'generic';
}

/**
 * Validate template input against security patterns
 */
export function validateTemplateInput(
  input: string,
  inputType: keyof typeof SAFE_PATTERNS = 'GENERIC_IDENTIFIER'
): void {
  const pattern = SAFE_PATTERNS[inputType];
  if (!pattern.test(input)) {
    throw new SecurityError(`Input validation failed for ${inputType}: ${input}`, input);
  }

  // Additional security checks
  if (input.includes('\0')) {
    throw new SecurityError(`Null byte detected in template input: ${input}`, input);
  }

  if (input.includes('..')) {
    throw new SecurityError(`Path traversal sequence detected in template input: ${input}`, input);
  }

  if (input.length > 100) {
    throw new SecurityError(`Template input too long (max 100 characters): ${input}`, input);
  }
}

/**
 * Main escaping function that routes to appropriate context-specific escaping
 */
export function escapeForContext(input: string, context: TemplateContext): string {
  // Validate input first
  validateTemplateInput(input);

  switch (context) {
    case 'javascript':
      return escapeForJavaScript(input);
    case 'shell':
      return escapeForShell(input);
    case 'sql':
      return escapeForSQL(input);
    case 'generic':
      return escapeForGeneric(input);
    default:
      throw new SecurityError(`Unknown template context: ${context}`, context);
  }
}

/**
 * Secure template replacement with context-aware escaping
 */
export function secureTemplateReplace(
  content: string,
  replacements: Record<string, string>,
  filePath: string
): string {
  const context = getFileContext(filePath);

  let result = content;

  for (const [search, replace] of Object.entries(replacements)) {
    // Escape the search pattern for regex
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Escape the replacement value for the target context
    const escapedReplace = escapeForContext(replace, context);

    // Perform the replacement
    result = result.replace(new RegExp(escapedSearch, 'g'), escapedReplace);
  }

  return result;
}

/**
 * Export safe patterns for use in other modules
 */
export { SAFE_PATTERNS };
