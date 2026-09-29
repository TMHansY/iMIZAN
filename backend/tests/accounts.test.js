import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import { protect } from '../middleware/authMiddleware.js';
import { authUser, registerUser } from '../controllers/userController.js';

const secret = 'test-only-secret';
process.env.JWT_SECRET = secret;
const id = '507f1f77bcf86cd799439011';
afterEach(() => mock.restoreAll());

async function invoke(handler, req) {
  const result = { status: 200, cookies: [], nextCalled: false };
  const res = {
    status(code) {
      result.status = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
    cookie(...args) {
      result.cookies.push(args);
      return this;
    },
  };
  await handler(req, res, (error) => {
    result.nextCalled = true;
    result.error = error;
  });
  return result;
}

const registration = {
  name: 'Test Student',
  email: 'student@example.test',
  idNumber: 'S001',
  password: 'strong-password',
  role: 'student',
};

test('account edits preserve the password hash and password changes are hashed once', async () => {
  mock.method(User.collection, 'insertOne', async () => ({ acknowledged: true, insertedId: id }));
  mock.method(User.collection, 'updateOne', async () => ({
    acknowledged: true,
    matchedCount: 1,
    modifiedCount: 1,
  }));
  const user = new User({ ...registration, isApproved: false });
  await user.save();
  const hash = user.password;
  assert.notEqual(hash, registration.password);
  assert.equal(await bcrypt.compare(registration.password, hash), true);
  user.isApproved = true;
  user.hasBeenApproved = true;
  await user.save();
  assert.equal(user.password, hash);
  user.isApproved = false;
  await user.save();
  assert.equal(user.password, hash);
  user.password = 'replacement-password';
  await user.save();
  assert.equal(await bcrypt.compare('replacement-password', user.password), true);
  assert.equal(await bcrypt.compare(registration.password, user.password), false);
});

test('required account fields are enforced by the schema', () => {
  const errors = new User({}).validateSync().errors;
  for (const field of ['name', 'email', 'idNumber', 'password', 'role']) assert.ok(errors[field]);
});

test('registration rejects admin roles and invalid input before querying the database', async () => {
  const lookup = mock.method(User, 'findOne', async () => {
    throw new Error('Unexpected database access');
  });
  for (const body of [
    { ...registration, role: 'admin' },
    { ...registration, name: '' },
    { ...registration, password: '123' },
    { ...registration, email: {} },
  ]) {
    const result = await invoke(registerUser, { body });
    assert.equal(result.status, 400);
    assert.ok(result.error);
  }
  assert.equal(lookup.mock.callCount(), 0);
});

test('students and lecturers register pending approval without receiving a login cookie', async () => {
  mock.method(User, 'findOne', async () => null);
  const create = mock.method(User, 'create', async (data) => ({ ...data, _id: id }));
  for (const role of ['student', 'lecturer']) {
    const result = await invoke(registerUser, { body: { ...registration, role } });
    assert.equal(result.status, 201);
    assert.equal(result.cookies.length, 0);
  }
  for (const call of create.mock.calls) {
    assert.equal(call.arguments[0].isApproved, false);
    assert.equal(call.arguments[0].hasBeenApproved, false);
  }
});

test('login returns profile data and a cookie without exposing password hashes', async () => {
  mock.method(User, 'findOne', async () => ({
    ...registration,
    _id: id,
    password: 'private-hash',
    isApproved: true,
    matchPassword: async () => true,
  }));
  const result = await invoke(authUser, {
    body: { identifier: registration.email, password: registration.password },
  });
  assert.equal(result.status, 201);
  assert.equal(result.cookies[0][0], 'jwt');
  assert.equal(result.body.role, 'student');
  assert.equal('password' in result.body, false);
  assert.equal('password_encrypted' in result.body, false);
});

test('existing JWTs cannot access deleted, pending, or deactivated accounts', async () => {
  const token = jwt.sign({ userId: id }, secret);
  for (const user of [null, { isApproved: false }, { isApproved: false, hasBeenApproved: true }]) {
    mock.method(User, 'findById', () => ({ select: async () => user }));
    const req = { cookies: { jwt: token } };
    const result = await invoke(protect, req);
    assert.equal(result.status, user ? 403 : 401);
    assert.ok(result.error);
    assert.equal(req.user, undefined);
    mock.restoreAll();
  }
});

test('approved and legacy accounts retain access with password fields excluded', async () => {
  const token = jwt.sign({ userId: id }, secret);
  for (const user of [{ _id: id, isApproved: true }, { _id: id }]) {
    mock.method(User, 'findById', () => ({
      select: async (fields) => {
        assert.equal(fields, '-password');
        return user;
      },
    }));
    const req = { cookies: { jwt: token } };
    const result = await invoke(protect, req);
    assert.equal(result.nextCalled, true);
    assert.equal(result.error, undefined);
    assert.equal(req.user, user);
    mock.restoreAll();
  }
});

test('missing, expired, malformed and invalid JWTs are rejected without database access', async () => {
  const lookup = mock.method(User, 'findById', () => {
    throw new Error('Unexpected database access');
  });
  for (const token of [
    undefined,
    'invalid',
    jwt.sign({ userId: id }, secret, { expiresIn: -1 }),
    jwt.sign({ userId: 'bad-id' }, secret),
  ]) {
    const result = await invoke(protect, { cookies: { jwt: token } });
    assert.equal(result.status, 401);
    assert.ok(result.error);
  }
  assert.equal(lookup.mock.callCount(), 0);
});
