/* eslint-disable prettier/prettier */
// ========================================
// src/common/utils/slug.util.ts
// ========================================

/**
 * Generate a URL-friendly slug from a given string
 * Time Complexity: O(n) where n is the length of the input string
 * 
 * Features:
 * - Handles international characters and accents
 * - Removes special characters and symbols
 * - Converts to lowercase
 * - Replaces spaces and multiple hyphens with single hyphen
 * - Trims leading/trailing hyphens
 * - Handles edge cases (empty strings, numbers, etc.)
 */
export function generateSlug(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  return input
    .toString()                           // Convert to string (handles numbers)
    .toLowerCase()                        // Convert to lowercase
    .trim()                              // Remove leading/trailing whitespace
    .normalize('NFD')                    // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')     // Remove accent marks
    .replace(/[^\w\s-]/g, '')            // Remove special characters (keep word chars, spaces, hyphens)
    .replace(/[\s_-]+/g, '-')            // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');            // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if the slug already exists
 * Time Complexity: O(n * m) where n is string length and m is the number of attempts
 * 
 * @param input - The original string to convert to slug
 * @param checkExistence - Async function that checks if slug exists (returns boolean)
 * @param maxAttempts - Maximum attempts to find unique slug (default: 100)
 */
export async function generateUniqueSlug(
  input: string,
  checkExistence: (slug: string) => Promise<boolean>,
  maxAttempts: number = 100
): Promise<string> {
  const baseSlug = generateSlug(input);
  
  if (!baseSlug) {
    throw new Error('Unable to generate slug from input');
  }

  // Check if base slug is available
  const baseExists = await checkExistence(baseSlug);
  if (!baseExists) {
    return baseSlug;
  }

  // Try numbered variations
  for (let i = 2; i <= maxAttempts; i++) {
    const numberedSlug = `${baseSlug}-${i}`;
    const exists = await checkExistence(numberedSlug);
    
    if (!exists) {
      return numberedSlug;
    }
  }

  // If all attempts failed, append timestamp
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
}

/**
 * Validate if a string is a valid slug format
 * Time Complexity: O(n) where n is the length of the slug
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should only contain lowercase letters, numbers, and hyphens
  // Should not start or end with hyphen
  // Should not have consecutive hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * Clean and optimize an existing slug
 * Time Complexity: O(n) where n is the length of the slug
 */
export function cleanSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug must be a non-empty string');
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')          // Keep only valid slug characters
    .replace(/-+/g, '-')                 // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');            // Remove leading/trailing hyphens
}

/**
 * Generate slug with custom separator
 * Time Complexity: O(n) where n is the length of the input string
 */
export function generateSlugWithSeparator(input: string, separator: string = '-'): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  if (!separator || typeof separator !== 'string') {
    separator = '-';
  }

  // Validate separator (should be URL-safe)
  const validSeparators = ['-', '_', '.'];
  if (!validSeparators.includes(separator)) {
    throw new Error('Separator must be one of: - _ .');
  }

  return input
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/[\s_-]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');
}

/**
 * Convert slug back to readable title (for display purposes)
 * Time Complexity: O(n) where n is the length of the slug
 */
export function slugToTitle(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate slug for SEO with length optimization
 * Time Complexity: O(n) where n is the length of the input string
 */
export function generateSEOSlug(input: string, maxLength: number = 60): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  if (maxLength < 1 || maxLength > 200) {
    throw new Error('Max length must be between 1 and 200');
  }

  let slug = generateSlug(input);

  // Truncate if too long, but try to break on word boundaries
  if (slug.length > maxLength) {
    const truncated = slug.substring(0, maxLength);
    const lastHyphen = truncated.lastIndexOf('-');
    
    // If there's a hyphen near the end, cut there for better readability
    if (lastHyphen > maxLength * 0.7) {
      slug = truncated.substring(0, lastHyphen);
    } else {
      slug = truncated;
    }
  }

  return slug;
}

/**
 * Batch generate slugs for multiple inputs
 * Time Complexity: O(n * m) where n is number of inputs and m is average string length
 */
export function batchGenerateSlugs(inputs: string[]): string[] {
  if (!Array.isArray(inputs)) {
    throw new Error('Input must be an array of strings');
  }

  return inputs.map((input, index) => {
    try {
      return generateSlug(input);
    } catch (error) {
      console.warn(`Failed to generate slug for input at index ${index}:`, input);
      return `item-${index + 1}`;
    }
  });
}

/**
 * Generate hierarchical slug (for subcategories, nested items)
 * Time Complexity: O(n) where n is the total length of all parts
 */
export function generateHierarchicalSlug(...parts: string[]): string {
  if (!parts || parts.length === 0) {
    throw new Error('At least one part is required');
  }

  const validParts = parts.filter(part => part && typeof part === 'string' && part.trim());
  
  if (validParts.length === 0) {
    throw new Error('At least one valid part is required');
  }

  return validParts
    .map(part => generateSlug(part))
    .filter(slug => slug.length > 0)
    .join('-');
}

// Type definitions for better TypeScript support
export interface SlugOptions {
  maxLength?: number;
  separator?: string;
  preserveCase?: boolean;
  allowNumbers?: boolean;
}

/**
 * Advanced slug generator with custom options
 * Time Complexity: O(n) where n is the length of the input string
 */
export function generateAdvancedSlug(input: string, options: SlugOptions = {}): string {
  const {
    maxLength = 100,
    separator = '-',
    preserveCase = false,
    allowNumbers = true
  } = options;

  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  let result = input.toString().trim();

  // Handle case preservation
  if (!preserveCase) {
    result = result.toLowerCase();
  }

  // Normalize and remove accents
  result = result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Handle character filtering
  if (allowNumbers) {
    result = result.replace(/[^\w\s-]/g, '');
  } else {
    result = result.replace(/[^a-zA-Z\s-]/g, '');
  }

  // Apply separator
  result = result
    .replace(/[\s_-]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');

  // Apply length limit
  if (result.length > maxLength) {
    result = generateSEOSlug(result, maxLength);
  }

  return result;
}

/**
 * Utility function to create a slug checker for database operations
 * This returns a function that can be used with generateUniqueSlug
 */
export function createSlugChecker<T>(
  findFunction: (slug: string) => Promise<T | null>
): (slug: string) => Promise<boolean> {
  return async (slug: string): Promise<boolean> => {
    try {
      const existing = await findFunction(slug);
      return existing !== null;
    } catch (error) {
      console.error('Error checking slug existence:', error);
      return true; // Assume it exists to be safe
    }
  };
}

// Export default for common use case
export default generateSlug;