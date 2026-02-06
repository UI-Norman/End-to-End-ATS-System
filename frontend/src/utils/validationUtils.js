export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
};

export const validateRequired = (value) => {
  if (value === null || value === undefined) return false;
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  return true;
};

export const validateMinLength = (value, minLength) => {
  if (typeof value !== 'string') return false;
  return value.length >= minLength;
};

export const validateMaxLength = (value, maxLength) => {
  if (typeof value !== 'string') return false;
  return value.length <= maxLength;
};

export const validateNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

export const validatePositiveNumber = (value) => {
  return validateNumber(value) && parseFloat(value) > 0;
};

export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const validateDateRange = (startDate, endDate) => {
  if (!validateDate(startDate) || !validateDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
};

export const validateFileType = (file, allowedTypes) => {
  if (!file || !file.type) return false;
  
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      const baseType = type.split('/')[0];
      return file.type.startsWith(baseType);
    }
    return file.type === type;
  });
};

export const validateFileSize = (file, maxSizeInMB) => {
  if (!file || !file.size) return false;
  
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// Form validation helper
export const validateForm = (values, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = values[field];
    
    if (fieldRules.required && !validateRequired(value)) {
      errors[field] = `${field} is required`;
      return;
    }
    
    if (fieldRules.email && value && !validateEmail(value)) {
      errors[field] = 'Invalid email address';
      return;
    }
    
    if (fieldRules.phone && value && !validatePhone(value)) {
      errors[field] = 'Invalid phone number';
      return;
    }
    
    if (fieldRules.minLength && value && !validateMinLength(value, fieldRules.minLength)) {
      errors[field] = `Must be at least ${fieldRules.minLength} characters`;
      return;
    }
    
    if (fieldRules.maxLength && value && !validateMaxLength(value, fieldRules.maxLength)) {
      errors[field] = `Must be no more than ${fieldRules.maxLength} characters`;
      return;
    }
    
    if (fieldRules.number && value && !validateNumber(value)) {
      errors[field] = 'Must be a valid number';
      return;
    }
    
    if (fieldRules.positive && value && !validatePositiveNumber(value)) {
      errors[field] = 'Must be a positive number';
      return;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
