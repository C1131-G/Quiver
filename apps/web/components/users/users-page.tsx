"use client";

import {
  DotsThreeIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { PageHeader } from "@/components/page-header";

import type { Profile } from "./use-users";
import { useUsers } from "./use-users";
import {
  CreateUserDialog,
  EditUserDialog,
  ResetPasswordDialog,
  SetActiveDialog,
} from "./user-dialogs";

type DialogKind = "edit" | "reset" | "active";

const ROLE_FILTERS = [
  { label: "All roles", value: "all" },
  { label: "Scorers", value: "scorer" },
  { label: "Admins", value: "admin" },
];
const STATUS_FILTERS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "inactive" },
];

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const helper = createDataTableColumnHelper<Profile>();

const buildColumns = (openDialog: (kind: DialogKind, user: Profile) => void) =>
  helper.columns([
    helper.accessor("full_name", {
      cell: (cell) => <span className="font-medium">{cell.getValue()}</span>,
      header: "Name",
      sortFn: "text",
    }),
    helper.accessor("login_id", {
      cell: (cell) => <span className="font-mono">{cell.getValue()}</span>,
      header: "Login ID",
      sortFn: "text",
    }),
    helper.accessor("role", {
      cell: (cell) => (
        <Badge variant={cell.getValue() === "admin" ? "default" : "secondary"}>
          {cell.getValue() === "admin" ? "Admin" : "Scorer"}
        </Badge>
      ),
      header: "Role",
      sortFn: "text",
    }),
    helper.accessor("is_active", {
      cell: (cell) =>
        cell.getValue() ? (
          <Badge variant="outline">Active</Badge>
        ) : (
          <Badge variant="destructive">Deactivated</Badge>
        ),
      header: "Status",
      sortFn: "basic",
    }),
    helper.accessor("created_at", {
      cell: (cell) => (
        <span className="tabular-nums">
          {dateFormat.format(new Date(cell.getValue()))}
        </span>
      ),
      header: "Created",
      sortFn: "text",
    }),
    helper.display({
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={`Actions for ${row.original.full_name}`}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <DotsThreeIcon aria-hidden="true" weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openDialog("edit", row.original)}
              >
                Edit name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDialog("reset", row.original)}
              >
                Reset password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDialog("active", row.original)}
                variant={row.original.is_active ? "destructive" : "default"}
              >
                {row.original.is_active ? "Deactivate" : "Reactivate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: "actions",
    }),
  ]);

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
      <EmptyTitle>{filtered ? "No matching users" : "No users yet"}</EmptyTitle>
      <EmptyDescription>
        {filtered
          ? "Try a different search or clear the filters."
          : "Add a scorer so they can sign in on the mobile app."}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export const UsersPage = () => {
  const { data, error, isPending } = useUsers();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  // The user outlives the open state so a closing dialog keeps its text.
  const [dialogKind, setDialogKind] = useState<DialogKind | null>(null);
  const [dialogUser, setDialogUser] = useState<Profile | null>(null);

  const columns = useMemo(
    () =>
      buildColumns((kind, user) => {
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
  const filtered = search !== "" || role !== "all" || status !== "all";

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
            Add user
          </Button>
        }
        description="Scorer accounts sign in on the mobile app to record scores. Admin accounts use this desktop app."
        title="Users"
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search users"
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
          <SelectTrigger aria-label="Filter by role" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={STATUS_FILTERS}
          onValueChange={(value) => setStatus(String(value))}
          value={status}
        >
          <SelectTrigger aria-label="Filter by status" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
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
          label="Users"
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
