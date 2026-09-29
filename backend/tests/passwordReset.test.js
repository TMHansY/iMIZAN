import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { adminResetPassword } from '../controllers/passwordResetController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  authUser,
  approveUser,
  rejectUser,
  bulkApproveUsers,
  bulkRejectUsers,
} from '../controllers/userController.js';

const adminId = '507f1f77bcf86cd799439011';
const targetId = '507f1f77bcf86cd799439012';
const secret = 'reset-test-only-secret';
process.env.JWT_SECRET = secret;
const body = {
  password: 'replacement-password',
  confirmPassword: 'replacement-password',
  adminPassword: 'admin-password',
};
const request = (overrides = {}) => ({
  user: { _id: adminId, role: 'admin' },
  params: { id: targetId },
  body,
  ...overrides,
});
afterEach(() => mock.restoreAll());

async function invoke(handler, req) {
  const result = { status: 200, cookies: [] };
  const res = {
    status(code) {
      result.status = code;
      return this;
    },
    json(value) {
      result.body = value;
      return this;
    },
    set() {
      return this;
    },
    cookie(...args) {
      result.cookies.push(args);
      return this;
    },
  };
  await handler(req, res, (error) => {
    result.error = error;
    result.next = !error;
  });
  return result;
}

test('password reset rejects non-admins and invalid input before accessing the database', async () => {
  const lookup = mock.method(User, 'findById', () => {
    throw new Error('Unexpected lookup');
  });
  for (const role of ['student', 'lecturer']) {
    assert.equal(
      (await invoke(adminResetPassword, request({ user: { _id: adminId, role } }))).status,
      403,
    );
  }
  for (const overrides of [
    { params: { id: 'invalid' } },
    { params: { id: adminId } },
    { params: { id: adminId.toUpperCase() } },
    { body: { ...body, password: 'short' } },
    { body: { ...body, password: {} } },
    { body: { ...body, password: '🔑'.repeat(20), confirmPassword: '🔑'.repeat(20) } },
    { body: { ...body, confirmPassword: 'different-password' } },
    { body: { ...body, adminPassword: '' } },
  ])
    assert.equal((await invoke(adminResetPassword, request(overrides))).status, 400);
  assert.equal(lookup.mock.callCount(), 0);
});

test('reset requires the administrator current password', async () => {
  mock.method(User, 'findById', async () => ({ matchPassword: async () => false }));
  const update = mock.method(User, 'findOneAndUpdate', () => {
    throw new Error('Unexpected update');
  });
  assert.equal((await invoke(adminResetPassword, request())).status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test('reset stores a working hash and increments sessions without changing approval or role', async () => {
  mock.method(User, 'findById', async () => ({
    matchPassword: async (password) => password === body.adminPassword,
  }));
  const update = mock.method(User, 'findOneAndUpdate', async (filter, change) => {
    assert.deepEqual(filter, { _id: targetId });
    assert.deepEqual(Object.keys(change.$set), ['password']);
    assert.equal(await bcrypt.compare(body.password, change.$set.password), true);
    assert.equal(await bcrypt.compare('old-password', change.$set.password), false);
    assert.deepEqual(change.$inc, { sessionVersion: 1 });
    return { _id: targetId, isApproved: false, role: 'student' };
  });
  const result = await invoke(adminResetPassword, request());
  assert.equal(result.status, 200);
  assert.equal(update.mock.callCount(), 1);
  assert.deepEqual(Object.keys(result.body), ['message']);
  assert.equal(JSON.stringify(result.body).includes(body.password), false);
});

test('a deleted target is reported instead of claiming reset success', async () => {
  mock.method(User, 'findById', async () => ({ matchPassword: async () => true }));
  mock.method(User, 'findOneAndUpdate', async () => null);
  assert.equal((await invoke(adminResetPassword, request())).status, 404);
});

test('reset invalidates legacy and older JWTs but accepts a newly issued login token', async () => {
  const user = {
    _id: targetId,
    role: 'student',
    isApproved: true,
    sessionVersion: 2,
    matchPassword: async () => true,
  };
  mock.method(User, 'findById', () => ({ select: async () => user }));
  for (const claims of [{ userId: targetId }, { userId: targetId, sessionVersion: 1 }]) {
    const result = await invoke(protect, { cookies: { jwt: jwt.sign(claims, secret) } });
    assert.equal(result.status, 401);
  }
  mock.method(User, 'findOne', async () => user);
  const login = await invoke(authUser, {
    body: { identifier: 'student@example.test', password: body.password },
  });
  const token = login.cookies[0][1];
  assert.equal(jwt.verify(token, secret).sessionVersion, 2);
  assert.equal((await invoke(protect, { cookies: { jwt: token } })).next, true);
});

test('single and bulk account decisions work without an email provider', async () => {
  const account = { _id: targetId, email: 'student@example.test', save: async () => {} };
  mock.method(User, 'findById', async () => account);
  mock.method(User, 'find', async () => [account]);
  const update = mock.method(User, 'updateMany', async () => ({ modifiedCount: 1 }));
  const remove = mock.method(User, 'deleteOne', async () => ({ deletedCount: 1 }));
  const removeMany = mock.method(User, 'deleteMany', async () => ({ deletedCount: 1 }));
  const network = mock.method(globalThis, 'fetch', () => {
    throw new Error('Unexpected network request');
  });
  for (const handler of [approveUser, rejectUser, bulkApproveUsers, bulkRejectUsers]) {
    const result = await invoke(handler, request({ body: { ids: [targetId] } }));
    assert.equal(result.status, 200);
    assert.equal(result.error, undefined);
  }
  assert.equal(account.isApproved, true);
  assert.equal(update.mock.callCount(), 1);
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(removeMany.mock.callCount(), 1);
  assert.equal(network.mock.callCount(), 0);
});
