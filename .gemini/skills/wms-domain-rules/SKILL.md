---
name: wms-domain-rules
description: Use when implementing or changing any WareTrack business logic - GRN, sticker printing, inward/putaway mapping, FIFO outward issue, location transfer, void/undo, stock quantities, bin capacity, movement log, or master data rules (material, location, employee, user, roles).
---

# WareTrack domain rules

Source of truth: the prototype at docs/reference/waretrack-prototype.html. Full tables are in
`references/prototype-analysis.md`. Read it before designing entities or use cases.

## Flow
SAP GRN line (Open) -> Print sticker (Printed) -> Map to bin(s) (Partial | Inwarded)
-> Give out FIFO / Transfer / Void. Every change writes a StockMovement.

## Invariants (enforce in the Domain layer, not in controllers)
1. Stock quantity changes only via a StockMovement. Never update a quantity column directly.
2. Quantity is a whole number > 0.
3. Bin used quantity never exceeds Location.Capacity. Free = Capacity - Used.
4. Inward: sticker exists, status is not Open, pending > 0, qty <= pending, qty <= bin free, bin exists.
5. FIFO outward: per material, the stock record with the oldest InwardAt goes first. Reject otherwise.
6. Transfer keeps the original InwardAt (FIFO date). Destination differs from source and has room.
7. Same sticker + same bin merges into one record and keeps the OLDEST InwardAt.
8. Void inward only if the stock is still in that bin (not issued or moved). Reduces mapped qty, reason required.
9. Undo outward needs free space in the original bin and restores the ORIGINAL InwardAt. Reason required.
10. Deactivating an employee locks their users. A user cannot be unlocked while the employee is inactive.
11. Movement log is append-only. Voids are new rows (DEL-IN, UNDO-OUT) and flag the original as void.

## Domain pieces to model
GrnLine, StockRecord, StockMovement, Material, Location, Employee, AppUser, Role.
Domain services: FifoPolicy, PutawaySuggester (same zone, has room, prefer a bin already holding the material).

## Do not
- Put these rules in the Angular app only. The API is the authority; Angular mirrors them for UX.
- Silently fix the gaps listed at the end of references/prototype-analysis.md. Ask first.
