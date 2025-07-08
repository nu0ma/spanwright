# Security Policy

## Supported Versions

We actively maintain security for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. **DO** send an email to the project maintainer at the email address listed in the package.json
3. **DO** include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity, typically 30 days for critical issues

### Security Best Practices

#### For Users
- Keep Spanwright updated to the latest version
- Review generated project templates before use
- Use environment variables for sensitive configuration
- Never commit `.env` files to version control
- Regularly update dependencies in generated projects

#### For Contributors
- Follow secure coding practices
- Validate all user inputs
- Avoid hardcoding sensitive information
- Use parameterized queries in database operations
- Implement proper error handling without exposing sensitive data

## Known Security Considerations

### Generated Projects
- **Database Credentials**: Generated projects use environment variables for database configuration
- **Test Data**: Seed data files contain example data only, not real user information
- **Docker Integration**: Spanner emulator runs in containers with limited network access
- **File Permissions**: Generated scripts and binaries should have appropriate permissions

### Template Security
- **Path Validation**: Template paths are validated to prevent directory traversal
- **Input Sanitization**: User inputs are sanitized in generated configuration files
- **Dependency Management**: Dependencies are pinned to specific versions where possible

### Development Environment
- **Environment Variables**: Sensitive development configuration is kept in `.env` files that are gitignored
- **Docker Isolation**: Emulator containers are isolated from the host system

## Security Features

### Built-in Protections
- **Input Validation**: Project names and configuration values are validated
- **Path Sanitization**: File paths are sanitized to prevent directory traversal
- **Template Validation**: All template files are validated for syntax and security
- **Environment Isolation**: Development and production environments are clearly separated

### Recommended Practices
- **Regular Updates**: Keep dependencies updated in both the CLI and generated projects
- **Environment Separation**: Use different configurations for development, testing, and production
- **Access Control**: Implement proper access controls for Spanner databases
- **Monitoring**: Monitor generated applications for security issues

## Disclosure Policy

We follow responsible disclosure practices:

1. **Private Disclosure**: Security issues are disclosed privately first
2. **Coordinated Release**: Fixes are coordinated with security researchers
3. **Public Disclosure**: Details are shared publicly only after fixes are available
4. **Attribution**: Security researchers are credited (with permission)

## Security Resources

- [Cloud Spanner Security Best Practices](https://cloud.google.com/spanner/docs/security-best-practices)
- [Docker Security Guidelines](https://docs.docker.com/engine/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Go Security Guidelines](https://golang.org/doc/security)

## Contact

For security-related questions or concerns, please contact:
- Email: [See package.json for maintainer contact]
- Response Time: 48 hours for initial response

Thank you for helping keep Spanwright secure!