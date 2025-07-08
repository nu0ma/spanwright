import { vi } from 'vitest'

export const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
}

export const mockProcess = {
  exit: vi.fn(),
  env: {},
  argv: ['node', 'spanwright'],
  cwd: vi.fn().mockReturnValue('/test/cwd'),
  pid: 12345
}

export const mockReadline = {
  createInterface: vi.fn(),
  question: vi.fn(),
  close: vi.fn()
}

export const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  copyFileSync: vi.fn(),
  rmSync: vi.fn()
}

export const mockPath = {
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => '/' + args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn((path) => path.split('/').pop()),
  extname: vi.fn((path) => {
    const parts = path.split('.')
    return parts.length > 1 ? '.' + parts.pop() : ''
  }),
  isAbsolute: vi.fn((path) => path.startsWith('/'))
}

export const createMockReadlineInterface = () => ({
  question: vi.fn(),
  close: vi.fn()
})

export const createMockFile = (content: string) => ({
  toString: () => content,
  length: content.length
})

export const resetAllMocks = () => {
  vi.clearAllMocks()
  Object.values(mockConsole).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
  Object.values(mockProcess).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
  Object.values(mockFs).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
  Object.values(mockPath).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset()
    }
  })
}

export const setupMockEnvironment = () => {
  vi.mock('console', () => mockConsole)
  vi.mock('process', () => mockProcess)
  vi.mock('readline', () => mockReadline)
  vi.mock('fs', () => mockFs)
  vi.mock('path', () => mockPath)
}