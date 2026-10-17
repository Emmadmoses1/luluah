alter table admin_users add column must_change_password boolean not null default false;
update admin_users set must_change_password = true;
