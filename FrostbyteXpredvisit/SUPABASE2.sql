ALTER TABLE patients ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS attending_doctor TEXT;

ALTER TABLE patients DROP CONSTRAINT IF EXISTS chk_month;
ALTER TABLE patients ADD CONSTRAINT chk_month CHECK (month IN (
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
));


UPDATE patients SET department = 'Pulmonology' WHERE diagnosis IN ('Pneumonia','Acute Bronchitis','Bronchial Asthma','Chronic Obstructive Pulmonary Disease','Pulmonary Embolism','Community-acquired Pneumonia in Children') AND department IS NULL;
UPDATE patients SET department = 'Cardiology' WHERE diagnosis IN ('Acute Myocardial Infarction','Arterial Hypertension','Heart Failure','Atrial Fibrillation','Coronary Artery Disease','Deep Vein Thrombosis') AND department IS NULL;
UPDATE patients SET department = 'Gastroenterology' WHERE diagnosis IN ('Acute Gastritis','Gastric Ulcer','Chronic Gastritis','Gastroesophageal Reflux Disease','Acute Pancreatitis','Cholelithiasis','Chronic Cholecystitis','Liver Cirrhosis','Acute Appendicitis','Acute Gastroenteritis') AND department IS NULL;
UPDATE patients SET department = 'Nephrology' WHERE diagnosis IN ('Chronic Kidney Disease','Acute Pyelonephritis','Urolithiasis','Acute Cystitis') AND department IS NULL;
UPDATE patients SET department = 'Endocrinology' WHERE diagnosis IN ('Type 1 Diabetes Mellitus','Type 2 Diabetes Mellitus','Obesity','Hyperlipidemia','Hypothyroidism','Thyrotoxicosis') AND department IS NULL;
UPDATE patients SET department = 'Neurology' WHERE diagnosis IN ('Ischemic Stroke','Hemorrhagic Stroke','Epilepsy','Migraine') AND department IS NULL;
UPDATE patients SET department = 'Rheumatology' WHERE diagnosis IN ('Osteoarthritis','Rheumatoid Arthritis','Osteoporosis') AND department IS NULL;
UPDATE patients SET department = 'Traumatology' WHERE diagnosis IN ('Hip Fracture','Forearm Fracture') AND department IS NULL;
UPDATE patients SET department = 'Hematology' WHERE diagnosis IN ('Iron Deficiency Anemia') AND department IS NULL;
UPDATE patients SET department = 'Psychiatry' WHERE diagnosis IN ('Depressive Disorder','Anxiety Disorder') AND department IS NULL;
UPDATE patients SET department = 'Otolaryngology' WHERE diagnosis IN ('Acute Tonsillitis','Acute Sinusitis','Allergic Rhinitis') AND department IS NULL;
UPDATE patients SET department = 'Infectious Diseases' WHERE diagnosis IN ('Viral Hepatitis A','Viral Hepatitis B','Chickenpox') AND department IS NULL;
UPDATE patients SET department = 'Therapy' WHERE department IS NULL;


UPDATE patients SET admission_date = ('2026-01-01'::date + (floor(random()*28))::int) WHERE month = 'January' AND admission_date IS NULL;
UPDATE patients SET admission_date = ('2026-02-01'::date + (floor(random()*27))::int) WHERE month = 'February' AND admission_date IS NULL;
UPDATE patients SET admission_date = ('2026-03-01'::date + (floor(random()*28))::int) WHERE month = 'March' AND admission_date IS NULL;


CREATE INDEX IF NOT EXISTS idx_patients_department ON patients (department);
CREATE INDEX IF NOT EXISTS idx_patients_admission_date ON patients (admission_date);


CREATE TABLE IF NOT EXISTS chats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode TEXT DEFAULT 'database',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats (user_email);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats (updated_at DESC);


CREATE TABLE IF NOT EXISTS patient_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  attending_doctor TEXT,
  caretaker TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pnotes_patient ON patient_notes (patient_id);


CREATE TABLE IF NOT EXISTS operations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT,
  operation_name TEXT NOT NULL,
  operation_date DATE NOT NULL,
  surgeon TEXT,
  department TEXT,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ops_patient ON operations (patient_id);
CREATE INDEX IF NOT EXISTS idx_ops_date ON operations (operation_date);
CREATE INDEX IF NOT EXISTS idx_ops_status ON operations (status);


CREATE TABLE IF NOT EXISTS staff (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Doctor',
  department TEXT,
  specialization TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_dept ON staff (department);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff (is_active);

-- Initial doctors
INSERT INTO staff (full_name, role, department, specialization)
SELECT * FROM (VALUES
  ('Alejandro S K', 'Doctor', 'Pulmonology', 'Pulmonologist'),
  ('Ember D K', 'Doctor', 'Cardiology', 'Cardiologist'),
  ('Emily S M', 'Doctor', 'Gastroenterology', 'Gastroenterologist'),
  ('Orazkhan D E', 'Doctor', 'Nephrology', 'Nephrologist'),
  ('Sergey D P', 'Doctor', 'Endocrinology', 'Endocrinologist'),
  ('Sanchez J J', 'Doctor', 'Neurology', 'Neurologist'),
  ('Michael D J', 'Doctor', 'Rheumatology', 'Rheumatologist'),
  ('Viktoria L A', 'Doctor', 'Traumatology', 'Traumatologist'),
  ('Sie H N', 'Doctor', 'Hematology', 'Hematologist'),
  ('Anna I R', 'Doctor', 'Psychiatry', 'Psychiatrist'),
  ('Darren N A', 'Doctor', 'Otolaryngology', 'ENT Specialist'),
  ('Semoah U D', 'Doctor', 'Infectious Diseases', 'Infectiologist'),
  ('Ronald S B', 'Doctor', 'Therapy', 'Therapist')
) AS v(a,b,c,d)
WHERE NOT EXISTS (SELECT 1 FROM staff LIMIT 1);


UPDATE patients p SET attending_doctor = s.full_name
FROM staff s
WHERE p.department = s.department AND p.attending_doctor IS NULL;


ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN
  DROP POLICY IF EXISTS "service_role_all_chats" ON chats;
  DROP POLICY IF EXISTS "service_role_all_notes" ON patient_notes;
  DROP POLICY IF EXISTS "service_role_all_ops" ON operations;
  DROP POLICY IF EXISTS "auth_read_chats" ON chats;
  DROP POLICY IF EXISTS "auth_write_chats" ON chats;
  DROP POLICY IF EXISTS "auth_update_chats" ON chats;
  DROP POLICY IF EXISTS "auth_delete_chats" ON chats;
  DROP POLICY IF EXISTS "auth_all_notes" ON patient_notes;
  DROP POLICY IF EXISTS "auth_all_ops" ON operations;
  DROP POLICY IF EXISTS "auth_all_patients" ON patients;
  DROP POLICY IF EXISTS "anon_read_patients" ON patients;
  DROP POLICY IF EXISTS "Authorized users can read" ON patients;
  DROP POLICY IF EXISTS "service_role_all_staff" ON staff;
  DROP POLICY IF EXISTS "auth_all_staff" ON staff;
  DROP POLICY IF EXISTS "anon_read_staff" ON staff;
END $$;


CREATE POLICY "service_role_all_chats" ON chats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_notes" ON patient_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ops" ON operations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_staff" ON staff FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_chats" ON chats FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_chats" ON chats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_chats" ON chats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_chats" ON chats FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_all_notes" ON patient_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ops" ON operations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_patients" ON patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_staff" ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_patients" ON patients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_staff" ON staff FOR SELECT TO anon USING (true);



ALTER TABLE patients ADD COLUMN IF NOT EXISTS previous_operations TEXT DEFAULT 'No';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS drug_allergies TEXT DEFAULT 'None';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contraindications TEXT DEFAULT 'None';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_cured BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_patients_cured ON patients (is_cured);


ALTER TABLE operations ADD COLUMN IF NOT EXISTS patient_iin TEXT;


CREATE TABLE IF NOT EXISTS group_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gm_created ON group_messages (created_at DESC);

-- RLS
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "service_role_all_gm" ON group_messages;
  DROP POLICY IF EXISTS "auth_read_gm" ON group_messages;
  DROP POLICY IF EXISTS "auth_insert_gm" ON group_messages;
END $$;

CREATE POLICY "service_role_all_gm" ON group_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_gm" ON group_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_gm" ON group_messages FOR INSERT TO authenticated WITH CHECK (true);


DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
  END IF;
END $$;