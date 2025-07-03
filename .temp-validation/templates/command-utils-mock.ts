
export const safeMakeRun = (command: string, args: string[], options?: any) => {
  console.log('Mock safeMakeRun:', command, args);
  return { success: true, output: '' };
};

export const validateScenarioName = (name: string) => {
  console.log('Mock validateScenarioName:', name);
  return true;
};

export const safeGoRun = (path: string, args: string[], options?: any) => {
  console.log('Mock safeGoRun:', path, args);
  return '{"success": true}';
};

export const validateDatabaseId = (id: string) => {
  console.log('Mock validateDatabaseId:', id);
  return true;
};

export const validatePath = (path: string, root: string) => {
  console.log('Mock validatePath:', path, root);
  return path;
};
