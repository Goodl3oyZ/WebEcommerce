CREATE TABLE subdistricts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  district_id UUID REFERENCES districts(id),
  province_id UUID REFERENCES provinces(id),
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  zipcode VARCHAR(10)
); 