import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { supabase } from '../config/supabase';

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../../../supabase/migrations/20260921250000_winner_verification_phase5.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration: 20260921250000_winner_verification_phase5.sql...');
  await pool.query(sql);
  console.log('Migration successfully applied to public.winners!');

  // Ensure private storage bucket 'winner-proofs' exists
  console.log('Verifying Supabase Storage bucket "winner-proofs"...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.warn('Could not list storage buckets:', listError.message);
  } else {
    const exists = buckets?.some((b) => b.name === 'winner-proofs');
    if (!exists) {
      console.log('Creating private bucket "winner-proofs"...');
      const { error: createError } = await supabase.storage.createBucket('winner-proofs', {
        public: false,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (createError) {
        console.warn('Bucket creation note:', createError.message);
      } else {
        console.log('Private bucket "winner-proofs" created successfully.');
      }
    } else {
      console.log('Bucket "winner-proofs" already exists.');
    }
  }

  await pool.end();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
