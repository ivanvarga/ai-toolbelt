# Working session notes — CSV export for reports

Goal: add a "Download CSV" button to the reports page that exports the currently-filtered
report as a CSV file. Ticket REP-417.

## Progress so far

Backend endpoint is stubbed at `routes/reports.ts` (new `GET /reports/:id/export.csv`
handler, currently returns 501). Frontend button is wired in `ReportsToolbar.tsx` and
hits the endpoint but obviously gets the 501 back. The actual data query we need to reuse
already exists — `reports/query.ts` exports `runReportQuery(filters)` around line 120,
returns an async iterator of rows. That's the thing the export should stream from.

## Things we tried / discussed

- I started by pulling in `fast-csv` to format rows. Then looked at the dependency tree
  it drags in (10+ transitive deps) for what is basically string joining with escaping.
  Backed that out. Not worth it for our simple schema.
- Briefly considered building the whole CSV string in memory then sending it. Decided
  against — some of these reports are 100k+ rows and that'd blow the request memory
  budget. Decision: stream the response, writing rows as they come off the iterator.

## Gotcha worth remembering

When we set the download filename via `Content-Disposition`, the filename must not
contain a comma. We hit this exact thing on the invoices export last year — Safari
mis-parses the header when there's an unquoted comma and the download silently fails
with no error. Report names can contain commas, so the filename has to be sanitized.
This is not written down anywhere; it cost the team a full afternoon last time.

## Next

Implement the streaming CSV writer in the export handler, pulling rows from
`runReportQuery`. Sanitize the filename. Then remove the 501 stub. No tests yet.

Branch: `feat/csv-export`. One commit so far (the stub + button wiring): `c4f9a01`.
