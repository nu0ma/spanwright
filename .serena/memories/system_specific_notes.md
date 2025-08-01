# System-Specific Notes (Darwin/macOS)

## macOS-Specific Considerations

### System Commands
- **Standard Unix tools available**: `ls`, `cd`, `grep`, `find`, `mkdir`, `rm`
- **Path handling**: Uses `/` as path separator (POSIX-compliant)
- **Case sensitivity**: macOS filesystem is case-insensitive by default

### Docker on macOS
- **Docker Desktop required**: Native Docker daemon
- **Port forwarding**: Works seamlessly for Spanner emulator (ports 9010, 9020)
- **Volume mounting**: Used for schema files and test data

### Go Installation Options
1. **mise** (recommended): `mise install` reads from `.mise.toml`
2. **asdf**: `asdf install` reads from `.tool-versions`  
3. **Homebrew**: `brew install go`
4. **Manual**: Download from golang.org

### Development Environment
- **Terminal**: Any POSIX-compliant shell (bash, zsh)
- **File permissions**: Standard Unix permissions (755 for directories, 644 for files)
- **Temporary directories**: Uses `/tmp` with proper cleanup

### Tool Dependencies
- **wrench**: Install via `go install github.com/cloudspannerecosystem/wrench@latest`
- **spalidate**: Install from github.com/nu0ma/spalidate
- **Node.js**: Version 22.15.1+ required (use nvm, mise, or direct install)

### Common Paths
- **Project root**: `/Users/<username>/src/github.com/nu0ma/spanwright`
- **Temp directories**: `/tmp/spanwright-*` (auto-cleanup)
- **Docker volumes**: Mounted to container paths for emulator access

### Performance Notes
- **SSD optimization**: Fast file I/O for template copying
- **Memory usage**: Docker containers need adequate memory allocation
- **Network**: Local emulator runs on localhost ports