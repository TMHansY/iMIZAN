# Understanding iMIZAN: a beginner's walkthrough of the code

This guide explains the repository inspected on 2 October 2026. It assumes you know basic variables, functions, conditions, and loops, but are still learning full-stack development. Examples marked “simplified” illustrate the existing code; they are not additional implementation. This is a source-code walkthrough, not a verification of a live deployment.

Read it in order once. Afterwards, open the linked files while following the relevant explanation. You do not need to memorise every CSS value or library import. Aim to explain each file's responsibility, its inputs, its decisions, and its outputs.

**1. What the whole application does**

iMIZAN is an examination platform. Administrators manage accounts and courses. Lecturers manage their courses' enrollments, prepare examinations, and review submissions. Students enroll, answer timed multiple-choice examinations, and view released results.

During an examination, the browser uses pretrained computer-vision models and browser events to flag certain conditions. The application attempts to attach webcam screenshots so a lecturer can review the circumstances. A flag is not proof of cheating.

There are four important places where work happens:

| Place | Responsibility |
| --- | --- |
| Student/lecturer/admin browser | Runs React, displays pages, handles user input, makes API calls; the student exam page also runs camera inference. |
| Node.js backend | Runs Express routes, authenticates requests, checks permissions, manages attempts, and scores answers. |
| MongoDB | Stores application records that must survive closing the browser. |
| Uploadcare | Stores uploaded image files and returns URLs used by the application. |

```text
User action in React
        |
        v
HTTP request to Express
        |
        v
Authentication / permission checks
        |
        v
Controller reads or changes MongoDB through Mongoose
        |
        v
JSON response to React
        |
        v
React updates the interface

Separate image path:
Browser -> Uploadcare -> image URL -> backend -> MongoDB metadata
```

This is a MERN application: MongoDB, Express, React, and Node.js. Express runs inside Node.js; it is not a separate database or separate computer. The backend is one application organised into modules.

**2. The vocabulary you need before reading the files**

| Term | Meaning in this project |
| --- | --- |
| Frontend | Code that builds and controls the browser interface. |
| Backend | Server code that accepts requests and applies application rules. |
| API | The set of operations the frontend can request from the backend. |
| Endpoint | One API address together with an HTTP method, such as `POST /api/users/auth`. |
| Request | A message asking the server to do something. |
| Response | The server's reply, including a status code and usually JSON. |
| JSON | Text representing objects, arrays, strings, numbers, booleans, and null. |
| Route | A rule matching a URL; Express routes select server handlers, React routes select pages. |
| Middleware | A function that processes a request before another handler, such as authentication. |
| Controller | The function implementing an API operation's decisions and database work. |
| Schema | A definition of stored fields and their constraints. |
| Model | The Mongoose object used to query and change documents of a particular type. |
| Component | A reusable React function that describes part of the screen. |
| Hook | A React function for state, effects, or reusable component logic. |
| State | Information that changes while the application runs. |
| Inference | Applying an already-trained AI model to new input. |
| Training | Learning model parameters from a dataset; iMIZAN does not implement its own model-training pipeline. |

HTTP methods generally express intent: `GET` reads, `POST` creates or triggers an action, `PUT` updates, and `DELETE` removes. Your API is not completely consistent: deleting an exam currently uses `POST`.

**3. The folder structure**

```text
iMIZAN_system/
  package.json                 backend dependencies and root commands
  package-lock.json            resolved dependency versions
  .env.example                 example backend configuration names
  README.md                    project/setup information
  backend/
    server.js                  server entry point
    config/                    MongoDB connection
    routes/                    API URL mappings
    middleware/                authentication and error handling
    controllers/               application rules
    models/                    MongoDB document schemas
    utils/                     shared backend helpers
    tests/                     backend regression tests
  frontend/
    package.json               browser dependencies and build commands
    public/                    HTML shell and public assets, including face models
    config-overrides.js        targeted bundler adjustments
    scripts/                   build-tool compatibility script
    src/
      index.js                 browser entry point
      App.js                   application providers and router
      routes/                  browser URL mappings
      views/                   complete pages
      components/              reusable interface pieces
      layouts/                 shared page frames, header, sidebar
      hooks/                   reusable exam-session logic
      slices/                  Redux and API definitions
      context/                 theme and older proctoring context
      theme/                   colours, typography, shadows
      utils/                   shuffle and image-upload helpers
      assets/                  images and logos imported by source files
  docs/                        explanations and study material
```

`node_modules` contains installed library code. You normally explain how you use those libraries, rather than claiming their source as your own work. A production `frontend/build` directory is generated from the frontend source.

**4. How to read the JavaScript syntax**

Consider these patterns, which recur throughout the repository:

```js
import Exam from '../models/examModel.js';
const { examId } = req.params;
const exam = await Exam.findOne({ examId });
```

`import` brings an exported value from another file. `../` means go up one directory. Destructuring, `{ examId }`, takes the `examId` property from an object. `{ examId }` in a query is shorthand for `{ examId: examId }`. `await` waits for an asynchronous operation's result inside an `async` function; it does not stop every other server request from running.

```js
const getName = (user) => user.name;
```

This is an arrow function: it accepts `user` and returns its `name`. `const` prevents assigning a different value to the variable; it does not automatically make every property of an object immutable.

```js
const next = { ...previous, currentQuestionIndex: 2 };
```

The spread operator copies the object's top-level properties, then changes one field in the new object. Nested objects need their own copying when changed. This is why the exam code spreads both `prev` and `prev.proctoringLog`.

```js
userInfo?.role
examName ?? existingName
question.ansmarks || 1
```

`?.` safely accesses a property if the object exists. `??` uses a fallback only for `null` or `undefined`. `||` uses a fallback for any falsy value, including `0`, `false`, and an empty string. Consequently, an `ansmarks` value of zero falls back to one in the current scorer.

Other recurring patterns:

| Pattern | Meaning |
| --- | --- |
| `array.map(fn)` | Produce a new array by transforming each entry. |
| `array.filter(fn)` | Keep entries that satisfy a condition. |
| `array.find(fn)` | Return the first matching entry. |
| `array.some(fn)` | Check whether at least one entry matches. |
| `array.every(fn)` | Check whether all entries match. |
| `array.reduce(fn, initial)` | Accumulate a result, such as a total. |
| `condition ? a : b` | Choose one of two values. |
| `` `${type}Count` `` | Construct a string, such as `cellPhoneCount`. |
| `[questionId]: optionId` | Use a variable's value as an object property name. |
| `try / catch / finally` | Attempt work, handle failure, then perform final cleanup. |
| `Promise.all([...])` | Wait for several asynchronous operations that can run together. |
| `export default` | Make a value the file's default export. |

A comment explains an author's intention. The executable statements establish what actually happens. Some route comments and interface instructions in this repository describe older or broader behaviour than the current implementation.

**5. Backend startup: `server.js`**

Open [backend/server.js](../backend/server.js).

The imports bring in Express, configuration loading, database connection code, route modules, and middleware.

`dotenv.config()` loads environment configuration. `connectDB()` initiates the MongoDB connection. `const app = express()` creates the Express application. The port comes from `process.env.PORT`, with `5050` as the fallback.

The `app.use(...)` calls install request-processing steps:

| Code | Purpose |
| --- | --- |
| `express.json()` | Parses JSON request bodies so controllers can read `req.body`. |
| `cors(...)` | Configures which browser origins can read cross-origin responses, including credentialed requests. |
| `express.urlencoded(...)` | Parses URL-encoded form bodies. |
| `cookieParser()` | Makes incoming cookies available as `req.cookies`. |
| `app.use('/api/users', userRoutes)` | Adds a URL prefix to that router's paths. |
| `express.static(...)` | Serves the compiled frontend in production. |
| `notFound`, then `errorHandler` | Handle unmatched requests and application errors. |
| `app.listen(...)` | Starts accepting HTTP requests on the selected port. |

CORS is a browser cross-origin policy; it does not replace login or role checks.

In production, a fallback serves `index.html` for browser routes such as `/dashboard`. React then selects the page. The development root handler references `__dirname` outside the block where it is declared, a code issue to fix if serving that root route in development. Normal development uses the React development server separately.

Open [backend/config/db.js](../backend/config/db.js). `mongoose.connect(process.env.MONGO_URL)` connects to MongoDB. A failed connection logs the error and exits the process. The code initiates this connection before listening, but does not explicitly `await connectDB()` in `server.js`.

**6. Routes, middleware, controllers, and models working together**

This actual route is a useful example:

```js
examRoutes.route('/exam').get(protect, getExams).post(protect, createExam);
```

The router is mounted under `/api/users`, so the complete endpoints are `GET /api/users/exam` and `POST /api/users/exam`.

For a GET request, Express first calls `protect`. If authentication succeeds, it calls `next()`, passing control to `getExams`. The controller queries `Exam` and returns JSON.

The three common controller arguments are:

- `req`: request data, including `body`, URL `params`, cookies, and the authenticated `user`.
- `res`: methods for sending a status, JSON, or cookies back to the browser.
- `next`: continues middleware processing or forwards an error.

`express-async-handler` wraps asynchronous controllers so rejected promises and thrown errors reach Express's error handler.

The route modules divide the API as follows:

| File | Main responsibilities |
| --- | --- |
| [userRoutes.js](../backend/routes/userRoutes.js) | Registration, login/logout, profile, account approval, account administration, resets, statistics. |
| [courseRoutes.js](../backend/routes/courseRoutes.js) | Course CRUD, available lecturers, a lecturer's assigned courses. |
| [enrollmentRoutes.js](../backend/routes/enrollmentRoutes.js) | Course applications, application lists, approval/rejection. |
| [examRoutes.js](../backend/routes/examRoutes.js) | Exams, questions, and proctoring log endpoints. |
| [resultRoutes.js](../backend/routes/resultRoutes.js) | Attempt start/save, submission, results, decisions, visibility, status summaries. |

Notice that attempt routes live in `resultRoutes.js`. Folder and file names are organisational choices; the route declarations determine behaviour.

**7. The database models, explained through a student**

Suppose Aina signs up, joins Programming Fundamentals, and takes Quiz 1. The database stores different records for different facts:

| Model/file in `backend/models` | What one document represents | Important fields |
| --- | --- | --- |
| `userModel.js` | Aina's account | Name, email, ID number, password hash, role, approval flags, session version. |
| `courseModel.js` | Programming Fundamentals | Course code/name, lecturer reference, student limit, course UUID. |
| `enrollmentModel.js` | Aina's membership application | Student reference, course UUID, pending/approved/rejected status. |
| `examModel.js` | Quiz 1's configuration | Name, course UUID, creator, duration, availability, attempt limit, navigation/review/randomisation settings. |
| `quesModel.js` | One question belonging to Quiz 1 | Question text, options, correct-answer flags, image URL, marks, exam UUID. |
| `examAttemptModel.js` | Aina's particular session taking Quiz 1 | Student, attempt slot, start/deadline, answers, question index, proctoring progress, status. |
| `resultModel.js` | The final outcome of that session | Attempt reference, saved answers, marks, percentage, elapsed time, release flag, lecturer decision. |
| `cheatingLogModel.js` | The session's final proctoring record | Attempt reference, event counts, student details, screenshot metadata. |

An **Exam** is shared configuration. An **ExamAttempt** belongs to one student taking it. A **Result** is the final outcome. Keeping them separate lets the application save an unfinished attempt without pretending it is a completed result.

MongoDB gives documents an `_id`. User and attempt relationships commonly use MongoDB ObjectIds. Courses and exams also have application UUID strings named `courseId` and `examId`; these are different from their MongoDB `_id` values.

Answers are stored by IDs, approximately like this:

```js
answers = {
  questionIdA: 'selectedOptionIdB',
  questionIdC: 'selectedOptionIdD'
};
```

They are not stored as “the second displayed answer.” This matters when answer choices are shuffled.

Schema settings mean:

- `required`: the field must be supplied as required by the schema.
- `default`: a starting value if omitted.
- `enum`: permitted values, such as the three roles.
- `ref`: identifies the model used for population of a reference.
- `timestamps: true`: maintains `createdAt` and `updatedAt`.
- `unique`: declares a unique database index; it is not simply a friendly form validation rule.

Important indexes prevent duplicate student/course enrollment records, duplicate attempt slots, and more than one active attempt per student/exam. Modern results and final logs have unique attempt references. Their sparse indexes accommodate older records without those fields.

Relationships are managed by the application; MongoDB does not automatically cascade-delete every related record like a configured relational foreign-key cascade might.

**8. Reading Mongoose queries**

| Code pattern | Plain-language meaning |
| --- | --- |
| `User.findById(id)` | Find one user by MongoDB ID. |
| `Exam.findOne({ examId })` | Find one exam with that exam UUID. |
| `Result.find({ userId })` | Find the results matching that student. |
| `.select('-password')` | Exclude the password field. |
| `.populate('userId', 'name email')` | Resolve a user reference and include name/email in the returned data. |
| `.sort({ createdAt: -1 })` | Newest records first. |
| `Model.countDocuments(filter)` | Count matching records. |
| `Model.exists(filter)` | Check whether a matching record exists. |
| `document.save()` | Validate and save a document, executing its relevant save middleware. |
| `findOneAndUpdate(filter, update, options)` | Find and update a matching record. |
| `$set` | Assign field values. |
| `$inc` | Increment a numeric field. |
| `$setOnInsert` | Set fields only if an upsert creates a record. |
| `upsert: true` | Insert if no matching record exists. |
| `new: true` | Return the updated document. |
| `$or`, `$in`, `$exists`, `$gt` | Alternative conditions, membership, field existence, greater-than comparison. |

The result controller also uses aggregation: `$match` selects records and `$group` combines them to count pending reviews per exam.

**9. Registration, login, and session checks**

Open [userController.js](../backend/controllers/userController.js), [userModel.js](../backend/models/userModel.js), [generateToken.js](../backend/utils/generateToken.js), and [authMiddleware.js](../backend/middleware/authMiddleware.js).

`registerUser` validates required text, allows only student/lecturer registration, checks a minimum password length, and checks duplicate email/ID number. It creates an account with both approval flags false. Public registration does not create administrators and does not issue a login cookie.

The user schema has a `pre('save')` hook. Before saving a changed password, it generates a bcrypt salt and stores a hash. The `isModified('password')` check prevents approving an account from hashing an already-hashed password again.

A hash is not reversible encryption. At login, bcrypt compares the supplied password against the stored hash through `matchPassword`.

`authUser` searches by either email or ID number, checks the password, and rejects an unapproved/deactivated account. On success, `generateToken` signs a JWT containing `userId` and `sessionVersion`, with a 30-day expiry.

The JWT is sent in a cookie with `HttpOnly`, `Secure`, and `SameSite=None`. `HttpOnly` prevents ordinary frontend JavaScript from reading the cookie. The browser sends it with eligible requests. Deployment needs compatible HTTPS, origin, and credential settings.

The JSON login response separately includes display information such as name and role. React stores this profile for the interface. The profile is not the authentication token.

For a protected request, `protect`:

1. Reads the JWT cookie.
2. Verifies the token signature and expiry.
3. Validates the decoded user ID format.
4. Loads the current user without the password.
5. Checks the session version and account approval state.
6. Assigns the user to `req.user`.
7. Calls `next()`.

Authentication answers “Who is making this request?” Authorization answers “May that person perform this operation?” A valid login alone does not make someone an administrator or the owner of an exam.

Logout expires the cookie; the frontend also clears its stored user profile.

**10. Account administration and password recovery**

The remaining account controller functions perform these jobs:

| Function | Responsibility |
| --- | --- |
| `getUserProfile` / `updateUserProfile` | Read the current profile; change name/email and optionally password. |
| `getPendingUsers` | List accounts awaiting initial approval. |
| `approveUser` / `bulkApproveUsers` | Set approval and prior-approval flags. |
| `rejectUser` / `bulkRejectUsers` | Remove selected accounts through the rejection operations. |
| `getAllAccounts` | List accounts that have previously been approved. |
| `toggleAccountActive` | Deactivate/reactivate an account subject to controller checks. |
| `getSystemStats` | Count students, lecturers, exams, results, and pending accounts. |
| `deleteAccount` | Remove an eligible deactivated non-admin account. |

`hasBeenApproved` distinguishes a new pending account from an account that was approved and later deactivated.

[passwordResetController.js](../backend/controllers/passwordResetController.js) implements administrator-managed recovery. It checks the administrator role, target ID, matching replacement passwords, password bounds, and the administrator's own password. It disallows using this action to reset oneself.

The controller hashes the replacement explicitly and updates the password together with `$inc: { sessionVersion: 1 }`. Explicit hashing is needed because this query update does not execute the document's save hook. Older JWTs then fail the version comparison in `protect`.

`ForgotPassword.jsx` gives instructions to contact the administrator. There is no outgoing password-reset email or single-use recovery-link workflow. The instruction to change the replacement password is not an enforced first-login screen.

**11. Course and enrollment code**

[courseController.js](../backend/controllers/courseController.js) lists courses, creates/updates them for administrators, verifies assigned lecturers, and returns the courses assigned to the current lecturer. Deleting a course is rejected if exams remain attached. When deletion is allowed, its enrollment records are also removed.

[enrollmentController.js](../backend/controllers/enrollmentController.js) handles the student-course relationship:

1. `applyToCourse` checks the student role and course existence, rejects an existing application, and creates a pending record.
2. `getMyEnrollments` returns the current student's records.
3. `getEnrollmentsForCourse` verifies the course's assigned lecturer and returns its applications.
4. `approveEnrollment` checks lecturer assignment and the current approved count against the course limit.
5. `rejectEnrollment` changes a record to rejected after verifying assignment.

Account approval and course enrollment are separate permissions. A student can be allowed to log in while still waiting to join a particular course.

The course capacity check counts then updates; it is not an atomic reservation of the final seat. This is an example of why application rules and concurrency guarantees are different subjects.

**12. Exam creation and questions**

[examController.js](../backend/controllers/examController.js) implements `getExams`, `createExam`, `updateExam`, and `DeleteExamById`.

The exam list is filtered by role. Lecturers see their exams plus compatible legacy records. Students see exams for approved course enrollments plus legacy exams without course associations. Administrators can receive all exams from this endpoint.

Creation checks the chosen course and whether the current user is its assigned lecturer. Updates and deletion use [checkExamOwnership.js](../backend/utils/checkExamOwnership.js). That helper requires a lecturer and matching creator, but also permits lecturers to access older exams without `createdBy`.

Deleting an exam also deletes its questions, results, attempts, and proctoring log documents. These are sequential operations, not a multi-document transaction or automatic Uploadcare image deletion.

[quesController.js](../backend/controllers/quesController.js) creates questions after verifying exam ownership and retrieves questions by exam ID. Each option contains text and an `isCorrect` flag. The question form uses four choices and a single correct-choice selection.

The creation controller does not currently enforce all form rules, such as the configured question-count limit or exactly one correct choice. Its retrieval controller returns whole question records, including `isCorrect`. These are concrete limitations to understand, rather than describing the answer key as securely hidden.

**13. How React starts**

Open [frontend/src/index.js](../frontend/src/index.js) and [App.js](../frontend/src/App.js).

The HTML shell in `frontend/public/index.html` contains an element with ID `root`. `ReactDOM.createRoot(...)` connects React to that element, and `root.render(...)` renders `App`.

React components return JSX, an HTML-like syntax that is compiled into JavaScript. A `.jsx` filename makes that usage explicit, but `.js` files in this build also contain JSX.

`App` arranges shared providers:

```text
ColorModeProvider
  AppContent
    Redux Provider
      CheatingLogProvider
        ToastContainer
        RouterProvider
```

A provider makes information available to descendant components. Redux supplies shared authentication/API state. The colour provider supplies the current theme and toggle function. `ToastContainer` renders notification messages. `RouterProvider` chooses the screen for the URL.

`CheatingLogProvider` is still mounted, but the current exam's working evidence is managed by `useExamAttempt`. Do not confuse the older context with the current saved attempt mechanism.

**14. Components, props, state, and events**

A simplified component looks like this:

```jsx
function QuestionTitle({ number }) {
  return <h2>Question {number}</h2>;
}
```

`number` is a prop: input supplied by the parent. Curly braces insert a JavaScript expression into JSX. A parent could use `<QuestionTitle number={3} />`.

Your real `MultipleChoiceQuestion` receives the question list, current position, selected option, and callback functions. It displays those inputs; its parent owns the exam progress.

State is React-managed memory:

```js
const [loading, setLoading] = useState(true);
```

`loading` is the current value. `setLoading(false)` schedules an update. React calls the component again to work out the new interface and updates the relevant browser DOM. This does not require a full page reload.

In an event handler such as `onClick={handleSubmit}`, the function is passed for React to call later. Writing `onClick={handleSubmit()}` would call it while rendering instead.

A controlled field receives its value from state and sends changes back through a handler:

```jsx
<RadioGroup value={selectedOption} onChange={handleOptionChange} />
```

The event handler reads the chosen option and calls the parent's callback. This pattern keeps what the user sees consistent with the stored answer.

When rendering arrays, `key={option._id}` gives React a stable identity for each option. A key is not an authentication or database security feature.

**15. React hooks in your code**

| Hook | Purpose and example |
| --- | --- |
| `useState` | Values that affect the displayed screen, such as a dialog being open. |
| `useEffect` | Synchronise with outside systems: fetch data, add listeners, start timers, and clean them up. |
| `useRef` | Retain a mutable value or browser-element reference without requesting a render. |
| `useCallback` | Retain a function identity while its dependencies stay the same. |
| `useMemo` | Retain a calculated value while its dependencies stay the same, such as a theme. |
| `useContext` | Read a provider's shared context. |
| `useSelector` / `useDispatch` | Read Redux state / dispatch a Redux action. |
| `useNavigate` / `useParams` | Navigate to a URL / read route parameters. |

For example, `useEffect(..., [])` sets up work when that component instance mounts. A returned function is cleanup. With `[examId]`, an effect re-runs when the exam ID changes, after cleaning up the previous effect. Effects run after React commits a render; they are not simply ordinary code run during every render.

`useRef` is useful for the webcam video element, an interval ID, and an up-to-date progress snapshot. Changing `ref.current` does not update the screen. State is used where a visual update is needed.

A callback can retain variables from the render that created it; this is a closure. If a long-lived callback reads old state, it can see stale values. This matters to the proctoring repeat-event cooldown discussed later.

**16. Browser routing and layouts**

[Router.js](../frontend/src/routes/Router.js) maps URLs to components using `createBrowserRouter`.

| URL | Main component |
| --- | --- |
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | Authentication pages. |
| `/dashboard` | `Dashboard`. |
| `/courses` | `CoursesPage`. |
| `/exam` | `ExamPage`. |
| `/exam/:examId` | `ExamDetails`. |
| `/exam/:examId/:testId` | `TestPage`. |
| `/result`, `/review/:resultId` | Results and answer review. |
| `/create-exam`, `/edit-exam/:examId`, `/add-questions` | Lecturer assessment authoring. |
| `/course-enrollments`, `/exam-log` | Lecturer enrollment/evidence pages. |
| `/admin/approvals`, `/admin/accounts`, `/admin/stats`, `/admin/courses` | Administrator pages. |
| `/user/account`, `/user/tasks` | Account settings and task summaries. |
| `/Success` | Submission confirmation. |

`FullLayout` contains the header, sidebar, and an `Outlet`. The outlet is where the selected child page appears. `ExamLayout` contains the header and outlet without the main sidebar. `BlankLayout` supports the authentication route group, and `AuthLayout` provides the shared authentication presentation.

`PrivateRoute`, `LecturerRoute`, and `AdminRoute` decide whether to render an outlet or redirect based on frontend profile state. The `/user` route group is outside the main `PrivateRoute` wrapper, so do not claim every non-authentication route has identical guard coverage. Backend checks remain essential.

`lazy(() => import(...))` defers loading a page module until needed. `Loadable` and React `Suspense` provide loading handling while modules arrive.

The URL's `testId` is generated by Lodash `uniqueId()` for navigation. The authoritative attempt ID comes from MongoDB through the start API. They are different identifiers.

**17. Shared state, browser storage, and API calls**

[store.js](../frontend/src/store.js) configures Redux with the authentication reducer and RTK Query reducer/middleware. A reducer describes how an action changes state. Redux Toolkit permits mutation-like syntax while producing state updates through its supporting machinery.

[authSlice.js](../frontend/src/slices/authSlice.js) stores `userInfo`. `setCredentials` updates it and writes a JSON copy to `sessionStorage`; `logout` clears both. Redux memory itself does not survive a page reload; the initial state restores the stored profile.

| Location | What belongs there |
| --- | --- |
| Component state | Current input values, selected exam, loading/error display. |
| Refs | Video elements, latest progress, timer IDs, operation guards. |
| Redux | Shared profile and API cache. |
| Context | Shared theme values; also the older proctoring context. |
| `sessionStorage` | User profile and a pending exam-progress backup for that tab session. |
| `localStorage` | Theme preference; login also reads an optional redirect location. |
| HTTP-only cookie | Signed authentication token. |
| MongoDB | Durable account, course, attempt, result, and log records. |

The frontend uses two request approaches:

- **RTK Query:** `apiSlice.js` defines the base request configuration with credentials included. `usersApiSlice.js`, `examApiSlice.js`, and `cheatingLogApiSlice.js` add endpoints and generate React hooks.
- **Axios:** `axios.js` defines a shared base URL. Call sites such as the attempt hook supply `withCredentials: true` when sending protected requests.

Both speak HTTP to the same backend. Neither is a database.

```js
const { data, isLoading } = useGetQuestionsQuery(examId);
```

This fetches/caches question data and exposes loading state. A mutation returns a trigger function, for example `const [login] = useLoginMutation()`. Calling `login(values).unwrap()` yields the returned data or throws an error that can be caught.

Responses have different shapes. Some endpoints return an array directly; others return `{ success, data }`. Axios also wraps the HTTP response in its own `data` property. That is why `response.data.data` sometimes appears: first unwrap Axios, then unwrap the API's body.

**18. Trace a login through the frontend and backend**

1. `Login.js` creates a Formik form and Yup validation rules.
2. `AuthLogin.js` renders fields using the form's values, errors, touched state, and handlers.
3. The student submits an identifier and password.
4. `useLoginMutation` calls `POST /api/users/auth`.
5. Express selects `authUser`; it checks MongoDB and bcrypt, then sets the cookie.
6. The response profile goes into `dispatch(setCredentials(...))`.
7. Redux and `sessionStorage` receive the profile.
8. React navigates to `/`, which redirects to `/dashboard`.
9. Later API requests carry the cookie and are checked by `protect`.

Formik manages form interaction; Yup describes validation rules. Backend validation is still needed because HTTP requests can be sent without using your form.

Two details illustrate why you should read code rather than labels: the login password rule uses `.min(2)` while its message mentions eight characters, and the “Remember this Device” checkbox is not wired to choose a different session lifetime.

**19. Where the frontend pages fit**

Paths in this table are relative to `frontend/src/views`.

| File or group | Responsibility |
| --- | --- |
| `Dashboard.jsx` | Role-specific summaries and actions based on exams, results, and review counts. |
| `authentication/Login.js`, `Register.js` | Form setup, API submission, feedback, navigation. |
| `authentication/auth/AuthLogin.js`, `AuthRegister.js` | The corresponding form presentation. |
| `authentication/UserAccount.jsx`, `auth/AuthUpdate.jsx` | Profile editing interface and its form. |
| `authentication/ForgotPassword.jsx` | Administrator-contact recovery instructions. |
| `authentication/Loader.jsx`, `Error.js` | Loading feedback and error presentation. |
| `admin/PendingApprovals.jsx` | Review pending accounts and approve/reject them. |
| `admin/AccountManagement.jsx` | Manage previously approved accounts. |
| `admin/ResetPasswordDialog.jsx` | Collect and validate reset details and administrator confirmation. |
| `admin/CourseManagement.jsx` | Create/edit/delete courses and assign lecturers. |
| `admin/SystemStats.jsx` | Display counts returned by the statistics endpoint. |
| `student/CoursesPage.jsx` | Browse courses, apply, and show membership status. |
| `student/ExamPage.jsx`, `Components/Exams.jsx`, `Components/ExamCard.jsx` | Compose the exam listing and individual exam cards. |
| `student/ExamDetails.jsx` | Instructions, exam settings, attempts, camera preview, entry/resume action. |
| `student/TestPage.jsx` | Combine questions, progress controls, timer, camera, and exit handling. |
| `student/ResultPage.jsx` | Student result display and lecturer result/review controls, despite its folder name. |
| `student/ReviewPage.jsx` | Compare submitted selections with correct options. |
| `lecturer/CreateExamPage.jsx`, `EditExamPage.jsx` | Form state and requests for creating/updating exams. |
| `lecturer/components/ExamForm.jsx` | Shared exam fields and settings. |
| `lecturer/AddQuestions.jsx`, `components/AddQuestionForm.jsx` | Question authoring, option selection, optional image upload, API submission. |
| `lecturer/CourseEnrollments.jsx` | Review applications for assigned courses. |
| `lecturer/ExamLogPage.jsx`, `components/CheatingTable.jsx` | Select an exam and inspect its proctoring records. |
| `lecturer/components/DeleteIcon.jsx` | Exam-deletion interaction through the API. |
| `user/MyTasksPage.jsx` | Build a task list from exam and result/review data. |
| `Success.jsx` | Show submission confirmation and redirect after five seconds. |
| `sample-page/SamplePage.js` | Template/sample content, not a core examination workflow. |

Most large page files repeat a small pattern: imports, state, data loading, handlers, derived values, then JSX. Separate these blocks mentally before reading every line of visual markup.

**20. Styling and smaller interface files**

Material UI provides `Box`, `Stack`, `Grid`, `Card`, `Typography`, `Button`, `Dialog`, and other components. Emotion supports the styling system. The `sx` prop describes styles and can refer to theme values such as `primary.main`.

For example, `sx={{ p: { xs: 3, sm: 5 } }}` means use one spacing value on extra-small screens and another from the small breakpoint upwards. These numbers usually use the theme's spacing scale, rather than being literal pixel values.

| File/group in `frontend/src` | What it contributes |
| --- | --- |
| `layouts/full/header/Header.js` | Top navigation frame and its controls. |
| `layouts/full/header/Profile.js` | Profile menu and account/session actions. |
| `layouts/full/header/NotificationBell.jsx` | Status-derived notifications fetched from existing exam/result APIs. |
| `layouts/full/sidebar/Sidebar.js` | Permanent desktop drawer or temporary mobile drawer. |
| `layouts/full/sidebar/MenuItems.js` | Menu labels, icons, and destination URLs. |
| `layouts/full/sidebar/SidebarItems.js` | Filter menus by role and render entries/groups. |
| `layouts/full/sidebar/NavItem/index.js`, `NavGroup/NavGroup.js` | Individual navigation items and group labels. |
| `layouts/full/shared/logo/Logo.js` | Reusable logo presentation. |
| `components/container/PageContainer.js` | Page wrapper and document title/description through React Helmet. |
| `components/shared/BlankCard.js`, `DashboardCard.js` | Shared card presentation. |
| `components/shared/ContentSkeleton.jsx` | Placeholder content while loading. |
| `components/shared/PageHeading.jsx` | Shared page-heading presentation. |
| `components/shared/ThemeToggle.jsx` | Switch light/dark preference. |
| `components/forms/theme-elements/CustomTextField.js` | Consistent text-field styling. |
| `components/custom-scroll/Scrollbar.js` | Older reusable scrolling wrapper; it is not imported by the current source consumers found in this review. |
| `theme/DefaultColors.js`, `Typography.js`, `Shadows.js` | Theme creation, text styles, and shadows. |
| `context/ColorModeContext.jsx` | Pick an initial colour mode, persist it, and provide the MUI theme. |
| `assets/images/...` | Static branding and decorative resources. |

The notifications/tasks code derives lists from API data; it does not implement a separate WebSocket notification server or outgoing email service. Hiding a menu item only changes navigation presentation, not backend authorization.

**21. Starting an exam: the camera check and the actual attempt**

`ExamDetails.jsx` reads `examId` from the URL, fetches exam/question data, retrieves attempt information, displays instructions, and provides a webcam preview dialog.

The camera confirmation changes frontend state. It is not face identity verification, a server-signed camera check, or proof that the AI models have loaded successfully. The preview's confirmation is a user interaction.

Navigating to `TestPage.jsx` calls the custom hook [useExamAttempt.js](../frontend/src/hooks/useExamAttempt.js). This hook sends:

```text
POST /api/users/exam-attempts/:examId/start
```

The backend `startOrResumeAttempt`:

1. Requires a student and an existing exam.
2. Looks for the student's existing active attempt.
3. Returns that attempt if found, including an expired one for final submission.
4. For a new attempt, checks the exam's availability and approved enrollment.
5. Finds an available attempt slot within `maxAttempts`, accounting for older results.
6. Creates the attempt with fixed start/deadline timestamps.
7. Returns the attempt and the current server time.

The deadline is the earlier of the duration limit and exam closing time:

```js
Math.min(startTime + durationMinutes * 60000, examClosingTime)
```

If a 30-minute examination closes at 11:00 and Aina starts at 10:50, her deadline is 11:00.

Database indexes and duplicate-key handling help two tabs obtain one active attempt instead of creating extra sessions. This does not mean the whole application locks out all multi-tab interaction.

**22. Understand `useExamAttempt` function by function**

This hook is the central coordinator for the student's running examination. It contains logic while `TestPage` concentrates on presenting and connecting components.

| State/ref/function | Role |
| --- | --- |
| `attempt` | Server attempt plus the estimated local display deadline. |
| `progress` | Answers, current question index, proctoring log. |
| `timeLeft` | Seconds remaining for the interface. |
| `loading`, `error` | Explain readiness and failures to the student. |
| `isSubmitting`, `isFinalizing`, `isLeaving`, `submitted` | Control available actions and status feedback. |
| `active` ref | Current attempt for callbacks. |
| `snapshot` ref | Latest progress without waiting for another render. |
| `queue` ref | A promise chain that orders save requests in this hook instance. |
| `mounted` / operation refs | Avoid some stale updates and repeated operations. |
| `backup(value)` | Store an optional pending-progress copy in `sessionStorage`. |
| `save(value)` | Queue a credentialed PUT request before the local deadline. |
| Loading effect | Start/resume, restore server state, consider a local pending backup. |
| `update(change)` | Produce new progress, update the screen, back it up, and save it. |
| `submit()` | Finish pending saves where allowed, then request finalization. |
| Timer effect | Recalculate remaining time each second and install close/reload warning. |
| Zero-time effect | Attempt submission when time reaches zero. |
| `leave()` | Save where possible, then allow blocked navigation. |

The local deadline is calculated from server remaining time so a student's clock offset does not directly determine the displayed allowance. The server independently checks its own time when accepting progress.

The save queue aims to prevent a slower earlier save in the same page from overwriting a later save. It is not a global cross-tab synchronization protocol. Each page has its own queue.

On a failed save, the hook keeps an error and local backup. If the deadline passes before changes reach the server, those late local changes are not used to replace the saved answers. Autosave reduces loss; it cannot guarantee saving during a network outage.

**23. Following one selected answer**

Open [TestPage.jsx](../frontend/src/views/student/TestPage.jsx) and [MultipleChoiceQuestion.jsx](../frontend/src/views/student/Components/MultipleChoiceQuestion.jsx).

The child renders a radio group. Selecting an option calls `onSelectOption(optionId)`. The parent supplies a callback that also knows the current question ID.

The important update is:

```js
session.update((prev) => ({
  ...prev,
  answers: { ...prev.answers, [questionId]: optionId },
}));
```

Read it as: “Take the previous progress, keep all other fields, copy its answers, and store this option under this question.”

Then `useExamAttempt.update` sets React state, writes the pending local backup, and queues `PUT /api/users/exam-attempts/:attemptId`.

The backend validates the structure using [examAttemptProgress.js](../backend/utils/examAttemptProgress.js). Its update query requires the same user, active status, no submission freeze, and a future deadline. If no record satisfies all conditions, it rejects the save.

This is a complete frontend-to-database path:

```text
Radio button
 -> child onChange
 -> parent recordAnswer
 -> session.update
 -> React progress + local backup
 -> queued Axios PUT
 -> protect
 -> saveAttemptProgress
 -> MongoDB ExamAttempt
```

`NumberOfQuestions.jsx` displays question numbers, answered/current styling, and formatted remaining time. It receives time from the hook; it is not the authoritative timer.

When backward navigation is enabled, students can use Previous/Next and question numbers, and the manual submit button requires all questions answered. Without it, the normal interface advances sequentially and offers Finish Test on the final question. These are interface controls; the backend does not reconstruct an immutable record of every navigation action.

The multiple-choice component also prevents ordinary copy/cut/context-menu actions and some keyboard shortcuts. It does not add a copy/paste event to the proctoring log, and it does not constitute operating-system lockdown.

**24. Question randomisation**

[seededShuffle.js](../frontend/src/utils/seededShuffle.js) contains three parts:

1. `hashString`: turns a text seed into a number.
2. `seededRandom`: generates a repeatable sequence of pseudo-random values.
3. `seededShuffle`: copies an array and swaps its entries using those values.

`TestPage` uses student/exam IDs to seed question ordering, and student/question IDs for option ordering. With the same seed and same input ordering, the output order is repeatable. Different students can receive different orders, but different seeds do not guarantee a different permutation every time.

The attempt ID is not included in these seeds, so do not claim every retake gets a newly randomised sequence. This is deterministic shuffling, not encryption. Scoring still uses question/option IDs, so rearranging the display does not change what an answer means.

**25. Proctoring: the libraries and their separate jobs**

Open [WebCam.jsx](../frontend/src/views/student/Components/WebCam.jsx). The default exported function is named `Home`, but `TestPage` imports it as `WebCam`; a default import can use a different local name.

| Part | Responsibility |
| --- | --- |
| `react-webcam` | Obtain browser camera access and display the video. |
| TensorFlow.js and model dependencies | Supply browser machine-learning execution used by the vision libraries. |
| COCO-SSD | Detect object categories, including `person` and `cell phone`. |
| Face-api tiny face detector | Detect a face in the frame. |
| Face-api tiny landmark model | Estimate landmark positions such as eyes and nose. |
| Canvas | Draw detection boxes or copy a camera frame into an image. |
| Browser visibility/mouse events | Detect page inactivity signals independently of AI. |

Pretrained model loading happens through `cocossd.load()` and face-model loading from `/models`. The application uses these models for inference; it does not teach a new model to recognise cheating.

`webcamRef` gives access to the underlying video element. `canvasRef` points to the visible overlay. The code checks video readiness and nonzero dimensions before processing frames. The requested video constraints are 640 by 480 and a user-facing camera; actual browser video dimensions are read for canvas sizing.

After model loading, `runDetectionLoop` schedules `detect(cocoNet)` with `setInterval(..., 1000)`. This requests work about once per second, not guaranteed real-time speed. Slow asynchronous detection can overlap because there is no explicit busy guard.

**26. Reading the detection function**

The object-detection part calls `cocoNet.detect(video)`. Each prediction supplies a class and bounding box. `utilities.js` draws labels and rectangles on the canvas.

The code loops through predictions:

- A `cell phone` prediction triggers `handleDetection('cellPhone')`.
- Each `person` prediction increments `personCount`; more than one triggers `multipleFace`.

Despite the event name and warning text, `multipleFace` here comes from counting detected people, not counting separately verified faces.

The face part calls `detectSingleFace(...).withFaceLandmarks(true)`. It treats no face result or a sideways-face indication as the same `noFace` category.

The sideways rule is:

```text
leftEyeX  = average horizontal coordinate of left-eye landmarks
rightEyeX = average horizontal coordinate of right-eye landmarks
noseX     = average horizontal coordinate of nose landmarks

eyeMidX     = (leftEyeX + rightEyeX) / 2
eyeDistance = absolute(rightEyeX - leftEyeX)
offsetRatio = absolute(noseX - eyeMidX) / eyeDistance

lookingAway = offsetRatio > 0.16
```

For eye positions 100 and 200, their midpoint is 150. If the nose is at 170, the ratio is `20 / 100 = 0.20`, exceeding 0.16. Dividing by eye distance relates displacement to face size rather than a fixed pixel count. A zero eye distance is handled by returning false.

This is a simple sideways-face heuristic. It is not identity recognition, precise eye tracking, or reliable detection of reading other material. It does not specifically measure downward gaze.

`faceIssueStartRef` remembers when the condition starts. If it persists for approximately 3,000 ms, the code flags an event; normal face detection clears the condition timer. This aims to reduce warnings from momentary failures.

The configured face detector score threshold is a filtering parameter, not a measured percentage accuracy for the whole system.

**27. Tab events, screenshots, and saving evidence**

The visibility listener checks `document.hidden` on `visibilitychange`. A hidden page triggers `tabSwitch`. On devices without a coarse pointer, a qualifying document `mouseleave` also triggers that category. The latter is a weaker signal and does not necessarily mean a tab switch.

`handleDetection(type)` tries to limit repeated events of the same type, captures/uploads a screenshot, calls the parent callback, and displays a toast.

The intended repeat interval is three seconds, but the long-lived callbacks can retain stale `lastDetectionTime` state. Explain it as intended suppression rather than claiming an exact guaranteed cooldown. A ref-based timestamp would be a useful improvement.

`captureScreenshotAndUpload`:

1. Creates an offscreen canvas using actual video dimensions.
2. Draws the current webcam frame onto it.
3. Converts it to a JPEG data URL.
4. Uses `dataURLtoFile` to decode the image bytes and create a browser `File`.
5. Uploads the file through the shared Uploadcare client.
6. Returns `{ url, type, detectedAt }` when successful.

The visible overlay canvas and offscreen screenshot canvas serve different purposes. The screenshot is copied from the video; the overlay boxes are not automatically composited into it.

In `TestPage`, `incrementViolation` updates `proctoringLog` through the same attempt hook used for answers. The computed property ``[`${type}Count`]`` updates the corresponding counter, and a screenshot entry is appended when available.

MongoDB stores image URLs and metadata. Uploadcare stores image files. Failed uploads may leave an event count without an image. The timestamp is assigned after upload succeeds, so it is not an exact server-verified moment of detection. Events completing after the attempt stops accepting updates may not persist.

There is no continuous audio/video recording in this component, no desktop capture, and no access to the contents of other tabs. `audio={false}` explicitly disables audio capture for this webcam usage.

**28. Leaving, refreshing, and time expiry**

`useBlocker` intercepts a route change during an unfinished attempt. `TestPage` shows Stay in exam / Save and leave. Staying resets the blocker. Leaving attempts a save and calls the blocker's proceed function if permitted.

`beforeunload` requests the browser's close/reload warning. Browser behaviour controls whether and how that warning appears. It does not guarantee a final network save.

Returning loads the same saved attempt and original deadline. Time continues while away. Closing the exam page stops its camera monitoring and JavaScript execution; the server deadline continues to exist in MongoDB.

When an open page reaches zero remaining time, it attempts submission. If the page is closed, there is no background server expiry worker in this repository to create the result immediately. A later return/submission finalizes the saved work. Late progress is rejected regardless.

**29. Submission and grading, line by line in principle**

`useExamAttempt.submit` waits for queued saves. Before expiry, it attempts a final save; after expiry it does not send late local answers as new progress. It then sends only the exam and attempt identifiers to `POST /api/users/results`.

In [resultController.js](../backend/controllers/resultController.js), `saveResult`:

1. Requires exam and attempt IDs and checks the exam exists.
2. Finds the student's matching active attempt and sets `finishedAt`, freezing it against further saves.
3. If already frozen, finds that same attempt so submission can be retried.
4. Reads the answers already stored on the server.
5. Loads the exam's questions.
6. Compares each selected option ID with the first option marked correct.
7. Accumulates marks and the number of correct answers.
8. Creates a result if one does not already exist for the attempt.
9. Creates the final proctoring log from the attempt snapshot and authenticated user's details.
10. Marks the attempt submitted and returns the result.

The two score values are related but different:

```text
totalMarks = sum of (question.ansmarks || 1) for correct answers
percentage = correct answer count / actual question count * 100
```

Percentage is based on correct-question count, not weighted total marks. With ten questions and seven correct answers, percentage is 70%. The scorer uses the actual question records, not merely the configured `totalQuestions` value.

`attachStatus` uses the lecturer decision when supplied; otherwise 50% or above gives automatic pass. Proctoring counters do not appear in the score calculation.

`$setOnInsert` and unique attempt references support retrying submission without intentionally creating a second result/log for the same attempt. This is idempotency: repeating the operation should preserve one logical outcome. The result, log, and status changes are separate writes, so do not describe them as one atomic database transaction.

The `codingMarks`, `totalScore`, `feedback`, and grading fields in the result schema do not by themselves establish a working programming-code execution feature.

**30. `Success.jsx`, the file currently open in your editor**

Open [Success.jsx](../frontend/src/views/Success.jsx). This small file is a good place to practise explaining React.

The imports bring in React's effect hook, MUI presentation components, a check icon, and React Router navigation.

```js
const navigate = useNavigate();
useEffect(() => {
  const redirect = setTimeout(() => navigate('/'), 5000);
  return () => clearTimeout(redirect);
}, [navigate]);
```

`useNavigate` gives the component a navigation function. The effect starts a five-second timeout. When it expires, the callback navigates to `/`, whose index route redirects to the dashboard. Cleanup cancels the timeout if the component leaves sooner, avoiding an unexpected later redirect.

The JSX then creates a centred page, a width-limited container, a card, a vertical stack, a circular icon area, title/body text, and a button rendered as a React Router link. `role="status"` identifies the status message to assistive technology.

The component does not submit answers or calculate marks. `TestPage` navigates here only after the attempt hook reports successful submission. The file's job is confirmation and navigation.

**31. Lecturer review, release, and answer review**

`ResultPage.jsx` uses different endpoints depending on role. Students fetch released results for themselves. Lecturers fetch results for their owned/legacy-accessible exams, with populated student names/emails.

The page groups attempts, supports filtering, and lets lecturers open proctoring evidence, set or clear a pass/fail decision, change result visibility, or delete an eligible result/attempt.

Modern evidence is matched through `attemptId`. The UI also filters by email; changed email addresses can therefore affect matching. Older records use a closest-timestamp fallback. Explain the modern ID link as more reliable than guessing from timestamps, without claiming the current matching has no weaknesses.

Backend helper/controller roles:

| Function | Responsibility |
| --- | --- |
| `attachStatus` | Add automatic or lecturer-overridden status to response data. |
| `attachAttemptNumbers` | Number result records in chronological student/exam groups; these display numbers are not necessarily the stored attempt slot. |
| `getAttemptCount` | Count started attempts plus older unlinked results and return active-attempt information. |
| `getResultsByExamId` / `getAllResults` | Return results accessible to the lecturer. |
| `getUserResults` | Return the current user's released results. |
| `getResultById` | Return a particular result after ownership checks. |
| `toggleResultVisibility` / `setExamResultsVisibility` | Release/hide one result or an exam's results. |
| `setResultDecision` | Save pass, fail, or null to restore automatic status. |
| `getMyExamStatus` | Summarise result-based student status for task/notification interfaces. |
| `getPendingReviewSummary` | Count owned-exam results without a lecturer decision. |
| `deleteResult` | Delete the result and linked modern attempt/log, or use legacy log matching. |

The result-based notification summary is different from the authoritative attempt counter; it does not count an unfinished attempt in the same way.

`ReviewPage.jsx` fetches a result, then its questions, and highlights selected/correct options. The main result list's visibility filtering is implemented, but the single-result endpoint does not also enforce release and `allowReview`. The question API likewise needs tighter access and answer-key filtering. A hidden review button alone cannot enforce those rules.

`cheatingLogController.js` retrieves logs after lecturer ownership checks. It also retains a standalone save endpoint that accepts client-supplied student details. The current attempt submission path uses authenticated identity instead; the legacy endpoint should not be described as having the same guarantees.

**32. Errors, validation, and security responsibilities**

Frontend validation helps people correct mistakes quickly. Backend validation protects the API from requests that bypass the interface. Database schemas/indexes provide another layer of constraints. These layers complement each other.

Typical HTTP codes in the repository:

| Code | Meaning |
| --- | --- |
| 200 | Request succeeded. |
| 201 | Creation/submission succeeded in the relevant handler. |
| 400 | Invalid input or disallowed request details. |
| 401 | Missing/invalid authentication. |
| 403 | Authenticated request lacks permission or required account status. |
| 404 | Requested resource is unavailable. |
| 409 | Conflict, such as trying to update an ended attempt. |
| 500 | Unexpected server error. |

`errorMiddleware.js` turns errors into JSON and hides stack traces in production. Frontend `catch` blocks extract messages, display alerts/toasts, and use `finally` to clear loading indicators.

The browser is controlled by its user. Frontend role guards, timers, camera checks, and event counters cannot be treated as independently trusted evidence. The backend does enforce important ownership/timing checks, but does not re-run image inference to verify each flag.

Other implementation boundaries include missing-face false positives, missed phones, background-tab timer throttling, upload failures, and monitoring gaps. No measured AI accuracy percentage is established by these files.

Deletion of database metadata does not automatically delete the corresponding Uploadcare file. Account deletion also does not implement a complete cascade through all references. These are application lifecycle issues to consider separately from the happy-path workflows.

**33. Dependencies and configuration**

The two `package.json` files declare dependencies and runnable scripts. Lockfiles record resolved versions for reproducible dependency installation. A package's presence does not prove a feature is active.

| Library/tool | Actual role |
| --- | --- |
| Express / Node.js | HTTP routing and server JavaScript execution. |
| Mongoose / MongoDB | Document models, validation, queries, storage. |
| dotenv | Load backend environment configuration. |
| cookie-parser / jsonwebtoken / bcryptjs | Parse cookies, sign/verify tokens, hash/compare passwords. |
| cors / express-async-handler | Cross-origin configuration and asynchronous error forwarding. |
| uuid | Generate application course/exam IDs. |
| React / react-dom | Component logic and browser rendering. |
| React Router | Routes, navigation, outlets, navigation blocking. |
| Redux Toolkit / react-redux | Shared state and component integration. |
| RTK Query / Axios | API calls and, for RTK Query, cached server data. |
| Material UI / Emotion / icon packages | Interface controls, styling, icons. |
| Formik / Yup | Form state and validation rules. |
| React Toastify / SweetAlert | Notification and dialog feedback in active forms/pages. |
| React Helmet / PropTypes | Page metadata and some runtime prop declarations. |
| Lodash | Utility functions such as generated navigation/menu IDs. |
| react-webcam / COCO-SSD / face-api / TensorFlow.js | Camera access and browser vision inference. |
| Uploadcare client | Upload images and obtain CDN URLs. |
| react-scripts / react-app-rewired | Frontend development and production build with overrides. |
| nodemon / concurrently | Restart backend on changes / run frontend and backend together. |
| ESLint / Prettier | Static code checks and formatting configuration. |
| Node test runner / Jest / React Testing Library | Backend and frontend regression tests. |

Packages such as Monaco, charting/animation helpers, and other detection packages appear in dependencies, but the reviewed source does not establish corresponding active core features. The active face path imports `@vladmandic/face-api`, not simply every installed face-related package.

Configuration files:

- `.env.example` lists `PORT`, `NODE_ENV`, `MONGO_URL`, and `JWT_SECRET`. Actual secret values do not belong in the guide or committed source.
- Frontend `REACT_APP_BACKEND_URL` selects the API base URL. Browser build variables are not a safe place for private secrets.
- `frontend/package.json` specifies a development proxy to port 5050.
- `frontend/jsconfig.json` enables source import resolution used by paths such as `src/components/...`.
- `frontend/config-overrides.js` adjusts face-api bundle parsing and suppresses one known missing COCO-SSD source-map reference while preserving other checks.
- `frontend/scripts/patch-build-tools.cjs` changes a specific installed build-tool call to `fs.constants.F_OK`; it runs before start/build. This is compatibility work, not application business logic.
- `frontend/vercel.json` contains API and single-page-app rewrite configuration. It describes an available deployment arrangement, not proof of the currently running hosting setup.
- `.gitignore` excludes configured files from normal Git tracking. The existing older guides have ignore rules in this workspace; this new walkthrough can be tracked independently.

Common commands already defined by the project:

```bash
npm run dev             # run frontend and backend development processes
npm run server          # backend with nodemon
npm run client          # frontend development server
npm run build           # install frontend dependencies and create frontend build
npm start               # run backend/server.js
npm run test:backend    # backend regression tests
npm run test:frontend   # frontend tests without watch mode
npm run lint            # frontend lint command
```

These commands need installed dependencies and appropriate environment configuration. This documentation task does not claim that a fresh build or live deployment was executed.

**34. What the tests tell you**

Tests are code that runs scenarios and checks expected outcomes. A mock replaces a dependency with controlled behaviour; a passing mocked test is not the same as a full live browser/database test.

| Test files | Main topics |
| --- | --- |
| `backend/tests/accounts.test.js` | Hash preservation, registration constraints, login responses, authentication/account status. |
| `backend/tests/passwordReset.test.js` | Administrator verification, reset validation, hashes, session revocation, email-free account decisions. |
| `backend/tests/examAttempts.test.js` | Deadlines, limits, enrollment, duplicate starts, protected saves, frozen/retryable submission. |
| `frontend/src/hooks/useExamAttempt.test.jsx` | Back navigation, backups, expiry, save/submission order, failure and retry behaviour. |
| `frontend/src/views/authentication/ForgotPassword.test.jsx` | Recovery-instruction navigation. |
| `frontend/src/views/admin/ResetPasswordDialog.test.jsx` | Dialog validation, cancellation, failed verification. |
| `frontend/src/context/ColorModeContext.test.jsx` | Theme switching, preference persistence, unavailable storage. |
| `frontend/src/theme/DefaultColors.test.js`, `DialogSizing.test.jsx` | Theme contrast and dialog presentation checks. |

These tests help protect specific behaviours from regressions. They do not establish AI precision/recall, concurrent-user capacity, a full security audit, or error-free production operation. No runtime tests were rerun for this documentation-only change.

**35. One complete story to practise**

Imagine Aina completing Quiz 1:

1. She registers through a React form. Express validates her input and Mongoose saves a pending account with a password hash.
2. An administrator approves her. She logs in and receives an HTTP-only JWT cookie; React stores her display profile.
3. She applies to a course. Its lecturer approves the enrollment, allowing its exams to appear in her exam list.
4. The lecturer creates Quiz 1 and saves its questions, options, and correct flags. Optional question images go to Uploadcare.
5. Aina reads the instructions and checks her camera. Starting the exam opens `TestPage` and obtains a server-backed attempt.
6. The backend records a fixed deadline. React uses it for the countdown.
7. She selects an option. The child component calls the parent, the hook updates progress, and the API saves the selected option ID under its question ID.
8. The camera component analyses frames. A phone detection attempts an image upload and adds an event to the same saved attempt.
9. If she leaves and returns, the attempt resumes with its saved progress and original deadline; there was no camera monitoring while the page was closed.
10. On submission, the backend freezes the saved answers, scores them, and saves a result and proctoring log linked by attempt ID.
11. React displays `Success.jsx` and then returns her to the dashboard.
12. The lecturer reviews the flags and evidence, optionally changes pass/fail status, and releases the result. Aina can then see it in her normal result list.

**36. Questions your supervisor may ask**

| Question | An answer you can explain from the code |
| --- | --- |
| Why separate frontend and backend? | React handles interaction; the server checks requests and persists outcomes independently of the displayed page. |
| Why separate routes and controllers? | Routes map addresses to operations; controllers hold the operation's rules. |
| Why use Mongoose? | It supplies model APIs, schemas, validation, references, and index declarations over MongoDB. |
| Why does a page have many components? | Reusable pieces keep presentation responsibilities manageable and let a parent coordinate shared data. |
| What makes React update? | State/props/context/store changes can trigger rendering; React reconciles the resulting UI with the DOM. |
| Why use refs as well as state? | State updates the interface; refs retain video handles and current values without triggering renders. |
| Where is the real exam timer? | The server stores `expiresAt` and rejects late saves; the browser countdown displays the allowance. |
| Why store attempts separately? | An ongoing session needs saved answers and a fixed deadline before a final result exists. |
| Why not trust a client-supplied score? | Browser data can be modified. The server calculates the score from saved answers and database questions. |
| What is the AI contribution? | Pretrained models detect objects/faces/landmarks; application rules turn their outputs into reviewable events. |
| Does it recognise the account holder? | No, the current camera code detects faces and landmarks without identity verification. |
| Does a flag automatically fail a student? | No. Scoring and proctoring are separate, with lecturer decision support. |
| Where are screenshots stored? | Uploadcare holds images; MongoDB holds URLs, categories, timestamps, and counts. |
| Is monitoring continuous after closing the page? | No. The deadline remains, but browser monitoring stops. |
| What would you improve? | Protect answer/review access, improve event timing and monitoring-gap reporting, and evaluate detection accuracy under controlled conditions. |

An accurate short presentation is:

> “iMIZAN is a MERN examination application. React builds reusable screens and coordinates input through state, props, hooks, and API calls. Express authenticates requests and applies account, enrollment, exam, and result rules, while Mongoose stores the records in MongoDB. During an examination, a server-backed attempt preserves answers and a fixed deadline. Pretrained vision models run in the browser, and browser events add inactivity signals. Flagged events are saved with available webcam screenshots for lecturer review. The backend scores saved answers, and the lecturer can review evidence and release results. The models support review; they do not establish identity or prove cheating.”

**37. How to study the actual files without getting lost**

Use this reading order:

1. `Success.jsx`: practise imports, a component, JSX, an effect, and cleanup.
2. `index.js`, `App.js`, and `Router.js`: understand how the interface starts and selects a page.
3. `Login.js`, `usersApiSlice.js`, `userRoutes.js`, `authUser`, `userModel.js`: follow one request end to end.
4. `server.js`, `authMiddleware.js`, and the model files: understand the backend structure and data.
5. `TestPage.jsx` and `MultipleChoiceQuestion.jsx`: follow props and answer callbacks.
6. `useExamAttempt.js` and `examAttemptController.js`: understand progress, deadlines, saving, and submission.
7. `WebCam.jsx` and `utilities.js`: follow camera access, inference, event rules, and screenshots.
8. `saveResult`, `ResultPage.jsx`, and `ReviewPage.jsx`: connect grading to lecturer/student presentation.
9. Course/admin pages, shared layout files, configuration, and tests: fill in the supporting workflows.

For every function, ask four questions: **What calls it? What does it receive? What does it decide or change? What does it return or display?** If you can answer these and trace the data between files, you understand the code beyond memorising its names.

The existing [system explanation](SYSTEM_EXPLANATION.md) and [proctoring guide](EXAM_PROCTORING_GUIDE.md) provide additional architecture and presentation detail.
