import fs from 'fs';
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

code = code.replace(
  "  role: varchar(\"role\", { length: 50 }).notNull(),\n});",
  "  role: varchar(\"role\", { length: 50 }).notNull(),\n  email: text(\"email\"),\n});"
);

fs.writeFileSync('src/db/schema.ts', code);
