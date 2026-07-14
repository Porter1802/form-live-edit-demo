import { AiExtraction } from "./aiExtract.js";

// Canned sample extraction used when no AI backend is configured
// (ANTHROPIC_API_KEY unset). This lets anyone walk the whole
// upload → processing → validate → confirm flow visually, without an API key.
//
// The values are chosen to exercise every status badge on the validate screen:
//  - clean reference matches (Process Type, Budget Year → "Matched")
//  - a deliberately fuzzy department + location (→ "Check")
//  - captured free-text / rich-text bodies (→ "Captured")
//  - one field left blank (→ "Empty")
export function demoExtraction(): AiExtraction {
  return {
    projectName: "Regional Schools Modernisation Program",
    // Deliberately abbreviated so the coercer fuzzy-matches it and flags "Check".
    department: "Dept. of Education",
    processType: "Budget",
    budgetYear: "2025-26",
    shortDescription:
      "A four-year program to upgrade classrooms, connectivity and accessibility " +
      "across regional Queensland state schools.",
    recommendations: [
      { type: "Approve", text: "Approve $180.0m over four years for the program." },
      { type: "Note", text: "Note delivery is staged by school cohort each year." },
    ],
    detailedDescription:
      "<p>The program modernises <strong>learning environments</strong> in regional " +
      "state schools, prioritising communities with the oldest building stock.</p>" +
      "<p>Scope includes:</p>" +
      "<ul><li>Classroom refurbishment and air-conditioning</li>" +
      "<li>High-speed connectivity upgrades</li>" +
      "<li>Accessibility and inclusion works</li></ul>",
    electionCommitment: "Yes",
    electionCommitmentDetails:
      "<p>Delivers the <em>Better Regional Schools</em> election commitment announced " +
      "in the 2024 campaign.</p>",
    finStartYear: "2025-26",
    finEndYear: "2028-29",
    financialTable: [
      { row: "Services Appropriation", year: "2025-26", value: 20.0 },
      { row: "Services Appropriation", year: "2026-27", value: 25.5 },
      { row: "Services Appropriation", year: "2027-28", value: 25.5 },
      { row: "Services Appropriation", year: "2028-29", value: 24.0 },
      { row: "Equity Appropriation", year: "2025-26", value: 15.0 },
      { row: "Equity Appropriation", year: "2026-27", value: 20.0 },
      { row: "Equity Appropriation", year: "2027-28", value: 15.5 },
      { row: "Equity Appropriation", year: "2028-29", value: 9.0 },
    ],
    costingMethodology:
      "<p>Costs are based on departmental building-works benchmarks per square metre, " +
      "escalated at forecast construction indices, plus a 10% contingency.</p>",
    fteStartYear: "2025-26",
    fteEndYear: "2028-29",
    fteTable: [
      { row: "New FTEs", year: "2025-26", value: 8 },
      { row: "New FTEs", year: "2026-27", value: 12 },
      { row: "New FTEs", year: "2027-28", value: 12 },
      { row: "New FTEs", year: "2028-29", value: 10 },
    ],
    // "Cairns Region" fuzzy-matches "Cairns Regional" (→ "Check"); others match cleanly.
    locations: ["Cairns Region", "Townsville City", "Toowoomba Regional"],
    // Left blank on purpose to show the "Empty" status.
    additionalInfo: "",
  };
}
