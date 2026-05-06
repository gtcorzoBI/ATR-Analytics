
function testFiltering() {
    const fieldName = "AGENCIA_RESPONSABLE_INTERESES";
    const row = {
        "Agencia_Responsable_Intereses > no._de_vin": "ASIGNADA A (N491) > 1FMCU0JZ9RUA45051"
    };

    const fnLower = fieldName.toLowerCase().trim();
    const keys = Object.keys(row);
    
    console.log("Field Name:", fieldName);
    console.log("Row Keys:", keys);
    
    // Exact match
    const exactMatch = keys.find(k => k.toLowerCase().trim() === fnLower);
    console.log("Exact Match:", exactMatch);
    
    // Prefix match (the one I implemented)
    const prefixMatch = keys.find(k => {
        const kLower = k.toLowerCase().trim();
        return kLower.startsWith(fnLower + " ") || kLower.startsWith(fnLower + ">") || kLower.startsWith(fnLower + ".");
    });
    console.log("Prefix Match (old):", prefixMatch);

    // Improved prefix match
    const improvedPrefixMatch = keys.find(k => {
        const kLower = k.toLowerCase().trim();
        return kLower.startsWith(fnLower) && 
               (kLower.length === fnLower.length || !/^[a-z0-9_]/i.test(kLower[fnLower.length]));
    });
    console.log("Prefix Match (improved):", improvedPrefixMatch);

    const val = improvedPrefixMatch ? row[improvedPrefixMatch] : undefined;
    console.log("Extracted Value:", val);

    const restrictions = ["NAVA"];
    const restrictionsLower = restrictions.map(r => r.toLowerCase().trim());
    
    const valStr = String(val || "").toLowerCase().trim();
    const isMatch = restrictionsLower.some(r => valStr.includes(r));
    console.log("Is restriction match (substring):", isMatch);
}

testFiltering();
