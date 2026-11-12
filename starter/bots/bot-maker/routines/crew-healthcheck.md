---
name: Crew healthcheck
description: Weekly friction mining, routine-waste audit and charter size; report-only proposals to Firstmate.
schedule: "49 8 * * 1"
enabled: true
session: fresh
---
Run the crew-healthcheck skill. Window: the last 7 days. Report proposals to Firstmate with new_session titled CREW-HEALTH-<today's date>. If no proposal survives, send nothing and no filler. Do not create or edit any skill, note, bot or routine from this report. Wait for the captain's pick, relayed by Firstmate.
