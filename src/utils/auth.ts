import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function generateHash(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(hash: string, password: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createJwtToken(username: string): string {
  return jwt.sign({ username }, process.env.JWT_SECRET_KEY as string, { expiresIn: '1h' });
}