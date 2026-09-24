import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { PERMISSOES_POR_PAPEL, type PapelAcesso } from "../shared/permissoes";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    access: protectedProcedure.query(({ ctx }) => {
      const papel: PapelAcesso = ctx.user.role === "admin"
        ? "administrador"
        : ctx.user.role === "pesquisador"
          ? "pesquisador"
          : ctx.user.role === "revisor"
            ? "revisor"
            : "usuario";
      return {
        papel,
        permissoes: [...PERMISSOES_POR_PAPEL[papel]],
        origem: "sessao_autenticada" as const,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
