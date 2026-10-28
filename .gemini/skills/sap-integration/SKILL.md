---
name: sap-integration
description: Use when implementing or changing the integration that fetches goods receipt (GRN) data from SAP, including the OData client, mapping to GrnLine, idempotent sync, authentication, errors, and a fake SAP client for development and tests.
---

# SAP GRN integration

Prototype endpoint (demo): GET /sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem

## Rules
- Application defines `ISapGrnClient.FetchGoodsReceiptsAsync(since, ct)`; Infrastructure implements it.
- Build a `FakeSapGrnClient` first returning the 5 sample lines from the prototype (GRN 5000101..5000105,
  POs 4500012..4500016, materials M100/M200/M300/M400/M100). Switch via configuration.
- Sync is idempotent: upsert by GRN id. Never reset mapped qty or status of an existing line.
- Map only: GRN id, PO, vendor, posting date, material code, qty, batch.
- Unknown material code -> reject that line, continue with the rest, return a summary.
- Timeouts, retry with backoff, typed error ("SAP unavailable") for the UI. No secrets in code.
- Confirm the real SAP service name and fields with the SAP team before writing the real client. Ask the owner.
