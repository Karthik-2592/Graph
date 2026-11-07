import { connection } from "next/server";
import { LocalAnalyzer } from "@/components/local-analyzer";
import { ThemeControl } from "@/components/theme-control";
import { listAnalyses } from "@/lib/store/sqlite";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { cookies } from "next/headers";

// Single-user, local-only: one page, no sign-in. Saved parses come from the
// local SQLite file, read at request time — never prerendered.
export default async function HomePage() {
  await connection();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const saved = listAnalyses();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <LocalAnalyzer saved={saved} />
        <div className="absolute right-[21rem] top-1.5">
          <ThemeControl initial={theme} />
        </div>
      </div>
    </div>
  );
}
