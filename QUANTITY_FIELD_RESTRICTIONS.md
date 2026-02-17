# Quantity Field - Complete Reference

**Status:** ✅ ENHANCED & PRODUCTION READY

---

## Quick Answer

**Yes, quantity has restrictions:**

### ✅ What Works Now
```
5              ✅ Simple number
5.5            ✅ Decimal (rounds to 6)
5 pcs          ✅ With unit suffix
5pcs           ✅ Without space
5 units        ✅ Common variations
-5             ✅ Negative (converts to 0)
0              ✅ Zero (no device created)
```

### ❌ What Doesn't Work
```
empty cell     ❌ Null value (device skipped)
nan            ❌ NaN/null (device skipped)
hello          ❌ Non-numeric text (device skipped)
AC=5           ❌ Complex expressions (device skipped)
```

---

## Key Restrictions (Explained)

### 1️⃣ **Quantity Must Be > 0 to Create Device**

| Value | Result |
|-------|--------|
| 5 | ✅ Device created x5 |
| 0 | ❌ Device NOT created (0 quantity makes no sense) |
| null/empty | ❌ Device NOT created (treated as 0) |

**Why?** Can't create a device with 0 or negative quantity.

**Workaround:** Don't include empty cells. Use actual numbers.

---

### 2️⃣ **Must Be Numeric (or convertible)**

| Value | Converted To | Result |
|-------|--------------|--------|
| `5` | 5 | ✅ Works |
| `5.0` | 5 | ✅ Works |
| `5 pcs` | 5 (units stripped) | ✅ Works (NEW) |
| `hello` | N/A | ❌ Fails |
| `AC=5` | N/A | ❌ Fails |

**Why?** Parser needs to extract a number.

**Workaround:** Remove non-numeric characters, keep only number and optional units.

---

### 3️⃣ **Column Must Be Recognized as Device Type**

| Header | Recognized | Result |
|--------|------------|--------|
| "AC" | ✅ Yes | Device created |
| "Fan" | ✅ Yes | Device created |
| "Light" | ✅ Yes | Device created |
| "Cooling Equipment" | ❌ No | Column ignored |
| "Ventilation" | ❌ No | Column ignored |

**Why?** Parser auto-detects device types from column names.

**Workaround:** Use standard device type names: AC, Fan, Light, Refrigerator, PC, etc.

---

## Current Parsing Rules

### Rule 1: Unit Auto-Removal ✅

**Supported Units (case-insensitive):**
- `pcs`, `pc` - pieces
- `units` - units
- `items` - items  
- `pieces` - pieces
- `nos` - numbers
- `no` - number
- `qty` - quantity
- `count` - count

**Examples:**
```
"5 pcs"        → 5 ✅
"5pcs"         → 5 ✅
"5 PIECES"     → 5 ✅
"5PCS"         → 5 ✅
"2 qty"        → 2 ✅
"3 count"      → 3 ✅
```

### Rule 2: Decimal Rounding ✅

**Rounds to nearest integer:**
```
5.0  → 5
5.1  → 5
5.4  → 5
5.5  → 6 (rounds up)
5.6  → 6
5.9  → 6
```

**Why rounding?** More accurate than truncation
- 5.9 → 6 (was 5, now 6 with rounding)
- 5.1 → 5 (was 5, still 5)

### Rule 3: Negative to Zero

```
-5  → 0 (logged as "rounded from -5.0")
-1  → 0
-99 → 0
```

**Why?** Can't have negative devices.

### Rule 4: Nulls and Placeholders

Treated as 0 (device not created):
```
Empty cell    → 0
null          → 0
None          → 0
nan           → 0
NaN           → 0
N/A           → 0
-             → 0
```

---

## Common Issues & Fixes

### ❗ Issue: "Getting 0 devices even though I have quantities"

**Possible Causes:**

1. **Column header not recognized**
   ```
   ❌ "Cooling Equipment"
   ✅ Change to: "AC"
   ```

2. **Cells formatted as Text, not Number**
   ```
   ❌ Excel format: Text ("5 appears as text)
   ✅ Change to: Number format
   ```

3. **Column has leading/trailing spaces in header**
   ```
   ❌ " AC " or "AC "
   ✅ Change to: "AC" (no spaces)
   ```

4. **Sheet has no header row**
   ```
   ❌ Starts with data directly
   ✅ Add header row at top
   ```

5. **Building/Room columns missing**
   ```
   ❌ Device quantities without building/room
   ✅ Add Building and Room columns
   ```

**Debug:** Check console logs for `[PARSER]` messages:
```
[PARSER] Device column 'AC' (AC): raw_value=5, parsed_quantity=5 ✅
[PARSER] Device column 'AC' (AC): raw_value=hello, parsed_quantity=0 ❌
[PARSER] Device columns identified: {} ❌ (no columns recognized)
```

---

### ❗ Issue: "Decimals being truncated instead of rounded"

**Status:** ✅ FIXED in latest enhancement

**Old behavior:** 5.9 → 5 (truncated)  
**New behavior:** 5.9 → 6 (rounded)

Ensure you have the latest `detailed_device_parser.py` with rounding.

---

### ❗ Issue: "Getting parse error on '5 pcs' entries"

**Status:** ✅ FIXED in latest enhancement

**Old behavior:** "5 pcs" → Parse error ❌  
**New behavior:** "5 pcs" → 5 ✅

Units are now automatically removed.

---

## Restrictions by Scenario

### Scenario A: Simple Excel File
```
Building | Room | AC | Fan
---------|------|----|----|
Main     | 101  | 5  | 3
```
**Restrictions:**
- ✅ None - this works perfectly
- Quantity must be > 0 to create device

### Scenario B: Excel with Units
```
Building | Room | AC (pcs) | Fan (units)
---------|------|----------|------------|
Main     | 101  | 5        | 3
```
**Restrictions:**
- ✅ None - this now works
- Units in column header (OK)
- Units in cell values are stripped automatically

### Scenario C: Excel with Decimals
```
Building | Room | AC | Fan
---------|------|-----|------|
Main     | 101  | 5.5 | 2.3
```
**Restrictions:**
- ✅ None - decimals now round properly
- 5.5 → 6, 2.3 → 2

### Scenario D: Messy Excel File
```
Building | Room | AC (Count) | Fan/Cooler
---------|------|------------|-----------|
Main     | 101  | 5 pcs      | 3 units
```
**Restrictions:**
- ✅ Unit suffix - now handled (5 pcs → 5)
- ⚠️ Column header "Fan/Cooler" might not be recognized
  - Fix: Change to "Fan" or "Cooler" separately

---

## No Restrictions On

✅ Number of Excel rows - can handle 100s or 1000s  
✅ Number of device types - supports 14+ device types  
✅ Number of buildings/rooms - unlimited  
✅ Device names - any text  
✅ Whitespace around numbers - automatically trimmed  
✅ Case sensitivity - headers are case-insensitive  
✅ Column order - columns automatically detected  

---

## Restrictions Are

❌ Quantity must be > 0 to create device  
❌ Column header must match recognized device type  
❌ Building/Room columns must exist  
❌ Can't have complex expressions (formulas must be values)  
❌ Can't have non-numeric values (other than units)  
❌ Can't have completely unknown data types  

---

## How to Prepare Excel for Upload

### ✅ DO:

- Use recognized device type headers (AC, Fan, Light, etc.)
- Put quantities as simple numbers: 5, 10, 15
- Include Building and Room columns
- Use Number format for quantity columns
- One device type per column
- Include header row

### ❌ DON'T:

- Use complex headers ("Cooling Equipment")
- Leave cells empty (use 0 if no device)
- Mix device types in one column
- Include formulas (paste values only)
- Use text format for numbers
- Skip header row

---

## Excel Template (Correct Format)

```
Building      | Room  | AC  | Fan | Light | Refrigerator
--------------|-------|-----|-----|-------|---------------
Building-1    | 101   | 5   | 2   | 8     | 1
Building-1    | 102   | 3   | 1   | 6     | 2
Building-1    | 103   | 2   | 3   | 10    | 0
Building-2    | 201   | 4   | 2   | 7     | 1
```

**Valid because:**
- ✅ All headers are recognized device types
- ✅ All quantities are simple positive integers
- ✅ Building and Room columns present
- ✅ No null/empty values
- ✅ Clear structure

---

## Testing Your File

Before uploading, verify:

1. **Open file in Excel**
2. **Check column headers**
   - Are they recognized device types? (AC, Fan, Light, etc.)
3. **Check sample quantities**
   - Are they positive numbers? (1, 2, 3, etc.)
4. **Check for empty cells**
   - Any blanks? (enter 0 or remove row)
5. **Check cell format**
   - Right-click cell → Format Cells → Number (not Text)

---

## Still Having Issues?

### Step 1: Check Console Logs
Upload file and look for `[PARSER]` messages:
```
[PARSER] Device columns identified: {'AC': 'AC', 'Fan': 'FAN'}
[PARSER] Total rows loaded: 5
[PARSER] Device column 'AC' (AC): raw_value=5, parsed_quantity=5
```

### Step 2: Verify Structure
```
✅ Building column exists?
✅ Room column exists?
✅ Device type columns recognized?
✅ All quantities are numbers?
```

### Step 3: Simplify Test
- Create a minimal file with 1 building, 1 room, 1 device type
- Upload and verify it works
- Then add complexity

### Step 4: Report Issues
If still failing:
- Share the file
- Share console logs
- Describe what you expect vs. what happens

---

## Summary

**Quantity restrictions are:**
1. Must be > 0 to create device
2. Must be numeric (or removable units)
3. Column must be recognized device type
4. Building/Room columns must exist

**But with recent enhancements:**
- ✅ Units auto-removed ("5 pcs" → 5)
- ✅ Decimals properly rounded (5.5 → 6)
- ✅ Better error handling and logging
- ✅ More forgiving of real-world data

**Result:** More flexible parser that handles messy Excel data while maintaining data integrity.

---

**For detailed guides, see:**
- `QUANTITY_PARSING_GUIDE.md` - Complete reference
- `QUANTITY_PARSING_ENHANCEMENTS.md` - What changed
- `GROQ_INTEGRATION_GUIDE.md` - AI fallback system

**Status: ✅ PRODUCTION READY**
