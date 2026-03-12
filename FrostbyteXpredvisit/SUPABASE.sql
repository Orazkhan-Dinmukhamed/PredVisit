CREATE TABLE IF NOT EXISTS patients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  iin TEXT,
  age INT,
  age_group TEXT,
  gender TEXT,
  diagnosis TEXT,
  icd_code TEXT,
  hospitalization_days INT,
  comorbidity TEXT,
  month TEXT,
  is_readmission BOOLEAN,
  department TEXT,
  admission_date DATE,
  attending_doctor TEXT,
  previous_operations TEXT,
  drug_allergies TEXT,
  contraindications TEXT,
  phone TEXT,
  is_cured BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

