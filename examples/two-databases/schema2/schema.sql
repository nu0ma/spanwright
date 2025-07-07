-- System configuration table for secondary database
CREATE TABLE SystemConfig (
  ConfigKey STRING(100) NOT NULL,
  ConfigValue STRING(MAX) NOT NULL,
  Description STRING(500),
  UpdatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (ConfigKey);

-- User analytics table
CREATE TABLE UserAnalytics (
  AnalyticsID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  EventType STRING(50) NOT NULL,
  EventData JSON,
  Timestamp TIMESTAMP NOT NULL,
) PRIMARY KEY (AnalyticsID);

-- Audit logs table
CREATE TABLE AuditLogs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36),
  Action STRING(100) NOT NULL,
  ResourceType STRING(50),
  ResourceID STRING(36),
  Details JSON,
  Timestamp TIMESTAMP NOT NULL,
) PRIMARY KEY (LogID);

-- Indexes
CREATE INDEX AnalyticsByUser ON UserAnalytics (UserID, Timestamp DESC);
CREATE INDEX AnalyticsByType ON UserAnalytics (EventType, Timestamp DESC);
CREATE INDEX AuditLogsByUser ON AuditLogs (UserID, Timestamp DESC);
CREATE INDEX AuditLogsByAction ON AuditLogs (Action, Timestamp DESC);