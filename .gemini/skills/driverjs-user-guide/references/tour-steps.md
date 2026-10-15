# Planned tours (derived from the prototype). Keys go in data-tour="..."

## 1. app-welcome (Dashboard, first login)
| key | Title | Says |
|---|---|---|
| nav-masters | Masters | Set up materials, bins, staff and users first |
| nav-transactions | Transactions | Daily work: GRN, inward, outward, transfer |
| nav-reports | Reports | Stock, FIFO ageing, utilisation, movement log |
| top-user | Your profile | Your role decides which screens you see |
| dash-quick-actions | Quick actions | Jump straight into the four main jobs |
| dash-kpis | Key numbers | Stock in bins, quantity, pending inward, issued |
| dash-pipeline | Flow strip | Where stock is between GRN and issue |
| dash-heatmap | Bin heat map | Green is free, amber filling up, red nearly full |
| dash-next-fifo | Next FIFO picks | Oldest stock per material: issue this first |

## 2. grn-sticker
grn-fetch (pull receipts from SAP) -> grn-table -> grn-status (Open / Printed / Partial / Inwarded) ->
grn-print (print the sticker and paste it on the product).

## 3. inward-putaway
inward-map-btn -> inward-pending-table (suggested bin) -> [modal] scan-field -> location-field (suggested, can
change) -> qty-field (map part now, rest to another bin) -> confirm-btn -> inward-recent (Delete = void with reason).

## 4. outward-fifo
outward-table (row tagged "Next" is the one to take) -> outward-give-btn -> [modal] fifo-banner (green = OK,
red = older stock exists and says which sticker/bin) -> outward-recent (Undo restores the original FIFO date).

## 5. transfer
transfer-table -> transfer-change-btn -> [modal] to-location -> reason-select. FIFO date is kept.

## 6. reports
report-tabs, then one step per tab: stock summary, FIFO ageing, location utilisation, movement log, GRN status.

## 7. masters
material-zone (zone drives suggested bin) -> location-capacity -> employee-table -> user-create (users come from
active employees) -> role-matrix.

## Role visibility
Operator: tour 1 (without masters/reports steps), 3, 4. Viewer: tours 1, 6. Store Keeper: all except master editing.
Admin: all. (Transfer access is an open question, see wms-domain-rules gaps.)
