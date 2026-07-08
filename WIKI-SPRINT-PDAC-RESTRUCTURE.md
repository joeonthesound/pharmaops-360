# WIKI Sprint PDAC Restructure

## FORM_ID: FOR-PDAC-REV

This document is the active engineering radiography contract for the PharmaOps 360 asset review screen tied to `FORM_ID: FOR-PDAC-REV`.

It defines the non-negotiable layout, metadata, audit trail, tooltip, attachment, and GxP lifecycle badge rules for the inspection pilot stage 2/3. The screen must preserve ALCOA+ traceability, FDA 21 CFR Part 11 auditability, and usability on industrial terminals.

## 1. Screen Identity And Validation Context

The reviewed screen is the HVAC asset review and immutable maintenance history view.

Canonical identifiers:

- `FORM_ID: FOR-PDAC-REV`
- `SCREEN_ID: SCREEN-ACT-REV-01`
- User-facing route family: `/activos/hvac/ver`
- Dynamic asset detail route: `/activos/hvac/ver/[id]`
- Primary data source: Supabase-backed asset and maintenance record datasets
- Regulatory purpose: review of asset technical profile, qualification status, evidence, and immutable RUI / WO audit trail

The screen must prioritize human-readable operational identifiers. Asset tags such as `HVAC-01` are preferred in the user interface. Raw database UUIDs, cryptographic hashes, or UUID slices must not be used as primary visual identifiers in the metadata stamp.

## 2. Header Metadata Stamp

The upper-right metadata badge cluster must render strict uppercase, compact, `font-mono` style tokens.

Required tokens:

- `FORM_ID: FOR-PDAC-REV`
- `SCREEN_ID: SCREEN-ACT-REV-01`
- `OPERATOR_ID: <ACTIVE_SESSION_KEY>`
- `EXPEDIENTE: <HUMAN_ASSET_TAG>`

Rules:

- `FORM_ID` must identify the approved base form in the validation software plan.
- `SCREEN_ID` must identify the validated screen surface.
- `OPERATOR_ID` must use the active session key, user id, or email available from the authenticated session.
- `EXPEDIENTE` must render the human asset tag physically tied to the equipment, for example `HVAC-01`.
- `EXPEDIENTE` must not display raw UUID strings or cryptographic hashes.
- Metadata badges must be visually distinct from body content and must remain readable on desktop and industrial touch terminals.

## 3. Search Redirection Terminal

The `/activos/hvac/ver` search terminal must accept human-readable asset identifiers.

Required behavior:

1. The operator enters a human-readable `codigo` or `tag`, such as `HVAC-01`.
2. The app queries Supabase by the human asset code / tag column.
3. The app retrieves the underlying UUID invisibly.
4. The router pushes to the UUID-backed dynamic detail route.
5. The final detail screen continues to display the human asset tag in the metadata stamp.

Forbidden behavior:

- Requiring operators to search by UUID.
- Showing raw UUIDs as the `EXPEDIENTE` value.
- Exposing internal lookup mechanics as user-facing text.

## 4. Full-Width Layout Contract

The outer container must preserve the following layout constraint:

```tsx
w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6
```

The screen is organized into four vertical layers:

1. Header metadata and screen title.
2. Active validation / conformity banner.
3. Main asymmetric 3-column grid.
4. Immutable audit trail log.

No implementation may reduce the working canvas into a narrow centered dashboard if doing so causes unnecessary vertical scrolling on inspection terminals.

## 5. Upper Validation Banner

The upper validation banner is the high-impact conformity block.

Required semantics:

- Active state text: `Activo y Cualificado | Control GxP`
- Visual tone: green / emerald high-contrast validation styling
- Purpose: indicate that the asset is qualified for controlled pharmaceutical operations when validation data and lifecycle status support it

The banner may include:

- Current qualification state, such as `Activo y Cualificado`
- UTC synchronization timestamp
- Validation type, such as `Validacion Automatica`

The banner must not use vague marketing language. It must read as a regulated operational status component.

## 6. Main Asymmetric 3-Column Grid

The middle layer must preserve this exact structural split:

```tsx
grid grid-cols-1 lg:grid-cols-12 gap-6 items-start
```

Required desktop distribution:

- Column 1: `lg:col-span-3`
- Column 2: `lg:col-span-6`
- Column 3: `lg:col-span-3`

This is the validated 3 / 6 / 3 asymmetric matrix. It must not be replaced with equal-width cards.

## 7. Column 1: Imagen Del Activo

Column contract:

- Grid span: `lg:col-span-3`
- Section title: `Imagen del Activo`
- Visual identity: slate border top, `border-t-4`
- Function: render the master asset image for visual inspection
- Interaction: clicking the image opens a full-screen Radix UI Dialog modal

Dialog requirements:

- The image trigger must be obvious and accessible.
- The modal must allow inspection of equipment details, physical labels, and calibration plates.
- The modal must not degrade the asset image into a decorative thumbnail only.

Forbidden:

- Replacing the modal with a slider.
- Hiding the image behind a marketing-style hero.
- Using a generic placeholder when a real asset image exists.

## 8. Column 2: Ficha Tecnica Avanzada

Column contract:

- Grid span: `lg:col-span-6`
- Section title: `Ficha Técnica Avanzada`
- Visual identity: indigo border top, `border-t-4`
- Function: provide the static engineering and asset identity profile

The section must use internal Radix UI Tabs with exactly these conceptual groups:

- `Datos Generales`
- `Límites GxP`
- `Registro Fábrica`

Expected field grouping:

### Datos Generales

- Asset ID / asset code
- Asset description
- Physical plant location
- Site / area

### Limites GxP

- Asset type
- GxP criticality
- Validated maintenance frequency
- Operational classification

### Registro Fabrica

- Manufacturer
- Model
- Serial number
- Capacity and unit when available

Text rules:

- Field values must remain compact.
- Each field should be constrained to a maximum of two visual lines.
- Long values should truncate or wrap cleanly without breaking the layout.
- Sliders are forbidden in this screen and in these tabs.

## 9. Column 3: Perfil Regular

Column contract:

- Grid span: `lg:col-span-3`
- Section title: `Perfil Regular`
- Visual identity: amber border top, `border-t-4`
- Mode: absolute read-only input mode

Required read-only fields:

- `PRESSURE SETPOINT`
- `ACH THRESHOLD`
- `CALIBRATION`

Purpose:

- Expose critical environmental design and control parameters.
- Prevent accidental editing in the review context.
- Support GxP inspection readability.

Forbidden:

- Editable controls.
- Sliders.
- Inline tooltip clutter inside individual read-only values.

## 10. Operational KPI Cluster

The KPI cluster sits immediately above the immutable audit trail.

Conceptual metrics:

- `MTBF`
- `Ciclo de Vida de Calibración`
- `Delta de Fallas Operacionales`

Expected meanings:

- `MTBF`: mean time between failures, calculated from real historical maintenance intervals and technical deviations.
- `Ciclo de Vida de Calibración`: percentage-style progress indicator based on elapsed time against calibration validity.
- `Delta de Fallas Operacionales`: high-visibility block chart contrasting approved reports against rejected / deviation records.

Tooltip allowance:

- Tooltips are allowed on these conceptual metric headers.
- Tooltips are not allowed inside metric values, row values, or output badges.

## 11. Immutable Audit Trail Log

The lower layer is the `Historial Inmutable de Cambios del Activo`.

Purpose:

- Render a chronological immutable log of WO and RUI records linked to the asset.
- Preserve traceability of inspection and maintenance events.
- Support direct inspection access through `Ver Reporte`.

Required table columns:

- `Timestamp (UTC)`
- `Acción Ejecutada`
- `RUI / WO Dominante`
- `Estado Regulatorio`
- `Adjuntos`
- `Operaciones`

The table may preserve a responsive card-like row presentation on smaller viewports, but the desktop grid must preserve the validated asymmetric column width contract.

## 12. Tooltip Governance

Tooltips are strictly limited to conceptual section headers and table column headers.

Allowed tooltip locations:

- `Historial Inmutable de Cambios del Activo` section header
- KPI conceptual headers such as `MTBF`, `Ciclo de Vida de Calibración`, and `Delta de Fallas Operacionales`
- Table column headers:
  - `Acción Ejecutada`
  - `Estado Regulatorio`
  - `Operaciones`
  - Other true column headers when needed for regulatory clarity

Forbidden tooltip locations:

- Table row cells
- Badge values
- Attachment counters
- Text outputs
- Read-only field values
- Repeated row lists

Each eligible header cell must have exactly one Radix UI Tooltip provider / trigger path. Duplicate tooltip triggers in a single header cell are forbidden.

## 13. Table Header Tooltip Messages

The audit trail header tooltips must use these strict meanings.

### Accion Ejecutada

Header label:

```text
Acción Ejecutada
```

Tooltip message:

```text
Tipo de evento técnico o firma electrónica registrada en el Audit Trail bajo la norma FDA 21 CFR Part 11.
```

### Estado Regulatorio

Header label:

```text
Estado Regulatorio
```

Tooltip message:

```text
Representa la fase actual del flujo de revisión humana y aprobación electrónica del reporte (Técnico -> Supervisor -> Calidad).
```

### Operaciones

Header label:

```text
Operaciones
```

Tooltip message:

```text
Apertura del expediente completo en pantalla para la inspección y verificación visual de evidencias.
```

## 14. Accion Ejecutada Badge Contract

`Acción Ejecutada` maps raw database audit events.

Accepted event labels:

- `Insert`
- `Update`
- `Inactivate` only where legacy or deactivation events are explicitly present

Required chromatic mapping:

- `Insert`: emerald / green badge
- `Update`: indigo or blue badge
- `Inactivate`: orange or destructive-adjacent warning badge when applicable

Meaning:

- `Insert`: birth of the record. The field technician initialized and saved the RUI for the first time.
- `Update`: modification or change-control event. Notes, corrections, intermediate signatures, or lifecycle transitions were appended without overwriting history.

Immutable audit principle:

- `Update` events must never imply that previous states were overwritten.
- They represent chronological layers added to the audit trail.

## 15. Estado Regulatorio Badge Contract

`Estado Regulatorio` maps the human GxP signature lifecycle.

Required lifecycle states:

| Estado GxP | Color Identity | Regulatory Meaning |
| --- | --- | --- |
| `FIRMADO - TÉCNICO` | Slate / gray | Technician completed maintenance and uploaded field evidence. The record is closed for operator editing and awaits hierarchical review. |
| `REVISADO - SUPERVISOR` | Indigo / blue | Technical supervisor validated measurements and inspection consistency against operational ranges. |
| `APROBADO - CALIDAD` | Emerald / green | Quality Assurance completed final validation. The record becomes definitively locked and immutable for audit purposes. |
| `RECHAZADO - DESVIACIÓN` | Crimson / red | The report contains errors, contradictions, or critical evidence failures. Formal deviation handling and a new version are required. |

Mapping rules:

- Draft or field-completed technician states resolve to `FIRMADO - TÉCNICO`.
- Supervisor-signed or pending-quality states resolve to `REVISADO - SUPERVISOR`.
- Quality-signed, approved, closed, or final immutable states resolve to `APROBADO - CALIDAD`.
- Rejected, NOK, rejection-comment, or deviation states resolve to `RECHAZADO - DESVIACIÓN`.

Forbidden:

- Static labels such as `Documento Activo` in the regulatory status column.
- Ambiguous lifecycle text that does not map to the signature flow.
- Low-contrast color combinations.

## 16. Adjuntos Data Integrity Contract

The `Adjuntos` counter must compute the real mathematical array length of media evidence bound to the specific inspection row.

Required source:

- `public.mantenimientos_registros`
- Evidence / media rows associated with the target maintenance record
- The row-specific evidence array hydrated by the server action

Required behavior:

- The UI displays the exact count from the bound evidence array.
- Example logic: `imagenes_evidencia.length`
- Static fillers such as hardcoded `4 Adjuntos` are forbidden unless the actual array length is 4.
- The count must remain tied to the inspected RUI / WO row, not a global asset-level media total.

Validation example:

- For a target row such as `WO-HVAC-01-CORRECTED-21`, the counter must reflect the exact array length returned for that row from Supabase.

## 17. RUI / WO Dominante Contract

The `RUI / WO Dominante` column must prioritize the operational record code.

Expected values:

- RUI codes
- WO codes
- Human-readable dominant inspection or work order identifiers

Rules:

- The record code may be visually emphasized.
- Supporting UUIDs may be used internally for routing and data integrity.
- Raw UUIDs must not replace the dominant human-readable code as the principal visual identifier.

## 18. Operations Column Contract

The `Operaciones` column provides direct access to the complete inspection file.

Required control:

- Button or link label: `Ver Reporte`
- Purpose: open the full RUI / WO inspection record for evidence verification

Tooltip:

- Exactly one tooltip is permitted on the `Operaciones` column header.
- No tooltip is permitted on each row button.

## 19. Accessibility And Visual Discipline

General UI rules:

- Use high-contrast industrial colors.
- Avoid decorative visual noise.
- Preserve readable typography on desktop and terminal-style devices.
- Do not overload row cells with repeated icons and tooltips.
- Keep table headers semantically clear.
- Keep badges compact and legible.

No visible instructional copy should describe how to use ordinary controls when the control is already clear.

## 20. Type Safety And Verification

Before proposing completed code outputs after changes to this screen, the following command must pass with zero type errors:

```bash
npm run typecheck
```

Expected result:

```text
tsc --noEmit
```

The typecheck may update local incremental compiler artifacts, but those artifacts should not be included as intentional documentation or UI changes unless explicitly requested.

## 21. Current Implementation Guardrails

Files currently associated with this contract:

- `src/app/(app)/activos/hvac/ver/[id]/page.tsx`
- `src/app/(app)/activos/hvac/ver/[id]/section-info-tooltip.tsx`
- `src/app/(app)/activos/hvac/ver/[id]/asset-image-dialog.tsx`
- `src/app/(app)/activos/hvac/ver/[id]/technical-ficha-tabs.tsx`
- `src/modules/activos/actions/get-activo-detalle.ts`

Known preserved implementation points:

- The main desktop audit grid preserves `grid-cols-[1fr_130px_1.25fr_1fr_150px_130px]`.
- The main layout preserves the 3 / 6 / 3 asymmetric screen split.
- `TechnicalFichaTabs` remains the internal tab mechanism for the technical profile.
- `AssetImageDialog` remains the image inspection modal mechanism.
- Attachment counts remain data-driven from the evidence array length.
- Tooltip cleanup eliminates duplicate `Action` / `Badge` and `Action` / `Button` header fragments.

## 22. Non-Regression Checklist

Before merging further FOR-PDAC-REV work, confirm:

- `FORM_ID: FOR-PDAC-REV` is visible in the metadata stamp.
- `SCREEN_ID: SCREEN-ACT-REV-01` is visible in the metadata stamp.
- `OPERATOR_ID` is populated from active session data.
- `EXPEDIENTE` shows the human asset tag.
- No raw UUID is displayed as the primary expediente identifier.
- The outer shell uses `w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6`.
- The middle grid uses `grid grid-cols-1 lg:grid-cols-12 gap-6 items-start`.
- Column 1 is `lg:col-span-3`.
- Column 2 is `lg:col-span-6`.
- Column 3 is `lg:col-span-3`.
- No sliders are present.
- Tooltips are absent from row cells and output badges.
- Header cells do not contain duplicate tooltip triggers.
- `Acción Ejecutada` maps `Insert` and `Update` from raw events.
- `Estado Regulatorio` maps the signature lifecycle.
- `Adjuntos` uses row-specific evidence array length.
- `npm run typecheck` passes cleanly.
