-- Secondary database seed data
-- Insert Logs
INSERT INTO Logs (LogID, UserID, Action, IpAddress, CreatedAt) VALUES
  ('log-001', 'user-001', 'login', '192.168.1.100', '2024-01-01T10:05:00Z'),
  ('log-002', 'user-001', 'view_profile', '192.168.1.100', '2024-01-01T10:10:00Z'),
  ('log-003', 'user-002', 'login', '192.168.1.101', '2024-01-02T10:05:00Z'),
  ('log-004', 'user-002', 'logout', '192.168.1.101', '2024-01-02T10:30:00Z');