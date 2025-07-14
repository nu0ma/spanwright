-- Users table for primary database
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL,
) PRIMARY KEY (UserID);

-- Products table
CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Price INT64 NOT NULL,
  CategoryID STRING(36) NOT NULL,
  IsActive BOOL NOT NULL,
) PRIMARY KEY (ProductID);

-- Indexes
CREATE INDEX UsersByEmail ON Users (Email);
CREATE INDEX ProductsByCategory ON Products (CategoryID);
CREATE INDEX ProductsByActive ON Products (IsActive);