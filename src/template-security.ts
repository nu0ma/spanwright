import { SecurityError } from './errors';
import { VALIDATION_PATTERNS } from './constants';

// Basic template security utilities

/**
 * Basic input escaping for template replacement
 */
export function escapeForTemplate(input: string): string {
  // Basic validation
  if (!VALIDATION_PATTERNS.GENERIC_IDENTIFIER.test(input)) {
    throw new SecurityError(`Invalid characters in input: ${input}`, input);
  }

  // Simple escaping
  return input;
}

/**
 * Basic template input validation
 */
export function validateTemplateInput(
  input: string,
  inputType: keyof typeof VALIDATION_PATTERNS = 'GENERIC_IDENTIFIER'
): void {
  const pattern = VALIDATION_PATTERNS[inputType];
  if (!pattern.test(input)) {
    throw new SecurityError(`Input validation failed for ${inputType}: ${input}`, input);
  }
}

/**
 * Export patterns for use in other modules
 */
export { VALIDATION_PATTERNS as SAFE_PATTERNS };

/**
 * Simple template replacement
 */
export function simpleTemplateReplace(
  content: string,
  replacements: Record<string, string>
): string {
  let result = content;

  for (const [search, replace] of Object.entries(replacements)) {
    // Escape the search pattern for regex
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Validate the replacement value
    validateTemplateInput(replace);

    // Perform the replacement
    result = result.replace(new RegExp(escapedSearch, 'g'), replace);
  }

  return result;
}

