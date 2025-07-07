-- Simple user table for single-table example
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (UserID);

-- Index for email lookups
CREATE INDEX UsersByEmail ON Users (Email);