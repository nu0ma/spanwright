-- Analytics table for secondary database
CREATE TABLE Analytics (
  AnalyticsID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  EventType STRING(50) NOT NULL,
  PageURL STRING(500),
  Timestamp TIMESTAMP NOT NULL,
) PRIMARY KEY (AnalyticsID);

-- UserLogs table
CREATE TABLE UserLogs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Action STRING(100) NOT NULL,
  IpAddress STRING(45),
  UserAgent STRING(500),
  CreatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (LogID);

-- Indexes
CREATE INDEX AnalyticsByUser ON Analytics (UserID, Timestamp DESC);
CREATE INDEX AnalyticsByType ON Analytics (EventType, Timestamp DESC);
CREATE INDEX UserLogsByUser ON UserLogs (UserID, CreatedAt DESC);
CREATE INDEX UserLogsByAction ON UserLogs (Action, CreatedAt DESC);