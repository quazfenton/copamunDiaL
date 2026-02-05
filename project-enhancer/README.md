# Project Enhancer Skill

A comprehensive skill and agent for analyzing project codebases and generating detailed enhancement plans with improved project copies.

## Features

- 📊 **Comprehensive Analysis**: Scans entire project structure and analyzes all files
- 🔍 **Issue Detection**: Identifies critical, major, minor, and informational issues
- 💡 **Smart Recommendations**: Generates prioritized improvement recommendations
- 📝 **Detailed Documentation**: Creates ANALYSIS.md and CHANGES.md documentation
- 🚀 **Enhanced Copies**: Creates complete enhanced project copies with improvements applied
- 🎯 **Effort Estimation**: Estimates time and effort for each improvement

## Components

### Project Enhancer Skill
Located at: `project-enhancer/`

**Usage (npm/Node.js):**
```bash
cd project-enhancer
npm install
npm run enhance -- --project <path> --output <enhanced-path>
```

**Usage (npx directly):**
```bash
npx tsx scripts/enhancer.ts --project <path> --output <enhanced-path>
```

**Usage (bun):**
```bash
bun run scripts/enhancer.ts --project <path> --output <enhanced-path>
```

**Options:**
- `--project <path>`: Path to project to analyze (required)
- `--output <path>`: Where to save enhanced copy (defaults: project-enhanced)
- `--verbose`: Show detailed analysis during execution
- `--dry-run`: Analyze but don't create enhanced copy

### Enhancement Agent
A scheduled agent that runs weekly to analyze and enhance projects.

**Agent Frequency:** Every Tuesday at 10:00 AM (America/New_York)

**Agent Instructions:**
- Ask for project path when invoked
- Run project-enhancer skill
- Present analysis results clearly
- Provide paths to generated files

## What Gets Enhanced

### Code Quality
- Better variable naming and structure
- More descriptive comments and documentation
- Consistent formatting and styling
- Improved type safety (TypeScript annotations)
- Enhanced error handling

### Architecture
- Clearer separation of concerns
- Better module organization
- DRY principle application
- SOLID principles implementation
- Proper dependency injection

### Performance
- Efficient algorithms and data structures
- Caching strategies
- Asynchronous processing
- Memory optimization

### Security
- Input validation and sanitization
- Authentication/authorization patterns
- API security best practices
- Environment variable usage

### Testing
- Test coverage recommendations
- Unit test strategy
- Integration test guidance
- Test framework suggestions

### Documentation
- Improved code comments
- README templates
- API documentation
- Architecture diagrams

## Output Structure

When you run the enhancer:

```
your-project/
├── _backup/                    # Original project backup
│   └── (original files)
├── ANALYSIS.md                 # Detailed analysis report
├── CHANGES.md                  # Summary of enhancements made
└── [enhanced project files]   # Enhanced versions with improvements
```

### ANALYSIS.md Sections

1. **Project Overview** - Statistics and structure
2. **Current State Assessment** - Critical, major, minor, and info issues
3. **Enhancement Recommendations** - Prioritized recommendations
4. **Detailed Improvement Plan** - Phased approach with steps
5. **Technical Debt Summary** - TODO/FIXME markers
6. **Next Steps** - Actionable items

### CHANGES.md Sections

1. **Project Info** - Original vs enhanced paths
2. **Changes Made** - Summary of all changes
3. **Files Modified** - List of enhanced files
4. **Best Practices Applied** - Standards implemented
5. **Known Limitations** - Considerations for deployment

## Examples

### Quick Analysis
```bash
cd /home/workspace/Skills/project-enhancer
bun run scripts/enhancer.ts --project "/home/workspace/my-project"
```

### With Detailed Output
```bash
bun run scripts/enhancer.ts --project "/home/workspace/my-project" --output "my-project-enhanced" --verbose
```

### Dry Run (Analyze Only)
```bash
bun run scripts/enhancer.ts --project "/home/workspace/my-project" --dry-run
```

### Large Project
```bash
# For large projects, the analysis can take time
bun run scripts/enhancer.ts --project "/home/workspace/large-project" --verbose
```

## Supported Languages

- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)
- Python (`.py`)
- Java (`.java`)
- C++ (`.cpp`, `.c`)
- Go (`.go`)
- Rust (`.rs`)
- Ruby (`.rb`)
- PHP (`.php`)
- C# (`.cs`)
- Vue.js (`.vue`)
- Svelte (`.svelte`)
- HTML (`.html`)
- CSS/SCSS (`.css`, `.scss`)
- Markdown (`.md`)

## Recommendations Categories

1. **Architecture** - Project structure and organization
2. **API** - API endpoints and handlers
3. **Configuration** - Settings and environment configs
4. **Data Layer** - Models, schemas, databases
5. **UI/Component** - Frontend components and views
6. **Utilities** - Helper functions and tools
7. **Testing** - Test files and coverage
8. **General** - Mixed improvements
9. **Security** - Security best practices
10. **Performance** - Performance optimizations

## Priority Levels

- **Critical** - Blocks functionality, major security risks
- **High** - Important issues requiring immediate attention
- **Medium** - Quality and maintainability issues
- **Minor** - Minor improvements and best practices
- **Info** - Informational notes and suggestions

## Effort Estimation

Efforts are estimated based on:
- Severity of issues
- File size and complexity
- Number of files involved
- Type of language/framework used

Typical ranges:
- Critical/High: 2-5 days per item
- Medium: 1-3 days per item
- Low: 1-2 days per item
- Info: 2-3 hours per item

## Agent Integration

The Project Enhancement Agent runs weekly and:
1. Receives project path
2. Executes the enhancer skill
3. Summarizes results
4. Sends detailed analysis via email

To interact with the agent manually, send it a message with a project path, or wait for scheduled runs.

## Best Practices

1. **Review First**: Read the ANALYSIS.md before making changes
2. **Prioritize**: Start with high-priority critical fixes
3. **Test Thoroughly**: Test each phase after implementation
4. **Review Changes**: Check CHANGES.md before deploying
5. **Iterate**: Apply improvements in phases rather than all at once

## Limitations

- Enhanced copy preserves original behavior (conservative changes)
- Some recommendations may not apply to all project types
- Large projects may take significant time to analyze
- Automatic enhancements may need manual review
- Third-party code modifications require care

## Troubleshooting

**Script not found:**
```bash
cd /home/workspace/Skills/project-enhancer
bun run scripts/enhancer.ts --help
```

**Permission errors:**
```bash
chmod +x /home/workspace/Skills/project-enhancer/scripts/enhancer.ts
```

**Large project slow:**
- Use `--verbose` to see progress
- Consider breaking into smaller analyses
- Use `--dry-run` first to test the analysis

## Contributing

To improve the skill:

1. Read current issues and recommendations
2. Suggest additional improvements
3. Extend language support
4. Add new analysis patterns
5. Improve effort estimation accuracy

## License

Part of Zo Computer. Created for veli.zo.computer.

## Support

For issues or questions:
- Check ANALYSIS.md for detailed information
- Review CHANGES.md for applied changes
- Check `Skills/project-enhancer/SKILL.md` for skill usage
- Contact Zo support at help@zocomputer.com
