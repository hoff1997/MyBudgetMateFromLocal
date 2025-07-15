const fs = require("fs");

console.log("\n🧪 Listing API folder:");
try {
  const files = fs.readdirSync("./api");
  files.forEach(file => {
    console.log(" -", file);
  });
} catch (err) {
  console.error("❌ Failed to read /api folder:", err.message);
}

