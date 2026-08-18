#!/usr/bin/env node
/**
 * pnpm does not preserve the executable bit on prebuilds, but node-pty spawns
 * `prebuilds/<platform>-<arch>/spawn-helper` as a separate process. Without the
 * +x bit, posix_spawnp fails with "posix_spawnp failed" (errno EACCES).
 *
 * This script walks every node_modules/.pnpm/node-pty@* path and chmods the
 * spawn-helper binary to 0o755 so pty.spawn works out of the box.
 */
import { readdirSync, statSync, chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['node_modules']
let fixed = 0
for (const root of roots) {
  if (!existsSync(root)) continue
  for (const entry of readdirSync(root)) {
    if (!entry.startsWith('.pnpm') && entry !== 'node-pty') continue
    let base
    if (entry.startsWith('.pnpm')) {
      const match = entry.match(/^node-pty@([^/]+)\/node_modules\/node-pty$/)
      if (!match) continue
      base = join(root, entry)
    } else {
      base = join(root, 'node-pty')
    }
    const prebuilds = join(base, 'prebuilds')
    if (!existsSync(prebuilds)) continue
    for (const plat of readdirSync(prebuilds)) {
      const helper = join(prebuilds, plat, 'spawn-helper')
      if (!existsSync(helper)) continue
      const st = statSync(helper)
      if ((st.mode & 0o111) !== 0o111) {
        chmodSync(helper, 0o755)
        console.log(`[fix-node-pty] chmod +x ${helper}`)
        fixed++
      }
    }
  }
}
if (fixed === 0) {
  console.log('[fix-node-pty] spawn-helper already executable in all locations')
}