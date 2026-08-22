"use client";

import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite, deleteItem } from "@/lib/actions";
import { Swipeable } from "@/app/_components/Swipeable";

export type SwipeAction = "none" | "favorite" | "edit" | "delete";

export function SwipeableItemCard({
  id,
  name,
  leftAction,
  rightAction,
  children,
}: {
  id: string;
  name: string;
  leftAction: SwipeAction;
  rightAction: SwipeAction;
  children: ReactNode;
}) {
  const router = useRouter();
  const favRef = useRef<HTMLFormElement>(null);
  const delRef = useRef<HTMLFormElement>(null);

  const run = (action: SwipeAction) => {
    if (action === "favorite") favRef.current?.requestSubmit();
    else if (action === "edit") router.push(`/items/${id}/edit`);
    else if (action === "delete") {
      if (confirm(`Delete "${name}"? This can't be undone.`)) delRef.current?.requestSubmit();
    }
  };

  return (
    <div className="relative">
      <Swipeable onSwipeLeft={() => run(leftAction)} onSwipeRight={() => run(rightAction)}>
        {children}
      </Swipeable>
      <form ref={favRef} action={toggleFavorite} className="hidden">
        <input type="hidden" name="id" value={id} />
      </form>
      <form ref={delRef} action={deleteItem} className="hidden">
        <input type="hidden" name="id" value={id} />
      </form>
    </div>
  );
}
