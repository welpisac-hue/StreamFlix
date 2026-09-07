const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function validateUsername(username: string): string | null {
  const value = username.trim()
  if (!USERNAME_REGEX.test(value)) {
    return 'Username must be 3–24 characters and only contain letters, numbers, or underscores'
  }
  return null
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number'
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'Password must include a special character'
  }
  return null
}
