-- Primary Database Schema
-- Basic tables for testing

CREATE TABLE Users (
  UserID STRING(MAX) NOT NULL,
  Name STRING(MAX) NOT NULL,
  Email STRING(MAX) NOT NULL,
  Status INT64 NOT NULL,
) PRIMARY KEY (UserID);

CREATE TABLE Products (
  ProductID STRING(MAX) NOT NULL,
  Name STRING(MAX) NOT NULL,
  Price INT64 NOT NULL,
  CategoryID STRING(MAX) NOT NULL,
  IsActive BOOL NOT NULL,
) PRIMARY KEY (ProductID);