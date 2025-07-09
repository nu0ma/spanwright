package spanwright

import (
	"testing"
)

func TestValidateProjectID(t *testing.T) {
	tests := []struct {
		name      string
		projectID string
		wantErr   bool
	}{
		{
			name:      "valid project ID",
			projectID: "test-project-123",
			wantErr:   false,
		},
		{
			name:      "empty project ID",
			projectID: "",
			wantErr:   true,
		},
		{
			name:      "invalid characters in project ID",
			projectID: "test_project_123",
			wantErr:   true,
		},
		{
			name:      "starts with number",
			projectID: "1test-project",
			wantErr:   true,
		},
		{
			name:      "ends with hyphen",
			projectID: "test-project-",
			wantErr:   true,
		},
		{
			name:      "path traversal attempt",
			projectID: "test-project/../admin",
			wantErr:   true,
		},
		{
			name:      "contains slash",
			projectID: "test/project",
			wantErr:   true,
		},
		{
			name:      "contains backslash",
			projectID: "test\\project",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateProjectID(tt.projectID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateProjectID() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateInstanceID(t *testing.T) {
	tests := []struct {
		name       string
		instanceID string
		wantErr    bool
	}{
		{
			name:       "valid instance ID",
			instanceID: "test-instance",
			wantErr:    false,
		},
		{
			name:       "empty instance ID",
			instanceID: "",
			wantErr:    true,
		},
		{
			name:       "too short instance ID",
			instanceID: "t",
			wantErr:    true,
		},
		{
			name:       "too long instance ID",
			instanceID: "this-is-a-very-long-instance-id-that-exceeds-the-maximum-length-allowed-for-spanner-instances",
			wantErr:    true,
		},
		{
			name:       "invalid characters in instance ID",
			instanceID: "test_instance",
			wantErr:    true,
		},
		{
			name:       "starts with number",
			instanceID: "1test-instance",
			wantErr:    true,
		},
		{
			name:       "path traversal attempt",
			instanceID: "test-instance/../admin",
			wantErr:    true,
		},
		{
			name:       "contains slash",
			instanceID: "test/instance",
			wantErr:    true,
		},
		{
			name:       "contains backslash",
			instanceID: "test\\instance",
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateInstanceID(tt.instanceID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateInstanceID() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateDatabaseID(t *testing.T) {
	tests := []struct {
		name       string
		databaseID string
		wantErr    bool
	}{
		{
			name:       "valid database ID",
			databaseID: "test-db",
			wantErr:    false,
		},
		{
			name:       "valid database ID with underscore",
			databaseID: "test_db",
			wantErr:    false,
		},
		{
			name:       "empty database ID",
			databaseID: "",
			wantErr:    true,
		},
		{
			name:       "too short database ID",
			databaseID: "t",
			wantErr:    true,
		},
		{
			name:       "too long database ID",
			databaseID: "this-is-a-very-long-database-id-that-exceeds-maximum-length",
			wantErr:    true,
		},
		{
			name:       "starts with number",
			databaseID: "1test-db",
			wantErr:    true,
		},
		{
			name:       "path traversal attempt",
			databaseID: "test-db/../admin",
			wantErr:    true,
		},
		{
			name:       "contains slash",
			databaseID: "test/db",
			wantErr:    true,
		},
		{
			name:       "contains backslash",
			databaseID: "test\\db",
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateDatabaseID(tt.databaseID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateDatabaseID() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTableName(t *testing.T) {
	tests := []struct {
		name      string
		tableName string
		wantErr   bool
	}{
		{
			name:      "valid table name",
			tableName: "Users",
			wantErr:   false,
		},
		{
			name:      "valid table name with underscore",
			tableName: "user_profiles",
			wantErr:   false,
		},
		{
			name:      "valid table name with hyphen",
			tableName: "user-profiles",
			wantErr:   false,
		},
		{
			name:      "empty table name",
			tableName: "",
			wantErr:   true,
		},
		{
			name:      "too long table name",
			tableName: "this_is_a_very_long_table_name_that_exceeds_the_maximum_length_allowed_for_spanner_table_names_and_should_be_rejected_by_validation",
			wantErr:   true,
		},
		{
			name:      "starts with number",
			tableName: "1users",
			wantErr:   true,
		},
		{
			name:      "path traversal attempt",
			tableName: "users/../admin",
			wantErr:   true,
		},
		{
			name:      "contains slash",
			tableName: "users/admin",
			wantErr:   true,
		},
		{
			name:      "contains backslash",
			tableName: "users\\admin",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - SELECT",
			tableName: "users_select",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - DROP",
			tableName: "users_drop",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - DELETE",
			tableName: "users_delete",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - UPDATE",
			tableName: "users_update",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - INSERT",
			tableName: "users_insert",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - UNION",
			tableName: "users_union",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - EXEC",
			tableName: "users_exec",
			wantErr:   true,
		},
		{
			name:      "SQL injection attempt - SCRIPT",
			tableName: "users_script",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTableName(tt.tableName)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTableName() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestBuildSecureDSN(t *testing.T) {
	tests := []struct {
		name       string
		projectID  string
		instanceID string
		databaseID string
		want       string
		wantErr    bool
	}{
		{
			name:       "valid DSN construction",
			projectID:  "test-project",
			instanceID: "test-instance",
			databaseID: "test-db",
			want:       "projects/test-project/instances/test-instance/databases/test-db",
			wantErr:    false,
		},
		{
			name:       "invalid project ID",
			projectID:  "test/../admin",
			instanceID: "test-instance",
			databaseID: "test-db",
			want:       "",
			wantErr:    true,
		},
		{
			name:       "invalid instance ID",
			projectID:  "test-project",
			instanceID: "test/../admin",
			databaseID: "test-db",
			want:       "",
			wantErr:    true,
		},
		{
			name:       "invalid database ID",
			projectID:  "test-project",
			instanceID: "test-instance",
			databaseID: "test/../admin",
			want:       "",
			wantErr:    true,
		},
		{
			name:       "empty project ID",
			projectID:  "",
			instanceID: "test-instance",
			databaseID: "test-db",
			want:       "",
			wantErr:    true,
		},
		{
			name:       "empty instance ID",
			projectID:  "test-project",
			instanceID: "",
			databaseID: "test-db",
			want:       "",
			wantErr:    true,
		},
		{
			name:       "empty database ID",
			projectID:  "test-project",
			instanceID: "test-instance",
			databaseID: "",
			want:       "",
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := BuildSecureDSN(tt.projectID, tt.instanceID, tt.databaseID)
			if (err != nil) != tt.wantErr {
				t.Errorf("BuildSecureDSN() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("BuildSecureDSN() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidateEnvironment(t *testing.T) {
	tests := []struct {
		name        string
		environment string
		wantErr     bool
	}{
		{
			name:        "valid development environment",
			environment: "development",
			wantErr:     false,
		},
		{
			name:        "valid test environment",
			environment: "test",
			wantErr:     false,
		},
		{
			name:        "valid staging environment",
			environment: "staging",
			wantErr:     false,
		},
		{
			name:        "valid development environment uppercase",
			environment: "DEVELOPMENT",
			wantErr:     false,
		},
		{
			name:        "invalid production environment",
			environment: "production",
			wantErr:     true,
		},
		{
			name:        "invalid live environment",
			environment: "live",
			wantErr:     true,
		},
		{
			name:        "empty environment",
			environment: "",
			wantErr:     true,
		},
		{
			name:        "invalid random environment",
			environment: "random",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateEnvironment(tt.environment)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateEnvironment() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateEmulatorHost(t *testing.T) {
	tests := []struct {
		name         string
		emulatorHost string
		wantErr      bool
	}{
		{
			name:         "valid localhost",
			emulatorHost: "localhost:9010",
			wantErr:      false,
		},
		{
			name:         "valid 127.0.0.1",
			emulatorHost: "127.0.0.1:9010",
			wantErr:      false,
		},
		{
			name:         "empty emulator host",
			emulatorHost: "",
			wantErr:      true,
		},
		{
			name:         "production host",
			emulatorHost: "spanner.googleapis.com",
			wantErr:      true,
		},
		{
			name:         "external host",
			emulatorHost: "example.com:9010",
			wantErr:      true,
		},
		{
			name:         "path traversal attempt",
			emulatorHost: "localhost/../admin:9010",
			wantErr:      true,
		},
		{
			name:         "command injection attempt",
			emulatorHost: "localhost:9010;rm -rf /",
			wantErr:      true,
		},
		{
			name:         "ampersand injection attempt",
			emulatorHost: "localhost:9010&echo malicious",
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateEmulatorHost(tt.emulatorHost)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateEmulatorHost() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestSecureConfigValidation(t *testing.T) {
	tests := []struct {
		name   string
		config *SecureConfig
		wantErr bool
	}{
		{
			name: "valid secure config",
			config: &SecureConfig{
				ProjectID:     "test-project",
				InstanceID:    "test-instance",
				EmulatorHost:  "localhost:9010",
				PrimaryDB:     "test-db",
				PrimarySchema: "scenarios/example-01-basic-setup",
				Environment:   "development",
				Timeout:       120,
			},
			wantErr: false,
		},
		{
			name: "invalid project ID in secure config",
			config: &SecureConfig{
				ProjectID:     "prod-project",
				InstanceID:    "test-instance",
				EmulatorHost:  "localhost:9010",
				PrimaryDB:     "test-db",
				PrimarySchema: "scenarios/example-01-basic-setup",
				Environment:   "development",
				Timeout:       120,
			},
			wantErr: true,
		},
		{
			name: "invalid environment in secure config",
			config: &SecureConfig{
				ProjectID:     "test-project",
				InstanceID:    "test-instance",
				EmulatorHost:  "localhost:9010",
				PrimaryDB:     "test-db",
				PrimarySchema: "scenarios/example-01-basic-setup",
				Environment:   "production",
				Timeout:       120,
			},
			wantErr: true,
		},
		{
			name: "invalid timeout in secure config",
			config: &SecureConfig{
				ProjectID:     "test-project",
				InstanceID:    "test-instance",
				EmulatorHost:  "localhost:9010",
				PrimaryDB:     "test-db",
				PrimarySchema: "scenarios/example-01-basic-setup",
				Environment:   "development",
				Timeout:       5000,
			},
			wantErr: true,
		},
		{
			name: "invalid emulator host in secure config",
			config: &SecureConfig{
				ProjectID:     "test-project",
				InstanceID:    "test-instance",
				EmulatorHost:  "spanner.googleapis.com",
				PrimaryDB:     "test-db",
				PrimarySchema: "scenarios/example-01-basic-setup",
				Environment:   "development",
				Timeout:       120,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.ValidateSecure()
			if (err != nil) != tt.wantErr {
				t.Errorf("SecureConfig.ValidateSecure() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}