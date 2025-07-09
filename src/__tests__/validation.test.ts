import { describe, it, expect } from 'vitest'
import { validateProjectName, validateDatabaseCount, validateSchemaPath, isFlag, sanitizeInput } from '../validation'
import { ValidationError } from '../errors'

describe('Validation Module', () => {
  describe('validateProjectName', () => {
    it('should pass for valid project names', () => {
      expect(() => validateProjectName('my-project')).not.toThrow()
      expect(() => validateProjectName('project123')).not.toThrow()
      expect(() => validateProjectName('Project_Name')).not.toThrow()
      expect(() => validateProjectName('test-project-name')).not.toThrow()
    })

    it('should throw ValidationError for undefined name', () => {
      expect(() => validateProjectName(undefined)).toThrow(ValidationError)
      expect(() => validateProjectName(undefined)).toThrow('Project name cannot be empty')
    })

    it('should throw ValidationError for empty name', () => {
      expect(() => validateProjectName('')).toThrow(ValidationError)
      expect(() => validateProjectName('')).toThrow('Project name cannot be empty')
    })

    it('should throw ValidationError for whitespace-only name', () => {
      expect(() => validateProjectName('   ')).toThrow(ValidationError)
      expect(() => validateProjectName('   ')).toThrow('Project name cannot be empty')
    })

    it('should throw ValidationError for names containing forward slash', () => {
      expect(() => validateProjectName('my/project')).toThrow(ValidationError)
      expect(() => validateProjectName('my/project')).toThrow('Project name cannot contain path separators')
    })

    it('should throw ValidationError for names containing backslash', () => {
      expect(() => validateProjectName('my\\project')).toThrow(ValidationError)
      expect(() => validateProjectName('my\\project')).toThrow('Project name cannot contain path separators')
    })

    it('should throw ValidationError for names starting with dot', () => {
      expect(() => validateProjectName('.hidden-project')).toThrow(ValidationError)
      expect(() => validateProjectName('.hidden-project')).toThrow('Project name cannot start with a dot')
    })

    it('should throw ValidationError for project name containing path traversal', () => {
      expect(() => validateProjectName('project..')).toThrow(ValidationError)
      expect(() => validateProjectName('project..')).toThrow('Project name cannot contain ".." (path traversal)')
      
      expect(() => validateProjectName('..project')).toThrow(ValidationError)
      expect(() => validateProjectName('..project')).toThrow('Project name cannot contain ".." (path traversal)')
      
      expect(() => validateProjectName('proj..ect')).toThrow(ValidationError)
      expect(() => validateProjectName('proj..ect')).toThrow('Project name cannot contain ".." (path traversal)')
    })

    it('should throw ValidationError for project name containing null bytes', () => {
      expect(() => validateProjectName('project\0')).toThrow(ValidationError)
      expect(() => validateProjectName('project\0')).toThrow('Project name cannot contain null bytes')
      
      expect(() => validateProjectName('pro\0ject')).toThrow(ValidationError)
      expect(() => validateProjectName('pro\0ject')).toThrow('Project name cannot contain null bytes')
    })

    it('should throw ValidationError for Windows absolute paths', () => {
      expect(() => validateProjectName('C:project')).toThrow(ValidationError)
      expect(() => validateProjectName('C:project')).toThrow('Project name cannot be an absolute path')
      
      expect(() => validateProjectName('D:test')).toThrow(ValidationError)
      expect(() => validateProjectName('D:test')).toThrow('Project name cannot be an absolute path')
    })

    it('should allow valid project names with dots in middle', () => {
      expect(() => validateProjectName('project.name')).not.toThrow()
      expect(() => validateProjectName('my.project.test')).not.toThrow()
      expect(() => validateProjectName('file.txt')).not.toThrow()
    })

    it('should throw ValidationError with correct field name', () => {
      try {
        validateProjectName('')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).field).toBe('projectName')
      }
    })
  })

  describe('validateDatabaseCount', () => {
    it('should pass for valid database counts', () => {
      expect(() => validateDatabaseCount('1')).not.toThrow()
      expect(() => validateDatabaseCount('2')).not.toThrow()
    })

    it('should throw ValidationError for invalid counts', () => {
      expect(() => validateDatabaseCount('0')).toThrow(ValidationError)
      expect(() => validateDatabaseCount('3')).toThrow(ValidationError)
      expect(() => validateDatabaseCount('10')).toThrow(ValidationError)
    })

    it('should throw ValidationError for non-numeric strings', () => {
      expect(() => validateDatabaseCount('one')).toThrow(ValidationError)
      expect(() => validateDatabaseCount('two')).toThrow(ValidationError)
      expect(() => validateDatabaseCount('abc')).toThrow(ValidationError)
    })

    it('should throw ValidationError for empty string', () => {
      expect(() => validateDatabaseCount('')).toThrow(ValidationError)
      expect(() => validateDatabaseCount('')).toThrow('Database count must be 1 or 2')
    })

    it('should throw ValidationError with correct field name', () => {
      try {
        validateDatabaseCount('3')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).field).toBe('dbCount')
      }
    })
  })

  describe('validateSchemaPath', () => {
    it('should pass for valid absolute paths', () => {
      expect(() => validateSchemaPath('/path/to/schema', 'schemaPath')).not.toThrow()
      expect(() => validateSchemaPath('/tmp/schema', 'schemaPath')).not.toThrow()
      expect(() => validateSchemaPath('/home/user/schema', 'schemaPath')).not.toThrow()
    })

    it('should throw ValidationError for empty path', () => {
      expect(() => validateSchemaPath('', 'schemaPath')).toThrow(ValidationError)
      expect(() => validateSchemaPath('', 'schemaPath')).toThrow('schemaPath cannot be empty')
    })

    it('should throw ValidationError for whitespace-only path', () => {
      expect(() => validateSchemaPath('   ', 'schemaPath')).toThrow(ValidationError)
      expect(() => validateSchemaPath('   ', 'schemaPath')).toThrow('schemaPath cannot be empty')
    })

    it('should throw ValidationError for relative paths', () => {
      expect(() => validateSchemaPath('relative/path', 'schemaPath')).toThrow(ValidationError)
      expect(() => validateSchemaPath('relative/path', 'schemaPath')).toThrow('schemaPath must be an absolute path')
    })

    it('should throw ValidationError for paths starting with dot', () => {
      expect(() => validateSchemaPath('./relative/path', 'schemaPath')).toThrow(ValidationError)
      expect(() => validateSchemaPath('./relative/path', 'schemaPath')).toThrow('schemaPath must be an absolute path')
    })

    it('should throw ValidationError for paths starting with double dot', () => {
      expect(() => validateSchemaPath('../relative/path', 'schemaPath')).toThrow(ValidationError)
      expect(() => validateSchemaPath('../relative/path', 'schemaPath')).toThrow('schemaPath must be an absolute path')
    })

    it('should use correct field name in error message', () => {
      const fieldName = 'primarySchemaPath'
      
      try {
        validateSchemaPath('', fieldName)
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).message).toContain(fieldName)
        expect((error as ValidationError).field).toBe(fieldName)
      }
    })

    it('should handle different field names correctly', () => {
      const testCases = [
        'primarySchemaPath',
        'secondarySchemaPath',
        'customFieldName'
      ]

      testCases.forEach(fieldName => {
        try {
          validateSchemaPath('relative/path', fieldName)
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError)
          expect((error as ValidationError).message).toContain(`${fieldName} must be an absolute path`)
          expect((error as ValidationError).field).toBe(fieldName)
        }
      })
    })
  })

  describe('isFlag', () => {
    it('should return true for arguments starting with flag prefix', () => {
      expect(isFlag('-h')).toBe(true)
      expect(isFlag('--help')).toBe(true)
      expect(isFlag('-v')).toBe(true)
      expect(isFlag('--version')).toBe(true)
      expect(isFlag('--non-interactive')).toBe(true)
    })

    it('should return false for arguments not starting with flag prefix', () => {
      expect(isFlag('project-name')).toBe(false)
      expect(isFlag('help')).toBe(false)
      expect(isFlag('version')).toBe(false)
      expect(isFlag('my-project')).toBe(false)
      expect(isFlag('')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isFlag('-')).toBe(true) // Single dash
      expect(isFlag('--')).toBe(true) // Double dash
      expect(isFlag('---')).toBe(true) // Triple dash
      expect(isFlag('a-b-c')).toBe(false) // Contains dash but doesn't start with it
    })
  })

  describe('sanitizeInput', () => {
    it('should trim whitespace from input', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello')
      expect(sanitizeInput('  world')).toBe('world')
      expect(sanitizeInput('test  ')).toBe('test')
    })

    it('should handle strings with no whitespace', () => {
      expect(sanitizeInput('hello')).toBe('hello')
      expect(sanitizeInput('test-project')).toBe('test-project')
    })

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('')
      expect(sanitizeInput('   ')).toBe('')
    })

    it('should handle strings with internal whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world')
      expect(sanitizeInput('  test   project  ')).toBe('test   project')
    })

    it('should handle newlines and tabs', () => {
      expect(sanitizeInput('\\n\\nhello\\n\\n')).toBe('\\n\\nhello\\n\\n')
      expect(sanitizeInput('\\t\\thello\\t\\t')).toBe('\\t\\thello\\t\\t')
    })
  })
})