-- Secondary database seed data
-- Insert Analytics
INSERT INTO Analytics (AnalyticsID, UserID, EventType, PageURL, Timestamp) VALUES
  ('analytics-001', 'user-001', 'page_view', '/products', '2024-01-15T10:30:00Z'),
  ('analytics-002', 'user-001', 'click', '/products/prod-001', '2024-01-15T10:31:00Z'),
  ('analytics-003', 'user-002', 'page_view', '/', '2024-01-15T11:00:00Z'),
  ('analytics-004', 'user-001', 'purchase', '/checkout', '2024-01-15T10:35:00Z'),
  ('analytics-005', 'user-002', 'search', '/search?q=sample', '2024-01-15T11:05:00Z');

-- Insert UserLogs
INSERT INTO UserLogs (LogID, UserID, Action, IpAddress, UserAgent, CreatedAt) VALUES
  ('log-001', 'user-001', 'login', '192.168.1.1', 'Mozilla/5.0', '2024-01-15T09:00:00Z'),
  ('log-002', 'user-001', 'view_product', '192.168.1.1', 'Mozilla/5.0', '2024-01-15T10:30:00Z'),
  ('log-003', 'user-001', 'add_to_cart', '192.168.1.1', 'Mozilla/5.0', '2024-01-15T10:32:00Z'),
  ('log-004', 'user-001', 'checkout', '192.168.1.1', 'Mozilla/5.0', '2024-01-15T10:35:00Z'),
  ('log-005', 'user-001', 'logout', '192.168.1.1', 'Mozilla/5.0', '2024-01-15T11:00:00Z'),
  ('log-006', 'user-002', 'login', '192.168.1.2', 'Chrome/119.0', '2024-01-15T11:00:00Z'),
  ('log-007', 'user-002', 'search', '192.168.1.2', 'Chrome/119.0', '2024-01-15T11:05:00Z'),
  ('log-008', 'user-002', 'view_category', '192.168.1.2', 'Chrome/119.0', '2024-01-15T11:10:00Z'),
  ('log-009', 'user-002', 'logout', '192.168.1.2', 'Chrome/119.0', '2024-01-15T11:15:00Z'),
  ('log-010', 'user-001', 'login', '192.168.1.1', 'Mozilla/5.0', '2024-01-16T09:00:00Z');