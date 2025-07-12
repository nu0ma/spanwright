-- Primary Database Schema
-- Add your DDL statements here

CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (UserID);

CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Price INT64 NOT NULL,
  CategoryID STRING(36) NOT NULL,
  IsActive BOOL NOT NULL
) PRIMARY KEY (ProductID);
