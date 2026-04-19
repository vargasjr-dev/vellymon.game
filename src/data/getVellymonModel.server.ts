import all, { vellymonByUuid } from "../enums/vellymons";

/**
 * Legacy UUID mapping: the original 4 scaffold vellymons had hardcoded UUIDs.
 * Existing purchases in the DB still reference these. Map them to the closest
 * new-library equivalents so rosters don't crash.
 */
const LEGACY_UUID_MAP: Record<string, string> = {
  // Platinum Vellymon → Buldrok (id 1)
  "05da83b5-f7c7-4478-b426-e4a2b69ab2b7": "ve11ym0n-0000-4000-8000-0000000000000001",
  // Golden Vellymon → Ferridon (id 2)
  "f9564a8b-836e-4259-81bb-cdafadba0ed2": "ve11ym0n-0000-4000-8000-0000000000000002",
  // Silver Vellymon → Shellguard (id 3)
  "06ea4e02-0697-48f4-9296-d72153b5a58d": "ve11ym0n-0000-4000-8000-0000000000000003",
  // Bronze Vellymon → Cragthorn (id 4)
  "df38d5f0-2023-47ba-b614-67b86be047ba": "ve11ym0n-0000-4000-8000-0000000000000004",
};

const getVellymonModel = (uuid?: string) => {
  if (uuid) {
    // Check new library first, then try legacy mapping
    let vellymonModel = vellymonByUuid.get(uuid);
    if (!vellymonModel) {
      const mappedUuid = LEGACY_UUID_MAP[uuid];
      if (mappedUuid) {
        vellymonModel = vellymonByUuid.get(mappedUuid);
      }
    }
    if (!vellymonModel) {
      throw new Error(`Could not find vellymon model ${uuid}`);
    }
    return vellymonModel;
  } else {
    // Random vellymon for testing
    const vellymonModel = all[Math.floor(Math.random() * all.length)];
    return vellymonModel;
  }
};

export default getVellymonModel;
