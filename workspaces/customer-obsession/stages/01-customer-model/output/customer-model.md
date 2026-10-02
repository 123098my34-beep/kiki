# Murmur — customer model (draft, human-editable)

## Primary: the all-day talker (B2B productivity)

**Situation:** lives in Slack, email, CRM notes, tickets, docs. Meetings all day,
writing to do after.
**Pain (their words):** *"I dictate in my head all day and then still type it
out. My wrists hurt by 3pm — and the 'fast' dictation tools want $15/mo and a
cloud account for text that's just… my own words."*
**Job-to-be-done:** turn meetings/thoughts into sendable text in any app, today,
without IT approval.
**Trigger to switch:** wrist pain flare; seeing a per-seat price raise; a
privacy-conscious employer blocking cloud dictation.
**Objection:** *"Browser dictation feels janky and I don't trust my mic to
work mid-call."* → answer: hybrid engine + visible raw/format panes.

## Secondary: the private professional

**Situation:** therapist, lawyer, medic, defense-adjacent, or handles
client-confidential material. Dictation is forbidden to be cloud-routed by
policy or contract.
**Pain (their words):** *"I'm not allowed to send case notes to a datacenter.
So I type. Slowly. After every session."*
**Job-to-be-done:** dictation that is provably local — auditable, not a policy
PDF promise.
**Trigger:** employer explicitly bans cloud AI tools; vendor breach headline.
**Objection:** *"If it's free, how do I know the model isn't phoning home?"* →
answer: offline engine runs after a one-time download; nothing after that.

## Tertiary: the non-native English writer

**Situation:** thinks in another language, writes professional English daily.
**Pain (their words):** *"My drafts sound fine in my head, but typing them out
in English is slow and I second-guess every sentence."*
**Job-to-be-done:** speak naturally; get grammatical, punctuated English out.
**Trigger:** an important email takes 40 minutes to write.
**Objection:** *"Will it understand my accent?"* → answer: browser engine has
vendor-scale models; local path is honest about accuracy and shows the raw text
so nothing is silently corrupted.

## Anti-personas (do not build for)
- Teams wanting shared admin/SSO (needs servers → breaks the cost model).
- Real-time captioning/broadcast (latency class we don't target yet).
