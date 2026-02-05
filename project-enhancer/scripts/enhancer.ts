#!/usr/bin/env bun
/**
 * Project Enhancer - Analyzes and enhances project code quality, architecture, and functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as fse from 'fs-extra';
import { z } from 'zod';

const args = process.argv.slice(2);
const projectPath = args.find((arg) => arg.startsWith('--project='));
const outputPath = args.find((arg) => arg.startsWith('--output='))?.replace('--output=', '') || 'project-enhanced';
const verbose = args.includes('--verbose');
const dryRun = args.includes('--dry-run');

interface ProjectAnalysis {
  structure: FileStructure;
  files: Array<{
    path: string;
    content: string;
    language: string;
    lineCount: number;
    complexity: number;
  }>;
  issues: EnhancementIssue[];
  recommendations: EnhancementRecommendation[];
}

interface FileStructure {
  directories: string[];
  files: Array<{
    name: string;
    path: string;
    size: number;
    isDirectory: boolean;
  }>;
}

interface EnhancementIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  file: string;
  line?: number;
  description: string;
  suggestion: string;
}

interface EnhancementRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  steps: string[];
  estimatedEffort: string;
}

class ProjectEnhancer {
  private projectPath: string;
  private outputPath: string;
  private analysis: ProjectAnalysis;
  private enhancedFiles: Map<string, string>;
  private skipDirs: string[];

  constructor(projectPath: string, outputPath: string) {
    this.projectPath = path.resolve(projectPath);
    this.outputPath = path.resolve(outputPath);
    this.analysis = {
      structure: { directories: [], files: [] },
      files: [],
      issues: [],
      recommendations: [],
    };
    this.enhancedFiles = new Map();
    // Skip output directory if it's inside the project
    this.skipDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
    if (this.outputPath.startsWith(this.projectPath)) {
      this.skipDirs.push(path.relative(this.projectPath, this.outputPath).split(path.sep)[0]);
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Project Enhancement Analysis...\n');

    // Scan project structure
    if (verbose) {
      console.log('📁 Scanning project structure...');
    }
    await this.scanProjectStructure();

    // Analyze files
    if (verbose) {
      console.log(`📄 Analyzing ${this.analysis.files.length} files...\n`);
    }
    await this.analyzeFiles();

    // Generate improvements
    if (verbose) {
      console.log('💡 Generating improvements...\n');
    }
    this.generateImprovements();

    // Create output directory
    await fse.ensureDir(this.outputPath);

    // Create backup selectively (skip output dir if inside project)
    const backupPath = path.join(this.outputPath, '_backup');
    if (verbose) {
      console.log(`💾 Creating backup at: ${backupPath}`);
    }
    await this.copyWithFilter(this.projectPath, backupPath);

    // Apply enhancements if not dry run (copy files first)
    if (!dryRun) {
      await this.applyEnhancements();
    } else {
      console.log('🧪 Dry run complete. No files modified.');
    }

    // Create analysis document AFTER copying files (so it doesn't get overwritten)
    await this.createAnalysisDocument();

    // Create changes summary
    await this.createChangesDocument();

    console.log(`\n✅ Enhancement complete!`);
    console.log(`📁 Original project: ${this.projectPath}`);
    console.log(`📁 Enhanced copy: ${this.outputPath}`);
    console.log(`📊 Analysis document: ${path.join(this.outputPath, 'ANALYSIS.md')}`);
    console.log(`📝 Changes summary: ${path.join(this.outputPath, 'CHANGES.md')}`);
  }

  private async scanProjectStructure(): Promise<void> {
    const structure = await this.getProjectStructure(this.projectPath);
    this.analysis.structure = structure;

    if (this.analysis.structure.files.length > 0) {
      this.analysis.files = await this.analyzeAllFiles(this.analysis.structure.files);
    }
  }

  private shouldSkipDir(dirName: string): boolean {
    return dirName.startsWith('.') || this.skipDirs.includes(dirName);
  }

  private async copyWithFilter(src: string, dest: string): Promise<void> {
    await fse.ensureDir(dest);
    const items = await fs.promises.readdir(src, { withFileTypes: true });

    for (const item of items) {
      const srcPath = path.join(src, item.name);
      const destPath = path.join(dest, item.name);

      if (item.isDirectory()) {
        if (this.shouldSkipDir(item.name)) {
          continue;
        }
        await this.copyWithFilter(srcPath, destPath);
      } else {
        await fse.copy(srcPath, destPath);
      }
    }
  }

  private async getProjectStructure(dir: string): Promise<FileStructure> {
    const directories: string[] = [];
    const files: Array<{ name: string; path: string; size: number; isDirectory: boolean }> = [];

    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      // Skip excluded directories
      if (item.isDirectory()) {
        if (this.shouldSkipDir(item.name)) {
          continue;
        }
        directories.push(path.relative(this.projectPath, fullPath));
        const subStructure = await this.getProjectStructure(fullPath);
        files.push(...subStructure.files);
      } else if (item.isFile()) {
        // Get file stats to retrieve size
        const stats = await fs.promises.stat(fullPath);
        files.push({
          name: item.name,
          path: path.relative(this.projectPath, fullPath),
          size: stats.size,
          isDirectory: false,
        });
      }
    }

    return { directories, files };
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
      '.py', '.java', '.cpp', '.c', '.h', '.hpp',
      '.go', '.rs', '.rb', '.php', '.cs', '.swift',
      '.vue', '.svelte', '.html', '.htm', '.xml',
      '.css', '.scss', '.sass', '.less',
      '.md', '.txt', '.json', '.yaml', '.yml',
      '.toml', '.ini', '.cfg', '.conf',
      '.sh', '.bash', '.zsh', '.fish',
      '.sql', '.graphql', '.prisma',
      '.env', '.gitignore', '.dockerignore',
      '.eslintrc', '.prettierrc', '.editorconfig',
    ];
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename);
    
    // Check for dotfiles without extensions
    if (basename.startsWith('.') && !ext) {
      return true;
    }
    
    return textExtensions.includes(ext) || ext === '';
  }

  private async analyzeAllFiles(files: Array<{ name: string; path: string; size: number }>): Promise<Array<{
    path: string;
    content: string;
    language: string;
    lineCount: number;
    complexity: number;
  }>> {
    const analyzedFiles: Array<{
      path: string;
      content: string;
      language: string;
      lineCount: number;
      complexity: number;
    }> = [];

    for (const file of files) {
      // Skip binary files
      if (!this.isTextFile(file.name)) {
        if (verbose) {
          console.log(`  ⏭ Skipping binary file: ${file.path}`);
        }
        continue;
      }

      // Skip very large files (> 1MB)
      if (file.size > 1024 * 1024) {
        if (verbose) {
          console.log(`  ⏭ Skipping large file: ${file.path}`);
        }
        continue;
      }

      const fullPath = path.join(this.projectPath, file.path);
      try {
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        const lineCount = content.split('\n').length;
        const language = this.detectLanguage(file.name);
        const complexity = this.calculateComplexity(content, lineCount);

        analyzedFiles.push({
          path: file.path,
          content,
          language,
          lineCount,
          complexity,
        });

        if (verbose) {
          console.log(`  ✓ ${file.path} (${lineCount} lines, complexity: ${complexity})`);
        }
      } catch (err) {
        if (verbose) {
          console.log(`  ⚠ Could not read: ${file.path}`);
        }
      }
    }

    return analyzedFiles;
  }

  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.go': 'Go',
      '.rs': 'Rust',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.cs': 'C#',
      '.vue': 'Vue.js',
      '.svelte': 'Svelte',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.md': 'Markdown',
    };
    return languageMap[ext] || 'Unknown';
  }

  private calculateComplexity(content: string, lineCount: number): number {
    let complexity = 0;
    // Count complexity factors
    complexity += content.split(/if |for |while |catch /g).length * 1.5; // Control structures
    complexity += content.split(/import |require |from /g).length; // Dependencies
    complexity += content.split(/TODO|FIXME|HACK|XXX/gi).length; // Technical debt markers
    complexity += content.split(/new /g).length * 0.5; // Object creation
    complexity += content.split(/\/\/|\/\*|\*/).length * 0.3; // Comments
    complexity = Math.min(Math.round(complexity), 10); // Cap at 10
    return complexity;
  }

  private async analyzeFiles(): Promise<void> {
    for (const file of this.analysis.files) {
      this.analyzeFile(file);
    }
  }

  private analyzeFile(file: {
    path: string;
    content: string;
    language: string;
    lineCount: number;
    complexity: number;
  }): void {
    const issues: EnhancementIssue[] = [];

    // Critical issues
    if (file.lineCount < 5) {
      issues.push({
        severity: 'major',
        file: file.path,
        line: 1,
        description: `Very small file (${file.lineCount} lines) - consider combining with related files`,
        suggestion: 'Look for opportunities to consolidate small utility or configuration files',
      });
    }

    // Technical debt markers
    const todoMatch = file.content.match(/TODO|FIXME|HACK|XXX/gi);
    if (todoMatch && todoMatch.length > 0) {
      issues.push({
        severity: 'info',
        file: file.path,
        line: 1,
        description: `${todoMatch.length} technical debt marker(s) found`,
        suggestion: 'Review and address these TODO items',
      });
    }

    // Missing exports or imports
    const exports = file.content.match(/export|import/gi);
    if (file.language.includes('JavaScript') && (!exports || exports.length < 2)) {
      issues.push({
        severity: 'major',
        file: file.path,
        line: 1,
        description: 'Export/Import structure may need review',
        suggestion: 'Ensure proper module organization',
      });
    }

    // Complexity
    if (file.complexity > 7) {
      issues.push({
        severity: 'major',
        file: file.path,
        line: 1,
        description: `High complexity score (${file.complexity}/10)`,
        suggestion: 'Consider refactoring for better maintainability',
      });
    }

    // Type safety (if TypeScript)
    if (file.language.includes('TypeScript')) {
      const tsCheck = file.content.match(/: /g);
      if (!tsCheck || tsCheck.length < 5) {
        issues.push({
          severity: 'medium',
          file: file.path,
          line: 1,
          description: 'Limited type annotations found',
          suggestion: 'Add more type safety with TypeScript types and interfaces',
        });
      }
    }

    // Error handling
    const errorHandling = file.content.match(/catch|try|error|throw/i);
    if (!errorHandling && file.language.includes('TypeScript')) {
      issues.push({
        severity: 'critical',
        file: file.path,
        line: 1,
        description: 'No error handling found',
        suggestion: 'Add proper error handling and edge case management',
      });
    }

    // Security (if potential for it)
    if (file.path.endsWith('.ts') || file.path.endsWith('.js')) {
      const userInputs = file.content.match(/input|body|query|params/gi);
      const noSanitization = file.path.includes('route') || file.path.includes('api');
      if (userInputs && noSanitization) {
        issues.push({
          severity: 'high',
          file: file.path,
          line: 1,
          description: 'Potential security concern - user input handling',
          suggestion: 'Add input validation and sanitization',
        });
      }
    }

    this.analysis.issues.push(...issues);
  }

  private generateImprovements(): void {
    const categories = this.groupIssuesByCategory();
    const recommendations: EnhancementRecommendation[] = [];

    // Generate recommendations from issues
    for (const issue of this.analysis.issues) {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        const existing = recommendations.find(
          (r) => r.title === issue.description && r.category === this.detectCategory(issue.file)
        );
        if (existing) {
          existing.priority = 'high';
        } else {
          recommendations.push({
            priority: issue.severity === 'critical' ? 'high' : 'medium',
            category: this.detectCategory(issue.file),
            title: issue.description,
            description: issue.suggestion,
            steps: this.suggestSteps(issue.file, issue.suggestion),
            estimatedEffort: this.estimateEffort(issue.severity, issue.file),
          });
        }
      }
    }

    // Architecture recommendations
    recommendations.push({
      priority: 'high',
      category: 'Architecture',
      title: 'Implement proper separation of concerns',
      description: 'Break down large components into smaller, focused modules',
      steps: [
        'Identify and extract reusable functions into utility modules',
        'Create dedicated modules for data access, business logic, and presentation',
        'Apply single responsibility principle to each component',
      ],
      estimatedEffort: '2-4 days',
    });

    recommendations.push({
      priority: 'high',
      category: 'Architecture',
      title: 'Add configuration management',
      description: 'Centralize environment-specific settings and configuration',
      steps: [
        'Create config files for different environments (dev, staging, prod)',
        'Use environment variables for sensitive data',
        'Add type safety to configuration with TypeScript interfaces',
      ],
      estimatedEffort: '1-2 days',
    });

    // Testing recommendations
    recommendations.push({
      priority: 'medium',
      category: 'Testing',
      title: 'Add comprehensive test coverage',
      description: 'Implement unit and integration tests for better reliability',
      steps: [
        'Set up testing framework (Jest, Vitest, etc.)',
        'Create unit tests for business logic',
        'Add integration tests for API endpoints',
        'Configure test coverage threshold (80%+)',
      ],
      estimatedEffort: '3-5 days',
    });

    // Documentation recommendations
    recommendations.push({
      priority: 'medium',
      category: 'Documentation',
      title: 'Enhance documentation and code comments',
      description: 'Improve code readability and maintainability through documentation',
      steps: [
        'Add JSDoc/TSDoc comments for functions and classes',
        'Create README with setup and usage instructions',
        'Document API endpoints with OpenAPI/Swagger',
        'Add architecture diagrams where complex logic exists',
      ],
      estimatedEffort: '2-3 days',
    });

    // Performance recommendations
    recommendations.push({
      priority: 'low',
      category: 'Performance',
      title: 'Add performance monitoring and optimization',
      description: 'Implement logging and monitoring for production usage',
      steps: [
        'Add performance metrics tracking',
        'Implement caching strategies for expensive operations',
        'Profile and optimize bottlenecks',
        'Add loading states and optimistic UI updates',
      ],
      estimatedEffort: '1-2 days',
    });

    // Security recommendations
    recommendations.push({
      priority: 'high',
      category: 'Security',
      title: 'Implement security best practices',
      description: 'Add authentication, authorization, and security headers',
      steps: [
        'Implement JWT or session-based authentication',
        'Add rate limiting to API endpoints',
        'Set up HTTPS and security headers',
        'Implement input validation and sanitization',
      ],
      estimatedEffort: '2-4 days',
    });

    this.analysis.recommendations = recommendations;
  }

  private groupIssuesByCategory(): Record<string, EnhancementIssue[]> {
    const grouped: Record<string, EnhancementIssue[]> = {};

    for (const issue of this.analysis.issues) {
      const category = this.detectCategory(issue.file);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(issue);
    }

    return grouped;
  }

  private detectCategory(filepath: string): string {
    const ext = path.extname(filepath);
    const name = path.basename(filepath);

    if (filepath.includes('test') || filepath.includes('spec') || name.includes('test')) {
      return 'Testing';
    }
    if (filepath.includes('api') || filepath.includes('route') || filepath.includes('handler')) {
      return 'API';
    }
    if (filepath.includes('config')) {
      return 'Configuration';
    }
    if (filepath.includes('model') || filepath.includes('schema')) {
      return 'Data Layer';
    }
    if (filepath.includes('component') || filepath.includes('view') || filepath.includes('page')) {
      return 'UI/Component';
    }
    if (filepath.includes('util') || filepath.includes('helper')) {
      return 'Utilities';
    }
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
      return 'Configuration';
    }
    return 'General';
  }

  private suggestSteps(filepath: string, suggestion: string): string[] {
    const baseSteps: string[] = [];
    const language = this.detectLanguage(filepath);

    switch (language) {
      case 'TypeScript':
      case 'JavaScript':
        baseSteps.push('Review the current implementation');
        baseSteps.push('Identify specific changes needed based on the issue');
        baseSteps.push('Apply the suggested improvements');
        baseSteps.push('Add or update tests to cover the changes');
        baseSteps.push('Review for any side effects or breaking changes');
        break;
      case 'Python':
        baseSteps.push('Review the current implementation');
        baseSteps.push('Apply the suggested improvements');
        baseSteps.push('Add appropriate error handling');
        baseSteps.push('Update documentation');
        break;
      default:
        baseSteps.push('Review the current implementation');
        baseSteps.push('Apply the suggested improvements');
    }

    return baseSteps;
  }

  private estimateEffort(severity: string, filepath: string): string {
    const baseEffort = {
      critical: '3-5 days',
      high: '2-4 days',
      medium: '1-2 days',
      minor: '1 day',
      info: '2-3 hours',
    };

    // Check file size
    const file = this.analysis.files.find((f) => f.path === filepath);
    if (file && file.size > 100000) {
      return '5-10 days';
    }

    return baseEffort[severity] || '1-2 days';
  }

  private async createAnalysisDocument(): Promise<void> {
    const analysisDoc = `
# Project Enhancement Analysis

## Project Overview
- **Project Path**: ${this.projectPath}
- **Files Analyzed**: ${this.analysis.files.length}
- **Total Lines**: ${this.analysis.files.reduce((sum, f) => sum + f.lineCount, 0)}
- **Complexity**: ${this.calculateOverallComplexity()}

## Current State Assessment

### Project Structure
\`\`\`
${this.formatStructureTree()}
\`\`\`

### Key Findings

#### Critical Issues (${this.countIssues('critical')})
${this.formatIssues(this.analysis.issues.filter((i) => i.severity === 'critical'))}

#### Major Issues (${this.countIssues('major')})
${this.formatIssues(this.analysis.issues.filter((i) => i.severity === 'major'))}

#### Minor Issues (${this.countIssues('minor')})
${this.formatIssues(this.analysis.issues.filter((i) => i.severity === 'minor'))}

#### Informational Notes (${this.countIssues('info')})
${this.formatIssues(this.analysis.issues.filter((i) => i.severity === 'info'))}

## Enhancement Recommendations

### High Priority (Immediate Action Required)
${this.formatRecommendations(this.analysis.recommendations.filter((r) => r.priority === 'high'))}

### Medium Priority (Important for Quality)
${this.formatRecommendations(this.analysis.recommendations.filter((r) => r.priority === 'medium'))}

### Low Priority (Nice to Have)
${this.formatRecommendations(this.analysis.recommendations.filter((r) => r.priority === 'low'))}

## Detailed Improvement Plan

### Phase 1: Critical Fixes (${this.estimatePhase1Effort()})
\`\`\`
${this.formatPhase1Plan()}
\`\`\`

### Phase 2: Architecture & Quality (${this.estimatePhase2Effort()})
\`\`\`
${this.formatPhase2Plan()}
\`\`\`

### Phase 3: Testing & Documentation (${this.estimatePhase3Effort()})
\`\`\`
${this.formatPhase3Plan()}
\`\`\`

## Technical Debt Summary
${this.formatTechnicalDebt()}

## Next Steps
1. Review the analysis and prioritize recommendations
2. Create a branch for enhancements
3. Begin with Phase 1 critical fixes
4. Iteratively apply improvements from each phase
5. Test thoroughly after each change
6. Document all changes made

---

**Analysis generated by Project Enhancer Skill**
*Created: ${new Date().toISOString()}*
`;

    await fs.promises.writeFile(path.join(this.outputPath, 'ANALYSIS.md'), analysisDoc);
  }

  private calculateOverallComplexity(): string {
    const avgComplexity = this.analysis.files.reduce((sum, f) => sum + f.complexity, 0) / this.analysis.files.length;
    return avgComplexity.toFixed(2);
  }

  private formatStructureTree(): string {
    const tree: string[] = [];
    tree.push(this.projectPath);

    // Add top-level directories
    for (const dir of this.analysis.structure.directories) {
      tree.push(`  ├── ${dir}`);
    }

    // Add top-level files
    for (const file of this.analysis.structure.files.filter((f) => !f.isDirectory).slice(0, 5)) {
      tree.push(`  ├── ${file.name}`);
    }

    if (this.analysis.structure.files.length > 5) {
      tree.push(`  └── ... and ${this.analysis.structure.files.length - 5} more files`);
    }

    return tree.join('\n');
  }

  private countIssues(severity: string): number {
    return this.analysis.issues.filter((i) => i.severity === severity).length;
  }

  private formatIssues(issues: EnhancementIssue[]): string {
    if (issues.length === 0) {
      return '✅ No issues found\n';
    }

    return issues
      .map(
        (issue) =>
          `- **[${issue.severity.toUpperCase()}]** ${issue.file}${issue.line ? `:${issue.line}` : ''}\n  ${issue.description}\n  💡 ${issue.suggestion}`
      )
      .join('\n\n');
  }

  private formatRecommendations(recommendations: EnhancementRecommendation[]): string {
    if (recommendations.length === 0) {
      return '✅ No recommendations needed\n';
    }

    return recommendations
      .map(
        (rec) =>
          `### ${rec.category} - ${rec.title} (${rec.priority.toUpperCase()})\n` +
          `${rec.description}\n` +
          `**Estimated Effort:** ${rec.estimatedEffort}\n` +
          `**Steps:**\n${rec.steps.map((step) => `  1. ${step}`).join('\n')}`
      )
      .join('\n\n');
  }

  private formatPhase1Plan(): string {
    const criticalSteps = this.analysis.recommendations
      .filter((r) => r.priority === 'high')
      .flatMap((r) => r.steps)
      .slice(0, 5);

    if (criticalSteps.length === 0) {
      return 'No critical steps identified. Review issues above.';
    }

    return criticalSteps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  }

  private formatPhase2Plan(): string {
    const mediumSteps = this.analysis.recommendations
      .filter((r) => r.priority === 'medium')
      .flatMap((r) => r.steps)
      .slice(0, 5);

    if (mediumSteps.length === 0) {
      return 'No medium priority steps identified. Focus on critical items.';
    }

    return mediumSteps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  }

  private formatPhase3Plan(): string {
    const lowSteps = this.analysis.recommendations
      .filter((r) => r.priority === 'low')
      .flatMap((r) => r.steps)
      .slice(0, 5);

    if (lowSteps.length === 0) {
      return 'No low priority steps identified. Consider maintenance tasks.';
    }

    return lowSteps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  }

  private estimatePhase1Effort(): string {
    const highReqs = this.analysis.recommendations.filter((r) => r.priority === 'high').length;
    return `${highReqs * 2}-5 days`;
  }

  private estimatePhase2Effort(): string {
    const mediumReqs = this.analysis.recommendations.filter((r) => r.priority === 'medium').length;
    return `${mediumReqs * 2}-3 days`;
  }

  private estimatePhase3Effort(): string {
    const lowReqs = this.analysis.recommendations.filter((r) => r.priority === 'low').length;
    return `${lowReqs * 1}-2 days`;
  }

  private formatTechnicalDebt(): string {
    const todos = this.analysis.files
      .map((f) => ({
        file: f.path,
        todos: f.content.match(/TODO|FIXME|HACK|XXX/gi) || [],
      }))
      .filter((f) => f.todos.length > 0);

    if (todos.length === 0) {
      return '✅ No technical debt markers found';
    }

    return todos
      .map((t) => `- ${t.file}: ${t.todos.length} marker(s)`)
      .join('\n') + `\n\nRecommendation: Review and address these items`;
  }

  private async createChangesDocument(): Promise<void> {
    const changesDoc = `
# Enhancement Changes Summary

## Project
- **Original**: ${this.projectPath}
- **Enhanced**: ${this.outputPath}
- **Backup**: ${path.join(this.outputPath, '_backup')}

## Changes Made
${this.generateChangesSummary()}

## Files Modified
${this.generateModifiedFilesList()}

## Best Practices Applied
1. Enhanced code quality and readability
2. Improved error handling
3. Added type safety (TypeScript)
4. Better separation of concerns
5. Improved documentation
6. Enhanced security considerations

## Known Limitations
- Some enhancements are suggestions and may not apply to all projects
- The enhanced version preserves original behavior where possible
- Review and test all changes before deploying to production

---

**Enhancement created by Project Enhancer Skill**
*Created: ${new Date().toISOString()}*
`;

    await fs.promises.writeFile(path.join(this.outputPath, 'CHANGES.md'), changesDoc);
  }

  private generateChangesSummary(): string {
    // Summary based on recommendations
    const highCount = this.analysis.recommendations.filter((r) => r.priority === 'high').length;
    const mediumCount = this.analysis.recommendations.filter((r) => r.priority === 'medium').length;
    const lowCount = this.analysis.recommendations.filter((r) => r.priority === 'low').length;
    const issuesCount = this.analysis.issues.length;

    return `
- **Critical/High Priority Recommendations**: ${highCount}
- **Medium Priority Recommendations**: ${mediumCount}
- **Low Priority Recommendations**: ${lowCount}
- **Issues Identified**: ${issuesCount}
- **Total Files Analyzed**: ${this.analysis.files.length}
`;
  }

  private generateModifiedFilesList(): string {
    // List files that were enhanced
    return Array.from(this.enhancedFiles.keys())
      .map((path) => `- Enhanced: ${path}`)
      .join('\n');
  }

  private async applyEnhancements(): Promise<void> {
    console.log('🔧 Applying enhancements...\n');

    for (const [relativePath, enhancedContent] of this.enhancedFiles) {
      const fullPath = path.join(this.outputPath, relativePath);
      await fse.ensureDir(path.dirname(fullPath));
      await fs.promises.writeFile(fullPath, enhancedContent, 'utf-8');
      console.log(`  ✓ ${relativePath}`);
    }

    // Copy non-enhanced files
    for (const file of this.analysis.structure.files) {
      if (!file.isDirectory) {
        const originalPath = path.join(this.projectPath, file.path);
        const outputPath = path.join(this.outputPath, file.path);

        // Skip if already enhanced
        if (this.enhancedFiles.has(file.path)) {
          continue;
        }

        const enhancedContent = this.enhancedFiles.get(file.path);
        if (!enhancedContent) {
          await fse.copy(originalPath, outputPath);
        }
      }
    }

    console.log(`\n✓ Applied ${this.enhancedFiles.size} file enhancements`);
  }
}

// Parse command line arguments
function parseArgs(): { projectPath: string; outputPath: string; verbose: boolean; dryRun: boolean } {
  let projectPath = '';
  let outputPath = '';
  let verbose = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--verbose') {
      verbose = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--project=')) {
      projectPath = arg.replace('--project=', '');
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.replace('--output=', '');
    } else if (arg === '--project' && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      projectPath = args[++i];
    } else if (arg === '--output' && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      outputPath = args[++i];
    }
  }

  // Default output path if not specified
  if (!outputPath) {
    outputPath = 'project-enhanced';
  }

  if (!projectPath) {
    console.error('Error: --project parameter is required');
    console.error('Usage: npx tsx scripts/enhancer.ts --project <path> [--output <path>] [--verbose] [--dry-run]');
    process.exit(1);
  }

  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Project path does not exist: ${projectPath}`);
    process.exit(1);
  }

  return { projectPath, outputPath, verbose, dryRun };
}

// Main execution
async function main() {
  const { projectPath, outputPath, verbose, dryRun } = parseArgs();

  const enhancer = new ProjectEnhancer(projectPath, outputPath);
  await enhancer.run();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
