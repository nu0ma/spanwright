-- Primary database seed data template
-- Insert Users
INSERT INTO Users (UserID, Name, Email, Status, CreatedAt) VALUES
  ('user-001', 'Test User', 'test@example.com', 1, '2024-01-01T00:00:00Z');

-- Insert Products
INSERT INTO Products (ProductID, Name, Price, CategoryID, IsActive) VALUES
  ('prod-001', 'Test Product', 1000, 'cat-001', true);