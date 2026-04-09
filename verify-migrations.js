const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjecuwxorvjdxxukkviv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZWN1d3hvcnZqZHh4dWtrdml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3MjYsImV4cCI6MjA5MDM0ODcyNn0.aKy1-2E3jcRHTPE2X5jgLoqRRHfXMzZqNkfVou_oUls';

const supabase = createClient(supabaseUrl, supabaseKey);

const expectedTables = {
  // Checklists migration
  checklist_categories: { seedCount: 8 },
  checklist_templates: { seedCount: 18 },
  checklist_schedules: { seedCount: null },
  checklist_instances: { seedCount: null },
  smart_tickets: { seedCount: null },

  // Rostering migration
  rooms: { seedCount: 3 },
  staff_qualifications: { seedCount: null },
  roster_templates: { seedCount: null },
  roster_shifts: { seedCount: null },
  programming_time: { seedCount: null },
  leave_requests: { seedCount: null },
  staff_availability: { seedCount: null },
  casual_pool: { seedCount: null },
  ratio_rules: { seedCount: 32 },

  // Policies migration
  policy_categories: { seedCount: 12 },
  policies: { seedCount: null },
  policy_versions: { seedCount: null },
  policy_acknowledgements: { seedCount: null },
  service_details: { seedCount: 12 },

  // Registers migration
  register_definitions: { seedCount: 7 },
  register_entries: { seedCount: null },
};

async function checkTable(tableName, expected) {
  try {
    // Use head:true with count to get count without fetching rows
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { table: tableName, exists: false, error: error.message };
    }

    const result = { table: tableName, exists: true, rowCount: count };

    if (expected.seedCount !== null) {
      result.expectedCount = expected.seedCount;
      result.seedMatch = count === expected.seedCount;
    }

    return result;
  } catch (err) {
    return { table: tableName, exists: false, error: err.message };
  }
}

async function main() {
  console.log('=== Supabase Migration Verification ===\n');

  const results = await Promise.all(
    Object.entries(expectedTables).map(([name, expected]) => checkTable(name, expected))
  );

  const existing = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);

  // Group by migration
  const groups = {
    'Checklists': ['checklist_categories', 'checklist_templates', 'checklist_schedules', 'checklist_instances', 'smart_tickets'],
    'Rostering': ['rooms', 'staff_qualifications', 'roster_templates', 'roster_shifts', 'programming_time', 'leave_requests', 'staff_availability', 'casual_pool', 'ratio_rules'],
    'Policies': ['policy_categories', 'policies', 'policy_versions', 'policy_acknowledgements', 'service_details'],
    'Registers': ['register_definitions', 'register_entries'],
  };

  const resultMap = Object.fromEntries(results.map(r => [r.table, r]));

  for (const [group, tables] of Object.entries(groups)) {
    console.log(`--- ${group} Migration ---`);
    for (const t of tables) {
      const r = resultMap[t];
      if (r.exists) {
        let line = `  OK   ${t} (${r.rowCount} rows)`;
        if (r.expectedCount !== undefined) {
          line += r.seedMatch
            ? ` -- seed data MATCHES (expected ${r.expectedCount})`
            : ` -- seed data MISMATCH (expected ${r.expectedCount})`;
        }
        console.log(line);
      } else {
        console.log(`  MISS ${t} -- ${r.error}`);
      }
    }
    console.log();
  }

  // Summary
  console.log('=== Summary ===');
  console.log(`Tables found: ${existing.length}/${results.length}`);
  console.log(`Tables missing: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Missing: ${missing.map(r => r.table).join(', ')}`);
  }

  const seedChecks = results.filter(r => r.expectedCount !== undefined);
  const seedPass = seedChecks.filter(r => r.seedMatch);
  const seedFail = seedChecks.filter(r => r.seedMatch === false);
  console.log(`Seed data checks: ${seedPass.length}/${seedChecks.length} passed`);
  if (seedFail.length > 0) {
    for (const f of seedFail) {
      console.log(`  FAIL: ${f.table} has ${f.rowCount} rows, expected ${f.expectedCount}`);
    }
  }

  // Check if all seed tables show 0 rows (RLS blocking anon reads)
  const allSeedZero = seedChecks.every(r => r.rowCount === 0);
  if (allSeedZero && seedChecks.length > 0) {
    console.log('\nNOTE: All seeded tables return 0 rows. This is expected because RLS');
    console.log('policies on these tables grant SELECT only to "authenticated" users,');
    console.log('not the "anon" role. The seed data INSERT statements are present in');
    console.log('all 4 migration SQL files, so data was likely inserted successfully');
    console.log('but is not visible to the anon key. Use a service_role key or an');
    console.log('authenticated session to verify seed row counts.');
  }
}

main().catch(console.error);
