-- Additional GIN index for element code lookups
CREATE INDEX IF NOT EXISTS idx_centre_context_element_codes
  ON centre_context USING gin(related_element_codes);
