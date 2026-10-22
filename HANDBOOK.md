# Retop User Handbook

A complete guide to the modern portal experience, how every feature works, and how to navigate university portal quirks.

---

## Preface

University portals are built to store records, not to make student life pleasant. They are designed around administrative database schemas from twenty years ago, wrapped in aging server-side frameworks, and exposed through navigation trees that require four clicks just to see if your morning class is in block two or block five.

Retop is a client-side layer that sits directly on top of the portal. It does not replace the university servers. It does not run a third-party backend where your credentials or marks are harvested. Instead, it runs entirely inside your browser. When you visit the portal, Retop reads the raw HTML documents that the university server returns, extracts the records, stores them on your machine, and presents them in an interface designed for speed, clarity, and daily utility.

Because Retop lives in the browser alongside the official portal, it operates in a fragile space. It has to handle sudden server timeouts, mandatory feedback redirects, broken session tokens, and irregular timetable slots without locking you out of the university system.

This handbook explains every capability built into Retop. It also documents the friction points, edge cases, and rough edges that you will encounter when the reality of the university portal pushes back against the modern interface.

---

## Chapter 1. Getting started and authentication

### Signing into your campus portal

When you navigate to the portal login page, Retop takes over the initial view before the browser paints the default layout. It displays a focused sign-in card tailored to either the Vellore or Chennai campus depending on your web address.

The login card asks for your registration number and password. As soon as you type your credentials, Retop prepares a direct authentication payload for the university gateway.

### The automatic captcha solver

The university login requires entering a six-character visual captcha code. Retop includes a client-side optical character recognition model running entirely inside your browser. As soon as the login card loads, Retop reads the captcha image, cleans up the background noise and distortion lines, runs the character segments through its internal recognition engine, and fills the captcha field automatically.

In eight to nine cases out of ten, the recognition succeeds on the first attempt and logs you straight in. However, the model is not infallible. Distorted characters with severe noise lines can fool the solver. If the solver misreads a character, the university portal will reject the attempt. When this happens, Retop refreshes the captcha image, attempts a new solve, and lets you manually correct any misread letter with your keyboard before submitting.

### Fallback to the native login form

If the university portal changes its sign-in parameters, or if repeated captcha failures trigger an account lockout warning, you can switch immediately to the original university login page. Every Retop login screen includes a direct link labeled Native Login. Clicking this link reloads the page with Retop bypassed for that session, giving you raw, unmediated access to the official sign-in form.

Account recovery forms, including forgotten password and forgotten username requests, are never intercepted by Retop. When you click either of those options, Retop routes you directly to the official university recovery pages to guarantee that password resets and identity verification go through the university without interference.

### Session persistence and sudden timeouts

The university server enforces an aggressive session timeout policy. If your portal tab remains idle for approximately fifteen to twenty minutes, the university server silently terminates your active session.

Retop detects this state. When an in-flight request fails because the server closed the session, Retop brings up a clear notification explaining that your session has expired and offering a single button to return you to the sign-in screen. It does not leave you staring at an infinitely spinning loader.

---

## Chapter 2. The navigation system and omnibox

### The top navigation bar

Once authenticated, the main dashboard greets you with a unified top navigation bar. The top bar contains:

1. The campus brand and current page title.
2. The global search bar.
3. The active semester selector, letting you jump back into previous terms without digging through archives.
4. Quick-access pinned shortcuts for your most frequent destinations.
5. A manual sync trigger that forces Retop to pull fresh data from the server.
6. Your profile avatar, student name, and the main user menu.

### The omnibox search

Pressing the forward-slash key or using the standard search shortcut on your keyboard opens the Omnibox. The Omnibox indexes every single link, form, utility, and page that the university portal provides, including obscure sub-menus that take multiple clicks to find in the native system.

You can type abbreviations, keywords, or partial phrases. For example, typing marks, fee, da, or leave filters the list in real time. Hitting the enter key on any search result navigates to that destination immediately.

If the selected destination has a modern Retop screen (such as Attendance, Timetable, or Grades), Retop transitions smoothly to that view. If the destination is an administrative page that Retop does not redesign (such as hostel room allotment or online fee payment), Retop seamlessly lowers the modern layer and exposes the native university page with your selected form already loaded.

### The legacy menu search

Some students prefer the raw look of the official university portal, or need to stay in the legacy view for extended administrative tasks. For this reason, Retop injects a search bar directly into the top horizontal navbar of the native university page.

The injected search bar is styled with the familiar deep navy blue gradient of the university portal header so it feels like a built-in feature rather than an afterthought. It supports instant keyboard jumps, fuzzy keyword filtering, and direct clicks to all official menu actions without requiring you to hover over cascading hover menus.

### Switching between modern and legacy interfaces

Retop never locks you out of the original portal. You can toggle between the modern interface and the legacy university portal at any moment.

From the profile menu in the modern top bar, selecting the legacy portal option smoothly hides the modern screen and reveals the underlying university document. When you are in the legacy view, a discreet floating pill appears in the corner of your screen. Hovering over it gives you a quick peek at the modern UI, and clicking it brings the modern interface back to the front.

---

## Chapter 3. Home dashboard and spotlight

### Today at a glance

The home screen provides an immediate summary of your day:

1. Today's schedule. A chronological timeline showing your morning and afternoon lectures, lab practicals, assigned classrooms, and slot designations.
2. Next class countdown. A live timer that tells you exactly how many minutes remain before your next lecture begins, along with the room code so you know where to walk.
3. Overall attendance health. A high-level metric displaying your aggregate attendance percentage across all registered courses, flagging any subject that has dipped below the mandatory threshold.
4. Quick stats. Summary cards showing your total registered credits, pending digital assignments, and upcoming examination dates.

### University spotlight announcements

The official portal publishes circulars, event notifications, exam alerts, and administrative deadlines in a marquee feed called Spotlight. In the native portal, these circulars scroll by in an unreadable ticker that is tedious to browse.

Retop gathers all Spotlight circulars into organized category groups. You can read announcement titles clearly, see when they were posted, and download circular PDF attachments with a single click.

---

## Chapter 4. Class timetable

### The visual timetable grid

The timetable page presents your weekly class schedule in a crisp, color-coded weekly grid. Time columns run from morning to evening, and day rows run from Monday through Friday (or Saturday if your campus has weekend lab batches).

Each class card shows:

1. The course code and full course title.
2. The slot designation (such as A1, B2, or L1 plus L2).
3. The assigned lecture hall or laboratory room number.
4. The faculty member's name.
5. A color tag distinguishing theory lectures from laboratory sessions.

By default, opening the timetable always lands you in the visual grid layout, ensuring you get an instant spatial map of your day without having to toggle views.

### Alternative viewing modes

For quick checks on narrow screens, you can switch between three viewing modes using the floating toggle in the lower corner:

1. Grid mode. The complete weekly schedule mapped against the standard university time matrix.
2. List mode. A compact, chronological list of all registered courses sorted alphabetically or by slot, showing credit counts, course types, and faculty contacts.
3. Week mode. A focused day-by-day column view that shows only the slots scheduled for that specific day of the week.

### Handling slot collisions

VIT uses an intricate slot matrix where certain theory slots share columns with laboratory slots. In irregular schedules, evening batches, or weekend classes, two different course components may occasionally share overlapping hours. Retop flags these overlapping blocks so you can see which component takes precedence and verify your room assignments.

### Calendar export

You can export your complete semester timetable as an industry-standard calendar file (.ics). Importing this file into Apple Calendar, Google Calendar, or Microsoft Outlook automatically schedules all your lectures and lab practicals across the entire semester, complete with classroom locations and alert notifications.

---

## Chapter 5. Attendance tracker and calculator

### The seventy-five percent rule

University regulations mandate a minimum attendance of seventy-five percent in every course to be eligible to sit for final semester examinations. Falling below this threshold leads to course debarment or the dreaded red-list.

Retop takes the anxiety out of attendance tracking by computing your safety margins automatically:

1. If your attendance is above seventy-five percent, Retop calculates exactly how many consecutive hours you can safely miss while keeping your attendance at or above the minimum threshold.
2. If your attendance has slipped below seventy-five percent, Retop calculates exactly how many consecutive classes you must attend without missing a single hour to recover your eligibility.

### The forecast simulator

The attendance page includes an interactive what-if simulator. By adjusting class attendance predictions for upcoming weeks, you can preview how skipping an upcoming Friday lecture or attending a weekend extra class will shift your final percentage before you make the decision.

### Detailed class-by-class audit

Clicking on any course card opens a comprehensive attendance ledger. The ledger displays:

1. Total classes conducted by the instructor to date.
2. Total classes attended.
3. Total classes missed.
4. Total on-duty leaves recorded by the university administration.
5. A chronological table listing every recorded date, slot, status (Present, Absent, or On Duty), and posting timestamp.

---

## Chapter 6. Marks and grade analytics

### Continuous assessment breakdown

The marks page pulls your continuous assessment records across all registered subjects for the selected semester. Instead of forcing you to decipher unformatted tabular rows, Retop presents a structured breakdown:

1. Mid-term examinations (CAT-1 and CAT-2).
2. Digital assignments and quizzes.
3. Laboratory continuous assessments and final lab exams.
4. Final semester assessments (FAT).

For each component, you can view your scored marks alongside the maximum weightage, giving you an immediate calculation of how many marks you have secured out of the total internal evaluation.

### Class average and performance benchmarks

Where available from the portal response, Retop displays the class average score and the highest score achieved in your course section. This benchmark gives you valuable context on whether an assessment was graded strictly across the whole class or whether your score sits comfortably above the median.

### Grade trends and cumulative record

The grades page offers an analytical overview of your entire academic journey:

1. Your current Cumulative Grade Point Average (CGPA).
2. Total credits earned toward your degree requirements.
3. A visual trend chart illustrating your semester-by-semester GPA trajectory from your first term through the current semester.
4. A complete history of every completed course, its credit weightage, and the letter grade awarded (S, A, B, C, D, E, or F).

### The what-if grade projector

Wondering what grade point average you need in the upcoming final examinations to boost your overall CGPA to a specific cutoff? The built-in grade projector allows you to input hypothetical grades for your current courses and instantly calculates the resulting semester GPA and cumulative CGPA.

---

## Chapter 7. Digital assignments and submissions

### Assignment tracking and deadlines

The digital assignments page aggregates all pending course assignments across your subjects into a single dashboard. Every assignment card displays:

1. The course title and course code.
2. The assignment title, description, and instructions provided by the professor.
3. The official submission deadline, highlighted with a countdown badge that turns amber when a deadline is approaching and red when fewer than twenty-four hours remain.
4. The current submission status (Not Uploaded, Uploaded, or Evaluated).

### Built-in client-side PDF compressor

The university portal enforces strict file size ceilings on uploaded assignments, often rejecting any document larger than two or three megabytes. Students often waste valuable time looking for third-party file compressors on the internet right before a midnight deadline.

Retop includes a client-side PDF compressor directly within the assignment view. When you select a document that exceeds the portal's upload limit, Retop compresses the file on your device before sending it to the server. Your assignment stays on your computer throughout the compression process, keeping your work private.

### Drag and drop submission

You can upload your completed assignment by dragging a PDF file directly from your computer desktop onto the assignment card, or even onto the global drop zone that covers the browser window. Retop prompts you to confirm your submission, displays the file name, and sends the upload directly through the university submission pipeline.

---

## Chapter 8. Course page and academic resources

### Consolidated syllabus and course materials

The course page section brings together all learning materials uploaded by your professors across all your registered subjects:

1. Syllabus outlines and reference textbook lists.
2. Lecture presentations, lecture slides, and classroom handouts.
3. Practice problem sheets and previous year question banks.
4. Project guidelines and laboratory reference sheets.

Instead of navigating through nested drop-down menus for each individual course, Retop consolidates these documents into a searchable, filterable library.

### Automated download organization

When downloading multiple course files, browser download folders quickly become cluttered with cryptic file names like document_one.pdf or download.pdf.

Retop routes university downloads through an intelligent organizer. When you download course notes or assignments through Retop, the extension automatically sorts the files into cleanly structured directories on your machine:

First, by semester name.
Second, by course code and subject title.
Third, by the faculty member's name.

This ensures that your study materials remain neatly organized on your hard drive throughout the academic year.

---

## Chapter 9. Exam schedule and academic calendar

### Examination timetables

As mid-term or final examinations approach, the exam schedule view displays your personalized exam timetable:

1. Course title and course code.
2. Examination date and day of the week.
3. Session time (Forenoon or Afternoon).
4. Slot designation.
5. Campus block, floor, and examination room number.
6. Your allocated seat number.

### Automatic exam clash detector

If you are enrolled in weekend courses, remedial subjects, or inter-school electives, examination slots can occasionally conflict. Retop analyzes your examination dates and sessions. If two different examinations are scheduled on the same calendar day within the same session, Retop displays an alert banner across the top of your schedule, prompting you to contact the academic office before the testing window begins.

### The academic calendar

The academic calendar tab provides the university's master schedule for the semester:

1. Official start and end dates of instructional periods.
2. Continuous assessment dates and practical exam windows.
3. Scheduled national holidays and semester recess periods.
4. Academic deadlines, including course drop deadlines and registration windows.

---

## Chapter 10. Hostel late hour requests

### Submitting outing and late hour requests

For students residing in on-campus hostels, requesting late hour entry permissions traditionally requires visiting administrative desks or navigating clunky portal pages.

Retop provides a direct interface for submitting late hour entry permissions:

1. Choose your planned outing date and departure time.
2. Specify your expected return time to the hostel gates.
3. Select your outing destination and provide a brief reason for the request.
4. Submit the request directly to the hostel warden system.

### Tracking approval history

The late hour screen displays a chronological log of all past and pending requests. Each card shows the date, destination, reason, and current approval status (Pending Warden Review, Approved, or Rejected), giving you clear documentation before you leave the hostel gates.

---

## Chapter 11. Student profile and digital ID card

### Academic profile records

The profile page gathers all personal and institutional records associated with your enrollment:

1. Full name, registration number, and application number.
2. Enrolled school, degree programme, and specialization.
3. Assigned faculty advisor (proctor) contact details.
4. Hostel block, room number, and caterer mess allotment.
5. One-click copy buttons next to your registration number, application ID, and institutional email for pasting into forms.

### The digital student ID card

Retop renders a clean, digital companion to your physical university ID card. The digital card includes your portrait photograph, official student details, school insignia, and an accurate, high-contrast barcode generated directly from your registration number.

The barcode is compatible with campus optical barcode scanners, offering a convenient backup if you misplace your plastic ID card while visiting on-campus library facilities or hostel check-in gates.

---

## Chapter 12. Offline mode and data portability

### Using Retop without internet access

Internet access on campus can be inconsistent, particularly in large lecture halls or during peak evening hours in the hostels. Retop caches your academic data locally on your computer.

When you open Retop without an active internet connection, it automatically launches in offline mode. You can inspect your weekly timetable, verify class room numbers, review past marks, and check attendance percentages without waiting for the university server to respond.

### Standalone web application

In addition to running inside the live portal, Retop can be used as an independent Progressive Web App (PWA). You can install it on your desktop or mobile browser, allowing you to launch Retop from your device home screen like a native application.

### Local data security and PIN lock

Because your academic information is stored in your browser's local database, Retop offers an optional offline security PIN. When enabled, launching Retop in offline mode requires entering a four-digit PIN before your attendance, marks, and personal profile are decrypted and displayed on screen.

### Exporting and clearing data

You maintain total control over your local data:

1. Data Export. You can save your cached records as a portable backup file.
2. Data Reset. A single button in the settings view clears all local caches, resets saved credentials, and returns Retop to a clean initial state.

---

## Chapter 13. Appearance, theming, and customization

### Theme modes

Retop includes a versatile theme engine designed for high readability in both bright classrooms and dark study rooms:

1. Light mode. A clean, high-contrast light theme with subtle borders.
2. Dark mode. A deep charcoal theme that reduces eye strain during night study sessions.
3. AMOLED mode. A true pitch-black theme that conserves battery power on OLED displays.
4. System Auto. Automatically synchronizes Retop's appearance with your operating system settings.

### Material color palettes and accents

You can personalize the visual identity of Retop by choosing from several accent colors, including Blue, Indigo, Green, Red, Orange, Purple, and Monochrome. The interface recalculates surface highlights, card borders, and progress meters using Google's Material tonal palette system.

### Privacy mode

Studying in crowded campus libraries or auditoriums often means peers can view your laptop screen from behind. Retop includes a Privacy Blur option in the settings. When toggled on, your cumulative GPA and course grades are blurred by default. Hovering your mouse pointer over the blurred card temporarily reveals the score, keeping your academic results private from passersby.

### Font scaling and animations

1. Font size scaling. You can adjust the base interface scale from eighty percent up to one hundred and twenty percent to match your display resolution and reading preference.
2. Animation speeds. For users who prefer instantaneous transitions or work on lower-powered hardware, animation speeds can be set to normal, half-speed, or completely disabled.

---

## Chapter 14. Known conflicts, flaky behaviors, and edge cases

Building software on top of a closed, unpredictable university portal requires honest evaluation of failure modes. When things go wrong, knowing the underlying cause prevents frustration. Here is an honest accounting of every known conflict, rough edge, and flakiness currently present in Retop.

### Login takeover destruction and the reload requirement

On portal login routes, Retop must suppress the university's default Bootstrap HTML to prevent ugly visual flickering. It does this by aborting the browser's initial page rendering the moment the document starts loading.

Because the native document structure is stopped early, Retop owns the entire page. If an unexpected JavaScript crash occurs during the login screen render, Retop cannot simply reveal the native login page underneath, because the native page was never built.

Instead, Retop catches the crash, writes a bypass flag into session storage, and reloads the entire browser window. On the subsequent reload, Retop steps aside completely, allowing the native portal to load unhindered. If your browser blocks session storage or operates in a restrictive privacy mode, this recovery reload can occasionally loop or show an empty page.

### The silent teardown and scroll lock trap

When Retop is active on the dashboard, it hides the native university content and locks the main browser window scrollbar so that only the modern UI scrolls.

If an unhandled error occurs in a deeply nested dashboard component, Retop triggers a silent teardown utility. This utility removes all Retop styles and brings back the original university portal without throwing intrusive crash banners.

However, during this teardown, the body scroll property must be reset from hidden back to auto. In early versions, if this reset failed, native VTOP was revealed but remained completely unscrollable until the student refreshed the tab. Current builds enforce this cleanup, but if you ever see the native portal appear frozen after a crash, a simple page refresh restores standard browser scrolling.

### Shadow root element lookups

Retop isolates its modern components inside a browser Shadow DOM so that university stylesheets do not corrupt the modern UI. A common pitfall in shadow DOM programming is calling traditional document element lookups directly on the shadow root.

Standard browsers do not implement element lookups by identifier on shadow root objects. Attempting to call such methods throws an immediate type error. While these queries have been corrected to use scoped element selectors, whenever you inspect or modify shadow boundary code, remember that shadow roots only support scoped query selectors.

### Timetable view mode overrides

When navigating to the timetable, Retop enforces the visual grid layout by resetting the view mode on mount. If you previously switched to the list or week view, clicking away to another section and returning to the timetable will reset your perspective back to the weekly grid. This is intentional to ensure consistency, but it may surprise students who prefer the list view as their permanent default.

### Captcha solver accuracy limitations

The built-in optical character recognition solver is lightweight and runs locally on your computer. It does not use remote cloud services or heavy neural weights.

While it achieves a high success rate on standard university captcha patterns, heavily warped characters, severe background grain, or overlapping letters will occasionally produce an incorrect string. If the university portal reports an invalid captcha, Retop reloads a fresh captcha image. If three attempts fail consecutively, manual entry is required.

### Session timeout handling during long study sessions

The university web server terminates student sessions after fifteen to twenty minutes of inactivity. When you are reading lecture slides or reviewing assignment questions on a single Retop page without triggering new network requests, your session on the university server may silently lapse.

When you finally click to open another subject, the server returns an HTML page containing a session expired warning. Retop inspects incoming responses for this pattern and displays an explicit expiration alert. However, if the university server redirects to an unexpected landing page instead of returning the standard session expiration markup, Retop may display an empty state until you refresh and log in again.

### Mandatory faculty feedback blockers

Periodically throughout the semester, university administrators lock the entire portal behind mandatory student feedback surveys. During these periods, any attempt to navigate to attendance, timetable, or marks returns the mandatory feedback questionnaire instead of the requested academic records.

Retop contains a background detector that monitors responses for survey keywords. When a mandatory feedback questionnaire is detected, Retop automatically steps aside and drops you into the native university interface so you can complete the required survey forms. Once submitted on the official portal, Retop resumes normal operation.

### Timetable slot clashing on irregular batches

VIT's slotting architecture assigns courses to predefined slot labels (such as A1, B1, C1, TA1, and TB1). In specialized schedules (such as evening diploma courses, inter-school electives, or weekend laboratory batches), certain slots can share the same calendar hours.

While Retop renders overlapping tags inside the affected grid cell, severely congested slots can cause text truncation or visual clipping on smaller laptop screens. Switching to the list view resolves this ambiguity by laying out each course sequentially.

### Digital assignment upload file restrictions

While Retop includes a client-side PDF compressor to reduce file sizes below university thresholds, some PDF documents cannot be compressed:

1. Password-protected or encrypted PDFs cannot be processed by the browser compressor.
2. Scanned documents that already consist of low-resolution raster images will see negligible size reduction.

If an upload fails because the university server rejected the file format or detected invalid characters in the filename (such as commas, slashes, or special symbols), the university portal returns an error dialog inside its response. Retop attempts to catch these server errors and alert you, but always ensure your assignment filenames contain only plain letters, numbers, and dashes.

### Dark mode styling conflicts with native tables

When viewing administrative pages that do not have a modern Retop equivalent (such as bank detail verification, hostel counseling, or student leave forms), Retop applies an injected dark mode stylesheet so that your eyes are not blinded by white backgrounds.

Because the legacy university portal relies on thousands of inline style attributes and nested HTML tables, some legacy pages may display faint borders or dark text against dark backgrounds. If a legacy form becomes difficult to read, toggling Retop's theme to Light mode in the settings restores native black-on-white styling immediately.

### Stale cache across multiple user logins

If two different students use the same computer to log into the portal in the same browser profile, local caches can briefly overlap. Retop partitions its local records by student registration number, but common keys (such as the last active timetable view or draft settings) are shared across the browser profile. Logging out properly using the sign-out button in the modern profile menu clears temporary session keys and guarantees clean data separation.

---

## Conclusion

Retop exists to transform a frustrating, slow university web portal into an agile, pleasant academic tool. By understanding both its capabilities and the inevitable quirks that arise from bridging modern web design with legacy university servers, you can make the most of your daily portal routine.
