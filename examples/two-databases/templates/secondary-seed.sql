-- Secondary database seed data template
-- Insert Analytics
INSERT INTO Analytics (AnalyticsID, UserID, EventType, PageURL, Timestamp) VALUES
  ('analytics-001', 'user-001', 'page_view', '/test', '2024-01-01T00:00:00Z');

-- Insert UserLogs
INSERT INTO UserLogs (LogID, UserID, Action, IpAddress, CreatedAt) VALUES
  ('log-001', 'user-001', 'login', '192.168.1.1', '2024-01-01T00:00:00Z');