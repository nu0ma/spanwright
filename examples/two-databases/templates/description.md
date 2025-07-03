# Scenario: SCENARIO_NAME

## Overview
Please describe SCENARIO_NAME here.
Clearly describe what this scenario tests and under what conditions it is executed.

## Purpose
- Test specific functionality of Primary DB
- Test specific functionality of Secondary DB
- Verify that both databases work together properly

## Test Steps
1. Start emulator
2. Apply schema to both databases
3. Insert seed data into each database
4. Verify data existence
5. Compare with expected values
6. Execute E2E tests

## Success Criteria
- Expected data exists in all tables of Primary DB
- Expected data exists in all tables of Secondary DB
- Data content matches expected values
- All E2E tests pass successfully

## Seed Data Content
### Primary DB
- Company: Test company data
- Billing: Test billing data
- Realtor: Test real estate data

### Secondary DB
- Company: Test company data

## Notes
- Please specify any prerequisites required before executing this scenario
- Clearly state if specific configurations or environment variables are needed