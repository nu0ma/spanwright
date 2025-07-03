-- Two Tables Example - Secondary Database Schema
-- Logs table for the secondary database

CREATE TABLE Logs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Action STRING(255) NOT NULL,
  IpAddress STRING(50),
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (LogID);