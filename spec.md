
# Specification

## Overview

This repo is to create a simple proof of concept where a multi step form that is combined together into a preview version of the report containing all the data that is entered.
The key thing that I want is that in this report preview, that you can toggle on a edit mode and edit the data from that preview page.
AKA if you notice a typo in any of the fields, you can update that, or change dropdowns to align with what you want.
There may be some fields which are too complicated to edit, but if this is the case a edit button should be displayed that then opens a pop up window that lets you make the required edits.

No user admin or anything is required.

## Resolved Design Decisions

These decisions were agreed during spec review and take precedence over any looser wording elsewhere in this document.

- **Inline edit model** — Inline edits in the preview always write back to the *underlying source field*, and the preview re-derives its formatted view from that field. Users never edit the derived/formatted text directly (e.g. they don't edit the generated paragraph numbers, the "millions" dollar display, or the prepended recommendation type).
- **Complex fields** — The Recommendations, Financial, and FTE tables are edited via the "Edit" button → popup/modal, not cell-by-cell inline. Simple dropdowns render inline as click-to-open pickers.
- **Collaboration** — Real, server-backed concurrent editing (Google-Docs style) is in scope. Invented usernames and presence indicators (cursors/avatars) are shown; no login is required.
- **Persistence** — A backend is in scope. Projects and their data persist server-side so collaboration and autosave are real.
- **Paragraph numbering** — This is the single most important must-have of the report presentation; it must work reliably.
- **Images** — Embedded in rich text as base64 data URIs (kept inline through storage and Word export).
- **Early preview** — The summary preview can be opened at any time, even with an incomplete project. Sections/fields that are not yet completed are shown in **red** to flag them.
- **Landing page** — Alongside New and Edit, each project has a **Delete** button.
- **New Project flow** — The New Project button creates the project and drops the user directly into Step 1 (Basic Details).
- **Keyboard shortcuts** — Ctrl/Cmd-S to save; standard Ctrl/Cmd-B/I/U within rich-text fields; keyboard navigation between steps.
- **Tech stack** — Free choice. Proposed: React + Vite + TypeScript with TipTap (ProseMirror) for WYSIWYG on the frontend; a Node.js backend running a Yjs WebSocket sync server (`y-websocket`) plus a lightweight persistence store (e.g. SQLite) for the project list and document snapshots. Word export via a `.docx` generation library. This may be adjusted during implementation as long as the behaviour above is met.

## General settings

All formattable text fields should allow the following formatting options and be WYSIWYG:
- Bold
- Italic
- Underline
- Strikethrough
- Headings (H1-H6)
- Numbered lists
- Unordered (bullet) lists
- Tables
- Pictures

Users should not be able to change the font or any other formatting details.
No user admin or anything is required. Anyone should be able to edit anything in this proof of concept.



## Project Steps

The following details are how project details are captured:
- The ability to create a project, whose data entry method will be a multi-step form with 6 steps.
- The steps and questions on each step are:
  - Basic Details
    - **Project Name** - Unformatted Free text - Max length 180 characters
    - **Department** - Dropdown of Queensland government departments (hardcode a reasonable default list)
    - **Process Type** - Budget or MYFER dropdown
    - **Budget Year** - Financial Year dropdown
  - Core Details
    - **Short Description** - Unformatted Free text - Max length 300 characters
    - **Recommendations** - Table with 3 columns and any number of rows. Column 1 is simply the row number, while column 2 is the Recommendation Type (which is a dropdown of approve or note), and the third is a recommendation. Each row should accept unformatted free text. Rows can be reordered using up/down arrows (the row number always reflects the current order and is auto-generated, not user-entered). In the Preview space this should be displayed as a numbered list with the recommendation type prepended to the recommendation text.
    - **Detailed Description** - Formattable Free text - no length limit
    - **Election Commitment** - Yes No Dropdown
    - **Election Commitment Details** - If Yes is selected for the previous question, a Formattable Free text - no length limit. If Election Commitment is set to No, this field is omitted from the preview and its data is dropped.
  - Financials
    - **Start Year** - Dropdown of financial years
    - **End Year** - Drop down of financial years
    - **Financial Table** - A financial entry table with columns for each financial year between the start and end years (inclusive), plus a **Total** column on the right summing across all years for each row. Rows for
      - Services Appropriation
      - Equity Appropriation
      - Revenue Returned to Government
      If the start/end year range changes, data for any year no longer in range is dropped.
    - **Costing Methodology** - Formattable Free text - no length limit
  - FTEs
    - **Start Year** - Dropdown of financial years
    - **End Year** - Drop down of financial years
    - **FTE Table** - An entry table with columns for each financial year between the start and end years (inclusive), plus a **Total** column on the right summing across all years for each row. Rows for
      - New FTEs
      - Reallocation of existing FTEs
      If the start/end year range changes, data for any year no longer in range is dropped.
  - Location
    - **Project Location** - Multi select dropdown of LGAs in Queensland, or Statewide (hardcode a reasonable default list)
  - Extra Details
    - **Additional Information** - Formattable Free text - no length limit

## Summary Report Presentation
- The summary report should be designed to be a single document containing all the fields from the steps above
- The summary report should be formatted to look like a professional document.
- Throughout the document, paragraph numbering like a legal document should be inserted. This numbering should continue across fields and not require user intervention in order to have it appear.
  - Numbering is **flat and continuous** (1, 2, 3, …) across the whole document.
  - Headings are **not** numbered.
  - Numbered/unordered lists that a user creates as formatting are independent of, and sit outside, the legal paragraph numbering (the paragraph numbering does not renumber or absorb list items).
- The report should be able to be exported as a word document.
- Dollars should be reported in millions of dollars - example format string - "#,0,,.000;(#,0,,.000);.." (millions, 3 decimals, negatives in parentheses, zero shown as ".."). Negative values should additionally be shown in **red text**.
- FTEs should be reported with with 1 decimal point

## General Application Overview 
- The application needs no login/user system
- Pages required: 
  - Simple Projects landing page listing all projects in the application with the project name and department
    - New Project Button
    - Edit Button next to each project
  - Each projects data entry is in the form of a breadcrumb step based form
  - Data should autosave when editing, but also have explicit save buttons, and expected keyboard shortcuts for accessibility. 
  - At the bottom of the page when in a project there is a Summary toggle that will show the summary report presentation.
  - When viewing the summary report, there should be a edit button that lets you activate edit mode.
  - This edit mode is the killer feature I am wanting to show and all effort to make this as amazing as possible should be utilised.
  - Live concurrent editing is enabled (server-backed, Google-Docs style). Users are given invented usernames and presence indicators so multiple concurrent editors can be demonstrated.
