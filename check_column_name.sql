-- Check the actual column name in creator_settings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'creator_settings' 
AND column_name LIKE '%experience%';
