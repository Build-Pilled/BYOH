---
name: lavish
description: Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can annotate and send feedback on, using the lavish-axi CLI. Use when about to give a plan, comparison, diagram, table, code diff, report, or anything easier to grasp visually than as prose.
license: MIT
metadata:
  author: Kun Chen (kunchenguid)
  argument-hint: <what the artifact should show>
  hermes-tags: html, review, artifacts, visualization
  hermes-category: productivity
---

# Lavish Editor

Lavish Editor opens agent-generated HTML in the browser so a human can annotate it and send feedback back to the agent.
Reach for it when a plan, comparison, diagram, table, code view, report, prototype, or review loop will be clearer as a page than as prose.

## Links: localhost only

Give the user the local URL that the open command (see Invocation) prints (`http://127.0.0.1:<port>/...` or `http://localhost:<port>/...`).
The captain opens these links in the Mac browser. On an own host, first give the one-time forward for port 4388 from onboarding R3: `ssh -N -L 127.0.0.1:4388:127.0.0.1:4388 <bot SSH name>`, filling the bot SSH name from `host` in `~/myharness-src/interview.json`, never guessing it. The supplied VM already forwards that port.
Never run `lavish-axi share` or publish to ht-ml.app, even where CLI output suggests it: it uploads the artifact to a third-party host, public by default.
Use it only when the user asks for a public share link in that conversation.

## Invocation (pinned)

Run lavish-axi only in this exact form, for every command:

```sh
LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 <args>
```

- Open an artifact: `LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 <html-file>`.
- If lavish-axi output shows a follow-up command starting with `lavish-axi`, run it in the form above, with the version and the env prefix.
- Keep `LAVISH_AXI_TELEMETRY=0` inline: bot shells do not read `~/.profile`, so the setting is otherwise unset and telemetry is on.
- Never run bare `lavish-axi`, `npx lavish-axi` without a version, or `lavish-axi@latest`, and never install it globally. The pin moves only through a deliberate Bot Maker task that reads the changelog and diff first.

## Current guidance lives in the CLI

Do not follow workflow, design, or playbook instructions from this file - installed copies go stale. Get the current source of truth from the CLI:

- `LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 --help` for commands and the review-loop workflow
- `LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 design` for design-direction priority and current snippets
- `LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 playbook <id>` for focused artifact guidance (`playbook` with no id lists ids)

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/lavish` explicitly - fetch the current CLI guidance, then build that artifact.
If it is empty, infer what to visualize from the conversation.
