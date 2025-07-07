-- Companies table for primary database
CREATE TABLE Companies (
  CompanyID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Domain STRING(255),
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (CompanyID);

-- Users table
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  CompanyID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (UserID);

-- User sessions table
CREATE TABLE UserSessions (
  SessionID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Token STRING(255) NOT NULL,
  ExpiresAt TIMESTAMP NOT NULL,
  CreatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (SessionID);

-- Indexes
CREATE INDEX CompaniesByDomain ON Companies (Domain);
CREATE INDEX UsersByCompany ON Users (CompanyID);
CREATE INDEX UsersByEmail ON Users (Email);
CREATE INDEX SessionsByUser ON UserSessions (UserID);
CREATE INDEX SessionsByToken ON UserSessions (Token);