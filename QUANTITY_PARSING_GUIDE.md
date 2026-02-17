# Quantity Field Parsing - Restrictions & Troubleshooting

## Current Behavior

The quantity parser (`_clean_count()` method) has specific restrictions and handling rules:

---

## ✅ What WORKS

| Value | Parsed As | Result |
|-------|-----------|--------|
| `5` | 5 | ✅ Device created x5 |
| `"5"` | 5 | ✅ Device created x5 |
| `5.0` | 5 | ✅ Device created x5 (decimal converted) |
| `05` | 5 | ✅ Leading zeros stripped |
| ` 5 ` | 5 | ✅ Whitespace trimmed |
| `1` | 1 | ✅ Single device |
| `999` | 999 | ✅ Large numbers work |

---

## ❌ What DOESN'T Work

| Value | Parsed As | Result | Issue |
|-------|-----------|--------|-------|
| Empty cell | 0 | ❌ Device NOT created | Quantity must be > 0 |
| `0` | 0 | ❌ Device NOT created | Quantity must be > 0 |
| `nan` | 0 | ❌ Device NOT created | Treated as null/missing |
| `NaN` | 0 | ❌ Device NOT created | Pandas NA value |
| `None` | 0 | ❌ Device NOT created | String representation of null |
| `-5` | 0 | ❌ Device NOT created | Negative converted to 0 |
| `null` | 0 | ❌ Device NOT created | Treated as null |
| `-` | 0 | ❌ Device NOT created | Placeholder string |
| `N/A` | 0 | ❌ Device NOT created | Missing value placeholder |

---

## ⚠️ EDGE CASES

| Value | Parsed As | Result | Issue |
|-------|-----------|--------|-------|
| `5.9` | 5 | ⚠️ Device x5 | Decimal TRUNCATED (not rounded) |
| `5.1` | 5 | ⚠️ Device x5 | Decimal TRUNCATED (not rounded) |
| `hello` | 0 | ❌ Device NOT created | Can't convert to number |
| `5 pcs` | 0 | ❌ Device NOT created | Units cause parse failure |
| `AC=5` | 0 | ❌ Device NOT created | Non-numeric prefix fails |

---

## 🔍 Restrictions in Detail

### 1. **Only Positive Integers**
- Restriction: Quantity must be > 0
- Why: Can't create 0 or negative devices
- Fix: Enter positive whole numbers

```
GOOD:  1, 5, 10, 100
BAD:   0, -5, null, empty
```

### 2. **No Decimal Precision**
- Restriction: Decimals are truncated (not rounded)
- Why: Can't create 2.5 devices
- Fix: If you need 2.5, enter as 2 or 3

```
GOOD:  5.0 → becomes 5
BAD:   5.9 → becomes 5 (not 6!)
      5.1 → becomes 5 (not 5!)
```

### 3. **No Unit Suffixes**
- Restriction: Can't include units like "5 pcs" or "5W"
- Why: Parser expects pure numbers
- Fix: Remove units from cell values

```
GOOD:  5
BAD:   5 pcs
       5 units
       5 items
       5W (watt values go in separate column)
```

### 4. **No Formulas/Complex Formatting**
- Restriction: Must be simple values
- Why: Excel formulas need evaluation
- Fix: Paste values (not formulas)

```
GOOD:  Simple number value: 5
BAD:   Formula: =SUM(A1:A5)
       Hidden decimal: 5.999999999
```

### 5. **Column Must Be Identified as Device-Type**
- Restriction: Header must indicate device type
- Why: Parser auto-detects columns like "AC", "Fan", "Light"
- Fix: Use standard device type names in header

```
GOOD:  "AC", "Fan", "Light", "Refrigerator", "Projector", "PC"
BAD:   "Cooling Unit", "Ventilation", "Illumination"
       "HVAC System", "Blower", "Bulb"
```

---

## 🛠️ How to Fix Common Issues

### Issue 1: "Quantity not parsing - getting 0 devices"

**Symptoms:**
- Excel has values like: 5, 10, 3
- But parser returns 0 devices
- Console shows: `raw_value=5, parsed_quantity=0`

**Causes & Fixes:**

```
Problem 1: Cell contains text "5" instead of number 5
Fix: Format column as Number in Excel

Problem 2: Cell has spaces: " 5 " or "5 "
Fix: Use TRIM() function: =TRIM(A1)

Problem 3: Cell has formula: =SUM(A1:A5)
Fix: Copy → Paste Special → Values Only

Problem 4: Cell shows 5 but stores "5.0000000001"
Fix: Round values: =ROUND(A1,0)

Problem 5: Column header not recognized (e.g., "Cooling Units")
Fix: Change header to "AC" (standard device type)
```

**Debug: Check Console Output**
```
[PARSER] Device column 'AC' (AC): raw_value=5, parsed_quantity=5 ✅
[PARSER] Device column 'AC' (AC): raw_value= , parsed_quantity=0 ❌
[PARSER] Device column 'AC' (AC): raw_value=none, parsed_quantity=0 ❌
```

### Issue 2: "Decimal quantities don't parse correctly"

**Symptoms:**
- Excel has: 5.5 (meaning 5.5 devices)
- Parser returns: 5 (truncated)

**Note:** Currently, decimals are TRUNCATED, not ROUNDED
- 5.9 → 5
- 5.1 → 5
- 5.5 → 5

**Fix Options:**

Option A: Manually round before uploading
```
Excel formula: =ROUND(A1, 0)
```

Option B: Request enhancement to support decimals
```
We could modify _clean_count() to:
- Use rounding instead of truncation
- Support fractional devices (5.5 = 2 devices each x2.75)
```

### Issue 3: "Column header not recognized"

**Symptoms:**
- Column header is "Cooling Units" or "AC Count"
- Parser doesn't recognize it as device column
- No devices created

**Cause:** Parser uses keyword matching for device detection

**Current Recognized Headers:**
```
AC, ACs, Air Conditioner, Air Conditioners, AC Count
FAN, Fans, COOLER, Coolers
LIGHT, Lights, LED, Bulbs
REFRIGERATOR, Fridges, Fridge, Freezer
PC, Computer, Computers, Laptop
PROJECTOR, Projectors
PRINTER, Printers
TV, Television, Televisions, Monitor
MICROWAVE, Microwaves
INDUCTION, Stove, Stoves, Cooktop, Induction Cooktop
WATER HEATER, Heater, Geysers, Geyser
PUMP, Pumps
```

**Fix:**
```
❌ "Cooling Equipment"  → ✅ "AC"
❌ "Ventilation Units"  → ✅ "Fan"
❌ "Illumination"       → ✅ "Light"
❌ "Cooling Appliance"  → ✅ "Refrigerator"
```

---

## 📋 Excel Format Checklist

Before uploading, verify:

- ✅ Column header is a recognized device type
- ✅ Quantity values are positive integers (1, 2, 3, etc.)
- ✅ No unit suffixes ("5" not "5 pcs")
- ✅ No empty cells in data rows (use 0 if no device)
- ✅ No negative numbers
- ✅ No formulas (paste values only)
- ✅ No special characters or extra whitespace
- ✅ Column type is Number/Integer

---

## 🔧 Potential Enhancements

Current limitations could be enhanced:

| Feature | Current | Requested |
|---------|---------|-----------|
| Negative numbers | Converted to 0 | Keep as 0 (or allow negative for tracking) |
| Decimals | Truncated | Round or support fractional devices |
| Unit suffixes | Rejected | Strip units automatically (e.g., "5 pcs" → 5) |
| Formula cells | Rejected | Evaluate formulas automatically |
| Zero values | Skipped | Allow tracking of "0 devices" |
| Empty cells | Treated as 0 | Distinguish between empty and "0" |

---

## 📊 Logging Output Reference

When you upload, check console for these messages:

**✅ Normal (working):**
```
[PARSER] Device column 'AC' (AC): raw_value=5, parsed_quantity=5
[PARSER] Creating device: AC x5 in Building-1/101
```

**⚠️ Warning (data skipped):**
```
[PARSER] Device column 'AC' (AC): raw_value= , parsed_quantity=0
[PARSER] Device column 'AC' (AC): raw_value=nan, parsed_quantity=0
[PARSER] Device column 'AC' (AC): raw_value=hello, parsed_quantity=0
```

**❌ Error (parsing failed):**
```
[PARSER] _clean_count error for '5 pcs': could not convert string to float
[PARSER] _clean_count error for 'AC=5': could not convert string to float
```

---

## 🎯 Best Practices

### ✅ DO:
- Use simple integer values: `5`, `10`, `1`
- Use recognized device headers: `AC`, `Fan`, `Light`
- Keep one device type per column
- Use Number format in Excel
- Test with small file first

### ❌ DON'T:
- Use decimals: `5.5` (will be truncated to 5)
- Add units: `5 pcs`, `5W` (will fail to parse)
- Use formulas: `=SUM(A1:A5)` (must paste values)
- Use custom headers: `Cooling Equipment` (won't be recognized)
- Leave empty cells: (treated as 0, device skipped)
- Use negative numbers: `-5` (converted to 0)

---

## 📝 Sample Correct Format

```
Building | Room | AC | Fan | Light | Refrigerator
---------|------|----|----|-------|---------------
Main     | 101  | 5  | 3  | 10    | 2
Main     | 102  | 2  | 0  | 5     | 1
Main     | 103  | 3  | 4  | 8     | 0
```

**Notes:**
- Quantities are simple positive integers
- 0 can be used (device won't be created)
- Column headers match recognized device types
- No units or suffixes

---

## 🆘 Still Having Issues?

If quantities still not parsing:

1. **Check console logs** for `[PARSER]` messages
2. **Verify column headers** match device type keywords
3. **Inspect Excel cells** - ensure they're formatted as Number
4. **Test with simple file** - one building, few devices
5. **Copy exact values** - paste from logs to test parsing

---

## 💡 Need Enhancement?

Current parsing is **conservative** to prevent data corruption. If you need:

- Decimal support (5.5 devices)
- Unit auto-stripping ("5 pcs" → 5)
- Formula evaluation
- Better error messages

We can enhance `_clean_count()` method. Request improvements anytime!
