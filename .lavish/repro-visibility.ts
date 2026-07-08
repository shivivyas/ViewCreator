import { query } from 'viewcreator-database';

async function main() {
  // 0. Find existing users to pick one
  const users = await query('SELECT id, email FROM users LIMIT 5');
  console.log('Existing users:', users.rows.map((u: any) => u.id));

  if (users.rows.length === 0) {
    console.log('No users found — create one first');
    return;
  }

  const testUserId = users.rows[0].id;
  console.log('Using user:', testUserId);

  // 1. Create a test private template (isPublic=false => user_id set)
  const result = await query(
    `INSERT INTO templates (title, description, s3_link, user_id, config)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, title`,
    ['TEST-private-visibility', 'Should NOT be visible to guests', 'https://test.s3.amazonaws.com/test.png', testUserId, JSON.stringify({ tags: ['My Uploads'], test: true })]
  );
  const tmpl = result.rows[0];
  console.log('Created private template:', tmpl);

  // 2. Fetch as guest (null userId) — same query the API uses
  const guestResult = await query(
    `SELECT t.id, t.title, t.user_id
     FROM templates t
     LEFT JOIN (
       SELECT template_id, COUNT(*) AS upvotes
       FROM template_upvotes
       GROUP BY template_id
     ) v ON v.template_id = t.id
     LEFT JOIN template_upvotes uv ON uv.template_id = t.id AND uv.user_id = $1
     WHERE (t.user_id IS NULL OR t.user_id = $1)
     ORDER BY t.created_at DESC`,
    [null]
  );

  const guestTitles = guestResult.rows.map((r: any) => r.title);
  console.log('Guest sees titles:', guestTitles);

  const found = guestTitles.includes('TEST-private-visibility');
  console.log('Private template visible to guest?', found ? '❌ BUG! YES - private template leaked!' : '✅ CORRECT - private template hidden from guest');

  // 3. Cleanup
  await query('DELETE FROM templates WHERE id = $1', [tmpl.id]);
  console.log('Cleaned up test template');
}

main().catch(console.error);
