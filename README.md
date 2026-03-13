![retop](https://github.com/lavan8t/retop/blob/main/public/assets/black-retop.svg#gh-light-mode-only)
![retop](https://github.com/lavan8t/retop/blob/main/public/assets/white-retop.svg#gh-dark-mode-only)

# retop

> A reimagined , strongly-typed, brutalist themed university portal interface.

## Why I Built This

If you've ever tried building a modern frontend wrapper, a mobile app, or an alternative UI for the VTOP portal, you already know the pain. Between the unpredictable session timeouts, and the sheer impossibility of getting clean, consistent JSON data during active UI development, building frontend features becomes a crawl.

I was tired of waiting for the real portal to load just to see how a flexbox container handled a long course name. I needed a reliable, offline-first way to design the dashboard, test edge cases in the curriculum sheet, and build out the complex profile views without constantly logging in and out.

I built this mock service because I wanted to build components fast. This isn't just a collection of random "John Doe" strings; it is a meticulously crafted replica of the actual portal data structures. It reflects the real shape of the data—from the nested family income details to the specific slot structures (like A1+TA1)—so you can develop your UI with confidence that it will plug flawlessly into the real API later.

---

## Features

- **100% TypeScript**: Built directly against the vtop core types. If your UI works with this mock data, it will work with the real data.
- **Structurally Accurate**: Mirrors the exact nesting and relationships found in the real portal database (Academics, Curriculum, Profile, Examinations).
- **Zero Dependencies**: It's just plain TypeScript/JavaScript. No heavy mock servers or faker libraries required.
- **Plug & Play**: Import the constants directly into your React/Vue/Svelte components or your state management store.

---

## Data Categories

| Module                 | What's Inside                                                                                                 |
| :--------------------- | :------------------------------------------------------------------------------------------------------------ |
| MOCK_USER & MOCK_STATS | High-level dashboard overviews (Name, RegNo, CGPA, Total Credits).                                            |
| MOCK_MENU              | The complete sidebar navigation structure with exact category grouping.                                       |
| MOCK_ATTENDANCE        | Course summaries, faculty names, slots, and calculated attendance percentages.                                |
| MOCK_TIMETABLE         | Venue details, class IDs, slot combinations, and course types (ETH, ELA).                                     |
| MOCK_CURRICULUM        | Program Core (PC) vs University Core (UC) breakdowns and credit tracking.                                     |
| MOCK_PROFILE           | The monolithic student profile view, including hostel details, proctor mapping, and deep educational history. |

---

## Usage

Drop the mock data file into your project (e.g., src/utils/mock-data.ts) and import what you need directly into your components.

### Example: Rendering the Student Dashboard

```tsx
import { MOCK_USER, MOCK_STATS, MOCK_ATTENDANCE } from "../utils/mock-data.ts";

export const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <header>
        <h1>Welcome back, {MOCK_USER.name}</h1>
        <div className="stats-badges">
          <span>CGPA: {MOCK_STATS.cgpa}</span>
          <span>Credits Earned: {MOCK_STATS.credits}</span>
        </div>
      </header>

      <section className="attendance-grid">
        {MOCK_ATTENDANCE.map((course) => (
          <div key={course.code} className="course-card">
            <h3>
              {course.code} - {course.name}
            </h3>
            <p>Attendance: {course.attendance}</p>
            <progress value={course.attended} max={course.total} />
          </div>
        ))}
      </section>
    </div>
  );
};
```

### Example: Mocking an API Endpoint (Express/Next.js)

If you prefer to serve the mock data over HTTP to simulate network latency:

```typescript
import { MOCK_PROFILE } from "../mocks/vtopData";

export default function handler(req, res) {
  // Simulate a slow VTOP server response
  setTimeout(() => {
    res.status(200).json(MOCK_PROFILE);
  }, 1500);
}
```

---

## Modifying the Data

The data is currently configured for a female engineering student residing in the Ladies Hostel with a standard PCMC background.

Need to test how your UI handles edge cases?

1. **Low Attendance:** Change MOCK_ATTENDANCE[0].attended to trigger your "Debarred" UI warnings.
2. **Missing Data:** Nullify MOCK_PROFILE.hostel to test the UI for day scholars.
3. **Overloaded Timetable:** Duplicate entries in MOCK_TIMETABLE to test your CSS grid/flex wrapping on the calendar view.

---

_Built for better student experiences._
