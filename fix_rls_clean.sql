alter table fishermen enable row level security;
alter table landing_forms enable row level security;
alter table species enable row level security;
alter table user_profiles enable row level security;

revoke all on table fishermen from anon;
revoke all on table landing_forms from anon;
revoke all on table species from anon;
revoke all on table user_profiles from anon;

create policy "authenticated_all_fishermen" on fishermen for all to authenticated using (true) with check (true);
create policy "authenticated_all_landing_forms" on landing_forms for all to authenticated using (true) with check (true);
create policy "authenticated_all_species" on species for all to authenticated using (true) with check (true);

create policy "own_profile_select" on user_profiles for select to authenticated using (auth.uid() = id);
create policy "own_profile_insert" on user_profiles for insert to authenticated with check (auth.uid() = id);
create policy "own_profile_update" on user_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
