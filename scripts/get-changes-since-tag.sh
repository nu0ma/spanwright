#!/bin/bash

# Get changes since the last tag for changelog generation
set -e

# Get repository info from package.json
REPO_URL=$(node -p "require('./package.json').repository?.url || ''" 2>/dev/null)
REPO_OWNER=""
REPO_NAME=""

if [[ $REPO_URL =~ github\.com[/:]+([^/]+)/([^/.]+) ]]; then
    REPO_OWNER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
fi

# Get the latest tag
LATEST_TAG=$(git tag --sort=-version:refname | head -n 1)
if [ -z "$LATEST_TAG" ]; then
    RANGE="HEAD"
else
    RANGE="$LATEST_TAG..HEAD"
fi

# Parse arguments
VERSION=""
FULL_CHANGELOG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --full)
            FULL_CHANGELOG=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Set version for output
if [ -z "$VERSION" ]; then
    VERSION="Unreleased"
fi

# Get commits since last tag
get_commits() {
    git log $RANGE --pretty=format:"%H|%s|%b|%an|%ae|%ad" --date=short 2>/dev/null || echo ""
}

# Parse commit type from subject
get_commit_type() {
    local subject="$1"
    
    # Check conventional commit format
    if [[ $subject =~ ^(feat|fix|docs|style|refactor|test|chore|template)(\([^\)]+\))?!?:\ .* ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ ${subject,,} =~ feat|add ]]; then
        echo "feat"
    elif [[ ${subject,,} =~ fix ]]; then
        echo "fix"
    elif [[ ${subject,,} =~ template ]]; then
        echo "template"
    elif [[ ${subject,,} =~ docs ]]; then
        echo "docs"
    elif [[ ${subject,,} =~ test ]]; then
        echo "test"
    else
        echo "chore"
    fi
}

# Check if commit is breaking
is_breaking() {
    local subject="$1"
    local body="$2"
    
    if [[ $subject =~ ! ]] || [[ $subject =~ "BREAKING CHANGE" ]] || [[ $body =~ "BREAKING CHANGE" ]]; then
        echo "true"
    else
        echo "false"
    fi
}

# Extract PR number from subject
get_pr_number() {
    local subject="$1"
    if [[ $subject =~ \(#([0-9]+)\) ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
}

# Format commit for changelog
format_commit() {
    local sha="$1"
    local subject="$2"
    local pr_number="$3"
    
    # Remove PR number from subject
    subject=$(echo "$subject" | sed 's/ (#[0-9]\+)//g')
    
    # Extract scope if present
    local scope=""
    if [[ $subject =~ ^[^:]+\(([^\)]+)\): ]]; then
        scope="**${BASH_REMATCH[1]}**: "
        subject=$(echo "$subject" | sed 's/^[^:]\+([^)]\+): //')
    else
        subject=$(echo "$subject" | sed 's/^[^:]\+: //')
    fi
    
    # Build commit line
    local line="- ${scope}${subject}"
    
    # Add PR link if available
    if [ -n "$pr_number" ] && [ -n "$REPO_OWNER" ] && [ -n "$REPO_NAME" ]; then
        line="$line ([#$pr_number](https://github.com/$REPO_OWNER/$REPO_NAME/pull/$pr_number))"
    fi
    
    # Add commit link
    if [ -n "$REPO_OWNER" ] && [ -n "$REPO_NAME" ]; then
        line="$line ([${sha:0:7}](https://github.com/$REPO_OWNER/$REPO_NAME/commit/${sha:0:7}))"
    else
        line="$line (${sha:0:7})"
    fi
    
    echo "$line"
}

# Generate changelog
generate_changelog() {
    local commits=$(get_commits)
    
    if [ -z "$commits" ]; then
        echo "No changes since last tag."
        return
    fi
    
    # Arrays for different commit types
    declare -a breaking=()
    declare -a features=()
    declare -a fixes=()
    declare -a templates=()
    declare -a docs=()
    declare -a tests=()
    declare -a chores=()
    
    # Process each commit
    while IFS='|' read -r sha subject body author email date; do
        [ -z "$sha" ] && continue
        
        local type=$(get_commit_type "$subject")
        local is_break=$(is_breaking "$subject" "$body")
        local pr_num=$(get_pr_number "$subject")
        local formatted=$(format_commit "$sha" "$subject" "$pr_num")
        
        if [ "$is_break" = "true" ]; then
            breaking+=("$formatted")
        elif [ "$type" = "feat" ]; then
            features+=("$formatted")
        elif [ "$type" = "fix" ]; then
            fixes+=("$formatted")
        elif [ "$type" = "template" ]; then
            templates+=("$formatted")
        elif [ "$type" = "docs" ]; then
            docs+=("$formatted")
        elif [ "$type" = "test" ]; then
            tests+=("$formatted")
        else
            chores+=("$formatted")
        fi
    done <<< "$commits"
    
    # Output changelog
    echo "## [$VERSION] - $(date +%Y-%m-%d)"
    echo
    
    # Breaking changes
    if [ ${#breaking[@]} -gt 0 ]; then
        echo "### ⚠️ BREAKING CHANGES"
        printf '%s\n' "${breaking[@]}"
        echo
    fi
    
    # Features
    if [ ${#features[@]} -gt 0 ]; then
        echo "### ✨ Features"
        printf '%s\n' "${features[@]}"
        echo
    fi
    
    # Bug fixes
    if [ ${#fixes[@]} -gt 0 ]; then
        echo "### 🐛 Bug Fixes"
        printf '%s\n' "${fixes[@]}"
        echo
    fi
    
    # Templates
    if [ ${#templates[@]} -gt 0 ]; then
        echo "### 📝 Templates"
        printf '%s\n' "${templates[@]}"
        echo
    fi
    
    # Documentation
    if [ ${#docs[@]} -gt 0 ]; then
        echo "### 📚 Documentation"
        printf '%s\n' "${docs[@]}"
        echo
    fi
    
    # Tests
    if [ ${#tests[@]} -gt 0 ]; then
        echo "### 🧪 Tests"
        printf '%s\n' "${tests[@]}"
        echo
    fi
    
    # Chores
    if [ ${#chores[@]} -gt 0 ]; then
        echo "### 🔧 Chores"
        printf '%s\n' "${chores[@]}"
        echo
    fi
}

# Main execution
if [ "$FULL_CHANGELOG" = true ]; then
    cat << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
fi

generate_changelog