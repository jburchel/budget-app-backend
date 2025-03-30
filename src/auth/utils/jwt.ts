import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { JwtPayload } from '../interfaces/auth.interface';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
// Provide a default value directly if JWT_EXPIRES_IN is not set
const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '1d';

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env file');
  process.exit(1);
}

/**
 * Generates a JWT for a given payload.
 * @param payload - The payload to include in the token.
 * @returns The generated JWT string.
 */
export const generateToken = (payload: JwtPayload): string => {
  // Pass options directly, using the variable with a default
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn });
};

/**
 * Verifies a JWT and returns its payload.
 * @param token - The JWT string to verify.
 * @returns The decoded payload if the token is valid, otherwise null.
 */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    // Ensure verification also uses the non-null asserted secret
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
};
