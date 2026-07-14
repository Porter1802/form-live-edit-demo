# Security Risk Assessment — AI Word‑Form Parsing Feature

**Status:** Draft / proof‑of‑concept (POC)
**Feature:** Upload a Microsoft Word (`.docx`) form → parse its contents with an AI
model → validate → confirm → populate a project's fields.
**Audience:** Application team, the sponsoring agency's Information Security Officer
(ISO) / Chief Information Security Officer (CISO), and privacy officer.

> ⚠️ **This is a technical risk assessment for a demonstrator, not a formal
> security accreditation.** It does not replace an agency Information Security
> Management System (ISMS) risk assessment, a Privacy Impact Assessment (PIA), or
> an independent IRAP assessment. Standard names, control identifiers and
> publication versions cited below should be verified against the current
> published editions before this document is relied upon — several of these
> frameworks are updated on a quarterly or annual cycle.

---

## 1. Why this feature needs its own assessment

The existing application is a self‑contained form/report tool. This feature adds
two materially new things:

1. **File ingestion** — arbitrary `.docx` files are uploaded and parsed
   server‑side.
2. **Egress of document contents to a third‑party AI model** — the extracted text
   (and rich‑text HTML) is sent to an external inference endpoint and a response
   is written back into a government report.

Both change the system's threat surface and, critically, its **data‑handling
profile**. The sample data model is explicitly Queensland‑Government‑shaped —
department budget / **MYFER** (Mid‑Year Fiscal and Economic Review) submissions,
financial appropriations, FTE numbers, and *recommendations* framed as
Approve/Note decisions. In a real deployment this content is very likely to be
**Cabinet‑in‑Confidence and/or `OFFICIAL: Sensitive`–`PROTECTED`** (see §3). That
single fact drives most of the high‑severity risks.

### Data flow (new components in **bold**)

```
User ──uploads .docx──▶ [Express server]
                          │  1. **file received (multer)**
                          │  2. **mammoth → HTML/text extraction**
                          │  3. **prompt + document text ──▶ external AI endpoint**  ◀── egress boundary
                          │  4. **AI returns structured JSON**
                          │  5. **deterministic coercion / sanitisation**
                          ▼
                   proposal ──▶ [Browser: validate → confirm]
                                     │
                                     ▼
                              Yjs doc / SQLite  (report content)
```

The **egress boundary** at step 3 is the highest‑consequence control point in the
whole design.

---

## 2. Applicable standards and legal obligations

| Framework / instrument | Relevance to this feature |
|---|---|
| **ASD *Information Security Manual* (ISM)** | The Australian baseline of cyber security controls (principles: *Govern, Protect, Detect, Respond*). Queensland agencies are required to *have regard to* the ISM under IS18. Relevant control themes: data transfer/egress, gateways, cryptography & key management, web application hardening, event logging, and guidelines for outsourced/cloud services. |
| **ASD *Essential Eight*** | Baseline mitigation strategies. Directly engaged here: **Configure Microsoft Office macro settings**, **User application hardening**, **Patch applications** (new dependencies), **Regular backups**, **Restrict administrative privileges**, **Multi‑factor authentication**. |
| **ASD / ACSC AI guidance** — *Engaging with Artificial Intelligence*; *Guidelines for Secure AI System Development* (co‑sealed with CISA/NCSC and partners); *Deploying AI Systems Securely* | Directly on point: prompt injection, data poisoning, sensitive‑data disclosure to models, and secure deployment of AI systems. |
| **Protective Security Policy Framework (PSPF)** | Australian Government protective‑security policy; the source of the `OFFICIAL` / `OFFICIAL: Sensitive` / `PROTECTED` classification scheme that Queensland aligns to. |
| **Hosting Certification Framework (HCF)** & **IRAP** (Infosec Registered Assessors Program) | Where sensitive/classified data is processed or stored (including by the AI provider), hosting/assessment obligations apply. Handling `PROTECTED` generally requires an **IRAP‑assessed** service in an approved (onshore) region. |
| **Queensland Government *Information Security Policy* IS18:2018** (QGEA) | The controlling Queensland policy. Requires agencies to operate an **ISMS aligned to ISO/IEC 27001**, apply the **Essential Eight**, classify information, and report annually. This feature must be assessable under the agency's ISMS. |
| **Queensland Government Information Security Classification Framework (QGISCF)** | Determines the classification/label of the data (see §3) and therefore the permitted handling, storage and transfer. Cabinet material carries the **Cabinet‑in‑Confidence** dissemination‑limiting marker. |
| **Information Privacy Act 2009 (Qld)** — Information Privacy Principles (IPPs) | Engaged where documents contain personal information (e.g. named officers, staffing/FTE detail). Note especially the **restriction on transferring personal information outside Australia** (IP Act s.33) — squarely relevant to an offshore AI endpoint. |
| **Public Records Act 2023 (Qld)** | Recordkeeping obligations — creation, retention and disposal of public records, including AI‑assisted derivations of official content. |
| **Right to Information Act 2009 (Qld)** | Documents and derived content may be subject to access requests; provenance and integrity matter. |
| **ISO/IEC 27001 / 27002** | The ISMS standard IS18 aligns to; the control catalogue for treating the risks below. |
| **OWASP Top 10 for LLM Applications (2025)** | Technical taxonomy for the AI‑specific risks: LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain, LLM05 Improper Output Handling, LLM09 Misinformation, LLM10 Unbounded Consumption. |
| **OWASP ASVS / Top 10 (web)** | Baseline for the web application surface (file upload, output handling, secrets). |

---

## 3. Data classification — the pivotal question

Before any control decisions, the agency must classify the data that will pass
through this feature. Based on the sample model, the realistic range is:

| Data element | Likely classification / marker |
|---|---|
| Pre‑release Budget / MYFER submission content, financial appropriations | **Cabinet‑in‑Confidence**, commonly handled at **`PROTECTED`** |
| Recommendations (Approve/Note) tied to Cabinet decisions | **Cabinet‑in‑Confidence** |
| Departmental descriptions, costings, FTE detail | **`OFFICIAL: Sensitive`** (or higher) |
| Personal information (named officers, staffing) | `OFFICIAL: Sensitive`; also **personal information** under the IP Act |

**Consequence:** if the data is `OFFICIAL: Sensitive` or above (very likely), then
sending it to a general‑purpose, unassessed, or offshore AI endpoint is **not
permitted** under IS18 / QGISCF / PSPF and, for personal information, may breach
the IP Act's cross‑border transfer restriction. This is the finding that should be
resolved *first* — it determines whether the external‑endpoint architecture is
viable at all, or whether an **IRAP‑assessed, onshore, no‑training/no‑retention**
inference service (or a self‑hosted model) is required.

---

## 4. Risk register

Ratings are qualitative (consistent with AS ISO 31000 / the Queensland risk
approach): **Likelihood × Consequence → Rating** (Low / Medium / High / Extreme).
Ratings assume a *real* deployment with sensitive data unless noted; a throwaway
POC on synthetic data lowers several of them.

### R1 — Egress of sensitive content to a third‑party / offshore AI endpoint
- **Description:** Document text is sent outside the agency's security boundary to an external model, potentially processed or stored offshore.
- **Threat/vuln:** Loss of data sovereignty; unauthorised disclosure of Cabinet‑in‑Confidence / `PROTECTED` material; breach of jurisdictional controls.
- **Consequence:** Severe (Cabinet confidentiality, political/legal). **Likelihood:** High if unmanaged. **Rating: Extreme.**
- **Standards:** ISM (data transfer, outsourced/cloud services), PSPF/HCF, IRAP, IS18, QGISCF, IP Act s.33, OWASP LLM02.
- **Controls:** Classify data first (§3). Restrict to an **IRAP‑assessed service in an approved onshore region** with contractual **no‑training / no‑retention / no‑human‑review** terms; or self‑host the model within the agency boundary. Enforce endpoint allow‑listing via env config; block arbitrary base URLs in production. Do not proceed with real data until the ISO signs off the endpoint.

### R2 — Third‑party retention or model‑training on inputs
- **Description:** The provider logs, retains, or trains on submitted prompts.
- **Threat/vuln:** Persistent secondary copies of sensitive government data outside agency control; later disclosure.
- **Consequence:** Severe. **Likelihood:** Medium. **Rating: High.**
- **Standards:** ISM (outsourced services), IS18, IP Act, PSPF.
- **Controls:** Enterprise agreement with zero‑retention and no‑training guarantees; verify data‑handling and residency in the contract; prefer providers with published IRAP assessment. Record the provider's assessed status in the ISMS.

### R3 — Indirect (document‑borne) prompt injection
- **Description:** An uploaded `.docx` contains adversarial text ("ignore previous instructions…", hidden white‑on‑white text, comments, metadata) that manipulates the model.
- **Threat/vuln:** Model produces attacker‑controlled field values, exfiltrates prior context, or subverts the extraction logic. (OWASP **LLM01**.)
- **Consequence:** Moderate–Severe (integrity of a government report). **Likelihood:** High (any user‑supplied document is untrusted). **Rating: High.**
- **Standards:** ASD *Engaging with AI*, OWASP LLM01/LLM05, ISM (input handling).
- **Controls:** Treat document text as **untrusted data, never as instructions**; use strict system/prompt separation and schema‑constrained output; the model may only emit values into a fixed JSON schema (no free‑form tool use). Strip document comments/metadata/hidden runs before sending. The **deterministic coercion layer** (snap to reference lists) and the **human validate/confirm step** are the primary mitigations — nothing reaches the report without review.

### R4 — Malicious file upload
- **Description:** `.docx` is a ZIP/OOXML container; risks include macro‑bearing documents, XML external entity (XXE) processing, zip‑bombs, and path traversal on extraction.
- **Threat/vuln:** RCE, SSRF/XXE, denial of service, filesystem escape.
- **Consequence:** Severe. **Likelihood:** Medium. **Rating: High.**
- **Standards:** Essential Eight (**Configure MS Office macro settings**, **User application hardening**, **Patch applications**), ISM (web app hardening), OWASP Top 10 (A03/A05).
- **Controls:** Enforce size limits and MIME/extension validation; parse with a library that does **not** execute macros and has XXE disabled (`mammoth` extracts content only — verify its XML parser hardening and version); never write attacker‑controlled paths; process in a sandboxed, least‑privilege worker; run antivirus/content scanning where the agency requires it; keep dependencies patched.

### R5 — Improper output handling → stored XSS
- **Description:** HTML produced by `mammoth` and/or the AI is stored and rendered in the app's rich‑text fields.
- **Threat/vuln:** Persistent cross‑site scripting; session/data compromise. (OWASP **LLM05**, web **A03**.)
- **Consequence:** Moderate–Severe. **Likelihood:** High without sanitisation. **Rating: High.**
- **Controls:** Server‑side **HTML sanitisation to a strict allow‑list** (only the tags the editor already supports: bold/italic/underline/strike, H1–H6, lists, tables, images), stripping scripts, event handlers, and unsafe URLs; enforce a Content Security Policy; treat AI output as untrusted.

### R6 — AI inaccuracy / hallucination corrupting financial data
- **Description:** The model mis‑extracts or fabricates figures (appropriations, FTEs, years), which are then inserted into an official budget report. (OWASP **LLM09**.)
- **Threat/vuln:** Integrity failure with real fiscal/decision consequences.
- **Consequence:** Severe (a wrong number in a budget report). **Likelihood:** Medium. **Rating: High.**
- **Standards:** ISM (integrity), records/RTI (reliability of official content), ASD AI guidance.
- **Controls:** **Mandatory human validate‑then‑confirm** step (already in the design) — nothing is committed unattended. Show source‑vs‑extracted side by side; flag low‑confidence and unmatched fields; require explicit confirmation of financial tables. Never auto‑apply. Record that content was AI‑assisted for provenance.

### R7 — Secret / API‑key management
- **Description:** The AI endpoint requires a credential.
- **Threat/vuln:** Key leakage → cost abuse, data access, impersonation.
- **Consequence:** Moderate–Severe. **Likelihood:** Medium. **Rating: Medium–High.**
- **Standards:** ISM (key management, system hardening), Essential Eight (restrict admin privileges).
- **Controls:** Keys **server‑side only**, never sent to the browser; store in a secrets manager / environment injection, not in source or images; rotate; scope minimally; never log the key.

### R8 — No authentication / accountability (current POC design)
- **Description:** The application intentionally has no login. Any user can upload, parse, and commit content.
- **Threat/vuln:** No access control, no attribution, no audit of who submitted/confirmed what.
- **Consequence:** Severe for sensitive data. **Likelihood:** High. **Rating: High** (for any non‑trivial deployment).
- **Standards:** ISM (identification & authentication, event logging), Essential Eight (**MFA**, **restrict admin privileges**), IS18, Public Records Act (accountability), IP Act (IPP 4).
- **Controls:** Before real use, add authentication/authorisation (agency SSO), **MFA**, per‑action audit logging (who uploaded, what was parsed, who confirmed), and role separation. Keep the no‑auth mode strictly for isolated synthetic‑data demos.

### R9 — Insufficient logging, auditability & recordkeeping
- **Description:** No tamper‑evident record of uploads, AI requests/responses, or confirmations.
- **Threat/vuln:** Cannot investigate incidents; cannot meet recordkeeping/RTI/privacy obligations.
- **Consequence:** Moderate. **Likelihood:** Medium. **Rating: Medium.**
- **Standards:** ISM (event logging & monitoring), Public Records Act 2023, RTI Act 2009, IP Act.
- **Controls:** Log upload metadata, model/endpoint used, and confirm events (avoid logging the sensitive payload itself, or protect it at the same classification); define retention/disposal per the agency's records authority; ensure logs are protected and reviewable.

### R10 — Availability / cost‑based denial of service
- **Description:** Large or repeated uploads drive unbounded model calls/cost. (OWASP **LLM10**.)
- **Consequence:** Moderate. **Likelihood:** Medium. **Rating: Medium.**
- **Controls:** Upload size/rate limits; per‑user/session quotas; document length caps before egress; cost alerting on the AI account; backpressure on the parse endpoint.

### R11 — Supply‑chain risk (new dependencies + provider)
- **Description:** New libraries (`mammoth`, AI SDK, `multer`) and the AI provider itself expand the trusted supply chain. (OWASP **LLM03**.)
- **Consequence:** Moderate–Severe. **Likelihood:** Medium. **Rating: Medium.**
- **Standards:** Essential Eight (**patch applications**), ISM (supply chain), *Guidelines for Secure AI System Development*.
- **Controls:** Pin and vet dependencies; enable vulnerability scanning (SCA) and Dependabot‑style alerts; review the provider's security posture and assessments; maintain an SBOM.

### R12 — Privacy of personal information
- **Description:** Documents may contain personal information (named officers, staffing detail) that is extracted and transmitted.
- **Threat/vuln:** Unauthorised collection/disclosure; unlawful cross‑border transfer.
- **Consequence:** Severe. **Likelihood:** Medium. **Rating: High.**
- **Standards:** Information Privacy Act 2009 (Qld) — IPP 2/4/11 and s.33 (transfer outside Australia).
- **Controls:** Conduct a **Privacy Impact Assessment**; minimise personal information sent to the model; keep processing onshore; obtain the required authority before any cross‑border transfer; apply data‑minimisation in the prompt.

---

## 5. Control summary mapped to the Essential Eight & ISM principles

| Essential Eight / ISM theme | Applied control in this feature |
|---|---|
| Configure MS Office macro settings / user application hardening | Macro‑free, XXE‑hardened extraction; content‑only parsing; sandboxed worker |
| Patch applications | Dependency pinning, SCA scanning, SBOM |
| Restrict administrative privileges | Least‑privilege parse worker; server‑side secrets only |
| Multi‑factor authentication | Required (with SSO) before any non‑demo deployment |
| Regular backups | Existing SQLite/Yjs persistence backed up per agency policy |
| ISM — *Protect* (data transfer, cryptography) | TLS in transit; egress allow‑listing; onshore/IRAP‑assessed endpoint; no‑retention terms |
| ISM — *Govern* (outsourced services) | Provider assessment recorded in ISMS; classification‑driven endpoint decision |
| ISM — *Detect* (event logging) | Upload/parse/confirm audit trail |
| ISM — *Respond* | Incident handling covers AI‑egress and data‑leak scenarios |

---

## 6. Gaps and required next steps before any real‑data use

1. **Classify the data** with the agency (§3) — this gates everything else.
2. **Do not send `OFFICIAL: Sensitive`+ or Cabinet‑in‑Confidence data to an
   unassessed/offshore endpoint.** Select an IRAP‑assessed, onshore, no‑training
   inference option or self‑host, and get **ISO sign‑off** on the endpoint.
3. **Privacy Impact Assessment** where personal information is in scope, including
   the s.33 cross‑border question.
4. **Add authentication, MFA and audit logging** before non‑demo use (R8/R9).
5. **Harden the ingestion path** — size/MIME limits, XXE‑disabled parsing,
   sandboxing, AV scanning (R4).
6. **Sanitise all AI/mammoth HTML** server‑side and set a CSP (R5).
7. **Keep the human validate/confirm step mandatory** — it is the core mitigation
   for prompt injection and hallucination (R3/R6).
8. **Record AI‑assisted provenance** on generated content for recordkeeping/RTI.
9. **Formal review** by the agency ISO/CISO and, for `PROTECTED`, an independent
   **IRAP** assessment.

---

## 7. Disclaimer

This assessment is provided to support secure design of a proof‑of‑concept. It is
not a certification, accreditation, or legal advice. Framework names, control
identifiers and versions (ASD ISM, Essential Eight, PSPF, IS18, QGISCF, the IP
Act, the Public Records Act, OWASP LLM Top 10) should be confirmed against their
current published editions, and the assessment should be reviewed and endorsed by
the sponsoring agency's information‑security and privacy functions before the
feature is used with real government data.
