// Hardcoded Queensland reference data shared by dropdowns and validation.

export const DEPARTMENTS: string[] = [
  "Department of the Premier and Cabinet",
  "Queensland Treasury",
  "Department of Education",
  "Queensland Health",
  "Department of Transport and Main Roads",
  "Department of Justice and Attorney-General",
  "Queensland Police Service",
  "Department of Agriculture and Fisheries",
  "Department of Environment, Science and Innovation",
  "Department of Energy and Climate",
  "Department of Housing, Local Government, Planning and Public Works",
  "Department of Child Safety, Seniors and Disability Services",
  "Department of Employment, Small Business and Training",
  "Department of Resources",
  "Department of State Development and Infrastructure",
  "Department of Tourism and Sport",
  "Queensland Fire Department",
  "Department of Youth Justice and Victim Support",
];

export const PROCESS_TYPES: string[] = ["Budget", "MYFER"];

export const YES_NO: string[] = ["Yes", "No"];

export const RECOMMENDATION_TYPES: string[] = ["Approve", "Note"];

// Financial years 2020-21 .. 2034-35
export const FINANCIAL_YEARS: string[] = (() => {
  const years: string[] = [];
  for (let start = 2020; start <= 2034; start++) {
    const end = (start + 1).toString().slice(-2);
    years.push(`${start}-${end}`);
  }
  return years;
})();

// Queensland Local Government Areas + Statewide.
export const LOCATIONS: string[] = [
  "Statewide",
  "Brisbane City",
  "Gold Coast City",
  "Logan City",
  "Moreton Bay City",
  "Sunshine Coast Regional",
  "Ipswich City",
  "Toowoomba Regional",
  "Cairns Regional",
  "Townsville City",
  "Mackay Regional",
  "Rockhampton Regional",
  "Fraser Coast Regional",
  "Redland City",
  "Bundaberg Regional",
  "Gladstone Regional",
  "Gympie Regional",
  "Livingstone Shire",
  "Scenic Rim Regional",
  "Somerset Regional",
  "Lockyer Valley Regional",
  "Southern Downs Regional",
  "Tablelands Regional",
  "Cassowary Coast Regional",
  "Whitsunday Regional",
  "Isaac Regional",
  "Central Highlands Regional",
  "Western Downs Regional",
  "Maranoa Regional",
  "Mount Isa City",
  "Douglas Shire",
  "Noosa Shire",
];

// Returns the inclusive list of financial years between start and end (by index).
export function yearsInRange(start: string, end: string): string[] {
  const si = FINANCIAL_YEARS.indexOf(start);
  const ei = FINANCIAL_YEARS.indexOf(end);
  if (si === -1 || ei === -1 || si > ei) return [];
  return FINANCIAL_YEARS.slice(si, ei + 1);
}
