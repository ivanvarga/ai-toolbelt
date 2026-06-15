# Working session notes — bump CI Node to 20

Small task: move CI from Node 18 to Node 20. Ticket OPS-88.

Mostly done. Updated `.github/workflows/ci.yml` to use `node-version: 20.11.1`. Pinned to
20.11.1 specifically rather than `20` or latest, to match what prod runs — we don't want
CI passing on a Node version prod isn't on.

One painful gotcha: on the new image, the `node-gyp` rebuild step has to run *before*
`npm ci`, otherwise the native deps (we have a couple) fail to compile against the new
headers and the whole install bombs with a cryptic error. Took a while to figure out the
ordering. Not documented anywhere.

That's basically it. Still need to actually push and watch one CI run go green to confirm
the ordering fix holds. Branch: `ops/node-20`. Committed: `3a1c8de`.
