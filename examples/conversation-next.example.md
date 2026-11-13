---
route: conversation
updated_at: 2026-01-15T17:42Z
last_intent: "Draft the onboarding email sequence for the new trial flow; three of five emails done."
active_run: ~/work/20260115-140000_onboarding--trial-emails
contract_path: ~/work/20260115-140000_onboarding--trial-emails/CONTRACT.md
learning_router_version: catechism-base
keep_inventory:
  - "gotcha: the email tool strips merge tags inside links; routed to the email skill's Gotchas"
skip_inventory:
  - "knowledge: subject-line length research (one source only; not reusable yet)"
open_loops:
  - "Emails 4 and 5 not drafted."
  - "Legal review of the cancellation wording is the user's call."
next_prompt: "/open conversation trial onboarding: draft emails 4 and 5 from CONTRACT.md criteria C-4 and C-5."
---

Written by `/close conversation`; read by the next `/open conversation`.
This copy lives in the kit only as an example. The real file goes in
`${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/conversation-next.md`
(or a named variant, `conversation-next-<topic>.md`).
