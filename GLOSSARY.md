# Glossary

The domain vocabulary of retop. Use these terms as written in issues, refactor proposals, test names and module names. If a concept you need is not here, that is a gap for `/domain-modeling`, not a reason to invent a synonym (see `docs/agents/domain.md`).

**Module names must come from this glossary.** A deep module is named after the domain concept it owns: introduce the term here first, then name the module after it.

## Terms

### Course material
A file or web link listed under a course on VTOP's course page, with a title, faculty, category, module, upload date and file id. `courseMaterials.ts` turns the flat list into faculty-grouped, sorted, faculty-annotated entries.

### Semester identity
The canonical key (`canonicalSemesterId`) used to compare semester IDs such as `VL20262701`, plus the display-label cleanup VTOP labels need. Comparison never reaches presentation code.

### Session facts
The current session's `csrf`, `regNo` and `mode`. `regNo` is the registration number VTOP renders as `authorizedID` / `authorizedIDX`, never the sign-in `username`; `mode` is `ambient` (same-origin, browser-owned cookie jar) or `jar`. One mutable seam owns extraction, fallback chains, refresh and mirroring to legacy globals.

### Course download
Fully planned work for one course material: a VTOP-scoped URL, the `_csrf` / `authorizedID` / `fileId` POST body, and the exact `retop/coursepage/<semester>/<course>/<faculty>/...` filename. The worker adapter only executes the plan; naming rules never drift into it.

### Presentation roles
A faculty group's role in the course-page presentation. `isAssignedFaculty` matches the assigned faculty by employee ID or name tokens; that group sorts first and is badged "Assigned Faculty."

### Selectable row
A course-material row rendered with a checkbox. Only rows whose category is downloadable become `downloadableSelections`, which drive the Select all and Download selected bulk downloads.
