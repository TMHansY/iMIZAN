# iMIZAN STEM learning kit

## One page summary

**An online exam system that helps us explore computing, AI, mathematics, and responsible design.**

### The problem

Running an online exam involves more than displaying questions. Teachers need to organise classes, set time limits, collect answers, calculate marks, and review unusual events. Students need a clear way to take the exam and receive their results.

### Who uses it

- **Students** join courses, take timed multiple-choice exams, and view released results.
- **Lecturers or teachers** prepare exams, manage course enrollment, and review results and flagged events.
- **Administrators** manage accounts and courses and assign lecturers.

### The solution

iMIZAN brings these tasks into one web application. It saves exam progress, scores submitted answers, and gives lecturers information to review. During an exam, computer-vision models analyse webcam images for signals such as a phone, more than one person, or a missing face. A separate rule uses face landmarks to estimate a sideways head turn. Browser events track tab inactivity.

### How it works

1. A lecturer creates an exam and its questions.
2. A student starts an available exam and answers questions in the browser.
3. The browser analyses camera frames and tracks page activity. Flagged events can have webcam screenshots attached.
4. The server saves progress, enforces the deadline, and calculates the score at submission.
5. The lecturer reviews results and available evidence, then releases results.

**The technology:** React builds the screens; Node.js and Express handle server requests; MongoDB stores records. Pretrained AI models help interpret images. Uploaded evidence images are stored separately through Uploadcare.

### Where STEM appears

| STEM area | What we can learn from iMIZAN |
| --- | --- |
| Science | Make a prediction, test it with examples, and look for evidence that challenges it. |
| Technology | Explore how a browser, server, database, and AI models work together. |
| Engineering | Design rules, test failures, and improve a system within constraints. |
| Mathematics | Use coordinates, ratios, thresholds, and percentages. |

### Benefits and boundaries

iMIZAN brings exam administration and review together. Automatic scoring can reduce routine marking, and saved progress supports returning to an attempt with its original deadline. Flagged events help a lecturer identify moments to examine.

**A flag is a request for review, not proof of cheating.** The system does not recognise a student's identity or know their intentions. Lighting, camera position, device performance, and ordinary movement can affect detections. No measured real-world accuracy percentage is claimed.

**Today's question:** How can we build a useful automated system while checking its mistakes and treating people fairly?

<!-- PAGE BREAK -->

# Hands on task

## Build and test a face position rule

**Time:** 30 minutes. **Team:** 3–4 students. **Materials:** this task sheet, the worksheet on the next page, a pencil, and an optional calculator. No account, camera, internet connection, or coding is needed.

### Your mission

Act as the engineers testing one small part of iMIZAN. Turn face coordinates into a review signal, test the rule, and explain what the signal cannot tell you.

By the end, you should be able to calculate a ratio, apply an IF rule, identify a false alarm and a missed event, and propose one testable improvement.

### The rule

An AI model finds facial landmarks: points around features such as the eyes and nose. iMIZAN then applies a mathematical rule to the average horizontal positions of those points.

For this exercise, **L** is the left eye position, **R** the right eye position, and **N** the nose position. All positions are horizontal image coordinates in pixels.

1. Find the eye midpoint: **M = (L + R) / 2**.
2. Find the distance between eyes: **D = |R − L|**.
3. Find the nose offset ratio: **r = |N − M| / D**.
4. **IF r > 0.16, mark the frame for review. Otherwise, do not mark it.**

The vertical bars mean “take the positive distance.” A threshold is the cutoff at which a rule changes its output. Here, exactly 0.16 does not exceed the threshold.

**Worked example:** L = 100, R = 200, N = 170. M = 150; D = 100; r = 20 / 100 = 0.20. Since 0.20 > 0.16, mark the frame for review.

This worksheet tests individual frames. In the application, a missing face or sideways-face condition must persist for approximately three seconds before a face-related event is recorded. Our frame marks are not counts of actual logged events.

### Team steps

| Minutes | What your team does |
| --- | --- |
| 0–4 | Read the mission and example. Predict whether a lower threshold produces more or fewer marks. |
| 4–12 | Complete rows A–F on the worksheet. Rotate calculator, checker, recorder, and reporter roles. |
| 12–19 | Use the staged test labels to identify correct outputs, false alarms, and misses. Calculate the agreement percentage. |
| 19–24 | Retest with a threshold of 0.10. Count which rows change and discuss the tradeoff. |
| 24–28 | Sketch one improvement and describe how you would test it. |
| 28–30 | Share your improvement and complete the exit sentence. |

**Finish line:** Six completed rows, two agreement percentages, and one improvement with a test. If you have extra time, try the optional scale question on the worksheet.

<!-- PAGE BREAK -->

# Student worksheet

## Test the rule and inspect its mistakes

**Team name:** ____________________  **Members:** ______________________________

**Prediction:** Lowering the threshold will produce __________ marks because __________

____________________________________________________________________________

These are invented classroom examples, not measured iMIZAN results. “Staged sideways turn” is the test organiser's label for head position. It says nothing about cheating. Some coordinates deliberately represent imperfect landmark estimates.

| Case | L | R | N | Staged sideways turn | Ratio r | Mark at > 0.16 | Mark at > 0.10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | 100 | 200 | 150 | No | ______ | ______ | ______ |
| B | 100 | 200 | 160 | No | ______ | ______ | ______ |
| C | 100 | 200 | 170 | Yes | ______ | ______ | ______ |
| D | 100 | 200 | 175 | No | ______ | ______ | ______ |
| E | 100 | 200 | 162 | Yes | ______ | ______ | ______ |
| F | 100 | 200 | 166 | No | ______ | ______ | ______ |

**How to compare:** Mark + Yes = correct detection. No mark + No = correct non-detection. Mark + No = false alarm. No mark + Yes = missed event.

### Results at the original threshold

Correct cases: __________  False alarm cases: __________  Missed cases: __________

**Agreement = number of matching outputs / 6 × 100 = __________ %**

### Results at the lower threshold

Cases whose outputs change: __________  False alarms: __________  Misses: __________

**Agreement = number of matching outputs / 6 × 100 = __________ %**

Does lowering the threshold improve every kind of result? Explain using a case.

____________________________________________________________________________

____________________________________________________________________________

### Improve the design

Our change: __________________________________________________________________

Keep these conditions the same during testing: ___________________________________

Measure this result before and after the change: __________________________________

One reason a person must review a flag: __________________________________________

**Exit sentence:** An AI-assisted system is useful when ____________________________,

but we should check __________________________________________________________.

**Optional scale question:** If L = 200, R = 400, N = 340, what is the ratio? Compare it with case C. Why might a ratio be more useful than a raw pixel distance?

<!-- PAGE BREAK -->

# Innovation challenge

## Adapt an iMIZAN idea for your school

**Challenge:** How could an idea from iMIZAN help your school solve a real problem?

Use this as a separate 10–15 minute extension after the 30-minute task, or as a take-home challenge. Produce one annotated sketch and short written answers. A working application is not required.

### Pick a problem

Choose your own, or start with one of these proposed ideas:

- A practice quiz that helps students identify topics to revise.
- A laboratory equipment checkout system that tracks borrowed items.
- A science-club quiz that remains useful when the connection is unreliable.
- A clearer exam interface for students with different access needs.

These are new design proposals, not claims about features already available in iMIZAN. Your solution does not have to use AI or cameras.

### Design within these limits

Assume a shared school computer and an unreliable internet connection. Collect only information needed for the task. Explain any use of personal data and give users a way to correct mistakes. Use invented names and records in your sketch.

**User and problem:** Who needs help, and what currently goes wrong?

____________________________________________________________________________

**Proposed solution:** Which iMIZAN idea will you reuse: roles, quizzes, saved progress, records, or review?

____________________________________________________________________________

**System flow:** Write or draw the input, processing step, and output.

Input __________________ → Processing __________________ → Output __________________

**Sketch:** Draw the main screen or the steps a user follows. Label the important parts.

____________________________________________________________________________

____________________________________________________________________________

____________________________________________________________________________

**Failure and response:** What might go wrong? How can the user recover?

____________________________________________________________________________

**Success measure:** What would you count or time to decide whether the design helps?

____________________________________________________________________________

**Example of a measurable test:** Ask three volunteers to borrow and return an imaginary item using the sketch. Count incorrect records and steps where they need help. Revise the confusing step and repeat.

**Peer check:** Is the problem clear? Does the flow make sense? Is there a way to handle errors? Is the success measure testable? Give one specific improvement.

<!-- PAGE BREAK -->

# Q and A practice

## Explain function benefits limits and improvements

Work in pairs after the activity or use these questions during preparation. One student asks, one answers in 20–30 seconds, then swap. Cover the sample answers for the first attempt. Aim to explain an idea and give an example.

### Function

**1. What does iMIZAN do?**

It manages online multiple-choice exams, from course enrollment and exam creation to saved answers, scoring, and lecturer review.

**2. Which parts use AI?**

Pretrained computer-vision models detect objects and facial landmarks in webcam images. The face-position calculation is a programmed rule applied to model outputs. Tab inactivity comes from browser events, not AI.

**3. What happens when the system flags something?**

It records an event and attempts to attach a webcam screenshot. A lecturer can review the available information. A flag does not automatically deduct marks or fail the student.

### Benefits

**4. How can the system help teachers and students?**

Teachers can organise exams and review results in one place. Students can take timed exams and resume saved progress with the original deadline. Automatic scoring can reduce routine marking work.

**5. Why is mathematics useful here?**

Ratios turn image coordinates into a value that a rule can compare. Percentages help us summarise test results. Neither number explains a person's intentions.

### Limits

**6. Does detecting a face prove who the student is?**

No. Detecting a face and recognising a particular person are different tasks. This implementation does not verify identity through face recognition.

**7. Does a tab-inactivity flag show what was on another tab?**

No. The application can detect activity changes, but the evidence screenshot comes from the webcam. It does not capture the contents of another tab or the desktop.

**8. How accurate is the AI?**

We do not have an established real-world accuracy percentage. Our six-row exercise uses invented data to learn how to evaluate a rule. A real evaluation needs more examples across people, lighting, cameras, and devices.

**9. Why might a flag be wrong or explainable?**

A model may estimate landmarks incorrectly. A student might turn toward a noise, or another person might walk behind them. The reviewer needs context before drawing a conclusion.

### Improvements

**10. How would you improve the system?**

Choose a specific issue, propose a change, and measure it. For example, test whether clearer camera-position guidance reduces false face-related warnings under the same lighting and camera conditions.

**11. What should happen when the system makes a mistake?**

A proposed improvement is to let the student explain an event and ask for review. The design should make uncertainty visible and allow a person to correct an unfair outcome.

<!-- PAGE BREAK -->

# Facilitator answer sheet

## Calculations and discussion

Keep this page separate from the student worksheet until teams have tried the task.

For cases A–F, the midpoint is **150** and eye distance is **100**.

| Case | Ratio r | Mark at > 0.16 | Original result | Mark at > 0.10 |
| --- | --- | --- | --- | --- |
| A | 0.00 | No | Correct non-detection | No |
| B | 0.10 | No | Correct non-detection | No |
| C | 0.20 | Yes | Correct detection | Yes |
| D | 0.25 | Yes | False alarm | Yes |
| E | 0.12 | No | Missed event | Yes |
| F | 0.16 | No | Correct non-detection | Yes |

### Original threshold

Four outputs match the staged labels: A, B, C, and F. There is one false alarm, D, and one miss, E. Agreement is **4 / 6 × 100 ≈ 66.7%**.

### Lower threshold

E and F change. E becomes a correct detection, but F becomes a false alarm. The matching cases are A, B, C, and E. There are two false alarms, D and F, and no misses. Agreement remains **4 / 6 × 100 ≈ 66.7%**.

**Discussion point:** The same overall percentage can hide different errors. Lowering the threshold catches the missed turn in this dataset but also marks another non-turn. Ask students who is affected by each type of mistake.

### Optional scale answer

M = 300; D = 200; r = |340 − 300| / 200 = **0.20**. This is the same ratio as case C. Doubling every coordinate doubles the offset and eye distance, so their ratio stays the same. This explains scale normalisation in this example; it does not guarantee reliable results at every camera distance or angle.

### Acceptable improvement answers

- **Check persistence across frames:** Test brief movements and sustained turns separately. Count false alarms and detection delays. Explain that iMIZAN already includes an approximately three-second face-condition check.
- **Improve camera guidance:** Compare warnings before and after instructions about camera placement while keeping the task and lighting the same.
- **Let users explain events:** Test whether a reviewer can locate and understand an explanation. Present this as a proposed feature.

If a student suggests “always lower the threshold,” ask them to explain what happened to F. If they say a flagged person cheated, ask what the data actually measured.

### Quick learning check

Award one point for each: correct ratios; correct comparison at the exact threshold; correct identification of both error types; explanation of why a flag needs review; a proposed improvement with a measurable test. **Five points total.** Use the results to guide discussion, not to rank students.

**Teacher note:** If the eye distance is zero, the ratio is undefined. The current implementation returns false from the orientation calculation in that case. This is a useful optional example of why programmers handle edge cases.

<!-- PAGE BREAK -->

# Demonstrator preparation

## Running the learning kit

**Audience:** High-school students, approximately ages 13–17. **Language:** English. **Prerequisite:** Basic arithmetic; no programming experience. **Core activity:** 30 minutes. The innovation challenge and Q&A are separate extensions.

### Before the session

- Print page 1 as the one-page summary, or share it on screen.
- Print pages 2–3 for each group. Keep page 6 as your answer key.
- Prepare pencils and optional calculators. For students needing arithmetic support, provide the ratios and focus on decisions and mistakes.
- Use page 4 for the innovation extension and page 5 for Q&A practice.
- Use the fictional worksheet data; this activity requires no student photographs or personal records.

### Opening words

“An online exam system brings together many STEM ideas. A camera gives us images, AI models estimate what is in them, mathematics helps us write rules, and software connects the pieces. Today you will test one rule from iMIZAN. Your job is to discover both when it works and when it makes mistakes.”

### Prompts while students work

At 4 minutes: “What does the number 0.16 control?”

At 12 minutes: “Which cases disagree with the staged labels?”

At 19 minutes: “Predict what will change before calculating again.”

At 24 minutes: “How will you tell whether your improvement helps?”

At 28 minutes: “Explain one mistake without assuming anything about a student's intentions.”

### Closing words

“You used coordinates and ratios, tested a rule against labelled examples, and compared errors. That is part of engineering an AI-assisted system. A useful design needs more than a clever model: it needs careful tests, understandable results, and people who can review mistakes.”

### Vocabulary to explain aloud

**AI model:** Software trained on examples to find patterns. **Pretrained:** Trained before being integrated into this application. **Algorithm:** A sequence of steps. **Landmark:** A point on an image feature. **Threshold:** A cutoff for a decision. **False alarm:** A rule marks a case whose test label is negative. **Miss:** A rule does not mark a case whose test label is positive.

### Project references for the demonstrator

The kit describes the local project inspected on 11 October 2026. These references are for preparation; students do not need to read the code.

- `README.md`: project purpose, user roles, features, and technology stack.
- `frontend/src/views/student/Components/WebCam.jsx`: models, landmark ratio, 0.16 threshold, persistence check, and webcam screenshots.
- `frontend/src/hooks/useTabInactivity.js`: browser activity tracking.
- `backend/controllers/resultController.js`: answer scoring and lecturer decision handling.
- `frontend/src/views/lecturer/components/CheatingTable.jsx`: event and screenshot review interface.

The worksheet is a simplified paper simulation using invented coordinates. Its percentages describe only those six examples. Proposed school adaptations and student improvements are design exercises, not implemented features.
