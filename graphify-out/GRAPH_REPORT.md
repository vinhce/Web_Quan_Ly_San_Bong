# Graph Report - Quan_Ly_San_Bong  (2026-11-06)

## Corpus Check
- 6 files · ~19,098 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 52 nodes · 65 edges · 10 communities (6 shown, 4 thin omitted)
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- QUAN LY SAN BONG - ARCHITECTURE & CONVENTIONS
- QUAN LY SAN BONG - AGENTS INSTRUCTIONS
- heal-log.md
- getSlots
- data.js
- calculatePrice
- escapeHTML
- getAllBookings
- getPitches

## God Nodes (most connected - your core abstractions)
1. `getSlots()` - 6 edges
2. `calculatePrice()` - 6 edges
3. `getPitchById()` - 5 edges
4. `getAllBookings()` - 5 edges
5. `createBooking()` - 4 edges
6. `STATE OF QUAN LY SAN BONG` - 4 edges
7. `escapeHTML()` - 3 edges
8. `getPitches()` - 3 edges
9. `getTimeSlots()` - 3 edges
10. `getSlotsWithStatus()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `File đã tạo / sửa trong lần cuối` --references--> `getSlots()`  [INFERRED]
  .agents/memory/STATE.md → assets/js/app.js
- `File đã tạo / sửa trong lần cuối` --references--> `getSlotsWithStatus()`  [INFERRED]
  .agents/memory/STATE.md → assets/js/app.js

## Import Cycles
- None detected.

## Communities (10 total, 4 thin omitted)

### Community 0 - "QUAN LY SAN BONG - ARCHITECTURE & CONVENTIONS"
Cohesion: 0.50
Nodes (3): 1. TECH STACK & SYSTEM ARCHITECTURE, 2. DESIGN CONTRACT, QUAN LY SAN BONG - ARCHITECTURE & CONVENTIONS

### Community 3 - "getSlots"
Cohesion: 0.33
Nodes (6): Bước tiếp, File đã tạo / sửa trong lần cuối, STATE OF QUAN LY SAN BONG, Toàn bộ file dự án, getSlots(), getSlotsWithStatus()

### Community 4 - "data.js"
Cohesion: 0.17
Nodes (10): DEFAULT_BANK_INFO, DEFAULT_BOOKINGS, DEFAULT_EXTRA_SERVICES, DEFAULT_PITCHES, DEFAULT_TIME_SLOTS, DEFAULT_USER, DEFAULT_VOUCHERS, todayStr (+2 more)

### Community 6 - "calculatePrice"
Cohesion: 0.40
Nodes (6): calculatePrice(), createBooking(), getPitchById(), getServices(), getTimeSlots(), getVouchers()

### Community 7 - "escapeHTML"
Cohesion: 0.67
Nodes (3): escapeHTML(), renderNavbar(), statusPill()

### Community 8 - "getAllBookings"
Cohesion: 0.67
Nodes (3): getAllBookings(), getBookingByCode(), updateBookingStatus()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSlots()` connect `getSlots` to `getAllBookings`, `app.js`, `calculatePrice`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._