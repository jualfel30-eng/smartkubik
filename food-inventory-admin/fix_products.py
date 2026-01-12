
import os

file_path = 'src/components/ProductsManagement.jsx'

# The clean content we want to insert
clean_content = """                              <Label className="flex items-center gap-1">
                                  Factor Conversión
                                  <span className="text-xs text-muted-foreground">(Cuántos {newProduct.unitOfMeasure} = 1 {unit.abbreviation || 'unidad'})</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  inputMode="decimal"
                                  placeholder={getPlaceholder('sellingUnitConversion', 'Ej: 1000')}
                                  value={
                                    unit.conversionFactorInput ??
                                    normalizeDecimalInput(unit.conversionFactor ?? '')
                                  }
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                      if (unitIndex !== index) {
                                        return currentUnit;
                                      }
                                      const parsed = parseDecimalInput(rawValue);
                                      return {
                                        ...currentUnit,
                                        conversionFactorInput: rawValue,
                                        conversionFactor: parsed !== null ? parsed : null,
                                      };
                                    });
                                    setNewProduct({ ...newProduct, sellingUnits: units });
                                  }}
                                  onBlur={() => {
                                    const units = newProduct.sellingUnits.map((currentUnit, unitIndex) => {
                                      if (unitIndex !== index) {
                                        return currentUnit;
                                      }
                                      const normalizedInput = normalizeDecimalInput(currentUnit.conversionFactorInput ?? '');
                                      const parsed = parseDecimalInput(normalizedInput);
                                      return {
                                        ...currentUnit,
                                        conversionFactorInput: normalizedInput,
                                        conversionFactor: parsed !== null ? parsed : null,
                                      };
                                    });
                                    setNewProduct({ ...newProduct, sellingUnits: units });
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  1 {unit.abbreviation || 'unidad'} = {parseDecimalInput(
                                    (unit.conversionFactorInput ?? unit.conversionFactor)
                                  ) ?? 0} {newProduct.unitOfMeasure}
                                </p>
                              </div>"""

# Read the file
with open(file_path, 'r') as f:
    lines = f.readlines()

# Define the start and end lines (1-indexed to 0-indexed)
# Users task says: lines 2710 to 2800 (inclusive) in the FILE (1-indexed).
# So in list (0-indexed), it's 2709 to 2800 (exclusive of 2800? No, 2801).
# Line 2710 (1-indexed) is index 2709.
# Line 2800 (1-indexed) is index 2799.
# We want to replace from index 2709 up to (and including) index 2800?
# The content replaced was lines 2709 (space-y-2) -> THIS WAS MY MISTAKE IN PREVIOUS THOUGHT.
# The `cat` output showed:
# 2709                              <div className="space-y-2">
# 2710                                <div className="flex items-center justify-between">
# ...
# 2790                                <p className="text-xs text-muted-foreground mt-1">
# ...
# 2800                                  </>
# 2801                                )}

# The Clean Content starts with `<Label...` and ends with `</div>`.
# Wait, the clean content replaces `div.flex`... up to `p` and `closing div`?
# My replacement chunk in clean_content is:
# Label ... Input ... p ... /div

# The original code structure (Inverse Mode):
# <div className="flex ..."> (Line 2710)
#   Label
#   Button
# </div>
# Input (Line 2746)
# p (Line 2790)
# closing div (Line 2709 is opening div "space-y-2").
# The "space-y-2" div closes... where?
# It seems the entire block is inside "space-y-2".
# So I should remove lines 2710 (div flex) all the way to...
# The closure of the `isInverse` logic.
# Line 2801 is `)}`.
# Line 2802 is `</p>`.
# Line 2803 is `</div>`. (This closes space-y-2, presumably).

# So I want to replace everything inside the `space-y-2` div.
# Start Line: 2710 (Index 2709).
# End Line: 2802 (Index 2801).
# Check line 2803 in cat output...
# I didn't verify 2803.
# But replacing 2710 -> 2802 makes sense.

# Let's adjust the indices safely.
start_idx = 2709
end_idx = 2802 # up to this index

# Insert the new content
# We need to ensure the indentation of the clean content matches.
# The provided clean_content string seems to have spaces.

# Replace
new_lines = lines[:start_idx] + [clean_content + '\n'] + lines[end_idx:]

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print(f"Replaced lines {start_idx+1} to {end_idx} with clean content.")
