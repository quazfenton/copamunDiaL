#!/usr/bin/env node

/**
 * Next.js 15 API Migration Pattern Compliance Validation
 *
 * This script validates that all target files have been successfully migrated
 * to use the Next.js 15 Promise-based parameter pattern.
 *
 * Requirements being validated:
 * - 1.1: Parameter handlers use NextJS15_Pattern with Promise type annotation
 * - 1.4: Parameter access follows the pattern `const { id } = await params`
 * - 2.1, 2.2, 2.3: All three target files are updated
 * - 2.4: No legacy patterns remain in specified files
 */

const fs = require('fs');

// Target files to validate
const TARGET_FILES = [
  'app/api/teams/[id]/route.ts',
  'app/api/teams/[id]/invites/route.ts',
  'app/api/teams/[id]/messages/route.ts'
];

// Reference files for pattern comparison
const REFERENCE_FILES = [
  'app/api/matches/[id]/route.ts',
  'app/api/notifications/[id]/route.ts'
];

class PatternValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  validateFile(filePath) {
    console.log(`\n🔍 Validating: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      this.results.failed.push({
        file: filePath,
        issue: 'File not found',
        requirement: 'File existence'
      });
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let fileValid = true;

    // Check 1: Promise type annotation in parameter destructuring
    const promiseTypePattern = /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*Promise<\{[^}]+\}>\s*\}/g;
    const promiseMatches = content.match(promiseTypePattern);
    
    if (!promiseMatches) {
      this.results.failed.push({
        file: filePath,
        issue: 'Missing Promise type annotation in parameter destructuring',
        requirement: '1.1 - NextJS15_Pattern with Promise type annotation',
        expected: '{ params }: { params: Promise<{ id: string }> }'
      });
      fileValid = false;
    } else {
      console.log(`  ✅ Promise type annotation found (${promiseMatches.length} occurrences)`);
    }

    // Check 2: Legacy pattern detection (should not exist)
    const legacyPattern = /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{[^}]+\}\s*\}/g;
    const legacyMatches = content.match(legacyPattern);
    
    if (legacyMatches) {
      this.results.failed.push({
        file: filePath,
        issue: 'Legacy pattern still present',
        requirement: '2.4 - No legacy patterns remain',
        found: legacyMatches
      });
      fileValid = false;
    } else {
      console.log(`  ✅ No legacy patterns detected`);
    }

    // Check 3: Await pattern for parameter access
    const awaitPattern = /const\s*\{\s*\w+(?:\s*:\s*\w+)?\s*\}\s*=\s*await\s+params/g;
    const awaitMatches = content.match(awaitPattern);

    if (!awaitMatches) {
      this.results.failed.push({
        file: filePath,
        issue: 'Missing await pattern for parameter access',
        requirement: '1.4 - Parameter access follows await pattern',
        expected: 'const { id } = await params'
      });
      fileValid = false;
    } else {
      console.log(`  ✅ Await pattern found (${awaitMatches.length} occurrences)`);
    }
    }

    // Check 4: HTTP method handlers present
    const httpMethods = ['GET', 'POST', 'PATCH', 'DELETE'];
    const foundMethods = [];
    
    httpMethods.forEach(method => {
      const methodPattern = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, 'g');
      if (content.match(methodPattern)) {
        foundMethods.push(method);
      }
    });

    if (foundMethods.length > 0) {
      console.log(`  ✅ HTTP methods found: ${foundMethods.join(', ')}`);
    } else {
      this.results.warnings.push({
        file: filePath,
        issue: 'No HTTP method handlers found',
        requirement: 'File structure validation'
      });
    }

    // Check 5: Consistent parameter variable naming
    const parameterExtractionPattern = /const\s*\{\s*(\w+)(?:\s*:\s*\w+)?\s*\}\s*=\s*await\s+params/g;
    const paramMatches = [...content.matchAll(parameterExtractionPattern)];
    
    if (paramMatches.length > 0) {
      const paramNames = paramMatches.map(match => match[1]);
      const uniqueParamNames = [...new Set(paramNames)];
      
      if (uniqueParamNames.length === 1) {
        console.log(`  ✅ Consistent parameter naming: ${uniqueParamNames[0]}`);
      } else {
        this.results.warnings.push({
          file: filePath,
          issue: `Inconsistent parameter naming: ${uniqueParamNames.join(', ')}`,
          requirement: 'Code consistency'
        });
      }
    }

    if (fileValid) {
      this.results.passed.push({
        file: filePath,
        status: 'All pattern compliance checks passed'
      });
    }

    return fileValid;
  }

  validateReferenceConsistency() {
    console.log(`\n🔍 Validating consistency with reference implementations...`);
    
    // Read reference files to establish expected patterns
    const referencePatterns = [];
    
    REFERENCE_FILES.forEach(refFile => {
      if (fs.existsSync(refFile)) {
        const content = fs.readFileSync(refFile, 'utf8');
        
        // Extract parameter handling patterns
        const promiseTypePattern = /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*Promise<\{[^}]+\}>\s*\}/g;
        const awaitPattern = /const\s*\{\s*\w+\s*\}\s*=\s*await\s+params/g;
        
        const promiseMatches = content.match(promiseTypePattern);
        const awaitMatches = content.match(awaitPattern);
        
        if (promiseMatches && awaitMatches) {
          referencePatterns.push({
            file: refFile,
            promisePattern: promiseMatches[0],
            awaitPattern: awaitMatches[0]
          });
        }
      }
    });

    if (referencePatterns.length > 0) {
      console.log(`  ✅ Reference patterns established from ${referencePatterns.length} files`);
      referencePatterns.forEach(ref => {
        console.log(`    📋 ${ref.file}: ${ref.promisePattern}`);
      });
    } else {
      this.results.warnings.push({
        file: 'Reference validation',
        issue: 'No reference implementations found for pattern comparison',
        requirement: '4.4 - Reference implementation consistency'
      });
    }
  }

  generateReport() {
    console.log(`\n📊 VALIDATION REPORT`);
    console.log(`==================`);
    
    console.log(`\n✅ PASSED (${this.results.passed.length}):`);
    this.results.passed.forEach(result => {
      console.log(`  • ${result.file}: ${result.status}`);
    });

    if (this.results.failed.length > 0) {
      console.log(`\n❌ FAILED (${this.results.failed.length}):`);
      this.results.failed.forEach(result => {
        console.log(`  • ${result.file}:`);
        console.log(`    Issue: ${result.issue}`);
        console.log(`    Requirement: ${result.requirement}`);
        if (result.expected) {
          console.log(`    Expected: ${result.expected}`);
        }
        if (result.found) {
          console.log(`    Found: ${result.found.join(', ')}`);
        }
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.results.warnings.length}):`);
      this.results.warnings.forEach(result => {
        console.log(`  • ${result.file}: ${result.issue}`);
      });
    }

    const totalFiles = TARGET_FILES.length;
    const passedFiles = this.results.passed.length;
    const failedFiles = this.results.failed.filter(f => TARGET_FILES.includes(f.file)).length;

    console.log(`\n📈 SUMMARY:`);
    console.log(`  Total target files: ${totalFiles}`);
    console.log(`  Passed: ${passedFiles}`);
    console.log(`  Failed: ${failedFiles}`);
    console.log(`  Success rate: ${Math.round((passedFiles / totalFiles) * 100)}%`);

    return {
      success: failedFiles === 0,
      totalFiles,
      passedFiles,
      failedFiles,
      details: this.results
    };
  }

  run() {
    console.log('🚀 Starting Next.js 15 API Migration Pattern Compliance Validation');
    console.log('================================================================');

    // Validate each target file
    TARGET_FILES.forEach(file => {
      this.validateFile(file);
    });

    // Validate consistency with reference implementations
    this.validateReferenceConsistency();

    // Generate and return report
    return this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PatternValidator();
  const result = validator.run();
  
  process.exit(result.success ? 0 : 1);
}

module.exports = PatternValidator;