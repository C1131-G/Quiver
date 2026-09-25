import { useRecyclingState } from "@legendapp/list/react-native";

let mountSeq = 0;
const nextMountId = () => {
  mountSeq += 1;
  return mountSeq;
};

/**
 * A ticket that changes only when Legend List recycles this row's
 * container for a different item, not when the same item's data updates
 * in place. Key an AnimatePresence subtree with it so a recycled row shows
 * its steady state instead of animating a transition that belonged to the
 * row it used to be.
 */
export const useRecycleMountId = () => useRecyclingState(nextMountId)[0];
