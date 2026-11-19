# Frontier models

Maintained by the BYOH maintainer. This file is the source of model names the
setup agent may suggest as defaults or options; do not substitute names from
training data, saved engine settings or screenshots. Read it alongside
[onboarding](spec/onboarding.md) R3. The person may explicitly request another
model; that is their choice, not an agent recommendation.

- Claude Opus 5.5
- Claude Sonnet 5.5
- ChatGPT 6.2 Sol

## Onboarding defaults

- Claude Code bots: Claude Opus 5.5.
- Pi bots: ChatGPT 6.2 Sol.

All starter bots receive the same selected model. With both engines selected,
onboarding uses the Pi default; a Claude-only build uses the Claude Code
default. A person's explicit model choice overrides that selection.

These are display names, not API model ids or a guarantee of availability on
every account. Resolve a chosen name against the selected engines' runtime
catalog and provider/account route. If it does not resolve uniquely or is not
available there, stop and ask rather than inventing an id or silently using
another model.
