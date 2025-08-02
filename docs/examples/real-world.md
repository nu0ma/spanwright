# Real-World Scenarios

Production-ready examples demonstrating Spanwright in enterprise environments with complex workflows, error handling, and performance considerations.

## Enterprise SaaS Platform

### Overview

A multi-tenant SaaS platform with complex user management, billing, and feature access controls.

### Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Admin Panel   │
│   (React SPA)   │    │   (Next.js)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │    API Gateway        │
         │    (Load Balancer)    │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌──────▼──────┐    ┌───▼────┐
│ User   │    │   Billing   │    │ Tenant │
│Service │    │   Service   │    │Service │
│        │    │             │    │        │
│ 🗄️ DB1 │    │    🗄️ DB2   │    │ 🗄️ DB3 │
└────────┘    └─────────────┘    └────────┘
```

### Database Design

**User Service Database:**
```sql
-- Multi-tenant user management
CREATE TABLE Tenants (
  TenantID STRING(36) NOT NULL,
  Name STRING(200) NOT NULL,
  Domain STRING(100) NOT NULL,
  Plan STRING(50) NOT NULL,
  Status STRING(20) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TenantID);

CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  TenantID STRING(36) NOT NULL,
  Email STRING(255) NOT NULL,
  Role STRING(50) NOT NULL,
  Status STRING(20) NOT NULL,
  LastLoginAt TIMESTAMP,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TenantID, UserID),
INTERLEAVE IN PARENT Tenants ON DELETE CASCADE;

CREATE TABLE UserSessions (
  SessionID STRING(128) NOT NULL,
  TenantID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  ExpiresAt TIMESTAMP NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TenantID, UserID, SessionID),
INTERLEAVE IN PARENT Users ON DELETE CASCADE;
```

**Billing Service Database:**
```sql
-- Subscription and usage tracking
CREATE TABLE Subscriptions (
  SubscriptionID STRING(36) NOT NULL,
  TenantID STRING(36) NOT NULL,
  Plan STRING(50) NOT NULL,
  Status STRING(20) NOT NULL,
  BillingCycle STRING(20) NOT NULL,
  Amount NUMERIC NOT NULL,
  Currency STRING(3) NOT NULL,
  NextBillingDate DATE NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (SubscriptionID);

CREATE TABLE UsageMetrics (
  MetricID STRING(36) NOT NULL,
  TenantID STRING(36) NOT NULL,
  MetricType STRING(50) NOT NULL,
  Value INT64 NOT NULL,
  Period DATE NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TenantID, Period, MetricType, MetricID);

CREATE TABLE Invoices (
  InvoiceID STRING(36) NOT NULL,
  TenantID STRING(36) NOT NULL,
  Amount NUMERIC NOT NULL,
  Status STRING(20) NOT NULL,
  DueDate DATE NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (InvoiceID);
```

### Complex Test Scenario: Tenant Lifecycle

```typescript
// scenarios/enterprise-01-tenant-lifecycle/tests/tenant-lifecycle.spec.ts
import { test, expect } from '@playwright/test';
import { 
  validateDatabaseState,
  validateSecondaryDatabase 
} from '../../../tests/utils/sql-validator';
import { TenantManager } from '../../../tests/utils/tenant-manager';
import { BillingSimulator } from '../../../tests/utils/billing-simulator';

test.describe('Enterprise Tenant Lifecycle', () => {
  let tenantManager: TenantManager;
  let billingSimulator: BillingSimulator;
  
  test.beforeEach(async () => {
    tenantManager = new TenantManager();
    billingSimulator = new BillingSimulator();
  });

  test('complete tenant onboarding with billing setup', async ({ page }) => {
    const tenantData = {
      name: 'Acme Corp',
      domain: 'acme-corp.example.com',
      adminEmail: 'admin@acme-corp.com',
      plan: 'enterprise'
    };
    
    // 1. Tenant Registration
    await page.goto('/signup');
    await page.fill('[data-testid="company-name"]', tenantData.name);
    await page.fill('[data-testid="domain"]', tenantData.domain);
    await page.fill('[data-testid="admin-email"]', tenantData.adminEmail);
    await page.selectOption('[data-testid="plan"]', tenantData.plan);
    await page.click('[data-testid="start-trial"]');
    
    // Verify email verification step
    await expect(page.locator('.email-verification-notice')).toBeVisible();
    
    // Simulate email verification
    const verificationToken = await tenantManager.getVerificationToken(tenantData.adminEmail);
    await page.goto(`/verify?token=${verificationToken}`);
    await expect(page.locator('.verification-success')).toBeVisible();
    
    // 2. Complete Setup Wizard
    await page.click('[data-testid="continue-setup"]');
    
    // Organization details
    await page.fill('[data-testid="company-size"]', '100-500');
    await page.selectOption('[data-testid="industry"]', 'technology');
    await page.click('[data-testid="next-step"]');
    
    // Admin user profile
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Admin');
    await page.fill('[data-testid="password"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123!');
    await page.click('[data-testid="create-account"]');
    
    // 3. Billing Information
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.fill('[data-testid="billing-address"]', '123 Enterprise St');
    await page.click('[data-testid="save-billing"]');
    
    // Verify setup completion
    await expect(page.locator('.onboarding-complete')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // 4. Database Validation - User Service
    const tenantRecord = await validateDatabaseState(`
      SELECT t.TenantID, t.Name, t.Plan, t.Status,
             u.UserID, u.Email, u.Role
      FROM Tenants t
      JOIN Users u ON t.TenantID = u.TenantID
      WHERE t.Domain = '${tenantData.domain}'
        AND u.Role = 'admin'
    `);
    
    expect(tenantRecord).toHaveLength(1);
    expect(tenantRecord[0].Name).toBe(tenantData.name);
    expect(tenantRecord[0].Plan).toBe(tenantData.plan);
    expect(tenantRecord[0].Status).toBe('active');
    expect(tenantRecord[0].Email).toBe(tenantData.adminEmail);
    
    // 5. Database Validation - Billing Service
    const subscriptionRecord = await validateSecondaryDatabase(`
      SELECT s.SubscriptionID, s.TenantID, s.Plan, s.Status,
             s.Amount, s.Currency, s.BillingCycle
      FROM Subscriptions s
      WHERE s.TenantID = '${tenantRecord[0].TenantID}'
    `);
    
    expect(subscriptionRecord).toHaveLength(1);
    expect(subscriptionRecord[0].Plan).toBe(tenantData.plan);
    expect(subscriptionRecord[0].Status).toBe('active');
    expect(Number(subscriptionRecord[0].Amount)).toBeGreaterThan(0);
    
    // 6. Initial Usage Metrics
    const usageMetrics = await validateSecondaryDatabase(`
      SELECT MetricType, Value
      FROM UsageMetrics
      WHERE TenantID = '${tenantRecord[0].TenantID}'
        AND Period = CURRENT_DATE()
    `);
    
    expect(usageMetrics.length).toBeGreaterThan(0);
    const userCountMetric = usageMetrics.find(m => m.MetricType === 'active_users');
    expect(userCountMetric?.Value).toBe(1);
  });

  test('tenant upgrade with prorated billing', async ({ page }) => {
    // Start with existing basic plan tenant
    const tenantId = 'tenant-basic-001';
    
    // Login as tenant admin
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@basic-tenant.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login"]');
    
    // Navigate to billing
    await page.click('[data-testid="settings"]');
    await page.click('[data-testid="billing-tab"]');
    
    // Current plan verification
    await expect(page.locator('[data-testid="current-plan"]')).toHaveText('Basic');
    
    // Initiate upgrade
    await page.click('[data-testid="upgrade-plan"]');
    await page.click('[data-testid="select-professional"]');
    
    // Review upgrade details
    await expect(page.locator('[data-testid="upgrade-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="prorated-amount"]')).toBeVisible();
    
    // Confirm upgrade
    await page.click('[data-testid="confirm-upgrade"]');
    await expect(page.locator('.upgrade-success')).toBeVisible();
    
    // Validate subscription change
    const updatedSubscription = await validateSecondaryDatabase(`
      SELECT Plan, Status, Amount
      FROM Subscriptions
      WHERE TenantID = '${tenantId}'
      ORDER BY CreatedAt DESC
      LIMIT 1
    `);
    
    expect(updatedSubscription[0].Plan).toBe('professional');
    expect(updatedSubscription[0].Status).toBe('active');
    
    // Validate prorated invoice created
    const prorationInvoice = await validateSecondaryDatabase(`
      SELECT Amount, Status
      FROM Invoices
      WHERE TenantID = '${tenantId}'
        AND CreatedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
    `);
    
    expect(prorationInvoice).toHaveLength(1);
    expect(prorationInvoice[0].Status).toBe('paid');
  });

  test('usage-based billing calculation', async ({ page }) => {
    const tenantId = 'tenant-enterprise-001';
    
    // Simulate API usage throughout the day
    const usageData = [
      { type: 'api_calls', count: 1000, hour: 9 },
      { type: 'api_calls', count: 2500, hour: 14 },
      { type: 'storage_gb', count: 150, hour: 12 },
      { type: 'active_users', count: 45, hour: 16 }
    ];
    
    // Generate usage via API calls
    for (const usage of usageData) {
      await billingSimulator.recordUsage(tenantId, usage);
    }
    
    // Login and check usage dashboard
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'billing@enterprise-tenant.com');
    await page.click('[data-testid="login"]');
    
    await page.goto('/billing/usage');
    
    // Verify usage display
    await expect(page.locator('[data-testid="api-calls-today"]')).toHaveText('3,500');
    await expect(page.locator('[data-testid="storage-current"]')).toHaveText('150 GB');
    await expect(page.locator('[data-testid="active-users-peak"]')).toHaveText('45');
    
    // Validate usage metrics in database
    const todayUsage = await validateSecondaryDatabase(`
      SELECT MetricType, SUM(Value) as TotalValue
      FROM UsageMetrics
      WHERE TenantID = '${tenantId}'
        AND Period = CURRENT_DATE()
      GROUP BY MetricType
    `);
    
    const apiCallsUsage = todayUsage.find(m => m.MetricType === 'api_calls');
    expect(Number(apiCallsUsage?.TotalValue)).toBe(3500);
    
    const storageUsage = todayUsage.find(m => m.MetricType === 'storage_gb');
    expect(Number(storageUsage?.TotalValue)).toBe(150);
  });

  test('tenant suspension and data retention', async ({ page }) => {
    const tenantId = 'tenant-suspended-001';
    
    // Admin action: Suspend tenant for non-payment
    await page.goto('/admin/tenants');
    await page.fill('[data-testid="search"]', 'suspended-tenant.com');
    await page.click('[data-testid="search-button"]');
    
    await page.click('[data-testid="tenant-actions"]');
    await page.click('[data-testid="suspend-tenant"]');
    await page.fill('[data-testid="suspension-reason"]', 'Payment overdue');
    await page.click('[data-testid="confirm-suspension"]');
    
    // Verify tenant status updated
    const suspendedTenant = await validateDatabaseState(`
      SELECT Status, UpdatedAt
      FROM Tenants
      WHERE TenantID = '${tenantId}'
    `);
    expect(suspendedTenant[0].Status).toBe('suspended');
    
    // User attempts to login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@suspended-tenant.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login"]');
    
    // Verify suspension message
    await expect(page.locator('.account-suspended')).toBeVisible();
    await expect(page.locator('.contact-support')).toBeVisible();
    
    // Validate user sessions invalidated
    const activeSessions = await validateDatabaseState(`
      SELECT COUNT(*) as SessionCount
      FROM UserSessions
      WHERE TenantID = '${tenantId}'
        AND ExpiresAt > CURRENT_TIMESTAMP()
    `);
    expect(Number(activeSessions[0].SessionCount)).toBe(0);
    
    // Billing should reflect suspension
    const subscription = await validateSecondaryDatabase(`
      SELECT Status
      FROM Subscriptions
      WHERE TenantID = '${tenantId}'
    `);
    expect(subscription[0].Status).toBe('suspended');
  });
});
```

## E-Learning Platform

### Scenario: Course Completion with Certification

```typescript
test('course completion workflow with certification', async ({ page }) => {
  const studentId = 'student-001';
  const courseId = 'course-advanced-js';
  
  // Student login
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'student@university.edu');
  await page.click('[data-testid="login"]');
  
  // Start course
  await page.goto(`/courses/${courseId}`);
  await page.click('[data-testid="start-course"]');
  
  // Complete modules sequentially
  const modules = [
    { id: 'module-01', quiz: true, minScore: 80 },
    { id: 'module-02', quiz: false },
    { id: 'module-03', quiz: true, minScore: 85 },
    { id: 'module-04', assignment: true },
    { id: 'module-05', quiz: true, minScore: 90 }
  ];
  
  for (const module of modules) {
    await page.goto(`/courses/${courseId}/modules/${module.id}`);
    
    // Watch video content
    await page.click('[data-testid="play-video"]');
    await page.waitForTimeout(30000); // Simulate watching
    
    // Complete quiz if required
    if (module.quiz) {
      await page.click('[data-testid="take-quiz"]');
      
      // Answer questions (simulate correct answers)
      const questions = await page.locator('[data-testid^="question-"]').count();
      for (let i = 0; i < questions; i++) {
        await page.click(`[data-testid="question-${i}"] .correct-answer`);
      }
      
      await page.click('[data-testid="submit-quiz"]');
      
      // Verify minimum score achieved
      const scoreText = await page.locator('[data-testid="quiz-score"]').textContent();
      const score = parseInt(scoreText!.match(/\d+/)![0]);
      expect(score).toBeGreaterThanOrEqual(module.minScore!);
    }
    
    // Submit assignment if required
    if (module.assignment) {
      await page.click('[data-testid="submit-assignment"]');
      await page.setInputFiles('[data-testid="file-upload"]', './fixtures/sample-assignment.pdf');
      await page.fill('[data-testid="assignment-notes"]', 'Completed assignment with examples');
      await page.click('[data-testid="submit"]');
    }
    
    // Mark module complete
    await page.click('[data-testid="mark-complete"]');
  }
  
  // Verify course completion
  await expect(page.locator('.course-completed')).toBeVisible();
  await expect(page.locator('[data-testid="download-certificate"]')).toBeVisible();
  
  // Download certificate
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="download-certificate"]')
  ]);
  expect(download.suggestedFilename()).toMatch(/certificate.*\.pdf$/);
  
  // Validate completion in database
  const courseCompletion = await validateDatabaseState(`
    SELECT c.Status, c.CompletedAt, c.FinalScore,
           cert.CertificateID, cert.IssuedAt
    FROM CourseEnrollments c
    LEFT JOIN Certificates cert ON c.StudentID = cert.StudentID 
      AND c.CourseID = cert.CourseID
    WHERE c.StudentID = '${studentId}'
      AND c.CourseID = '${courseId}'
  `);
  
  expect(courseCompletion[0].Status).toBe('completed');
  expect(courseCompletion[0].FinalScore).toBeGreaterThanOrEqual(85);
  expect(courseCompletion[0].CertificateID).toBeTruthy();
  
  // Validate all module completions
  const moduleCompletions = await validateDatabaseState(`
    SELECT ModuleID, CompletedAt, Score
    FROM ModuleCompletions
    WHERE StudentID = '${studentId}'
      AND CourseID = '${courseId}'
    ORDER BY CompletedAt
  `);
  
  expect(moduleCompletions).toHaveLength(modules.length);
  modules.forEach((module, index) => {
    expect(moduleCompletions[index].ModuleID).toBe(module.id);
    if (module.quiz) {
      expect(moduleCompletions[index].Score).toBeGreaterThanOrEqual(module.minScore!);
    }
  });
});
```

## Healthcare Management System

### Scenario: Patient Record Management with Compliance

```typescript
test('patient record management with HIPAA compliance', async ({ page }) => {
  const patientId = 'patient-001';
  const providerId = 'provider-dr-smith';
  
  // Provider login with MFA
  await page.goto('/provider/login');
  await page.fill('[data-testid="email"]', 'dr.smith@hospital.com');
  await page.fill('[data-testid="password"]', 'SecurePassword123!');
  await page.click('[data-testid="login"]');
  
  // MFA verification
  await expect(page.locator('.mfa-required')).toBeVisible();
  const mfaCode = '123456'; // In real test, would use test MFA service
  await page.fill('[data-testid="mfa-code"]', mfaCode);
  await page.click('[data-testid="verify-mfa"]');
  
  // Access patient records
  await page.goto('/patients/search');
  await page.fill('[data-testid="patient-search"]', 'John Patient');
  await page.click('[data-testid="search"]');
  
  await page.click(`[data-testid="patient-${patientId}"]`);
  
  // View patient history (audit logged)
  await expect(page.locator('.patient-summary')).toBeVisible();
  await page.click('[data-testid="medical-history"]');
  
  // Add new visit record
  await page.click('[data-testid="new-visit"]');
  await page.fill('[data-testid="visit-reason"]', 'Annual checkup');
  await page.fill('[data-testid="diagnosis"]', 'Healthy, no concerns');
  await page.fill('[data-testid="treatment-plan"]', 'Continue current medications');
  await page.click('[data-testid="save-visit"]');
  
  // Prescribe medication
  await page.click('[data-testid="prescriptions"]');
  await page.click('[data-testid="new-prescription"]');
  await page.fill('[data-testid="medication"]', 'Lisinopril 10mg');
  await page.fill('[data-testid="dosage"]', 'Once daily');
  await page.fill('[data-testid="duration"]', '30 days');
  await page.click('[data-testid="prescribe"]');
  
  // Electronic signature required
  await page.fill('[data-testid="signature-password"]', 'SecurePassword123!');
  await page.click('[data-testid="sign-prescription"]');
  
  // Validate visit record created
  const visitRecord = await validateDatabaseState(`
    SELECT v.VisitID, v.ProviderID, v.PatientID, v.Reason, v.Diagnosis,
           p.MedicationName, p.Dosage, p.ProviderSignature
    FROM VisitRecords v
    LEFT JOIN Prescriptions p ON v.VisitID = p.VisitID
    WHERE v.PatientID = '${patientId}'
      AND v.ProviderID = '${providerId}'
    ORDER BY v.CreatedAt DESC
    LIMIT 1
  `);
  
  expect(visitRecord[0].Reason).toBe('Annual checkup');
  expect(visitRecord[0].MedicationName).toBe('Lisinopril 10mg');
  expect(visitRecord[0].ProviderSignature).toBeTruthy();
  
  // Validate HIPAA audit trail
  const auditTrail = await validateSecondaryDatabase(`
    SELECT Action, ResourceType, ResourceID, ProviderID, IPAddress
    FROM AuditLog
    WHERE PatientID = '${patientId}'
      AND ProviderID = '${providerId}'
      AND CreatedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
    ORDER BY CreatedAt
  `);
  
  const expectedActions = ['PATIENT_VIEWED', 'VISIT_CREATED', 'PRESCRIPTION_CREATED'];
  expect(auditTrail.length).toBeGreaterThanOrEqual(expectedActions.length);
  
  expectedActions.forEach((action, index) => {
    expect(auditTrail[index].Action).toBe(action);
    expect(auditTrail[index].IPAddress).toBeTruthy();
  });
});
```

## Performance Testing Utilities

### Load Testing Helper

```typescript
// tests/utils/load-test-helper.ts
export class LoadTestHelper {
  static async simulateConcurrentUsers(
    count: number,
    scenario: (page: Page, userIndex: number) => Promise<void>
  ) {
    const browser = await chromium.launch();
    const promises = [];
    
    for (let i = 0; i < count; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      promises.push(
        scenario(page, i).finally(() => context.close())
      );
    }
    
    await Promise.all(promises);
    await browser.close();
  }
  
  static async measureDatabasePerformance<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number; }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    return { result, duration };
  }
}

// Usage in tests
test('concurrent user login performance', async () => {
  const userCount = 50;
  const maxResponseTime = 5000; // 5 seconds
  
  const startTime = Date.now();
  
  await LoadTestHelper.simulateConcurrentUsers(userCount, async (page, index) => {
    const email = `user${index}@example.com`;
    
    await page.goto('/login');
    await page.fill('[data-testid="email"]', email);
    await page.fill('[data-testid="password"]', 'password123');
    
    const loginStart = performance.now();
    await page.click('[data-testid="login"]');
    await page.waitForSelector('[data-testid="dashboard"]');
    const loginDuration = performance.now() - loginStart;
    
    expect(loginDuration).toBeLessThan(maxResponseTime);
  });
  
  const totalDuration = Date.now() - startTime;
  console.log(`${userCount} concurrent logins completed in ${totalDuration}ms`);
  
  // Validate database performance
  const { duration: dbDuration } = await LoadTestHelper.measureDatabasePerformance(
    () => validateDatabaseState(`
      SELECT COUNT(*) as active_sessions
      FROM UserSessions
      WHERE ExpiresAt > CURRENT_TIMESTAMP()
    `)
  );
  
  expect(dbDuration).toBeLessThan(1000); // DB query under 1 second
});
```

## Error Handling and Recovery

### Resilience Testing

```typescript
test('system resilience during database errors', async ({ page }) => {
  // Simulate database timeout
  await page.route('**/api/**', async route => {
    if (Math.random() < 0.3) { // 30% chance of timeout
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    await route.continue();
  });
  
  // User should still be able to perform cached operations
  await page.goto('/dashboard');
  await expect(page.locator('.offline-indicator')).toBeVisible();
  
  // Cached data should be displayed
  await expect(page.locator('[data-testid="cached-data"]')).toBeVisible();
  
  // Operations should queue for later
  await page.click('[data-testid="update-profile"]');
  await page.fill('[data-testid="name"]', 'Updated Name');
  await page.click('[data-testid="save"]');
  
  await expect(page.locator('.queued-for-sync')).toBeVisible();
});
```

## CI/CD Integration

### Production-Ready Pipeline

```yaml
# .github/workflows/e2e-production.yml
name: Production E2E Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  production-smoke-tests:
    runs-on: ubuntu-latest
    environment: production
    
    strategy:
      matrix:
        region: [us-central1, europe-west1, asia-southeast1]
        
    steps:
      - uses: actions/checkout@v4
      
      - name: Run smoke tests
        env:
          SPANNER_PROJECT_ID: ${{ secrets.PROD_PROJECT_ID }}
          SPANNER_INSTANCE_ID: prod-${{ matrix.region }}
          BASE_URL: https://${{ matrix.region }}.app.com
        run: |
          make run-scenario SCENARIO=smoke-tests
          
      - name: Alert on failure
        if: failure()
        uses: ./.github/actions/alert-oncall
        with:
          region: ${{ matrix.region }}
          severity: critical
```

See [CI/CD Integration](../guide/ci-cd) for complete pipeline configuration and [Validation](../guide/validation) for advanced testing patterns.