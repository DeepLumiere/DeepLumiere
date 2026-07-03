// ═══════════════════════════════════════════════════
// TaskFlow v2 — Form Validators
// ═══════════════════════════════════════════════════

/**
 * Validate an email address format
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Check if string is empty
 */
export function validateRequired(val) {
  return val !== undefined && val !== null && String(val).trim() !== '';
}

/**
 * Validates the task creation/edit form
 * @param {Object} data - task data object
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateTaskForm(data) {
  const errors = {};
  
  if (!validateRequired(data.title)) {
    errors.title = 'Task title is required';
  } else if (data.title.length > 200) {
    errors.title = 'Title must be less than 200 characters';
  }

  if (data.estimatedHours !== undefined && data.estimatedHours !== null) {
    const hrs = Number(data.estimatedHours);
    if (isNaN(hrs) || hrs < 0) {
      errors.estimatedHours = 'Estimate must be a positive number';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates the workspace creation form
 */
export function validateWorkspaceForm(data) {
  const errors = {};
  
  if (!validateRequired(data.name)) {
    errors.name = 'Workspace name is required';
  } else if (data.name.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
