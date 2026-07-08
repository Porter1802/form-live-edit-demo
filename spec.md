
# Specification

## Overview

This repo is to create a simple proof of concept where a multi step form that is combined together into a preview version of the report containing all the data that is entered.
The key thing that I want is that in this report preview, that you can toggle on a edit mode and edit the data from that preview page.
AKA if you notice a typo in any of the fields, you can update that, or change dropdowns to align with what you want.
There may be some fields which are too complicated to edit, but if this is the case a edit button should be displayed that then opens a pop up window that lets you make the required edits.

No user admin or anything is required.

## General settings

All formattable text fields should allow the following formatting options and be WYSIWYG:
- Bold
- Italic
- Underline
- Strikethrough
- Headings (H1-H6)
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
    - **Department** - Dropdown of Queensland government departments
    - **Process Type** - Budget or MYFER dropdown
    - **Budget Year** - Financial Year dropdown
  - Core Details
    - **Short Description** - Unformatted Free text - Max length 300 characters
    - **Recommendations** - Table with 3 columns and any number of rows. Column 1 is simply the row number, while column 2 is the Recommendation Type (which is a dropdown of approve or note), and the third is a recommendation. Each row should accept unformatted free text. In the Preview space this should be displayed as a numbered list with the recommendation type prepended to the recommendation text.
    - **Detailed Description** - Formattable Free text - no length limit
    - **Election Commitment** - Yes No Dropdown
    - **Election Commitment Details** - If Yes is selected for the previous questions a Formattable Free text - no length limit
  - Financials
    - **Start Year** - Dropdown of financial years
    - **End Year** - Drop down of financial years
    - **Financial Table** - A financial entry table with columns for each financial year between the start and end years (inclusive). Rows for
      - Services Appropriation
      - Equity Appropriation
      - Revenue Returned to Government
    - **Costing Methodology** - Formattable Free text - no length limit
  - FTEs
    - **Start Year** - Dropdown of financial years
    - **End Year** - Drop down of financial years
    - **FTE Table** - A  entry table with columns for each financial year between the start and end years (inclusive). Rows for
      - New FTEs
      - Reallocation of existing FTEs
  - Location
    - **Project Location** - Multi select dropdown of LGAs in Queensland, or Statewide
  - Extra Details
    - **Additional Information** - Formattable Free text - no length limit
 
## Summary Report Presentation
- The summary report should be designed to be a single doucment containing all the fields from the steps above
- The summary report should be formatted to look like a professional document.
- Throughout the document, paragraph numbering like a legal document should be inserted. This numbering should continue across fields and not require user intervention in order to have it appear.
- The report should be able to be exported as a word document.
- Dollars should be reported in millions of dollars - example format string - "#,0,,.000;(#,0,,.000);.."
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
  - If possible live concurrent editting should be enabled like google docs kinda. For showing users do something like inventing usernames etc.
