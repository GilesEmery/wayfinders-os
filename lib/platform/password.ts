export const PURPOSEOS_MIN_PASSWORD_LENGTH = 8;

export function passwordValidationError(password: string, label = "Password") {
  return password.length < PURPOSEOS_MIN_PASSWORD_LENGTH
    ? `${label} must be at least ${PURPOSEOS_MIN_PASSWORD_LENGTH} characters.`
    : null;
}
