const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "database", "warnings.json");

function read() {
    try {
        if (!fs.existsSync(file)) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, "{}");
        }
        return JSON.parse(fs.readFileSync(file, "utf8") || "{}");
    } catch {
        return {};
    }
}
function write(data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function key(group, jid) { return `${group}:${jid}`; }
function get(group, jid) {
    const data = read();
    return Number(data[key(group, jid)] || 0);
}
function set(group, jid, count) {
    const data = read();
    const k = key(group, jid);
    if (count <= 0) delete data[k]; else data[k] = count;
    write(data);
    return count;
}
module.exports = { get, set };
