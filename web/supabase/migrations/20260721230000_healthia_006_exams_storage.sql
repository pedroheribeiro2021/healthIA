-- Bucket privado para os arquivos originais dos exames (PDF/imagem) — Fase 5
-- (docs/DATA_MODEL.md: "Uploads de exames no Supabase Storage, bucket
-- privado `exams`, referenciados por raw_records.payload"). Mesmo padrão de
-- autorização das tabelas de healthia.*: só o Pedro (healthia.is_authorized())
-- lê/escreve. Sem policy de update/delete — mesmo espírito append-only de
-- raw_records/health_events (exame errado = novo upload, não edição).
insert into storage.buckets (id, name, public)
values ('exams', 'exams', false)
on conflict (id) do nothing;

create policy "exams_select_authorized" on storage.objects
  for select to authenticated
  using (bucket_id = 'exams' and healthia.is_authorized());

create policy "exams_insert_authorized" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exams' and healthia.is_authorized());
