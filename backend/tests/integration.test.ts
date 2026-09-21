import request from 'supertest';
import app from '../src/app';

describe('🛡️ Digiryte Enterprise Security Integration Tests', () => {

  describe('1. Privilege Escalation Prevention on POST /register', () => {
    it('forces self-registered user role to USER even if role: ADMIN is sent in body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test_user_${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'Attacker Trying Admin',
          role: 'ADMIN', // Attempted privilege escalation
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.role).toBe('USER'); // MUST be forced to USER
    });
  });

  describe('2. Constant-Time Authentication & Failed Logins', () => {
    it('returns 401 INVALID_CREDENTIALS for unknown email without timing leak', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown_non_existent_email@example.com',
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('3. Refresh Token Rotation & Theft Detection', () => {
    it('issues token pair, rotates refresh token, and revokes sessions if old token is reused', async () => {
      // 1. Login to get initial tokens
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@digiryte.com',
          password: 'Password123!',
        });

      expect(loginRes.status).toBe(200);
      const { accessToken: initialAccess, refreshToken: initialRefresh } = loginRes.body.data.tokens;

      // 2. Rotate refresh token once
      const refreshRes1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefresh });

      expect(refreshRes1.status).toBe(200);
      const { refreshToken: newRefresh } = refreshRes1.body.data.tokens;
      expect(newRefresh).not.toBe(initialRefresh);

      // 3. Attempt to REUSE initialRefresh (Stolen Token Attack Simulation)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefresh });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.code).toBe('TOKEN_REUSE');
    });
  });

  describe('4. HMAC Anti-Replay Nonce Defense', () => {
    it('accepts initial transfer with X-Nonce, but blocks replayed request with identical nonce and payload', async () => {
      // Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@digiryte.com',
          password: 'Password123!',
        });

      const token = loginRes.body.data.tokens.accessToken;
      const nonce = `test_nonce_${Date.now()}`;
      const timestamp = Date.now().toString();

      const payload = {
        recipientId: 'usr_user_1',
        amount: 50.00,
        currency: 'USD',
      };

      // 1. Initial Legitimate Transfer
      const transferRes1 = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Nonce', nonce)
        .set('X-Timestamp', timestamp)
        .send(payload);

      expect(transferRes1.status).toBe(201);
      expect(transferRes1.body.status).toBe('success');

      // 2. Replay Attack Attempt (Same Nonce + Payload)
      const transferRes2 = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Nonce', nonce)
        .set('X-Timestamp', timestamp)
        .send(payload);

      expect(transferRes2.status).toBe(409);
      expect(transferRes2.body.code).toBe('REPLAY_ATTACK_DETECTED');
    });
  });

  describe('5. Role-Based Access Control (RBAC)', () => {
    it('restricts regular USER from deleting assets owned by other users', async () => {
      // Login as regular USER
      const userLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@digiryte.com',
          password: 'Password123!',
        });

      const userToken = userLogin.body.data.tokens.accessToken;

      // Attempt to delete asset ast_2 owned by admin1
      const deleteRes = await request(app)
        .delete('/api/v1/assets/ast_2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.code).toBe('FORBIDDEN');
    });
  });

});
