/**
 * Infrastructure worker tick — claims due rows and wires application use cases.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { processClaimedEntries, processClaimedEntriesGlobal } from "@/application/worker";
import { LEASE_SECONDS } from "@/application/publish-usecases";
import { createAppContext } from "@/infrastructure/context.server";
import {
  claimDueEntries,
  type Db,
} from "@/infrastructure/persistence/supabase-repositories.server";

export interface TickResult {
  claimed: number;
  processed: Array<{ entryId: string; platform: string; status: string }>;
}

export async function runWorkerTick(
  db: SupabaseClient<Database>,
  userId: string,
  options: { requestUrl?: string; limit?: number } = {},
): Promise<TickResult> {
  const claimed = await claimDueEntries(db as Db, {
    limit: options.limit ?? 10,
    leaseSeconds: LEASE_SECONDS,
  });
  const context = createAppContext(db as Db, userId, {
    ...(options.requestUrl ? { requestUrl: options.requestUrl } : {}),
  });
  return processClaimedEntries(context, claimed);
}

export async function runGlobalWorkerTick(
  db: SupabaseClient<Database>,
  options: { requestUrl?: string; limit?: number } = {},
): Promise<TickResult> {
  const claimed = await claimDueEntries(db as Db, {
    limit: options.limit ?? 10,
    leaseSeconds: LEASE_SECONDS,
  });
  return processClaimedEntriesGlobal(
    (uid) =>
      createAppContext(db as Db, uid, {
        ...(options.requestUrl ? { requestUrl: options.requestUrl } : {}),
      }),
    claimed,
  );
}
