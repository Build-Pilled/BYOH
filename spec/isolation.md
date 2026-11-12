# Isolation boundary

Classification: Core. Prerequisites: [host](host.md).

## Purpose

Keep the bots away from the computer the person works on, and say plainly what
they can still reach. Bots are steered by content they read, so the boundary is
the machine, the account and the network, not a prompt asking for permission
at each step. This section owns the isolation floor every host must meet, the
bot user, who controls the daemon, the egress boundary and the accepted limits.
[Host](host.md) owns the checks that prove it, [VM](vm.md) owns how the
supplied VM implements it, and [daemon](daemon.md) owns the API credentials.

## Required behaviour

- **R1 — Isolation floor.** Every host meets all of these:
  1. It is a machine or VM other than the one the person works on; the
     harness never runs bots on the Mac.
  2. Bots run as their own OS user without admin rights (R2).
  3. No personal folder of the person is shared, mounted or synced into it.
  4. The daemon listens on loopback only and is reached from the Mac over SSH
     or the supplied VM's single forward ([daemon](daemon.md) R1,
     [app pairing](app-pairing.md) R1).
- **R2 — The bot user.** Bots, their engines and the daemon run as one bot user
  (`myharness`, UID 1500 on the supplied VM) with only its own group, a
  locked password and no sudo rule or admin group. System packages the
  person wants later are installed by the admin account on the person's word,
  with one command from the Mac through the admin name
  (`ssh -n <admin name> sudo apt-get install <package>` on Debian); no bot
  can run it and no bot is given a way to ask for it without the person.
- **R3 — Who controls the daemon.** The daemon is a service of the host's
  service manager, installed, upgraded, replaced, restarted with changes and
  re-limited only by the admin account through the person's rebuild line
  ([app build](app-build.md)). Bots can do none of these: they cannot write the
  deployed code or the service definition, and they cannot change its limits. Daemon and bots share one OS user, so a bot **can** kill the daemon process; that risk is accepted.
  The service manager then restarts the same deployed code with the same
  limits ([VM](vm.md) R7), so a kill interrupts turns but replaces nothing.
  There are no separate OS users for daemon and bots.
- **R4 — Egress boundary.** On the supplied VM an output rule scoped to the bot
  user's UID refuses connections to private IPv4 ranges (including the VM's
  gateway to the Mac's loopback, the person's LAN and carrier-grade NAT
  addresses) and all IPv6, allows DNS to the VM's own resolver, and allows the
  public internet. It lives in its own firewall table `myharness_egress`, is loaded before the bot user's service manager and the daemon
  start, and both refuse to start without it (fail closed). When the pinned
  Lima offers a host-loopback block, it is on as well; the rule stays either
  way, because it also covers the LAN and IPv6. On an own host this rule is
  recommended, not part of the floor; the environment check warns when it is
  missing ([host](host.md) R11, H-egress).
- **R5 — What a bot can reach, stated plainly.** Everything that runs as the
  bot user can read and write the whole harness home and the bot user's OS
  home: every bot's instructions and conversations, `myharness.toml` (so a bot
  can set the [desktop notifications](desktop-notifications.md) `notify`
  command, change listen or limit fields or add an MCP server), the owner
  token in `secrets/`, the engines' login files, the bots' GitHub login, the
  interview record and the harness source repository. It can read and send out
  whatever it can read, to any destination R4 allows. Changes to tracked
  configuration and instructions are commits in the home history
  ([instruction history](instruction-history.md)), which helps only if someone
  notices and reverts. A bot cannot read the Mac's files, keys or other apps'
  data, cannot reach the Mac's loopback services on the supplied VM, and
  cannot act as the admin account.
- **R6 — The Mac-side trust edges.** Two paths cross from the host to the Mac,
  and both are narrowed rather than removed. The app renders content served by
  the daemon ([ui-shell](ui-shell.md) R3 to R7 own the renderer boundary).
  The app itself is built in the host from a commit of a repository bots can
  write; it runs on the Mac with the person's rights. That edge is accepted
  with the [app build](app-build.md) mitigations: only the person's pasted line
  deploys, it names one exact commit, the admin builds it in a folder bots
  cannot write with install scripts disabled, the Mac pulls (the host never
  pushes) and checks the hash, quarantine and signature.
- **R7 — Credentials in the host.** The Mac's SSH keys, agent and logins never
  enter the host: no agent forwarding, no mounts, only the VM tool's own key or
  the person's chosen host key. Engine logins belong to the person's own
  account on their own subscription or API key ([engine contract](engine-contract.md)). The bots' GitHub account uses fine-grained tokens scoped to the
  person's chosen repositories. No admin or root cloud credential is placed
  where the bot user can read it.

## Controls

Not applicable; this section has no UI controls.

## Edge cases

- **E1 — A bot kills the daemon.** The process ends, running turns are
  interrupted, and the service manager starts the same deployed code again;
  discovery and health come back ([daemon](daemon.md) R2, R3). Nothing a bot
  can write changes which code starts.
- **E2 — Firewall missing.** If the egress unit is not active, neither the
  daemon nor the bot user's service manager starts; the environment check
  reports FAIL rather than the harness running without the rule.
- **E3 — A bot tries admin steps.** `sudo`, writing the deployed code or the
  service definition, or restarting the service with changes fails with a
  permission error and changes nothing.
- **E4 — Proxy on the Mac's loopback.** A Mac proxy reached through the VM's
  gateway is refused by R4. Allowing its one port is the person's decision,
  recorded with the reason; the rule is never turned off to make it work.
- **E5 — Shared home on an own host.** A host that mounts or syncs the person's
  home or documents fails the floor even when everything else passes.
