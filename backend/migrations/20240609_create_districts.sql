CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  province_id UUID REFERENCES provinces(id),
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100)
); 

-- ลบ unique constraint เดิม
ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_code_unique;

-- เพิ่ม unique ใหม่
ALTER TABLE districts ADD CONSTRAINT districts_province_code_code_unique UNIQUE (province_code, code); 