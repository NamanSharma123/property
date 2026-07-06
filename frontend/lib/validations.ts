// Validation functions for the property manager application

// Validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  return phoneRegex.test(phone);
}

// Validate password strength
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is valid' };
}

// Validate property name
export function validatePropertyName(name: string): boolean {
  return name.length >= 3 && name.length <= 100;
}

// Validate property address
export function validatePropertyAddress(address: string): boolean {
  return address.length >= 5 && address.length <= 200;
}

// Validate number of units
export function validateUnits(units: number): boolean {
  return Number.isInteger(units) && units > 0 && units <= 1000;
}

// Validate tenant name
export function validateTenantName(name: string): boolean {
  return name.length >= 2 && name.length <= 50;
}

// Validate amount
export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000;
}

// Validate date
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Validate lease dates
export function validateLeaseDates(startDate: string, endDate: string): boolean {
  if (!validateDate(startDate) || !validateDate(endDate)) {
    return false;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end > start;
}