"use client";

import { useEffect } from "react";
import { Button } from "@/ui";

/*
  Root-level, not per-route: catches anything a page throws that isn't a 404
  (notFound() already has its own path via not-found.tsx/next's default). Before
  this existed, a non-404 API failure — e.g. fetchProduct's plain Error on a 500 —
  had nothing to catch it and would show Next's raw dev overlay or a blank page.
*/
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-lg font-semibold">Something went wrong.</h1>
      <p className="mt-2 text-sm text-text-muted">
        This is a demo store; nothing was lost, but the page couldn&apos;t load.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
