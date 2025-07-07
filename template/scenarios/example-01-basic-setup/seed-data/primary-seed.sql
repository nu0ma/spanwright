-- Minimal primary database seed data
-- Insert minimal test user
INSERT INTO Users (UserID, Name, Email, Status, CreatedAt) VALUES
  ('user-001', 'E2E Test User', 'e2e-test-user@example.com', 1, '2024-01-01T00:00:00Z');

-- Insert minimal test company
INSERT INTO Companies (CompanyID, Name, Status, CreatedAt) VALUES
  ('company-001', 'Test Company Ltd.', 1, '2024-01-01T00:00:00Z');