import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository';
import { User } from '../types';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const session = (user: User) => ({ user, token: signToken({ sub: user.id, role: user.role }) });

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    if (await userRepository.findByEmailWithHash(input.email)) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    try {
      // Public registration always creates role "user". Admins are created with `npm run create-admin`.
      return session(await userRepository.create({ name: input.name, email: input.email, passwordHash, role: 'user' }));
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      throw err;
    }
  },

  async login(input: { email: string; password: string }) {
    const row = await userRepository.findByEmailWithHash(input.email);
    const valid = await bcrypt.compare(input.password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    const { passwordHash: _omit, ...user } = row;
    return session(user);
  },
};
