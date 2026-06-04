export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
    if (!password) return 'Please enter a password';
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (!/\d/.test(password)) {
        return 'Password must include at least one number';
    }
    return null;
}
