# Contributing to PinStats

Thank you for considering contributing to PinStats! This document outlines the guidelines for contributing to this project.

## 🚀 Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/PinStats.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `npm test`
7. Commit your changes (see Commit Guidelines below)
8. Push to your fork: `git push origin feature/your-feature-name`
9. Create a Pull Request

## 📝 Commit Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: documentation changes
refactor: code refactoring
perf: performance improvements
test: add or update tests
chore: maintenance tasks
```

Examples:
- `feat: add reaction count to overlay`
- `fix: resolve memory leak in cache`
- `docs: update installation instructions`
- `perf: optimize DOM scanning algorithm`

## 🧪 Testing

All contributions must include tests:

```bash
# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:ci

# TDD mode
npm run tdd
```

**Requirements**:
- All tests must pass before submitting PR
- New features require new tests
- Bug fixes should include regression tests

## 🎨 Code Style

- TypeScript with strict mode
- Use existing code patterns
- Follow the project structure
- Add JSDoc comments for complex functions

**Pre-commit hooks** will automatically:
- Fix trailing whitespace
- Check for secrets/private keys
- Validate commit messages
- Run security scans (gitleaks)

## 🔍 Development Workflow

This project uses [beads](https://github.com/beadsd/beads) for task tracking:

```bash
bd ready              # Show available tasks
bd create "Task"      # Create new task
bd update <id>        # Update task status
bd close <id>         # Close task
```

## 📋 Pull Request Process

1. **Update documentation** if you change functionality
2. **Add tests** for new features
3. **Run full test suite**: `npm run test:ci`
4. **Build successfully**: `npm run build`
5. **Follow commit conventions**
6. **Describe your changes** clearly in the PR description

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests passing
- [ ] Build successful
- [ ] Conventional commit messages
- [ ] No security vulnerabilities introduced

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Chrome version**
2. **Extension version**
3. **Steps to reproduce**
4. **Expected behavior**
5. **Actual behavior**
6. **Console errors** (if any)
7. **Screenshots** (if applicable)

## 💡 Suggesting Features

Feature requests are welcome! Please:

1. **Check existing issues** first
2. **Describe the feature** clearly
3. **Explain the use case**
4. **Provide examples** if possible

## 🔒 Security

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email the maintainers directly
3. Wait for a response before disclosure

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md acknowledgments
- GitHub contributors page
- Release notes

Thank you for contributing to PinStats! 🎉
