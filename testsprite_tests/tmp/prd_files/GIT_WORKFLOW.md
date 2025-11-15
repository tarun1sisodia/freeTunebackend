# Git Workflow & Branch Strategy

## Branch Structure

```
main (production)
  ├── develop (development)
  │   ├── feature/song-streaming
  │   ├── feature/user-auth
  │   ├── feature/recommendations
  │   └── bugfix/cache-issue
  └── hotfix/critical-security-fix
```

## Branch Naming Convention

### Feature Branches
```bash
feature/descriptive-feature-name
# Example: feature/song-search-api
```

### Bugfix Branches
```bash
bugfix/descriptive-bug-name
# Example: bugfix/redis-connection-error
```

### Hotfix Branches
```bash
hotfix/critical-issue-name
# Example: hotfix/auth-token-leak
```

## Workflow

### 1. Starting a New Feature

```bash
# Switch to develop
git checkout develop

# Pull latest changes
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# ... make changes ...

# Add and commit
git add .
git commit -m "feat: add your feature description"
```

### 2. Committing Changes

Use conventional commit messages:

```bash
# Features
git commit -m "feat: add song streaming endpoint"

# Bug fixes
git commit -m "fix: resolve redis connection timeout"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: improve error handling"

# Tests
git commit -m "test: add unit tests for song service"

# Chores
git commit -m "chore: update dependencies"
```

### 3. Pushing Changes

```bash
# Push feature branch
git push origin feature/your-feature-name
```

### 4. Creating Pull Request

1. Go to GitHub
2. Create Pull Request from `feature/your-feature-name` to `develop`
3. Add description of changes
4. Request review
5. Wait for CI/CD checks to pass

### 5. Merging

```bash
# After PR approval, merge to develop
# GitHub will handle this through PR interface

# Delete feature branch after merge
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### 6. Deploying to Production

```bash
# Merge develop to main
git checkout main
git pull origin main
git merge develop
git push origin main

# Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Emergency Hotfix

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-issue

# Fix the issue
# ... make changes ...

# Commit
git commit -m "hotfix: fix critical security issue"

# Merge to main
git checkout main
git merge hotfix/critical-issue
git push origin main

# Merge to develop
git checkout develop
git merge hotfix/critical-issue
git push origin develop

# Delete hotfix branch
git branch -d hotfix/critical-issue
```

## Resolving Conflicts

```bash
# If conflicts occur during merge
git checkout develop
git pull origin develop

# Merge your feature branch
git merge feature/your-feature-name

# Fix conflicts in files
# ... resolve conflicts ...

# Add resolved files
git add .

# Complete merge
git commit -m "merge: resolve conflicts in feature"

# Push
git push origin develop
```

## Best Practices

1. **Always pull before creating a new branch**
2. **Keep commits small and focused**
3. **Write descriptive commit messages**
4. **Test before pushing**
5. **Keep feature branches short-lived**
6. **Never commit directly to main**
7. **Always use Pull Requests**
8. **Review code before merging**
9. **Delete branches after merging**
10. **Tag releases**

## .gitignore

Already configured to ignore:
- `node_modules/`
- `.env` files
- `logs/`
- IDE files
- OS files
- Build artifacts

## Protected Branches

Configure on GitHub:
- `main`: Require PR reviews, passing CI checks
- `develop`: Require PR reviews

---

## Quick Commands Reference

```bash
# Check current branch
git branch

# Check status
git status

# View recent commits
git log --oneline -10

# Stash changes
git stash
git stash pop

# Discard changes
git checkout -- filename
git reset --hard HEAD

# View diff
git diff
git diff --staged
```
