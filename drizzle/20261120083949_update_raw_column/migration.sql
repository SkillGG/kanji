-- Custom SQL migration file, put your code below! --

alter table reading drop column raw;
alter table reading add column raw text generated always as (get_raw_reading(word, reading)) stored;