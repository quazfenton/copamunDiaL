---
name: project-enhancer
description: Analyze and enhance project code quality, architecture, and functionality with detailed improvement plans and enhanced project copies.
compatibility: Created for Zo Computer
metadata:
  author: veli.zo.computer
  version: 1.0.0
---
# Project Enhancer Skill

This skill analyzes projects and generates comprehensive improvement plans with enhanced project copies.

## What This Skill Does

1. **Scans** a project directory structure and identifies all files
2. **Reads** code files to understand architecture, patterns, and quality
3. **Analyzes** technical debt, missing features, performance issues, and best practices
4. **Generates** detailed improvement plans with prioritized steps
5. **Creates** an enhanced copy of the project with improvements applied

## When to Use This Skill

- You have a project and want to know what improvements to make
- You want to refactor code for better maintainability
- You want to add missing features or capabilities
- You want to upgrade the project to modern best practices
- You want to create a production-grade version of your project

## Running the Skill

Run the `enhance` script using npm or bun:
```bash
# Using npm (Node.js)
npm run enhance -- --project <path> --output <output-path>

# Using npx directly
npx tsx scripts/enhancer.ts --project <path> --output <output-path>

# Using bun (if available)
bun run scripts/enhancer.ts --project <path> --output <output-path>
```

**Options:**
- `--project <path>`: Path to the project to analyze (required)
- `--output <path>`: Where to create the enhanced copy (defaults to project-enhanced)
- `--verbose`: Show detailed analysis output
- `--dry-run`: Analyze but don't create enhanced copy

**Example:**
```bash
cd project-enhancer
npm run enhance -- --project "../my-project" --output "../my-project-enhanced"

# Or with verbose output
npm run enhance:verbose -- --project "C:/path/to/project"

# Dry run (analyze only)
npm run enhance:dry-run -- --project "C:/path/to/project"
```

## What the Enhancement Includes

### Code Quality Improvements
- Better variable naming and structure
- More descriptive comments and documentation
- Consistent formatting and styling
- Type safety improvements (TypeScript annotations, type hints)
- Error handling and edge cases

### Architecture & Structure
- Clearer separation of concerns
- Better module organization
- DRY principle application
- SOLID principles implementation
- Proper dependency injection

### Performance Optimizations
- Efficient algorithms and data structures
- Caching strategies
- Asynchronous processing where appropriate
- Memory optimization
- Database query optimization

### Security Enhancements
- Input validation and sanitization
- Authentication/authorization patterns
- API security best practices
- Environment variable usage
- Secret management

### Modern Best Practices
- Latest frameworks and libraries
- Progressive enhancement
- Accessibility improvements
- SEO optimization
- Testing strategy (unit, integration, E2E)

## Output

The skill generates:
1. **ANALYSIS.md** - Detailed improvement analysis with sections:
   - Current State Assessment
   - Critical Issues Found
   - Enhancement Opportunities
   - Detailed Improvement Plan with steps

2. **Enhanced Project Copy** - Complete enhanced version with improvements applied

3. **CHANGES.md** - Summary of all changes made

## Notes

- The enhanced copy preserves original files in a `_backup` folder
- Before making changes, the skill creates a backup of all original files
- Large projects may take significant time to analyze
- The enhancement is conservative - it improves quality without changing intended behavior
- Review the improvement plan before accepting changes
