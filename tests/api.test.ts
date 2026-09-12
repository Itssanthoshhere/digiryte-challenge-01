import request from 'supertest';
import app from '../src/app';
import { dbStore } from '../src/services/dbStore';
import { generateUUID } from '../src/utils/crypto';

describe('Digiryte Technical Challenge API Tests', () => {
  beforeEach(() => {
    // Reset seed data before each test
    dbStore.seedDefaults();
  });

  describe('1. Authentication & Token Revocation Flow', () => {
    it('should register a new user successfully and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          name: 'New Developer',
          role: 'USER',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should REVOKE access token upon logout and reject subsequent requests with HTTP 401', async () => {
      // Step 1: Login to acquire access token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.data.tokens.accessToken;

      // Step 2: Access protected route successfully
      const meResBefore = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResBefore.status).toBe(200);

      // Step 3: Logout to invalidate token in Redis blocklist
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('revoked');

      // Step 4: Attempt to use revoked token -> MUST BE REJECTED with 401
      const meResAfter = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResAfter.status).toBe(401);
      expect(meResAfter.body.code).toBe('TOKEN_REVOKED');
    });
  });

  describe('2. Role-Based Access Control (RBAC)', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      const userLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'Password123!' });
      userToken = userLogin.body.data.tokens.accessToken;

      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@example.com', password: 'Password123!' });
      adminToken = adminLogin.body.data.tokens.accessToken;
    });

    it('should allow USER to fetch only their own assets, but ADMIN to fetch all assets', async () => {
      const userRes = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userRes.status).toBe(200);
      expect(userRes.body.meta.scope).toBe('USER_OWNED_ONLY');
      expect(userRes.body.data.assets.length).toBe(1);

      const adminRes = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.meta.scope).toBe('GLOBAL_SYSTEM_ALL');
      expect(adminRes.body.data.assets.length).toBe(2);
    });

    it('should FORBID regular USER from deleting an asset owned by another user', async () => {
      // ast_2 is owned by admin (usr_admin_1)
      const res = await request(app)
        .delete('/api/v1/assets/ast_2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should ALLOW ADMIN to delete any asset', async () => {
      // ast_1 is owned by user (usr_user_1)
      const res = await request(app)
        .delete('/api/v1/assets/ast_1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('3. Anti-Replay Defense', () => {
    let token: string;

    beforeEach(async () => {
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'Password123!' });
      token = login.body.data.tokens.accessToken;
    });

    it('should allow first request with valid nonce and timestamp', async () => {
      const nonce = generateUUID();
      const timestamp = Date.now().toString();

      const res = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .set('x-nonce', nonce)
        .set('x-timestamp', timestamp)
        .send({
          recipientId: 'usr_admin_1',
          amount: 250.0,
          currency: 'USD',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
    });

    it('should REJECT duplicate request using the SAME nonce with HTTP 409 Replay Attack Detected', async () => {
      const nonce = generateUUID();
      const timestamp = Date.now().toString();

      // First Request -> Succeds
      const res1 = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .set('x-nonce', nonce)
        .set('x-timestamp', timestamp)
        .send({
          recipientId: 'usr_admin_1',
          amount: 250.0,
          currency: 'USD',
        });
      expect(res1.status).toBe(201);

      // Replayed Request -> Must be blocked!
      const res2 = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .set('x-nonce', nonce)
        .set('x-timestamp', timestamp)
        .send({
          recipientId: 'usr_admin_1',
          amount: 250.0,
          currency: 'USD',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.code).toBe('REPLAY_ATTACK_DETECTED');
    });
  });

  describe('4. Server-Side Input Validation', () => {
    it('should return HTTP 400 with validation details for invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'short',
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details.length).toBeGreaterThan(0);
    });
  });
});
