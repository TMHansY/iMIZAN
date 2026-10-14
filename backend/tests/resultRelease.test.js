import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import Result from "../models/resultModel.js";
import Exam from "../models/examModel.js";
import { releaseSelectedResults } from "../controllers/resultController.js";

const lecturerId = "507f1f77bcf86cd799439011";
const firstId = "507f1f77bcf86cd799439012";
const secondId = "507f1f77bcf86cd799439013";
const request = (overrides = {}) => ({
  user: { _id: lecturerId, role: "lecturer" },
  body: { ids: [firstId, secondId] },
  ...overrides,
});
afterEach(() => mock.restoreAll());

async function invoke(req = request()) {
  const response = { status: 200 };
  await releaseSelectedResults(
    req,
    {
      status(code) {
        response.status = code;
        return this;
      },
      json(body) {
        response.body = body;
        return this;
      },
    },
    (error) => {
      response.error = error;
    }
  );
  return response;
}

function database(results, exams) {
  const find = mock.method(Result, "find", () => ({
    select: async () => results,
  }));
  mock.method(Exam, "find", async () => exams);
  const update = mock.method(Result, "updateMany", async () => ({
    matchedCount: results.length,
    modifiedCount: results.length,
  }));
  return { find, update };
}

test("bulk release rejects non-lecturers and invalid selections before accessing results", async () => {
  const { find, update } = database([], []);
  for (const role of ["student", "admin"]) {
    assert.equal(
      (await invoke(request({ user: { _id: lecturerId, role } }))).status,
      403
    );
  }
  for (const ids of [
    undefined,
    [],
    "invalid",
    ["bad-id"],
    [null],
    [{ $ne: null }],
  ]) {
    assert.equal((await invoke(request({ body: { ids } }))).status, 400);
  }
  assert.equal(find.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test("bulk release refuses a mixed selection containing another lecturer’s exam", async () => {
  const { update } = database(
    [{ examId: "one" }, { examId: "two" }],
    [
      { examId: "one", createdBy: lecturerId },
      { examId: "two", createdBy: "someone-else" },
    ]
  );
  assert.equal((await invoke()).status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test("missing selected results prevent any release", async () => {
  const { update } = database(
    [{ examId: "one" }],
    [{ examId: "one", createdBy: lecturerId }]
  );
  assert.equal((await invoke()).status, 404);
  assert.equal(update.mock.callCount(), 0);
});

test("missing exams prevent any release", async () => {
  const { update } = database(
    [{ examId: "one" }, { examId: "two" }],
    [{ examId: "one", createdBy: lecturerId }]
  );
  assert.equal((await invoke()).status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test("release deduplicates selected IDs and only sets visibility, retaining legacy exam permissions", async () => {
  const { find, update } = database(
    [{ examId: "one" }, { examId: "legacy" }],
    [{ examId: "one", createdBy: lecturerId }, { examId: "legacy" }]
  );
  const response = await invoke(
    request({ body: { ids: [firstId, secondId, firstId.toUpperCase()] } })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(find.mock.calls[0].arguments, [
    { _id: { $in: [firstId, secondId] } },
  ]);
  assert.deepEqual(update.mock.calls[0].arguments, [
    { _id: { $in: [firstId, secondId] }, examId: { $in: ["one", "legacy"] } },
    { $set: { showToStudent: true } },
  ]);
  assert.equal(response.body.data.modifiedCount, 2);
  update.mock.mockImplementation(async () => ({
    matchedCount: 2,
    modifiedCount: 0,
  }));
  const retry = await invoke();
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.modifiedCount, 0);
  assert.deepEqual(update.mock.calls[1].arguments[1], {
    $set: { showToStudent: true },
  });
});
