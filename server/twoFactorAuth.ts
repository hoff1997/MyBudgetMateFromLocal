import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { createHash } from 'crypto';

export interface TwoFactorSetup {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  usedBackupCode?: string;
}

/**
 * Generate a new 2FA secret and QR code for user setup
 */
export async function generateTwoFactorSecret(username: string, appName: string = 'My Budget Mate'): Promise<TwoFactorSetup> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${appName} (${username})`,
    issuer: appName,
    length: 32
  });

  // Generate QR code data URL
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  return {
    secret: secret.base32!,
    qrCodeDataUrl,
    backupCodes
  };
}

/**
 * Verify a 2FA token or backup code
 */
export function verifyTwoFactorToken(
  secret: string, 
  token: string, 
  backupCodes: string[] = []
): TwoFactorVerification {
  // Remove any spaces from token
  const cleanToken = token.replace(/\s/g, '');

  // First try TOTP verification
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: cleanToken,
    window: 2 // Allow 30 seconds drift
  });

  if (verified) {
    return { isValid: true };
  }

  // If TOTP fails, check backup codes
  const matchingBackupCode = backupCodes.find(code => 
    cleanToken === code
  );

  if (matchingBackupCode) {
    return { 
      isValid: true, 
      usedBackupCode: matchingBackupCode 
    };
  }

  return { isValid: false };
}

/**
 * Generate secure backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-digit backup code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Remove a used backup code from the array
 */
export function removeUsedBackupCode(backupCodes: string[], usedCode: string): string[] {
  return backupCodes.filter(code => code !== usedCode);
}

/**
 * Check if user needs to regenerate backup codes (less than 3 remaining)
 */
export function shouldRegenerateBackupCodes(backupCodes: string[]): boolean {
  return backupCodes.length < 3;
}