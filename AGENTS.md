<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Local development

- **Database:** standalone Supabase (see `.env.example` and `README.md` § Environment setup).
  Do not rely on Lovable Cloud DB credentials in `.env`.
- **Tests:** `npm run test` — 21 Vitest files, 117 tests, no network/DB required. Use-case tests
  use `tests/helpers/mock-app-context.ts`.
- **Auth:** Google sign-in goes through Supabase Auth (`src/routes/auth.tsx`), not
  `@lovable.dev/cloud-auth-js`.
