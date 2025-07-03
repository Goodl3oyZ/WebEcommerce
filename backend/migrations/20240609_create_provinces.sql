CREATE TABLE provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100)
); 