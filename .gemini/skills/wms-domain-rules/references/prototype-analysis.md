# Prototype analysis (WareTrack WMS - GRN to FIFO)

## Screens (sidebar)
Overview: Dashboard | Masters: Material, Location, Employee, User and role |
Transactions: GRN and Sticker, Inward and Putaway, Outward FIFO, Location Transfer | Reports: All Reports (5 tabs)

## Entities
| Entity | Fields |
|---|---|
| Material | code, name, uom, zone (putaway zone) |
| Location | code (A-01-01), zone, capacity |
| GrnLine (from SAP) | id, po, vendor, date, material, qty, batch, status, mapped, stickerCode |
| StockRecord | stickerCode, material, batch, qty, location, inwardAt (FIFO date) |
| StockMovement | id, time, type, stickerCode, material, qty, location, batch, inwardAt?, note, void |
| Employee | id (E001), name, department, designation, phone, active |
| AppUser | username, employeeId, role, active, lastLogin |

Movement types: IN, OUT, MOVE, DEL-IN, UNDO-OUT. Roles: Admin, Store Keeper, Operator, Viewer.
Departments: Stores, Dispatch, Quality, Purchase, IT. Transfer reasons: Stock consolidation, Bin full or damaged,
Wrong bin earlier, Reorganising zone, Other. Void reasons: Wrong sticker scanned, Wrong location, Wrong quantity,
Entered by mistake, Other.

## GRN status machine
Open -> Printed (first print) -> Partial (some qty mapped) -> Inwarded (pending = 0).
Void inward moves back to Partial (mapped > 0) or Printed (mapped = 0).
Pending = qty - mapped. "Awaiting inward" KPI = lines not Open with pending > 0.

## Use cases
| Use case | Key checks | Writes |
|---|---|---|
| FetchGrnFromSap | idempotent by GRN id | GrnLine (status Open, stickerCode) |
| PrintSticker / Reprint | line exists | status Open -> Printed |
| MapToLocation (inward) | rule 4 | StockRecord merge, mapped += qty, IN movement |
| GiveOut | rule 5, qty <= record qty | qty -= q (delete at 0), OUT movement with inwardAt |
| TransferStock | rule 6 + free space | source -= q, destination merge keeping inwardAt, MOVE movement + reason |
| VoidInward | rule 8 | stock -= qty, mapped -= qty, DEL-IN movement, original void=true |
| UndoGiveOut | rule 9 | restore record with original inwardAt, UNDO-OUT movement, original void=true |
| Masters CRUD | unique codes / usernames | Material, Location, Employee, User |
| Reports | read only | Stock summary, FIFO ageing, Location utilisation, Movement log, GRN status |

## Dashboard numbers
Stickers in stock, qty on hand, awaiting inward, given out (qty and count), pipeline strip (GRN lines, printed,
pending, in stock, given out), stock-by-material donut, bin heat map (green <60%, amber 60-89%, red >=90%),
last 6 movements, next FIFO pick per material (age chip: green <=14d, amber 15-30d, red >30d).

## Role matrix (from prototype)
| Role | Master | GRN and sticker | Inward | Outward | Reports |
|---|---|---|---|---|---|
| Admin | Edit | Yes | Yes | Yes | Yes |
| Store Keeper | View | Yes | Yes | Yes | Yes |
| Operator | No | No | Yes | Yes | No |
| Viewer | View | No | No | No | Yes |

## Prototype gaps - ASK the owner, do not decide silently
1. Location Transfer is missing from the role matrix. Which roles may transfer?
2. Dashboard shows the "Fetch GRN from SAP" quick action to roles without GRN access (Operator, Viewer).
3. stickerCode is 'STK-' + last 5 digits of GRN + '1' -> can collide. Use a DB sequence or GUID-based code.
4. Fetch from SAP overwrites the local GRN list (loses mapped/status). Real version must upsert by GRN id.
5. Merged stock keeps the oldest date; confirm this is intended for partial re-maps.
6. No concurrency control (two users issuing the same stock). Backend needs transactions + row version.
7. No real auth and no audit user on movements. Add UserId to StockMovement.
8. Posting goods issue / transfers back to SAP is not in the prototype. Confirm scope.
9. Void inward is blocked if stock moved or issued, but a partially moved quantity has no rule. Confirm.
