# Installation

Complete installation guide for Spanwright and all required dependencies.

## Prerequisites

Spanwright requires several external tools to function properly. Follow this guide to install everything you need.

### System Requirements

- **Operating System**: macOS, Linux, or Windows (with WSL2)
- **Node.js**: 22.0.0 or higher
- **Docker**: For running Cloud Spanner emulator
- **Go**: 1.24.5 or higher (for database tools)
- **Git**: For version control

### Node.js Installation

#### Using Node Version Manager (Recommended)

**For macOS/Linux:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then install Node.js
nvm install 22
nvm use 22
```

**For Windows:**
```bash
# Install nvm-windows from: https://github.com/coreybutler/nvm-windows
# Then run:
nvm install 22.0.0
nvm use 22.0.0
```

#### Direct Installation

Download from [nodejs.org](https://nodejs.org/) and install Node.js 22.0.0 or higher.

**Verify installation:**
```bash
node --version  # Should show v22.x.x or higher
npm --version   # Should show 10.x.x or higher
```

### Docker Installation

Docker is required to run the Cloud Spanner emulator.

#### macOS
```bash
# Using Homebrew
brew install --cask docker

# Or download from https://docker.com/products/docker-desktop
```

#### Linux (Ubuntu/Debian)
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Windows
Download Docker Desktop from [docker.com](https://docker.com/products/docker-desktop)

**Verify installation:**
```bash
docker --version
docker run hello-world
```

### Go Installation

#### Using Package Manager

**macOS:**
```bash
brew install go
```

**Linux:**
```bash
# Download and install
wget https://go.dev/dl/go1.24.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.5.linux-amd64.tar.gz

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH=$PATH:/usr/local/go/bin
```

**Windows:**
Download installer from [go.dev](https://go.dev/dl/)

**Verify installation:**
```bash
go version  # Should show go1.24.5 or higher
```

### Required Go Tools

Install the additional Go tools that Spanwright projects use:

#### wrench (Cloud Spanner Schema Migration Tool)
```bash
go install github.com/cloudspannerecosystem/wrench@latest
```

#### spalidate (Database Validation Tool)
```bash
# Clone and install spalidate
git clone https://github.com/nu0ma/spalidate.git
cd spalidate
go install ./cmd/spalidate
```

**Verify Go tools:**
```bash
wrench --version
spalidate --version
```

## Installing Spanwright

### Global Installation (Recommended)

Install Spanwright globally to use it anywhere:

```bash
npm install -g spanwright
```

**Verify installation:**
```bash
spanwright --version
spanwright --help
```

### Using npx (No Installation)

You can use Spanwright without installing it globally:

```bash
npx spanwright your-project-name
```

## Version Management Tools (Optional)

For managing multiple versions of Node.js and Go:

### mise (Recommended)

mise is a universal tool version manager:

```bash
# Install mise
curl https://mise.run | sh

# Add to shell profile
echo 'eval "$(mise activate bash)"' >> ~/.bashrc  # for bash
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc    # for zsh

# Install tools from project files
cd your-spanwright-project
mise install
```

### asdf

Alternative version manager:

```bash
# Install asdf
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.13.1

# Add plugins
asdf plugin add nodejs
asdf plugin add golang

# Install from .tool-versions
asdf install
```

## Platform-Specific Notes

### macOS

**Apple Silicon (M1/M2):**
- Docker and Go have native ARM64 support
- All tools work natively without Rosetta

**Intel Macs:**
- Standard x86_64 installation

### Linux

**Ubuntu/Debian:**
```bash
# Install additional dependencies
sudo apt update
sudo apt install -y curl wget git build-essential
```

**RHEL/CentOS/Fedora:**
```bash
# Install additional dependencies
sudo dnf install -y curl wget git gcc gcc-c++ make
```

### Windows

**WSL2 Setup (Recommended):**
```bash
# Install WSL2 Ubuntu
wsl --install -d Ubuntu

# Inside WSL2, follow Linux installation steps
```

**Native Windows:**
- Install tools using Chocolatey or Scoop
- Docker Desktop required
- Git Bash recommended for terminal

## Verification

After installing all prerequisites, verify your setup:

```bash
# Check versions
node --version    # >= 22.0.0
npm --version     # >= 10.0.0
docker --version  # Any recent version
go version        # >= 1.24.5
wrench --version  # Latest
spalidate --version # Latest

# Test Docker
docker run hello-world

# Test Spanwright
spanwright --help
```

## Troubleshooting

### Common Issues

**Docker permission denied:**
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Go tools not found:**
```bash
# Ensure GOPATH/bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

**Node.js version issues:**
```bash
# Use nvm to switch versions
nvm install 22
nvm use 22
```

**Docker Spanner emulator issues:**
```bash
# Pull latest emulator image
docker pull gcr.io/cloud-spanner-emulator/emulator:latest
```

## Next Steps

Once everything is installed:

1. **[Quick Start Guide](./quick-start)** - Create your first project in 5 minutes
2. **[Project Structure](./project-structure)** - Understand generated project layout
3. **[Configuration](#)** - Learn about project configuration options (Coming Soon)

## Getting Help

- **GitHub Issues**: [Report installation problems](https://github.com/nu0ma/spanwright/issues)
- **Documentation**: [Full documentation site](https://nu0ma.github.io/spanwright)
- **Community**: [Join discussions](https://github.com/nu0ma/spanwright/discussions)