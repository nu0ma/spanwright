-- Secondary Database Schema  
-- Analytics and logging tables

CREATE TABLE UserLogs (
  LogID STRING(MAX) NOT NULL,
  UserID STRING(MAX) NOT NULL,
  Action STRING(MAX) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL,
  IpAddress STRING(MAX),
  UserAgent STRING(MAX),
  IPAddress STRING(MAX),
) PRIMARY KEY (LogID);

CREATE TABLE Analytics (
  AnalyticsID STRING(MAX) NOT NULL,
  UserID STRING(MAX) NOT NULL,
  EventType STRING(MAX) NOT NULL,
  Timestamp TIMESTAMP NOT NULL,
  PageURL STRING(MAX),
) PRIMARY KEY (AnalyticsID);