import { router } from "../trpc";
import { authRouter } from "./auth";
import { clubsRouter } from "./clubs";
import { roundsRouter } from "./rounds";
import { nominationsRouter } from "./nominations";
import { votesRouter } from "./votes";
import { booksRouter } from "./books";
import { selectionsRouter } from "./selections";
import { meetingsRouter } from "./meetings";
import { threadsRouter } from "./threads";
import { commentsRouter } from "./comments";
import { progressRouter } from "./progress";

export const appRouter = router({
  auth: authRouter,
  clubs: clubsRouter,
  rounds: roundsRouter,
  nominations: nominationsRouter,
  votes: votesRouter,
  books: booksRouter,
  selections: selectionsRouter,
  meetings: meetingsRouter,
  threads: threadsRouter,
  comments: commentsRouter,
  progress: progressRouter,
});

export type AppRouter = typeof appRouter;
