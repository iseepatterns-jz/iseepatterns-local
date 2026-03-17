const content = 'Header1,Header2,Header3\nValue1,"Value,With,Commas",Value3\n,EmptyFirst,Value3\nValue1,,"Value3With""Quotes"""';
const lines = content.split(/\r?\n/);
const header = lines[0].split(",");
const rows = [];
const re_csv = /,"([^"]*(?:""[^"]*)*)"|,"([^",]*)"|^"([^"]*(?:""[^"]*)*)"|^"([^",]*)"|([^,]*)/g;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const matches = line.matchAll(re_csv);
    const values = [];
    for (const m of matches) {
        if (m[0] === "" && m.index > 0 && m.index === line.length) break;
        let val = m[1] || m[2] || m[3] || m[4] || m[5] || "";
        values.push(val.replace(/""/g, '"'));
    }
    console.log(`Line ${i}:`, JSON.stringify(values));
}
process.exit(0);
