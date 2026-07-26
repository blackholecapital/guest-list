ALTER TABLE venues ADD COLUMN phone TEXT;
ALTER TABLE venues ADD COLUMN hours_json TEXT;

UPDATE venues
SET
  phone = '(813) 875-7912',
  hours_json = '[
    {"day":"Sunday","open":"6:00 PM","close":"3:00 AM"},
    {"day":"Monday","open":"6:00 PM","close":"3:00 AM"},
    {"day":"Tuesday","open":"6:00 PM","close":"3:00 AM"},
    {"day":"Wednesday","open":"6:00 PM","close":"3:00 AM"},
    {"day":"Thursday","open":"6:00 PM","close":"3:00 AM"},
    {"day":"Friday","open":"6:00 PM","close":"3:00 AM"},
    {"day":"Saturday","open":"6:00 PM","close":"3:00 AM"}
  ]'
WHERE slug = 'scores-tampa';
