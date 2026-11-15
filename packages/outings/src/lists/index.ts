import type { OutingList } from "../types";
import { changeTable } from "./change-table";
import { packPinned } from "./pack-pinned";
import { parksStepFree } from "./parks-step-free";

export const ALL_LISTS: OutingList[] = [parksStepFree, changeTable, packPinned];
