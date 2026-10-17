alter table product_images
  add column thumb_path text,
  add column photographer text,
  add column photographer_url text,
  add column external_id text;
create unique index product_images_external_id_key on product_images (external_id) where external_id is not null;
