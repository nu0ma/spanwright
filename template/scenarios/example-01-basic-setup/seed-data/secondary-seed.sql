-- Minimal secondary database seed data
-- Insert basic system configuration
INSERT INTO SystemConfig (ConfigID, ConfigKey, ConfigValue, CreatedAt) VALUES
  ('config-001', 'test_mode', 'enabled', '2024-01-01T00:00:00Z');