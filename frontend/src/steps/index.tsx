import React, { useEffect } from "react";
import {
  DEPARTMENTS,
  PROCESS_TYPES,
  FINANCIAL_YEARS,
  YES_NO,
  LOCATIONS,
  FINANCIAL_ROWS,
  FTE_ROWS,
  MAX_PROJECT_NAME,
  MAX_SHORT_DESCRIPTION,
} from "../../../common/src/index";
import { TextField, TextAreaField, Dropdown, MultiSelect } from "../components/Fields";
import { RichTextEditor } from "../components/RichTextEditor";
import { RecommendationsEditor } from "../components/RecommendationsEditor";
import { NumericTableEditor } from "../components/NumericTableEditor";
import { useMapValue } from "../collab/useField";
import { useProjectDoc } from "../collab/ProjectDoc";

function StepBasic() {
  return (
    <div className="step">
      <TextField field="projectName" label="Project Name" maxLength={MAX_PROJECT_NAME} placeholder="Enter project name" />
      <Dropdown field="department" label="Department" options={DEPARTMENTS} />
      <Dropdown field="processType" label="Process Type" options={PROCESS_TYPES} />
      <Dropdown field="budgetYear" label="Budget Year" options={FINANCIAL_YEARS} />
    </div>
  );
}

function ElectionCommitment() {
  const { doc } = useProjectDoc();
  const [value] = useMapValue<string>("electionCommitment", "");

  // Drop the details data when the answer is switched to No.
  useEffect(() => {
    if (value === "No") {
      const frag = doc.getXmlFragment("electionCommitmentDetails");
      if (frag.length > 0) frag.delete(0, frag.length);
      doc.getMap("project").set("electionCommitmentDetailsHtml", "");
    }
  }, [value, doc]);

  return (
    <>
      <Dropdown field="electionCommitment" label="Election Commitment" options={YES_NO} />
      {value === "Yes" && (
        <div className="field">
          <span className="field-label">Election Commitment Details</span>
          <RichTextEditor field="electionCommitmentDetails" />
        </div>
      )}
    </>
  );
}

function StepCore() {
  return (
    <div className="step">
      <TextAreaField
        field="shortDescription"
        label="Short Description"
        maxLength={MAX_SHORT_DESCRIPTION}
        placeholder="A brief summary of the project"
      />
      <div className="field">
        <span className="field-label">Recommendations</span>
        <RecommendationsEditor />
      </div>
      <div className="field">
        <span className="field-label">Detailed Description</span>
        <RichTextEditor field="detailedDescription" />
      </div>
      <ElectionCommitment />
    </div>
  );
}

function StepFinancials() {
  return (
    <div className="step">
      <div className="field-row">
        <Dropdown field="finStartYear" label="Start Year" options={FINANCIAL_YEARS} />
        <Dropdown field="finEndYear" label="End Year" options={FINANCIAL_YEARS} />
      </div>
      <div className="field">
        <span className="field-label">Financial Table</span>
        <NumericTableEditor
          tableField="financialTable"
          startField="finStartYear"
          endField="finEndYear"
          rowLabels={FINANCIAL_ROWS}
          hint="Enter whole dollar amounts; the report displays them in $ millions."
        />
      </div>
      <div className="field">
        <span className="field-label">Costing Methodology</span>
        <RichTextEditor field="costingMethodology" />
      </div>
    </div>
  );
}

function StepFtes() {
  return (
    <div className="step">
      <div className="field-row">
        <Dropdown field="fteStartYear" label="Start Year" options={FINANCIAL_YEARS} />
        <Dropdown field="fteEndYear" label="End Year" options={FINANCIAL_YEARS} />
      </div>
      <div className="field">
        <span className="field-label">FTE Table</span>
        <NumericTableEditor
          tableField="fteTable"
          startField="fteStartYear"
          endField="fteEndYear"
          rowLabels={FTE_ROWS}
        />
      </div>
    </div>
  );
}

function StepLocation() {
  return (
    <div className="step">
      <MultiSelect field="locations" label="Project Location" options={LOCATIONS} />
    </div>
  );
}

function StepExtra() {
  return (
    <div className="step">
      <div className="field">
        <span className="field-label">Additional Information</span>
        <RichTextEditor field="additionalInfo" />
      </div>
    </div>
  );
}

export interface StepDef {
  title: string;
  component: React.ComponentType;
}

export const STEPS: StepDef[] = [
  { title: "Basic Details", component: StepBasic },
  { title: "Core Details", component: StepCore },
  { title: "Financials", component: StepFinancials },
  { title: "FTEs", component: StepFtes },
  { title: "Location", component: StepLocation },
  { title: "Extra Details", component: StepExtra },
];
