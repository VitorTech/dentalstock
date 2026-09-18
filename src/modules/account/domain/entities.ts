/**
 * Account: the clinic (tenant) and its preferences.
 *
 * Every piece of data in the system belongs to a clinic. Its identifier
 * travels through every repository port — that is how isolation between
 * customers stops depending on the memory of whoever writes the query.
 */
import type { Uuid } from "@/shared/domain";

export type ThemeMode = "light" | "dark" | "system";

export interface Tenant {
  id: Uuid;
  name: string;
  slug: string;
  themeMode: ThemeMode;
  accentColor: string;
}
