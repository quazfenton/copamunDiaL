/**
 * Unit Tests for Input Sanitizer
 * 
 * Tests for lib/sanitizer.ts
 */

import { describe, it, expect } from 'vitest';
import { InputSanitizer } from '@/lib/sanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = InputSanitizer.sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = InputSanitizer.sanitizeHTML(input);
      expect(result).not.toContain('onerror');
    });

    it('should allow safe tags', () => {
      const input = '<b>Bold</b> <i>Italic</i> <p>Paragraph</p>';
      const result = InputSanitizer.sanitizeHTML(input);
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
      expect(result).toContain('<p>');
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeHTML('')).toBe('');
      expect(InputSanitizer.sanitizeHTML(null as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert(1)</script>Hello<p>World</p>';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove dangerous characters', () => {
      const input = 'Hello <>"\'& World';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
      expect(result).not.toContain('&');
    });

    it('should trim and normalize whitespace', () => {
      const input = '  Hello    World  ';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeText('')).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path components', () => {
      expect(InputSanitizer.sanitizeFilename('../../../etc/passwd')).toBe('_____etc_passwd');
      expect(InputSanitizer.sanitizeFilename('C:\\Windows\\System32')).toBe('C_Windows_System32');
    });

    it('should replace unsafe characters', () => {
      const result = InputSanitizer.sanitizeFilename('file@name#with$special%chars!.txt');
      expect(result).toBe('file_name_with_special_chars_.txt');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = InputSanitizer.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should prevent hidden files', () => {
      const result = InputSanitizer.sanitizeFilename('.htaccess');
      expect(result).not.toMatch(/^\./);
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeFilename('')).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http and https URLs', () => {
      expect(InputSanitizer.sanitizeUrl('http://example.com')).toBe('http://example.com/');
      expect(InputSanitizer.sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should reject javascript: URLs', () => {
      expect(InputSanitizer.sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should reject ftp: URLs', () => {
      expect(InputSanitizer.sanitizeUrl('ftp://example.com')).toBeNull();
    });

    it('should handle invalid URLs', () => {
      expect(InputSanitizer.sanitizeUrl('not-a-url')).toBeNull();
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeUrl('')).toBeNull();
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate email format', () => {
      expect(InputSanitizer.sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(InputSanitizer.sanitizeEmail('invalid-email')).toBeNull();
    });

    it('should trim and lowercase', () => {
      const result = InputSanitizer.sanitizeEmail('  Test@Example.COM  ');
      expect(result).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      expect(InputSanitizer.sanitizeEmail('test<script>@example.com')).toBeNull();
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeEmail('')).toBeNull();
    });
  });

  describe('sanitizePhone', () => {
    it('should allow only digits and phone characters', () => {
      const result = InputSanitizer.sanitizePhone('+1 (555) 123-4567');
      expect(result).toBe('+1 (555) 123-4567');
    });

    it('should remove invalid characters', () => {
      const result = InputSanitizer.sanitizePhone('123-456-7890abc!@#');
      expect(result).toBe('123-456-7890');
    });

    it('should limit length', () => {
      const result = InputSanitizer.sanitizePhone('1'.repeat(50));
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizePhone('')).toBe('');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should limit length', () => {
      const result = InputSanitizer.sanitizeSearchQuery('a'.repeat(300));
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should remove SQL injection patterns', () => {
      const input = "'; DROP TABLE users;--";
      const result = InputSanitizer.sanitizeSearchQuery(input);
      expect(result).not.toContain('DROP TABLE');
    });

    it('should remove XSS patterns', () => {
      const input = '<script>alert(1)</script>';
      const result = InputSanitizer.sanitizeSearchQuery(input);
      expect(result).not.toContain('<script>');
    });

    it('should escape regex characters', () => {
      const result = InputSanitizer.sanitizeSearchQuery('.*+?^${}()|[]\\');
      expect(result).toContain('\\');
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeSearchQuery('')).toBe('');
    });
  });

  describe('sanitizeArray', () => {
    it('should sanitize each item', () => {
      const input = ['<script>alert(1)</script>', 'Hello', 'World'];
      const result = InputSanitizer.sanitizeArray(input);
      expect(result[0]).not.toContain('<script>');
      expect(result).toHaveLength(3);
    });

    it('should filter empty items', () => {
      const input = ['Hello', '', 'World', '   '];
      const result = InputSanitizer.sanitizeArray(input);
      expect(result).toHaveLength(2);
    });

    it('should handle non-array input', () => {
      expect(InputSanitizer.sanitizeArray(null as any)).toEqual([]);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: 'test@example.com',
        nested: {
          description: '<b>Bold</b>',
        },
      };
      const result = InputSanitizer.sanitizeObject(input);
      expect(result.name).not.toContain('<script>');
      expect(result.nested.description).not.toContain('<b>');
    });

    it('should handle arrays in objects', () => {
      const input = {
        tags: ['<script>', 'valid', 'tag'],
      };
      const result = InputSanitizer.sanitizeObject(input);
      expect(result.tags[0]).not.toContain('<script>');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        data: null,
      };
      const result = InputSanitizer.sanitizeObject(input);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('detectSQLInjection', () => {
    it('should detect common SQL injection patterns', () => {
      expect(InputSanitizer.detectSQLInjection("'; DROP TABLE users;--")).toBe(true);
      expect(InputSanitizer.detectSQLInjection("1' OR '1'='1")).toBe(true);
      expect(InputSanitizer.detectSQLInjection("1; DELETE FROM users")).toBe(true);
      expect(InputSanitizer.detectSQLInjection("UNION SELECT * FROM users")).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(InputSanitizer.detectSQLInjection('Hello World')).toBe(false);
      expect(InputSanitizer.detectSQLInjection('SELECT a book to read')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.detectSQLInjection('')).toBe(false);
    });
  });

  describe('detectXSS', () => {
    it('should detect common XSS patterns', () => {
      expect(InputSanitizer.detectXSS('<script>alert(1)</script>')).toBe(true);
      expect(InputSanitizer.detectXSS('javascript:alert(1)')).toBe(true);
      expect(InputSanitizer.detectXSS('<img onerror="alert(1)">')).toBe(true);
      expect(InputSanitizer.detectXSS('<svg onload="alert(1)">')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(InputSanitizer.detectXSS('Hello World')).toBe(false);
      expect(InputSanitizer.detectXSS('The script was written by John')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.detectXSS('')).toBe(false);
    });
  });

  describe('sanitizeRichText', () => {
    it('should allow safe HTML formatting', () => {
      const result = InputSanitizer.sanitizeRichText('<b>Bold</b> <i>Italic</i>', {
        allowFormatting: true,
      });
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
    });

    it('should remove all HTML if formatting disabled', () => {
      const result = InputSanitizer.sanitizeRichText('<b>Bold</b>', {
        allowFormatting: false,
      });
      expect(result).not.toContain('<b>');
    });

    it('should remove links if disabled', () => {
      const result = InputSanitizer.sanitizeRichText('<a href="#">Link</a>', {
        allowLinks: false,
      });
      expect(result).not.toContain('<a>');
    });

    it('should limit length', () => {
      const result = InputSanitizer.sanitizeRichText('a'.repeat(6000), { maxLength: 5000 });
      expect(result.length).toBeLessThanOrEqual(5000);
    });
  });

  describe('sanitizeId', () => {
    it('should validate cuid format', () => {
      expect(InputSanitizer.sanitizeId('cjld2cjxh0000qzrmn831i7rn', 'cuid')).toBeTruthy();
      expect(InputSanitizer.sanitizeId('invalid-id', 'cuid')).toBeNull();
    });

    it('should validate uuid format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(InputSanitizer.sanitizeId(uuid, 'uuid')).toBe(uuid);
      expect(InputSanitizer.sanitizeId('invalid-uuid', 'uuid')).toBeNull();
    });

    it('should validate numeric format', () => {
      expect(InputSanitizer.sanitizeId('12345', 'numeric')).toBe('12345');
      expect(InputSanitizer.sanitizeId('123abc', 'numeric')).toBeNull();
    });

    it('should handle empty input', () => {
      expect(InputSanitizer.sanitizeId('', 'cuid')).toBeNull();
    });
  });
});
