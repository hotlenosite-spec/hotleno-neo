import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  supplierScope?: string | null;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === 'your-secret-key') {
    throw new Error('JWT_SECRET is required and must be set to a strong server-side secret');
  }

  return secret;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};
