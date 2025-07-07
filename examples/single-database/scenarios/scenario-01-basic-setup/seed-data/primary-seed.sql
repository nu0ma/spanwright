-- Primary database seed data
-- Insert Users
INSERT INTO Users (UserID, Name, Email, Status, CreatedAt) VALUES
  ('user-001', 'Sample User', 'user@example.com', 1, '2024-01-01T00:00:00Z'),
  ('user-002', 'Test User', 'test@example.com', 1, '2024-01-02T00:00:00Z');

-- Insert Products
INSERT INTO Products (ProductID, Name, Price, CategoryID, IsActive) VALUES
  ('prod-001', 'Sample Product', 1000, 'cat-001', true),
  ('prod-002', 'Test Product', 1500, 'cat-001', true),
  ('prod-003', 'Demo Product', 500, 'cat-002', false);

-- Insert Orders
INSERT INTO Orders (OrderID, UserID, TotalAmount, Status, OrderDate) VALUES
  ('order-001', 'user-001', 2500, 'completed', '2024-01-15T10:30:00Z');

-- Insert OrderItems
INSERT INTO OrderItems (OrderItemID, OrderID, ProductID, Quantity, UnitPrice) VALUES
  ('item-001', 'order-001', 'prod-001', 2, 1000),
  ('item-002', 'order-001', 'prod-002', 1, 500);