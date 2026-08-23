/**
 * SmartBlood AI - Deterministic Blood Compatibility Engine
 * Note: Gemini MUST NOT determine or override blood compatibility.
 */

export const COMPATIBILITY_DISCLAIMER =
  "Compatibility shown by this prototype is for matching assistance only. Final compatibility must be confirmed by an authorized blood bank or healthcare professional.";

// Standard Red Blood Cells / Whole Blood / PRBC compatibility matrix
// Key: Recipient Blood Group, Value: Array of acceptable Donor Blood Groups
const RBC_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

// Plasma (Fresh Frozen Plasma, Cryoprecipitate) compatibility matrix (ABO inverted)
const PLASMA_COMPATIBILITY = {
  'AB+': ['AB+', 'AB-'],
  'AB-': ['AB+', 'AB-'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
};

// Platelets compatibility
const PLATELETS_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'B-'],
  'O+': ['O+', 'O-', 'A+', 'B+'],
  'A-': ['A-', 'A+', 'AB-', 'O-'],
  'A+': ['A+', 'A-', 'AB+', 'O+'],
  'B-': ['B-', 'B+', 'AB-', 'O-'],
  'B+': ['B+', 'B-', 'AB+', 'O+'],
  'AB-': ['AB-', 'AB+', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'B+', 'O+']
};

/**
 * Check if donor blood group is compatible with recipient request
 * @param {string} recipientBlood 
 * @param {string} donorBlood 
 * @param {string} component 
 * @returns {{ compatible: boolean, exactMatch: boolean, score: number, note: string, disclaimer: string }}
 */
export function checkBloodCompatibility(recipientBlood, donorBlood, component = 'Whole Blood') {
  const normRecipient = (recipientBlood || '').toUpperCase().trim();
  const normDonor = (donorBlood || '').toUpperCase().trim();
  const normComp = (component || '').toLowerCase().trim();

  let compatMap = RBC_COMPATIBILITY;
  if (normComp.includes('plasma') || normComp.includes('cryo')) {
    compatMap = PLASMA_COMPATIBILITY;
  } else if (normComp.includes('platelet')) {
    compatMap = PLATELETS_COMPATIBILITY;
  }

  const allowedDonors = compatMap[normRecipient] || RBC_COMPATIBILITY[normRecipient] || [];
  const isCompatible = allowedDonors.includes(normDonor);
  const isExact = normRecipient === normDonor;

  let score = 0;
  let note = 'Incompatible blood group';

  if (isExact) {
    score = 100;
    note = 'Exact ABO/Rh match';
  } else if (isCompatible) {
    score = 90;
    note = 'Compatible universal/cross-match alternative';
  }

  return {
    compatible: isCompatible,
    exactMatch: isExact,
    score,
    note,
    disclaimer: COMPATIBILITY_DISCLAIMER
  };
}
