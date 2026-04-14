// ─── Public surface of the Group module ──────────────────────────────────────
//
// Import from this file externally:
//   import GroupPage from "@/features/group";
//   import { groupService } from "@/features/group";
//   import type { GroupRecord } from "@/features/group";

export { default } from "./pages/GroupPage";
export { groupService } from "./services/groupService";
export type { GroupForm, GroupRecord, GroupDetail, GroupListItem } from "./types";