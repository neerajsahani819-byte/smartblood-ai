// src/utils/idHelpers.js

/**
 * Safely converts any ID (number, string, null, undefined) to a reliable string.
 * @param {any} id 
 * @returns {string} Safe string representation
 */
export const safeId = (id) => {
  if (id === null || id === undefined) {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return String(id);
};

/**
 * Safely slices an ID regardless of its original type (number, string, undefined).
 * @param {any} id 
 * @param {number} start 
 * @param {number} end 
 * @returns {string} Sliced ID string
 */
export const sliceId = (id, start = 0, end = 8) => {
  const str = safeId(id);
  return str.slice(start, end);
};

/**
 * Formats a request ID safely for display (e.g. #REQ-12345678 or #REQ-0001).
 * @param {any} id 
 * @param {number} length 
 * @returns {string} Formatted label
 */
export const formatRequestId = (id, length = 8) => {
  const str = safeId(id);
  if (str.length <= 4 && !isNaN(Number(str))) {
    return `#REQ-${str.padStart(4, '0')}`;
  }
  return `#REQ-${str.slice(0, length)}`;
};

export default {
  safeId,
  sliceId,
  formatRequestId
};
