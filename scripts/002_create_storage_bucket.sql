-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to upload files
CREATE POLICY "Allow public uploads to receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts');

-- Allow public access to read files
CREATE POLICY "Allow public reads from receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

-- Allow public access to update files
CREATE POLICY "Allow public updates to receipts" ON storage.objects
  FOR UPDATE USING (bucket_id = 'receipts');

-- Allow public access to delete files
CREATE POLICY "Allow public deletes from receipts" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts');
