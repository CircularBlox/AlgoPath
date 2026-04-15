"use client";

import { useState, useTransition } from "react";
import type { Settings } from "~/components/settings-provider";
import { useSettings } from "~/components/settings-provider";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { deleteAccount } from "./actions";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="w-40 shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your application preferences.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {/* Notes section */}
        <section>
          <h2 className="text-base font-semibold">Notes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure how your notes behave.
          </p>
          <Separator className="my-4" />
          <div className="flex flex-col gap-6">
            <SettingRow
              label="Auto-save"
              description="Automatically save notes as you type."
            >
              <Select
                value={settings.autoSave}
                onValueChange={(v) =>
                  update("autoSave", v as Settings["autoSave"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </div>
        </section>

        {/* General section */}
        <section>
          <h2 className="text-base font-semibold">General</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Application-wide preferences.
          </p>
          <Separator className="my-4" />
          <div className="flex flex-col gap-6">
            <SettingRow
              label="Theme"
              description="Choose between light, dark, or system theme."
            >
              <Select
                value={settings.theme}
                onValueChange={(v) => update("theme", v as Settings["theme"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-base font-semibold text-destructive">
            Danger Zone
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permanent actions that cannot be undone.
          </p>
          <Separator className="my-4" />
          <div className="flex flex-col gap-4">
            {!confirmDelete ? (
              <div className="flex items-center justify-between gap-8">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete Account
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-3">
                <p className="text-sm font-medium">
                  Are you sure? This will permanently delete your account,
                  profile, and all solved problem history.
                </p>
                <div className="flex gap-2">
                  <form
                    action={() =>
                      startTransition(async () => {
                        await deleteAccount();
                      })
                    }
                  >
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                    >
                      {isPending ? "Deleting…" : "Yes, delete my account"}
                    </Button>
                  </form>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
