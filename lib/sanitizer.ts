/**
 * Input Sanitization Library
 * 
 * Comprehensive input sanitization for:
 * - HTML content
 * - Text input
 * - File names
 * - URLs
 * - SQL injection prevention
 * - XSS prevention
 */

export class InputSanitizer {
  // HTML tag whitelist for sanitization
  private static readonly ALLOWED_HTML_TAGS = [
    'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'span', 'div',
  ];

  // HTML attribute whitelist
  private static readonly ALLOWED_HTML_ATTRS = [
    'href', 'src', 'alt', 'title', 'class',
  ];

  // Dangerous patterns for SQL injection
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(UNION|JOIN|HAVING|GROUP BY|ORDER BY)\b)/i,
    /(;|\||&|\!)/,
  ];

  // Dangerous patterns for XSS
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<\s*img[^>]+onerror\s*=/gi,
    /<\s*svg[^>]+onload\s*=/gi,
  ];

  /**
   * Sanitize HTML content (allows safe tags)
   */
  static sanitizeHTML(input: string): string {
    if (!input) return '';

    let sanitized = input;

    // Remove XSS patterns
    this.XSS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove disallowed tags
    const tagPattern = new RegExp(`</?(?!(${this.ALLOWED_HTML_TAGS.join('|')})\\b)[a-z][a-z0-9]*\\b[^>]*>`, 'gi');
    sanitized = sanitized.replace(tagPattern, '');

    // Remove disallowed attributes
    const attrPattern = new RegExp(`\\s(?!(${this.ALLOWED_HTML_ATTRS.join('|')})\\b)[a-z][a-z0-9-]*\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');

    return sanitized;
  }

  /**
   * Sanitize plain text (remove all HTML and special characters)
   */
  static sanitizeText(input: string): string {
    if (!input) return '';

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Sanitize file name (prevent directory traversal)
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // Remove path components
    let sanitized = filename.replace(/[/\\]/g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Replace unsafe characters with underscore
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    sanitized = sanitized.substring(0, 255);

    // Prevent hidden files
    if (sanitized.startsWith('.')) {
      sanitized = '_' + sanitized.substring(1);
    }

    return sanitized;
  }

  /**
   * Sanitize URL (allow only http/https)
   */
  static sanitizeUrl(url: string): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url.trim());
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      // Remove dangerous characters from hostname
      const hostname = parsed.hostname.replace(/[^\w.-]/g, '');
      
      // Reconstruct safe URL
      const safeUrl = new URL(parsed);
      safeUrl.hostname = hostname;
      
      // Sanitize pathname
      safeUrl.pathname = this.sanitizeText(parsed.pathname);
      
      return safeUrl.toString();
    } catch {
      return null;
    }
  }

  /**
   * Sanitize array of strings
   */
  static sanitizeArray(input: string[]): string[] {
    if (!Array.isArray(input)) return [];
    
    return input
      .map((item) => this.sanitizeText(item))
      .filter((item) => item.length > 0 && item.length <= 1000);
  }

  /**
   * Sanitize object (recursive)
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeText(key);

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(value);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = this.sanitizeArray(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Detect SQL injection attempts
   */
  static detectSQLInjection(input: string): boolean {
    if (!input) return false;

    return this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Detect XSS attempts
   */
  static detectXSS(input: string): boolean {
    if (!input) return false;

    return this.XSS_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string | null {
    if (!email) return null;

    // Trim and lowercase
    let sanitized = email.trim().toLowerCase();

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>"'&]/g, '');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Sanitize phone number (allow only digits, +, -, (), spaces)
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';

    // Remove all characters except allowed ones
    let sanitized = phone.replace(/[^\d+\-\s()]/g, '');

    // Remove leading/trailing whitespace
    sanitized = sanitized.trim();

    // Limit length
    sanitized = sanitized.substring(0, 20);

    return sanitized;
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';

    // Limit length
    let sanitized = query.substring(0, 200);

    // Remove SQL injection patterns
    this.SQL_INJECTION_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove XSS patterns
    this.XSS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove special regex characters
    sanitized = sanitized.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    return sanitized.trim();
  }

  /**
   * Sanitize rich text (for bios, descriptions, etc.)
   */
  static sanitizeRichText(input: string, options?: {
    maxLength?: number;
    allowLinks?: boolean;
    allowFormatting?: boolean;
  }): string {
    const maxLength = options?.maxLength || 5000;
    const allowLinks = options?.allowLinks ?? true;
    const allowFormatting = options?.allowFormatting ?? true;

    if (!input) return '';

    // Limit length
    let sanitized = input.substring(0, maxLength);

    // Remove XSS patterns
    this.XSS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    if (!allowFormatting) {
      // Remove all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } else {
      // Allow only safe formatting tags
      sanitized = this.sanitizeHTML(sanitized);
    }

    if (!allowLinks) {
      // Remove anchor tags
      sanitized = sanitized.replace(/<a[^>]*>|<\/a>/g, '');
    }

    return sanitized.trim();
  }

  /**
   * Batch sanitize multiple inputs
   */
  static sanitizeBatch(inputs: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(inputs)) {
      sanitized[key] = this.sanitizeText(value);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize ID (cuid, uuid, etc.)
   */
  static sanitizeId(id: string, type?: 'cuid' | 'uuid' | 'numeric'): string | null {
    if (!id) return null;

    // Remove any non-ID characters
    let sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');

    switch (type) {
      case 'cuid':
        // CUIDs are alphanumeric, start with 'c'
        if (!/^[c][a-z0-9]+$/.test(sanitized)) return null;
        break;
      case 'uuid':
        // UUIDs have specific format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitized)) {
          return null;
        }
        break;
      case 'numeric':
        // Only digits
        if (!/^\d+$/.test(sanitized)) return null;
        break;
    }

    return sanitized;
  }
}

export default InputSanitizer;
