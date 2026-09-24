"use client";

import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";

import type { AccountDialogKind } from "./account-columns";
import { buildAccountColumns } from "./account-columns";
import { EditUserDialog, ResetPasswordDialog } from "./account-dialogs";
import { CreateUserDialog } from "./create-user-dialog";
import { SetActiveDialog } from "./set-active-dialog";
import type { Profile } from "./use-scorers";
import { useAccounts } from "./use-scorers";

// Scorers first: that is what this page is for. Admin accounts are one
// filter away, since admins are provisioned here too.
const ROLE_FILTERS = [
  { label: "Scorers", value: "scorer" },
  { label: "Admins", value: "admin" },
  { label: "All accounts", value: "all" },
];
const STATUS_FILTERS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "inactive" },
];

const matchesFilters = (
  user: Profile,
  search: string,
  role: string,
  status: string
) => {
  const query = search.trim().toLowerCase();
  const matchesSearch =
    !query ||
    user.full_name.toLowerCase().includes(query) ||
    user.login_id.includes(query);
  const matchesRole = role === "all" || user.role === role;
  const matchesStatus =
    status === "all" || (status === "active") === user.is_active;
  return matchesSearch && matchesRole && matchesStatus;
};

const UsersEmpty = ({ filtered }: { filtered: boolean }) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <UsersIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>
        {filtered ? "No matching accounts" : "No scorers yet"}
      </EmptyTitle>
      <EmptyDescription>
        {filtered
          ? "Try a different search or clear the filters."
          : "Add a scorer so they can sign in on the mobile app."}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export const ScorersPage = () => {
  const { data, error, isPending } = useAccounts();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("scorer");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  // The user outlives the open state so a closing dialog keeps its text.
  const [dialogKind, setDialogKind] = useState<AccountDialogKind | null>(null);
  const [dialogUser, setDialogUser] = useState<Profile | null>(null);

  const columns = useMemo(
    () =>
      buildAccountColumns((kind, user) => {
        setDialogUser(user);
        setDialogKind(kind);
      }),
    []
  );
  const rows = useMemo(
    () =>
      (data ?? []).filter((user) => matchesFilters(user, search, role, status)),
    [data, search, role, status]
  );
  const filtered = search !== "" || role !== "scorer" || status !== "all";

  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialogKind(null);
    }
  };

  return (
    <div>
      <PageHeader
        action={
          <Button onClick={() => setCreating(true)}>
            <UserPlusIcon aria-hidden="true" data-icon="inline-start" />
            Add scorer
          </Button>
        }
        description="Scorers sign in on the mobile app to record scores. Switch the filter to Admins to manage desktop admin accounts."
        title="Scorers"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search scorers"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or login ID"
            value={search}
          />
        </InputGroup>
        <Select
          items={ROLE_FILTERS}
          onValueChange={(value) => setRole(String(value))}
          value={role}
        >
          <SelectTrigger aria-label="Filter by role" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={STATUS_FILTERS}
          onValueChange={(value) => setStatus(String(value))}
          value={status}
        >
          <SelectTrigger aria-label="Filter by status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
      {data ? (
        <DataTable
          columns={columns}
          data={rows}
          empty={<UsersEmpty filtered={filtered} />}
          getRowId={(user) => user.id}
          initialSorting={[{ desc: false, id: "full_name" }]}
          label="Scorers"
        />
      ) : null}

      <CreateUserDialog onOpenChange={setCreating} open={creating} />
      <EditUserDialog
        onOpenChange={closeDialog}
        open={dialogKind === "edit"}
        user={dialogUser}
      />
      <ResetPasswordDialog
        onOpenChange={closeDialog}
        open={dialogKind === "reset"}
        user={dialogUser}
      />
      <SetActiveDialog
        onOpenChange={closeDialog}
        open={dialogKind === "active"}
        user={dialogUser}
      />
    </div>
  );
};
