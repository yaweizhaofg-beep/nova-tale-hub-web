import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAllocation, getAssignableBalance } from '../../src/features/billing/allocation-rules';
import {
  creditRecharge,
  readWalletSnapshot,
  releaseMemberAllocation,
  setAllocationLimit,
  subscribeWallet,
} from '../../src/features/billing/wallet-repository';

test('recharge publishes an immutable update for the selected wallet only', () => {
  const before = readWalletSnapshot();
  let updates = 0;
  const unsubscribe = subscribeWallet(() => {
    updates++;
  });
  try {
    creditRecharge('team', 1990);
    assert.equal(updates, 1);
    const after = readWalletSnapshot();
    assert.equal(after.wallets.team.rechargeStars, before.wallets.team.rechargeStars + 1990);
    assert.equal(after.wallets.team.planExpiresAt, before.wallets.team.planExpiresAt);
    assert.equal(after.wallets.personal, before.wallets.personal);
    creditRecharge('team', Number.NaN);
    assert.equal(updates, 1);
  } finally {
    unsubscribe();
  }
});

test('quota mutations enforce current balance and release only unused allocation', () => {
  const snapshot = readWalletSnapshot();
  const allocation = getAllocation(snapshot, 1);
  const available = getAssignableBalance(snapshot);
  assert.equal(setAllocationLimit(1, allocation.used - 1).ok, false);
  assert.equal(setAllocationLimit(1, allocation.allocated + available + 1).ok, false);
  assert.equal(readWalletSnapshot(), snapshot);
  assert.deepEqual(releaseMemberAllocation(1), {
    released: allocation.allocated - allocation.used,
    kept: allocation.used,
  });
  const after = readWalletSnapshot();
  assert.equal(getAssignableBalance(after), available + allocation.allocated - allocation.used);
  assert.equal(after.wallets, snapshot.wallets);
});
