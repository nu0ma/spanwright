# Docker Security Configuration

This document explains the security measures implemented for the Spanner emulator container.

## Security Measures

### 1. Non-Root User
- **Setting**: `--user 1000:1000`
- **Purpose**: Prevents privilege escalation attacks by running as non-root user
- **Impact**: Container processes run with limited privileges

### 2. Capability Restrictions
- **Setting**: `--cap-drop=ALL --cap-add=NET_BIND_SERVICE`
- **Purpose**: Removes all Linux capabilities except network binding
- **Impact**: Limits what the container can do on the host system

### 3. Privilege Escalation Prevention
- **Setting**: `--security-opt=no-new-privileges:true`
- **Purpose**: Prevents processes from gaining new privileges
- **Impact**: Blocks setuid/setgid-based attacks

### 4. Resource Limits
- **Setting**: `--memory=2g --cpus=2`
- **Purpose**: Prevents resource exhaustion attacks
- **Impact**: Limits container resource usage

### 5. Network Isolation
- **Setting**: `-p 127.0.0.1:9010:9010`
- **Purpose**: Binds to localhost only, preventing external access
- **Impact**: Emulator only accessible from local machine

## Usage

### Using Make (Default)
```bash
make start    # Uses security-hardened configuration
make stop     # Stops the container
```

### Using Docker Compose
```bash
make compose-up     # Start with Docker Compose
make compose-down   # Stop with Docker Compose
```

### Manual Docker Command
```bash
docker run -d --name spanner-emulator \
    --user 1000:1000 \
    --cap-drop=ALL \
    --cap-add=NET_BIND_SERVICE \
    --security-opt=no-new-privileges:true \
    --memory=2g \
    --cpus=2 \
    -p 127.0.0.1:9010:9010 \
    gcr.io/cloud-spanner-emulator/emulator
```

## Security Benefits

- **Reduced Attack Surface**: Limited capabilities and non-root execution
- **Resource Protection**: Prevents DoS through resource exhaustion
- **Network Isolation**: Localhost-only access prevents external attacks
- **Privilege Containment**: Prevents privilege escalation

## Development Impact

These security measures maintain full functionality while improving security posture. The emulator works exactly as before but with better security isolation.