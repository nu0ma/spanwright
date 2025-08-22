export interface VersionConfig {
  meta: {
    lastUpdated: string;
    updatePolicy: 'automated' | 'manual';
    schemaVersion: string;
  };
  runtime: {
    go: string;
    node: string;
    pnpm: string;
  };
  dependencies: {
    go: Record<string, string>;
    node: {
      cli: Record<string, string>;
      template: Record<string, string>;
    };
  };
  validation: {
    compatibility: {
      node: string;
      go: string;
    };
  };
}

export interface VersionLocation {
  file: string;
  type: 'runtime' | 'dependency';
  patterns: VersionPattern[];
  path?: string;
}

export interface VersionPattern {
  regex: RegExp;
  replacement: (version: string) => string;
  description: string;
}

export type VersionUpdateTarget = 'go' | 'node' | 'pnpm' | 'dependency';

export interface VersionUpdateResult {
  success: boolean;
  updatedFiles: string[];
  errors: string[];
  warnings: string[];
}