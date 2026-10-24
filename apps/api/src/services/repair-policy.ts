/** Shared deterministic policy: the API and centrally owned CI runner use identical code. */
export {
  discoverRepairPolicy, validateGenericRepair, frozenRepairDigest, repairPolicyVersion,
  requiredRepairChecks, isRepairTestPath, safeRepairPath, runnerImages,
  type RepairPolicy, type RepairTarget,
} from '../../../../scripts/verification/repair-policy.mjs';
