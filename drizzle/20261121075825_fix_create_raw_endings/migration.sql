-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION get_raw_reading(w text, r text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN position('.' in r) = 0 THEN r
    ELSE COALESCE((
      SELECT string_agg(
        CASE WHEN part = '' THEN substr(w, idx::int, 1) ELSE part END,
        '' ORDER BY idx
      )
      FROM unnest(string_to_array(r, '.')) WITH ORDINALITY AS t(part, idx)
    ), '') || CASE
      WHEN right(r, 1) = '.' THEN substr(w, array_length(string_to_array(r, '.'), 1) + 1)
      ELSE ''
    END
  END;
$$;

alter table reading drop column raw;
alter table reading add column raw text generated always as (get_raw_reading(word, reading)) stored;